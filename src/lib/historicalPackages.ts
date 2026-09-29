import { supabaseServer } from '@/lib/supabaseServer';
import { syncPreLaunchPulseUsage } from '@/lib/historicalInvoice';

/**
 * DEC-098: the packages attached to a historical (Add/Edit Previous Booking) booking — one shared writer for
 * POST and PATCH /api/reservations/previous so the two cannot drift again.
 *
 * The form sends `packages: [...]` (multi-package, 2026-09-29) and still the old single-package fields for the
 * first package; both shapes normalise to `HistoricalPackage[]` here. For every package:
 *  - `sessionPulsesUsed` = pulses used in THIS booking's session, `remainingAfter` = balance after it;
 *  - an existing `customerPackageId` must belong to the booking's patient and may appear only once;
 *  - a new package's price is never guessed (DEC-088 item 6): the caller passes the entered invoice value only
 *    when it can only mean this package's price, otherwise the row is created `price_pending`;
 *  - pulses packages keep exactly one `Pre-launch usage` row holding the pulses used before the system, i.e.
 *    everything used minus what live bookings already recorded (RISK-106), so the usage rows add up to
 *    `pulses_used` and nothing historical is ever recognised as revenue (DEC-088 item 10).
 */

export interface HistoricalPackageUsageItem {
  serviceId: number;
  serviceName?: string;
  qtyTotal: number;
  qtyUsed: number;
  qtyRemaining: number;
}

export interface HistoricalPackage {
  packageId: string | null;
  packageName: string | null;
  customerPackageId: string | null;
  /** Sent by the form for display/invoice maths. Never used as `price_paid`. */
  clientPrice: number;
  requestedType: 'pulses' | 'services' | null;
  requestedTotalPulses: number | null;
  requestedPulsesUsed: number | null;
  requestedPulsesRemaining: number | null;
  itemsUsage: HistoricalPackageUsageItem[];
  // Filled by resolveHistoricalPackages():
  record: any | null;
  existingCp: any | null;
  isPulses: boolean;
  totalPulses: number;
  sessionPulsesUsed: number;
  remainingAfter: number;
}

export interface HistoricalPackageOutcome {
  customerPackageId: string | null;
  created: boolean;
  updated: boolean;
  pricePending?: boolean;
  packageType: 'pulses' | 'services';
  totalPulses: number;
  error?: string;
  pulseUsageSyncError?: string;
}

const PRE_LAUNCH_USED_BY = 'Pre-launch usage';

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normaliseItems(raw: any): HistoricalPackageUsageItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it) => it && num(it.serviceId) !== null)
    .map((it) => ({
      serviceId: Number(it.serviceId),
      serviceName: it.serviceName || undefined,
      qtyTotal: Math.max(0, Number(it.qtyTotal ?? it.qty ?? 0) || 0),
      qtyUsed: Math.max(0, Number(it.qtyUsed ?? 0) || 0),
      qtyRemaining: Math.max(0, Number(it.qtyRemaining ?? 0) || 0),
    }));
}

function blank(): Pick<HistoricalPackage, 'record' | 'existingCp' | 'isPulses' | 'totalPulses' | 'sessionPulsesUsed' | 'remainingAfter'> {
  return { record: null, existingCp: null, isPulses: false, totalPulses: 0, sessionPulsesUsed: 0, remainingAfter: 0 };
}

