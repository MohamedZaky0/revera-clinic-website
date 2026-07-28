import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export interface DeviceAuditLog {
  id: string;
  device_id: string;
  device_name: string;
  type: string;
  action_type: string;
  performed_by: string;
  date: string;
  starting_pulse_count?: number;
  ending_pulse_count?: number;
  pulses_delivered?: number;
  pulses_added?: number;
  reason?: string;
  notes?: string;
  details?: any;
  created_at: string;
}

export async function getDeviceAuditLogs() {
  try {
    let logs: DeviceAuditLog[] = [];

    // 1. Fetch from native Supabase device_maintenance_history table
    const { data: dbHistory, error: dbErr } = await supabaseServer
      .from('device_maintenance_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbHistory && dbHistory.length > 0) {
      logs = dbHistory.map((row: any) => ({
        id: row.id || `log-${Math.random()}`,
        device_id: row.device_id || '',
        device_name: row.device_name || 'Device',
        type: row.type || 'Pulse Reset',
        action_type: row.type || 'Pulse Reset',
        performed_by: row.performed_by || 'Clinic Admin',
        date: row.date || row.created_at || new Date().toISOString(),
        starting_pulse_count: row.starting_pulse_count,
        ending_pulse_count: row.ending_pulse_count,
        pulses_delivered: row.pulses_delivered,
        pulses_added: row.pulses_added ?? row.pulses_delivered ?? 0,
        reason: row.reason || row.notes || 'Maintenance/Edit',
        notes: row.notes || '',
        details: row.details || null,
        created_at: row.created_at || row.date || new Date().toISOString()
      }));
    }

    // 2. Fetch fallback from page_settings inventory_devices blob
    const { data: blobData } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'inventory_devices')
      .maybeSingle();

    if (blobData && blobData.value && Array.isArray(blobData.value.history)) {
      const blobHistory: DeviceAuditLog[] = blobData.value.history.map((item: any) => ({
        id: item.id || `blob-hist-${Math.random()}`,
        device_id: item.device_id || '',
        device_name: item.device_name || 'Device',
        type: item.type || item.action_type || 'Pulse Reset',
        action_type: item.type || item.action_type || 'Pulse Reset',
        performed_by: item.performed_by || 'Clinic Admin',
        date: item.reset_date || item.created_at || new Date().toISOString(),
        starting_pulse_count: item.starting_pulse_count,
        ending_pulse_count: item.ending_pulse_count,
        pulses_delivered: item.pulses_delivered,
        pulses_added: item.pulses_delivered ?? 0,
        reason: item.reason || 'Maintenance/Edit',
        notes: item.notes || '',
        details: item.details || null,
        created_at: item.created_at || item.reset_date || new Date().toISOString()
      }));

      // Combine and deduplicate by ID
      const existingIds = new Set(logs.map((l) => l.id));
      for (const item of blobHistory) {
        if (!existingIds.has(item.id)) {
          logs.push(item);
          existingIds.add(item.id);
        }
      }
    }

    // Sort by created_at descending
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return logs;
  } catch (err) {
    console.error('Error in getDeviceAuditLogs:', err);
    return [];
  }
}

export async function recordDeviceAuditLog(entry: {
  device_id: string;
  device_name: string;
  type?: string;
  performed_by?: string;
  starting_pulse_count?: number;
  ending_pulse_count?: number;
  pulses_delivered?: number;
  pulses_added?: number;
  reason?: string;
  notes?: string;
  details?: any;
}) {
  const now = new Date().toISOString();
  const id = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const logEntry = {
    id,
    device_id: entry.device_id,
    device_name: entry.device_name,
    type: entry.type || 'Device Action',
    pulses_added: entry.pulses_added ?? entry.pulses_delivered ?? 0,
    performed_by: entry.performed_by || 'Clinic Admin',
    notes: entry.notes || entry.reason || '',
    date: now,
    created_at: now
  };

  // 1. Insert into native DB table device_maintenance_history
  try {
    await supabaseServer.from('device_maintenance_history').insert({
      id: logEntry.id,
      device_id: logEntry.device_id,
      device_name: logEntry.device_name,
      type: logEntry.type,
      pulses_added: logEntry.pulses_added,
      notes: logEntry.notes,
      performed_by: logEntry.performed_by,
      date: logEntry.date,
      created_at: logEntry.created_at
    });
  } catch (err: any) {
    console.warn('Could not insert into device_maintenance_history:', err.message);
  }

  // 2. Append to page_settings history blob
  try {
    const { data } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'inventory_devices')
      .maybeSingle();

    if (data && data.value) {
      const currentDevices = data.value.devices || [];
      const currentHistory = data.value.history || [];

      const fullHistoryEntry = {
        ...logEntry,
        starting_pulse_count: entry.starting_pulse_count,
        ending_pulse_count: entry.ending_pulse_count,
        pulses_delivered: entry.pulses_delivered,
        reason: entry.reason || entry.notes || '',
        details: entry.details || null
      };

      currentHistory.unshift(fullHistoryEntry);

      await supabaseServer.from('page_settings').upsert({
        key: 'inventory_devices',
        value: {
          devices: currentDevices,
          history: currentHistory
        },
        updated_at: now
      });
    }
  } catch (err: any) {
    console.warn('Could not sync audit log to page_settings:', err.message);
  }

  return logEntry;
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const logs = await getDeviceAuditLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('GET /api/inventory/devices/audit-logs error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json();
    const log = await recordDeviceAuditLog(body);
    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/inventory/devices/audit-logs error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
