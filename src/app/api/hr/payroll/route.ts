import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: payroll, error } = await supabaseServer
      .from('hr_payroll')
      .select('*, employee_accounts(id, name, email, role_name, department, salary)')
      .order('month', { ascending: false });

    if (error) throw error;
    return NextResponse.json(payroll);
  } catch (err: any) {
    console.error('GET /api/hr/payroll error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { month } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Valid month (YYYY-MM) is required.' }, { status: 400 });
    }

    // 1. Fetch all active employees
    const { data: employees, error: empErr } = await supabaseServer
      .from('employee_accounts')
      .select('id, salary')
      .not('email', 'eq', 'superadmin@revera.com'); // skip owner

    if (empErr) throw empErr;
    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: 'No employee accounts found to run payroll.' }, { status: 400 });
    }

    // 2. Prepare bulk inserts
    const inserts = employees.map((emp: any) => {
      const basic = Number(emp.salary || 0);
      return {
        employee_id: emp.id,
        month,
        basic_salary: basic,
        bonuses: 0,
        deductions: 0,
        net_salary: basic,
        status: 'Draft'
      };
    });

    // 3. Upsert payroll records (ignore duplicates if already ran, or overwrite)
    const { data, error } = await supabaseServer
      .from('hr_payroll')
      .upsert(inserts, { onConflict: 'employee_id, month' })
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    console.error('POST /api/hr/payroll error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, bonuses, deductions, status } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Payroll ID is required.' }, { status: 400 });
    }

    // Fetch current record
    const { data: current, error: fetchErr } = await supabaseServer
      .from('hr_payroll')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Payroll record not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (bonuses !== undefined) updates.bonuses = Number(bonuses);
    if (deductions !== undefined) updates.deductions = Number(deductions);
    if (status !== undefined) {
      updates.status = status;
      if (status === 'Paid') {
        updates.payment_date = new Date().toISOString();
      }
    }

    // Recalculate net salary if bonuses or deductions changed
    const newBasic = current.basic_salary;
    const newBonuses = bonuses !== undefined ? Number(bonuses) : current.bonuses;
    const newDeductions = deductions !== undefined ? Number(deductions) : current.deductions;
    updates.net_salary = newBasic + newBonuses - newDeductions;

    const { data, error } = await supabaseServer
      .from('hr_payroll')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/hr/payroll error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