/** `body.packages` when present, otherwise the legacy single-package fields. Pure. */
export function normalizeIncomingPackages(body: any): HistoricalPackage[] {
  if (Array.isArray(body?.packages) && body.packages.length > 0) {
    return body.packages.map((p: any) => ({
      packageId: p?.packageId ? String(p.packageId) : null,
      packageName: p?.packageName || p?.name || null,
      customerPackageId: p?.customerPackageId ? String(p.customerPackageId) : null,
      clientPrice: Math.max(0, Number(p?.price ?? 0) || 0),
      requestedType: p?.packageType === 'pulses' || p?.packageType === 'services' ? p.packageType : null,
      requestedTotalPulses: num(p?.totalPulses ?? p?.packagePulsesTotal),
      requestedPulsesUsed: num(p?.pulsesUsed ?? p?.packagePulsesUsed),
      requestedPulsesRemaining: num(p?.pulsesRemaining ?? p?.packagePulsesRemaining),
      itemsUsage: normaliseItems(p?.itemsUsage ?? p?.packageItemsUsage),
      ...blank(),
    }));
  }
  const cpId = body?.customerPackageId || body?.existingCustomerPackageId || null;
  if (!body?.packageId && !body?.packageName && !cpId) return [];
  const total = num(body?.packagePulsesTotal);
  return [{
    packageId: body?.packageId ? String(body.packageId) : null,
    packageName: body?.packageName || null,
    customerPackageId: cpId ? String(cpId) : null,
    clientPrice: Math.max(0, Number(body?.packagePrice ?? 0) || 0),
    requestedType: total !== null && total > 0 ? 'pulses' : null,
    requestedTotalPulses: total,
    requestedPulsesUsed: num(body?.packagePulsesUsed),
    requestedPulsesRemaining: num(body?.packagePulsesRemaining),
    itemsUsage: normaliseItems(body?.packageItemsUsage),
    ...blank(),
  }];
}

/**
 * Loads the catalog rows and the patient's existing customer_packages rows, and validates before anything is
 * written: no duplicate customerPackageId, every customerPackageId belongs to `customerId`, every new package
 * names a real catalog package. Pulse totals of an existing package come from the database, not the request.
 */
export async function resolveHistoricalPackages(
  pkgs: HistoricalPackage[],
  customerId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (pkgs.length === 0) return { ok: true };

  const cpIds = pkgs.map((p) => p.customerPackageId).filter((v): v is string => Boolean(v));
  if (new Set(cpIds).size !== cpIds.length) {
    return { ok: false, error: 'The same patient package is attached more than once.' };
  }

  const cpById = new Map<string, any>();
  if (cpIds.length > 0) {
    if (!customerId) return { ok: false, error: 'A new patient cannot have existing packages attached.' };
    const { data, error } = await supabaseServer
      .from('customer_packages')
      .select('id, customer_id, package_id, package_type, total_pulses, pulses_used, pulses_remaining, status')
      .in('id', cpIds);
    // 22P02 = a customerPackageId that is not a valid uuid: it cannot be this patient's package.
    if (error) return { ok: false, error: (error as any).code === '22P02' ? 'Patient package not found.' : `Could not load patient packages: ${error.message}` };
    for (const row of data || []) cpById.set(String(row.id), row);
    for (const id of cpIds) {
      const row = cpById.get(id);
      if (!row || String(row.customer_id) !== String(customerId)) {
        return { ok: false, error: 'A selected package does not belong to this patient.' };
      }
    }
  }

  const catalogIds = Array.from(new Set(
    pkgs.map((p) => p.packageId || cpById.get(p.customerPackageId || '')?.package_id).filter(Boolean).map(String)
  ));
  const recordById = new Map<string, any>();
  if (catalogIds.length > 0) {
    const { data, error } = await supabaseServer
      .from('packages')
      .select('id, name, name_ar, price, validity_days, package_type, total_pulses')
      .in('id', catalogIds);
    if (error) return { ok: false, error: `Could not load packages: ${error.message}` };
    for (const row of data || []) recordById.set(String(row.id), row);
  }

  for (const p of pkgs) {
    p.existingCp = p.customerPackageId ? cpById.get(p.customerPackageId) || null : null;
    const catalogId = p.packageId || (p.existingCp?.package_id ? String(p.existingCp.package_id) : null);
    p.record = catalogId ? recordById.get(String(catalogId)) || null : null;
    if (!p.existingCp && !p.record) {
      return { ok: false, error: 'A selected package does not exist in the catalog.' };
    }
    if (!p.packageId && catalogId) p.packageId = String(catalogId);
    if (!p.packageName) p.packageName = p.record?.name || p.record?.name_ar || 'Package';

    const dbTotal = Number(p.existingCp?.total_pulses || 0);
    const recordTotal = Number(p.record?.total_pulses || 0);
    p.isPulses =
      p.existingCp?.package_type === 'pulses' ||
      p.record?.package_type === 'pulses' ||
      dbTotal > 0 ||
      (p.requestedType === 'pulses' && ((p.requestedTotalPulses ?? 0) > 0 || recordTotal > 0));
    const total = Math.max(0, Math.floor(dbTotal > 0 ? dbTotal : (p.requestedTotalPulses ?? recordTotal) || 0));
    p.totalPulses = p.isPulses ? total : 0;
    const used = Math.max(0, Math.min(p.totalPulses, Math.floor(p.requestedPulsesUsed ?? 0)));
    p.sessionPulsesUsed = p.isPulses ? used : 0;
    p.remainingAfter = p.isPulses
      ? (p.requestedPulsesRemaining !== null
        ? Math.max(0, Math.min(p.totalPulses, Math.floor(p.requestedPulsesRemaining)))
        : Math.max(0, p.totalPulses - used))
      : 0;
  }
  return { ok: true };
}

