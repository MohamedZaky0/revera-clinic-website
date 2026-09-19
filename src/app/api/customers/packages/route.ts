import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Lists everything a customer has bought under the packages feature (customer_packages +
// customer_package_items, joined for display names) — active, expired, and fully_used alike.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get('customer_id');
    const mobile = searchParams.get('mobile') || searchParams.get('phone');

    if (!customerId && !mobile) {
      return NextResponse.json({ error: 'customer_id or mobile is required.' }, { status: 400 });
    }

    const customerIds: string[] = [];
    if (customerId) customerIds.push(customerId);

    // If customerId is provided, also look up their mobile/phone to find all alias customer accounts
    let lookupMobile = mobile;
    if (customerId && !lookupMobile) {
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
              if (!customerIds.includes(c.id)) customerIds.push(c.id);
            }
          }
        } catch (mErr) {
          console.warn('Error matching customer IDs by phone:', mErr);
        }
      }
    }

    let packages: any[] = [];

    // 1. Fetch from native customer_packages table
    if (customerIds.length > 0) {
      try {
        const { data, error } = await supabaseServer
          .from('customer_packages')
          .select(`
            id, customer_id, package_id, status, purchased_at, expires_at, price_paid,
            packages ( id, name, name_ar ),
            customer_package_items ( id, service_id, qty_total, qty_used, qty_remaining, services ( id, en, ar, name, price ) )
          `)
          .in('customer_id', customerIds)
          .order('purchased_at', { ascending: false });

        if (!error && data && data.length > 0) {
          packages = data.map((row: any) => ({
            id: row.id,
            packageId: row.package_id,
            packageName: row.packages?.name || row.packages?.name_ar || 'Package',
            packageNameAr: row.packages?.name_ar || null,
            status: (row.status || 'active').toLowerCase(),
            purchasedAt: row.purchased_at,
            expiresAt: row.expires_at,
            pricePaid: row.price_paid !== null ? Number(row.price_paid) : 0,
            items: (row.customer_package_items || []).map((it: any) => ({
              id: it.id,
              serviceId: Number(it.service_id),
              serviceName: it.services?.en || it.services?.name || undefined,
              serviceNameAr: it.services?.ar || undefined,
              qtyTotal: Number(it.qty_total || 0),
              qtyUsed: Number(it.qty_used || 0),
              qtyRemaining: Number(it.qty_remaining !== undefined ? it.qty_remaining : (it.qty_total - it.qty_used)),
            })),
          }));
        } else if (error || !data || data.length === 0) {
          // Fallback direct multi-table query if joined PostgREST query failed
          const { data: rawCustPkgs } = await supabaseServer
            .from('customer_packages')
            .select('*')
            .in('customer_id', customerIds)
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

              return {
                id: row.id,
                packageId: row.package_id,
                packageName: master?.name || master?.name_ar || 'Package',
                packageNameAr: master?.name_ar || null,
                status: (row.status || 'active').toLowerCase(),
                purchasedAt: row.purchased_at,
                expiresAt: row.expires_at,
                pricePaid: row.price_paid !== null ? Number(row.price_paid) : 0,
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
            (lookupMobile && b.customer_mobile && b.customer_mobile.includes(lookupMobile.replace(/\D/g, '')))
          );
        }
      }

      if (pbList && pbList.length > 0) {
        const activePb = pbList.filter((b: any) =>
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
