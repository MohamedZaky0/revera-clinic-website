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
      .from('doctor_payroll')
      .select('*')
      .order('month', { ascending: false });

    if (error) throw error;

    // Fetch all providers to map name & specialty in-memory to prevent schema cache errors
    const { data: providers, error: provErr } = await supabaseServer
      .from('providers')
      .select('id, name, specialty');

    if (provErr) {
      console.warn("Could not fetch providers for doctor payroll mapping:", provErr.message);
    }

    const providerMap = new Map<string, any>();
    (providers || []).forEach((p: any) => {
      providerMap.set(p.id, p);
    });

    // Fetch all reservations for the months present in the payroll
    const months = Array.from(new Set((payroll || []).map((p: any) => p.month)));
    let allReservations: any[] = [];
    if (months.length > 0) {
      const [resResult, servicesResult] = await Promise.all([
        supabaseServer.from('reservations').select('doctor_name, status, date, amount_paid, amount_left, service_id'),
        supabaseServer.from('services').select('id, price')
      ]);

      if (!resResult.error && resResult.data) {
        const servicesMap = new Map((servicesResult.data || []).map((s: any) => [s.id, s.price]));
        allReservations = resResult.data
          .filter((r: any) => {
            const isApprovedOrCompleted = r.status === 'approved' || r.status === 'completed';
            if (!isApprovedOrCompleted || !r.date) return false;
            const rMonth = r.date.slice(0, 7);
            return months.includes(rMonth);
          })
          .map((r: any) => ({
            ...r,
            services: r.service_id ? { price: servicesMap.get(r.service_id) || 0 } : null
          }));
      }
    }

    const mapped = (payroll || []).map((pay: any) => {
      const prov = providerMap.get(pay.provider_id) || {};
      const doc = {
        id: prov.id || pay.provider_id,
        name: prov.name || 'Unknown Doctor',
        specialty: prov.specialty || 'N/A',
        specialization: prov.specialty || 'N/A',
        employee_id: prov.id ? `DR-${prov.id.slice(0, 4).toUpperCase()}` : `DR-${pay.provider_id?.slice(0, 4).toUpperCase()}`
      };

      // Filter reservations for this doctor and month
      const docReservations = allReservations.filter((r: any) => {
        const isDocMatch = r.doctor_name && r.doctor_name.trim().toLowerCase() === doc.name.trim().toLowerCase();
        const isMonthMatch = r.date && r.date.startsWith(pay.month);
        return isDocMatch && isMonthMatch;
      });

      const totalBookingValue = docReservations.reduce((sum: number, r: any) => {
        const price = Number(r.amount_paid || 0) + Number(r.amount_left || 0) || Number(r.services?.price || 0);
        return sum + price;
      }, 0);

      const fixedSalary = Number(pay.fixed_salary || 0);
      const commissionType = pay.commission_type || 'none';
      const commissionValue = Number(pay.commission_value || 0);

      let calculatedCommission = 0;
      docReservations.forEach((res: any) => {
        if (commissionType === 'fixed') {
          calculatedCommission += commissionValue;
        } else if (commissionType === 'percentage') {
          const resPrice = Number(res.amount_paid || 0) + Number(res.amount_left || 0) || Number(res.services?.price || 0);
          calculatedCommission += resPrice * (commissionValue / 100);
        }
      });

      calculatedCommission = Math.round(calculatedCommission * 100) / 100;
      const netSalary = Math.round((fixedSalary + calculatedCommission) * 100) / 100;

      return {
        ...pay,
        providers: doc,
        doctor: doc,
        fixed_salary_snapshot: fixedSalary,
        commission_type_snapshot: commissionType,
        commission_value_snapshot: commissionValue,
        reservations_count: docReservations.length,
        calculated_commission: calculatedCommission,
        net_salary: netSalary,
        total_reservations_value: totalBookingValue
      };
    });

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error('GET /api/hr/doctor-payroll error:', err);
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

    // 1. Fetch all active providers/doctors
    const { data: providers, error: provErr } = await supabaseServer
      .from('providers')
      .select('id, name, fixed_salary, commission_type, commission_value');

    if (provErr) throw provErr;
    if (!providers || providers.length === 0) {
      return NextResponse.json({ error: 'No doctors found to run payroll.' }, { status: 400 });
    }

    // 2. Fetch all reservations for the targeted month and services
    const [resResult, servicesResult] = await Promise.all([
      supabaseServer
        .from('reservations')
        .select('doctor_name, status, date, amount_paid, amount_left, service_id')
        .like('date', `${month}-%`),
      supabaseServer
        .from('services').select('id, price')
    ]);

    if (resResult.error) {
      console.warn("Could not fetch reservations for doctor payroll calculations:", resResult.error.message);
    }

    const servicesMap = new Map((servicesResult.data || []).map((s: any) => [s.id, s.price]));
    const activeReservations = (resResult.data || [])
      .filter((r: any) => {
        return r.status === 'approved' || r.status === 'completed';
      })
      .map((r: any) => ({
        ...r,
        services: r.service_id ? { price: servicesMap.get(r.service_id) || 0 } : null
      }));

    // 3. Calculate completed services and commissions per doctor
    const inserts = providers.map((prov: any) => {
      const fixedSalary = Number(prov.fixed_salary || 0);
      const commissionType = prov.commission_type || 'none';
      const commissionValue = Number(prov.commission_value || 0);

      // Filter reservations for this specific doctor by name
      const doctorReservations = activeReservations.filter((r: any) => {
        return r.doctor_name && r.doctor_name.trim().toLowerCase() === prov.name.trim().toLowerCase();
      });

      const completedCount = doctorReservations.length;
      let totalCommission = 0;

      doctorReservations.forEach((res: any) => {
        if (commissionType === 'fixed') {
          totalCommission += commissionValue;
        } else if (commissionType === 'percentage') {
          const resPrice = Number(res.amount_paid || 0) + Number(res.amount_left || 0) || Number(res.services?.price || 0);
          totalCommission += resPrice * (commissionValue / 100);
        }
      });

      // Round to 2 decimal places
      totalCommission = Math.round(totalCommission * 100) / 100;
      const netSalary = Math.round((fixedSalary + totalCommission) * 100) / 100;

      return {
        provider_id: prov.id,
        month,
        fixed_salary: fixedSalary,
        commission_type: commissionType,
        commission_value: commissionValue,
        completed_services_count: completedCount,
        total_commission_earned: totalCommission,
        net_salary: netSalary,
        status: 'Draft'
      };
    });

    // 4. Upsert payroll records on conflict of provider_id and month
    const { data, error } = await supabaseServer
      .from('doctor_payroll')
      .upsert(inserts, { onConflict: 'provider_id, month' })
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    console.error('POST /api/hr/doctor-payroll error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, status, fixed_salary, total_commission_earned, net_salary } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Doctor payroll ID is required.' }, { status: 400 });
    }

    // Fetch current record
    const { data: current, error: fetchErr } = await supabaseServer
      .from('doctor_payroll')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Doctor payroll record not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'Paid') {
        updates.payment_date = new Date().toISOString();
      } else {
        updates.payment_date = null;
      }
    }

    let finalFixed = fixed_salary !== undefined ? Number(fixed_salary) : Number(current.fixed_salary);
    let finalComm = total_commission_earned !== undefined ? Number(total_commission_earned) : Number(current.total_commission_earned);

    if (fixed_salary !== undefined) updates.fixed_salary = finalFixed;
    if (total_commission_earned !== undefined) updates.total_commission_earned = finalComm;

    // Dynamically calculate and lock in real counts/commission/net if not explicitly supplied
    try {
      const { data: prov } = await supabaseServer
        .from('providers')
        .select('name')
        .eq('id', current.provider_id)
        .maybeSingle();

      if (prov) {
        const [resResult, servicesResult] = await Promise.all([
          supabaseServer
            .from('reservations')
            .select('doctor_name, status, date, amount_paid, amount_left, service_id')
            .like('date', `${current.month}-%`),
          supabaseServer
            .from('services').select('id, price')
        ]);

        if (resResult.data && !resResult.error) {
          const servicesMap = new Map((servicesResult.data || []).map((s: any) => [s.id, s.price]));
          const activeRes = resResult.data.filter((r: any) => {
            const isApprovedOrCompleted = r.status === 'approved' || r.status === 'completed';
            const isDocMatch = r.doctor_name && r.doctor_name.trim().toLowerCase() === prov.name.trim().toLowerCase();
            return isApprovedOrCompleted && isDocMatch;
          });

          const completedCount = activeRes.length;
          let totalCommission = 0;

          activeRes.forEach((res: any) => {
            const commType = current.commission_type;
            const commVal = Number(current.commission_value || 0);

            if (commType === 'fixed') {
              totalCommission += commVal;
            } else if (commType === 'percentage') {
              const resPrice = Number(res.amount_paid || 0) + Number(res.amount_left || 0) || Number(servicesMap.get(res.service_id) || 0);
              totalCommission += resPrice * (commVal / 100);
            }
          });

          totalCommission = Math.round(totalCommission * 100) / 100;
          
          updates.completed_services_count = completedCount;
          if (total_commission_earned === undefined) {
            updates.total_commission_earned = totalCommission;
            finalComm = totalCommission;
          }
        }
      }
    } catch (calcErr) {
      console.warn("Could not dynamically calculate payroll figures in PATCH:", calcErr);
    }

    if (net_salary !== undefined) {
      updates.net_salary = Number(net_salary);
    } else {
      updates.net_salary = Math.round((finalFixed + finalComm) * 100) / 100;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from('doctor_payroll')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PATCH /api/hr/doctor-payroll error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
