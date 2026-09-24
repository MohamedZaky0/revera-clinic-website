import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { resolveLaserPulseRate } from '@/lib/laserRate';
import { POST as sellPackage } from '@/app/api/packages/sell/route';
import { POST as addReservationProduct } from '@/app/api/reservation-products/route';

export const dynamic = 'force-dynamic';

/**
 * Brief 35 / DEC-079: reception checkout is the ONLY place a laser-pulse deficit is resolved.
 * The doctor screen records delivered pulses and performs the clamped consume; if delivered
 * exceeds the package balance, this endpoint is how the excess is settled.
 *
 * GET  ?reservationId=X — preview: delivered pulses, source package, already-consumed amount,
 *                        deficit, resolved rate, marker/legacy-resolution state.
 * POST { reservationId, choice: 'BUY_NEW_PACKAGE' | 'PAY_PER_PULSE', packageId?,
 *        sourceCustomerPackageId?, paymentMethod?, amountPaid? } — resolve it.
 *
 * The client sends no amounts: delivered pulses, the remaining balance, the package price and
 * the per-pulse rate are all re-resolved server-side (money rule 6). Idempotent per reservation
 * via reservations.laser_deficit_resolution; the pulse consume itself is additionally idempotent
 * via package_pulse_usage's UNIQUE(customer_package_id, reservation_id) (Brief 34B).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESERVATION_SELECT =
  'id, customer_id, notes, delivered_pulses, laser_price_per_pulse, ' +
  'laser_deficit_resolution, laser_deficit_pulses';
// The marker columns only exist after 20260923000000 is applied; without them this route must
// still fail soft with a clear error rather than silently double-resolving.
const RESERVATION_SELECT_LEGACY = 'id, customer_id, notes, delivered_pulses, laser_price_per_pulse';

async function readReservation(reservationId: string) {
  const first = await supabaseServer
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('id', reservationId)
    .maybeSingle();
  if (first.error && /column .* does not exist|42703/i.test(String(first.error.message || first.error.code || ''))) {
    const second = await supabaseServer
      .from('reservations')
      .select(RESERVATION_SELECT_LEGACY)
      .eq('id', reservationId)
      .maybeSingle();
    return { reservation: second.data, error: second.error, markersUnavailable: true };
  }
  return { reservation: first.data, error: first.error, markersUnavailable: false };
}

function deliveredPulsesOf(reservation: any): number {
  const col = Number(reservation?.delivered_pulses);
  if (Number.isFinite(col) && col > 0) return col;
  const notes = String(reservation?.notes || '');
  const match =
    notes.match(/\[Laser Pulses Delivered\]:[^\n]*?Total:\s*(\d+)/i) ||
    notes.match(/Primary:\s*(\d+)\s*pulses/i) ||
    notes.match(/(\d+(?:,\d+)?)\s*pulses/i);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

// Legacy marker: bookings resolved before the marker columns existed recorded the resolution
// only as notes tags. A tag that explicitly mentions a deficit counts as resolved; a plain
// redemption tag does not.
function hasLegacyResolution(notes: unknown): boolean {
  const tags = String(notes || '').match(/\[(?:Laser Settlement|Laser Package Redemption|Laser Package Deficit Settlement)\]:[^\n]*/gi) || [];
  // The pre-marker doctor flow wrote 'deficit', 'excess', or 'exhausted' in these tags.
  return tags.some((t) => /deficit|excess|exhausted|عجز/i.test(t));
}

async function activePulsePackages(customerId: string) {
  const { data, error } = await supabaseServer
    .from('customer_packages')
    .select('id, package_id, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, status')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('purchased_at', { ascending: true });
  if (error) throw error;
  return (data || []).filter((p: any) => p.package_type === 'pulses' || Number(p.total_pulses || 0) > 0);
}

async function consumedForReservation(customerPackageId: string, reservationId: string): Promise<number> {
  const { data, error } = await supabaseServer
    .from('package_pulse_usage')
    .select('quantity_used')
    .eq('customer_package_id', customerPackageId)
    .eq('reservation_id', reservationId);
  if (error) throw error;
  return (data || []).reduce((sum: number, r: any) => sum + Number(r.quantity_used || 0), 0);
}

