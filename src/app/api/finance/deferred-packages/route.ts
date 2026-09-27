import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { computeDeferredBreakdown, type DeferredPackageInput } from '@/lib/financeBridge';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/deferred-packages
 *
 * DEC-088 item 9: the deferred package balance — money collected for services not yet delivered — broken down by what
 * it is owed for (pulses, and sessions per service), plus the packages whose price is still pending. A balance as of
 * now, not a period figure, and clinic-wide: customer_packages carries no branch, like loans.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_pnl')) {
    return NextResponse.json({ error: 'Finance P&L access is required.' }, { status: 403 });
  }

  try {
    const { data: rows, error } = await supabaseServer
      .from('customer_packages')
      .select('id, customer_id, package_id, status, price_paid, price_pending, package_type, total_pulses, pulses_remaining, expires_at')
      .in('status', ['active', 'expired']);
    if (error) throw error;
    const pkgRows = (rows || []) as any[];
    const asOf = new Date();

    if (pkgRows.length === 0) {
      return NextResponse.json({ asOf: asOf.toISOString(), ...computeDeferredBreakdown([], asOf) });
    }

    const ids = pkgRows.map((r) => r.id);
    const customerIds = Array.from(new Set(pkgRows.map((r) => r.customer_id).filter(Boolean)));
    const catalogIds = Array.from(new Set(pkgRows.map((r) => r.package_id).filter(Boolean)));

    const [itemsRes, customersRes, catalogRes] = await Promise.all([
      supabaseServer.from('customer_package_items').select('customer_package_id, service_id, qty_total, qty_remaining').in('customer_package_id', ids),
      customerIds.length ? supabaseServer.from('customers').select('id, name').in('id', customerIds) : Promise.resolve({ data: [], error: null } as any),
      catalogIds.length ? supabaseServer.from('packages').select('id, name, name_ar').in('id', catalogIds) : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (itemsRes.error) throw itemsRes.error;
    if (customersRes.error) throw customersRes.error;
    if (catalogRes.error) throw catalogRes.error;

    const items = (itemsRes.data || []) as any[];
    const serviceIds = Array.from(new Set(items.map((i) => i.service_id).filter((v) => v !== null && v !== undefined)));
    let serviceNames = new Map<string, string>();
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabaseServer.from('services').select('id, en, ar').in('id', serviceIds);
      if (servicesError) throw servicesError;
      serviceNames = new Map((services || []).map((s: any) => [String(s.id), s.en || s.ar || `Service #${s.id}`]));
    }
    const customerNames = new Map(((customersRes.data || []) as any[]).map((c) => [c.id, c.name || 'Patient']));
    const catalogNames = new Map(((catalogRes.data || []) as any[]).map((p) => [p.id, p.name || p.name_ar || 'Package']));

    const packages: DeferredPackageInput[] = pkgRows.map((r) => ({
      id: r.id,
      customerName: customerNames.get(r.customer_id) || 'Patient',
      packageName: catalogNames.get(r.package_id) || 'Package',
      packageType: r.package_type === 'pulses' ? 'pulses' : 'services',
      status: String(r.status || 'active'),
      expiresAt: r.expires_at || null,
      pricePaid: Number(r.price_paid || 0),
      pricePending: Boolean(r.price_pending),
      totalPulses: Number(r.total_pulses || 0),
      pulsesRemaining: Number(r.pulses_remaining || 0),
      items: items
        .filter((i) => i.customer_package_id === r.id)
        .map((i) => ({
          serviceId: i.service_id === null || i.service_id === undefined ? null : Number(i.service_id),
          serviceName: serviceNames.get(String(i.service_id)) || `Service #${i.service_id}`,
          qtyTotal: Number(i.qty_total || 0),
          qtyRemaining: Number(i.qty_remaining || 0),
        })),
    }));

    return NextResponse.json({ asOf: asOf.toISOString(), ...computeDeferredBreakdown(packages, asOf) });
  } catch (error: any) {
    console.error('GET /api/finance/deferred-packages failed:', error);
    return NextResponse.json({ error: error?.message || 'Unable to compute the deferred package balance.' }, { status: 500 });
  }
}
