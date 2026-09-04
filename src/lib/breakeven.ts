/**
 * Pure break-even arithmetic for PROPOSAL-002 Phase 5 (Capacity & Optimization).
 *
 * No `supabaseServer` calls in this file. See ai_docs/PROPOSALS.md "Phase 5 — Capacity &
 * optimization" and ai_docs/FINANCE_TRACKER.md task 5.6. This is the capacity-aware counterpart
 * to the simple client-side break-even card already on the P&L screen (task 4B.7) — this version
 * is meant to be fed a true weighted-average contribution margin ratio across the service mix,
 * not a single month's blended ratio, once task 5.10 computes one.
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * fixed_monthly / weighted_avg_contribution_margin_ratio.
 *
 * Throws on a ratio <= 0 — same convention as every other divide-by-input function across these
 * modules (`costPerPulse`, `recognisedRevenuePerSession`, `monthlyDepreciation`): a clinic with
 * zero or negative average contribution margin has no finite break-even point, and surfacing
 * `Infinity` or a divide-by-zero silently would be a worse failure than an explicit error the
 * caller must handle.
 */
export function breakEvenRevenue(fixedMonthly: number, weightedAvgContributionMarginRatio: number): number {
  if (!Number.isFinite(weightedAvgContributionMarginRatio) || weightedAvgContributionMarginRatio <= 0) {
    throw new Error(
      `breakEvenRevenue: weightedAvgContributionMarginRatio must be a positive number, got ${weightedAvgContributionMarginRatio}`
    );
  }
  return round2(fixedMonthly / weightedAvgContributionMarginRatio);
}
