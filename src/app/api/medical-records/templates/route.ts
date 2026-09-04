import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import fs from 'fs';
import path from 'path';

const TEMPLATES_LOCAL_PATH = path.join(process.cwd(), 'data', 'medical_record_templates.json');

export interface IntakeField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface MedicalRecordTemplate {
  id: string;
  title: string;
  description: string;
  service_ids: (string | number)[];
  fields: IntakeField[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_TEMPLATES: MedicalRecordTemplate[] = [
  {
    id: 'tmpl-general',
    title: 'General Aesthetic & Medical Intake',
    description: 'Standard clinical and aesthetic intake form for general consultations, checkups, and unassigned services.',
    service_ids: [],
    is_default: true,
    fields: [
      { id: 'skin_type', label: 'Skin Type', type: 'select', options: ['Normal', 'Dry', 'Oily', 'Sensitive', 'Combination', 'Acne-Prone'], required: true },
      { id: 'allergies', label: 'Known Allergies & Drug Sensitivities', type: 'text', placeholder: 'e.g. Latex, Aspirin, Penicillin, None', required: false },
      { id: 'medications', label: 'Current Daily Medications', type: 'text', placeholder: 'e.g. Blood thinners, Roaccutane, None', required: false },
      { id: 'medical_conditions', label: 'Chronic Conditions (Diabetes, Thyroid, Heart, etc.)', type: 'text', placeholder: 'e.g. Hypertension, Diabetes, None', required: false },
      { id: 'previous_treatments', label: 'Previous Cosmetic & Medical Treatments', type: 'textarea', placeholder: 'Describe past peels, surgeries, laser, or filler sessions...', required: false },
      { id: 'general_notes', label: 'Additional Clinical Remarks', type: 'textarea', placeholder: 'Doctor or patient remarks...', required: false }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tmpl-laser',
    title: 'Laser Hair Removal & Skin Rejuvenation Intake',
    description: 'Specialized intake form for laser sessions, assessing skin tone, photo-sensitivity, tanning history, and pulse tolerance.',
    service_ids: [],
    is_default: false,
    fields: [
      { id: 'fitzpatrick_scale', label: 'Fitzpatrick Skin Phototype', type: 'select', options: ['Type I (Very Pale / Always Burns)', 'Type II (Fair / Usually Burns)', 'Type III (Medium / Sometimes Mild Burn)', 'Type IV (Olive / Rarely Burns)', 'Type V (Brown / Very Rarely Burns)', 'Type VI (Dark Brown / Never Burns)'], required: true },
      { id: 'recent_sun_exposure', label: 'Sun Exposure / Tanning / Solarium in Last 4 Weeks', type: 'select', options: ['No Sun Exposure', 'Mild Sun Exposure', 'Active Sun Tan / Solarium'], required: true },
      { id: 'photosensitizing_drugs', label: 'Taking Photosensitizing Medication (Roaccutane / Isotretinoin, Doxycycline)', type: 'text', placeholder: 'Specify medication or "None"', required: false },
      { id: 'skin_lesions_tattoos', label: 'Tattoos, Open Wounds, or Suspicious Lesions in Area', type: 'text', placeholder: 'Specify area or "None"', required: false },
      { id: 'pain_tolerance', label: 'Pain & Heat Sensitivity Tolerance', type: 'select', options: ['Normal Tolerance', 'High Sensitivity', 'High Tolerance'], required: false },
      { id: 'laser_contraindications', label: 'Contraindications (Pregnancy, Epilepsy, Pacemaker)', type: 'text', placeholder: 'e.g. None', required: false }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tmpl-injectables',
    title: 'Injectables, Botox & Dermal Fillers Intake',
    description: 'Specialized pre-injection assessment for Botox, hyaluronic acid fillers, skin boosters, and facial contouring.',
    service_ids: [],
    is_default: false,
    fields: [
      { id: 'previous_injectables', label: 'Previous Injections History & Brands Used', type: 'textarea', placeholder: 'e.g. Juvederm in lips 6 mos ago, Botox forehead 4 mos ago...', required: false },
      { id: 'bleeding_disorders', label: 'Bleeding Disorders or Anticoagulants (Aspirin, Warfarin, Ibuprofen)', type: 'select', options: ['No Bleeding Disorders / No Blood Thinners', 'Taking Aspirin / NSAIDs', 'Diagnosed Coagulation Disorder'], required: true },
      { id: 'active_facial_infection', label: 'Active Facial Cold Sores / Herpes / Skin Infection', type: 'select', options: ['No Active Infection', 'History of Cold Sores (Prophylaxis Needed)', 'Active Infection Present (Postpone)'], required: true },
      { id: 'pregnancy_nursing', label: 'Pregnancy or Breastfeeding Status', type: 'select', options: ['Not Pregnant / Not Nursing', 'Currently Pregnant', 'Currently Breastfeeding'], required: true },
      { id: 'facial_surgeries', label: 'Previous Facial Surgeries, Implants, or Permanent Threads', type: 'text', placeholder: 'e.g. Rhinoplasty in 2024, None', required: false },
      { id: 'aesthetic_goals', label: 'Patient Desired Aesthetic Goals & Target Areas', type: 'textarea', placeholder: 'Detail target treatment areas and expected outcome...', required: false }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function readLocalTemplates(): MedicalRecordTemplate[] {
  try {
    if (fs.existsSync(TEMPLATES_LOCAL_PATH)) {
      const data = fs.readFileSync(TEMPLATES_LOCAL_PATH, 'utf8');
      const parsed = JSON.parse(data || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Error reading ${TEMPLATES_LOCAL_PATH}:`, err);
  }
  // Initialize with default templates
  writeLocalTemplates(DEFAULT_TEMPLATES);
  return DEFAULT_TEMPLATES;
}

function writeLocalTemplates(templates: MedicalRecordTemplate[]) {
  try {
    const dir = path.dirname(TEMPLATES_LOCAL_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TEMPLATES_LOCAL_PATH, JSON.stringify(templates, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${TEMPLATES_LOCAL_PATH}:`, err);
  }
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId') || searchParams.get('service_id');
    const templateId = searchParams.get('id') || searchParams.get('templateId');

    let templates: MedicalRecordTemplate[] = [];

    // Try Supabase first
    try {
      const { data, error } = await supabaseServer
        .from('medical_record_templates')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        templates = data;
      }
    } catch (err) {
      console.warn('Supabase medical_record_templates query fallback to local');
    }

    if (templates.length === 0) {
      templates = readLocalTemplates();
    }

    // Lookup specific template by ID
    if (templateId) {
      const found = templates.find((t) => String(t.id) === String(templateId));
      if (!found) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template: found });
    }

    // Lookup matching template by service ID
    if (serviceId) {
      const matched = templates.find((t) =>
        Array.isArray(t.service_ids) && t.service_ids.some((sId) => String(sId) === String(serviceId))
      );
      if (matched) {
        return NextResponse.json({ template: matched, matchType: 'exact_service' });
      }

      // Fallback to default template
      const defaultTmpl = templates.find((t) => t.is_default) || templates[0];
      return NextResponse.json({ template: defaultTmpl, matchType: 'default_fallback' });
    }

    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error('GET /api/medical-records/templates error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'Template title is required' }, { status: 400 });
    }

    const newTemplate: MedicalRecordTemplate = {
      id: body.id || `tmpl-${Date.now()}`,
      title,
      description: body.description?.trim() || '',
      service_ids: Array.isArray(body.service_ids) ? body.service_ids : [],
      fields: Array.isArray(body.fields) ? body.fields : [],
      is_default: Boolean(body.is_default),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let templates = readLocalTemplates();

    if (newTemplate.is_default) {
      templates = templates.map((t) => ({ ...t, is_default: false }));
    }

    templates.push(newTemplate);
    writeLocalTemplates(templates);

    // Try Supabase insert
    try {
      await supabaseServer
        .from('medical_record_templates')
        .upsert([newTemplate], { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase medical_record_templates upsert fallback');
    }

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (err: any) {
    console.error('POST /api/medical-records/templates error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    let templates = readLocalTemplates();
    const index = templates.findIndex((t) => String(t.id) === String(id));
    if (index === -1) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (body.is_default) {
      templates = templates.map((t) => ({ ...t, is_default: false }));
    }

    const updatedTemplate: MedicalRecordTemplate = {
      ...templates[index],
      title: body.title !== undefined ? body.title.trim() : templates[index].title,
      description: body.description !== undefined ? body.description.trim() : templates[index].description,
      service_ids: Array.isArray(body.service_ids) ? body.service_ids : templates[index].service_ids,
      fields: Array.isArray(body.fields) ? body.fields : templates[index].fields,
      is_default: body.is_default !== undefined ? Boolean(body.is_default) : templates[index].is_default,
      updated_at: new Date().toISOString()
    };

    templates[index] = updatedTemplate;
    writeLocalTemplates(templates);

    // Try Supabase update
    try {
      await supabaseServer
        .from('medical_record_templates')
        .upsert([updatedTemplate], { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase medical_record_templates update fallback');
    }

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (err: any) {
    console.error('PUT /api/medical-records/templates error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    let templates = readLocalTemplates();
    const target = templates.find((t) => String(t.id) === String(id));
    if (target?.is_default && templates.length > 1) {
      return NextResponse.json({ error: 'Cannot delete the default intake template. Please mark another template as default first.' }, { status: 400 });
    }

    templates = templates.filter((t) => String(t.id) !== String(id));
    writeLocalTemplates(templates);

    // Try Supabase delete
    try {
      await supabaseServer
        .from('medical_record_templates')
        .delete()
        .eq('id', String(id));
    } catch (err) {
      console.warn('Supabase medical_record_templates delete fallback');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/medical-records/templates error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
