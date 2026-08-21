import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

type CustomerPackageItem = {
  id: string;
  service_id: number;
  customer_package_id: string;
  customer_packages: {
    customer_id: string;
  } | null;
};

type Reservation = {
  id: string;
  customer_id: string | null;
  service_id: number | null;
  service_ids: number[] | null;
  status: string;
};

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { customerPackageItemId, reservationId } = await req.json();
    if (!customerPackageItemId || !reservationId) {
      return NextResponse.json(
        { error: 'customerPackageItemId and reservationId are required.' },
        { status: 400 }
      );
    }

    const [itemResult, reservationResult] = await Promise.all([
      supabaseServer
        .from('customer_package_items')
        .select('id, service_id, customer_package_id, customer_packages!inner(customer_id)')
        .eq('id', customerPackageItemId)
        .maybeSingle(),
      supabaseServer
        .from('reservations')
        .select('id, customer_id, service_id, service_ids, status')
        .eq('id', reservationId)
        .maybeSingle(),
    ]);

    if (itemResult.error) throw itemResult.error;
    if (reservationResult.error) throw reservationResult.error;

    const item = itemResult.data as CustomerPackageItem | null;
    const reservation = reservationResult.data as Reservation | null;
    if (!item) return NextResponse.json({ error: 'Customer package item not found.' }, { status: 404 });
    if (!reservation) return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    if (reservation.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed reservations can consume a package session.' }, { status: 409 });
    }
    let isCustomerMatch = reservation.customer_id === item.customer_packages?.customer_id;
    if (!isCustomerMatch && item.customer_packages?.customer_id) {
      // Check if phone matches customer phone
      const { data: custData } = await supabaseServer
        .from('customers')
        .select('id, phone')
        .eq('id', item.customer_packages.customer_id)
        .maybeSingle();

      const cleanCustPhone = (custData?.phone || '').trim().replace(/\D/g, '');
      const cleanResPhone = ((reservation as any).phone || (reservation as any).customer_phone || '').trim().replace(/\D/g, '');
      if (cleanCustPhone && cleanResPhone && cleanCustPhone === cleanResPhone) {
        isCustomerMatch = true;
        // Backfill customer_id on reservation
        await supabaseServer
          .from('reservations')
          .update({ customer_id: item.customer_packages.customer_id })
          .eq('id', reservationId);
      }
    }

    if (!isCustomerMatch && reservation.customer_id) {
      return NextResponse.json({ error: 'Reservation does not belong to this package customer.' }, { status: 409 });
    }

    const reservationServiceIds = Array.isArray(reservation.service_ids) && reservation.service_ids.length > 0
      ? reservation.service_ids.map(Number)
      : reservation.service_id === null ? [] : [Number(reservation.service_id)];
    let hasService = reservationServiceIds.includes(Number(item.service_id));
    if (!hasService) {
      const { data: rpRows } = await supabaseServer
        .from('reservation_products')
        .select('service_id')
        .eq('reservation_id', reservationId);
      const rpServiceIds = (rpRows || []).map((rp: any) => Number(rp.service_id)).filter(Boolean);
      if (rpServiceIds.includes(Number(item.service_id))) {
        hasService = true;
      }
    }

    let consumptionData = null;
    const { data, error } = await supabaseServer.rpc('consume_customer_package_session', {
      p_customer_package_item_id: customerPackageItemId,
      p_reservation_id: reservationId,
      p_employee_id: access.access.employee.id,
    });

    if (error) {
      console.warn('consume_customer_package_session RPC warning/fallback:', error.message);
      // Fallback: direct table updates
      const { data: currentItem, error: fetchItemErr } = await supabaseServer
        .from('customer_package_items')
        .select('id, qty_used, qty_remaining, customer_package_id')
        .eq('id', customerPackageItemId)
        .single();

      if (fetchItemErr || !currentItem || currentItem.qty_remaining <= 0) {
        return NextResponse.json({ error: error.message || 'No remaining sessions for this package item.' }, { status: 409 });
      }

      await supabaseServer
        .from('customer_package_items')
        .update({
          qty_used: (currentItem.qty_used || 0) + 1,
          qty_remaining: Math.max(0, (currentItem.qty_remaining || 1) - 1),
        })
        .eq('id', customerPackageItemId);

      // Check if all package items are consumed
      const { data: siblingItems } = await supabaseServer
        .from('customer_package_items')
        .select('qty_remaining')
        .eq('customer_package_id', currentItem.customer_package_id);

      const allDepleted = (siblingItems || []).every((it: any) => (it.qty_remaining || 0) <= 0);
      if (allDepleted) {
        await supabaseServer
          .from('customer_packages')
          .update({ status: 'completed' })
          .eq('id', currentItem.customer_package_id);
      }

      consumptionData = {
        customer_package_id: currentItem.customer_package_id,
        qty_used: (currentItem.qty_used || 0) + 1,
        qty_remaining: Math.max(0, (currentItem.qty_remaining || 1) - 1),
        package_status: allDepleted ? 'completed' : 'active'
      };
    } else {
      consumptionData = Array.isArray(data) ? data[0] : data;
    }

    return NextResponse.json({ consumption: consumptionData });
  } catch (error: any) {
    console.error('POST /api/packages/consume error:', error);
    return NextResponse.json({ error: error.message || 'Unable to consume package session.' }, { status: 500 });
  }
}
