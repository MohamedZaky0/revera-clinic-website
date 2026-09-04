import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { data, error } = await supabaseServer
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ suppliers: data || [] });
  } catch (err: any) {
    console.error('GET /api/suppliers error:', err);
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
    const { name, contact, payment_terms, active } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Supplier name is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('suppliers')
      .insert({
        name: String(name).trim(),
        contact: contact ? String(contact).trim() : null,
        payment_terms: payment_terms ? String(payment_terms).trim() : null,
        active: active !== undefined ? Boolean(active) : true,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/suppliers error:', err);
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
    const { id, name, contact, payment_terms, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
    }
    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: 'Supplier name cannot be empty.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (contact !== undefined) updates.contact = contact ? String(contact).trim() : null;
    if (payment_terms !== undefined) updates.payment_terms = payment_terms ? String(payment_terms).trim() : null;
    if (active !== undefined) updates.active = Boolean(active);

    const { data, error } = await supabaseServer
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PUT /api/suppliers error:', err);
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
      return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
    }

    const { data: referencing, error: refError } = await supabaseServer
      .from('purchases')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);
    if (refError) throw refError;
    if (referencing && referencing.length > 0) {
      return NextResponse.json(
        { error: 'This supplier has purchase history and cannot be deleted. Mark it inactive instead.' },
        { status: 409 }
      );
    }

    const { error } = await supabaseServer.from('suppliers').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('DELETE /api/suppliers error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
