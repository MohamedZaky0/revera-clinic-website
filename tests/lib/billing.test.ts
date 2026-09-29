import { describe, it, expect } from 'vitest';
import { computeSettledBalances, settlePaymentMismatch, effectiveInvoiceValue, settleHistoricalEdit } from '@/lib/billing';

describe('computeSettledBalances', () => {
  const base = { wallet: 100, spent: 500, outstanding: 200 };

  it('first completion: outstanding increases by newLeft, spent by newPaid', () => {
    const result = computeSettledBalances({
      current: base,
      wasCompleted: false,
      oldPaid: 0,
      oldLeft: 0,
      newPaid: 300,
      newLeft: 150,
    });
    expect(result.outstanding).toBe(350); // 200 + 150
    expect(result.spent).toBe(800); // 500 + 300
    expect(result.wallet).toBe(100);
    expect(result.clamped).toBe(false);
    expect(result.walletIgnored).toBe(false);
  });

  it('re-fire on already-completed: deltas are newLeft - oldLeft and newPaid - oldPaid (RISK-012)', () => {
    const result = computeSettledBalances({
      current: base,
      wasCompleted: true,
      oldPaid: 200,
      oldLeft: 300,
      newPaid: 250,
      newLeft: 300,
    });
    // outstanding delta = 300 - 300 = 0 → stays 200
    expect(result.outstanding).toBe(200);
    // spent delta = 250 - 200 = 50 → 500 + 50 = 550
    expect(result.spent).toBe(550);
  });

  it('re-fire with identical inputs on wasCompleted: true → no change (idempotent)', () => {
    const result = computeSettledBalances({
      current: base,
      wasCompleted: true,
      oldPaid: 200,
      oldLeft: 300,
      newPaid: 200,
      newLeft: 300,
    });
    expect(result.outstanding).toBe(200);
    expect(result.spent).toBe(500);
    expect(result.wallet).toBe(100);
  });

  // Was: wallet fields were unconditionally discarded whenever wasCompleted was true. That broke
  // a real case — a doctor completes a booking with no wallet info, and reception's later payment
  // settlement wants to apply wallet credit or deposit change against the same reservation, which
  // is a legitimate, first-time instruction even though the booking is already completed.
  //
  // computeSettledBalances is a pure function with no way to know whether an incoming
  // walletDeposit/walletWithdrawal is a brand-new instruction or a retried duplicate of one
  // already applied — it has no access to wallet_txns. That distinction now lives one layer up,
  // in the PATCH /api/reservations route, which checks wallet_txns for a matching row against the
  // reservation's invoice before calling this function, and passes 0 instead when it finds one
  // (see tests/routes/reservations-patch.test.ts, "re-firing the identical wallet instruction").
  // This function's job is simpler now: apply whatever amount it is given, regardless of
  // wasCompleted. `walletIgnored` is always false; kept on the return shape for now rather than
  // changing the type further while nothing outside this file reads it.
  it('wallet deposit/withdrawal are applied even when already completed — the caller decides idempotency', () => {
    const result = computeSettledBalances({
      current: base,
      wasCompleted: true,
      oldPaid: 200,
      oldLeft: 300,
      newPaid: 200,
      newLeft: 300,
      walletDeposit: 50,
      walletWithdrawal: 30,
    });
    expect(result.walletIgnored).toBe(false);
    expect(result.wallet).toBe(120); // 100 + 50 - 30
  });

  it('wallet deposit applied on first completion', () => {
    const result = computeSettledBalances({
      current: base,
      wasCompleted: false,
      oldPaid: 0,
      oldLeft: 0,
      newPaid: 200,
      newLeft: 100,
      walletDeposit: 50,
    });
    expect(result.wallet).toBe(150); // 100 + 50
    expect(result.walletIgnored).toBe(false);
  });

  it('wallet withdrawal adds to spent', () => {
    const result = computeSettledBalances({
      current: base,
      wasCompleted: false,
      oldPaid: 0,
      oldLeft: 0,
      newPaid: 200,
      newLeft: 100,
      walletWithdrawal: 40,
    });
    expect(result.wallet).toBe(60); // 100 - 40
    expect(result.spent).toBe(740); // 500 + 200 + 40
  });

  it('clamping: results never go below 0, clamped is true', () => {
    const result = computeSettledBalances({
      current: { wallet: 10, spent: 5, outstanding: 0 },
      wasCompleted: false,
      oldPaid: 0,
      oldLeft: 0,
      newPaid: 0,
      newLeft: 0,
      walletWithdrawal: 50,
    });
    expect(result.wallet).toBe(0); // clamped from -40
    expect(result.spent).toBe(55); // 5 + 0 + 50
    expect(result.clamped).toBe(true);
  });

  it('clamping: outstanding clamped to 0 when it would go negative', () => {
    const result = computeSettledBalances({
      current: { wallet: 100, spent: 500, outstanding: 50 },
      wasCompleted: true,
      oldPaid: 100,
      oldLeft: 100,
      newPaid: 100,
      newLeft: 30,
    });
    // outstanding delta = 30 - 100 = -70 → 50 - 70 = -20 → clamped to 0
    expect(result.outstanding).toBe(0);
    expect(result.clamped).toBe(true);
  });
});

