import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = supabaseServer
      .from('terms_and_conditions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/terms error:', error);
      // Fallback: If table doesn't exist yet, return null so client uses fallback
      return NextResponse.json({ terms: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ terms: data || [] });
  } catch (err: any) {
    console.error('GET /api/terms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const {
      title_en,
      title_ar,
      content_en,
      content_ar,
      link_text_en,
      link_text_ar,
      link_url,
      is_active = true,
      sort_order
    } = body;

    if (!title_en || !content_en) {
      return NextResponse.json({ error: 'Title (EN) and Content (EN) are required' }, { status: 400 });
    }

    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const { data: maxItem } = await supabaseServer
        .from('terms_and_conditions')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      finalSortOrder = maxItem ? maxItem.sort_order + 1 : 1;
    }

    const { data, error } = await supabaseServer
      .from('terms_and_conditions')
      .insert({
        sort_order: finalSortOrder,
        title_en,
        title_ar: title_ar || '',
        content_en,
        content_ar: content_ar || '',
        link_text_en: link_text_en || '',
        link_text_ar: link_text_ar || '',
        link_url: link_url || '',
        is_active: is_active !== false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ term: data });
  } catch (err: any) {
    console.error('POST /api/terms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();

    // Check if bulk reordering (array of { id, sort_order })
    if (Array.isArray(body)) {
      const updates = body.map((item: { id: string; sort_order: number }) =>
        supabaseServer
          .from('terms_and_conditions')
          .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      );
      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    // Single item update
    const {
      id,
      title_en,
      title_ar,
      content_en,
      content_ar,
      link_text_en,
      link_text_ar,
      link_url,
      is_active,
      sort_order
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing term id' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (title_en !== undefined) updatePayload.title_en = title_en;
    if (title_ar !== undefined) updatePayload.title_ar = title_ar;
    if (content_en !== undefined) updatePayload.content_en = content_en;
    if (content_ar !== undefined) updatePayload.content_ar = content_ar;
    if (link_text_en !== undefined) updatePayload.link_text_en = link_text_en;
    if (link_text_ar !== undefined) updatePayload.link_text_ar = link_text_ar;
    if (link_url !== undefined) updatePayload.link_url = link_url;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (sort_order !== undefined) updatePayload.sort_order = sort_order;

    const { data, error } = await supabaseServer
      .from('terms_and_conditions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ term: data });
  } catch (err: any) {
    console.error('PUT /api/terms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('terms_and_conditions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/terms error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
