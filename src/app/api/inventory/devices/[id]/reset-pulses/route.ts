import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

async function getStoredInventoryData() {
  const { data } = await supabaseServer
    .from('page_settings')
    .select('value')
    .eq('key', 'inventory_devices')
    .maybeSingle();

  return data?.value || { devices: [], history: [] };
}

async function saveInventoryData(payload: any) {
  const { data, error } = await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'inventory_devices',
      value: payload,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  return data;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { reason, performedBy, notes, resetToZero } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required.' }, { status: 400 });
    }

    const data = await getStoredInventoryData();
    let devices = data.devices || [];
    let history = data.history || [];

    const index = devices.findIndex((d: any) => d.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    const device = devices[index];
    const endingCount = Number(device.current_pulse_count) || 0;
    const startingCount = Number(device.initial_pulse_count) || 0;
    const pulsesDelivered = Math.max(0, endingCount - startingCount);

    const nowStr = new Date().toISOString();

    // 1. Create history log entry
    const historyEntry = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      device_id: device.id,
      device_name: device.name,
      starting_pulse_count: startingCount,
      ending_pulse_count: endingCount,
      pulses_delivered: pulsesDelivered,
      reset_date: nowStr,
      reason: reason ? String(reason).trim() : 'Routine Maintenance',
      performed_by: performedBy ? String(performedBy).trim() : 'Clinic Admin',
      notes: notes ? String(notes).trim() : '',
      created_at: nowStr
    };

    history.unshift(historyEntry);

    // 2. Reset device counter & maintenance state
    const newPulseCount = resetToZero ? 0 : startingCount;

    const updatedDevice = {
      ...device,
      current_pulse_count: newPulseCount,
      initial_pulse_count: newPulseCount,
      warning_1_notified: false,
      warning_2_notified: false,
      status: 'Optimal',
      last_maintenance_date: nowStr,
      updated_at: nowStr
    };

    devices[index] = updatedDevice;

    await saveInventoryData({ devices, history });

    return NextResponse.json({
      device: updatedDevice,
      historyEntry
    });
  } catch (err: any) {
    console.error('POST /api/inventory/devices/[id]/reset-pulses error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
