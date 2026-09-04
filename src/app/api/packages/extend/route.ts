import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { customerPackageId, expiresAt } = await req.json();
    if (!customerPackageId || !expiresAt) {
      return NextResponse.json({ error: 'customerPackageId and expiresAt are required.' }, { status: 400 });
    }

    const newExpiry = new Date(expiresAt);
    if (Number.isNaN(newExpiry.getTime()) || newExpiry.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'expiresAt must be a valid future timestamp.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('customer_packages')
      .update({
        expires_at: newExpiry.toISOString(),
        status: 'active',
        extended_by_employee_id: access.access.employee.id,
        extended_at: new Date().toISOString(),
      })
      .eq('id', customerPackageId)
      .in('status', ['active', 'expired'])
      .select('id, customer_id, package_id, expires_at, status, extended_by_employee_id, extended_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Active or expired customer package not found.' }, { status: 404 });
    }

    return NextResponse.json({ customerPackage: data });
  } catch (error: any) {
    console.error('POST /api/packages/extend error:', error);
    return NextResponse.json({ error: error.message || 'Unable to extend customer package.' }, { status: 500 });
  }
}
