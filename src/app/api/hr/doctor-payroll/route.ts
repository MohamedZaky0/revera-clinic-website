import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';

async function getCommissionSnapshots(reservationIds: string[]): Promise<Map<string, number>> {
  if (reservationIds.length === 0) return new Map();

  const { data: invoices, error: invoicesError } = await supabaseServer
    .from('invoices')
    .select('id, reservation_id')
    .in('reservation_id', reservationIds);
  if (invoicesError) throw invoicesError;

  const invoiceIds = (invoices || []).map((invoice: any) => invoice.id);
  if (invoiceIds.length === 0) return new Map();

  const { data: invoiceLines, error: linesError } = await supabaseServer
    .from('invoice_lines')
    .select('invoice_id, commission_snapshot')
    .in('invoice_id', invoiceIds);
  if (linesError) throw linesError;

  const reservationByInvoice = new Map<string, string>((invoices || []).map((invoice: any) => [String(invoice.id), String(invoice.reservation_id)]));
  const snapshots = new Map<string, number>();
  for (const line of invoiceLines || []) {
    const reservationId = reservationByInvoice.get(line.invoice_id);
    if (reservationId) snapshots.set(reservationId, (snapshots.get(reservationId) || 0) + Number(line.commission_snapshot || 0));
  }
  return snapshots;
}

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
        supabaseServer.from('reservations').select('id, provider_id, status, date, amount_paid, amount_left, service_id'),
        supabaseServer.from('services').select('id, price'),
      ]);

      if (!resResult.error && resResult.data) {
        const servicesMap = new Map((servicesResult.data || []).map((s: any) => [s.id, s.price]));
        allReservations = resResult.data
          .filter((r: any) => {
            const isCompleted = r.status === 'completed';
            if (!isCompleted || !r.date) return false;
            const rMonth = r.date.slice(0, 7);
            return months.includes(rMonth);
          })
          .map((r: any) => ({
            ...r,
            services: r.service_id ? { price: servicesMap.get(r.service_id) || 0 } : null
          }));
      }
    }

    const commissionSnapshots = await getCommissionSnapshots(allReservations.map((reservation: any) => reservation.id));

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
        const isProviderMatch = r.provider_id === doc.id;
        const isMonthMatch = r.date && r.date.startsWith(pay.month);
        return isProviderMatch && isMonthMatch;
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
        calculatedCommission += commissionSnapshots.get(res.id) || 0;
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
      .select('id, name, fixed_salary, commission_type, commission_value, commission_fixed_component');

    if (provErr) throw provErr;

    const isValidUuid = (str: any) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());

    const validProviders = (providers || []).filter((prov: any) => isValidUuid(prov?.id));

    if (validProviders.length === 0) {
      return NextResponse.json({ error: 'No valid doctor profiles found to run payroll.' }, { status: 400 });
    }

    // 2. Fetch all reservations for the targeted month and services
    const [resResult, servicesResult] = await Promise.all([
      supabaseServer
        .from('reservations')
        .select('provider_id, status, date, amount_paid, amount_left, service_id')
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
        return r.status === 'completed';
      })
      .map((r: any) => ({
        ...r,
        services: r.service_id ? { price: servicesMap.get(r.service_id) || 0 } : null
      }));

    const commissionSnapshots = await getCommissionSnapshots(activeReservations.map((reservation: any) => reservation.id));

    // 3. Calculate completed services and commissions per doctor
    const inserts = validProviders.map((prov: any) => {
      const fixedSalary = Number(prov.fixed_salary || 0);
      const commissionType = prov.commission_type || 'none';
      const commissionValue = Number(prov.commission_value || 0);
      const doctorReservations = activeReservations.filter((r: any) => r.provider_id === prov.id);

      const completedCount = doctorReservations.length;
      let totalCommission = 0;

      doctorReservations.forEach((res: any) => {
        totalCommission += commissionSnapshots.get(res.id) || 0;
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

    const finalFixed = fixed_salary !== undefined ? Number(fixed_salary) : Number(current.fixed_salary);
    let finalComm = total_commission_earned !== undefined ? Number(total_commission_earned) : Number(current.total_commission_earned);

    if (fixed_salary !== undefined) updates.fixed_salary = finalFixed;
    if (total_commission_earned !== undefined) updates.total_commission_earned = finalComm;

    // Dynamically calculate and lock in real counts/commission/net if not explicitly supplied
    try {
      if (current.provider_id) {
        const resResult = await supabaseServer
          .from('reservations')
          .select('id, provider_id, status, date')
          .like('date', `${current.month}-%`);

        if (resResult.data && !resResult.error) {
          const activeRes = resResult.data.filter((r: any) => {
            const isCompleted = r.status === 'completed';
            return isCompleted && r.provider_id === current.provider_id;
          });

          const completedCount = activeRes.length;
          const commissionSnapshots = await getCommissionSnapshots(activeRes.map((reservation: any) => reservation.id));
          const totalCommission = Math.round(activeRes.reduce((total: number, reservation: any) => {
            return total + (commissionSnapshots.get(reservation.id) || 0);
          }, 0) * 100) / 100;
          
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