describe('settlePaymentMismatch (RISK-087)', () => {
  const zero = { wallet: 0, spent: 0, outstanding: 0 };

  it('exact payment: no change to wallet or outstanding, spent grows by amountPaid', () => {
    const result = settlePaymentMismatch({ current: { wallet: 100, spent: 500, outstanding: 200 }, invoiceValue: 300, amountPaid: 300 });
    expect(result).toEqual({ outstanding: 200, wallet: 100, spent: 800 });
  });

  it('underpaid, no wallet credit: the whole shortfall becomes debt', () => {
    const result = settlePaymentMismatch({ current: zero, invoiceValue: 500, amountPaid: 300 });
    expect(result).toEqual({ outstanding: 200, wallet: 0, spent: 300 });
  });

  it('underpaid, existing wallet fully covers the shortfall', () => {
    const result = settlePaymentMismatch({ current: { wallet: 300, spent: 0, outstanding: 0 }, invoiceValue: 500, amountPaid: 300 });
    expect(result).toEqual({ outstanding: 0, wallet: 100, spent: 300 });
  });

  it('underpaid, wallet exactly covers the shortfall (wallet lands at 0, no debt)', () => {
    const result = settlePaymentMismatch({ current: { wallet: 200, spent: 0, outstanding: 0 }, invoiceValue: 500, amountPaid: 300 });
    expect(result).toEqual({ outstanding: 0, wallet: 0, spent: 300 });
  });

  it('underpaid, wallet only partly covers the shortfall: wallet drained, remainder becomes debt', () => {
    const result = settlePaymentMismatch({ current: { wallet: 100, spent: 0, outstanding: 0 }, invoiceValue: 500, amountPaid: 300 });
    expect(result).toEqual({ outstanding: 100, wallet: 0, spent: 300 });
  });

  it('underpaid, wallet partly covers on top of pre-existing debt: wallet drained, remainder adds to the existing debt', () => {
    const result = settlePaymentMismatch({ current: { wallet: 100, spent: 0, outstanding: 50 }, invoiceValue: 500, amountPaid: 300 });
    expect(result).toEqual({ outstanding: 150, wallet: 0, spent: 300 }); // 50 + (200 - 100)
  });

  it('overpaid, no existing debt: the whole overpayment becomes wallet credit', () => {
    const result = settlePaymentMismatch({ current: zero, invoiceValue: 300, amountPaid: 500 });
    expect(result).toEqual({ outstanding: 0, wallet: 200, spent: 500 });
  });

  it('overpaid, existing debt fully absorbs the overpayment', () => {
    const result = settlePaymentMismatch({ current: { wallet: 0, spent: 0, outstanding: 300 }, invoiceValue: 300, amountPaid: 500 });
    expect(result).toEqual({ outstanding: 100, wallet: 0, spent: 500 });
  });

  it('overpaid, overpayment exactly clears existing debt (no wallet credit)', () => {
    const result = settlePaymentMismatch({ current: { wallet: 0, spent: 0, outstanding: 200 }, invoiceValue: 300, amountPaid: 500 });
    expect(result).toEqual({ outstanding: 0, wallet: 0, spent: 500 });
  });

  it('overpaid, overpayment clears existing debt with credit left over for the wallet', () => {
    const result = settlePaymentMismatch({ current: { wallet: 0, spent: 0, outstanding: 100 }, invoiceValue: 300, amountPaid: 500 });
    expect(result).toEqual({ outstanding: 0, wallet: 100, spent: 500 }); // 200 overpaid - 100 debt
  });

  it('overpaid on top of existing wallet credit: both add up', () => {
    const result = settlePaymentMismatch({ current: { wallet: 50, spent: 0, outstanding: 0 }, invoiceValue: 300, amountPaid: 500 });
    expect(result).toEqual({ outstanding: 0, wallet: 250, spent: 500 });
  });

  it('zero-value booking, unpaid: no wallet/debt change, spent unaffected', () => {
    const result = settlePaymentMismatch({ current: { wallet: 100, spent: 500, outstanding: 200 }, invoiceValue: 0, amountPaid: 0 });
    expect(result).toEqual({ outstanding: 200, wallet: 100, spent: 500 });
  });
});

