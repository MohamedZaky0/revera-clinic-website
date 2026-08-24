import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invoices?reservationId=X
 *
 * Returns the non-void invoice (if any) for a given reservation, together with its
 * invoice_lines and joined service/product names for bilingual display. Staff-only.
 *
 * Brief 32 (RISK-010): the Booking Invoice Modal previously re-derived totals from live
 * service prices; this endpoint exposes the immutable ledger data written at checkout time
 * by writeCheckoutInvoice().
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get('reservationId');

  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId query parameter is required.' }, { status: 400 });
  }

  try {
    // Fetch the non-void invoice for this reservation
    const { data: invoice, error: invErr } = await supabaseServer
      .from('invoices')
      .select('id, invoice_no, reservation_id, customer_id, branch_id, issued_at, subtotal, discount_total, grand_total, status')
      .eq('reservation_id', reservationId)
      .neq('status', 'void')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!invoice) {
      return NextResponse.json({ invoice: null, lines: [] });
    }

    // Fetch invoice lines with joined service/product names for bilingual display
    const { data: lines, error: linesErr } = await supabaseServer
      .from('invoice_lines')
      .select('id, line_type, service_id, product_id, description, qty, unit_price, discount, line_total')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: true });

    if (linesErr) throw linesErr;

    // Collect service_ids and product_ids for bilingual name lookup
    const serviceIds = (lines || []).filter((l: any) => l.service_id != null).map((l: any) => l.service_id);
    const productIds = (lines || []).filter((l: any) => l.product_id != null).map((l: any) => l.product_id);

    let serviceNameMap: Record<number, { en: string; ar: string }> = {};
    let productNameMap: Record<string, { en: string; ar: string }> = {};

    if (serviceIds.length > 0) {
      const { data: services } = await supabaseServer
        .from('services')
        .select('id, en, ar')
        .in('id', serviceIds);
      if (services) {
        for (const s of services) {
          serviceNameMap[s.id] = { en: s.en || '', ar: s.ar || '' };
        }
      }
    }

    if (productIds.length > 0) {
      const { data: products } = await supabaseServer
        .from('inventory_products')
        .select('id, name, name_ar')
        .in('id', productIds);
      if (products) {
        for (const p of products) {
          productNameMap[p.id] = { en: p.name || '', ar: p.name_ar || '' };
        }
      }
    }

    // Enrich lines with bilingual names
    const enrichedLines = (lines || []).map((line: any) => {
      let nameEn = line.description;
      let nameAr = line.description;

      if (line.service_id && serviceNameMap[line.service_id]) {
        nameEn = serviceNameMap[line.service_id].en || line.description;
        nameAr = serviceNameMap[line.service_id].ar || line.description;
      } else if (line.product_id && productNameMap[line.product_id]) {
        nameEn = productNameMap[line.product_id].en || line.description;
        nameAr = productNameMap[line.product_id].ar || line.description;
      }

      return {
        ...line,
        nameEn,
        nameAr,
      };
    });

    return NextResponse.json({ invoice, lines: enrichedLines });
  } catch (err: any) {
    console.error('GET /api/invoices error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch invoice.' }, { status: 500 });
  }
}
