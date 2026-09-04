import { describe, it, expect } from 'vitest';
import { buildInvoiceLine, buildInvoiceTotals, taxPortion, formatInvoiceNo } from '@/lib/ledger';

describe('buildInvoiceLine', () => {
  it('computes line_total as qty * unitPrice - discount', () => {
    const line = buildInvoiceLine({
      lineType: 'service',
      description: 'Consultation',
      qty: 2,
      unitPrice: 150,
      discount: 50,
    });
    expect(line.line_total).toBe(250);
    expect(line.qty).toBe(2);
    expect(line.unit_price).toBe(150);
    expect(line.discount).toBe(50);
  });

  it('clamps line_total to 0 when discount exceeds subtotal', () => {
    const line = buildInvoiceLine({
      lineType: 'service',
      description: 'Discounted',
      qty: 1,
      unitPrice: 100,
      discount: 200,
    });
    expect(line.line_total).toBe(0);
  });

  it('throws on qty <= 0', () => {
    expect(() =>
      buildInvoiceLine({ lineType: 'service', description: 'X', qty: 0, unitPrice: 100 })
    ).toThrow();
    expect(() =>
      buildInvoiceLine({ lineType: 'service', description: 'X', qty: -1, unitPrice: 100 })
    ).toThrow();
  });

  it('throws on negative unitPrice', () => {
    expect(() =>
      buildInvoiceLine({ lineType: 'service', description: 'X', qty: 1, unitPrice: -50 })
    ).toThrow();
  });

  it('defaults discount and taxRate to 0', () => {
    const line = buildInvoiceLine({
      lineType: 'product',
      description: 'Cream',
      qty: 1,
      unitPrice: 80,
    });
    expect(line.discount).toBe(0);
    expect(line.tax_rate).toBe(0);
  });
});

describe('buildInvoiceTotals', () => {
  it('sums lines correctly: subtotal - discountTotal = grandTotal', () => {
    const lines = [
      buildInvoiceLine({ lineType: 'service', description: 'A', qty: 2, unitPrice: 100, discount: 20 }),
      buildInvoiceLine({ lineType: 'product', description: 'B', qty: 1, unitPrice: 50, discount: 0 }),
    ];
    const totals = buildInvoiceTotals(lines);
    expect(totals.subtotal).toBe(250); // 2*100 + 1*50
    expect(totals.discountTotal).toBe(20);
    expect(totals.grandTotal).toBe(230);
  });

  it('grandTotal is clamped to 0', () => {
    const lines = [
      buildInvoiceLine({ lineType: 'service', description: 'A', qty: 1, unitPrice: 10, discount: 100 }),
    ];
    const totals = buildInvoiceTotals(lines);
    expect(totals.grandTotal).toBe(0);
  });

  it('empty lines → all zeros', () => {
    const totals = buildInvoiceTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.discountTotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });
});

describe('taxPortion', () => {
  it('derives tax from tax-inclusive gross (DEC-021)', () => {
    // gross = 120, rate = 0.2 → tax = 120 * 0.2 / 1.2 = 20
    expect(taxPortion(120, 0.2)).toBe(20);
  });

  it('returns 0 for zero tax rate', () => {
    expect(taxPortion(100, 0)).toBe(0);
  });

  it('returns 0 for negative tax rate', () => {
    expect(taxPortion(100, -0.1)).toBe(0);
  });

  it('handles 14% VAT', () => {
    // gross = 114, rate = 0.14 → tax = 114 * 0.14 / 1.14 = 14
    expect(taxPortion(114, 0.14)).toBe(14);
  });
});

describe('formatInvoiceNo', () => {
  it('zero-pads to 6 digits', () => {
    expect(formatInvoiceNo(1)).toBe('INV-000001');
    expect(formatInvoiceNo(42)).toBe('INV-000042');
    expect(formatInvoiceNo(999999)).toBe('INV-999999');
  });

  it('handles 0', () => {
    expect(formatInvoiceNo(0)).toBe('INV-000000');
  });
});
