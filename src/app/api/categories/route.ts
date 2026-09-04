import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess, requireAdministratorAccess } from '@/lib/access';

function mapCategoryRow(r: any) {
  return {
    key: r.key,
    en: r.en,
    ar: r.ar,
    sortOrder: r.sort_order,
  };
}

function mapCategoryToDb(c: any) {
  return {
    key: c.key,
    en: c.en,
    ar: c.ar,
    sort_order: c.sortOrder,
  };
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { data, error } = await getSupabaseServer()
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json((data || []).map(mapCategoryRow));
  } catch (err) {
    console.error('GET /api/categories error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const isArray = Array.isArray(body);
    const categoriesToUpsert = isArray ? body.map(mapCategoryToDb) : [mapCategoryToDb(body)];

    const { data, error } = await getSupabaseServer()
      .from('categories')
      .upsert(categoriesToUpsert)
      .select();

    if (error) throw error;
    return NextResponse.json(isArray ? data.map(mapCategoryRow) : mapCategoryRow(data[0]), { status: 201 });
  } catch (err) {
    console.error('POST /api/categories error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  try {
    const { data, error } = await getSupabaseServer()
      .from('categories')
      .delete()
      .eq('key', key)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('DELETE /api/categories error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
