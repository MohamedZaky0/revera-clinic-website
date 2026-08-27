import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';
import { normalizeServiceCommissions } from '@/lib/providerCommissions';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const JSON_FILE_PATH = path.join(process.cwd(), 'data', 'providers.json');

const DEFAULT_PROVIDERS: any[] = [];

async function findMatchingEmployeeId(name: string, phone?: string | null): Promise<string | null> {
  // employee_accounts.name has no unique constraint — refuse to guess when a name matches more
  // than one row rather than silently syncing to whichever one Postgres happens to return first
  // (same "leave it unresolved on ambiguity" policy as reservations.provider_id, see RISK-015).
  const { data: byName } = await supabaseServer
    .from('employee_accounts')
    .select('id')
    .ilike('name', name)
    .limit(2);
  if (byName && byName.length === 1) return byName[0].id;
  if (byName && byName.length > 1) {
    console.warn(`findMatchingEmployeeId: ambiguous name match for "${name}" (${byName.length} employee_accounts rows) — refusing to guess`);
  }

  if (phone) {
    const { data: byPhone } = await supabaseServer
      .from('employee_accounts')
      .select('id')
      .eq('phone', phone)
      .limit(2);
    if (byPhone && byPhone.length === 1) return byPhone[0].id;
    if (byPhone && byPhone.length > 1) {
      console.warn(`findMatchingEmployeeId: ambiguous phone match for "${phone}" (${byPhone.length} employee_accounts rows) — refusing to guess`);
    }
  }
  return null;
}

