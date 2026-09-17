import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import fs from 'fs';
import path from 'path';

const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'prescriptions.json');

// Helper to read local file fallback
function readLocalPrescriptions(): any[] {
  try {
    if (fs.existsSync(LOCAL_DATA_PATH)) {
      const data = fs.readFileSync(LOCAL_DATA_PATH, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.error('Error reading local prescriptions:', err);
  }
  return [];
}

// Helper to write local file fallback
function writeLocalPrescriptions(data: any[]) {
  try {
    const dir = path.dirname(LOCAL_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local prescriptions:', err);
  }
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || searchParams.get('customer_id');
    const bookingId = searchParams.get('bookingId') || searchParams.get('booking_id');
    const patientName = searchParams.get('patientName') || searchParams.get('patient_name');
    const rootId = searchParams.get('rootId') || searchParams.get('root_id') || searchParams.get('history_for');
    const allVersions = searchParams.get('all_versions') === 'true';

    try {
      let query = supabaseServer
        .from('prescriptions')
        .select('*');

      if (rootId) {
        // Fetch full version history chain for this prescription root
        query = query.or(`id.eq.${rootId},root_prescription_id.eq.${rootId}`).order('version', { ascending: true });
      } else {
        // By default, filter to latest versions only
        if (!allVersions) {
          query = query.or('is_latest.eq.true,is_latest.is.null');
        }

        if (bookingId && bookingId !== 'all') {
          query = query.eq('booking_id', bookingId);
        } else if (customerId && customerId !== 'all') {
          query = query.eq('customer_id', customerId);
        } else if (patientName) {
          query = query.ilike('patient_name', `%${patientName}%`);
        }

        query = query.order('created_at', { ascending: false }).order('date', { ascending: false });
      }

      let { data, error } = await query;

      if (error && (error.message?.includes('root_prescription_id') || error.message?.includes('is_latest') || error.code === 'PGRST204')) {
        // Fallback query if columns not yet migrated
        let fallbackQuery = supabaseServer
          .from('prescriptions')
          .select('*')
          .order('date', { ascending: false });
        if (bookingId && bookingId !== 'all') {
          fallbackQuery = fallbackQuery.eq('booking_id', bookingId);
        } else if (customerId && customerId !== 'all') {
          fallbackQuery = fallbackQuery.eq('customer_id', customerId);
        }
        const fallbackRes = await fallbackQuery;
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        // If table doesn't exist, fall back to local JSON
        if (error.code === 'PGRST205') {
          console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
          let local = readLocalPrescriptions();
          if (rootId) {
            local = local.filter((p: any) => String(p.root_prescription_id || p.id) === String(rootId));
            local.sort((a: any, b: any) => (a.version || 1) - (b.version || 1));
          } else {
            if (!allVersions) {
              local = local.filter((p: any) => p.is_latest !== false);
            }
            if (bookingId && bookingId !== 'all') {
              local = local.filter((p: any) => String(p.booking_id) === String(bookingId));
            } else if (customerId && customerId !== 'all') {
              local = local.filter((p: any) => String(p.customer_id) === String(customerId));
            } else if (patientName) {
              local = local.filter((p: any) => String(p.patient_name || '').toLowerCase().includes(patientName.toLowerCase()));
            }
            local.sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
          }
          return NextResponse.json(local);
        }
        throw error;
      }
      return NextResponse.json(data || []);
    } catch (dbErr: any) {
      if (dbErr.code === 'PGRST205' || dbErr.message?.includes('relation "public.prescriptions" does not exist')) {
        console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
        let local = readLocalPrescriptions();
        if (rootId) {
          local = local.filter((p: any) => String(p.root_prescription_id || p.id) === String(rootId));
          local.sort((a: any, b: any) => (a.version || 1) - (b.version || 1));
        } else {
          if (!allVersions) {
            local = local.filter((p: any) => p.is_latest !== false);
          }
          if (bookingId && bookingId !== 'all') {
            local = local.filter((p: any) => String(p.booking_id) === String(bookingId));
          } else if (customerId && customerId !== 'all') {
            local = local.filter((p: any) => String(p.customer_id) === String(customerId));
          } else if (patientName) {
            local = local.filter((p: any) => String(p.patient_name || '').toLowerCase().includes(patientName.toLowerCase()));
          }
          local.sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
        }
        return NextResponse.json(local);
      }
      throw dbErr;
    }
  } catch (err: any) {
    console.error('GET /api/prescriptions error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const id = body.id;
  const customerId = body.customer_id || body.customerId;
  const rawBookingId = body.booking_id || body.bookingId;
  const cleanBookingId = (rawBookingId && rawBookingId !== 'undefined' && rawBookingId !== 'null') ? rawBookingId : null;
  const patientName = body.patient_name || body.customer_name;
  const diagnosis = body.diagnosis;
  const medications = body.medications;
  const generalNotes = body.general_notes || body.instructions || body.notes;
  const doctorName = body.doctor_name || body.doctorName || null;
  const doctorId = body.doctor_id || body.doctorId || null;
  const followUpDate = body.follow_up_date || body.followUpDate || null;
  const followUpNotes = body.follow_up_notes || body.followUpNotes || null;

  if (!patientName && !customerId) {
    return NextResponse.json({ error: 'patient_name or customer_id is required' }, { status: 400 });
  }

  const basePrescriptionData: Record<string, any> = {
    customer_id: customerId || null,
    patient_name: patientName,
    date: body.date || new Date().toISOString().slice(0, 10),
    diagnosis: diagnosis || null,
    medications: Array.isArray(medications) ? medications : [],
    general_notes: generalNotes || null,
    doctor_notes: body.doctor_notes || null,
    doctor_name: doctorName,
    doctor_id: doctorId,
    follow_up_date: followUpDate,
    follow_up_notes: followUpNotes,
    updated_at: new Date().toISOString()
  };

  if (cleanBookingId) {
    try {
      const { data: resMatch } = await supabaseServer
        .from('reservations')
        .select('id')
        .eq('id', cleanBookingId)
        .maybeSingle();

      if (resMatch?.id) {
        basePrescriptionData.booking_id = cleanBookingId;
      }
    } catch (_) {
      // Ignore lookup error and proceed without setting booking_id
    }
  }

  try {
    try {
      let result;
      if (id) {
        // ── EDIT PRESCRIPTION WORKFLOW (IMMUTABLE VERSIONING) ──
        // 1. Fetch current prescription to retrieve root and version
        let previousRx: any = null;
        try {
          const { data: existing } = await supabaseServer
            .from('prescriptions')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          previousRx = existing;
        } catch (_) {}

        const rootId = previousRx?.root_prescription_id || previousRx?.id || id;
        const currentVersion = Number(previousRx?.version || 1);
        const newVersion = currentVersion + 1;

        // 2. Mark previous version as NOT latest
        try {
          await supabaseServer
            .from('prescriptions')
            .update({ is_latest: false, updated_at: new Date().toISOString() })
            .eq('id', id);
        } catch (_) {}

        // Also mark any other older versions in this root chain as not latest
        try {
          await supabaseServer
            .from('prescriptions')
            .update({ is_latest: false })
            .eq('root_prescription_id', rootId);
        } catch (_) {}

        // 3. Insert NEW prescription version
        const newVersionData: Record<string, any> = {
          ...basePrescriptionData,
          customer_id: customerId || previousRx?.customer_id || null,
          patient_name: patientName || previousRx?.patient_name || 'Patient',
          booking_id: basePrescriptionData.booking_id || previousRx?.booking_id || null,
          version: newVersion,
          is_latest: true,
          root_prescription_id: rootId,
          parent_prescription_id: id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let { data, error } = await supabaseServer
          .from('prescriptions')
          .insert(newVersionData)
          .select()
          .single();

        if (error && (
          error.code === '23503' ||
          error.code === 'PGRST204' ||
          error.code === '42703' ||
          error.message?.includes('booking_id') ||
          error.message?.includes('follow_up_notes') ||
          error.message?.includes('foreign key constraint') ||
          error.message?.includes('prescriptions_booking_id_fkey')
        )) {
          if (error.message?.includes('booking_id') || error.code === '23503') delete newVersionData.booking_id;
          if (error.message?.includes('follow_up_notes') || error.code === '42703' || error.code === 'PGRST204') delete newVersionData.follow_up_notes;
          const retry = await supabaseServer
            .from('prescriptions')
            .insert(newVersionData)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          if (error.code === 'PGRST205') throw error; // trigger local fallback
          throw error;
        }
        result = data;
      } else {
        // ── CREATE BRAND-NEW PRESCRIPTION (VERSION 1) ──
        const newPrescriptionPayload: Record<string, any> = {
          ...basePrescriptionData,
          version: 1,
          is_latest: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let { data, error } = await supabaseServer
          .from('prescriptions')
          .insert(newPrescriptionPayload)
          .select()
          .single();

        if (error && (
          error.code === '23503' ||
          error.code === 'PGRST204' ||
          error.code === '42703' ||
          error.message?.includes('booking_id') ||
          error.message?.includes('follow_up_notes') ||
          error.message?.includes('foreign key constraint') ||
          error.message?.includes('prescriptions_booking_id_fkey')
        )) {
          if (error.message?.includes('booking_id') || error.code === '23503') delete newPrescriptionPayload.booking_id;
          if (error.message?.includes('follow_up_notes') || error.code === '42703' || error.code === 'PGRST204') delete newPrescriptionPayload.follow_up_notes;
          const retry = await supabaseServer
            .from('prescriptions')
            .insert(newPrescriptionPayload)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          if (error.code === 'PGRST205') throw error; // trigger local fallback
          throw error;
        }

        // Set root_prescription_id to its own id if null
        if (data?.id && !data.root_prescription_id) {
          try {
            await supabaseServer
              .from('prescriptions')
              .update({ root_prescription_id: data.id })
              .eq('id', data.id);
            data.root_prescription_id = data.id;
          } catch (_) {}
        }

        result = data;
      }

      // Automatically sync follow_up_date to the corresponding reservation record
      if (cleanBookingId && followUpDate) {
        try {
          await supabaseServer
            .from('reservations')
            .update({ follow_up_date: followUpDate })
            .eq('id', cleanBookingId);
        } catch (_) {}
      }

      return NextResponse.json(result, { status: id ? 200 : 201 });
    } catch (dbErr: any) {
      if (dbErr.code === 'PGRST205' || dbErr.message?.includes('relation "public.prescriptions" does not exist')) {
        console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
        const local = readLocalPrescriptions();
        let result: any;
        if (id) {
          // Find old in local
          const oldIndex = local.findIndex((p: any) => p.id === id);
          const previousLocal = oldIndex !== -1 ? local[oldIndex] : null;
          const rootId = previousLocal?.root_prescription_id || previousLocal?.id || id;
          const currentVersion = Number(previousLocal?.version || 1);
          const newVersion = currentVersion + 1;

          // Mark older versions as not latest
          local.forEach((p: any) => {
            if (p.id === id || String(p.root_prescription_id) === String(rootId)) {
              p.is_latest = false;
            }
          });

          // Insert new version
          const newId = `rx-${Math.random().toString(36).substr(2, 9)}`;
          result = {
            id: newId,
            ...basePrescriptionData,
            customer_id: customerId || previousLocal?.customer_id || null,
            patient_name: patientName || previousLocal?.patient_name || 'Patient',
            version: newVersion,
            is_latest: true,
            root_prescription_id: rootId,
            parent_prescription_id: id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          local.push(result);
        } else {
          // Create local
          const newId = `rx-${Math.random().toString(36).substr(2, 9)}`;
          result = {
            id: newId,
            ...basePrescriptionData,
            version: 1,
            is_latest: true,
            root_prescription_id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          local.push(result);
        }
        writeLocalPrescriptions(local);
        return NextResponse.json(result, { status: id ? 200 : 201 });
      }
      throw dbErr;
    }
  } catch (err: any) {
    console.error('POST /api/prescriptions error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
    }

    try {
      // Find prescription to determine if we should delete version chain
      const { data: rxItem } = await supabaseServer
        .from('prescriptions')
        .select('id, root_prescription_id')
        .eq('id', id)
        .maybeSingle();

      const rootId = rxItem?.root_prescription_id || id;

      // Delete all version nodes in this prescription chain
      const { error } = await supabaseServer
        .from('prescriptions')
        .delete()
        .or(`id.eq.${id},root_prescription_id.eq.${rootId},id.eq.${rootId}`);

      if (error) {
        if (error.code === 'PGRST205') throw error; // trigger local fallback
        throw error;
      }
      return NextResponse.json({ message: 'Prescription deleted successfully' });
    } catch (dbErr: any) {
      if (dbErr.code === 'PGRST205' || dbErr.message?.includes('relation "public.prescriptions" does not exist')) {
        console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
        const local = readLocalPrescriptions();
        const rxItem = local.find((p: any) => p.id === id);
        const rootId = rxItem?.root_prescription_id || id;
        const filtered = local.filter((p: any) => p.id !== id && p.root_prescription_id !== rootId && p.id !== rootId);
        writeLocalPrescriptions(filtered);
        return NextResponse.json({ message: 'Prescription deleted successfully' });
      }
      throw dbErr;
    }
  } catch (err: any) {
    console.error('DELETE /api/prescriptions error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
