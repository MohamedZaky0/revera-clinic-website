import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('service_consumables')
      .select('service_id, product_id, standard_qty, inventory_products(name, unit)')
      .eq('service_id', Number(serviceId));
    if (error) throw error;

    return NextResponse.json({ consumables: data || [] });
  } catch (err: any) {
    console.error('GET /api/service-consumables error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const { serviceId, items } = body;

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required.' }, { status: 400 });
    }
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array.' }, { status: 400 });
    }

    const normalizedItems = items.map((item: any) => ({
      productId: String(item.productId || ''),
      standardQty: Number(item.standardQty),
    }));
    if (normalizedItems.some((item) => !item.productId || !Number.isFinite(item.standardQty) || item.standardQty <= 0)) {
      return NextResponse.json(
        { error: 'Each item requires a productId and a positive standardQty.' },
        { status: 400 }
      );
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const uniqueProductIds = [...new Set(productIds)];
    if (uniqueProductIds.length !== productIds.length) {
      return NextResponse.json({ error: 'Duplicate products are not allowed in the same recipe.' }, { status: 400 });
    }

    // A recipe pointing at a retail-only product would make every future checkout for this
    // service throw at booking time (applyCheckoutCosting in /api/reservations enforces this
    // same rule) — reject it here instead, at save time, with a clear message.
    if (uniqueProductIds.length > 0) {
      const { data: products, error: productsError } = await supabaseServer
        .from('inventory_products')
        .select('id, name, role')
        .in('id', uniqueProductIds);
      if (productsError) throw productsError;

      const productsById = new Map<string, any>((products || []).map((p: any) => [p.id, p]));
      for (const id of uniqueProductIds) {
        const product = productsById.get(id);
        if (!product) {
          return NextResponse.json({ error: `Product ${id} does not exist.` }, { status: 404 });
        }
        if (!['consumable', 'both'].includes(product.role)) {
          return NextResponse.json(
            { error: `"${product.name}" is retail-only and cannot be added to a recipe. Set its role to consumable or both first.` },
            { status: 400 }
          );
        }
      }
    }

    const { error: deleteError } = await supabaseServer
      .from('service_consumables')
      .delete()
      .eq('service_id', Number(serviceId));
    if (deleteError) throw deleteError;

    if (normalizedItems.length > 0) {
      const { error: insertError } = await supabaseServer.from('service_consumables').insert(
        normalizedItems.map((item) => ({
          service_id: Number(serviceId),
          product_id: item.productId,
          standard_qty: item.standardQty,
        }))
      );
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/service-consumables error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
