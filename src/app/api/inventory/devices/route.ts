import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

import { recordDeviceAuditLog } from './audit-logs/route';

export const dynamic = 'force-dynamic';

const DEFAULT_DEVICES = [
  {
    id: 'dev-candela-01',
    name: 'Candela GentleMax Pro',
    model: 'PRO-2026',
    serial_number: 'CN-892410',
    category: 'Laser Hair Removal',
    branch_id: '803321a0-b761-468f-9ce5-f4af3e37d1f6', // New Cairo Branch
    initial_pulse_count: 0,
    current_pulse_count: 78500,
    total_lifetime_pulses: 178500,
    warning_threshold_1: 80000,
    maintenance_threshold_2: 100000,
    warning_1_notified: false,
    warning_2_notified: false,
    last_maintenance_date: '2026-05-10T10:00:00.000Z',
    status: 'Optimal',
    notes: 'Primary Alexandrite & YAG dual laser system in Room 1.',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'dev-almma-02',
    name: 'Alma Soprano Titanium',
    model: 'ST-5000',
    serial_number: 'ALM-99120',
    category: 'Laser Hair Removal',
    branch_id: '1889250c-e335-4c22-8a49-6d1ddcf79f84', // Sheikh Zayed Branch
    initial_pulse_count: 0,
    current_pulse_count: 82400,
    total_lifetime_pulses: 282400,
    warning_threshold_1: 80000,
    maintenance_threshold_2: 100000,
    warning_1_notified: true,
    warning_2_notified: false,
    last_maintenance_date: '2026-03-20T09:00:00.000Z',
    status: 'Warning',
    notes: 'Trio-clustered diode laser for skin types I-VI.',
    created_at: '2026-01-10T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'dev-hydra-03',
    name: 'HydraFacial Elite MD',
    model: 'HF-MD9',
    serial_number: 'HF-44821',
    category: 'Facial & Skincare',
    branch_id: '803321a0-b761-468f-9ce5-f4af3e37d1f6',
    initial_pulse_count: 0,
    current_pulse_count: 102100,
    total_lifetime_pulses: 302100,
    warning_threshold_1: 80000,
    maintenance_threshold_2: 100000,
    warning_1_notified: true,
    warning_2_notified: true,
    last_maintenance_date: '2026-02-15T11:00:00.000Z',
    status: 'Maintenance Due',
    notes: 'Vortex tip replacement & filter maintenance due.',
    created_at: '2026-01-05T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  }
];

const DEFAULT_HISTORY = [
  {
    id: 'hist-001',
    device_id: 'dev-candela-01',
    device_name: 'Candela GentleMax Pro',
    starting_pulse_count: 0,
    ending_pulse_count: 100000,
    pulses_delivered: 100000,
    reset_date: '2026-05-10T10:00:00.000Z',
    reason: 'Flashlamp Replacement',
    performed_by: 'Eng. Karim (Official Service Agent)',
    notes: 'Replaced dual flashlamp & recalibrated optic sensors.',
    created_at: '2026-05-10T10:00:00.000Z'
  },
  {
    id: 'hist-002',
    device_id: 'dev-almma-02',
    device_name: 'Alma Soprano Titanium',
    starting_pulse_count: 0,
    ending_pulse_count: 200000,
    pulses_delivered: 200000,
    reset_date: '2026-03-20T09:00:00.000Z',
    reason: 'Handpiece Diode Stack Service',
    performed_by: 'Alma Laser Support',
    notes: 'Cooling tip refilled and diode stack inspected.',
    created_at: '2026-03-20T09:00:00.000Z'
  }
];

// The real `inventory_devices` table only has `total_pulses`/`max_pulses_limit` (one ceiling) —
// it has no `current_pulse_count`/`warning_threshold_1`/`maintenance_threshold_2` columns at all
// (see DB_SCHEMA.md). Every other read/write site in this route and in admin/page.tsx exclusively
// uses those blob-shape names, a holdover from before the real table existed. Without this
// normalization, a device loaded from the real table would read as 0 pulses against 80000/100000
// defaults no matter what it actually stored — task 3B.4 found this while verifying that
// max_pulses_limit is genuinely settable and reflected back correctly. `warning_threshold_1` has
// no real-table equivalent to fall back to, so it's derived as 80% of the real ceiling, matching
// the ratio this route's own DEFAULT_DEVICES seed already used.
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
    // 1. Try querying native Supabase inventory_devices table if it has rows
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
      const payload = { devices: DEFAULT_DEVICES, history: DEFAULT_HISTORY };
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'inventory_devices', value: payload, updated_at: new Date().toISOString() });
      return payload;
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching inventory devices settings:', err);
    return { devices: DEFAULT_DEVICES, history: DEFAULT_HISTORY };
  }
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
  } catch (e) {
    console.error('Direct table sync exception:', e);
  }

  return data;
}

