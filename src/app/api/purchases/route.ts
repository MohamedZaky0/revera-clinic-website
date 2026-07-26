import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type PurchaseLineInput = {
  productId: string;
  qty: number;
  unitCost: number;
};

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { supplierId, purchasedAt, lines, paid = 0, dueDate } = await req.json();
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'At least one purchase line is required.' }, { status: 400 });
    }

    const normalizedLines: PurchaseLineInput[] = lines.map((line: any) => ({
      productId: String(line.productId || ''),
      qty: Number(line.qty),
      unitCost: Number(line.unitCost),
    }));
    if (normalizedLines.some((line) => !line.productId || !Number.isFinite(line.qty) || line.qty <= 0 || !Number.isFinite(line.unitCost) || line.unitCost < 0)) {
      return NextResponse.json({ error: 'Each purchase line requires a productId, positive qty, and non-negative unitCost.' }, { status: 400 });
    }

    const total = normalizedLines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
    const paidAmount = Number(paid);
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > total) {
      return NextResponse.json({ error: 'paid must be between 0 and the purchase total.' }, { status: 400 });
    }
    if (purchasedAt && Number.isNaN(new Date(purchasedAt).getTime())) {
      return NextResponse.json({ error: 'purchasedAt must be a valid timestamp.' }, { status: 400 });
    }
    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
      return NextResponse.json({ error: 'dueDate must be a valid timestamp.' }, { status: 400 });
    }

    const productIds = [...new Set(normalizedLines.map((line) => line.productId))];
    const [productsResult, supplierResult] = await Promise.all([
      supabaseServer.from('inventory_products').select('id').in('id', productIds),
      supplierId ? supabaseServer.from('suppliers').select('id').eq('id', supplierId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (supplierResult.error) throw supplierResult.error;
    if ((productsResult.data || []).length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products do not exist.' }, { status: 404 });
    }
    if (supplierId && !supplierResult.data) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }

    const { data: purchase, error: purchaseError } = await supabaseServer
      .from('purchases')
      .insert({
        supplier_id: supplierId || null,
        purchased_at: purchasedAt ? new Date(purchasedAt).toISOString() : new Date().toISOString(),
        total: Math.round((total + Number.EPSILON) * 100) / 100,
        paid: paidAmount,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      })
      .select()
      .single();
    if (purchaseError) throw purchaseError;

    const { data: purchaseLines, error: linesError } = await supabaseServer
      .from('purchase_lines')
      .insert(normalizedLines.map((line) => ({
        purchase_id: purchase.id,
        product_id: line.productId,
        qty: line.qty,
        unit_cost: line.unitCost,
      })))
      .select();
    if (linesError) throw linesError;

    const { error: stockError } = await supabaseServer.from('stock_movements').insert(
      (purchaseLines || []).map((line: any) => ({
        product_id: line.product_id,
        direction: 'in',
        qty: line.qty,
        unit_cost: line.unit_cost,
        reason: 'purchase',
        ref_id: line.id,
      }))
    );
    if (stockError) throw stockError;

    return NextResponse.json({ purchase, lines: purchaseLines }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/purchases error:', error);
    return NextResponse.json({ error: error.message || 'Unable to record purchase.' }, { status: 500 });
  }
}
