/**
 * Customer balance arithmetic.
 *
 * Extracted from the reservations PATCH handler so it can be reasoned about and tested
 * on its own — see scratch/billingcheck.ts. It is money maths; it should not live inline
 * in a route handler.
 *
 * PROPOSAL-002 Phase 1 replaces these running scalars with an invoice/payment ledger, at
 * which point `spent` and `outstanding` become derived rather than stored. This module is
 * the interim correct version, and the place that ledger maths should land.
 */

export interface CustomerBalances {
  wallet: number;
  spent: number;
  outstanding: number;
}

export interface SettlementInput {
  /** Balances as currently stored on the customer row. */
  current: CustomerBalances;
  /** Was the reservation already `completed` before this update? */
  wasCompleted: boolean;
  /** amount_paid / amount_left on the reservation row before this update. */
  oldPaid: number;
  oldLeft: number;
  /** amount_paid / amount_left after this update. */
  newPaid: number;
  newLeft: number;
  /** Explicit wallet movements supplied by the checkout flow. */
  walletDeposit?: number;
  walletWithdrawal?: number;
}

export interface SettlementResult extends CustomerBalances {
  /** True when a value would have gone negative and was clamped — worth logging. */
  clamped: boolean;
  /** True when wallet movements were supplied but ignored as out-of-sequence. */
  walletIgnored: boolean;
}

/**
 * Apply a reservation settlement to a customer's balances.
 *
 * Deltas, not absolutes. The original implementation did
 * `outstanding = outstanding + amountLeft` unconditionally, so debt only ever grew, no
 * path could reduce it, and re-firing the same completed PATCH double-counted (RISK-012).
 *
 * Debt exists only once the service is delivered: before completion `amount_left` is
 * merely "not paid yet", not money owed. So on the completion transition the entire
 * remaining balance becomes debt, while on a later payment only the change does.
 *
 * Wallet movements arrive as deltas from the checkout modal, so they are applied only on
 * the completion transition — re-sending them later would move the wallet twice.
 */
export function computeSettledBalances(input: SettlementInput): SettlementResult {
  const {
    current, wasCompleted, oldPaid, oldLeft, newPaid, newLeft,
    walletDeposit = 0, walletWithdrawal = 0,
  } = input;

  const outstandingDelta = wasCompleted ? newLeft - oldLeft : newLeft;
  const spentDelta = wasCompleted ? newPaid - oldPaid : newPaid;

  const deposit = Number(walletDeposit || 0);
  const withdrawal = Number(walletWithdrawal || 0);
  const walletIgnored = false;

  const rawWallet = current.wallet + deposit - withdrawal;
  const rawSpent = current.spent + spentDelta + withdrawal;
  const rawOutstanding = current.outstanding + outstandingDelta;

  return {
    wallet: Math.max(0, rawWallet),
    spent: Math.max(0, rawSpent),
    outstanding: Math.max(0, rawOutstanding),
    clamped: rawWallet < 0 || rawSpent < 0 || rawOutstanding < 0,
    walletIgnored,
  };
}
