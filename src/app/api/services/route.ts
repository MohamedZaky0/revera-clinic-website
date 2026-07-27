import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

function getDurationInMinutes(duration: string | null | undefined): number | null {
  if (!duration) return null;
  const cleaned = duration.toLowerCase().trim();

  const matchHours = cleaned.match(/(\d+):(\d+)\s*hour/);
  if (matchHours) {
    const hrs = parseInt(matchHours[1], 10);
    const mins = parseInt(matchHours[2], 10);
    return hrs * 60 + mins;
  }

  const matchMins = cleaned.match(/(\d+)\s*min/);
  if (matchMins) {
    return parseInt(matchMins[1], 10);
  }

  const matchOneHour = cleaned.match(/(\d+)\s*hour/);
  if (matchOneHour) {
    return parseInt(matchOneHour[1], 10) * 60;
  }

  const matchHHMM = cleaned.match(/^(\d+):(\d+)$/);
  if (matchHHMM) {
    const hrs = parseInt(matchHHMM[1], 10);
    const mins = parseInt(matchHHMM[2], 10);
    return hrs * 60 + mins;
  }

  return null;
}

function fmtCreatedAt(val: unknown): string {
  if (!val) return "";
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  let timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
  timePart = timePart.toLowerCase();
  return `${datePart} ${timePart}`;
}

function mapServiceRow(r: any) {
  return {
    id: r.id,
    en: r.en,
    ar: r.ar,
    img: r.img,
    cat: r.cat,
    unit: r.unit,
    price: r.price !== null ? Number(r.price) : undefined,
    sortOrder: r.sort_order,
    duration: r.duration,
    duration_minutes: r.duration_minutes,
    descriptionEn: r.description_en,
    descriptionAr: r.description_ar,
    isShared: r.is_shared,
    enableReminder: r.enable_reminder,
    branchPricing: r.branch_pricing,
    visible: r.visible,
    active: r.active,
    createdAt: fmtCreatedAt(r.created_at),
  };
}

function mapServiceToDb(s: any) {
  const row: Record<string, any> = {
    en: s.en,
    ar: s.ar,
    img: s.img,
    cat: s.cat,
    unit: s.unit,
    price: s.price,
    sort_order: s.sortOrder,
    duration: s.duration,
    duration_minutes: s.duration_minutes ?? getDurationInMinutes(s.duration),
    description_en: s.descriptionEn,
    description_ar: s.descriptionAr,
    is_shared: s.isShared,
    enable_reminder: s.enableReminder,
    branch_pricing: s.branchPricing,
    visible: s.visible !== undefined ? s.visible : true,
    active: s.active !== undefined ? s.active : true,
  };
  if (s.id) row.id = s.id;
  return row;
}

export async function GET(req: Request) {
  try {
    const { data, error } = await getSupabaseServer()
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json((data || []).map(mapServiceRow));
  } catch (err) {
    console.error('GET /api/services error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();

    // Check if it's an array of services (bulk update/sync) or a single service
    const isArray = Array.isArray(body);
    const rawServices = isArray ? body : [body];

    // Validate duration before persisting so the DB constraint never leaks as a 500
    for (const s of rawServices) {
      const durationMinutes = s.duration_minutes ?? getDurationInMinutes(s.duration);
      if (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) {
        return NextResponse.json({ error: 'Invalid duration. duration_minutes must be a number between 1 and 1440.' }, { status: 400 });
      }
    }

    const servicesToUpsert = rawServices.map(mapServiceToDb);

    const { data, error } = await getSupabaseServer()
      .from('services')
      .upsert(servicesToUpsert)
      .select();

    if (error) throw error;
    return NextResponse.json(isArray ? data.map(mapServiceRow) : mapServiceRow(data[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/services error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { data, error } = await getSupabaseServer()
      .from('services')
      .delete()
      .eq('id', Number(id))
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    console.error('DELETE /api/services error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
