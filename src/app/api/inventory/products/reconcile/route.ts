import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { computeDerivedStockQuantity, type LedgerStockMovement } from '@/lib/inventoryBalances';

export const dynamic = 'force-dynamic';

interface ReconciliationRow {
  productId: string;
  productName: string | null;
  derived: number;
  scalar: number;
  matches: boolean;
}

/**
 * Read-only reconciliation report (task 2.12). Compares the stock-movement-derived quantity for
 * every product against the currently-authoritative `inventory_products.stock_quantity` scalar.
 * Writes nothing, and this task's own cutover ("replace direct stock_quantity mutation with a
 * read computed from stock_movements") does not happen until this comparison actually matches —
 * see the note on `stock_quantity` in `DB_SCHEMA.md` for current status.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const [productsResult, movementsResult] = await Promise.all([
      supabaseServer.from('inventory_products').select('id, name, stock_quantity'),
      supabaseServer.from('stock_movements').select('product_id, direction, qty'),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (movementsResult.error) throw movementsResult.error;

    const movementsByProduct = new Map<string, LedgerStockMovement[]>();
    for (const movement of movementsResult.data || []) {
      const list = movementsByProduct.get(movement.product_id) || [];
      list.push({ direction: movement.direction, qty: Number(movement.qty || 0) });
      movementsByProduct.set(movement.product_id, list);
    }

    const EPSILON = 0.01;
    const results: ReconciliationRow[] = (productsResult.data || []).map((product: any) => {
      const derived = computeDerivedStockQuantity(movementsByProduct.get(product.id) || []);
      const scalar = Number(product.stock_quantity || 0);
      return {
        productId: product.id,
        productName: product.name,
        derived,
        scalar,
        matches: Math.abs(derived - scalar) < EPSILON,
      };
    });

    const discrepancies = results.filter((result) => !result.matches);

    return NextResponse.json({
      productsChecked: results.length,
      discrepancyCount: discrepancies.length,
      discrepancies,
      allMatched: discrepancies.length === 0,
    });
  } catch (err: any) {
    console.error('GET /api/inventory/products/reconcile error:', err);
    return NextResponse.json({ error: err.message || 'Reconciliation failed.' }, { status: 500 });
  }
}
