import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export interface PackagePulseUsageLog {
  id: string;
  quantity_used: number;
  used_at: string;
  used_by?: string;
  notes?: string;
  booking_id?: string;
  treatment_area?: string;
  remaining_after?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One batched read of package_pulse_usage for a set of customer package ids, grouped by
// customer_package_id. Keeps the old blob's usage_history field names via mapPulseUsageRow.
async function getPackagePulseUsageMap(customerPackageIds: string[]): Promise<Record<string, PackagePulseUsageLog[]>> {
  const ids = customerPackageIds.filter((id) => UUID_RE.test(String(id)));
  if (ids.length === 0) return {};
  const { data, error } = await supabaseServer
    .from('package_pulse_usage')
    .select('*')
    .in('customer_package_id', ids)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Error reading package_pulse_usage:', error);
    return {};
  }
  const map: Record<string, PackagePulseUsageLog[]> = {};
  for (const row of data || []) {
    (map[row.customer_package_id] ||= []).push(mapPulseUsageRow(row));
  }
  return map;
}

// Maps one package_pulse_usage row into the PackagePulseUsageLog shape callers already consume
// (field names unchanged from the old page_settings blob: booking_id, used_at, remaining_after).
function mapPulseUsageRow(row: any): PackagePulseUsageLog {
  return {
    id: String(row.id),
    quantity_used: Number(row.quantity_used || 0),
    used_at: row.created_at,
    used_by: row.used_by || undefined,
    notes: row.notes || undefined,
    booking_id: row.reservation_id || undefined,
    treatment_area: row.treatment_area || undefined,
    remaining_after: row.remaining_after !== null && row.remaining_after !== undefined ? Number(row.remaining_after) : undefined,
  };
}

async function getPackagePulseUsageHistory(customerPackageId: string): Promise<PackagePulseUsageLog[]> {
  const { data, error } = await supabaseServer
    .from('package_pulse_usage')
    .select('*')
    .eq('customer_package_id', customerPackageId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Error reading package_pulse_usage history:', error);
    return [];
  }
  return (data || []).map(mapPulseUsageRow);
}

