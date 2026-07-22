import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get('serviceId');
  const roomId = url.searchParams.get('roomId');

  try {
    let q = supabaseServer.from('service_rooms').select('*');

    if (serviceId) {
      q = q.eq('service_id', Number(serviceId));
    }
    if (roomId) {
      q = q.eq('room_id', roomId);
    }

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET /api/service-rooms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, roomIds, roomId, serviceIds } = body;

    if (serviceId !== undefined && Array.isArray(roomIds)) {
      // 1. Clear existing mappings for this service
      const { error: deleteError } = await supabaseServer
        .from('service_rooms')
        .delete()
        .eq('service_id', Number(serviceId));

      if (deleteError) throw deleteError;

      // 2. Insert new mappings
      if (roomIds.length > 0) {
        const inserts = roomIds.map((rid: string) => ({
          service_id: Number(serviceId),
          room_id: rid
        }));

        const { error: insertError } = await supabaseServer
          .from('service_rooms')
          .insert(inserts);

        if (insertError) throw insertError;
      }
      return NextResponse.json({ success: true, message: 'Service-rooms mappings updated successfully' });

    } else if (roomId !== undefined && Array.isArray(serviceIds)) {
      // 1. Clear existing mappings for this room
      const { error: deleteError } = await supabaseServer
        .from('service_rooms')
        .delete()
        .eq('room_id', roomId);

      if (deleteError) throw deleteError;

      // 2. Insert new mappings
      if (serviceIds.length > 0) {
        const inserts = serviceIds.map((sid: number) => ({
          service_id: Number(sid),
          room_id: roomId
        }));

        const { error: insertError } = await supabaseServer
          .from('service_rooms')
          .insert(inserts);

        if (insertError) throw insertError;
      }
      return NextResponse.json({ success: true, message: 'Room-services mappings updated successfully' });

    } else {
      return NextResponse.json({ error: 'Missing serviceId/roomIds or roomId/serviceIds parameters' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('POST /api/service-rooms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
