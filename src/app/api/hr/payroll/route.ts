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

    // 1. Fetch all active employees including target configurations
    const { data: employees, error: empErr } = await supabaseServer
      .from('employee_accounts')
      .select('id, role_name, salary, required_target_amount, bonus_percentage, target_type, bonus_type');

    if (empErr) throw empErr;
    const payrollEmployees = (employees || []).filter((employee: any) => employee.role_name?.toLowerCase() !== 'superadmin');
    if (payrollEmployees.length === 0) {
      return NextResponse.json({ error: 'No employee accounts found to run payroll.' }, { status: 400 });
    }

    // 2. Fetch all reservations with employee credit for the target month
    const [year, monthNumber] = month.split('-').map(Number);
    const monthStart = `${month}-01`;
    const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
    const { data: monthReservations, error: resErr } = await supabaseServer
      .from('reservations')
      .select('created_by_employee_id, amount_paid, amount_left, status, date, services(price)')
      .not('created_by_employee_id', 'is', null)
      .gte('date', monthStart)
      .lt('date', nextMonthStart);

    if (resErr) {
      console.warn("Could not fetch month reservations for payroll target calculation:", resErr.message);
    }

    // Calculate achieved revenue and reservation counts per employee
    const employeeRevenueMap = new Map<string, number>();
    const employeeCountMap = new Map<string, number>();
    (monthReservations || []).forEach((res: any) => {
      if (res.status === 'approved' || res.status === 'completed') {
        const price = Number(res.amount_paid || 0) + Number(res.amount_left || 0) || Number(res.services?.price || 0);
        const empId = res.created_by_employee_id;
        employeeRevenueMap.set(empId, (employeeRevenueMap.get(empId) || 0) + price);
        employeeCountMap.set(empId, (employeeCountMap.get(empId) || 0) + 1);
      }
    });

    const { data: existingPayroll, error: existingPayrollError } = await supabaseServer
      .from('hr_payroll')
      .select('employee_id, status')
      .eq('month', month);

    if (existingPayrollError) throw existingPayrollError;

    const paidEmployeeIds = new Set(
      (existingPayroll || [])
        .filter((payroll: any) => payroll.status === 'Paid')
        .map((payroll: any) => payroll.employee_id)
    );

    // 3. Prepare bulk inserts with target and bonus calculations
    const inserts = payrollEmployees
      .filter((emp: any) => !paidEmployeeIds.has(emp.id))
      .map((emp: any) => {
      const basic = Number(emp.salary || 0);
      const target = Number(emp.required_target_amount || 0);
      const bonusVal = Number(emp.bonus_percentage || 0);
      const targetType = emp.target_type || 'reservations';
      const bonusType = emp.bonus_type || 'percentage';

      const achievedRev = employeeRevenueMap.get(emp.id) || 0;
      const achievedCount = employeeCountMap.get(emp.id) || 0;

      // Check achievement
      let hasAchieved = false;
      if (target > 0) {
        if (targetType === 'revenue') {
          hasAchieved = achievedRev >= target;
        } else {
          hasAchieved = achievedCount >= target;
        }
      }

      let calculatedBonus = 0;
      if (hasAchieved) {
        if (bonusType === 'fixed') {
          calculatedBonus = Math.round(bonusVal);
        } else {
          calculatedBonus = Math.round(basic * (bonusVal / 100));
        }
      }

      return {
        employee_id: emp.id,
        month,
        basic_salary: basic,
        bonuses: calculatedBonus,
        deductions: 0,
        net_salary: basic + calculatedBonus,
        status: 'Draft',
        target_amount_snapshot: target,
        bonus_percentage_snapshot: bonusVal,
        achieved_revenue: targetType === 'revenue' ? achievedRev : achievedCount,
        calculated_bonus: calculatedBonus,
        target_type_snapshot: targetType,
        bonus_type_snapshot: bonusType
      };
    });

    if (inserts.length === 0) {
      return NextResponse.json({ success: true, count: 0, skippedPaid: paidEmployeeIds.size });
    }

    // 4. Upsert payroll records (ignore duplicates if already ran, or overwrite)
    const { data, error } = await supabaseServer
      .from('hr_payroll')
      .upsert(inserts, { onConflict: 'employee_id,month' })
      .select();

    if (error) throw error;
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      skippedPaid: paidEmployeeIds.size
    });
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
