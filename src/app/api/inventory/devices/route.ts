import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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

async function getStoredInventoryData() {
  try {
    // 1. Try querying native Supabase inventory_devices table
    const { data: dbDevices, error: dbErr } = await supabaseServer
      .from('inventory_devices')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: dbHistory } = await supabaseServer
      .from('device_maintenance_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbDevices) {
      return { devices: dbDevices, history: dbHistory || [] };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'inventory_devices')
      .maybeSingle();

    if (error || !data || !data.value) {
      const payload = { devices: [], history: [] };
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'inventory_devices', value: payload, updated_at: new Date().toISOString() });
      return payload;
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching inventory devices settings:', err);
    return { devices: [], history: [] };
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
  return data;
}

function calculateDeviceStatus(current: number, t1: number, t2: number): 'Optimal' | 'Warning' | 'Maintenance Due' {
  if (current >= t2) return 'Maintenance Due';
  if (current >= t1) return 'Warning';
  return 'Optimal';
}

export async function GET() {
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
  try {
    const body = await req.json();
    const { name, model, serial_number, category, branch_id, initial_pulse_count, warning_threshold_1, maintenance_threshold_2, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Device name is required.' }, { status: 400 });
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

    return NextResponse.json(newDevice, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/inventory/devices error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, model, serial_number, category, branch_id, current_pulse_count, warning_threshold_1, maintenance_threshold_2, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required.' }, { status: 400 });
    }

    const data = await getStoredInventoryData();
    let devices = data.devices || [];
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
      warning_1_notified: newCurrent >= t1,
      warning_2_notified: newCurrent >= t2,
      status: computedStatus,
      notes: notes !== undefined ? String(notes).trim() : existing.notes,
      updated_at: new Date().toISOString()
    };

    devices[index] = updatedDevice;
    await saveInventoryData({ ...data, devices });

    return NextResponse.json(updatedDevice);
  } catch (err: any) {
    console.error('PUT /api/inventory/devices error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