describe('effectiveInvoiceValue', () => {
  it('1200 / 1000 → 1200', () => {
    expect(effectiveInvoiceValue(1200, 1000)).toBe(1200);
  });

  it('0 / 1000 → 1000', () => {
    expect(effectiveInvoiceValue(0, 1000)).toBe(1000);
  });

  it('0 / 0 → 0', () => {
    expect(effectiveInvoiceValue(0, 0)).toBe(0);
  });
});

describe('settleHistoricalEdit', () => {
  const base = { wallet: 0, spent: 1000, outstanding: 0 };

  it('no change → identical balances', () => {
    const result = settleHistoricalEdit({
      current: base,
      oldInvoiceValue: 1000,
      oldAmountPaid: 1000,
      newInvoiceValue: 1000,
      newAmountPaid: 1000,
    });
    expect(result).toEqual(base);
  });

  it('invoice raised 1000→1500, paid stays 1000, no wallet → outstanding +500, spent unchanged', () => {
    const result = settleHistoricalEdit({
      current: base,
      oldInvoiceValue: 1000,
      oldAmountPaid: 1000,
      newInvoiceValue: 1500,
      newAmountPaid: 1000,
    });
    expect(result).toEqual({ wallet: 0, spent: 1000, outstanding: 500 });
  });

  it('same, but wallet 300 → wallet 0, outstanding +200', () => {
    const result = settleHistoricalEdit({
      current: { wallet: 300, spent: 1000, outstanding: 0 },
      oldInvoiceValue: 1000,
      oldAmountPaid: 1000,
      newInvoiceValue: 1500,
      newAmountPaid: 1000,
    });
    expect(result).toEqual({ wallet: 0, spent: 1000, outstanding: 200 });
  });

  it('paid lowered 1000→600 (value 1000) → spent −400, outstanding +400', () => {
    const result = settleHistoricalEdit({
      current: base,
      oldInvoiceValue: 1000,
      oldAmountPaid: 1000,
      newInvoiceValue: 1000,
      newAmountPaid: 600,
    });
    expect(result).toEqual({ wallet: 0, spent: 600, outstanding: 400 });
  });

  it('paid raised 600→1000 (value 1000) with outstanding 400 → outstanding 0, spent +400', () => {
    const result = settleHistoricalEdit({
      current: { wallet: 0, spent: 600, outstanding: 400 },
      oldInvoiceValue: 1000,
      oldAmountPaid: 600,
      newInvoiceValue: 1000,
      newAmountPaid: 1000,
    });
    expect(result).toEqual({ wallet: 0, spent: 1000, outstanding: 0 });
  });

  it('paid raised beyond value (value 1000, paid 1000→1300), no debt → wallet +300', () => {
    const result = settleHistoricalEdit({
      current: base,
      oldInvoiceValue: 1000,
      oldAmountPaid: 1000,
      newInvoiceValue: 1000,
      newAmountPaid: 1300,
    });
    expect(result).toEqual({ wallet: 300, spent: 1300, outstanding: 0 });
  });

  it('old booking had no invoice value (0, paid 800), edit enters value 1000 & paid 800 → outstanding +200', () => {
    const result = settleHistoricalEdit({
      current: base,
      oldInvoiceValue: 0,
      oldAmountPaid: 800,
      newInvoiceValue: 1000,
      newAmountPaid: 800,
    });
    expect(result).toEqual({ wallet: 0, spent: 1000, outstanding: 200 });
  });

  it('spent never goes negative', () => {
    const result = settleHistoricalEdit({
      current: { wallet: 0, spent: 100, outstanding: 0 },
      oldInvoiceValue: 1000,
      oldAmountPaid: 500,
      newInvoiceValue: 1000,
      newAmountPaid: 200,
    });
    expect(result.spent).toBe(0);
    expect(result.spent).not.toBeLessThan(0);
  });
});
