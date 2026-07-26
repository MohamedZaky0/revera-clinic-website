/**
 * Pure invoice/line/payment arithmetic for the PROPOSAL-002 Phase 1 financial ledger.
 *
 * No `supabaseServer` calls in this file, on purpose — route handlers call these to compute
 * *what* to write, then perform the actual insert themselves. Mirrors the pattern established
 * in src/lib/billing.ts (computeSettledBalances) and src/lib/customerIdentity.ts (isOwnIdentity)
 * in Phase 0: pure functions are what scratch/*.ts can actually test without a live database.
 *
 * See ai_docs/DECISIONS.md DEC-021 (tax-inclusive pricing) and ai_docs/FINANCE_TRACKER.md
 * "Phase 1 — Financial Ledger Spine" task 1.7 for the design this implements.
 */

export type InvoiceLineType = 'service' | 'product' | 'package';

export interface InvoiceLineInput {
  lineType: InvoiceLineType;
  description: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  serviceId?: number;
  productId?: string;
  packageId?: string;
  providerId?: string;
}

export interface InvoiceLineDraft {
  line_type: InvoiceLineType;
  description: string;
  qty: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
  service_id: number | null;
  product_id: string | null;
  package_id: string | null;
  provider_id: string | null;
}

/**
 * Builds one invoice line, computing `line_total` server-side rather than trusting a
 * client-supplied total — the same reasoning as RISK-010: a stored total must be derived from
 * inputs the server itself validated, not passed through from the request body.
 */
export function buildInvoiceLine(input: InvoiceLineInput): InvoiceLineDraft {
  const qty = Number(input.qty);
  const unitPrice = Number(input.unitPrice);
  const discount = Number(input.discount ?? 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`buildInvoiceLine: qty must be a positive number, got ${input.qty}`);
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error(`buildInvoiceLine: unitPrice must be >= 0, got ${input.unitPrice}`);
  }

  const rawTotal = qty * unitPrice - discount;

  return {
    line_type: input.lineType,
    description: input.description,
    qty,
    unit_price: unitPrice,
    discount,
    tax_rate: Number(input.taxRate ?? 0),
    line_total: Math.max(0, round2(rawTotal)),
    service_id: input.serviceId ?? null,
    product_id: input.productId ?? null,
    package_id: input.packageId ?? null,
    provider_id: input.providerId ?? null,
  };
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
}

/**
 * Sums a set of lines into invoice-level totals. Rounds once at the end rather than per line,
 * so subtotal - discountTotal always equals grandTotal exactly — summing already-rounded line
 * totals and separately summing already-rounded per-line discounts can drift apart by a cent
 * when there are several lines, which would make an invoice fail its own arithmetic.
 */
export function buildInvoiceTotals(lines: InvoiceLineDraft[]): InvoiceTotals {
  let rawSubtotal = 0;
  let rawDiscount = 0;

  for (const line of lines) {
    rawSubtotal += line.qty * line.unit_price;
    rawDiscount += line.discount;
  }

  const subtotal = round2(rawSubtotal);
  const discountTotal = round2(rawDiscount);
  const grandTotal = Math.max(0, round2(rawSubtotal - rawDiscount));

  return { subtotal, discountTotal, grandTotal };
}

/**
 * Derives the tax portion of a tax-inclusive gross amount (DEC-021). Display/reporting only —
 * never used to compute what gets stored; `grand_total` and `line_total` are always the
 * source of truth.
 */
export function taxPortion(grossAmount: number, taxRate: number): number {
  if (taxRate <= 0) return 0;
  return round2((grossAmount * taxRate) / (1 + taxRate));
}

/** `'INV-' + zero-padded 6-digit sequence value`, e.g. formatInvoiceNo(42) === 'INV-000042'. */
export function formatInvoiceNo(seqValue: number): string {
  return `INV-${String(seqValue).padStart(6, '0')}`;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
