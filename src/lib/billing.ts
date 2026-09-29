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

/**
 * RISK-087: how much of an underpayment draws from an existing wallet credit before adding debt to
 * `outstanding`, and how much of an overpayment pays down existing debt before crediting the
 * wallet — extracted from `POST /api/reservations/previous`'s inline calculation (a historical /
 * pre-system booking recorded by reception) so it is a named, directly-tested pure function instead
 * of hand-written business logic buried in a route file. `spent` always grows by `amountPaid`
 * (recorded cash), independent of the wallet/outstanding allocation.
 */
export interface PaymentMismatchInput {
  current: CustomerBalances;
  /** What the booking was actually worth (the invoice value). */
  invoiceValue: number;
  /** What the patient actually paid toward it. */
  amountPaid: number;
}

export function settlePaymentMismatch(input: PaymentMismatchInput): CustomerBalances {
  let outstanding = input.current.outstanding;
  let wallet = input.current.wallet;
  const spent = input.current.spent + input.amountPaid;

  const diff = input.invoiceValue - input.amountPaid;

  if (diff > 0) {
    // Underpaid by `diff`. Existing wallet credit is used first; whatever it doesn't cover
    // becomes new debt.
    if (wallet > 0) {
      if (wallet >= diff) {
        wallet -= diff;
      } else {
        outstanding += diff - wallet;
        wallet = 0;
      }
    } else {
      outstanding += diff;
    }
  } else if (diff < 0) {
    // Overpaid by `overpaid`. Existing debt is settled first; whatever is left over becomes
    // wallet credit.
    const overpaid = -diff;
    if (outstanding > 0) {
      if (overpaid <= outstanding) {
        outstanding -= overpaid;
      } else {
        wallet += overpaid - outstanding;
        outstanding = 0;
      }
    } else {
      wallet += overpaid;
    }
  }

  return { outstanding, wallet, spent };
}
