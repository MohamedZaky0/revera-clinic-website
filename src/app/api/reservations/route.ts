import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getServiceDurationMinutes, ALL_15MIN_SLOTS, normaliseTo24hSlot, getEffectiveServicePrice, getServicePriceDetails } from '@/lib/services';
import { computeSettledBalances } from '@/lib/billing';
import { requireAdministratorAccess, requireStaffAccess } from '@/lib/access';
import { buildInvoiceLine, buildInvoiceTotals, formatInvoiceNo } from '@/lib/ledger';
import { computeCommission, consumptionCost, costPerPulse } from '@/lib/costing';
import { deductInventoryStock } from '@/app/api/inventory/products/route';
import { incrementDevicePulses } from '@/app/api/inventory/devices/route';
import { normalizeEgyptMobile, isOwnIdentity } from '@/lib/customerIdentity';
import { recordWalletMovement } from '@/lib/wallet';
import { recordTransaction } from '@/lib/transactionLedger';
import { classifyCaller } from '@/app/api/customers/route';

/**
 * pg returns DATE columns as JavaScript Date objects set to UTC midnight.
 * toISOString().slice(0,10) on a UTC-midnight Date is always correct (no tz shift).
 * String() on a Date gives "Mon Jun 22 ..." which breaks everything — never use that.
 */
function fmtDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10); // already a YYYY-MM-DD string
}

/**
 * Shapes a raw reservation_products row (DEC-042) into the {id, name, qty, unitPrice, total,
 * addedBy} shape the three display sites in admin/page.tsx already check for first, before
 * falling back to regex-parsing `notes` (RISK-038, RISK-057). Matching that pre-existing shape
 * means the read side needs zero changes to those three call sites — they already prioritise
 * `attachedProducts` when it's an array.
 */
function mapReservationProduct(p: Record<string, any>) {
  return {
    id: p.id,
    name: p.description,
    qty: Number(p.qty) || 1,
    unitPrice: Number(p.unit_price) || 0,
    total: Number(p.total) || 0,
    addedBy: p.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist',
    lineType: p.line_type || (p.service_id ? 'additional_service' : 'product'),
    serviceId: p.service_id ?? null,
  };
}

function mapRow(r: Record<string, any>, attachedProducts?: Array<Record<string, any>>) {
  const serviceIds = Array.isArray(r.service_ids) ? r.service_ids : [];
  if (serviceIds.length === 0 && r.service_id) {
    serviceIds.push(r.service_id);
  }
  return {
    id: r.id,
    serviceId: r.service_id,
    serviceIds: serviceIds,
    date: fmtDate(r.date),
    requestedTime: r.requested_time,
    name: r.name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    doctorNotes: r.doctor_notes ?? null,
    receptionNotes: r.reception_notes ?? null,
    status: r.status,
    timeSlot: r.time_slot,
    sessionType: r.session_type,
    createdAt: r.created_at,
    isManual: r.is_manual ?? false,
    branchId: r.branch_id ?? null,
    customerId: r.customer_id ?? null,
    amountPaid: r.amount_paid ?? 0,
    amountLeft: r.amount_left ?? null,
    roomId: r.room_id ?? null,
    rooms: r.rooms || [],
    createdByEmployeeId: r.created_by_employee_id ?? null,
    services: r.services || null,
    doctorName: r.doctor_name ?? null,
    providerId: r.provider_id ?? null,
    followUpDate: r.follow_up_date ?? null,
    startedAt: r.started_at ?? null,
    actualDurationMinutes: r.actual_duration_minutes ?? null,
    attachedProducts: attachedProducts ? attachedProducts.map(mapReservationProduct) : undefined,
  };
}

/**
 * Resolve a doctor's display name to a providers.id.
 *
 * doctor_name stays on the reservation as a denormalised snapshot — it is what was recorded
 * at the time, and an invoice should not change because a provider row was later edited.
 * provider_id is the durable link: attributing doctor cost by lowercased string match
 * (src/app/api/hr/doctor-payroll/route.ts) silently detaches all history on any rename,
 * typo or title prefix. See RISK-015.
 *
 * Returns null when the name matches no provider, or more than one — a wrong link
 * misattributes cost silently, so an ambiguous name is left unlinked rather than guessed.
 */
async function resolveProviderId(doctorName?: string | null): Promise<string | null> {
  const name = (doctorName || '').trim();
  if (!name) return null;

  const { data, error } = await supabaseServer
    .from('providers')
    .select('id, name')
    .ilike('name', name);

  if (error) {
    console.error('Provider lookup failed for doctor_name:', name, error.message);
    return null;
  }
  if (!data || data.length !== 1) {
    if (data && data.length > 1) {
      console.warn('Ambiguous doctor_name matched multiple providers, left unlinked:', name);
    }
    return null;
  }
  return data[0].id;
}

/**
 * PROPOSAL-002 Phase 1, task 1.10. Dual-write: additive only. Called from the checkout
 * settlement block after reservations.amount_paid / customers.spent_amount have already been
 * written exactly as they were before this task — nothing existing is removed or changed.
 * A failure here must never fail the checkout itself; the caller wraps this in its own
 * try/catch and only logs. See ai_docs/FINANCE_TRACKER.md task 1.10 for why: a checkout that
 * silently breaks because ledger-writing broke would be a worse regression than the one this
 * phase is fixing.
 *
 * Prices are re-resolved server-side from serviceIds — never trust a client-supplied total for
 * what gets stored (RISK-010). This mirrors the POST handler's own branch-price resolution
 * above, since src/lib/services.ts's resolveBranchName() is not exported and a UUID branch_id
 * cannot be used directly as a branch name (see task 0.2/0.3).
 */
