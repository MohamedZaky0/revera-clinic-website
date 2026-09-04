import { describe, it, expect } from 'vitest';
import { computeLedgerBalances } from '@/lib/customerBalances';

describe('computeLedgerBalances', () => {
  it('only issued invoices count toward outstanding and spent', () => {
    const invoices = [
      { id: 'inv-1', grandTotal: 100, status: 'issued' as const },
      { id: 'inv-2', grandTotal: 200, status: 'draft' as const },
      { id: 'inv-3', grandTotal: 50, status: 'void' as const },
    ];
    const payments = [
      { invoiceId: 'inv-1', amount: 60 },
      { invoiceId: 'inv-2', amount: 100 }, // draft — should be ignored
    ];
    const result = computeLedgerBalances(invoices, payments, []);
    expect(result.outstanding).toBe(40); // max(0, 100 - 60)
    expect(result.spent).toBe(60); // only inv-1's payment
  });

  it('outstanding is max(0, grandTotal - paid) per invoice', () => {
    const invoices = [
      { id: 'inv-1', grandTotal: 100, status: 'issued' as const },
      { id: 'inv-2', grandTotal: 200, status: 'issued' as const },
    ];
    const payments = [
      { invoiceId: 'inv-1', amount: 100 }, // fully paid → 0 outstanding
      { invoiceId: 'inv-2', amount: 50 },  // 150 outstanding
    ];
    const result = computeLedgerBalances(invoices, payments, []);
    expect(result.outstanding).toBe(150);
    expect(result.spent).toBe(150); // 100 + 50
  });

  it('overpaid invoice contributes 0 to outstanding (not negative)', () => {
    const invoices = [
      { id: 'inv-1', grandTotal: 100, status: 'issued' as const },
    ];
    const payments = [
      { invoiceId: 'inv-1', amount: 150 }, // overpaid
    ];
    const result = computeLedgerBalances(invoices, payments, []);
    expect(result.outstanding).toBe(0);
    expect(result.spent).toBe(150);
  });

  it('wallet is sum(in) - sum(out), clamped at 0', () => {
    const txns = [
      { direction: 'in' as const, amount: 100 },
      { direction: 'out' as const, amount: 30 },
      { direction: 'in' as const, amount: 50 },
    ];
    const result = computeLedgerBalances([], [], txns);
    expect(result.wallet).toBe(120); // 100 - 30 + 50
    expect(result.walletClamped).toBe(false);
  });

  it('wallet clamped at 0 when it would go negative', () => {
    const txns = [
      { direction: 'in' as const, amount: 50 },
      { direction: 'out' as const, amount: 100 },
    ];
    const result = computeLedgerBalances([], [], txns);
    expect(result.wallet).toBe(0); // clamped from -50
    expect(result.walletClamped).toBe(true);
  });

  it('empty inputs → all zeros', () => {
    const result = computeLedgerBalances([], [], []);
    expect(result.outstanding).toBe(0);
    expect(result.spent).toBe(0);
    expect(result.wallet).toBe(0);
    expect(result.walletClamped).toBe(false);
  });

  it('payments against draft/void invoices are ignored', () => {
    const invoices = [
      { id: 'inv-1', grandTotal: 100, status: 'void' as const },
    ];
    const payments = [
      { invoiceId: 'inv-1', amount: 100 },
    ];
    const result = computeLedgerBalances(invoices, payments, []);
    expect(result.outstanding).toBe(0);
    expect(result.spent).toBe(0);
  });
});
