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
    if (!reservation.customer_id || reservation.customer_id !== item.customer_packages?.customer_id) {
      return NextResponse.json({ error: 'Reservation does not belong to this package customer.' }, { status: 409 });
    }

    const reservationServiceIds = Array.isArray(reservation.service_ids) && reservation.service_ids.length > 0
      ? reservation.service_ids.map(Number)
      : reservation.service_id === null ? [] : [Number(reservation.service_id)];
    if (!reservationServiceIds.includes(Number(item.service_id))) {
      return NextResponse.json({ error: 'Reservation does not include this package service.' }, { status: 409 });
    }

    const { data, error } = await supabaseServer.rpc('consume_customer_package_session', {
      p_customer_package_item_id: customerPackageItemId,
      p_reservation_id: reservationId,
      p_employee_id: access.access.employee.id,
    });
    if (error) {
      const status = error.code === 'P0002' ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ consumption: Array.isArray(data) ? data[0] : data });
  } catch (error: any) {
    console.error('POST /api/packages/consume error:', error);
    return NextResponse.json({ error: error.message || 'Unable to consume package session.' }, { status: 500 });
  }
}
