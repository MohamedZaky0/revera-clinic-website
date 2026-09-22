import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export interface LaserPulseLog {
  id: string;
  customer_id: string;
  reservation_id?: string | null;
  pulse_type: 'SERVICE' | 'PULSE_PURCHASE' | 'PACKAGE';
  service_id?: number | null;
  service_name: string;
  treatment_area?: string | null;
  service_price: number;
  pulses_used: number;
  remaining_balance_after?: number | null;
  additional_pulses: number;
  additional_pulses_reason?: string | null;
  pulse_value: number;
  additional_charge: number;
  total_patient_charge: number;
  source_id?: string | null;
  device_id?: string | null;
  device_name?: string | null;
  doctor_id?: string | null;
  doctor_name?: string | null;
  added_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DISK_FILE = path.join(DATA_DIR, 'laser_pulses.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDiskLogs(): LaserPulseLog[] {
  try {
    ensureDataDir();
    if (fs.existsSync(DISK_FILE)) {
      const raw = fs.readFileSync(DISK_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('Error reading laser_pulses.json:', err);
  }
  return [];
}

function writeDiskLogs(logs: LaserPulseLog[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(DISK_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing laser_pulses.json:', err);
  }
}

async function getStoredPulseLogs(): Promise<LaserPulseLog[]> {
  // 1. Try querying native Supabase laser_pulse_logs table
  try {
    const { data: dbData, error: dbErr } = await supabaseServer
      .from('laser_pulse_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && Array.isArray(dbData) && dbData.length > 0) {
      return dbData as LaserPulseLog[];
    }
  } catch (err) {
    console.warn('laser_pulse_logs table query failed, falling back:', err);
  }

  // 2. Try page_settings fallback
  try {
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'laser_pulse_logs')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value.logs)) {
      return data.value.logs as LaserPulseLog[];
    }
  } catch (err) {
    console.warn('page_settings laser_pulse_logs query failed, checking disk:', err);
  }

  // 3. Fallback to local disk
  return readDiskLogs();
}

async function savePulseLogs(logs: LaserPulseLog[]) {
  // 1. Save to disk
  writeDiskLogs(logs);

  // 2. Save to page_settings
  try {
    await supabaseServer
      .from('page_settings')
      .upsert({
        key: 'laser_pulse_logs',
        value: { logs },
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.warn('Syncing laser_pulse_logs to page_settings failed:', err);
  }

  // 3. Sync to native table if available
  try {
    if (logs.length > 0) {
      await supabaseServer.from('laser_pulse_logs').upsert(logs);
    }
  } catch (err) {
    console.warn('Upsert to laser_pulse_logs table failed silently:', err);
  }
}

// GET /api/laser-pulses
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || searchParams.get('customer_id');
    const reservationId = searchParams.get('reservationId') || searchParams.get('reservation_id');
    const pulseType = searchParams.get('pulseType') || searchParams.get('pulse_type');

    let logs = await getStoredPulseLogs();

    if (customerId) {
      logs = logs.filter((l) => l.customer_id === customerId);
    }
    if (reservationId) {
      logs = logs.filter((l) => l.reservation_id === reservationId);
    }
    if (pulseType) {
      logs = logs.filter((l) => l.pulse_type.toUpperCase() === pulseType.toUpperCase());
    }

    // Sort by created_at descending
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Aggregate KPI Stats
    const totalSessions = logs.length;
    const totalPulsesUsed = logs.reduce((sum, l) => sum + (Number(l.pulses_used) || 0), 0);
    const totalAdditionalPulses = logs.reduce((sum, l) => sum + (Number(l.additional_pulses) || 0), 0);
    const totalCharges = logs.reduce((sum, l) => sum + (Number(l.total_patient_charge) || 0), 0);

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        totalSessions,
        totalPulsesUsed,
        totalAdditionalPulses,
        totalCharges
      }
    });
  } catch (err: any) {
    console.error('Error fetching laser pulse logs:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/laser-pulses
export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const customerId = body.customerId || body.customer_id;
    const reservationId = body.reservationId || body.reservation_id || null;
    const pulseType = (body.pulseType || body.pulse_type || 'SERVICE').toUpperCase() as 'SERVICE' | 'PULSE_PURCHASE' | 'PACKAGE';
    const serviceId = body.serviceId || body.service_id ? Number(body.serviceId || body.service_id) : null;
    const serviceName = String(body.serviceName || body.service_name || 'Laser Treatment').trim();
    const treatmentArea = body.treatmentArea || body.treatment_area || null;
    const servicePrice = Number(body.servicePrice ?? body.service_price ?? 0);
    const pulsesUsed = Math.max(0, parseInt(body.pulsesUsed ?? body.pulses_used ?? 0, 10) || 0);
    const additionalPulses = Math.max(0, parseInt(body.additionalPulses ?? body.additional_pulses ?? 0, 10) || 0);
    const additionalPulsesReason = body.additionalPulsesReason || body.additional_pulses_reason || null;
    const pulseValue = Number(body.pulseValue ?? body.pulse_value ?? 0);
    
    // Calculate additional charge: Qty * Value
    const additionalCharge = body.additionalCharge !== undefined
      ? Number(body.additionalCharge)
      : (body.additionalPrice !== undefined ? Number(body.additionalPrice) : additionalPulses * pulseValue);

    // Total Patient Charge = Service Price + Additional Charge
    const totalPatientCharge = pulseType === 'SERVICE'
      ? servicePrice + additionalCharge
      : 0; // Type 2 (Pulse Purchase) and Type 3 (Package) are prepaid

    const sourceId = body.sourceId || body.source_id || null;
    const remainingBalanceAfter = body.remainingBalanceAfter !== undefined && body.remainingBalanceAfter !== null
      ? Number(body.remainingBalanceAfter)
      : null;
    const deviceId = body.deviceId || body.device_id || null;
    const deviceName = body.deviceName || body.device_name || null;
    const doctorId = body.doctorId || body.doctor_id || null;
    const doctorName = body.doctorName || body.doctor_name || null;
    const addedBy = body.addedBy || body.added_by || (access.access.user as any)?.name || access.access.user?.email || 'Staff';
    const notes = body.notes || null;

    // VALIDATION RULES:
    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }
    if (pulsesUsed < 0) {
      return NextResponse.json({ success: false, error: 'Pulses used must be a non-negative number.' }, { status: 400 });
    }
    if (additionalPulses > 0 && (!additionalPulsesReason || !additionalPulsesReason.trim())) {
      return NextResponse.json(
        { success: false, error: 'A clinical reason is mandatory when recording additional pulses.' },
        { status: 400 }
      );
    }
    if (additionalPulses < 0 || pulseValue < 0) {
      return NextResponse.json(
        { success: false, error: 'Additional pulse quantity and pulse value cannot be negative.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newLog: LaserPulseLog = {
      id: `lpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      customer_id: customerId,
      reservation_id: reservationId,
      pulse_type: pulseType,
      service_id: serviceId,
      service_name: serviceName,
      treatment_area: treatmentArea,
      service_price: servicePrice,
      pulses_used: pulsesUsed,
      remaining_balance_after: remainingBalanceAfter,
      additional_pulses: additionalPulses,
      additional_pulses_reason: additionalPulsesReason,
      pulse_value: pulseValue,
      additional_charge: additionalCharge,
      total_patient_charge: totalPatientCharge,
      source_id: sourceId,
      device_id: deviceId,
      device_name: deviceName,
      doctor_id: doctorId,
      doctor_name: doctorName,
      added_by: addedBy,
      notes,
      created_at: body.createdAt || body.created_at || now,
      updated_at: now
    };

    const currentLogs = await getStoredPulseLogs();
    currentLogs.unshift(newLog);
    await savePulseLogs(currentLogs);

    return NextResponse.json({ success: true, log: newLog });
  } catch (err: any) {
    console.error('Error creating laser pulse log:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
