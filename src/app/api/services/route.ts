import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

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
    descriptionEn: r.description_en,
    descriptionAr: r.description_ar,
    isShared: r.is_shared,
    enableReminder: r.enable_reminder,
    branchPricing: r.branch_pricing,
    visible: r.visible,
    active: r.active,
    createdAt: r.created_at,
  };
}

function mapServiceToDb(s: any) {
  return {
    id: s.id,
    en: s.en,
    ar: s.ar,
    img: s.img,
    cat: s.cat,
    unit: s.unit,
    price: s.price,
    sort_order: s.sortOrder,
    duration: s.duration,
    description_en: s.descriptionEn,
    description_ar: s.descriptionAr,
    is_shared: s.isShared,
    enable_reminder: s.enableReminder,
    branch_pricing: s.branchPricing,
    visible: s.visible !== undefined ? s.visible : true,
    active: s.active !== undefined ? s.active : true,
  };
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
  try {
    const body = await req.json();
    
    // Check if it's an array of services (bulk update/sync) or a single service
    const isArray = Array.isArray(body);
    const servicesToUpsert = isArray ? body.map(mapServiceToDb) : [mapServiceToDb(body)];

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
