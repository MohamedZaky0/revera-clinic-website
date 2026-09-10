import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess, requireSuperadminAccess } from '@/lib/access';

/**
 * Roles that can never be deleted or unlocked, whatever `roles.locked` says.
 *
 * `locked` is now editable by a superadmin, which opens a lockout path: unlock `superadmin`,
 * delete it, and no account can reach Role Management again to undo it. These two names are the
 * floor under that -- the toggle and the delete guard both refuse them.
 */
const UNDELETABLE_ROLES = ['superadmin'];

async function isRoleLocked(name: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from('roles')
    .select('locked')
    .eq('name', name)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.locked);
}

export async function GET(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
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
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

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

    // A lock that still allowed permission edits would protect very little -- `admin` could be
    // stripped to zero permissions without ever being deleted. Locking freezes both.
    if (await isRoleLocked(cleanedName)) {
      return NextResponse.json(
        { error: `Role '${cleanedName}' is locked. A superadmin must unlock it before its permissions can change.` },
        { status: 400 }
      );
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
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (UNDELETABLE_ROLES.includes(name.toLowerCase())) {
      return NextResponse.json({ error: `Cannot delete system locked role: ${name}` }, { status: 400 });
    }

    // Read the lock from the row rather than a hardcoded list, so a clinic's own custom roles can
    // be protected too and the UI badge and this guard can no longer disagree.
    if (await isRoleLocked(name)) {
      return NextResponse.json(
        { error: `Role '${name}' is locked. A superadmin must unlock it before it can be deleted.` },
        { status: 400 }
      );
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

/**
 * PATCH /api/roles  { name, locked }
 *
 * Superadmin-only, unlike the rest of this file which is administrator-level: deciding what an
 * admin may no longer touch is exactly the call an admin should not be able to make for itself.
 */
export async function PATCH(req: Request) {
  const access = await requireSuperadminAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { name, locked } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }
    if (typeof locked !== 'boolean') {
      return NextResponse.json({ error: 'locked must be true or false' }, { status: 400 });
    }

    // Unlocking these is the first half of the lockout path described on UNDELETABLE_ROLES;
    // refuse it here so the delete guard is never the only thing standing in the way.
    if (locked === false && UNDELETABLE_ROLES.includes(name.toLowerCase())) {
      return NextResponse.json(
        { error: `'${name}' is a core system role and cannot be unlocked.` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('roles')
      .update({ locked, updated_at: new Date().toISOString() })
      .eq('name', name)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: `Role '${name}' not found` }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/roles error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
