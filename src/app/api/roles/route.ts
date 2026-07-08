import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data: roles, error } = await supabaseServer
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(roles || []);
  } catch (err: any) {
    console.error('GET /api/roles error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, permissions } = body;

    if (!name || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Role name and permissions array are required' }, { status: 400 });
    }

    // Clean name to lowercase alphanumeric (no spaces)
    const cleanedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanedName) {
      return NextResponse.json({ error: 'Invalid role name' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('roles')
      .upsert({
        name: cleanedName,
        permissions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'name' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('POST /api/roles error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (name === 'superadmin') {
      return NextResponse.json({ error: 'Cannot delete superadmin role' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('roles')
      .delete()
      .eq('name', name);

    if (error) throw error;

    return NextResponse.json({ message: `Role '${name}' deleted successfully` });
  } catch (err: any) {
    console.error('DELETE /api/roles error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
