import { describe, it, expect } from 'vitest';
import { computeSettledBalances } from '@/lib/billing';

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
