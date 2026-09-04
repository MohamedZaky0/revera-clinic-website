/**
 * Pure date-range resolution for PROPOSAL-002 Phase 4 finance reporting endpoints.
 *
 * No `supabaseServer` import, matching ledger.ts / packages.ts / costing.ts / customerBalances.ts.
 * Exists because the tables Phase 4 reports over disagree on how a period is represented:
 * `invoices.issued_at` / `payments.received_at` / `package_revenue_recognitions.recognised_at`
 * are `timestamptz`; `expenses.incurred_on` / `fixed_assets.purchased_on` are `date`;
 * `depreciation_entries.period` / `loan_schedule.period` are free-text `'YYYY-MM'` strings
 * (matching this schema's app-formatted-string-key convention, not a real date/timestamp type).
 * One resolver produces the bounds each column type actually needs instead of five endpoints
 * each getting this conversion slightly differently.
 */

const PERIOD_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRangeParams {
  period?: string | null; // 'YYYY-MM'
  from?: string | null; // 'YYYY-MM-DD', inclusive
  to?: string | null; // 'YYYY-MM-DD', inclusive
}

export interface ResolvedDateRange {
  /** Inclusive start, 'YYYY-MM-DD'. */
  fromDate: string;
  /** Inclusive end, 'YYYY-MM-DD'. */
  toDateInclusive: string;
  /** Exclusive end, 'YYYY-MM-DD' — the day after toDateInclusive, for `.lt()` queries on `date` columns. */
  toDateExclusive: string;
  /** Inclusive start as a UTC timestamp, for `.gte()` queries on `timestamptz` columns. */
  fromIso: string;
  /** Exclusive end as a UTC timestamp, for `.lt()` queries on `timestamptz` columns. */
  toIsoExclusive: string;
  /** Every 'YYYY-MM' period string the range touches, for `depreciation_entries.period` / `loan_schedule.period`. */
  periods: string[];
  /** Human-readable label for the response payload. */
  label: string;
}

/**
 * Resolves either a `?period=YYYY-MM` shorthand or an explicit `?from=&to=` pair (both
 * `YYYY-MM-DD`, both inclusive) into every bound shape the Phase 4 report endpoints need.
 * Throws on missing/malformed input rather than silently defaulting to "everything" or "nothing"
 * — a report silently scoped to the wrong range is worse than one that fails loudly.
 */
export function resolveDateRange(params: DateRangeParams): ResolvedDateRange {
  if (params.period) {
    if (!PERIOD_RE.test(params.period)) {
      throw new Error(`period must be 'YYYY-MM', got '${params.period}'.`);
    }
    const [yearStr, monthStr] = params.period.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-12

    const fromDateObj = new Date(Date.UTC(year, month - 1, 1));
    const toExclusiveObj = new Date(Date.UTC(year, month, 1));
    const toInclusiveObj = new Date(Date.UTC(year, month, 0)); // last day of the target month

    return {
      fromDate: toDateStr(fromDateObj),
      toDateInclusive: toDateStr(toInclusiveObj),
      toDateExclusive: toDateStr(toExclusiveObj),
      fromIso: fromDateObj.toISOString(),
      toIsoExclusive: toExclusiveObj.toISOString(),
      periods: [params.period],
      label: params.period,
    };
  }

  if (params.from && params.to) {
    if (!DATE_RE.test(params.from) || !DATE_RE.test(params.to)) {
      throw new Error(`from/to must be 'YYYY-MM-DD', got from='${params.from}' to='${params.to}'.`);
    }
    const fromDateObj = new Date(`${params.from}T00:00:00.000Z`);
    const toInclusiveObj = new Date(`${params.to}T00:00:00.000Z`);
    if (Number.isNaN(fromDateObj.getTime()) || Number.isNaN(toInclusiveObj.getTime())) {
      throw new Error(`from/to must be valid calendar dates, got from='${params.from}' to='${params.to}'.`);
    }
    if (toInclusiveObj.getTime() < fromDateObj.getTime()) {
      throw new Error(`to ('${params.to}') must be on or after from ('${params.from}').`);
    }
    const toExclusiveObj = new Date(toInclusiveObj.getTime());
    toExclusiveObj.setUTCDate(toExclusiveObj.getUTCDate() + 1);

    return {
      fromDate: params.from,
      toDateInclusive: params.to,
      toDateExclusive: toDateStr(toExclusiveObj),
      fromIso: fromDateObj.toISOString(),
      toIsoExclusive: toExclusiveObj.toISOString(),
      periods: periodsBetween(fromDateObj, toInclusiveObj),
      label: `${params.from}..${params.to}`,
    };
  }

  throw new Error("Provide either 'period' (YYYY-MM) or both 'from' and 'to' (YYYY-MM-DD).");
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodsBetween(fromDateObj: Date, toInclusiveObj: Date): string[] {
  const periods: string[] = [];
  const cursor = new Date(Date.UTC(fromDateObj.getUTCFullYear(), fromDateObj.getUTCMonth(), 1));
  const end = new Date(Date.UTC(toInclusiveObj.getUTCFullYear(), toInclusiveObj.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    periods.push(`${y}-${m}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return periods;
}
