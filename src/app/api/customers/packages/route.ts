import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

// Lists everything a customer has bought under the packages feature (customer_packages +
// customer_package_items, joined for display names) — active, expired, and fully_used alike.
// Callers filter client-side to what they need, same convention as GET /api/services and
// GET /api/packages (return everything, filter in the UI).
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('customer_packages')
      .select(`
        id, package_id, status, purchased_at, expires_at, price_paid,
        packages ( name, name_ar ),
        customer_package_items ( id, service_id, qty_total, qty_used, qty_remaining, services ( en, ar ) )
      `)
      .eq('customer_id', customerId)
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    const packages = (data || []).map((row: any) => ({
      id: row.id,
      packageId: row.package_id,
      packageName: row.packages?.name || 'Package',
      packageNameAr: row.packages?.name_ar || null,
      status: row.status,
      purchasedAt: row.purchased_at,
      expiresAt: row.expires_at,
      pricePaid: row.price_paid !== null ? Number(row.price_paid) : 0,
      items: (row.customer_package_items || []).map((it: any) => ({
        id: it.id,
        serviceId: it.service_id,
        serviceName: it.services?.en || undefined,
        serviceNameAr: it.services?.ar || undefined,
        qtyTotal: Number(it.qty_total),
        qtyUsed: Number(it.qty_used),
        qtyRemaining: Number(it.qty_remaining),
      })),
    }));

    return NextResponse.json({ packages });
  } catch (err: any) {
    console.error('GET /api/customers/packages error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