/** ` Package: <name>. [Package Usage]: ...` for each package, the reception-note format the form parses back. */
export function historicalPackageNotes(pkgs: HistoricalPackage[]): string {
  return pkgs.map((p) => {
    let usage = '';
    if (p.isPulses && p.totalPulses > 0) {
      usage = ` [Package Usage]: ${p.sessionPulsesUsed.toLocaleString()} / ${p.totalPulses.toLocaleString()} pulses used (${p.remainingAfter.toLocaleString()} pulses remaining).`;
    } else if (p.itemsUsage.length > 0) {
      const parts = p.itemsUsage.map(
        (it) => `${it.serviceName || `Service #${it.serviceId}`}: ${it.qtyUsed}/${it.qtyTotal} used (${it.qtyRemaining} remaining)`
      );
      usage = ` [Package Usage]: ${parts.join('; ')}.`;
    }
    return ` Package: ${p.packageName}.${usage}`;
  }).join('');
}

/**
 * The entered invoice value is a new package's price only when it cannot mean anything else: exactly one package,
 * newly bought, and nothing else (no service, no product) on the booking. Otherwise the price is left pending for
 * staff to enter (DEC-088 item 6) — never the catalog price, never the price the form sent.
 */
export function enteredHistoricalPackagePrice(
  pkgs: HistoricalPackage[],
  booking: { hasService: boolean; hasProduct: boolean; invoiceValue: number }
): number | null {
  if (pkgs.length !== 1 || pkgs[0].customerPackageId) return null;
  if (booking.hasService || booking.hasProduct) return null;
  return booking.invoiceValue > 0 ? booking.invoiceValue : null;
}

/**
 * Pulses used before the system = everything used on the package minus what every other usage row (live
 * bookings, no-booking consumes) already carries.
 */
export async function syncHistoricalPulseUsage(p: HistoricalPackage, customerPackageId: string, purchasedAt: string) {
  const { data: rows, error } = await supabaseServer
    .from('package_pulse_usage')
    .select('id, reservation_id, used_by, quantity_used')
    .eq('customer_package_id', customerPackageId);
  if (error) return { status: 'failed' as const, error: error.message };
  const otherUsage = (rows || [])
    .filter((r: any) => !(r.reservation_id == null && r.used_by === PRE_LAUNCH_USED_BY))
    .reduce((s: number, r: any) => s + (Number(r.quantity_used) || 0), 0);
  const preLaunch = Math.max(0, p.totalPulses - p.remainingAfter - otherUsage);
  return syncPreLaunchPulseUsage({
    customerPackageId,
    quantityUsed: preLaunch,
    remainingAfter: p.remainingAfter,
    purchasedAt,
  });
}

/**
 * Updates the patient's existing package, or creates it. `mode: 'patch'` first looks for the row this same
 * historical booking created (same catalog package, `purchased_at` = booking date) so re-saving an edit never
 * creates a second package.
 */