// The package that already has a package_pulse_usage row for this reservation — regardless of
// its current status. Needed because draining a package to 0 flips it to 'fully_used'
// (Brief 34B), which drops it out of activePulsePackages()'s 'active' filter. Without this, a
// retry after a failure downstream of the consume (RISK-097) sees no source package at all and
// silently reports "no active package, nothing to resolve" — confirmed live, 2026-09-24: a real
// 2,000-pulse deficit went unbilled on retry because the consume had already succeeded and the
// only package holding the answer had already flipped to fully_used.
async function packageAlreadyTouchedForReservation(customerId: string, reservationId: string) {
  const { data: usageRows, error: usageErr } = await supabaseServer
    .from('package_pulse_usage')
    .select('customer_package_id')
    .eq('reservation_id', reservationId);
  if (usageErr || !usageRows || usageRows.length === 0) return null;
  const packageIds = Array.from(new Set(usageRows.map((r: any) => r.customer_package_id)));
  const { data: pkgRows, error: pkgErr } = await supabaseServer
    .from('customer_packages')
    .select('id, package_id, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, status, customer_id')
    .in('id', packageIds);
  if (pkgErr || !pkgRows) return null;
  return pkgRows.find((p: any) => String(p.customer_id) === String(customerId)) || null;
}

async function clinicDefaultPulseRate(): Promise<number | null> {
  const { data, error } = await supabaseServer
    .from('page_settings')
    .select('value')
    .eq('key', 'home')
    .maybeSingle();
  if (error || !data?.value) return null;
  const rate = Number(data.value?.booking?.defaultPricePerPulse);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function isExpired(pkg: any): boolean {
  if (!pkg?.expires_at) return false;
  return new Date(pkg.expires_at).getTime() < Date.now();
}

// Shared by GET (preview) and POST (resolve). Never guesses a total.
async function computeDeficitState(reservation: any, sourceCustomerPackageId?: string) {
  const delivered = deliveredPulsesOf(reservation);
  const customerId = reservation?.customer_id ? String(reservation.customer_id) : null;
  const packages = customerId ? await activePulsePackages(customerId) : [];
  // A package already drained for this reservation is the authoritative source even if it has
  // since flipped to fully_used — it must never be silently dropped just because it is no
  // longer 'active'. Takes priority over the picked-by-balance fallbacks below.
  const touchedPkg = customerId ? await packageAlreadyTouchedForReservation(customerId, reservation.id) : null;
  const source =
    (touchedPkg && (!sourceCustomerPackageId || String(touchedPkg.id) === String(sourceCustomerPackageId)) ? touchedPkg : null) ||
    packages.find((p: any) => String(p.id) === String(sourceCustomerPackageId)) ||
    touchedPkg ||
    packages.find((p: any) => Number(p.pulses_remaining || 0) > 0) ||
    packages[0] ||
    null;
  if (!source) {
    return { delivered, source: null, packages, consumedForThisReservation: 0, remaining: 0, deficit: 0, reason: 'no_active_package' as const };
  }
  const consumed = await consumedForReservation(source.id, reservation.id);
  const remaining = Number(source.pulses_remaining || 0);
  // What the package can still cover for THIS reservation: what it already consumed for it,
  // plus whatever balance is left.
  const deficit = Math.max(0, delivered - consumed - remaining);
  const quotaMissing = Number(source.total_pulses || 0) <= 0;
  return {
    delivered, source, packages, consumedForThisReservation: consumed, remaining,
    deficit, quotaMissing, expired: isExpired(source),
    reason: null as null | 'no_active_package',
  };
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const reservationId = new URL(req.url).searchParams.get('reservationId') || '';
  if (!UUID_RE.test(reservationId)) {
    return NextResponse.json({ error: 'A valid reservationId is required.' }, { status: 400 });
  }

  const { reservation, error } = await readReservation(reservationId);
  if (error) return NextResponse.json({ error: 'Failed to load reservation.' }, { status: 500 });
  if (!reservation) return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });

  const resolved = Boolean((reservation as any).laser_deficit_resolution) || hasLegacyResolution(reservation.notes);
  const state = await computeDeficitState(reservation);
  const rate = resolveLaserPulseRate({
    reservationRate: (reservation as any).laser_price_per_pulse,
    clinicDefaultRate: await clinicDefaultPulseRate(),
    notes: reservation.notes,
  });

  return NextResponse.json({
    success: true,
    resolved,
    resolution: (reservation as any).laser_deficit_resolution || (resolved ? 'LEGACY' : null),
    deficitPulses: Number((reservation as any).laser_deficit_pulses) || state.deficit,
    deliveredPulses: state.delivered,
    remainingPulses: state.remaining,
    consumedForThisReservation: state.consumedForThisReservation,
    sourceCustomerPackageId: state.source?.id || null,
    quotaMissing: Boolean(state.quotaMissing),
    expired: Boolean(state.expired),
    noActivePackage: state.reason === 'no_active_package',
    resolvedRate: rate,
  });
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const reservationId = String(body.reservationId || body.reservation_id || '');
  if (!UUID_RE.test(reservationId)) {
    return NextResponse.json({ error: 'A valid reservationId is required.' }, { status: 400 });
  }

  const { reservation, error, markersUnavailable } = await readReservation(reservationId);
  if (error) return NextResponse.json({ error: 'Failed to load reservation.' }, { status: 500 });
  if (!reservation) return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });

  // Idempotency: the persisted marker wins; legacy notes tags are the fallback for bookings
  // resolved before the marker columns existed.
  if ((reservation as any).laser_deficit_resolution) {
    return NextResponse.json({
      success: true,
      alreadyResolved: true,
      resolution: (reservation as any).laser_deficit_resolution,
      deficitPulses: Number((reservation as any).laser_deficit_pulses) || 0,
    });
  }
  if (hasLegacyResolution(reservation.notes)) {
    return NextResponse.json({ success: true, alreadyResolved: true, resolution: 'LEGACY' });
  }

  const state = await computeDeficitState(reservation, body.sourceCustomerPackageId);
  if (state.reason === 'no_active_package') {
    // No active package = "initial purchase" case, not a deficit — deliberately out of scope.
    return NextResponse.json({ success: true, deficitPulses: 0, noActivePackage: true });
  }
  const source = state.source!;
  if (state.expired) {
    return NextResponse.json({ error: 'The source pulses package is expired.' }, { status: 400 });
  }
  if (state.quotaMissing) {
    return NextResponse.json(
      { error: 'Package pulse quota is not configured — set Total Pulses in Admin → Packages.' },
      { status: 400 }
    );
  }

  // Consume whatever the source package can still cover for this reservation. The doctor's
  // screen usually already ran this consume (clamped); the RPC replays it as already_deducted.
  let consumedNow = 0;
  if (state.remaining > 0 && state.delivered - state.consumedForThisReservation > 0) {
    const { data: rpcData, error: rpcError } = await supabaseServer.rpc('consume_package_pulses', {
      p_customer_package_id: source.id,
      p_qty: Math.max(0, state.delivered - state.consumedForThisReservation),
      p_reservation_id: reservationId,
      p_used_by: 'Reception Checkout',
      p_treatment_area: null,
      p_notes: 'Checkout pulse deduction (deficit resolution)',
    });
    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || 'Failed to consume package pulses.' },
        { status: 400 }
      );
    }
    consumedNow = Number(rpcData?.consumed || 0);
  }
  const deficit = Math.max(0, state.delivered - state.consumedForThisReservation - consumedNow);
  if (deficit <= 0) {
    return NextResponse.json({ success: true, deficitPulses: 0, consumed: consumedNow });
  }

  const choice = String(body.choice || '');
  if (!['BUY_NEW_PACKAGE', 'PAY_PER_PULSE'].includes(choice)) {
    return NextResponse.json(
      { error: 'choice must be BUY_NEW_PACKAGE or PAY_PER_PULSE.', deficitPulses: deficit },
      { status: 400 }
    );
  }

  const customerId = String((reservation as any).customer_id || '');
  let invoiceDelta = 0;
  let newCustomerPackageId: string | null = null;

  if (choice === 'PAY_PER_PULSE') {
    const rate = resolveLaserPulseRate({
      reservationRate: (reservation as any).laser_price_per_pulse,
      clinicDefaultRate: await clinicDefaultPulseRate(),
      notes: reservation.notes,
    });
    if (rate === null) {
      return NextResponse.json(
        { error: 'Per-pulse rate not configured — set it in Booking Settings.' },
        { status: 400 }
      );
    }
    invoiceDelta = deficit * rate;

    // Skip the line write if a previous call already wrote it but failed before the marker.
    const { data: existingLines } = await supabaseServer
      .from('reservation_products')
      .select('id')
      .eq('reservation_id', reservationId)
      .ilike('description', 'Excess Laser Pulses Deficit%');
    if (!existingLines || existingLines.length === 0) {
      const lineRes = await addReservationProduct(new Request('http://internal/api/reservation-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({
          reservationId,
          lineType: 'device_pulses',
          description: `Excess Laser Pulses Deficit (${deficit} pulses @ ${rate} EGP)`,
          qty: deficit,
          unitPrice: rate,
          // reservation_products.added_by_role CHECK only allows 'doctor_session' | 'receptionist'
          // (confirmed live, 2026-09-24: 'receptionist_checkout' violated the constraint and
          // aborted every PAY_PER_PULSE resolution with a 500).
          addedByRole: 'receptionist',
        }),
      }));
      if (!lineRes.ok) {
        const lineErr = await lineRes.json().catch(() => null);
        return NextResponse.json(
          { error: lineErr?.error || 'Failed to write the deficit invoice line.' },
          { status: 500 }
        );
      }
    }
  } else {
    // BUY_NEW_PACKAGE — reuse /api/packages/sell verbatim (re-resolves the price from the
    // packages row, writes invoices + invoice_lines + customer_packages + payments). The
    // receptionist's collected method/amount pass through; never a client-supplied price.
    const packageId = String(body.packageId || body.package_id || '');
    if (!packageId) {
      return NextResponse.json({ error: 'packageId is required for BUY_NEW_PACKAGE.' }, { status: 400 });
    }
    const sellRes = await sellPackage(new Request('http://internal/api/packages/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        customerId,
        packageId,
        paymentMethod: body.paymentMethod || 'cash',
        ...(body.amountPaid != null ? { amountPaid: body.amountPaid } : {}),
      }),
    }));
    const sellData = await sellRes.json().catch(() => null);
    if (!sellRes.ok) {
      return NextResponse.json(
        { error: sellData?.error || sellData?.message || 'Failed to sell the new package.' },
        { status: sellRes.status || 500 }
      );
    }
    newCustomerPackageId = sellData?.customerPackage?.id || null;
    if (!newCustomerPackageId) {
      return NextResponse.json(
        { error: 'The package sale returned no customer package.' },
        { status: 500 }
      );
    }
    invoiceDelta = Number(sellData?.total ?? sellData?.invoice?.total ?? 0) || 0;

    // The deficit comes out of the new package — same reservation key, different package id,
    // so the unique index still makes this replayable.
    const { data: deficitRpc, error: deficitErr } = await supabaseServer.rpc('consume_package_pulses', {
      p_customer_package_id: newCustomerPackageId,
      p_qty: deficit,
      p_reservation_id: reservationId,
      p_used_by: 'Reception Checkout',
      p_treatment_area: null,
      p_notes: `Deficit spillover deduction from new package (${deficit} pulses)`,
    });
    if (deficitErr || Number(deficitRpc?.consumed) < deficit) {
      return NextResponse.json(
        { error: `The new package was sold, but the ${deficit}-pulse deficit was not fully deducted — reconcile manually.` },
        { status: 500 }
      );
    }
  }

  // Persist the resolution marker — this is what makes a repeat call a no-op.
  if (markersUnavailable) {
    return NextResponse.json(
      { error: 'Resolution applied but the marker columns are missing — apply migration 20260923000000 before deploying. Do not retry; the resolution itself already succeeded.' },
      { status: 500 }
    );
  }
  const { error: markerError } = await supabaseServer
    .from('reservations')
    .update({ laser_deficit_resolution: choice, laser_deficit_pulses: deficit })
    .eq('id', reservationId);
  if (markerError) {
    return NextResponse.json(
      { error: `Resolution applied but the marker write failed (${markerError.message}). Do not retry — reconcile manually.` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    alreadyResolved: false,
    resolution: choice,
    deficitPulses: deficit,
    consumedFromSourcePackage: consumedNow,
    invoiceDelta,
    customerPackageId: newCustomerPackageId,
  });
}
