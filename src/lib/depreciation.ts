/**
 * Straight-line depreciation and loan amortization (PROPOSAL-002 Phase 3, task 3.8).
 *
 * Pure functions only — no `supabaseServer` import, same convention as `ledger.ts` / `packages.ts`
 * / `costing.ts` / `customerBalances.ts` / `inventoryBalances.ts`. Throws on nonsense input rather
 * than silently producing a wrong number, matching every prior library in this codebase.
 */

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function nonNegative(value: number, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a finite number greater than or equal to 0.`);
  }
  return parsed;
}

/**
 * Straight-line monthly depreciation (DEC-017): `(cost − salvage) / useful_life_months`.
 * Throws on `usefulLifeMonths <= 0` (a divide-by-zero/nonsense input) and if `salvageValue`
 * exceeds `cost` (an asset cannot be worth more scrapped than it cost new — a data-entry error
 * worth surfacing immediately, not silently producing a negative monthly charge).
 */
export function monthlyDepreciation(cost: number, salvageValue: number, usefulLifeMonths: number): number {
  const c = nonNegative(cost, 'cost');
  const salvage = nonNegative(salvageValue, 'salvageValue');
  const life = Number(usefulLifeMonths);
  if (!Number.isFinite(life) || life <= 0) {
    throw new Error('usefulLifeMonths must be a finite number greater than 0.');
  }
  if (salvage > c) {
    throw new Error('salvageValue cannot exceed cost.');
  }
  return round2((c - salvage) / life);
}

/**
 * Book value after some amount of accumulated depreciation, clamped at `salvageValue` — an asset
 * that has been depreciated past its useful life stops losing book value; a monthly posting job
 * run one extra time past full depreciation must not keep subtracting.
 *
 * Deviation from the original task 3.8 spec, found while implementing it: the spec's signature
 * (`bookValueAfter(cost, accumulatedDepreciation)`) omits `salvageValue` even though its own
 * description requires clamping at it, and task 3.9's regression check explicitly asserts the
 * clamp — the function cannot do its stated job without knowing the floor. Added as a third
 * parameter rather than silently guessing a floor of 0, the same kind of spec correction task 1.8
 * made for `deferredBalance` and documented rather than hid.
 */
export function bookValueAfter(cost: number, accumulatedDepreciation: number, salvageValue: number): number {
  const c = nonNegative(cost, 'cost');
  const accumulated = nonNegative(accumulatedDepreciation, 'accumulatedDepreciation');
  const salvage = nonNegative(salvageValue, 'salvageValue');
  if (salvage > c) {
    throw new Error('salvageValue cannot exceed cost.');
  }
  return round2(Math.max(salvage, c - accumulated));
}

export interface LoanAmortizationResult {
  interestPart: number;
  principalPart: number;
  balanceAfter: number;
}

/**
 * One period of standard loan amortization: interest accrues on the outstanding balance for the
 * period, and the remainder of the installment reduces principal.
 *
 * `annualRate` is a whole-number percentage (e.g. `12` for 12%), matching every other rate-shaped
 * field in this codebase (`providers.commission_value`, `packages.tax_rate` intent) — not a
 * fraction. Monthly interest is `balance × (annualRate / 100) / 12`.
 *
 * Throws if `installment < interestPart` — a payment that doesn't even cover the period's
 * interest is a data-entry error (the loan would never amortize), worth surfacing immediately
 * rather than producing a silently growing balance, matching the "throw on nonsense input"
 * convention every pure-function library in this codebase already follows.
 *
 * `principalPart` and `balanceAfter` are derived by subtraction from the one rounded value
 * (`interestPart`), never independently rounded — this is what makes `Σ principalPart` across a
 * full schedule sum to exactly the original balance by construction (telescoping subtraction),
 * the same anti-drift discipline task 1.8's `deferredBalance` fix established for package revenue
 * recognition. The final period is clamped so `balanceAfter` cannot go negative if `installment`
 * overshoots a small remaining balance — `principalPart` is capped at whatever balance remains.
 */
export function amortizeLoanPayment(
  balance: number,
  annualRate: number,
  installment: number
): LoanAmortizationResult {
  const outstandingBalance = nonNegative(balance, 'balance');
  const rate = nonNegative(annualRate, 'annualRate');
  const payment = Number(installment);
  if (!Number.isFinite(payment) || payment <= 0) {
    throw new Error('installment must be a finite number greater than 0.');
  }

  const interestPart = round2((outstandingBalance * (rate / 100)) / 12);
  if (payment < interestPart) {
    throw new Error(
      `installment (${payment}) is less than the period's interest (${interestPart}) — this loan would never amortize.`
    );
  }

  const uncappedPrincipalPart = round2(payment - interestPart);
  const principalPart = Math.min(uncappedPrincipalPart, outstandingBalance);
  const balanceAfter = round2(outstandingBalance - principalPart);

  return { interestPart, principalPart, balanceAfter };
}
