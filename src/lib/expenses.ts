/**
 * Pure helpers for recurring-expense generation (PROPOSAL-002 Phase 3, task 3.10).
 *
 * Pure functions only — no `supabaseServer` import, same convention as `ledger.ts` / `packages.ts`
 * / `depreciation.ts`. Throws on nonsense input rather than silently producing a wrong date.
 */

export type ExpenseCadence = 'monthly' | 'quarterly' | 'yearly';

const CADENCE_MONTHS: Record<ExpenseCadence, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Advances a `'YYYY-MM-DD'` date string by one cadence step, clamping the resulting day to the
 * last day of the new month — so a recurring expense due on the 31st doesn't silently overflow
 * into the wrong month every time a shorter month is crossed (matches `expenses.incurred_on` /
 * `recurring_expenses.next_due_on` both being `date` columns, not just year-month like
 * `depreciation_entries.period`).
 */
export function nextCadenceDate(dateStr: string, cadence: ExpenseCadence): string {
  const monthsToAdd = CADENCE_MONTHS[cadence];
  if (!monthsToAdd) {
    throw new Error(`Unknown cadence: ${cadence}`);
  }
  const match = DATE_RE.exec(dateStr);
  if (!match) {
    throw new Error(`dateStr must be 'YYYY-MM-DD', got: ${dateStr}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const totalMonths = year * 12 + month + monthsToAdd;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = totalMonths % 12;
  const daysInNewMonth = new Date(Date.UTC(newYear, newMonth + 1, 0)).getUTCDate();
  const newDay = Math.min(day, daysInNewMonth);

  return `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}
