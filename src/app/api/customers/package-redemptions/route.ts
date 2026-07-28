import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

// For a customer's booking history: which reservations were paid for (in full or in part) by
// redeeming a package session, which package that was, and when it was originally bought — so
// a "0 EGP paid" line in the history table isn't a mystery, and stays traceable even if the
// package itself is later discontinued/edited.
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
      .from('package_revenue_recognitions')
      .select(`
        reservation_id, recognised_amount, recognised_at,
        customer_packages!inner ( customer_id, purchased_at, packages ( name, name_ar ) )
      `)
      .eq('customer_packages.customer_id', customerId);

    if (error) throw error;

    const redemptions = (data || []).map((row: any) => ({
      reservationId: row.reservation_id,
      recognisedAmount: row.recognised_amount !== null ? Number(row.recognised_amount) : 0,
      recognisedAt: row.recognised_at,
      packageName: row.customer_packages?.packages?.name || 'Package',
      packageNameAr: row.customer_packages?.packages?.name_ar || null,
      packagePurchasedAt: row.customer_packages?.purchased_at || null,
    }));

    return NextResponse.json({ redemptions });
  } catch (err: any) {
    console.error('GET /api/customers/package-redemptions error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
