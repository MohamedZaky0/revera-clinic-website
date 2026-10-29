import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { formatInvoiceNo, buildInvoiceLine, buildInvoiceTotals } from '@/lib/ledger';
import { getServicePriceDetails } from '@/lib/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invoices?reservationId=X
 *
 * Returns the non-void invoice (if any) for a given reservation. Staff-only.
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
    let { data: invoice, error: invErr } = await supabaseServer
      .from('invoices')
      .select('id, invoice_no, reservation_id, customer_id, branch_id, issued_at, subtotal, discount_total, grand_total, status')
      .eq('reservation_id', reservationId)
      .neq('status', 'void')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!invoice) {
      // If no invoice found for this reservation, check if the reservation exists and auto-create the standard sequential invoice
      const { data: res } = await supabaseServer
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .maybeSingle();

      if (res) {
        try {
          const { data: seqValue, error: seqErr } = await supabaseServer.rpc('next_invoice_no');
          if (!seqErr && seqValue != null) {
            const invoiceNo = formatInvoiceNo(Number(seqValue));
            const allServiceIds = Array.isArray(res.service_ids) && res.service_ids.length > 0
              ? res.service_ids
              : (res.service_id ? [res.service_id] : []);

            let branchName: string | null = null;
            if (res.branch_id) {
              const { data: bObj } = await supabaseServer.from('branches').select('name_en, name_ar').eq('id', res.branch_id).maybeSingle();
              if (bObj) branchName = bObj.name_en || bObj.name_ar || null;
            }

            let services: any[] = [];
            if (allServiceIds.length > 0) {
              const { data: sData } = await supabaseServer.from('services').select('id, en, ar, price, branch_pricing').in('id', allServiceIds);
              if (sData) services = sData;
            }

            const invLines = services.map((svc: any) => {
              const priceDetails = getServicePriceDetails(
                { price: svc.price !== null ? Number(svc.price) : 0, branchPricing: svc.branch_pricing },
                branchName
              );
              return buildInvoiceLine({
                lineType: 'service',
                description: svc.en || svc.ar || `Service #${svc.id}`,
                qty: 1,
                unitPrice: priceDetails.basePrice,
                discount: priceDetails.basePrice - priceDetails.discountedPrice,
                serviceId: svc.id,
                providerId: res.provider_id ?? undefined,
              });
            });

            if (invLines.length === 0 && Number(res.amount_paid || res.amount_left || 0) > 0) {
              invLines.push(buildInvoiceLine({
                lineType: 'service',
                description: `Service #${res.service_id || 'Booking'}`,
                qty: 1,
                unitPrice: Number(res.amount_paid || 0) + Number(res.amount_left || 0),
                discount: 0,
                serviceId: res.service_id || undefined,
                providerId: res.provider_id ?? undefined,
              }));
            }

            const totals = buildInvoiceTotals(invLines);
            const { data: newInv, error: createErr } = await supabaseServer
              .from('invoices')
              .insert({
                invoice_no: invoiceNo,
                reservation_id: res.id,
                customer_id: res.customer_id,
                branch_id: res.branch_id,
                subtotal: totals.subtotal,
                discount_total: totals.discountTotal,
                grand_total: totals.grandTotal,
                // 'issued' regardless of how much is paid (DEC-139): invoices.status is CHECK
                // (draft | issued | void), so the former 'paid' made this insert fail and burned
                // an invoice number for every already-settled booking. Paid-ness comes from payments.
                status: 'issued',
              })
              .select('id, invoice_no, reservation_id, customer_id, branch_id, issued_at, subtotal, discount_total, grand_total, status')
              .single();

            if (!createErr && newInv) {
              invoice = newInv;
              if (invLines.length > 0) {
                await supabaseServer.from('invoice_lines').insert(
                  invLines.map((l) => ({ ...l, invoice_id: newInv.id }))
                );
              }
              if (Number(res.amount_paid || 0) > 0) {
                await supabaseServer.from('payments').insert({
                  invoice_id: newInv.id,
                  amount: Number(res.amount_paid),
                  method: 'cash',
                  reference: invoiceNo,
                });
              }
            }
          }
        } catch (autoInvErr) {
          console.error('Auto-creating invoice for reservation failed:', autoInvErr);
        }
      }

      if (!invoice) {
        return NextResponse.json({ invoice: null, lines: [] });
      }
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

    const serviceNameMap: Record<number, { en: string; ar: string }> = {};
    const productNameMap: Record<string, { en: string; ar: string }> = {};

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