function mapProvider(p: Record<string, any>, bookingsCount: number = 0) {
  const wdh = (p.working_days_hours && typeof p.working_days_hours === 'object') ? p.working_days_hours : {};
  return {
    id: p.id,
    name: p.name,
    bookings: bookingsCount,
    services: p.services ?? [],
    more: p.more_count ?? 0,
    rating: Number(p.rating || 0),
    image: p.image || null,
    phone: p.phone || null,
    email: p.email || wdh.email || null,
    employmentType: p.employment_type || p.employmentType || wdh.employment_type || 'Full Time',
    languages: Array.isArray(p.languages) && p.languages.length > 0 ? p.languages : (Array.isArray(wdh.languages) && wdh.languages.length > 0 ? wdh.languages : ['Arabic', 'English']),
    sessionType: p.session_type || p.sessionType || wdh.session_type || 'in_clinic',
    active: p.active !== false,
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
    commissionBase: p.commission_base || 'gross',
    commissionFixedComponent: p.commission_fixed_component ? Number(p.commission_fixed_component) : 0,
    serviceCommissions: Array.isArray(p.service_commissions) ? p.service_commissions : [],
  };
}

 
export async function GET() {
  try {
    const [providersRes, reservationsRes, docEmployeesRes] = await Promise.all([
      supabaseServer
        .from('providers')
        .select('*')
        .order('name', { ascending: true }),
      supabaseServer
        .from('reservations')
        .select('doctor_name, status')
        .neq('status', 'rejected'),
      supabaseServer
        .from('employee_accounts')
        .select('*')
        .or('department.ilike.%doc%,role_name.ilike.%doc%')
    ]);

    const providersData = providersRes.data || [];

    // Auto-sync any Doctor employees missing from providers table
    if (docEmployeesRes.data && docEmployeesRes.data.length > 0) {
      for (const emp of docEmployeesRes.data) {
        const exists = providersData.some(
          (p: any) => (p.name && emp.name && p.name.trim().toLowerCase() === emp.name.trim().toLowerCase()) ||
                      (p.phone && emp.phone && p.phone === emp.phone)
        );
        if (!exists && emp.name) {
          const newProvPayload = {
            name: emp.name,
            phone: emp.phone || null,
            fixed_salary: emp.salary ? Number(emp.salary) : 0,
            branch_id: emp.branch_id || null,
            national_id: emp.national_id || null,
            services: [],
            rating: 5,
            bookings_count: 0,
            more_count: 0
          };
          try {
            const { data: created } = await supabaseServer.from('providers').insert(newProvPayload).select().single();
            if (created) {
              providersData.push(created);
            }
          } catch (e) {
            console.error("Failed auto-syncing missing doctor employee:", e);
          }
        }
      }
    }

    if (!providersRes.error && providersData.length > 0) {
      const counts = new Map<string, number>();
      (reservationsRes.data || []).forEach((r: any) => {
        if (r.doctor_name) {
          const nameKey = r.doctor_name.trim().toLowerCase();
          counts.set(nameKey, (counts.get(nameKey) || 0) + 1);
        }
      });

      const mapped = providersData.map((p: any) => {
        const key = p.name ? p.name.trim().toLowerCase() : "";
        const bookingsCount = counts.get(key) || 0;
        return mapProvider(p, bookingsCount);
      });
      return NextResponse.json(mapped);
    } else {
      if (providersRes.error) {
        console.warn("Supabase providers query error, falling back to JSON:", providersRes.error);
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
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { name, services, rating, more, image, phone, email, employmentType, employment_type, languages, sessionType, session_type, gender, age, specialty, nationalId, workingDaysHours, branchId, startDate, fixedSalary, commissionType, commissionValue, commissionBase, commissionFixedComponent, serviceCommissions } = body;
  
  let finalBranchId = branchId || null;
  if (workingDaysHours && typeof workingDaysHours === 'object') {
    const wdh = workingDaysHours as any;
    if (Array.isArray(wdh.branch_ids) && wdh.branch_ids.length > 0) {
      finalBranchId = wdh.branch_ids[0];
    }
  }

  // email/employment_type/languages/session_type have no columns on `providers` — stash them
  // inside working_days_hours JSONB instead (mapProvider() reads them back out of wdh). Mirrors
  // the same stashing PATCH already does below.
  const wdhWithExtras: Record<string, any> = (workingDaysHours && typeof workingDaysHours === 'object') ? { ...workingDaysHours } : {};
  if (email !== undefined) wdhWithExtras.email = email;
  if (employment_type !== undefined || employmentType !== undefined) wdhWithExtras.employment_type = employment_type || employmentType;
  if (languages !== undefined) wdhWithExtras.languages = languages;
  if (session_type !== undefined || sessionType !== undefined) wdhWithExtras.session_type = session_type || sessionType;

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
    working_days_hours: Object.keys(wdhWithExtras).length > 0 ? wdhWithExtras : null,
    branch_id: finalBranchId,
    start_date: startDate || null,
    fixed_salary: fixedSalary ? Number(fixedSalary) : 0,
    commission_type: commissionType || 'none',
    commission_value: commissionValue ? Number(commissionValue) : 0,
    commission_base: commissionBase || 'gross',
    commission_fixed_component: commissionFixedComponent ? Number(commissionFixedComponent) : 0,
    service_commissions: normalizeServiceCommissions(serviceCommissions),
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
      // Sync fixed_salary and related info to matching employee_accounts record
      if (data) {
        try {
          const docName = data.name;
          const docPhone = data.phone;
          if (docName) {
            const matchingEmpId = await findMatchingEmployeeId(docName, docPhone);
            if (matchingEmpId) {
              const empUpdates: Record<string, any> = {};
              if (fixedSalary !== undefined) empUpdates.salary = Number(fixedSalary || 0);
              if (phone !== undefined) empUpdates.phone = phone;
              if (nationalId !== undefined) empUpdates.national_id = nationalId;
              if (Object.keys(empUpdates).length > 0) {
                const { error: empErr } = await supabaseServer.from('employee_accounts').update(empUpdates).eq('id', matchingEmpId);
                if (empErr) console.error("Failed to sync provider insert to employee_accounts:", empErr);
              }
            }
          }
        } catch (syncErr) {
          console.error("Failed to sync provider insert to employee_accounts:", syncErr);
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
      commissionValue: commissionValue ? Number(commissionValue) : 0,
      serviceCommissions: normalizeServiceCommissions(serviceCommissions)
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
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { name, services, rating, more, image, phone, email, employmentType, employment_type, languages, sessionType, session_type, gender, age, specialty, nationalId, workingDaysHours, branchId, startDate, fixedSalary, commissionType, commissionValue, commissionBase, commissionFixedComponent, serviceCommissions, active } = body;

  let oldProvider: any = null;
  try {
    const { data } = await supabaseServer
      .from('providers')
      .select('name, phone, working_days_hours, branch_id')
      .eq('id', id)
      .maybeSingle();
    oldProvider = data;
  } catch (e) {
    console.warn("Could not fetch old provider for audit logging:", e);
  }

  // Base for the merge: when the caller sent a full `workingDaysHours`, that's an authoritative
  // replacement (base = {}). When they didn't (e.g. a status-only or extras-only PATCH), start
  // from what's already stored so we merge extras in instead of wiping branch_ids/branch_schedules.
  const wdhBase: Record<string, any> = (workingDaysHours !== undefined)
    ? {}
    : ((oldProvider?.working_days_hours && typeof oldProvider.working_days_hours === 'object') ? { ...oldProvider.working_days_hours } : {});
  const rawWdh: Record<string, any> = { ...wdhBase, ...((workingDaysHours && typeof workingDaysHours === 'object') ? workingDaysHours : {}) };
  if (email !== undefined) rawWdh.email = email;
  if (employment_type !== undefined || employmentType !== undefined) rawWdh.employment_type = employment_type || employmentType;
  if (languages !== undefined) rawWdh.languages = languages;
  if (session_type !== undefined || sessionType !== undefined) rawWdh.session_type = session_type || sessionType;

  const updates: Record<string, any> = {};
  if (active !== undefined) updates.active = Boolean(active);
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
  if (Object.keys(rawWdh).length > 0 || workingDaysHours !== undefined) {
    updates.working_days_hours = rawWdh;
    if (Array.isArray(rawWdh.branch_ids) && rawWdh.branch_ids.length > 0) {
      updates.branch_id = rawWdh.branch_ids[0];
    } else if (branchId !== undefined) {
      updates.branch_id = branchId;
    } else if (workingDaysHours !== undefined) {
      // Caller explicitly submitted a schedule with no branches assigned — clear it rather than
      // leaving the doctor pointing at a branch they were just removed from.
      updates.branch_id = null;
    }
  } else if (branchId !== undefined) {
    updates.branch_id = branchId;
  }
  if (startDate !== undefined) updates.start_date = startDate;
  if (fixedSalary !== undefined) updates.fixed_salary = Number(fixedSalary || 0);
  if (commissionType !== undefined) updates.commission_type = commissionType;
  if (commissionValue !== undefined) updates.commission_value = Number(commissionValue || 0);
  if (commissionBase !== undefined) updates.commission_base = commissionBase;
  if (commissionFixedComponent !== undefined) updates.commission_fixed_component = Number(commissionFixedComponent || 0);
  if (serviceCommissions !== undefined) updates.service_commissions = normalizeServiceCommissions(serviceCommissions);

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
    // `id` is mandatory (400 above) and providers has no unique constraint on `name`, so an
    // id-scoped update is the only safe write here — a by-name fallback would silently edit
    // every provider sharing that name if it ever matched more than one row.
    const { data, error } = await supabaseServer
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && !data) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

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
      // Sync fixed_salary and related info to matching employee_accounts record
      if (data) {
        try {
          const docName = data.name;
          const docPhone = data.phone;
          if (docName) {
            const matchingEmpId = await findMatchingEmployeeId(docName, docPhone);
            if (matchingEmpId) {
              // Not synced: `active` — employee_accounts has no such column, and nothing reads
              // it (not /api/employees, not src/lib/access.ts, not the auth routes). This field
              // is about booking eligibility (translations.ts), not login status.
              const empUpdates: Record<string, any> = {};
              if (fixedSalary !== undefined) empUpdates.salary = Number(fixedSalary || 0);
              if (phone !== undefined) empUpdates.phone = phone;
              if (nationalId !== undefined) empUpdates.national_id = nationalId;
              if (Object.keys(empUpdates).length > 0) {
                const { error: empErr } = await supabaseServer.from('employee_accounts').update(empUpdates).eq('id', matchingEmpId);
                if (empErr) console.error("Failed to sync provider update to employee_accounts:", empErr);
              }
            }
          }
        } catch (syncErr) {
          console.error("Failed to sync provider update to employee_accounts:", syncErr);
        }
      }
      return NextResponse.json(mapProvider(data));
    } else if (error) {
      console.error("Supabase providers update error, falling back to JSON:", error);
    }
  } catch (dbErr) {
    console.error("Database providers update error, falling back to JSON:", dbErr);
  }

  // Fallback to JSON file — only reached when the Supabase call itself threw (a connection
  // error), not for a normal "no matching row" case, which already returned 404 above.
  try {
    if (fs.existsSync(JSON_FILE_PATH)) {
      const list = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
      const index = list.findIndex((p: any) => p.id === id);
      if (index === -1) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }
      list[index] = {
        ...list[index],
        ...updates,
      };
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(list, null, 2));
      return NextResponse.json(mapProvider(list[index]));
    }
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  } catch (err) {
    console.error("JSON fallback update error:", err);
    return NextResponse.json({ error: 'Server error updating provider' }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
