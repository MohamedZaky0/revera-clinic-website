import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const JSON_FILE_PATH = path.join(process.cwd(), 'data', 'providers.json');

const DEFAULT_PROVIDERS: any[] = [];

function mapProvider(p: Record<string, any>, bookingsCount: number = 0) {
  return {
    id: p.id,
    name: p.name,
    bookings: bookingsCount,
    services: p.services ?? [],
    more: p.more_count ?? 0,
    rating: Number(p.rating || 0),
    image: p.image || null,
    phone: p.phone || null,
    gender: p.gender || null,
    age: p.age ? Number(p.age) : null,
    specialty: p.specialty || null,
    nationalId: p.national_id || null,
    workingDaysHours: p.working_days_hours || null,
    branchId: p.branch_id || null,
    startDate: p.start_date || null,
    fixedSalary: p.fixed_salary ? Number(p.fixed_salary) : 0,
    commissionType: p.commission_type || 'none',
    commissionValue: p.commission_value ? Number(p.commission_value) : 0,
  };
}
 
export async function GET() {
  try {
    const [providersRes, reservationsRes] = await Promise.all([
      supabaseServer
        .from('providers')
        .select('*')
        .order('name', { ascending: true }),
      supabaseServer
        .from('reservations')
        .select('doctor_name, status')
        .neq('status', 'rejected')
    ]);
 
    if (!providersRes.error && providersRes.data && providersRes.data.length > 0 && ('working_days_hours' in providersRes.data[0])) {
      const counts = new Map<string, number>();
      (reservationsRes.data || []).forEach((r: any) => {
        if (r.doctor_name) {
          const nameKey = r.doctor_name.trim().toLowerCase();
          counts.set(nameKey, (counts.get(nameKey) || 0) + 1);
        }
      });
 
      const mapped = providersRes.data.map((p: any) => {
        const key = p.name ? p.name.trim().toLowerCase() : "";
        const bookingsCount = counts.get(key) || 0;
        return mapProvider(p, bookingsCount);
      });
      return NextResponse.json(mapped);
    } else {
      if (providersRes.error) {
        console.warn("Supabase providers query error, falling back to JSON:", providersRes.error);
      } else {
        console.warn("Supabase providers missing columns (schema not migrated), falling back to JSON");
      }
    }
  } catch (dbErr) {
    console.error("Database providers load error, falling back to JSON:", dbErr);
  }
 
  // Fallback to local JSON file
  try {
    const reservationsRes = await supabaseServer.from('reservations').select('doctor_name, status').neq('status', 'rejected');
    const counts = new Map<string, number>();
    (reservationsRes.data || []).forEach((r: any) => {
      if (r.doctor_name) {
        const nameKey = r.doctor_name.trim().toLowerCase();
        counts.set(nameKey, (counts.get(nameKey) || 0) + 1);
      }
    });
 
    if (!fs.existsSync(JSON_FILE_PATH)) {
      fs.mkdirSync(path.dirname(JSON_FILE_PATH), { recursive: true });
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(DEFAULT_PROVIDERS.map((p, i) => ({ ...mapProvider(p, counts.get(p.name ? p.name.trim().toLowerCase() : "") || 0), id: `local-${i}` })), null, 2));
      return NextResponse.json(DEFAULT_PROVIDERS.map((p, i) => ({ ...mapProvider(p, counts.get(p.name ? p.name.trim().toLowerCase() : "") || 0), id: `local-${i}` })));
    }
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const localProviders = JSON.parse(fileContent);
    const mappedLocal = localProviders.map((p: any) => {
      const key = p.name ? p.name.trim().toLowerCase() : "";
      return {
        ...p,
        bookings: counts.get(key) || 0
      };
    });
    return NextResponse.json(mappedLocal);
  } catch (err) {
    console.error("JSON fallback load error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { name, services, rating, more, image, phone, gender, age, specialty, nationalId, workingDaysHours, branchId, startDate, fixedSalary, commissionType, commissionValue } = body;
  const newProvider = {
    name,
    services: services || [],
    rating: Number(rating || 0),
    more_count: Number(more || 0),
    bookings_count: 0,
    image: image || null,
    phone: phone || null,
    gender: gender || null,
    age: age ? Number(age) : null,
    specialty: specialty || null,
    national_id: nationalId || null,
    working_days_hours: workingDaysHours || null,
    branch_id: branchId || null,
    start_date: startDate || null,
    fixed_salary: fixedSalary ? Number(fixedSalary) : 0,
    commission_type: commissionType || 'none',
    commission_value: commissionValue ? Number(commissionValue) : 0,
  };

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  let changedBy = 'System/Unknown';
  if (token) {
    try {
      const { data: { user } } = await supabaseServer.auth.getUser(token);
      if (user?.email) {
        changedBy = user.email;
      }
    } catch (e) {
      console.warn("Could not get user from auth token in providers API:", e);
    }
  }

  try {
    const { data, error } = await supabaseServer
      .from('providers')
      .insert(newProvider)
      .select()
      .single();

    if (!error && data) {
      if (workingDaysHours) {
        try {
          await supabaseServer
            .from('provider_schedule_audit_logs')
            .insert({
              provider_id: data.id,
              provider_name: data.name,
              changed_by: changedBy,
              action: 'create_schedule',
              previous_schedule: null,
              new_schedule: workingDaysHours
            });
        } catch (auditErr: any) {
          console.warn("Could not write provider schedule audit log:", auditErr.message);
        }
      }
      return NextResponse.json(mapProvider(data), { status: 201 });
    } else {
      console.warn("Supabase providers insert error, falling back to JSON:", error);
    }
  } catch (dbErr) {
    console.error("Database providers insert error, falling back to JSON:", dbErr);
  }

  // Fallback to JSON file
  try {
    let list = [];
    if (fs.existsSync(JSON_FILE_PATH)) {
      list = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
    }
    const localNew = {
      id: `local-${Date.now()}`,
      name,
      bookings: 0,
      services: services || [],
      more: Number(more || 0),
      rating: Number(rating || 0),
      image: image || null,
      phone: phone || null,
      gender: gender || null,
      age: age ? Number(age) : null,
      specialty: specialty || null,
      nationalId: nationalId || null,
      workingDaysHours: workingDaysHours || null,
      branchId: branchId || null,
      startDate: startDate || null,
      fixedSalary: fixedSalary ? Number(fixedSalary) : 0,
      commissionType: commissionType || 'none',
      commissionValue: commissionValue ? Number(commissionValue) : 0
    };
    list.push(localNew);
    fs.mkdirSync(path.dirname(JSON_FILE_PATH), { recursive: true });
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(list, null, 2));
    return NextResponse.json(localNew, { status: 201 });
  } catch (err) {
    console.error("JSON fallback insert error:", err);
    return NextResponse.json({ error: 'Server error saving provider' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { name, services, rating, more, image, phone, gender, age, specialty, nationalId, workingDaysHours, branchId, startDate, fixedSalary, commissionType, commissionValue } = body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (services !== undefined) updates.services = services;
  if (rating !== undefined) updates.rating = Number(rating || 0);
  if (more !== undefined) updates.more_count = Number(more || 0);
  if (image !== undefined) updates.image = image;
  if (phone !== undefined) updates.phone = phone;
  if (gender !== undefined) updates.gender = gender;
  if (age !== undefined) updates.age = age ? Number(age) : null;
  if (specialty !== undefined) updates.specialty = specialty;
  if (nationalId !== undefined) updates.national_id = nationalId;
  if (workingDaysHours !== undefined) updates.working_days_hours = workingDaysHours;
  if (branchId !== undefined) updates.branch_id = branchId;
  if (startDate !== undefined) updates.start_date = startDate;
  if (fixedSalary !== undefined) updates.fixed_salary = Number(fixedSalary || 0);
  if (commissionType !== undefined) updates.commission_type = commissionType;
  if (commissionValue !== undefined) updates.commission_value = Number(commissionValue || 0);

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  let changedBy = 'System/Unknown';
  if (token) {
    try {
      const { data: { user } } = await supabaseServer.auth.getUser(token);
      if (user?.email) {
        changedBy = user.email;
      }
    } catch (e) {
      console.warn("Could not get user from auth token in providers API:", e);
    }
  }

  let oldProvider: any = null;
  try {
    const { data } = await supabaseServer
      .from('providers')
      .select('name, working_days_hours')
      .eq('id', id)
      .maybeSingle();
    oldProvider = data;
  } catch (e) {
    console.warn("Could not fetch old provider for audit logging:", e);
  }

  try {
    const { data, error } = await supabaseServer
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      if (workingDaysHours !== undefined && oldProvider) {
        try {
          await supabaseServer
            .from('provider_schedule_audit_logs')
            .insert({
              provider_id: id,
              provider_name: oldProvider.name,
              changed_by: changedBy,
              action: 'update_schedule',
              previous_schedule: oldProvider.working_days_hours,
              new_schedule: workingDaysHours
            });
        } catch (auditErr: any) {
          console.warn("Could not write provider schedule audit log:", auditErr.message);
        }
      }
      return NextResponse.json(mapProvider(data));
    } else {
      console.warn("Supabase providers update error, falling back to JSON:", error);
    }
  } catch (dbErr) {
    console.error("Database providers update error, falling back to JSON:", dbErr);
  }

  // Fallback to JSON file
  try {
    if (fs.existsSync(JSON_FILE_PATH)) {
      const list = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
      const index = list.findIndex((p: any) => p.id === id);
      if (index !== -1) {
        // Map camelCase to snake_case updates for fallback JSON storage consistency
        const jsonUpdates = {
          ...updates,
          image: updates.image !== undefined ? updates.image : list[index].image,
          phone: updates.phone !== undefined ? updates.phone : list[index].phone,
          gender: updates.gender !== undefined ? updates.gender : list[index].gender,
          age: updates.age !== undefined ? updates.age : list[index].age,
          specialty: updates.specialty !== undefined ? updates.specialty : list[index].specialty,
          nationalId: updates.national_id !== undefined ? updates.national_id : list[index].nationalId,
          workingDaysHours: updates.working_days_hours !== undefined ? updates.working_days_hours : list[index].workingDaysHours,
          branchId: updates.branch_id !== undefined ? updates.branch_id : list[index].branchId,
          startDate: updates.start_date !== undefined ? updates.start_date : list[index].startDate,
          fixedSalary: updates.fixed_salary !== undefined ? updates.fixed_salary : list[index].fixedSalary,
          commissionType: updates.commission_type !== undefined ? updates.commission_type : list[index].commissionType,
          commissionValue: updates.commission_value !== undefined ? updates.commission_value : list[index].commissionValue,
        };

        list[index] = {
          ...list[index],
          ...jsonUpdates,
          services: updates.services !== undefined ? updates.services : list[index].services,
          name: updates.name !== undefined ? updates.name : list[index].name,
          rating: updates.rating !== undefined ? updates.rating : list[index].rating,
          more: updates.more_count !== undefined ? updates.more_count : list[index].more
        };
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(list, null, 2));
        return NextResponse.json(list[index]);
      }
    }
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  } catch (err) {
    console.error("JSON fallback update error:", err);
    return NextResponse.json({ error: 'Server error updating provider' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { error } = await supabaseServer
      .from('providers')
      .delete()
      .eq('id', id);

    if (!error) {
      return NextResponse.json({ success: true });
    } else {
      console.warn("Supabase providers delete error, falling back to JSON:", error);
    }
  } catch (dbErr) {
    console.error("Database providers delete error, falling back to JSON:", dbErr);
  }

  // Fallback delete from JSON
  try {
    if (fs.existsSync(JSON_FILE_PATH)) {
      const list = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
      const filtered = list.filter((p: any) => p.id !== id);
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(filtered, null, 2));
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error("JSON fallback delete error:", err);
  }
  return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
}
