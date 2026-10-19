export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess, hasGranularPermission } from '@/lib/access';
import { getDurationInMinutes, getDurationLabel } from '@/lib/services';

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
  const isLaser = Boolean(
    r.islaser ||
    r.is_laser ||
    r.isLaser ||
    (r.cat && String(r.cat).toLowerCase().includes("laser")) ||
    (r.en && String(r.en).toLowerCase().includes("laser")) ||
    (r.ar && String(r.ar).includes("ليزر")) ||
    false
  );
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
    islaser: isLaser,
    is_laser: isLaser,
    enableReminder: r.enable_reminder,
    branchPricing: r.branch_pricing,
    visible: r.visible !== false,
    active: r.active !== false,
    showOnWebsite: r.show_on_website !== false,
    createdAt: fmtCreatedAt(r.created_at),
    rawCreatedAt: r.created_at,
    created_at: r.created_at,
  };
}

function mapServiceToDb(s: any) {
  const durationMinutes = s.duration_minutes ?? (s.duration ? getDurationInMinutes(s.duration) : 30);
  const isLaserVal = s.islaser !== undefined
    ? Boolean(s.islaser)
    : s.is_laser !== undefined
    ? Boolean(s.is_laser)
    : s.isLaser !== undefined
    ? Boolean(s.isLaser)
    : Boolean(
        (s.cat && String(s.cat).toLowerCase().includes("laser")) ||
        (s.en && String(s.en).toLowerCase().includes("laser")) ||
        (s.ar && String(s.ar).includes("ليزر"))
      );

  const row: Record<string, any> = {
    en: String(s.en || '').trim(),
    ar: String(s.ar || s.en || '').trim(),
    img: s.img || '',
    cat: s.cat || 'general',
    unit: s.unit || 'in_clinic',
    price: s.price !== undefined && !isNaN(Number(s.price)) ? Number(s.price) : 0,
    sort_order: s.sortOrder ?? s.sort_order ?? 0,
    duration: s.duration || getDurationLabel(durationMinutes),
    duration_minutes: durationMinutes,
    description_en: s.descriptionEn ?? s.description_en ?? '',
    description_ar: s.descriptionAr ?? s.description_ar ?? '',
    is_shared: Boolean(s.isShared ?? s.is_shared ?? true),
    islaser: isLaserVal,
    is_laser: isLaserVal,
    enable_reminder: s.enableReminder !== undefined ? Boolean(s.enableReminder) : (s.enable_reminder !== undefined ? Boolean(s.enable_reminder) : true),
    branch_pricing: Array.isArray(s.branchPricing) ? s.branchPricing : (Array.isArray(s.branch_pricing) ? s.branch_pricing : []),
    visible: s.visible !== undefined ? Boolean(s.visible) : true,
    active: s.active !== undefined ? Boolean(s.active) : true,
    // undefined = the caller did not say; POST fills it from the stored row so a save that omits it
    // (an older admin tab, a bulk sync) can never silently re-publish a hidden service.
    show_on_website: s.showOnWebsite !== undefined ? Boolean(s.showOnWebsite) : (s.show_on_website !== undefined ? Boolean(s.show_on_website) : undefined),
  };
  if (s.id && Number(s.id) > 0) row.id = Number(s.id);
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
  } catch (err: any) {
    console.error('GET /api/services error:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasGranularPermission(access.access, 'services.create')) {
    return NextResponse.json({ error: 'You do not have permission to create or edit services.' }, { status: 403 });
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

    // show_on_website must be present on every row (a missing key on one row of a bulk upsert is
    // sent as NULL, which this NOT NULL column rejects). Where the caller did not send it, keep what
    // is stored for existing rows and default to shown for new ones.
    const needsStoredFlag = servicesToUpsert.filter((r) => r.show_on_website === undefined && r.id !== undefined);
    if (needsStoredFlag.length > 0) {
      const { data: stored, error: storedErr } = await getSupabaseServer()
        .from('services')
        .select('id, show_on_website')
        .in('id', needsStoredFlag.map((r) => r.id));
      if (storedErr) throw storedErr;
      const storedById = new Map((stored || []).map((r: any) => [Number(r.id), r.show_on_website]));
      for (const r of needsStoredFlag) r.show_on_website = storedById.get(Number(r.id)) !== false;
    }
    for (const r of servicesToUpsert) {
      if (r.show_on_website === undefined) r.show_on_website = true;
    }

    // Rows keeping their existing id and brand-new rows (no id — the DB assigns one) cannot go
    // through the same .upsert() call: PostgREST builds one INSERT from the whole array, and any
    // row missing a key present on another row gets that column sent as explicit SQL NULL rather
    // than omitted, which fails services.id's NOT NULL constraint instead of letting the identity
    // column generate a value. Split by presence of `id` and issue separate upsert/insert calls.
    const rowsWithId = servicesToUpsert.filter((r) => r.id !== undefined);
    const rowsWithoutId = servicesToUpsert.filter((r) => r.id === undefined);

    const results: any[] = [];
    if (rowsWithId.length > 0) {
      const { data, error } = await getSupabaseServer().from('services').upsert(rowsWithId).select();
      if (error) throw error;
      results.push(...(data || []));
    }
    if (rowsWithoutId.length > 0) {
      const { data, error } = await getSupabaseServer().from('services').insert(rowsWithoutId).select();
      if (error) throw error;
      results.push(...(data || []));
    }

    return NextResponse.json(isArray ? results.map(mapServiceRow) : mapServiceRow(results[0]), { status: 201 });
  } catch (err: any) {
    console.error('POST /api/services error:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasGranularPermission(access.access, 'services.delete')) {
    return NextResponse.json({ error: 'You do not have permission to delete services.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const mode = url.searchParams.get('mode') || 'hard';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    if (mode === 'soft') {
      const { data, error } = await getSupabaseServer()
        .from('services')
        .update({ active: false, visible: false })
        .eq('id', Number(id))
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Service deactivated (soft delete)' });
    }

    const { data, error } = await getSupabaseServer()
      .from('services')
      .delete()
      .eq('id', Number(id))
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Service permanently deleted' });
  } catch (err: any) {
    console.error('DELETE /api/services error:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}
