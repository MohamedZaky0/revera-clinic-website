import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
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
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || searchParams.get('customer_id');
    const bookingId = searchParams.get('bookingId') || searchParams.get('booking_id');

    try {
      let query = supabaseServer
        .from('prescriptions')
        .select('*')
        .order('date', { ascending: false });

      if (customerId && customerId !== 'all') {
        query = query.eq('customer_id', customerId);
      }
      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist, fall back to local JSON
        if (error.code === 'PGRST205') {
          console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
          let local = readLocalPrescriptions();
          if (customerId && customerId !== 'all') {
            local = local.filter((p: any) => String(p.customer_id) === String(customerId));
          }
          if (bookingId) {
            local = local.filter((p: any) => String(p.booking_id) === String(bookingId));
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
        if (customerId && customerId !== 'all') {
          local = local.filter((p: any) => String(p.customer_id) === String(customerId));
        }
        if (bookingId) {
          local = local.filter((p: any) => String(p.booking_id) === String(bookingId));
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
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const id = body.id;
  const customerId = body.customer_id || body.customerId;
  const bookingId = body.booking_id || body.bookingId;
  const patientName = body.patient_name || body.customer_name;
  const diagnosis = body.diagnosis;
  const medications = body.medications;
  const generalNotes = body.general_notes || body.instructions || body.notes;

  if (!patientName) {
    return NextResponse.json({ error: 'patient_name or customer_name is required' }, { status: 400 });
  }

  const prescriptionData = {
    customer_id: customerId || null,
    booking_id: bookingId || null,
    patient_name: patientName,
    date: body.date || new Date().toISOString().slice(0, 10),
    diagnosis: diagnosis || null,
    medications: Array.isArray(medications) ? medications : [],
    general_notes: generalNotes || null,
    doctor_notes: body.doctor_notes || null,
    follow_up_date: body.follow_up_date || null,
    updated_at: new Date().toISOString()
  };

  try {
    try {
      let result;
      if (id) {
        // Update
        const { data, error } = await supabaseServer
          .from('prescriptions')
          .update(prescriptionData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST205') throw error; // trigger local fallback
          throw error;
        }
        result = data;
      } else {
        // Insert
        const { data, error } = await supabaseServer
          .from('prescriptions')
          .insert({
            ...prescriptionData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST205') throw error; // trigger local fallback
          throw error;
        }
        result = data;
      }

      return NextResponse.json(result, { status: id ? 200 : 201 });
    } catch (dbErr: any) {
      if (dbErr.code === 'PGRST205' || dbErr.message?.includes('relation "public.prescriptions" does not exist')) {
        console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
        const local = readLocalPrescriptions();
        let result: any;
        if (id) {
          // Update local
          const index = local.findIndex((p: any) => p.id === id);
          if (index !== -1) {
            local[index] = {
              ...local[index],
              ...prescriptionData,
              updated_at: new Date().toISOString()
            };
            result = local[index];
          } else {
            return NextResponse.json({ error: 'Prescription not found locally' }, { status: 404 });
          }
        } else {
          // Create local
          const newId = `rx-${Math.random().toString(36).substr(2, 9)}`;
          result = {
            id: newId,
            ...prescriptionData,
            created_at: new Date().toISOString()
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
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
    }

    try {
      const { error } = await supabaseServer
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST205') throw error; // trigger local fallback
        throw error;
      }
      return NextResponse.json({ message: 'Prescription deleted successfully' });
    } catch (dbErr: any) {
      if (dbErr.code === 'PGRST205' || dbErr.message?.includes('relation "public.prescriptions" does not exist')) {
        console.warn('prescriptions table not found in Supabase. Falling back to local data/prescriptions.json');
        const local = readLocalPrescriptions();
        const filtered = local.filter((p: any) => p.id !== id);
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