export async function applyHistoricalPackage(input: {
  pkg: HistoricalPackage;
  customerId: string;
  bookingDate: string; // YYYY-MM-DD
  enteredPrice: number | null;
  mode: 'post' | 'patch';
}): Promise<HistoricalPackageOutcome> {
  const { pkg: p, customerId, bookingDate, enteredPrice, mode } = input;
  const purchasedAt = `${bookingDate.slice(0, 10)}T12:00:00Z`;
  const outcome: HistoricalPackageOutcome = {
    customerPackageId: null,
    created: false,
    updated: false,
    packageType: p.isPulses ? 'pulses' : 'services',
    totalPulses: p.totalPulses,
  };

  const servicesFullyUsed = p.itemsUsage.length > 0 && p.itemsUsage.every((it) => it.qtyRemaining <= 0);
  const status = p.isPulses
    ? (p.totalPulses > 0 && p.remainingAfter <= 0 ? 'fully_used' : 'active')
    : (servicesFullyUsed ? 'fully_used' : 'active');
  const pulseColumns = p.isPulses
    ? { pulses_used: p.totalPulses - p.remainingAfter, pulses_remaining: p.remainingAfter }
    : {};

  let targetId: string | null = p.customerPackageId;
  if (!targetId && mode === 'patch' && p.packageId) {
    const { data: found, error: findErr } = await supabaseServer
      .from('customer_packages')
      .select('id')
      .eq('customer_id', customerId)
      .eq('package_id', p.packageId)
      .eq('purchased_at', purchasedAt)
      .limit(1);
    if (findErr) return { ...outcome, error: `Could not look up the package: ${findErr.message}` };
    if (found && found[0]) targetId = String(found[0].id);
  }

  if (targetId) {
    const { error: updErr } = await supabaseServer
      .from('customer_packages')
      .update({ status, ...pulseColumns })
      .eq('id', targetId);
    if (updErr) return { ...outcome, customerPackageId: targetId, error: `Package update failed: ${updErr.message}` };
    outcome.customerPackageId = targetId;
    outcome.updated = true;

    for (const it of p.itemsUsage) {
      const { error: itemErr } = await supabaseServer
        .from('customer_package_items')
        .update({ qty_used: it.qtyUsed, qty_remaining: it.qtyRemaining })
        .eq('customer_package_id', targetId)
        .eq('service_id', it.serviceId);
      if (itemErr) outcome.error = `Package item update failed: ${itemErr.message}`;
    }
  } else {
    if (!p.packageId) return { ...outcome, error: 'Package has no catalog id.' };
    const validityDays = Number(p.record?.validity_days || 365);
    const expiresAt = new Date(`${bookingDate.slice(0, 10)}T12:00:00Z`);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + validityDays);
    const pricePending = enteredPrice === null;

    const { data: created, error: insErr } = await supabaseServer
      .from('customer_packages')
      .insert({
        customer_id: customerId,
        package_id: p.packageId,
        purchased_at: purchasedAt,
        expires_at: expiresAt.toISOString(),
        price_paid: pricePending ? 0 : enteredPrice,
        price_pending: pricePending,
        status,
        ...(p.isPulses ? { package_type: 'pulses', total_pulses: p.totalPulses, ...pulseColumns } : {}),
      })
      .select('id')
      .maybeSingle();
    if (insErr || !created?.id) {
      return { ...outcome, pricePending, error: `Package creation failed: ${insErr?.message || 'no row returned'}` };
    }
    outcome.customerPackageId = String(created.id);
    outcome.created = true;
    outcome.pricePending = pricePending;

    const { data: pkgItems, error: itemsErr } = await supabaseServer
      .from('package_items')
      .select('service_id, qty')
      .eq('package_id', p.packageId);
    if (itemsErr) outcome.error = `Could not load package items: ${itemsErr.message}`;
    if (pkgItems && pkgItems.length > 0) {
      const { error: itemInsErr } = await supabaseServer.from('customer_package_items').insert(
        pkgItems.map((item: any) => {
          const usage = p.itemsUsage.find((u) => u.serviceId === Number(item.service_id));
          const qtyTotal = Number(usage?.qtyTotal ?? item.qty);
          const qtyUsed = Number(usage?.qtyUsed ?? 0);
          return {
            customer_package_id: created.id,
            service_id: item.service_id,
            qty_total: qtyTotal,
            qty_used: qtyUsed,
            qty_remaining: Number(usage?.qtyRemaining ?? Math.max(0, qtyTotal - qtyUsed)),
          };
        })
      );
      if (itemInsErr) outcome.error = `Package items creation failed: ${itemInsErr.message}`;
    }
  }

  if (p.isPulses && outcome.customerPackageId) {
    const sync = await syncHistoricalPulseUsage(p, outcome.customerPackageId, purchasedAt);
    if (sync.status === 'failed') outcome.pulseUsageSyncError = sync.error;
  }
  return outcome;
}
