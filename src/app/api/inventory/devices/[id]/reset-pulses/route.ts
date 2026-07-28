import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

function normalizeDeviceRow(d: any) {
  const maxPulses = d.maintenance_threshold_2 ?? d.max_pulses_limit ?? 100000;
  return {
    ...d,
    current_pulse_count: d.current_pulse_count ?? d.total_pulses ?? 0,
    maintenance_threshold_2: maxPulses,
    warning_threshold_1: d.warning_threshold_1 ?? Math.round(Number(maxPulses) * 0.8),
    lamp_replacement_cost: Number(d.lamp_replacement_cost) || 0,
  };
}

async function getStoredInventoryData() {
  try {
    // 1. Query native Supabase inventory_devices table if it has rows
    const { data: dbDevices, error: dbErr } = await supabaseServer
      .from('inventory_devices')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: dbHistory } = await supabaseServer
      .from('device_maintenance_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbDevices && dbDevices.length > 0) {
      return { devices: dbDevices.map(normalizeDeviceRow), history: dbHistory || [] };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'inventory_devices')
      .maybeSingle();

    if (error || !data || !data.value || !Array.isArray(data.value.devices)) {
      return { devices: [], history: [] };
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching inventory devices settings:', err);
    return { devices: [], history: [] };
  }
}

async function saveInventoryData(payload: any, newHistoryEntry?: any) {
  const { data, error } = await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'inventory_devices',
      value: payload,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) console.error('Error saving to page_settings:', error);

  try {
    if (payload.devices && payload.devices.length > 0) {
      const sqlRows = payload.devices.map((d: any) => ({
        id: d.id,
        name: d.name,
        serial_number: d.serial_number || '',
        model: d.model || '',
        branch_name: d.branch_id === '803321a0-b761-468f-9ce5-f4af3e37d1f6' 
          ? 'New Cairo Branch' 
          : d.branch_id === '1889250c-e335-4c22-8a49-6d1ddcf79f84'
          ? 'Sheikh Zayed Branch'
          : (d.branch_name || 'New Cairo Branch'),
        status: d.status || 'Optimal',
        total_pulses: Number(d.current_pulse_count) || 0,
        remaining_pulses: Math.max(0, (Number(d.maintenance_threshold_2) || 100000) - (Number(d.current_pulse_count) || 0)),
        max_pulses_limit: Number(d.maintenance_threshold_2) || 100000,
        lamp_replacement_cost: Number(d.lamp_replacement_cost) || 0,
        last_maintenance_date: d.last_maintenance_date || new Date().toISOString(),
        created_at: d.created_at || new Date().toISOString(),
        updated_at: d.updated_at || new Date().toISOString()
      }));

      const { error: upsertErr } = await supabaseServer.from('inventory_devices').upsert(sqlRows);
      if (upsertErr) {
        console.error('Error syncing to inventory_devices table:', upsertErr);
      }
    }

    if (newHistoryEntry) {
      const historyRow = {
        device_id: newHistoryEntry.device_id,
        device_name: newHistoryEntry.device_name,
        starting_pulse_count: newHistoryEntry.starting_pulse_count,
        ending_pulse_count: newHistoryEntry.ending_pulse_count,
        pulses_delivered: newHistoryEntry.pulses_delivered,
        reset_date: newHistoryEntry.reset_date,
        reason: newHistoryEntry.reason,
        performed_by: newHistoryEntry.performed_by,
        notes: newHistoryEntry.notes,
        created_at: newHistoryEntry.created_at
      };
      await supabaseServer.from('device_maintenance_history').insert(historyRow).catch((err: any) => {
        console.warn('Could not insert into device_maintenance_history:', err.message);
      });
    }
  } catch (e) {
    console.error('Direct table sync exception:', e);
  }

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
    const devices = data.devices || [];
    const history = data.history || [];

    const index = devices.findIndex((d: any) => String(d.id) === String(id));

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

    await saveInventoryData({ devices, history }, historyEntry);

    return NextResponse.json({
      device: updatedDevice,
      historyEntry
    });
  } catch (err: any) {
    console.error('POST /api/inventory/devices/[id]/reset-pulses error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
