/**
 * Ledger-derived stock quantity (PROPOSAL-002 Phase 2, task 2.12).
 *
 * Mirrors `src/lib/customerBalances.ts` (task 1.14) exactly: a pure function deriving a value
 * fresh from an append-only ledger (`stock_movements`), for comparison against the existing
 * directly-written scalar (`inventory_products.stock_quantity`) — not yet a replacement for it.
 * No `supabaseServer` import, matching every other pure-function library in this codebase.
 *
 * Deliberately does NOT clamp at 0. A negative derived quantity is diagnostic, not a value to
 * ever display to staff — it means `stock_movements` is missing history for that product (most
 * likely a pre-ledger opening quantity that was never recorded as a movement), and hiding that
 * behind a clamp would defeat the one thing a reconciliation check exists to surface.
 */

export interface LedgerStockMovement {
  direction: 'in' | 'out';
  qty: number;
}

export function computeDerivedStockQuantity(movements: LedgerStockMovement[]): number {
  return round2(
    movements.reduce((total, movement) => {
      return total + (movement.direction === 'in' ? Number(movement.qty) : -Number(movement.qty));
    }, 0)
  );
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
