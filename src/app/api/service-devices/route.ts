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
      .from('service_devices')
      .select('service_id, device_id, pulses_per_session, inventory_devices(name)')
      .eq('service_id', Number(serviceId));
    if (error) throw error;

    return NextResponse.json({ deviceLinks: data || [] });
  } catch (err: any) {
    console.error('GET /api/service-devices error:', err);
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
      deviceId: String(item.deviceId || ''),
      pulsesPerSession: Number(item.pulsesPerSession),
    }));
    if (normalizedItems.some((item) => !item.deviceId || !Number.isInteger(item.pulsesPerSession) || item.pulsesPerSession <= 0)) {
      return NextResponse.json(
        { error: 'Each item requires a deviceId and a positive whole-number pulsesPerSession.' },
        { status: 400 }
      );
    }

    const deviceIds = normalizedItems.map((item) => item.deviceId);
    const uniqueDeviceIds = [...new Set(deviceIds)];
    if (uniqueDeviceIds.length !== deviceIds.length) {
      return NextResponse.json({ error: 'Duplicate devices are not allowed in the same service.' }, { status: 400 });
    }

    if (uniqueDeviceIds.length > 0) {
      const { data: devices, error: devicesError } = await supabaseServer
        .from('inventory_devices')
        .select('id')
        .in('id', uniqueDeviceIds);
      if (devicesError) throw devicesError;
      if ((devices || []).length !== uniqueDeviceIds.length) {
        return NextResponse.json({ error: 'One or more devices do not exist.' }, { status: 404 });
      }
    }

    const { error: deleteError } = await supabaseServer
      .from('service_devices')
      .delete()
      .eq('service_id', Number(serviceId));
    if (deleteError) throw deleteError;

    if (normalizedItems.length > 0) {
      const { error: insertError } = await supabaseServer.from('service_devices').insert(
        normalizedItems.map((item) => ({
          service_id: Number(serviceId),
          device_id: item.deviceId,
          pulses_per_session: item.pulsesPerSession,
        }))
      );
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/service-devices error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