// Lists everything a customer has bought under the packages feature (customer_packages +
// customer_package_items, joined for display names) — active, expired, and fully_used alike.
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customerId = searchParams.get('customer_id') || searchParams.get('customerId');
    const mobile = searchParams.get('mobile') || searchParams.get('phone');

    if (!customerId && !mobile) {
      return NextResponse.json({ error: 'customer_id or mobile is required.' }, { status: 400 });
    }

    const customerIds: string[] = [];
    let lookupMobile = mobile;

    // Handle synthetic customer IDs like "res-cust-01016302772"
    if (customerId) {
      if (UUID_REGEX.test(customerId)) {
        customerIds.push(customerId);
      } else {
        // Extract phone number from synthetic ID or raw phone string
        if (!lookupMobile) {
          lookupMobile = customerId.replace(/^res-cust-/, '');
        }
      }
    }

    // If customerId is a valid UUID, also look up their mobile/phone to find all alias customer accounts
    if (customerId && UUID_REGEX.test(customerId) && !lookupMobile) {
      try {
        const { data: cRow } = await supabaseServer
          .from('customers')
          .select('mobile, phone')
          .eq('id', customerId)
          .maybeSingle();
        if (cRow?.mobile || cRow?.phone) {
          lookupMobile = cRow.mobile || cRow.phone;
        }
      } catch (cErr) {
        console.warn('Error fetching customer phone for package lookup:', cErr);
      }
    }

    // Look up customer IDs matching the phone number for multi-account or phone-based matching
    if (lookupMobile) {
      const cleanDigits = lookupMobile.replace(/\D/g, '');
      const last9Digits = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;
      if (last9Digits) {
        try {
          const { data: matchedCusts } = await supabaseServer
            .from('customers')
            .select('id, mobile, phone')
            .or(`mobile.ilike.%${last9Digits}%,phone.ilike.%${last9Digits}%`);
          if (matchedCusts && matchedCusts.length > 0) {
            for (const c of matchedCusts) {
              if (c.id && UUID_REGEX.test(c.id) && !customerIds.includes(c.id)) {
                customerIds.push(c.id);
              }
            }
          }
        } catch (mErr) {
          console.warn('Error matching customer IDs by phone:', mErr);
        }
      }
    }

    const validCustomerIds = customerIds.filter((id) => UUID_REGEX.test(id));
    let packages: any[] = [];

    // 1. Fetch from native customer_packages table (only with valid UUIDs to avoid 22P02 error)
    if (validCustomerIds.length > 0) {
      try {
        const { data, error } = await supabaseServer
          .from('customer_packages')
          .select(`
            id, customer_id, package_id, status, purchased_at, expires_at, price_paid, price_pending,
            package_type, total_pulses, pulses_used, pulses_remaining,
            packages ( id, name, name_ar, package_type ),
            customer_package_items ( id, service_id, qty_total, qty_used, qty_remaining, services ( id, en, ar, price ) )
          `)
          .in('customer_id', validCustomerIds)
          .order('purchased_at', { ascending: false });

        if (!error && data && data.length > 0) {
          packages = data.map((row: any) => {
            // Nullish-aware: a real pulses_remaining of 0 must stay 0 — falling back to the
            // included total would resurrect a depleted package.
            const incPulses = Number(row.total_pulses ?? row.included_pulses ?? 0);
            const remPulses = row.pulses_remaining != null
              ? Number(row.pulses_remaining)
              : row.remaining_pulses != null ? Number(row.remaining_pulses) : incPulses;
            const usedPulses = Number(row.pulses_used ?? row.used_pulses ?? 0);
            const isPulses = Boolean(
              row.package_type === 'pulses' ||
              row.packages?.package_type === 'pulses' ||
              incPulses > 0 ||
              remPulses > 0 ||
              (row.customer_package_items || []).length === 0
            );

            return {
              id: row.id,
              packageId: row.package_id,
              packageName: row.packages?.name || row.packages?.name_ar || 'Package',
              packageNameAr: row.packages?.name_ar || null,
              packageType: isPulses ? 'pulses' : 'services',
              status: (row.status || 'active').toLowerCase(),
              purchasedAt: row.purchased_at,
              expiresAt: row.expires_at,
              pricePaid: row.price_paid !== null ? Number(row.price_paid) : 0,
pricePending: Boolean(row.price_pending),
              totalPulses: incPulses,
              includedPulses: incPulses,
              usedPulses: usedPulses,
              pulsesRemaining: remPulses,
              remainingPulses: remPulses,
              pulseUsageHistory: [] as PackagePulseUsageLog[],
              items: (row.customer_package_items || []).map((it: any) => ({
                id: it.id,
                serviceId: Number(it.service_id),
                serviceName: it.services?.en || it.services?.name || undefined,
                serviceNameAr: it.services?.ar || undefined,
                qtyTotal: Number(it.qty_total || 0),
                qtyUsed: Number(it.qty_used || 0),
                qtyRemaining: Number(it.qty_remaining !== undefined ? it.qty_remaining : (it.qty_total - it.qty_used)),
              })),
            };
          });
        } else if (error || !data || data.length === 0) {
          // Fallback direct multi-table query if joined PostgREST query failed
          const { data: rawCustPkgs } = await supabaseServer
            .from('customer_packages')
            .select('*')
            .in('customer_id', validCustomerIds)
            .order('purchased_at', { ascending: false });

          if (rawCustPkgs && rawCustPkgs.length > 0) {
            const pkgIds = rawCustPkgs.map((p: any) => p.id);
            const masterPkgIds = rawCustPkgs.map((p: any) => p.package_id).filter(Boolean);

            const [itemsRes, masterPkgsRes, servicesRes] = await Promise.all([
              supabaseServer.from('customer_package_items').select('*').in('customer_package_id', pkgIds),
              supabaseServer.from('packages').select('id, name, name_ar').in('id', masterPkgIds),
              supabaseServer.from('services').select('id, en, ar'),
            ]);

            const allItems = itemsRes.data || [];
            const allMasterPkgs = masterPkgsRes.data || [];
            const allServices = servicesRes.data || [];

            packages = rawCustPkgs.map((row: any) => {
              const master = allMasterPkgs.find((m: any) => String(m.id) === String(row.package_id));
              const rowItems = allItems.filter((it: any) => String(it.customer_package_id) === String(row.id));
              const incPulses = Number(row.total_pulses ?? row.included_pulses ?? 0);
              const remPulses = row.pulses_remaining != null
                ? Number(row.pulses_remaining)
                : row.remaining_pulses != null ? Number(row.remaining_pulses) : incPulses;
              const usedPulses = Number(row.pulses_used ?? row.used_pulses ?? 0);
              const isPulses = Boolean(
                row.package_type === 'pulses' ||
                (master as any)?.package_type === 'pulses' ||
                incPulses > 0 ||
                remPulses > 0 ||
                rowItems.length === 0
              );

              return {
                id: row.id,
                packageId: row.package_id,
                packageName: master?.name || master?.name_ar || 'Package',
                packageNameAr: master?.name_ar || null,
                packageType: isPulses ? 'pulses' : 'services',
                status: (row.status || 'active').toLowerCase(),
                purchasedAt: row.purchased_at,
                expiresAt: row.expires_at,
                pricePaid: row.price_paid !== null ? Number(row.price_paid) : 0,
pricePending: Boolean(row.price_pending),
                totalPulses: incPulses,
                includedPulses: incPulses,
                usedPulses: usedPulses,
                pulsesRemaining: remPulses,
                remainingPulses: remPulses,
                pulseUsageHistory: [] as PackagePulseUsageLog[],
                items: rowItems.map((it: any) => {
                  const svc = allServices.find((s: any) => Number(s.id) === Number(it.service_id));
                  return {
                    id: it.id,
                    serviceId: Number(it.service_id),
                    serviceName: svc?.en || svc?.name || undefined,
                    serviceNameAr: svc?.ar || undefined,
                    qtyTotal: Number(it.qty_total || 0),
                    qtyUsed: Number(it.qty_used || 0),
                    qtyRemaining: Number(it.qty_remaining !== undefined ? it.qty_remaining : (Number(it.qty_total || 0) - Number(it.qty_used || 0))),
                  };
                }),
              };
            });
          }
        }
      } catch (cpErr) {
        console.warn('Error reading customer_packages table:', cpErr);
      }
    }

    // Pulse usage history comes from package_pulse_usage in one batched query, covering both the
    // joined and the fallback branches above.
    if (packages.length > 0) {
      const usageMap = await getPackagePulseUsageMap(packages.map((p) => p.id));
      packages = packages.map((p) => ({ ...p, pulseUsageHistory: usageMap[p.id] || [] }));
    }

    return NextResponse.json({ packages });
  } catch (err: any) {
    console.error('GET /api/customers/packages error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

// PATCH: Deduct / Consume pulses or sessions from a customer package (Type 3 Engine)
export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const {
      action,
      customer_package_id,
      package_id,
      quantity_used,
      used_by,
      notes,
      booking_id,
      reservation_id,
      reservationId,
      treatment_area,
      included_pulses
    } = body;

    const pkgId = customer_package_id || package_id;
    if (!pkgId) {
      return NextResponse.json({ success: false, error: 'Customer Package ID is required.' }, { status: 400 });
    }

    const PKG_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // DEC-088 item 6: "Enter invoice value" for a historical package whose price was left pending. Sets the real
    // price and the pulses already used before launch, atomically (confirm_historical_package_price RPC).
    if (action === 'confirm_package_price') {
      const role = String(access.access.role || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (!(role.includes('super') || role.includes('admin') || role.includes('reception'))) {
        return NextResponse.json({ success: false, error: 'Only reception or admin can enter a package invoice value.' }, { status: 403 });
      }
      if (!PKG_UUID_RE.test(String(pkgId))) {
        return NextResponse.json({ success: false, error: 'Customer package not found.' }, { status: 400 });
      }
      const priceRaw = body.price_paid ?? body.pricePaid;
      const price = typeof priceRaw === 'number' ? priceRaw : (String(priceRaw ?? '').trim() === '' ? NaN : Number(priceRaw));
      const pulsesUsed = Number(body.pulses_used_before ?? body.pulsesUsedBefore ?? 0);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ success: false, error: 'Enter the invoice value paid for this package (zero or more).' }, { status: 400 });
      }
      if (!Number.isInteger(pulsesUsed) || pulsesUsed < 0) {
        return NextResponse.json({ success: false, error: 'Pulses already used must be a whole number, zero or more.' }, { status: 400 });
      }

      const { data: rpcData, error: rpcError } = await supabaseServer.rpc('confirm_historical_package_price', {
        p_customer_package_id: pkgId,
        p_price: price,
        p_pulses_used: pulsesUsed,
        p_employee_id: access.access.employee?.id ?? null,
      });
      if (rpcError) {
        const msg = String(rpcError.message || '');
        if (msg.includes('not found')) return NextResponse.json({ success: false, error: 'Customer package not found.' }, { status: 404 });
        if (msg.includes('already confirmed')) return NextResponse.json({ success: false, error: 'This package price was already confirmed.' }, { status: 409 });
        if (msg.includes('exceeds the remaining')) return NextResponse.json({ success: false, error: 'Pulses already used cannot be more than the package balance.' }, { status: 400 });
        if (msg.includes('services package')) return NextResponse.json({ success: false, error: 'Pulses do not apply to a services package.' }, { status: 400 });
        if (msg.includes('zero or more')) return NextResponse.json({ success: false, error: msg }, { status: 400 });
        console.error('confirm_historical_package_price RPC failed:', rpcError);
        return NextResponse.json({ success: false, error: msg || 'Could not save the package price.' }, { status: 500 });
      }
      const result: any = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      return NextResponse.json({
        success: true,
        alreadyConfirmed: Boolean(result?.already_confirmed),
        pricePaid: Number(result?.price_paid ?? price),
        pulsesUsed: Number(result?.pulses_used ?? 0),
        pulsesRemaining: Number(result?.pulses_remaining ?? 0),
        recognitionRows: Number(result?.recognition_rows ?? 0),
      });
    }

    // Set / Initialize Included Pulses on package — writes the real customer_packages columns
    if (action === 'set_included_pulses' || included_pulses !== undefined) {
      if (!PKG_UUID_RE.test(String(pkgId))) {
        return NextResponse.json({ success: false, error: 'Customer package not found.' }, { status: 400 });
      }
      const incPulses = Math.max(0, parseInt(String(included_pulses || 0), 10));
      const { data: curRow, error: curErr } = await supabaseServer
        .from('customer_packages')
        .select('id, pulses_used')
        .eq('id', pkgId)
        .maybeSingle();
      if (curErr) {
        console.error('set_included_pulses read failed:', curErr);
        return NextResponse.json({ success: false, error: curErr.message }, { status: 500 });
      }
      if (!curRow) {
        return NextResponse.json({ success: false, error: 'Customer package not found.' }, { status: 400 });
      }
      const usedPulses = Number((curRow as any).pulses_used || 0);
      const remainingPulses = Math.max(0, incPulses - usedPulses);
      const { error: updErr } = await supabaseServer
        .from('customer_packages')
        .update({ total_pulses: incPulses, pulses_remaining: remainingPulses })
        .eq('id', pkgId);
      if (updErr) {
        console.error('set_included_pulses update failed:', updErr);
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        packagePulses: {
          included_pulses: incPulses,
          used_pulses: usedPulses,
          remaining_pulses: remainingPulses,
          usage_history: []
        }
      });
    }

    // Deduct Package Pulses (Scenario 14, 15) — atomic RPC, see
    // supabase/migrations/20260922000000_package_pulse_balance_to_columns.sql
    if (action === 'consume_package_pulses' || action === 'deduct_pulses') {
      const qtyToDeduct = Math.max(0, parseInt(String(quantity_used || 0), 10));
      if (qtyToDeduct <= 0) {
        return NextResponse.json({ success: false, error: 'Quantity of pulses to consume must be greater than 0.' }, { status: 400 });
      }

      // Synthetic/non-UUID ids cannot be customer_packages rows — reject cleanly, never let a
      // 22P02 uuid cast error leak out of the RPC.
      if (!PKG_UUID_RE.test(String(pkgId))) {
        return NextResponse.json({ success: false, error: 'Customer package not found.' }, { status: 400 });
      }
      const rawReservationId = booking_id || reservation_id || reservationId;
      if (rawReservationId !== undefined && rawReservationId !== null && rawReservationId !== ''
          && !PKG_UUID_RE.test(String(rawReservationId))) {
        return NextResponse.json({ success: false, error: 'booking_id must be a reservation UUID.' }, { status: 400 });
      }
      const reservationUuid = rawReservationId ? String(rawReservationId) : null;

      const { data: rpcData, error: rpcError } = await supabaseServer.rpc('consume_package_pulses', {
        p_customer_package_id: pkgId,
        p_qty: qtyToDeduct,
        p_reservation_id: reservationUuid,
        p_used_by: used_by || (access.access.user as any)?.name || access.access.user?.email || 'Staff',
        p_treatment_area: treatment_area || null,
        p_notes: notes || null,
      });

      if (rpcError) {
        const msg = String(rpcError.message || '');
        const clientError =
          msg.includes('customer package not found') ? 'Customer package not found.' :
          msg.includes('has expired') ? 'Cannot consume pulses: This package has expired.' :
          msg.includes('quota is not configured') ? 'Package pulse quota is not configured.' :
          msg.includes('0 remaining pulses') ? 'Package has 0 remaining pulses.' :
          msg.includes('greater than 0') ? 'Quantity of pulses to consume must be greater than 0.' :
          null;
        if (clientError) {
          return NextResponse.json({ success: false, error: clientError }, { status: 400 });
        }
        console.error('consume_package_pulses RPC failed:', rpcError);
        return NextResponse.json({ success: false, error: msg || 'Pulse consumption failed.' }, { status: 500 });
      }

      const result: any = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      const remaining = Number(result?.remaining ?? 0);
      const packagePulses = {
        included_pulses: Number(result?.total_pulses ?? 0),
        used_pulses: Number(result?.used_total ?? 0),
        remaining_pulses: remaining,
        usage_history: await getPackagePulseUsageHistory(pkgId)
      };

      if (result?.already_deducted) {
        return NextResponse.json({
          success: true,
          alreadyDeducted: true,
          consumed: Number(result.consumed ?? 0),
          requested: Number(result.requested ?? qtyToDeduct),
          remainingPulses: remaining,
          packagePulses
        });
      }

      return NextResponse.json({
        success: true,
        consumed: Number(result?.consumed ?? 0),
        requested: Number(result?.requested ?? qtyToDeduct),
        remainingPulses: remaining,
        packagePulses
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: any) {
    console.error('PATCH /api/customers/packages error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