function calculateDeviceStatus(current: number, t1: number, t2: number): 'Optimal' | 'Warning' | 'Maintenance Due' {
  if (current >= t2) return 'Maintenance Due';
  if (current >= t1) return 'Warning';
  return 'Optimal';
}

// Helper to advance a device's pulse counter when a booking that uses it completes checkout
// (task 2.15 / RISK-027). applyCheckoutCosting in /api/reservations already reads
// lamp_replacement_cost/max_pulses_limit to compute the session's device cost, but until now
// nothing incremented the device's own counter — the cost was charged without the pulses that
// caused it ever being recorded, so a device could sail past its rated maintenance limit with
// the admin's pulse tracker still showing it as brand new.
export async function incrementDevicePulses(deviceId: string, pulsesToAdd: number) {
  try {
    if (!pulsesToAdd || pulsesToAdd <= 0) return;

    const data = await getStoredInventoryData();
    const devices = data.devices || [];
    const index = devices.findIndex((d: any) => d.id === deviceId);
    if (index === -1) return;

    const existing = devices[index];
    const newCurrent = (Number(existing.current_pulse_count) || 0) + Number(pulsesToAdd);
    const newLifetime = (Number(existing.total_lifetime_pulses) || 0) + Number(pulsesToAdd);
    const t1 = Number(existing.warning_threshold_1) || 80000;
    const t2 = Number(existing.maintenance_threshold_2) || 100000;
    const computedStatus = existing.status === 'Out of Service' ? 'Out of Service' : calculateDeviceStatus(newCurrent, t1, t2);

    devices[index] = {
      ...existing,
      current_pulse_count: newCurrent,
      total_lifetime_pulses: newLifetime,
      warning_1_notified: newCurrent >= t1,
      warning_2_notified: newCurrent >= t2,
      status: computedStatus,
      updated_at: new Date().toISOString()
    };

    await saveInventoryData({ ...data, devices });
  } catch (err) {
    console.error('Error incrementing device pulses:', err);
  }
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const data = await getStoredInventoryData();
    const devices = (data.devices || []).map((dev: any) => {
      const current = Number(dev.current_pulse_count) || 0;
      const t1 = Number(dev.warning_threshold_1) || 80000;
      const t2 = Number(dev.maintenance_threshold_2) || 100000;
      const computedStatus = dev.status === 'Out of Service' ? 'Out of Service' : calculateDeviceStatus(current, t1, t2);
      return {
        ...dev,
        status: computedStatus,
        warning_1_notified: current >= t1,
        warning_2_notified: current >= t2
      };
    });

    return NextResponse.json({
      devices,
      history: data.history || []
    });
  } catch (err: any) {
    console.error('GET /api/inventory/devices error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json();
    const { name, model, serial_number, category, branch_id, initial_pulse_count, warning_threshold_1, maintenance_threshold_2, lamp_replacement_cost, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Device name is required.' }, { status: 400 });
    }

    if (lamp_replacement_cost !== undefined && (!Number.isFinite(Number(lamp_replacement_cost)) || Number(lamp_replacement_cost) < 0)) {
      return NextResponse.json({ error: 'lamp_replacement_cost must be a non-negative number.' }, { status: 400 });
    }

    const data = await getStoredInventoryData();
    const devices = data.devices || [];

    const newId = `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const initPulses = Number(initial_pulse_count) || 0;
    const t1 = Number(warning_threshold_1) || 80000;
    const t2 = Number(maintenance_threshold_2) || 100000;
    const status = calculateDeviceStatus(initPulses, t1, t2);

    const newDevice = {
      id: newId,
      name: String(name).trim(),
      model: model ? String(model).trim() : '',
      serial_number: serial_number ? String(serial_number).trim() : '',
      category: category ? String(category).trim() : 'General',
      branch_id: branch_id || null,
      initial_pulse_count: initPulses,
      current_pulse_count: initPulses,
      total_lifetime_pulses: initPulses,
      warning_threshold_1: t1,
      maintenance_threshold_2: t2,
      lamp_replacement_cost: lamp_replacement_cost !== undefined ? Number(lamp_replacement_cost) : 0,
      warning_1_notified: initPulses >= t1,
      warning_2_notified: initPulses >= t2,
      last_maintenance_date: new Date().toISOString(),
      status,
      notes: notes ? String(notes).trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    devices.unshift(newDevice);
    await saveInventoryData({ ...data, devices });

    await recordDeviceAuditLog({
      device_id: newId,
      device_name: String(name).trim(),
      type: 'Device Created',
      performed_by: 'Clinic Admin',
      reason: `New device '${name}' registered in inventory. Serial: ${serial_number || 'N/A'}, Model: ${model || 'N/A'}, Max Pulses: ${t2}`,
      notes: `Initial pulse count: ${initPulses}. Replacement cost: EGP ${lamp_replacement_cost || 0}`,
      starting_pulse_count: initPulses,
      ending_pulse_count: initPulses
    });

    return NextResponse.json(newDevice, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/inventory/devices error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json();
    const { id, name, model, serial_number, category, branch_id, current_pulse_count, warning_threshold_1, maintenance_threshold_2, lamp_replacement_cost, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required.' }, { status: 400 });
    }

    if (lamp_replacement_cost !== undefined && (!Number.isFinite(Number(lamp_replacement_cost)) || Number(lamp_replacement_cost) < 0)) {
      return NextResponse.json({ error: 'lamp_replacement_cost must be a non-negative number.' }, { status: 400 });
    }

    const data = await getStoredInventoryData();
    const devices = data.devices || [];
    const index = devices.findIndex((d: any) => d.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    const existing = devices[index];
    const newCurrent = current_pulse_count !== undefined ? Number(current_pulse_count) : existing.current_pulse_count;
    const t1 = warning_threshold_1 !== undefined ? Number(warning_threshold_1) : existing.warning_threshold_1;
    const t2 = maintenance_threshold_2 !== undefined ? Number(maintenance_threshold_2) : existing.maintenance_threshold_2;

    const pulseDiff = newCurrent - (existing.current_pulse_count || 0);
    const newLifetime = (existing.total_lifetime_pulses || 0) + (pulseDiff > 0 ? pulseDiff : 0);

    const computedStatus = status === 'Out of Service' 
      ? 'Out of Service' 
      : calculateDeviceStatus(newCurrent, t1, t2);

    const updatedDevice = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      model: model !== undefined ? String(model).trim() : existing.model,
      serial_number: serial_number !== undefined ? String(serial_number).trim() : existing.serial_number,
      category: category !== undefined ? String(category).trim() : existing.category,
      branch_id: branch_id !== undefined ? branch_id : existing.branch_id,
      current_pulse_count: newCurrent,
      total_lifetime_pulses: newLifetime,
      warning_threshold_1: t1,
      maintenance_threshold_2: t2,
      lamp_replacement_cost: lamp_replacement_cost !== undefined ? Number(lamp_replacement_cost) : existing.lamp_replacement_cost,
      warning_1_notified: newCurrent >= t1,
      warning_2_notified: newCurrent >= t2,
      status: computedStatus,
      notes: notes !== undefined ? String(notes).trim() : existing.notes,
      updated_at: new Date().toISOString()
    };

    devices[index] = updatedDevice;
    await saveInventoryData({ ...data, devices });

    const changes: string[] = [];
    if (existing.status !== computedStatus) changes.push(`Status: ${existing.status} → ${computedStatus}`);
    if (existing.current_pulse_count !== newCurrent) changes.push(`Pulse count: ${existing.current_pulse_count} → ${newCurrent}`);
    if (existing.maintenance_threshold_2 !== t2) changes.push(`Max Pulses: ${existing.maintenance_threshold_2} → ${t2}`);
    if (existing.name !== updatedDevice.name) changes.push(`Name updated to '${updatedDevice.name}'`);

    const changeSummary = changes.length > 0 ? changes.join('; ') : 'Device details updated.';

    await recordDeviceAuditLog({
      device_id: existing.id,
      device_name: updatedDevice.name,
      type: existing.status !== computedStatus ? 'Status Changed' : 'Device Updated',
      performed_by: 'Clinic Admin',
      reason: changeSummary,
      notes: notes !== undefined ? String(notes).trim() : existing.notes,
      starting_pulse_count: existing.current_pulse_count,
      ending_pulse_count: newCurrent,
      pulses_added: pulseDiff > 0 ? pulseDiff : 0
    });

    return NextResponse.json(updatedDevice);
  } catch (err: any) {
    console.error('PUT /api/inventory/devices error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
