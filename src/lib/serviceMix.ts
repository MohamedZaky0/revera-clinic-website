/**
 * Pure optimal-service-mix arithmetic for PROPOSAL-002 Phase 5 (Capacity & Optimization).
 *
 * No `supabaseServer` calls in this file. See ai_docs/PROPOSALS.md "Phase 5 — Capacity &
 * optimization" and ai_docs/FINANCE_TRACKER.md task 5.7. The key insight PROPOSALS.md names: rank
 * by contribution margin PER BOTTLENECK MINUTE, not by margin percentage — "a 60%-margin service
 * that occupies the only laser room for two hours is worse than a 40%-margin service that takes
 * twenty minutes."
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface RankableService {
  id: string | number;
  cmPerMinute: number;
}

/** Descending sort by contribution margin per bottleneck minute. */
export function rankByContributionMarginPerMinute<T extends RankableService>(services: T[]): T[] {
  return [...services].sort((a, b) => b.cmPerMinute - a.cmPerMinute);
}

export interface SellableCapacityResult {
  sellableMinutes: number;
  /** True when undelivered package minutes exceeded bottleneck minutes and the result was
   *  clamped at 0 — worth logging, same clamp-and-log convention as `computeSettledBalances`. */
  clamped: boolean;
}

/**
 * bottleneck_minutes − Σ (undelivered package sessions × duration_minutes), implementing
 * DEC-023's netting requirement: undelivered package sessions are already-sold future chair time,
 * so treating all bottleneck capacity as sellable would overstate potential revenue and
 * double-count money the clinic already collected. `undeliveredPackageMinutes` is computed by the
 * caller from `customer_package_items.qty_remaining × services.duration_minutes` summed across
 * active, non-expired `customer_packages` — this function only does the subtraction.
 */
export function sellableCapacity(bottleneckMinutesValue: number, undeliveredPackageMinutes: number): SellableCapacityResult {
  const raw = bottleneckMinutesValue - undeliveredPackageMinutes;
  return { sellableMinutes: Math.max(0, raw), clamped: raw < 0 };
}

export interface AllocatableService {
  id: string | number;
  cmPerMinute: number;
  durationMinutes: number;
  /** Realistic monthly demand for this service, in sessions — supplied by the caller, not
   *  computed here. */
  monthlyDemandCap: number;
}

export interface ServiceAllocation {
  serviceId: string | number;
  sessionsAllocated: number;
}

/**
 * Greedy fractional-knapsack allocation of sellable minutes across ranked services, each capped
 * by its own realistic monthly demand. PROPOSALS.md states greedy allocation "is provably optimal
 * for this problem shape" — this is a straightforward greedy pass, no branch-and-bound/ILP.
 *
 * Deliberate deviation from textbook fractional knapsack: sessions are truncated to whole numbers
 * (Math.floor), never allowed to overshoot. A clinic session is not a divisible unit — "2.4
 * sessions of a laser treatment" isn't a real, sellable thing, and DEC-014's plain-language,
 * hand-verifiable-numbers principle rules out reporting a fractional session as if it were revenue.
 * This means a small amount of sellable capacity can go unused at the very end of the ranked list
 * (less than one more session's worth of the next-ranked service) — that leftover is real and
 * should be visible as idle capacity, not hidden by rounding up into a session that wasn't booked.
 */
export function allocateGreedy(rankedServices: AllocatableService[], sellableMinutes: number): ServiceAllocation[] {
  let remaining = Math.max(0, sellableMinutes);
  const allocation: ServiceAllocation[] = [];

  for (const svc of rankedServices) {
    if (remaining <= 0) break;
    if (!Number.isFinite(svc.durationMinutes) || svc.durationMinutes <= 0) continue;

    const demandCapSessions = Math.max(0, Math.floor(svc.monthlyDemandCap));
    if (demandCapSessions === 0) continue;

    const minutesAvailableForThisService = Math.min(remaining, demandCapSessions * svc.durationMinutes);
    const sessions = Math.floor(minutesAvailableForThisService / svc.durationMinutes);

    if (sessions > 0) {
      allocation.push({ serviceId: svc.id, sessionsAllocated: sessions });
      remaining -= sessions * svc.durationMinutes;
    }
  }

  return allocation;
}

/** Σ sessions_i × price_i over the optimal allocation. Any allocated service missing from
 *  `pricesById` is skipped rather than treated as free — a missing price is a data gap upstream,
 *  not a signal this service contributes zero revenue. */
export function maxPotentialRevenue(allocation: ServiceAllocation[], pricesById: Record<string, number>): number {
  let total = 0;
  for (const a of allocation) {
    const price = pricesById[String(a.serviceId)];
    if (price === undefined || !Number.isFinite(price)) continue;
    total += a.sessionsAllocated * price;
  }
  return round2(total);
}

/** Plain subtraction — the idle-capacity/suboptimal-mix/no-shows decomposition of this gap is a
 *  reporting concern (task 5.10 combines this with 5.5's utilization and 5.1's no_show counts),
 *  not something this pure function needs to compute internally. */
export function gapToPotential(maxPotential: number, actualRevenue: number): number {
  return round2(maxPotential - actualRevenue);
}
