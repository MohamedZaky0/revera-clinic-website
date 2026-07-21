import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import fs from 'fs';
import path from 'path';

const FORMS_LOCAL_PATH = path.join(process.cwd(), 'data', 'medical_records.json');
const REPORTS_LOCAL_PATH = path.join(process.cwd(), 'data', 'medical_reports.json');

function readLocalData(filepath: string): any[] {
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.error(`Error reading ${filepath}:`, err);
  }
  return [];
}

function writeLocalData(filepath: string, data: any[]) {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filepath}:`, err);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    let form: any = null;
    let reports: any[] = [];

    // Try Supabase first for intake form
    try {
      const { data: formData, error: formErr } = await supabaseServer
        .from('medical_records')
        .select('*')
        .eq('customer_id', String(customerId))
        .single();

      if (!formErr && formData) {
        form = formData;
      }
    } catch (err) {
      console.warn('Supabase medical_records lookup failed, using local fallback');
    }

    // Fallback to local JSON for form if not found in DB
    if (!form) {
      const localForms = readLocalData(FORMS_LOCAL_PATH);
      form = localForms.find((f: any) => String(f.customer_id) === String(customerId)) || null;
    }

    // Try Supabase first for reports
    try {
      const { data: reportsData, error: repErr } = await supabaseServer
        .from('medical_reports')
        .select('*')
        .eq('customer_id', String(customerId))
        .order('created_at', { ascending: false });

      if (!repErr && reportsData) {
        reports = reportsData;
      }
    } catch (err) {
      console.warn('Supabase medical_reports lookup failed, using local fallback');
    }

    // Fallback to local JSON for reports if empty
    if (reports.length === 0) {
      const localReports = readLocalData(REPORTS_LOCAL_PATH);
      reports = localReports.filter((r: any) => String(r.customer_id) === String(customerId));
    }

    return NextResponse.json({
      form,
      reports,
    });
  } catch (err: any) {
    console.error('GET /api/medical-records error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, customerId, recordData, reportData } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (type === 'report') {
      // Create a new medical report
      const newReport = {
        id: `REP-${Date.now()}`,
        customer_id: String(customerId),
        title: reportData.title || 'Medical Report',
        description: reportData.description || '',
        file_url: reportData.file_url || null,
        doctor_name: reportData.doctor_name || 'Dr. Revera',
        date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      };

      // Try Supabase insert
      try {
        const { data, error } = await supabaseServer
          .from('medical_reports')
          .insert([newReport])
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, report: data });
        }
      } catch (err) {
        console.warn('Supabase report insert failed, falling back to JSON local file');
      }

      // Local storage fallback
      const localReports = readLocalData(REPORTS_LOCAL_PATH);
      localReports.unshift(newReport);
      writeLocalData(REPORTS_LOCAL_PATH, localReports);

      return NextResponse.json({ success: true, report: newReport });
    } else {
      // Upsert Medical Intake Form
      const now = new Date().toISOString();
      const updatedForm = {
        customer_id: String(customerId),
        skin_type: recordData.skin_type || 'Normal',
        main_concerns: Array.isArray(recordData.main_concerns) ? recordData.main_concerns : [],
        other_concerns_details: recordData.other_concerns_details || '',
        has_previous_treatments: Boolean(recordData.has_previous_treatments),
        previous_treatments_details: recordData.previous_treatments_details || '',
        has_medical_conditions: Boolean(recordData.has_medical_conditions),
        medical_conditions_details: recordData.medical_conditions_details || '',
        is_taking_medication: Boolean(recordData.is_taking_medication),
        medication_details: recordData.medication_details || '',
        allergies: recordData.allergies || '',
        updated_at: now,
        created_by_role: recordData.created_by_role || 'Receptionist',
        created_by_name: recordData.created_by_name || 'Staff',
      };

      // Try Supabase upsert
      try {
        const { data, error } = await supabaseServer
          .from('medical_records')
          .upsert([updatedForm], { onConflict: 'customer_id' })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, form: data });
        }
      } catch (err) {
        console.warn('Supabase medical_records upsert failed, falling back to JSON local file');
      }

      // Local storage fallback
      const localForms = readLocalData(FORMS_LOCAL_PATH);
      const existingIndex = localForms.findIndex((f: any) => String(f.customer_id) === String(customerId));
      
      if (existingIndex >= 0) {
        localForms[existingIndex] = {
          ...localForms[existingIndex],
          ...updatedForm,
        };
      } else {
        localForms.push({
          id: `MED-${Date.now()}`,
          created_at: now,
          ...updatedForm,
        });
      }

      writeLocalData(FORMS_LOCAL_PATH, localForms);
      const finalForm = localForms.find((f: any) => String(f.customer_id) === String(customerId));

      return NextResponse.json({ success: true, form: finalForm });
    }
  } catch (err: any) {
    console.error('POST /api/medical-records error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    try {
      await supabaseServer.from('medical_reports').delete().eq('id', reportId);
    } catch (err) {
      console.warn('Supabase delete report failed, updating local JSON file');
    }

    const localReports = readLocalData(REPORTS_LOCAL_PATH);
    const filtered = localReports.filter((r: any) => String(r.id) !== String(reportId));
    writeLocalData(REPORTS_LOCAL_PATH, filtered);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
