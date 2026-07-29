import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveDateRange } from '@/lib/financeReportRange';
import { deferredBalance } from '@/lib/packages';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/package-profitability?period=YYYY-MM[&packageId=]
 * GET /api/finance/package-profitability?from=YYYY-MM-DD&to=YYYY-MM-DD[&packageId=]
 *
 * Per package: revenue actually recognised in range (DEC-023, via package_revenue_recognitions)
 * against the real cost of delivering those sessions (invoice_lines.cogs_snapshot/
 * commission_snapshot on the delivering reservation's invoice, matched by service_id) --
 * answers "is this package profitable," which nothing else in this module does. Only trustworthy
 * since RISK-035 stopped double-billing package-redeemed visits; before that fix, the delivering
 * reservation's invoice line was a phantom full-price charge, not the real cost-only line this
 * endpoint expects.
 *
 * Also reports two supplementary, clearly-separated views: cash collected from NEW package sales
 * in range (a different number from recognised revenue, same "sold vs delivered" distinction the
 * package itself is built on), and a not-period-bound snapshot of outstanding deferred liability
 * -- sessions already paid for but not yet delivered -- for every currently active sale of each
 * package, using the same deferredBalance() formula the consumption RPC itself is built from.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!hasFinancePermission(access.access, 'finance.view_margins')) {
    return NextResponse.json({ error: 'Finance margin access is required.' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const packageIdFilter = url.searchParams.get('packageId');
    const range = resolveDateRange({
      period: url.searchParams.get('period'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    });

    // 1. Revenue recognised in range, per package, with enough to join back to cost.
    let recogQuery = supabaseServer
      .from('package_revenue_recognitions')
      .select('id, customer_package_id, customer_package_item_id, reservation_id, recognised_amount, customer_packages!inner(package_id)')
      .gte('recognised_at', range.fromIso)
      .lt('recognised_at', range.toIsoExclusive);
    if (packageIdFilter) recogQuery = recogQuery.eq('customer_packages.package_id', packageIdFilter);
    const { data: recognitions, error: recogError } = await recogQuery;
    if (recogError) throw recogError;

    const itemIds = Array.from(new Set((recognitions || []).map((r: any) => r.customer_package_item_id)));
    let serviceIdByItemId = new Map<string, number>();
    if (itemIds.length > 0) {
      const { data: items, error: itemsError } = await supabaseServer
        .from('customer_package_items')
        .select('id, service_id')
        .in('id', itemIds);
      if (itemsError) throw itemsError;
      serviceIdByItemId = new Map((items || []).map((i: any) => [i.id, Number(i.service_id)]));
    }

    const reservationIds = Array.from(new Set((recognitions || []).map((r: any) => r.reservation_id).filter(Boolean)));
    let invoiceIdByReservationId = new Map<string, string>();
    if (reservationIds.length > 0) {
      const { data: invoices, error: invoicesError } = await supabaseServer
        .from('invoices')
        .select('id, reservation_id')
        .in('reservation_id', reservationIds);
      if (invoicesError) throw invoicesError;
      invoiceIdByReservationId = new Map((invoices || []).map((i: any) => [i.reservation_id, i.id]));
    }

    const invoiceIds = Array.from(new Set(Array.from(invoiceIdByReservationId.values())));
    // key: `${invoiceId}::${serviceId}` -> { cogs, commission } | null (null cogs/commission = uncosted)
    const costByInvoiceAndService = new Map<string, { cogs: number | null; commission: number | null }>();
    if (invoiceIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseServer
        .from('invoice_lines')
        .select('invoice_id, service_id, cogs_snapshot, commission_snapshot')
        .in('invoice_id', invoiceIds)
        .eq('line_type', 'service');
      if (linesError) throw linesError;
      for (const line of lines || []) {
        costByInvoiceAndService.set(`${line.invoice_id}::${line.service_id}`, {
          cogs: line.cogs_snapshot === null || line.cogs_snapshot === undefined ? null : Number(line.cogs_snapshot),
          commission:
            line.commission_snapshot === null || line.commission_snapshot === undefined ? null : Number(line.commission_snapshot),
        });
      }
    }

    interface Bucket {
      sessionsDelivered: number;
      revenueRecognised: number;
      costToDeliver: number;
      commissionAttributed: number;
      uncostedSessionCount: number;
    }
    const buckets = new Map<string, Bucket>(); // key: package_id
    for (const r of recognitions || []) {
      const packageId = (r as any).customer_packages?.package_id;
      if (!packageId) continue;
      const bucket = buckets.get(packageId) || {
        sessionsDelivered: 0,
        revenueRecognised: 0,
        costToDeliver: 0,
        commissionAttributed: 0,
        uncostedSessionCount: 0,
      };
      bucket.sessionsDelivered++;
      bucket.revenueRecognised += Number(r.recognised_amount || 0);

      const serviceId = serviceIdByItemId.get(r.customer_package_item_id);
      const invoiceId = invoiceIdByReservationId.get(r.reservation_id);
      const cost = invoiceId && serviceId !== undefined ? costByInvoiceAndService.get(`${invoiceId}::${serviceId}`) : undefined;
      if (cost && cost.cogs !== null) bucket.costToDeliver += cost.cogs;
      else bucket.uncostedSessionCount++;
      if (cost && cost.commission !== null) bucket.commissionAttributed += cost.commission;

      buckets.set(packageId, bucket);
    }

    // 2. Cash collected from new sales in range -- a different number from recognised revenue,
    // same distinction cashflow draws against P&L (RISK-016's reasoning applied to packages).
    let salesQuery = supabaseServer
      .from('customer_packages')
      .select('package_id, price_paid')
      .gte('purchased_at', range.fromIso)
      .lt('purchased_at', range.toIsoExclusive);
    if (packageIdFilter) salesQuery = salesQuery.eq('package_id', packageIdFilter);
    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;
    const soldByPackage = new Map<string, { count: number; cash: number }>();
    for (const s of sales || []) {
      const entry = soldByPackage.get(s.package_id) || { count: 0, cash: 0 };
      entry.count++;
      entry.cash += Number(s.price_paid || 0);
      soldByPackage.set(s.package_id, entry);
    }

    // 3. Outstanding deferred liability, as of now -- not period-bound. Every currently active
    // sale of each package, summed the same way the consumption RPC computes totalSessions
    // (sum of qty_total across every item in that customer_package, not per-item).
    let activeQuery = supabaseServer.from('customer_packages').select('id, package_id, price_paid').eq('status', 'active');
    if (packageIdFilter) activeQuery = activeQuery.eq('package_id', packageIdFilter);
    const { data: activePackages, error: activeError } = await activeQuery;
    if (activeError) throw activeError;
    const activeIds = (activePackages || []).map((p: any) => p.id);

    const liabilityByPackage = new Map<string, number>();
    const activeCountByPackage = new Map<string, number>();
    if (activeIds.length > 0) {
      const { data: activeItems, error: activeItemsError } = await supabaseServer
        .from('customer_package_items')
        .select('customer_package_id, qty_total, qty_remaining')
        .in('customer_package_id', activeIds);
      if (activeItemsError) throw activeItemsError;

      const totalsByCp = new Map<string, { qtyTotal: number; qtyRemaining: number }>();
      for (const item of activeItems || []) {
        const t = totalsByCp.get(item.customer_package_id) || { qtyTotal: 0, qtyRemaining: 0 };
        t.qtyTotal += Number(item.qty_total || 0);
        t.qtyRemaining += Number(item.qty_remaining || 0);
        totalsByCp.set(item.customer_package_id, t);
      }

      for (const cp of activePackages || []) {
        const t = totalsByCp.get(cp.id);
        if (!t || t.qtyTotal <= 0) continue;
        const liability = deferredBalance(Number(cp.price_paid || 0), t.qtyRemaining, t.qtyTotal);
        liabilityByPackage.set(cp.package_id, round2((liabilityByPackage.get(cp.package_id) || 0) + liability));
        activeCountByPackage.set(cp.package_id, (activeCountByPackage.get(cp.package_id) || 0) + 1);
      }
    }

    // 4. Package names, and union of every package_id touched by any of the three views above.
    const allPackageIds = new Set<string>([
      ...buckets.keys(),
      ...soldByPackage.keys(),
      ...liabilityByPackage.keys(),
    ]);
    let nameById = new Map<string, string>();
    if (allPackageIds.size > 0) {
      const { data: packages, error: packagesError } = await supabaseServer
        .from('packages')
        .select('id, name')
        .in('id', Array.from(allPackageIds));
      if (packagesError) throw packagesError;
      nameById = new Map((packages || []).map((p: any) => [p.id, p.name]));
    }

    const results = Array.from(allPackageIds).map((packageId) => {
      const b = buckets.get(packageId);
      const revenueRecognised = round2(b?.revenueRecognised || 0);
      const costToDeliver = round2(b?.costToDeliver || 0);
      const commissionAttributed = round2(b?.commissionAttributed || 0);
      const contributionMargin = round2(revenueRecognised - costToDeliver - commissionAttributed);
      const sold = soldByPackage.get(packageId);

      return {
        packageId,
        packageName: nameById.get(packageId) || 'Unknown package',
        sessionsDelivered: b?.sessionsDelivered || 0,
        uncostedSessionCount: b?.uncostedSessionCount || 0,
        revenueRecognised,
        costToDeliver,
        commissionAttributed,
        contributionMargin,
        soldInRange: { count: sold?.count || 0, cash: round2(sold?.cash || 0) },
        outstanding: {
          activeCustomerPackages: activeCountByPackage.get(packageId) || 0,
          deferredLiability: liabilityByPackage.get(packageId) || 0,
        },
      };
    });

    results.sort((a, b) => b.contributionMargin - a.contributionMargin);

    return NextResponse.json({
      range: { label: range.label, from: range.fromDate, to: range.toDateInclusive },
      packages: results,
    });
  } catch (error: any) {
    console.error('GET /api/finance/package-profitability error:', error);
    return NextResponse.json({ error: error.message || 'Unable to compute package profitability.' }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
