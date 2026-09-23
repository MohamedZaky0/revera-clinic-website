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
            id, customer_id, package_id, status, purchased_at, expires_at, price_paid,
            package_type, total_pulses, pulses_used, pulses_remaining,
            packages ( id, name, name_ar, package_type ),
            customer_package_items ( id, service_id, qty_total, qty_used, qty_remaining, services ( id, en, ar, name, price ) )
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
              supabaseServer.from('services').select('id, en, ar, name'),
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

    // 2. Also check customer_product_balances in case sessions were purchased as product balances
    try {
      const { data: prodBalances } = await supabaseServer
        .from('customer_product_balances')
        .select('*')
        .in('customer_id', customerIds);

      let pbList: any[] = prodBalances || [];
      if (pbList.length === 0) {
        const { data: psData } = await supabaseServer
          .from('page_settings')
          .select('value')
          .eq('key', 'customer_product_balances')
          .maybeSingle();
        if (psData?.value?.balances && Array.isArray(psData.value.balances)) {
          pbList = psData.value.balances.filter((b: any) =>
            customerIds.includes(b.customer_id) ||
            (customerId && b.customer_id === customerId) ||
            (lookupMobile && b.customer_mobile && b.customer_mobile.includes(lookupMobile.replace(/\D/g, '')))
          );
        }
      }

      if (pbList && pbList.length > 0) {
        // Exclude dedicated pulse purchases from synthetic packages (they belong to Type 2 Purchased Products)
        const activePb = pbList.filter((b: any) =>
          !b.is_pulse_product &&
          !b.product_name.toLowerCase().includes('pulse') &&
          (b.status?.toLowerCase() === 'active' || !b.status) &&
          Number(b.remaining_quantity || 0) > 0
        );

        if (activePb.length > 0) {
          const { data: allServices } = await supabaseServer.from('services').select('id, en, ar, name');

          for (const pb of activePb) {
            const matchedSvc = (allServices || []).find((s: any) => {
              const pName = (pb.product_name || '').toLowerCase();
              const sEn = (s.en || s.name || '').toLowerCase();
              const sAr = (s.ar || '').toLowerCase();
              return (sEn && pName.includes(sEn)) || (sAr && pName.includes(sAr)) || (sEn && sEn.includes(pName));
            });

            const syntheticPkg = {
              id: `pb-${pb.id}`,
              packageId: pb.product_id || pb.id,
              packageName: pb.product_name || 'Session Package',
              packageNameAr: null,
              status: 'active',
              purchasedAt: pb.created_at || new Date().toISOString(),
              expiresAt: null,
              pricePaid: Number(pb.total_amount || 0),
              includedPulses: null,
              usedPulses: 0,
              remainingPulses: null,
              pulseUsageHistory: [],
              items: [
                {
                  id: `pbi-${pb.id}`,
                  serviceId: matchedSvc ? Number(matchedSvc.id) : (pb.service_id ? Number(pb.service_id) : 0),
                  serviceName: matchedSvc ? (matchedSvc.en || matchedSvc.name) : pb.product_name,
                  serviceNameAr: matchedSvc ? matchedSvc.ar : null,
                  qtyTotal: Number(pb.purchased_quantity || 1),
                  qtyUsed: Number(pb.used_quantity || 0),
                  qtyRemaining: Number(pb.remaining_quantity || 1),
                }
              ]
            };

            if (!packages.some(p => p.id === syntheticPkg.id || p.packageName === syntheticPkg.packageName)) {
              packages.push(syntheticPkg);
            }
          }
        }
      }
    } catch (pbErr) {
      console.warn('Error reading customer product balances for packages:', pbErr);
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