async function applyCheckoutCosting(params: {
  reservationId: string;
  providerId: string | null;
  serviceIds: number[];
  invoiceLines: Array<{ id: string; service_id: number | null; line_total: number }>;
  consumptionOverrides?: Record<string, Record<string, number>>;
}): Promise<void> {
  const { reservationId, providerId, serviceIds, invoiceLines, consumptionOverrides = {} } = params;
  if (serviceIds.length === 0) return;

  const [recipesResult, devicesResult, providerResult] = await Promise.all([
    supabaseServer.from('service_consumables').select('service_id, product_id, standard_qty').in('service_id', serviceIds),
    supabaseServer.from('service_devices').select('service_id, pulses_per_session, device_id').in('service_id', serviceIds),
    providerId
      ? supabaseServer.from('providers').select('commission_type, commission_value, commission_fixed_component, commission_base, service_commissions').eq('id', providerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (recipesResult.error) throw recipesResult.error;
  if (devicesResult.error) throw devicesResult.error;
  if (providerResult.error) throw providerResult.error;

  const productIds = Array.from(new Set((recipesResult.data || []).map((recipe: any) => recipe.product_id)));
  const deviceIds = Array.from(new Set((devicesResult.data || []).map((device: any) => device.device_id)));
  const [productsResult, inventoryDevicesResult] = await Promise.all([
    productIds.length > 0
      ? supabaseServer.from('inventory_products').select('id, cost_price, role').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    deviceIds.length > 0
      ? supabaseServer.from('inventory_devices').select('id, lamp_replacement_cost, max_pulses_limit').in('id', deviceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (inventoryDevicesResult.error) throw inventoryDevicesResult.error;

  type CostingProduct = { id: string; cost_price: number | null; role: string };
  type CostingDevice = { id: string; lamp_replacement_cost: number | null; max_pulses_limit: number | null };
  type ConsumptionDraft = { productId: string; qty: number; unitCostSnapshot: number; wasEdited: boolean };
  const products = new Map<string, CostingProduct>(
    ((productsResult.data || []) as CostingProduct[]).map((product) => [product.id, product])
  );
  const devices = new Map<string, CostingDevice>(
    ((inventoryDevicesResult.data || []) as CostingDevice[]).map((device) => [device.id, device])
  );

  // Each line is costed independently and failures are isolated per line — a bad
  // service_devices rating (e.g. max_pulses_limit still at its 0 default) or a recipe pointing at
  // a still-retail-only product must not silently zero out cogs_snapshot/commission_snapshot for
  // every other, correctly-configured line on the same invoice. The whole booking's costing being
  // best-effort (writeCheckoutInvoice's caller) is a separate, coarser safety net for total
  // failure (e.g. the DB being unreachable) — it must not also be the mechanism that turns one
  // line's bad data into every line's missing data.
  for (const invoiceLine of invoiceLines) {
    if (!invoiceLine.service_id) continue;
    try {
      const recipes = (recipesResult.data || []).filter((recipe: any) => Number(recipe.service_id) === Number(invoiceLine.service_id));
      const entries: ConsumptionDraft[] = recipes.map((recipe: any): ConsumptionDraft => {
        const product = products.get(recipe.product_id);
        if (!product || !['consumable', 'both'].includes(product.role)) {
          throw new Error(`Recipe product ${recipe.product_id} must have role consumable or both.`);
        }
        const override = consumptionOverrides[String(invoiceLine.service_id)]?.[recipe.product_id];
        const qty = override === undefined ? Number(recipe.standard_qty) : Number(override);
        if (!Number.isFinite(qty) || qty < 0) throw new Error(`Invalid consumed quantity for product ${recipe.product_id}.`);
        return {
          productId: recipe.product_id,
          qty,
          unitCostSnapshot: Number(product.cost_price || 0),
          wasEdited: override !== undefined && qty !== Number(recipe.standard_qty),
        };
      });

      const { data: insertedEntries, error: entriesError } = entries.length > 0
        ? await supabaseServer.from('consumption_entries').insert(entries.map((entry: ConsumptionDraft) => ({
            reservation_id: reservationId,
            product_id: entry.productId,
            qty: entry.qty,
            unit_cost_snapshot: entry.unitCostSnapshot,
            was_edited: entry.wasEdited,
          }))).select('id, product_id, qty, unit_cost_snapshot')
        : { data: [], error: null };
      if (entriesError) throw entriesError;

      const stockRows = (insertedEntries || []).filter((entry: any) => Number(entry.qty) > 0).map((entry: any) => ({
        product_id: entry.product_id,
        direction: 'out',
        qty: entry.qty,
        unit_cost: entry.unit_cost_snapshot,
        reason: 'consumption',
        ref_id: entry.id,
      }));
      if (stockRows.length > 0) {
        const { error: stockError } = await supabaseServer.from('stock_movements').insert(stockRows);
        if (stockError) throw stockError;

        // stock_movements is a ledger, not what inventory_products.stock_quantity actually reads
        // from (task 2.12 — no read path has cut over yet). Without this, a service consuming
        // materials at checkout would log the consumption but never actually reduce the number
        // shown in Products Catalog — the same gap task 3B.10 found and fixed on the purchases
        // (restock) side. Sequential, not Promise.all, for the same reason restockInventoryProduct
        // is: it's a read-modify-write of the whole catalog, so two rows for the same product in
        // this line would race.
        for (const row of stockRows) {
          await deductInventoryStock(row.product_id, Number(row.qty));
        }
      }

      const materialCost = consumptionCost(entries.map(({ qty, unitCostSnapshot }: ConsumptionDraft) => ({ qty, unitCostSnapshot })));
      const serviceDevicesForLine = (devicesResult.data || [])
        .filter((device: any) => Number(device.service_id) === Number(invoiceLine.service_id));
      const deviceCost = serviceDevicesForLine
        .reduce((total: number, serviceDevice: any) => {
          const device = devices.get(serviceDevice.device_id);
          if (!device) throw new Error(`Service device ${serviceDevice.device_id} was not found.`);
          return total + costPerPulse(Number(device.lamp_replacement_cost || 0), Number(device.max_pulses_limit)) * Number(serviceDevice.pulses_per_session);
        }, 0);
      const cogsSnapshot = Math.round((materialCost + deviceCost + Number.EPSILON) * 100) / 100;

      // Charging the session for pulse-based device cost without ever advancing the device's own
      // pulse counter meant a device could sail past its rated maintenance limit while the admin's
      // tracker still showed it as new (RISK-027). Sequential for the same read-modify-write
      // reason as the stock deductions above.
      for (const serviceDevice of serviceDevicesForLine) {
        await incrementDevicePulses(serviceDevice.device_id, Number(serviceDevice.pulses_per_session));
      }
      const provider = providerResult.data as any;
      const commissionBase = provider?.commission_base === 'net_of_materials'
        ? Math.max(0, Number(invoiceLine.line_total) - cogsSnapshot)
        : Number(invoiceLine.line_total);

      const serviceCommission = provider && Array.isArray(provider.service_commissions)
        ? provider.service_commissions.find((sc: any) => sc.serviceId && Number(sc.serviceId) === Number(invoiceLine.service_id))
        : null;

      const effectiveCommissionType = serviceCommission?.type || provider?.commission_type || 'none';
      const effectiveCommissionValue = serviceCommission
        ? Number(serviceCommission.value || 0)
        : Number(provider?.commission_value || 0);
      const commissionSnapshot = provider && effectiveCommissionType !== 'none'
        ? computeCommission(commissionBase, effectiveCommissionType as any, effectiveCommissionValue, Number(provider.commission_fixed_component || 0))
        : 0;

      const { error: updateError } = await supabaseServer.from('invoice_lines')
        .update({ cogs_snapshot: cogsSnapshot, commission_snapshot: commissionSnapshot })
        .eq('id', invoiceLine.id);
      if (updateError) throw updateError;
    } catch (lineError) {
      console.error(
        `Failed to cost invoice line ${invoiceLine.id} (service ${invoiceLine.service_id}) — leaving cogs_snapshot/commission_snapshot NULL for this line only:`,
        lineError,
        '| reservation:', reservationId
      );
    }
  }
}

async function writeCheckoutInvoice(params: {
  reservationId: string;
  customerId: string | null;
  branchId: string | null;
  providerId: string | null;
  serviceIds: number[];
  amountPaid: number;
  consumptionOverrides?: Record<string, Record<string, number>>;
  receivedByEmployeeId?: string | null;
  redeemedServiceIds?: number[];
}): Promise<void> {
  const {
    reservationId, customerId, branchId, providerId, serviceIds, amountPaid, consumptionOverrides,
    receivedByEmployeeId, redeemedServiceIds,
  } = params;
  if (serviceIds.length === 0) return;
  const redeemedSet = new Set((redeemedServiceIds || []).map(Number));

  let targetBranchName: string | null = null;
  if (branchId) {
    const { data: bObj, error: branchErr } = await supabaseServer
      .from('branches')
      .select('name_en, name_ar')
      .eq('id', branchId)
      .maybeSingle();
    if (branchErr) {
      console.error('Invoice branch lookup failed:', branchErr.message);
    } else if (bObj) {
      targetBranchName = bObj.name_en || bObj.name_ar || null;
    }
  }

  const { data: services, error: svcErr } = await supabaseServer
    .from('services')
    .select('id, en, price, branch_pricing')
    .in('id', serviceIds);
  if (svcErr) throw svcErr;
  if (!services || services.length === 0) return;

  const lines = services.map((svc: any) => {
    const priceDetails = getServicePriceDetails(
      { price: svc.price !== null ? Number(svc.price) : 0, branchPricing: svc.branch_pricing },
      targetBranchName
    );
    // A service already paid for via a package must not also be invoiced at full price here —
    // that revenue is recognised separately, per session delivered, by /api/packages/consume
    // (task 1.13, DEC-023). Charging both was RISK-035: the patient's existing package entitlement
    // already covers this visit, so the line is written at its list price with a full discount
    // (line_total 0) rather than silently omitted, keeping the visit on the invoice for the audit
    // trail without billing it again or creating a phantom receivable.
    const isRedeemed = redeemedSet.has(Number(svc.id));
    return buildInvoiceLine({
      lineType: 'service',
      description: (svc.en || `Service #${svc.id}`) + (isRedeemed ? ' (package redemption)' : ''),
      qty: 1,
      unitPrice: priceDetails.basePrice,
      discount: isRedeemed ? priceDetails.basePrice : priceDetails.basePrice - priceDetails.discountedPrice,
      serviceId: svc.id,
      providerId: providerId ?? undefined,
    });
  });

  // DEC-042: fold in products/additional-services/device-pulses added to this reservation (doctor
  // session or reception drawer) that haven't been invoiced yet. This is the fix for the gap
  // RISK-038/RISK-057 traced back to writeCheckoutInvoice: it used to build lines from serviceIds
  // alone, so this revenue reached reservations.amount_paid/amount_left but never a real
  // invoice_lines row. cogs_snapshot/commission_snapshot deliberately left unset (NULL) — these
  // don't run through applyCheckoutCosting's service_consumables/service_devices recipe lookup,
  // matching invoice_lines' own "not yet costed" convention rather than pretending otherwise.
  const { data: pendingReservationProducts, error: rpErr } = await supabaseServer
    .from('reservation_products')
    .select('id, line_type, service_id, description, qty, unit_price')
    .eq('reservation_id', reservationId)
    .is('invoiced_at', null);
  if (rpErr) {
    console.error('Failed to fetch pending reservation_products for invoice (non-fatal, service lines still write):', rpErr.message, '| reservation:', reservationId);
  }
  const addonLines = (pendingReservationProducts || []).map((p: any) =>
    buildInvoiceLine({
      lineType: 'product',
      description: p.description,
      qty: Number(p.qty) || 1,
      unitPrice: Number(p.unit_price) || 0,
      serviceId: p.line_type === 'additional_service' ? (p.service_id ?? undefined) : undefined,
      providerId: providerId ?? undefined,
    })
  );

  const allLines = [...lines, ...addonLines];
  const totals = buildInvoiceTotals(allLines);

  // Atomic — public.next_invoice_no() wraps nextval(invoice_no_seq) server-side
  // (20260726010600_create_next_invoice_no_rpc.sql). PostgREST has no generic way to call the
  // built-in nextval() directly, and reading "last invoice_no + 1" client-side would race
  // under concurrent checkouts and violate invoices.invoice_no's UNIQUE constraint.
  const { data: seqValue, error: seqErr } = await supabaseServer.rpc('next_invoice_no');
  if (seqErr) throw seqErr;
  const invoiceNo = formatInvoiceNo(Number(seqValue));

  const { data: invoice, error: invoiceErr } = await supabaseServer
    .from('invoices')
    .insert({
      invoice_no: invoiceNo,
      reservation_id: reservationId,
      customer_id: customerId,
      branch_id: branchId,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      grand_total: totals.grandTotal,
      status: 'issued',
    })
    .select('id')
    .single();
  if (invoiceErr) throw invoiceErr;

  const { data: invoiceLines, error: linesErr } = await supabaseServer.from('invoice_lines').insert(
    allLines.map((line: ReturnType<typeof buildInvoiceLine>) => ({ ...line, invoice_id: invoice.id }))
  ).select('id, service_id, line_total');
  if (linesErr) throw linesErr;

  if (pendingReservationProducts && pendingReservationProducts.length > 0) {
    const { error: markInvoicedErr } = await supabaseServer
      .from('reservation_products')
      .update({ invoiced_at: new Date().toISOString() })
      .in('id', pendingReservationProducts.map((p: any) => p.id));
    if (markInvoicedErr) {
      console.error('Failed to mark reservation_products as invoiced (non-fatal, invoice already written):', markInvoicedErr.message, '| reservation:', reservationId);
    }
  }

  try {
    await applyCheckoutCosting({
      reservationId,
      providerId,
      serviceIds,
      invoiceLines: invoiceLines || [],
      consumptionOverrides,
    });
  } catch (costingError) {
    console.error('Failed to write Phase 2 checkout costing (non-fatal):', costingError, '| reservation:', reservationId);
  }

  if (amountPaid > 0) {
    const { error: paymentErr } = await supabaseServer.from('payments').insert({
      invoice_id: invoice.id,
      amount: amountPaid,
      method: 'cash',
      received_by_employee_id: receivedByEmployeeId || null,
    });
    if (paymentErr) throw paymentErr;
  }

  // Customer-facing financial history (RISK-076). Two rows describe the visit: what the patient
  // was charged, and what they actually handed over — the gap between them is the receivable.
  // Reached only on first completion (a re-fired checkout returns before writing this invoice),
  // so these do not duplicate. Non-fatal by design — see recordTransaction.
  if (totals.grandTotal > 0) {
    await recordTransaction({
      type: 'service_charge',
      amount: totals.grandTotal,
      description: `Invoice ${invoiceNo} — services rendered`,
      customerId,
      branchId,
      invoiceId: invoice.id,
      reservationId,
      paymentMethod: 'none',
      createdByEmployeeId: receivedByEmployeeId || null,
    });
  }
  if (amountPaid > 0) {
    await recordTransaction({
      type: 'payment',
      amount: amountPaid,
      description: `Payment received for invoice ${invoiceNo}`,
      customerId,
      branchId,
      invoiceId: invoice.id,
      reservationId,
      createdByEmployeeId: receivedByEmployeeId || null,
    });
  }
}

/**
 * A later payment against a booking that was already completed (paying down outstanding debt —
 * task 0.5's settlement math supports this, but no admin UI triggers it yet, per
 * ai_docs/FINANCE_TRACKER.md RISK-012). Adds one more `payments` row to the invoice this
 * reservation already has, rather than creating a second invoice with duplicate service lines.
 * If no invoice exists yet for this reservation (e.g. it was completed before task 1.10 shipped),
 * this is a silent no-op — there is nothing to attach the payment to, and creating a bare invoice
 * with no line items would misrepresent what was actually sold.
 */
async function appendPaymentToExistingInvoice(
  reservationId: string,
  amount: number,
  receivedByEmployeeId?: string | null
): Promise<void> {
  if (amount <= 0) return;

  const { data: invoice, error: findErr } = await supabaseServer
    .from('invoices')
    .select('id, invoice_no, customer_id, branch_id')
    .eq('reservation_id', reservationId)
    .eq('status', 'issued')
    .maybeSingle();
  if (findErr) throw findErr;
  if (!invoice) return;

  const { error: paymentErr } = await supabaseServer.from('payments').insert({
    invoice_id: invoice.id,
    amount,
    method: 'cash',
    received_by_employee_id: receivedByEmployeeId || null,
  });
  if (paymentErr) throw paymentErr;

  // A payment against an already-completed booking is a patient settling what they still owed,
  // so it lands in their history as an outstanding_payment rather than an ordinary payment
  // (RISK-076). Callers only reach here with a real positive delta, so this does not duplicate.
  await recordTransaction({
    type: 'outstanding_payment',
    amount,
    description: `Balance settlement for invoice ${invoice.invoice_no || ''}`.trim(),
    customerId: invoice.customer_id,
    branchId: invoice.branch_id,
    invoiceId: invoice.id,
    reservationId,
    createdByEmployeeId: receivedByEmployeeId || null,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const status = params.get('status');
  const serviceId = params.get('serviceId');
  const date = params.get('date');
  const branchId = params.get('branchId');
  const phone = params.get('phone');
  const customerId = params.get('customerId');
  const createdByEmployeeId = params.get('createdByEmployeeId');

  // This route has the same two caller populations as /api/customers: staff (unrestricted) and
  // patients reading their own booking history (profile/page.tsx). Unlike /api/customers, there
  // was never a caller check here at all — any unauthenticated request got every reservation in
  // the database, full name/email/phone/notes included, and profile/page.tsx's own
  // `?phone=<mine>` call proved it: the server trusted the query param, never the caller's actual
  // session. Found during a full-system review, 2026-08-17.
  const caller = await classifyCaller(req);
  if (caller.kind === 'unauthenticated') {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }
  if (caller.kind === 'patient') {
    if (!phone && !customerId) {
      // The unfiltered/staff-scale queries below (createdByEmployeeId, branch+date sweeps with no
      // patient filter) must never run for a patient caller.
      return NextResponse.json({ error: 'Staff access is required.' }, { status: 403 });
    }
    if (phone) {
      const ownMobile = normalizeEgyptMobile(caller.user.phone);
      if (!ownMobile || normalizeEgyptMobile(phone) !== ownMobile) {
        return NextResponse.json([]);
      }
    }
    if (customerId) {
      const { data: cust } = await supabaseServer
        .from('customers')
        .select('mobile, email, auth_user_id')
        .eq('id', customerId)
        .maybeSingle();
      if (!isOwnIdentity(caller.user, cust)) {
        return NextResponse.json([]);
      }
    }
  }

  try {
    let q = supabaseServer
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      if (status === 'pending') {
        q = q.in('status', ['pending', 'pending_deposit']);
      } else {
        q = q.eq('status', status);
      }
    }
    if (serviceId) q = q.eq('service_id', Number(serviceId));
    if (date) q = q.eq('date', date);
    if (phone) q = q.eq('phone', phone);
    if (customerId) q = q.eq('customer_id', customerId);
    if (createdByEmployeeId) q = q.eq('created_by_employee_id', createdByEmployeeId);
    // Include bookings that match this branch OR have no branch set (website bookings without branch)
    if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);

    const [resResult, servicesResult] = await Promise.all([
      q,
      supabaseServer.from('services').select('id, price')
    ]);

    if (resResult.error) throw resResult.error;
    if (servicesResult.error) {
      console.warn("Could not fetch services for reservations mapping:", servicesResult.error.message);
    }

    // DEC-042: batch-fetch reservation_products for every reservation on this page in one query
    // (not per-row) and group client-side, same pattern as servicesMap below — avoids an N+1
    // query when this route returns many rows (e.g. the whole Bookings list).
    const reservationIds = (resResult.data || []).map((r: any) => r.id);
    const attachedProductsByReservation = new Map<string, Array<Record<string, any>>>();
    if (reservationIds.length > 0) {
      const { data: rpRows, error: rpError } = await supabaseServer
        .from('reservation_products')
        .select('*')
        .in('reservation_id', reservationIds);
      if (rpError) {
        console.warn("Could not fetch reservation_products for reservations mapping:", rpError.message);
      } else {
        for (const p of rpRows || []) {
          const list = attachedProductsByReservation.get(p.reservation_id) || [];
          list.push(p);
          attachedProductsByReservation.set(p.reservation_id, list);
        }
      }
    }

    const servicesMap = new Map((servicesResult.data || []).map((s: any) => [s.id, s.price]));
    const mappedRows = (resResult.data || []).map((r: any) => ({
      ...r,
      services: r.service_id ? { price: servicesMap.get(r.service_id) || 0 } : null
    }));

    return NextResponse.json(
      mappedRows.map((r: any) => mapRow(r, attachedProductsByReservation.get(r.id) || []))
    );
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

function isPastDateTime(dateStr: string, timeStr: string): boolean {
  if (!dateStr || !timeStr) return false;
  try {
    const nowCairo = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const todayStr = `${nowCairo.getFullYear()}-${String(nowCairo.getMonth() + 1).padStart(2, "0")}-${String(nowCairo.getDate()).padStart(2, "0")}`;

    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    // Same day: compare hours & minutes
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return false;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const curHours = nowCairo.getHours();
    const curMinutes = nowCairo.getMinutes();

    if (hours < curHours) return true;
    if (hours === curHours && minutes <= curMinutes) return true;
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, date, requestedTime, name, email, phone, notes, sessionType, branchId, doctorName, createdByEmployeeId, customerId: explicitCustomerId } = body;

    if (!serviceId || !date || !name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Reject past dates / times
    if (requestedTime && isPastDateTime(date, requestedTime)) {
      return NextResponse.json(
        { error: 'The requested appointment time has already passed. Please choose an upcoming time slot.' },
        { status: 400 }
      );
    }

    // 2. Reject a booking on a day the clinic (branch) is marked closed.
    try {
      let serviceHoursForBranch: any[] = [];
      if (branchId) {
        const { data: bData } = await supabaseServer
          .from('branches')
          .select('service_hours')
          .eq('id', branchId)
          .maybeSingle();
        if (bData && Array.isArray(bData.service_hours) && bData.service_hours.length > 0) {
          serviceHoursForBranch = bData.service_hours;
        }
      }
      if (serviceHoursForBranch.length === 0) {
        const { data: pageSet } = await supabaseServer
          .from('page_settings')
          .select('value')
          .eq('key', 'home')
          .maybeSingle();
        serviceHoursForBranch = pageSet?.value?.footer?.serviceHours || [];
      }
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekdayName = weekdays[new Date(date).getDay()];
      const clinicDay = serviceHoursForBranch.find((sh: any) => sh.day?.toLowerCase() === weekdayName.toLowerCase());
      if (clinicDay && clinicDay.isOpen === false) {
        return NextResponse.json(
          { error: `The clinic is closed on ${weekdayName}s. Please choose another available date.` },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error('Could not validate clinic hours for requested date:', e);
    }

    // 3. Reject double booking on the same time slot for that doctor
    if (requestedTime && body.doctorId) {
      try {
        const { data: existingSlots } = await supabaseServer
          .from('reservations')
          .select('id, time_slot, requested_time')
          .eq('date', date)
          .eq('provider_id', body.doctorId)
          .neq('status', 'cancelled')
          .neq('status', 'rejected');

        if (existingSlots && existingSlots.length > 0) {
          const normReq = requestedTime.trim().toUpperCase();
          const hasConflict = existingSlots.some((s: any) => {
            const t = (s.time_slot || s.requested_time || '').trim().toUpperCase();
            return t === normReq;
          });
          if (hasConflict) {
            return NextResponse.json(
              { error: 'This time slot is already booked for the selected doctor. Please choose another available slot.' },
              { status: 400 }
            );
          }
        }
      } catch (e) {
        console.error('Error checking double booking conflict:', e);
      }
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const { data: employeeCheck, error: empCheckError } = await supabaseServer
        .from('employee_accounts')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (empCheckError) throw empCheckError;
      if (employeeCheck) {
        return NextResponse.json(
          { error: 'This email belongs to an administrator/employee account and cannot be used to book appointments.' },
          { status: 400 }
        );
      }
    }

    // 1. Lookup or create customer profile
    // Phone is the identity anchor for matching an existing customer — normalized the same way
    // isOwnIdentity() already does (trim + +20/20 prefix), so a stray trailing space or a
    // "+20"-prefixed number doesn't silently create a duplicate customer distinct from the one
    // an existing phone number resolves to (found via a live bug: a booking with an untrimmed
    // phone got its own new customer row instead of matching the existing one a package had
    // already been sold to, so the package never showed as redeemable for that booking).
    const normalizedPhone = normalizeEgyptMobile(phone) || phone;
    let customerId: string | null = null;
    try {
      // Staff explicitly picked an existing patient (search picker, or an already-resolved phone
      // match carried over from the form) — use that exact id directly rather than re-deriving
      // one from the phone string. Falls through to the phone-lookup path below only if the id
      // doesn't actually resolve to a real customer (e.g. stale/tampered client state).
      const { data: explicitCustomer } = explicitCustomerId
        ? await supabaseServer.from('customers').select('id, number_of_bookings, name, email').eq('id', explicitCustomerId).maybeSingle()
        : { data: null };

      const { data: customer, error: customerError } = explicitCustomer
        ? { data: explicitCustomer, error: null }
        : await supabaseServer
            .from('customers')
            .select('id, number_of_bookings, name, email')
            .eq('mobile', normalizedPhone)
            .maybeSingle();

      if (customerError) {
        console.error('Customer lookup error:', customerError);
      }

      if (customer) {
        customerId = customer.id;
        const newBookings = (customer.number_of_bookings || 0) + 1;
        // Phone is the identity anchor here (same fallback isOwnIdentity() uses), but until now
        // only number_of_bookings refreshed on a repeat booking — name/email stayed frozen at
        // whatever the *first* booking under this phone number entered. A patient rebooking under
        // a corrected name (or a different family member using the same phone) would silently
        // never see it reflected on the customer record, making them impossible to find by name
        // in the admin's Customers list even though their booking clearly shows the new name.
        await supabaseServer
          .from('customers')
          .update({
            number_of_bookings: newBookings,
            name: name || customer.name,
            email: email || customer.email,
          })
          .eq('id', customerId);
      } else {
        const { data: newCustomer, error: createError } = await supabaseServer
          .from('customers')
          .insert({
            name,
            mobile: normalizedPhone,
            email: email || null,
            registration_date: new Date().toISOString(),
            active: true,
            spent_amount: 0,
            outstanding: 0,
            number_of_bookings: 1,
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Customer creation error:', createError);
        } else if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    } catch (custErr) {
      console.error('Customer integration error:', custErr);
    }

    // Fetch compatible rooms for this service
    let compRoomIds: string[] = [];
    try {
      const { data: sRooms } = await supabaseServer
        .from('service_rooms')
        .select('room_id')
        .eq('service_id', Number(serviceId));
      if (sRooms && sRooms.length > 0) {
        compRoomIds = sRooms.map((sr: any) => sr.room_id);
      }
    } catch (e) {
      console.warn("Could not load service compatible rooms:", e);
    }

    // Fetch service details for price calculation
    let servicePrice = 0;
    try {
      const { data: svc } = await supabaseServer
        .from('services')
        .select('price, branch_pricing')
        .eq('id', Number(serviceId))
        .maybeSingle();
      if (svc) {
        let targetBranchName: string | null = null;
        if (branchId) {
          // Two bugs lived here, and together they meant branch pricing was never applied
          // server-side (RISK-011): the filter was `.eq('id', Number(branchId))` against a
          // uuid column, which is always NaN, and it selected a `name` column that does not
          // exist — branches has name_en / name_ar. The query error was discarded, which is
          // why it stayed invisible.
          const { data: bObj, error: branchErr } = await supabaseServer
            .from('branches')
            .select('name_en, name_ar')
            .eq('id', branchId)
            .maybeSingle();

          if (branchErr) {
            console.error('Branch lookup for pricing failed:', branchErr.message);
          } else if (bObj) {
            targetBranchName = bObj.name_en || bObj.name_ar || null;
          } else {
            console.warn('No branch found for pricing lookup:', branchId);
          }
        }

        const mappedService = {
          price: svc.price !== null ? Number(svc.price) : 0,
          branchPricing: svc.branch_pricing
        };

        servicePrice = getEffectiveServicePrice(mappedService, targetBranchName);
      }
    } catch (e) {
      console.error("Could not fetch service details for price calculation:", e);
    }

    // Fetch deposit settings
    let depositPercentage = 20; // Default 20%
    try {
      const { data: pageSet } = await supabaseServer
        .from('page_settings')
        .select('value')
        .eq('key', 'home')
        .maybeSingle();
      if (pageSet && pageSet.value?.booking?.depositPercentage !== undefined) {
        depositPercentage = Number(pageSet.value.booking.depositPercentage);
      }
    } catch (e) {
      console.error("Could not fetch deposit percentage settings:", e);
    }

    const isManualBooking = body.isManual ?? false;
    let initialStatus = 'pending';
    let initialAmountPaid = body.amountPaid !== undefined ? Number(body.amountPaid) : 0;
    let initialAmountLeft = body.amountLeft !== undefined ? (body.amountLeft !== null ? Number(body.amountLeft) : null) : servicePrice;

    if (!isManualBooking && depositPercentage > 0) {
      initialStatus = 'pending_deposit';
      initialAmountPaid = 0;
      initialAmountLeft = servicePrice;
    }

    // 2. Insert reservation linked to customer
    const insertPayload: any = {
      service_id: Number(serviceId),
      date,
      requested_time: requestedTime || null,
      name,
      email,
      phone,
      notes: notes || '',
      status: initialStatus,
      time_slot: null,
      session_type: sessionType || 'in_person',
      branch_id: branchId || null,
      customer_id: customerId,
      amount_paid: initialAmountPaid,
      amount_left: initialAmountLeft,
      doctor_name: doctorName || null,
      provider_id: await resolveProviderId(doctorName),
      is_manual: isManualBooking,
      rooms: compRoomIds,
      created_by_employee_id: createdByEmployeeId || null,
    };

    // No fallback retries here — deliberately. This used to retry a failed insert after
    // deleting is_manual and created_by_employee_id, then again after also deleting rooms
    // and doctor_name, and it silently rewrote status 'pending_deposit' to 'pending' before
    // reporting success. On a database missing any of those columns that produced a booking
    // with no employee attribution, no doctor, no rooms and no deposit requirement, while
    // the response still told the UI a deposit was due. It is why the schema drift in
    // RISK-020 stayed invisible for weeks. Schema errors must surface. See RISK-020 and
    // ai_docs/FINANCE_TRACKER.md task 0.0.
    const { data, error } = await supabaseServer
      .from('reservations')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error(
        'Reservation insert failed:', error.code, error.message,
        '| payload keys:', Object.keys(insertPayload).join(', ')
      );
      throw error;
    }
    const mapped = mapRow(data);
    const requiresDeposit = !isManualBooking && depositPercentage > 0;
    return NextResponse.json({
      ...mapped,
      requiresDeposit,
      status: requiresDeposit ? 'pending_deposit' : mapped.status,
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const rawUrlId = url.searchParams.get('id');

  try {
    const body = await req.json();
    const { action, timeSlot, status, doctorName, notes, doctorNotes, receptionNotes, sessionType, amountPaid, amountLeft, serviceId, serviceIds, walletDeposit, walletWithdrawal, createdByEmployeeId, consumptionOverrides, redeemedServiceIds, date: newDate, followUpDate, customerId: explicitCustomerId } = body;

    const id = (rawUrlId && rawUrlId !== 'undefined' && rawUrlId !== 'null') ? rawUrlId : (body.id || body.booking_id || body.reservation_id);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: target, error: findError } = await supabaseServer
      .from('reservations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError || !target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Three narrow, unauthenticated-patient shapes, all scoped to a reservation still in
    // 'pending_deposit' — before staff have touched it, the public BookingModal caller is not
    // logged in as staff (or at all) and has no other way to report a deposit, cancel a booking
    // they're abandoning at the payment step, or correct details before paying. Once a booking
    // leaves 'pending_deposit' none of these match and requireStaffAccess takes over as before.
    const noAction = !action;
    const isPendingDeposit = target.status === 'pending_deposit';

    const depositReportFields = new Set(['status', 'amountPaid', 'amountLeft', 'notes']);
    const isPatientDepositSelfReport =
      noAction &&
      isPendingDeposit &&
      status === 'pending' &&
      typeof amountPaid === 'number' &&
      typeof amountLeft === 'number' &&
      Object.keys(body).every((field) => depositReportFields.has(field));

    // BookingModal's "Cancel & Return" — abandoning payment on a reservation it just created.
    const isPatientSelfCancel =
      noAction &&
      isPendingDeposit &&
      status === 'cancelled' &&
      Object.keys(body).every((field) => field === 'status');

    // BookingModal re-submitting step 2 after Back — updates the same reservation instead of
    // creating a duplicate (RISK-040). No `status` field in this shape; a status change is never
    // part of it.
    const selfUpdateFields = new Set([
      'serviceId', 'date', 'requestedTime', 'name', 'email', 'phone', 'notes',
      'sessionType', 'branchId', 'doctorName',
    ]);
    const isPatientSelfUpdate =
      noAction &&
      isPendingDeposit &&
      status === undefined &&
      Object.keys(body).every((field) => selfUpdateFields.has(field));

    const isPatientSelfService = isPatientDepositSelfReport || isPatientSelfCancel || isPatientSelfUpdate;

    if (!isPatientSelfService) {
      const access = await requireStaffAccess(req);
      if ('error' in access) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
    }

    if (target.status === 'started' && (action === 'reject' || action === 'cancel' || action === 'no_show' || status === 'cancelled' || status === 'rejected')) {
      return NextResponse.json({ error: 'Cannot cancel a booking that has already started.' }, { status: 400 });
    }

    if (action === 'approve') {
      if (!timeSlot) return NextResponse.json({ error: 'Missing timeSlot' }, { status: 400 });

      // Staff can change the date at approval time (e.g. the requested date turned out to be a
      // closed day, or is simply already fully booked) — reuses the same `date` field the
      // `postpone` action already accepts, rather than adding a second, separate parameter.
      const approveTargetDate = newDate || target.date;

      let chosenRoomId: string | null = null;
      let serviceCompRoomIds: string[] = [];

      if (target.session_type !== 'online') {
        // Get all active, available clinical rooms in this branch
        let roomsQuery = supabaseServer
          .from('rooms')
          .select('id, name')
          .eq('type', 'clinical')
          .eq('status', 'available');

        if (target.branch_id) {
          roomsQuery = roomsQuery.eq('branch_id', target.branch_id);
        }

        const { data: rawBranchRooms, error: roomsError } = await roomsQuery;
        if (roomsError) throw roomsError;

        let branchRooms = rawBranchRooms || [];
        if (branchRooms.length === 0) {
          // Fallback: If no clinical rooms exist, construct a default virtual clinical room so bookings are not blocked
          branchRooms = [{ id: '00000000-0000-0000-0000-000000000000', name: 'Virtual Clinical Room', branch_id: target.branch_id }];
        }

        // Find compatible rooms for the service
        const { data: mappedRooms, error: mappingError } = await supabaseServer
          .from('service_rooms')
          .select('room_id')
          .eq('service_id', target.service_id);

        if (mappingError) throw mappingError;

        const mappedRoomIds = mappedRooms ? mappedRooms.map((mr: any) => mr.room_id) : [];
        let serviceCompRooms = branchRooms.filter((r: any) => mappedRoomIds.includes(r.id));

        if (serviceCompRooms.length === 0) {
          // Fallback: If service is not mapped to any specific clinical rooms, allow booking in any clinical room of the branch
          serviceCompRooms = branchRooms;
        }

        // Fetch target service duration
        const { data: targetSvc, error: svcError } = await supabaseServer
          .from('services')
          .select('duration, duration_minutes')
          .eq('id', target.service_id)
          .single();

        if (svcError) throw svcError;

        const targetDuration = getServiceDurationMinutes(targetSvc);
        const targetSlotsCount = Math.ceil(targetDuration / 15);

        const normSlot = normaliseTo24hSlot(timeSlot);
        if (!normSlot) return NextResponse.json({ error: 'Invalid time slot format' }, { status: 400 });

        const startIdx = ALL_15MIN_SLOTS.indexOf(normSlot);
        if (startIdx === -1) return NextResponse.json({ error: 'Invalid time slot value' }, { status: 400 });

        // Fetch all approved bookings for this date
        const { data: dayBookings, error: bookingsError } = await supabaseServer
          .from('reservations')
          .select('id, room_id, time_slot, service_id')
          .eq('date', approveTargetDate)
          .eq('status', 'approved')
          .not('room_id', 'is', null);

        if (bookingsError) throw bookingsError;

        // Fetch all service durations to calculate overlap
        const { data: allSvcs, error: allSvcsError } = await supabaseServer
          .from('services')
          .select('id, duration, duration_minutes');

        if (allSvcsError) throw allSvcsError;

        const durationMap = new Map<number, number>();
        if (allSvcs) {
          allSvcs.forEach((s: any) => {
            durationMap.set(s.id, getServiceDurationMinutes(s));
          });
        }

        // Determine which rooms are available (not occupied)
        const availableRooms: { id: string; name: string }[] = [];

        for (const room of serviceCompRooms) {
          let roomOccupied = false;
          const roomBookings = dayBookings ? dayBookings.filter((b: any) => b.room_id === room.id) : [];

          for (const rb of roomBookings) {
            const rbNorm = normaliseTo24hSlot(rb.time_slot);
            if (!rbNorm) continue;
            const rbStartIdx = ALL_15MIN_SLOTS.indexOf(rbNorm);
            if (rbStartIdx === -1) continue;

            const rbDuration = durationMap.get(rb.service_id) ?? 30;
            const rbSlotsCount = Math.ceil(rbDuration / 15);

            // Overlap condition:
            if (rbStartIdx < startIdx + targetSlotsCount && startIdx < rbStartIdx + rbSlotsCount) {
              roomOccupied = true;
              break;
            }
          }

          if (!roomOccupied) {
            availableRooms.push(room);
          }
        }

        let chosenRoom: any = null;

        if (body.roomId) {
          chosenRoom = branchRooms.find((r: any) => String(r.id) === String(body.roomId));
        }

        if (!chosenRoom) {
          if (availableRooms.length > 0) {
            chosenRoom = availableRooms[0];
          } else if (body.isManual) {
            chosenRoom = serviceCompRooms[0] || branchRooms[0] || { id: '00000000-0000-0000-0000-000000000000', name: 'Room 1' };
          } else {
            return NextResponse.json({ error: 'No clinical rooms are available at this time slot.' }, { status: 400 });
          }
        }

        // Priority algorithm: if more than 1 room is available, select the room with the fewest exclusive services
        if (availableRooms.length > 1) {
          const { data: allSR, error: allSRError } = await supabaseServer
            .from('service_rooms')
            .select('service_id, room_id');

          if (allSRError) throw allSRError;

          const serviceRoomCounts = new Map<number, number>();
          if (allSR) {
            allSR.forEach((sr: any) => {
              const count = serviceRoomCounts.get(sr.service_id) ?? 0;
              serviceRoomCounts.set(sr.service_id, count + 1);
            });
          }

          const roomScores = new Map<string, number>();
          availableRooms.forEach((room: any) => {
            let exclusiveServices = 0;
            if (allSR) {
              allSR.forEach((sr: any) => {
                if (sr.room_id === room.id) {
                  const mappedRoomsCount = serviceRoomCounts.get(sr.service_id) ?? 0;
                  if (mappedRoomsCount === 1) {
                    exclusiveServices++;
                  }
                }
              });
            }
            roomScores.set(room.id, exclusiveServices);
          });

          availableRooms.sort((a: any, b: any) => {
            const scoreA = roomScores.get(a.id) ?? 0;
            const scoreB = roomScores.get(b.id) ?? 0;
            return scoreA - scoreB;
          });

          chosenRoom = availableRooms[0];
        }

        chosenRoomId = chosenRoom.id;
        serviceCompRoomIds = serviceCompRooms.map((r: any) => r.id);
      }

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update({
          status: 'approved',
          date: approveTargetDate,
          time_slot: timeSlot,
          doctor_name: doctorName || null,
          provider_id: await resolveProviderId(doctorName),
          room_id: chosenRoomId,
          rooms: serviceCompRoomIds,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));
    } else if (action === 'reject') {
      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));

    } else if (action === 'cancel' || action === 'no_show') {
      // RISK-029's deposit-refund/forfeit policy. Driven entirely by the reservation's actual
      // amount_paid — not a clinic-level "deposits enabled" flag. A clinic with deposits turned
      // off (depositPercentage 0) will simply never have amount_paid > 0 on a non-completed
      // booking, so this becomes a no-op automatically; no per-clinic customization needed.
      if (target.status === 'completed') {
        return NextResponse.json({ error: 'Cannot cancel or mark no-show on a completed booking.' }, { status: 400 });
      }
      // Idempotent: re-firing the same action on an already-cancelled/no_show booking must not
      // refund or forfeit the deposit a second time.
      if (target.status === 'cancelled' || target.status === 'no_show') {
        return NextResponse.json(mapRow(target));
      }

      const depositPaid = Number(target.amount_paid) || 0;
      const newStatus = action === 'cancel' ? 'cancelled' : 'no_show';

      if (depositPaid > 0 && target.customer_id) {
        const { data: customer, error: custReadError } = await supabaseServer
          .from('customers')
          .select('wallet_balance, spent_amount')
          .eq('id', target.customer_id)
          .maybeSingle();
        if (custReadError) throw custReadError;

        if (customer) {
          if (action === 'cancel') {
            // Cancelled in advance: give the deposit back as wallet credit (matches the existing
            // checkout "change" pattern — store credit, not a claim this system can pay out cash).
            const newWalletBalance = Number(customer.wallet_balance || 0) + depositPaid;
            await recordWalletMovement({
              customerId: target.customer_id,
              direction: 'in',
              amount: depositPaid,
              reason: 'deposit refund on cancellation',
              newBalance: newWalletBalance,
            });
          } else {
            // No-show: the clinic keeps the deposit as a cancellation fee — recognise it as
            // real spend now, since completion (which normally does this) will never happen.
            const { error: custUpdateError } = await supabaseServer
              .from('customers')
              .update({ spent_amount: Number(customer.spent_amount || 0) + depositPaid })
              .eq('id', target.customer_id);
            if (custUpdateError) throw custUpdateError;
          }
        }
      }

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update({
          status: newStatus,
          // Cancel: nothing is owed and nothing remains paid on the booking (it was refunded).
          // No-show: the deposit stays on record as amount_paid (it was kept, not refunded), but
          // no further balance is owed for a service that was never delivered.
          amount_paid: action === 'cancel' ? 0 : target.amount_paid,
          amount_left: 0,
          // No dedicated no_show_at column (PROPOSAL-002 Phase 5 only specifies three timestamp
          // columns) — cancelled_at doubles as "left the pipeline without being delivered" for
          // both cancel and no_show, which is what task 5.5's utilization math needs to exclude.
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));

    } else if (action === 'postpone') {
      // Two distinct paths, same action — the front desk usually doesn't know which one it'll
      // be until the patient answers the phone:
      // 1. A new date/time is already known: this is just a reschedule. No money moves, no
      //    'postponed' limbo — the booking keeps whatever active status it already had.
      // 2. Not known yet: status becomes 'postponed' with a follow-up reminder date, and the old
      //    date/time_slot are left as-is (stale, ignored while postponed) until path 1 happens
      //    later for this same booking.
      if (target.status === 'completed' || target.status === 'cancelled' || target.status === 'no_show') {
        return NextResponse.json({ error: 'Cannot postpone a booking that is completed, cancelled, or a no-show.' }, { status: 400 });
      }

      const updates: Record<string, any> = {};
      if (newDate) {
        updates.date = newDate;
        if (timeSlot) updates.time_slot = timeSlot;
        updates.follow_up_date = null;
        if (target.status === 'postponed') {
          updates.status = 'approved';
        }
      } else if (followUpDate) {
        updates.status = 'postponed';
        updates.follow_up_date = followUpDate;
      } else {
        return NextResponse.json({ error: 'Either a new date or a follow-up date is required.' }, { status: 400 });
      }

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(mapRow(updated));

    } else if (status || notes !== undefined || doctorNotes !== undefined || receptionNotes !== undefined || doctorName !== undefined || sessionType !== undefined || amountPaid !== undefined || amountLeft !== undefined || serviceId !== undefined || serviceIds !== undefined || createdByEmployeeId !== undefined || newDate !== undefined) {
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (status === 'completed' && target.status !== 'completed') {
        const completedAt = new Date();
        updates.completed_at = completedAt.toISOString();
        // Store the real elapsed time for this session, distinct from the service's planned
        // duration. Only computable when we actually recorded a start time (RISK-043).
        if (target.started_at) {
          const startedAt = new Date(target.started_at);
          const elapsedMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);
          if (Number.isFinite(elapsedMinutes) && elapsedMinutes >= 0) {
            updates.actual_duration_minutes = elapsedMinutes;
          }
        }
      }
      // RISK-043: anchor the moment a session actually begins. Guarded on the transition so a
      // later money-only PATCH on an already-started booking does not reset the clock and make a
      // stale session look freshly opened — same guard shape as completed_at above.
      if (status === 'started' && target.status !== 'started') {
        updates.started_at = new Date().toISOString();
      }
      if (notes !== undefined) updates.notes = notes;
      if (doctorNotes !== undefined) updates.doctor_notes = doctorNotes;
      if (receptionNotes !== undefined) updates.reception_notes = receptionNotes;
      if (doctorName !== undefined) {
        updates.doctor_name = doctorName;
        // Keep the durable link in step with the snapshot name.
        updates.provider_id = await resolveProviderId(doctorName);
      }
      if (sessionType !== undefined) updates.session_type = sessionType;
      if (amountPaid !== undefined) updates.amount_paid = amountPaid;
      if (amountLeft !== undefined) updates.amount_left = amountLeft;
      if (serviceId !== undefined) updates.service_id = Number(serviceId);
      if (serviceIds !== undefined) {
        updates.service_ids = serviceIds.map(Number);
        if (serviceIds.length > 0) {
          updates.service_id = Number(serviceIds[0]);
        }
      }
      if (createdByEmployeeId !== undefined) updates.created_by_employee_id = createdByEmployeeId || null;
      if (newDate !== undefined) updates.date = newDate;
      if (newDate !== undefined && timeSlot) updates.time_slot = timeSlot;

      // Determine total service cost to accurately resolve amount_left if null or missing
      const effectiveServiceIds: number[] =
        serviceIds !== undefined && Array.isArray(serviceIds)
          ? serviceIds.map(Number)
          : Array.isArray(target.service_ids) && target.service_ids.length > 0
            ? target.service_ids.map(Number)
            : (serviceId !== undefined ? Number(serviceId) : target.service_id)
              ? [serviceId !== undefined ? Number(serviceId) : Number(target.service_id)]
              : [];

      let derivedTotalCost = 0;
      if (effectiveServiceIds.length > 0) {
        const { data: svcs } = await supabaseServer
          .from('services')
          .select('id, price')
          .in('id', effectiveServiceIds);
        if (svcs && svcs.length > 0) {
          derivedTotalCost = svcs.reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);
        }
      }

      const effectivePaid = amountPaid !== undefined ? Number(amountPaid) : Number(target.amount_paid || 0);

      // When completing a reservation, if amount_left wasn't explicitly provided, calculate it as total cost minus amount paid
      if (amountLeft === undefined && (status === 'completed' || target.amount_left === null || target.amount_left === undefined)) {
        const calculatedLeft = Math.max(0, derivedTotalCost - effectivePaid);
        if (status === 'completed' || target.amount_left === null || target.amount_left === undefined) {
          updates.amount_left = calculatedLeft;
        }
      }

      let { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      // RISK-046: this used to fall back to writing 'confirmed' and then return
      // `{ ...fbUpdated, status: 'checked_in' }` — telling the caller the check-in succeeded while
      // the row actually held 'confirmed'. The UI trusted that response, so screen and database
      // disagreed until the next refetch, when the status appeared to revert on its own. The
      // fallback still writes 'confirmed' (better than leaving the booking untouched), but the
      // response now reports what was really stored, and says so.
      let checkedInDowngraded = false;
      if (updateError && status === 'checked_in') {
        console.warn("Status 'checked_in' rejected by database constraint, falling back to confirmed:", updateError.message);
        const fallbackUpdates = { ...updates, status: 'confirmed' };
        const { data: fbUpdated, error: fbError } = await supabaseServer
          .from('reservations')
          .update(fallbackUpdates)
          .eq('id', id)
          .select()
          .single();
        if (!fbError && fbUpdated) {
          updated = fbUpdated;
          updateError = null;
          checkedInDowngraded = true;
        }
      }

      if (updateError) throw updateError;

      if (checkedInDowngraded) {
        return NextResponse.json({
          ...mapRow(updated),
          warning:
            "Check-in could not be recorded — this database does not accept the 'checked_in' status. " +
            "The booking was saved as 'confirmed' instead. Apply migration " +
            "20260810000000_add_checked_in_reservation_status.sql.",
        });
      }

      // Settle customer balances when the booking is being completed, or when money
      // fields change on one that is already completed (paying down an outstanding
      // balance later), or when explicit wallet movements are supplied.
      const isSettlement =
        status === 'completed' ||
        (target.status === 'completed' && (amountPaid !== undefined || amountLeft !== undefined)) ||
        (walletDeposit !== undefined && Number(walletDeposit) > 0) ||
        (walletWithdrawal !== undefined && Number(walletWithdrawal) > 0);

      let resolvedCustomerId = explicitCustomerId || target.customer_id;
      if (!resolvedCustomerId && (target.phone || target.customer_phone)) {
        const rawPhone = (target.phone || target.customer_phone || '').trim();
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.length >= 9) {
          const { data: matchedCust } = await supabaseServer
            .from('customers')
            .select('id')
            .or(`phone.eq.${rawPhone},phone.eq.${cleanPhone}`)
            .limit(1)
            .maybeSingle();
          if (matchedCust?.id) {
            resolvedCustomerId = matchedCust.id;
            await supabaseServer
              .from('reservations')
              .update({ customer_id: resolvedCustomerId })
              .eq('id', id);
          }
        }
      }

      if (isSettlement && resolvedCustomerId) {
        try {
          const { data: customer, error: fetchCustErr } = await supabaseServer
            .from('customers')
            .select('id, wallet_balance, spent_amount, outstanding')
            .eq('id', resolvedCustomerId)
            .single();

          if (!fetchCustErr && customer) {
            const oldPaid = Number(target.amount_paid || 0);
            const oldLeft = target.amount_left !== null && target.amount_left !== undefined
              ? Number(target.amount_left)
              : Math.max(0, derivedTotalCost - oldPaid);

            const newPaid = amountPaid !== undefined ? Number(amountPaid) : oldPaid;
            const newLeft = updates.amount_left !== undefined
              ? Number(updates.amount_left)
              : amountLeft !== undefined
                ? Number(amountLeft)
                : Math.max(0, derivedTotalCost - newPaid);

            const settled = computeSettledBalances({
              current: {
                wallet: Number(customer.wallet_balance || 0),
                spent: Number(customer.spent_amount || 0),
                outstanding: Number(customer.outstanding || 0),
              },
              wasCompleted: target.status === 'completed',
              oldPaid,
              oldLeft,
              newPaid,
              newLeft,
              walletDeposit: Number(walletDeposit || 0),
              walletWithdrawal: Number(walletWithdrawal || 0),
            });

            if (settled.clamped) {
              console.warn('Customer balance clamped at 0:', resolvedCustomerId, '| reservation:', id);
            }

            // Write a wallet_txns ledger row if the wallet actually moved
            const currentWalletVal = Number(customer.wallet_balance || 0);
            const walletDelta = settled.wallet - currentWalletVal;
            if (walletDelta !== 0) {
              try {
                await recordWalletMovement({
                  customerId: resolvedCustomerId,
                  direction: walletDelta > 0 ? 'in' : 'out',
                  amount: Math.abs(walletDelta),
                  reason: walletDelta > 0 ? 'Change deposited into wallet from settlement' : 'Wallet balance applied to settlement',
                  newBalance: settled.wallet,
                });
              } catch (wmErr) {
                console.warn('recordWalletMovement ledger write failed, applying direct balance update:', wmErr);
                await supabaseServer
                  .from('customers')
                  .update({
                    wallet_balance: settled.wallet,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', resolvedCustomerId);
              }
            }

            // Update remaining scalars (spent, outstanding, and guarantee wallet_balance)
            await supabaseServer
              .from('customers')
              .update({
                wallet_balance: settled.wallet,
                spent_amount: settled.spent,
                outstanding: settled.outstanding
              })
              .eq('id', resolvedCustomerId);
          }
        } catch (custErr) {
          console.error("Failed to update customer wallet balance:", custErr);
        }

        // PROPOSAL-002 Phase 1, task 1.10 — additive dual-write, isolated in its own try/catch
        // deliberately separate from the balance-settlement try/catch above. A failure here must
        // never fail the checkout or roll back the customer balance update that already
        // succeeded; it is logged and reconciled later, not treated as fatal. See
        // ai_docs/FINANCE_TRACKER.md task 1.10.
        try {
          const wasAlreadyCompleted = target.status === 'completed';
          const newPaidAmount = amountPaid !== undefined ? Number(amountPaid) : Number(target.amount_paid || 0);
          const oldPaidAmount = Number(target.amount_paid || 0);
          const paymentDelta = wasAlreadyCompleted ? newPaidAmount - oldPaidAmount : newPaidAmount;

          if (!wasAlreadyCompleted && status === 'completed') {
            const serviceIds: number[] =
              Array.isArray(updated.service_ids) && updated.service_ids.length > 0
                ? updated.service_ids
                : updated.service_id
                  ? [updated.service_id]
                  : [];
            await writeCheckoutInvoice({
              reservationId: id,
              customerId: target.customer_id,
              branchId: updated.branch_id ?? null,
              providerId: updated.provider_id ?? null,
              serviceIds,
              amountPaid: Math.max(0, paymentDelta),
              consumptionOverrides,
              redeemedServiceIds: Array.isArray(redeemedServiceIds) ? redeemedServiceIds.map(Number) : undefined,
            });
          } else if (wasAlreadyCompleted && paymentDelta > 0) {
            await appendPaymentToExistingInvoice(id, paymentDelta);
          }
        } catch (invoiceErr) {
          console.error('Failed to write Phase 1 invoice (dual-write, non-fatal):', invoiceErr, '| reservation:', id);
        }
      }

      return NextResponse.json(mapRow(updated));
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('PATCH /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // No patient-facing caller for this endpoint exists — it can hard-delete every
  // reservation via ?id=all with no soft-delete and no confirmation beyond the admin UI.
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    if (id === 'all') {
      const { error } = await supabaseServer
        .from('reservations')
        .delete()
        .neq('status', 'nonexistent_status_to_delete_all_rows');
      
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'All reservations cleared' });
    }

    const { data: deleted, error: deleteError } = await supabaseServer
      .from('reservations')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (deleteError || !deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    console.error('DELETE /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
