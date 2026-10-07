import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { normalizeEgyptMobile } from '@/lib/customerIdentity';
import { recordTransaction } from '@/lib/transactionLedger';
import { writeHistoricalBookingInvoice, mapPaymentMethod, mapTransactionPaymentMethod } from '@/lib/historicalInvoice';
import {
  normalizeIncomingPackages,
  resolveHistoricalPackages,
  historicalPackageNotes,
  enteredHistoricalPackagePrice,
  applyHistoricalPackage,
  type HistoricalPackageOutcome,
} from '@/lib/historicalPackages';
import { settlePaymentMismatch, effectiveInvoiceValue, settleHistoricalEdit } from '@/lib/billing';

function isValidPhoneNumber(phoneStr: string): boolean {
  if (!phoneStr) return false;
  const trimmed = phoneStr.trim();
  let normalized = trimmed;
  if (normalized.startsWith('+20')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('0020')) {
    normalized = '0' + normalized.slice(4);
  } else if (normalized.startsWith('20') && normalized.length === 12) {
    normalized = '0' + normalized.slice(2);
  }

  // Egyptian mobile format: 010, 011, 012, 015 followed by 8 digits
  if (/^01[0125]\d{8}$/.test(normalized)) {
    return true;
  }
  // Generic international format (8-15 digits, optional leading +)
  if (/^\+?\d{8,15}$/.test(trimmed)) {
    return true;
  }
  return false;
}

function cleanPhoneForDb(phoneStr: string): string {
  let normalized = phoneStr.trim();
  if (normalized.startsWith('+20')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('0020')) {
    normalized = '0' + normalized.slice(4);
  } else if (normalized.startsWith('20') && normalized.length === 12) {
    normalized = '0' + normalized.slice(2);
  }
  return normalized;
}

/**
 * GET /api/reservations/previous
 * Health and diagnostics endpoint used by Admin System Test Suite (TC-038)
 * and for listing historical/previous reservations.
 *
 * Staff-gated: the response body carries real patient names and phone numbers for up to 50
 * reservations, so an unauthenticated caller must never reach it. The Test Suite runner already
 * sends the bearer token (`authenticatedJsonHeaders`), so TC-038 is unaffected.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { data: historicalBookings, error, count } = await supabaseServer
      .from('reservations')
      .select('id, name, phone, date, doctor_name, service_id, status, is_historical, created_at', { count: 'exact' })
      .or('is_historical.eq.true,notes.ilike.%[Historical Booking]%')
      .order('date', { ascending: false })
      .limit(50);

    if (error) {
      // Fallback if is_historical column does not exist yet on DB
      const { data: fallbackBookings, error: fallbackError } = await supabaseServer
        .from('reservations')
        .select('id, name, phone, date, doctor_name, service_id, status, created_at')
        .ilike('notes', '%[Historical Booking]%')
        .order('date', { ascending: false })
        .limit(50);

      if (fallbackError) {
        return NextResponse.json({
          status: 'ok',
          message: 'Previous reservations endpoint operational',
          count: 0,
          historicalBookings: []
        });
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Previous reservations endpoint operational (fallback mode)',
        count: fallbackBookings?.length || 0,
        historicalBookings: fallbackBookings || []
      });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Previous reservations endpoint operational',
      count: count ?? (historicalBookings?.length || 0),
      historicalBookings: historicalBookings || []
    });
  } catch (err: any) {
    console.error('GET /api/reservations/previous error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch previous reservations status', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reservations/previous
 * Creates a previous/historical booking that occurred before joining the system.
 * Automatically links to an existing patient by phone or creates a new customer profile.
 *
 * Staff-gated: this writes to `customers` and `reservations` (and can silently create a brand new
 * patient record), so it is a privileged reception action, not a public booking endpoint.
 */
export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json();
    const {
      patientPhone,
      phone,
      patientName,
      name,
      date,
      doctorId,
      doctorName,
      serviceId,
      serviceName,
      productId,
      productName,
      invoiceValue,
      serviceValue,
      value,
      price,
      actualSpent,
      amountPaid,
      payment,
      paymentType,
      branchId,
      notes
    } = body;

    const rawPhone = (patientPhone || phone || '').trim();
    const rawName = (patientName || name || '').trim();
    const rawDate = (date || '').trim();

    // 1. Validation: Phone number
    if (!rawPhone) {
      return NextResponse.json(
        { error: 'Patient phone number is required.', field: 'patientPhone' },
        { status: 400 }
      );
    }
    if (!isValidPhoneNumber(rawPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number.', field: 'patientPhone' },
        { status: 400 }
      );
    }

    // 2. Validation: Name
    if (!rawName) {
      return NextResponse.json(
        { error: 'Patient name is required.', field: 'patientName' },
        { status: 400 }
      );
    }

    // 3. Validation: Date
    if (!rawDate) {
      return NextResponse.json(
        { error: 'Booking date is required.', field: 'date' },
        { status: 400 }
      );
    }

    const cleanMobile = cleanPhoneForDb(rawPhone);

    // Parse financial values (support invoiceValue and actualSpent from front-end)
    const rawVal = invoiceValue ?? serviceValue ?? value ?? price ?? 0;
    const parsedValue = Math.max(0, isNaN(Number(rawVal)) ? 0 : Number(rawVal));

    const rawPaid = actualSpent ?? amountPaid ?? payment ?? 0;
    const parsedPaid = Math.max(0, isNaN(Number(rawPaid)) ? 0 : Number(rawPaid));

    // Resolve product metadata & prices (supports multiple products via products array, productIds, or legacy single productId/productName)
    const incomingProductList: Array<{ id?: string | number; name?: string; price?: number; selling_price?: number; qty?: number }> = Array.isArray(body.products)
      ? body.products
      : Array.isArray(body.productIds)
      ? body.productIds.map((id: any) => ({ id }))
      : (productId || productName)
      ? [{ id: productId, name: productName }]
      : [];

    let resolvedProductsList: Array<{ id: string | null; name: string; price: number; qty: number; total: number }> = [];
    let resolvedProductNames: string[] = [];

    if (incomingProductList.length > 0) {
      const incomingIds = incomingProductList
        .map((p) => (p.id != null ? String(p.id) : ''))
        .filter((id) => id && id !== 'undefined' && id !== 'null');

      let dbProducts: any[] = [];
      if (incomingIds.length > 0) {
        const { data: prodRows } = await supabaseServer
          .from('products')
          .select('id, name, selling_price, price, arabic_name')
          .in('id', incomingIds);
        if (prodRows) dbProducts = prodRows;
      }

      resolvedProductsList = incomingProductList.map((p) => {
        const pIdStr = p.id != null ? String(p.id) : null;
        const dbMatch = dbProducts.find((row) => String(row.id) === pIdStr);
        const resolvedName = p.name || dbMatch?.name || dbMatch?.arabic_name || (pIdStr ? `Product #${pIdStr}` : 'Product');
        const unitPrice = Number(p.price ?? p.selling_price ?? dbMatch?.selling_price ?? dbMatch?.price ?? 0);
        const qty = Math.max(1, Number(p.qty || 1));
        const total = unitPrice * qty;
        return {
          id: pIdStr,
          name: resolvedName,
          price: unitPrice,
          qty,
          total
        };
      });

      resolvedProductNames = resolvedProductsList.map((p) => p.name);
    }

    // DEC-098: every attached package — the multi-package form (`packages`) or the legacy single fields.
    // Validated against the patient below, before anything is written.
    const incomingPackages = normalizeIncomingPackages(body);
    const packageOutcomes: HistoricalPackageOutcome[] = [];

    // Resolve service metadata (supports multiple services via serviceIds or legacy serviceId)
    const incomingServiceIds: number[] = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
      : Array.isArray(body.services)
      ? body.services.map((s: any) => Number(s.id || s.serviceId)).filter((id: number) => !isNaN(id) && id > 0)
      : serviceId
      ? [Number(serviceId)].filter((id) => !isNaN(id) && id > 0)
      : [];

    let resolvedServiceIds: number[] = incomingServiceIds;
    let resolvedServiceId = resolvedServiceIds.length > 0 ? resolvedServiceIds[0] : null;
    let resolvedServiceNames: string[] = [];
    let resolvedServicesList: Array<{ id: number; name: string; price: number }> = [];

    if (resolvedServiceIds.length > 0) {
      const { data: srvRows } = await supabaseServer
        .from('services')
        .select('id, en, ar, price')
        .in('id', resolvedServiceIds);

      if (srvRows && srvRows.length > 0) {
        resolvedServicesList = srvRows.map((r: any) => ({
          id: r.id,
          name: r.en || r.ar || `Service #${r.id}`,
          price: Number(r.price || 0),
        }));
        resolvedServiceNames = resolvedServicesList.map((s) => s.name);
      }
    }

    if (resolvedServiceNames.length === 0 && serviceName) {
      resolvedServiceNames = [serviceName];
    }

    // 4. Patient Matching & Financial Ledger Reconciliation
    let customerId: string | null = null;
    let isNewPatient = false;
    let customerRecord: any = null;

    // Search for existing customer by phone
    const { data: existingCustomers, error: searchError } = await supabaseServer
      .from('customers')
      .select('id, name, mobile, number_of_bookings, spent_amount, outstanding, wallet_balance')
      .or(`mobile.eq.${cleanMobile},mobile.eq.+20${cleanMobile.startsWith('0') ? cleanMobile.slice(1) : cleanMobile}`);

    if (searchError) {
      console.warn('Customer lookup error in previous booking:', searchError.message);
    }

    let currentOutstanding = 0;
    let currentWallet = 0;
    let currentSpent = 0;
    let currentBookings = 0;

    if (existingCustomers && existingCustomers.length > 0) {
      // Existing patient found
      customerRecord = existingCustomers[0];
      customerId = customerRecord.id;
      currentOutstanding = Number(customerRecord.outstanding || 0);
      currentWallet = Number(customerRecord.wallet_balance || 0);
      currentSpent = Number(customerRecord.spent_amount || 0);
      currentBookings = Number(customerRecord.number_of_bookings || 0);
    }

    // DEC-098: reject a duplicate, foreign or unknown package before the first write.
    const packageCheck = await resolveHistoricalPackages(incomingPackages, customerId);
    if (!packageCheck.ok) {
      return NextResponse.json({ error: packageCheck.error, field: 'packages' }, { status: 400 });
    }
    const resolvedPackageName = incomingPackages.map((p) => p.packageName).filter(Boolean).join(', ') || null;

    // ── FINANCIAL LEDGER BALANCE CALCULATIONS (RISK-087) ──
    // diff > 0: underpaid (cost exceeds payment) -> debt added to outstanding, wallet used first
    // diff < 0: overpaid (payment exceeds cost) -> settles outstanding debt first, excess credited to wallet
    // diff === 0: exact payment -> no change to debt or wallet
    const settled = settlePaymentMismatch({
      current: { outstanding: currentOutstanding, wallet: currentWallet, spent: currentSpent },
      invoiceValue: effectiveInvoiceValue(parsedValue, parsedPaid),
      amountPaid: parsedPaid,
    });
    const newOutstanding = settled.outstanding;
    const newWallet = settled.wallet;
    const newSpent = settled.spent;

    if (customerRecord) {
      // Update existing customer profile balances
      const { data: updatedCustomer, error: updateCustError } = await supabaseServer
        .from('customers')
        .update({
          number_of_bookings: currentBookings + 1,
          spent_amount: newSpent,
          outstanding: newOutstanding,
          wallet_balance: newWallet,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single();

      if (updateCustError) {
        console.error('Failed to update customer balance for historical booking:', updateCustError.message);
      } else if (updatedCustomer) {
        customerRecord = updatedCustomer;
      }
    } else {
      // No patient found: create a new customer record with initial balances
      isNewPatient = true;
      const { data: newCustomer, error: createCustError } = await supabaseServer
        .from('customers')
        .insert({
          name: rawName,
          mobile: cleanMobile,
          active: true,
          registration_date: new Date().toISOString(),
          number_of_bookings: 1,
          spent_amount: newSpent,
          outstanding: newOutstanding,
          wallet_balance: newWallet,
          note: `[Auto-created from Add Previous Booking on ${new Date().toISOString().slice(0, 10)}]`
        })
        .select()
        .single();

      if (createCustError) {
        console.error('Failed to create customer for historical booking:', createCustError.message);
      } else if (newCustomer) {
        customerRecord = newCustomer;
        customerId = newCustomer.id;
      }
    }

    // Record wallet ledger transaction if wallet balance changed
    if (customerId && newWallet !== currentWallet) {
      const walletDelta = newWallet - currentWallet;
      try {
        await supabaseServer.from('wallet_txns').insert({
          customer_id: customerId,
          direction: walletDelta > 0 ? 'in' : 'out',
          amount: Math.abs(walletDelta),
          reason: walletDelta > 0
            ? `Credit surplus from historical booking on ${rawDate.slice(0, 10)}`
            : `Used against historical booking on ${rawDate.slice(0, 10)}`
        });
      } catch (wErr: any) {
        console.warn('Could not insert wallet_txns entry:', wErr?.message);
      }
    }

    // 5. Doctor attribution resolution
    let resolvedDoctorId = doctorId || null;
    let resolvedDoctorName = doctorName || null;

    if (resolvedDoctorId && !resolvedDoctorName) {
      const { data: prov } = await supabaseServer
        .from('providers')
        .select('name')
        .eq('id', resolvedDoctorId)
        .maybeSingle();
      if (prov?.name) resolvedDoctorName = prov.name;
    } else if (!resolvedDoctorId && resolvedDoctorName) {
      const { data: prov } = await supabaseServer
        .from('providers')
        .select('id')
        .ilike('name', resolvedDoctorName)
        .maybeSingle();
      if (prov?.id) resolvedDoctorId = prov.id;
    }

    // 6. Prepare historical reservation payload
    const historicalTag = '[Historical Booking]';
    const srvNote = resolvedServiceNames.length > 0 ? ` Services: ${resolvedServiceNames.join(', ')}.` : '';
    const pkgNotes = historicalPackageNotes(incomingPackages);

    const prodNote = resolvedProductNames.length > 0
      ? ` ${resolvedProductNames.length > 1 ? 'Products' : 'Product'}: ${resolvedProductNames.join(', ')}.`
      : '';
    const valNote = ` [Invoice Total]: ${parsedValue} EGP.`;
    const spentNote = ` Actual Spent: ${parsedPaid} EGP.`;
    const paymentNote = paymentType ? ` Payment Method: ${paymentType}.` : '';
    const userNote = notes ? ` ${notes}` : '';
    const receptionNote = `${historicalTag} Added manually for historical records.${srvNote}${pkgNotes}${prodNote}${valNote}${spentNote}${paymentNote}${userNote}`.trim();

    const reservationPayload: Record<string, any> = {
      customer_id: customerId,
      name: rawName,
      phone: cleanMobile,
      date: rawDate.slice(0, 10),
      time_slot: '12:00',
      requested_time: 'Historical Booking',
      status: 'completed',
      is_manual: true,
      service_id: resolvedServiceId,
      service_ids: resolvedServiceIds,
      provider_id: resolvedDoctorId,
      doctor_name: resolvedDoctorName || '—',
      branch_id: branchId || null,
      reception_notes: receptionNote,
      notes: receptionNote,
      amount_paid: parsedPaid,
      amount_left: Math.max(0, parsedValue - parsedPaid),
      completed_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
      created_at: new Date().toISOString()
    };

    // Attempt insertion with is_historical
    let { data: newReservation, error: insertError } = await supabaseServer
      .from('reservations')
      .insert({
        ...reservationPayload,
        is_historical: true
      })
      .select()
      .single();

    // Fallback if is_historical column does not exist on DB yet
    if (insertError && insertError.message?.includes('is_historical')) {
      console.warn('is_historical column not found, inserting with notes tag fallback');
      const fallbackResult = await supabaseServer
        .from('reservations')
        .insert(reservationPayload)
        .select()
        .single();
      newReservation = fallbackResult.data;
      insertError = fallbackResult.error;
    }

    if (insertError) {
      console.error('Failed to create historical reservation:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create historical booking in database.', details: insertError.message },
        { status: 500 }
      );
    }

    // 7. Attach Line Items to `reservation_products` (DEC-042)
    const staffEmployeeId = (access as any).access?.employee?.id || null;
    const staffEmployeeName = (access as any).access?.employee?.name || (access as any).access?.employee?.email?.split('@')[0] || 'Receptionist';

    // 7a. Insert services into reservation_products
    if (resolvedServicesList.length > 0) {
      for (let i = 0; i < resolvedServicesList.length; i++) {
        const s = resolvedServicesList[i];
        try {
          await supabaseServer.from('reservation_products').insert({
            reservation_id: newReservation.id,
            line_type: i === 0 ? 'service' : 'additional_service',
            service_id: s.id,
            description: s.name,
            qty: 1,
            unit_price: s.price,
            total: s.price,
            added_by_employee_id: staffEmployeeId,
            added_by_role: 'receptionist'
          });
        } catch (sErr: any) {
          console.warn('Could not insert reservation_products for service (non-fatal):', sErr?.message);
        }
      }
    }

    // 7b. Insert products into reservation_products & product_sales
    if (resolvedProductsList.length > 0) {
      for (const pr of resolvedProductsList) {
        try {
          await supabaseServer.from('reservation_products').insert({
            reservation_id: newReservation.id,
            line_type: 'product',
            product_id: pr.id || null,
            description: pr.name,
            qty: pr.qty,
            unit_price: pr.price,
            total: pr.total,
            added_by_employee_id: staffEmployeeId,
            added_by_role: 'receptionist'
          });
        } catch (rpErr: any) {
          console.warn('Could not insert reservation_products for product (non-fatal):', rpErr?.message);
        }

        // Also record in product_sales table for inventory sales history
        if (customerId) {
          try {
            await supabaseServer.from('product_sales').insert({
              product_id: pr.id || null,
              product_name: pr.name,
              quantity: pr.qty,
              unit_price: pr.price,
              total_price: pr.total,
              customer_id: customerId,
              customer_name: rawName,
              customer_phone: cleanMobile,
              cashier_name: staffEmployeeName,
              payment_method: paymentType || 'cash',
              notes: `[Historical Booking on ${rawDate.slice(0, 10)}]`,
              sale_date: `${rawDate.slice(0, 10)}T12:00:00Z`
            });
          } catch (psErr: any) {
            console.warn('Could not insert product_sales record (non-fatal):', psErr?.message);
          }
        }
      }
    }

    // 7c. Packages (DEC-098): one display line each in reservation_products, then the patient's package rows.
    const enteredPackagePrice = enteredHistoricalPackagePrice(incomingPackages, {
      hasService: Boolean(resolvedServiceId),
      hasProduct: resolvedProductsList.length > 0,
      invoiceValue: parsedValue,
    });
    for (const p of incomingPackages) {
      // An existing package was paid for in an earlier transaction; a new one shows its list price.
      const linePrice = p.customerPackageId ? 0 : (p.clientPrice || Number(p.record?.price || 0));
      const { error: rpErr } = await supabaseServer.from('reservation_products').insert({
        reservation_id: newReservation.id,
        line_type: 'additional_service',
        description: `Package: ${p.packageName}`,
        qty: 1,
        unit_price: linePrice,
        total: linePrice,
        added_by_employee_id: staffEmployeeId,
        added_by_role: 'receptionist'
      });
      if (rpErr) console.warn('Could not insert reservation_products for package (non-fatal):', rpErr.message);

      if (customerId) {
        const outcome = await applyHistoricalPackage({ pkg: p, customerId, bookingDate: rawDate, enteredPrice: enteredPackagePrice, mode: 'post' });
        if (outcome.error) console.error('Historical package write failed (non-fatal):', outcome.error);
        if (outcome.pulseUsageSyncError) console.warn('Could not sync pre-launch pulse usage (non-fatal):', outcome.pulseUsageSyncError);
        packageOutcomes.push(outcome);
      }
    }

    // 8. Record Financial Transaction (RISK-076) in `transactions` table
    if (parsedPaid > 0 && customerId) {
      const descItems: string[] = [];
      if (resolvedServiceNames.length > 0) descItems.push(`Services: ${resolvedServiceNames.join(', ')}`);
      if (resolvedPackageName) descItems.push(`Package: ${resolvedPackageName}`);
      if (resolvedProductNames.length > 0) {
        descItems.push(`${resolvedProductNames.length > 1 ? 'Products' : 'Product'}: ${resolvedProductNames.join(', ')}`);
      }
      const itemsDesc = descItems.length > 0 ? ` (${descItems.join(', ')})` : '';

      await recordTransaction({
        type: 'payment',
        amount: parsedPaid,
        description: `Payment for historical booking on ${rawDate.slice(0, 10)}${itemsDesc}`,
        customerId: customerId,
        branchId: branchId || null,
        reservationId: newReservation.id,
        paymentMethod: mapTransactionPaymentMethod(paymentType),
        status: 'completed',
        source: 'manual',
        reason: notes || 'Historical booking payment',
        createdByEmployeeId: staffEmployeeId,
        createdByName: staffEmployeeName,
        occurredAt: `${rawDate.slice(0, 10)}T12:00:00Z`
      });
    }

    // 9. Ledger invoice + payment for the historical booking (DEC-086 / RISK-102). Non-fatal — the
    //    booking, balances and transactions row above are already saved — but a failure is reported in
    //    the response (`ledger.status = 'failed'`) instead of being swallowed; the idempotent
    //    scripts/backfill_historical_invoices.sql repairs any that slip through.
    let ledger: Awaited<ReturnType<typeof writeHistoricalBookingInvoice>> = { status: 'skipped', reason: 'zero_total' };
    if (customerId && newReservation?.id) {
      ledger = await writeHistoricalBookingInvoice({
        reservationId: newReservation.id,
        customerId,
        branchId: branchId || null,
        serviceId: resolvedServiceId,
        occurredAt: `${rawDate.slice(0, 10)}T12:00:00Z`,
        invoiceValue: parsedValue,
        amountPaid: parsedPaid,
        serviceName: resolvedServiceNames.join(', ') || null,
        packageName: resolvedPackageName,
        productName: resolvedProductNames.join(', ') || null,
        paymentType: paymentType || null,
        employeeId: staffEmployeeId,
      });
      if (ledger.status === 'failed') {
        console.error('Failed to write ledger invoice for historical booking (non-fatal):', ledger.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Historical booking added successfully.',
      booking: newReservation,
      customer: customerRecord,
      ledger,
      package: packageOutcomes[0] ?? null,
      packages: packageOutcomes,
      balances: {
        spent_amount: newSpent,
        outstanding: newOutstanding,
        wallet_balance: newWallet
      },
      isNewPatient
    });
  } catch (err: any) {
    console.error('POST /api/reservations/previous error:', err);
    return NextResponse.json(
      { error: 'Internal server error while saving historical booking.', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reservations/previous
 * Allows Superadmin accounts to edit a previously recorded historical booking.
 * Updates reservation details, clinical notes, and reconciles associated ledger invoices.
 */
export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  // 1. Superadmin check
  if (access.access.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Only superadmin accounts are authorized to edit previous bookings.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      id,
      patientPhone,
      patientName,
      date,
      doctorId,
      doctorName,
      serviceId,
      serviceName,
      productId,
      productName,
      invoiceValue,
      actualSpent,
      paymentType,
      notes,
      branchId
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required reservation id' }, { status: 400 });
    }

    // 2. Fetch existing reservation to ensure it exists
    const { data: existing, error: findError } = await supabaseServer
      .from('reservations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    // 3. Only historical bookings
    const isHistoricalByFlag = existing.is_historical === true;
    const isHistoricalByTag = (existing.notes || '').includes('[Historical Booking]') || (existing.reception_notes || '').includes('[Historical Booking]');
    if (!isHistoricalByFlag && !isHistoricalByTag) {
      return NextResponse.json(
        { error: 'Only historical bookings can be edited here.' },
        { status: 409 }
      );
    }

    // 4. Validate input fields
    const rawName = patientName ? String(patientName).trim() : existing.name;
    const rawPhone = patientPhone ? String(patientPhone).trim() : existing.phone;
    const rawDate = date ? String(date).trim() : existing.date;

    if (!rawName) return NextResponse.json({ error: 'Patient name is required.', field: 'patientName' }, { status: 400 });
    if (!rawPhone || !isValidPhoneNumber(rawPhone)) return NextResponse.json({ error: 'Invalid phone number format.', field: 'patientPhone' }, { status: 400 });
    if (!rawDate) return NextResponse.json({ error: 'Date is required.', field: 'date' }, { status: 400 });

    // 5. Phone change is not supported yet
    const cleanMobile = cleanPhoneForDb(rawPhone);
    if (cleanPhoneForDb(existing.phone) !== cleanMobile) {
      return NextResponse.json(
        {
          error: 'Changing the patient phone of a historical booking is not supported. Delete and re-add the booking under the correct patient.',
          field: 'patientPhone'
        },
        { status: 400 }
      );
    }

    const parsedValue = typeof invoiceValue === 'number' ? invoiceValue : parseFloat(invoiceValue) || 0;
    const parsedPaid = typeof actualSpent === 'number' ? actualSpent : parseFloat(actualSpent) || 0;

    const warnings: string[] = [];

    // 6. Old values, read BEFORE updating anything
    const oldPaid = Number(existing.amount_paid || 0);
    let oldInvoiceValue = 0;

    const { data: invRows, error: invError } = await supabaseServer
      .from('invoices')
      .select('id, grand_total')
      .eq('reservation_id', id)
      .order('issued_at', { ascending: true })
      .limit(1);

    // Abort before writing anything: treating a failed read as "no invoice" would make the
    // invoice step below create a second invoice for this booking.
    if (invError) {
      console.error('Error loading invoice for PATCH:', invError.message);
      return NextResponse.json(
        { error: 'Could not load the booking invoice; nothing was changed.', details: invError.message },
        { status: 500 }
      );
    }
    const existingInv: { id: string; grand_total: number } | null = (invRows && invRows[0]) || null;

    if (existingInv) {
      oldInvoiceValue = Number(existingInv.grand_total || 0);
    } else {
      // Parse from notes
      const invoiceMatch = (existing.reception_notes || existing.notes || '').match(/\[Invoice Total\]:\s*([\d.]+)/);
      if (invoiceMatch) {
        oldInvoiceValue = Number(invoiceMatch[1]) || 0;
      } else {
        oldInvoiceValue = oldPaid + Number(existing.amount_left || 0);
      }
    }

    const resolvedDoctorId = doctorId || existing.provider_id || null;
    let resolvedDoctorName = doctorName || existing.doctor_name || null;
    if (resolvedDoctorId) {
      const { data: prov } = await supabaseServer.from('providers').select('id, name').eq('id', resolvedDoctorId).maybeSingle();
      if (prov?.name) resolvedDoctorName = prov.name;
    }

    // Resolve service metadata (supports multiple services via serviceIds or legacy serviceId)
    const incomingServiceIds: number[] = Array.isArray(body.serviceIds)
      ? body.serviceIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
      : Array.isArray(body.services)
      ? body.services.map((s: any) => Number(s.id || s.serviceId)).filter((id: number) => !isNaN(id) && id > 0)
      : serviceId
      ? [Number(serviceId)].filter((id) => !isNaN(id) && id > 0)
      : Array.isArray(existing.service_ids) && existing.service_ids.length > 0
      ? existing.service_ids.map(Number)
      : existing.service_id
      ? [Number(existing.service_id)]
      : [];

    let resolvedServiceIds: number[] = incomingServiceIds;
    let resolvedServiceId = resolvedServiceIds.length > 0 ? resolvedServiceIds[0] : null;
    let resolvedServiceNames: string[] = [];

    if (resolvedServiceIds.length > 0) {
      const { data: srvRows } = await supabaseServer
        .from('services')
        .select('id, en, ar')
        .in('id', resolvedServiceIds);
      if (srvRows && srvRows.length > 0) {
        resolvedServiceNames = srvRows.map((r: any) => r.en || r.ar || `Service #${r.id}`);
      }
    }

    if (resolvedServiceNames.length === 0 && serviceName) {
      resolvedServiceNames = [serviceName];
    }

    // DEC-098: every attached package, validated against this booking's patient before any write.
    const incomingPackages = normalizeIncomingPackages(body);
    const packageCheck = await resolveHistoricalPackages(incomingPackages, existing.customer_id || null);
    if (!packageCheck.ok) {
      return NextResponse.json({ error: packageCheck.error, field: 'packages' }, { status: 400 });
    }
    const pkgNotes = historicalPackageNotes(incomingPackages);
    const resolvedPackageName = incomingPackages.map((pk) => pk.packageName).filter(Boolean).join(', ') || null;

    // Resolve products for PATCH
    const incomingProductList: Array<{ id?: string | number; name?: string; price?: number }> = Array.isArray(body.products)
      ? body.products
      : Array.isArray(body.productIds)
      ? body.productIds.map((id: any) => ({ id }))
      : (productId || productName)
      ? [{ id: productId, name: productName }]
      : [];

    let resolvedProductNames: string[] = [];
    if (incomingProductList.length > 0) {
      resolvedProductNames = incomingProductList.map((p) => p.name || (p.id ? `Product #${p.id}` : 'Product')).filter(Boolean);
    } else if (productName) {
      resolvedProductNames = [productName];
    }

    // 7. Preserve machine markers in the notes
    function preservedMarkerLines(previous: string | null): string[] {
      if (!previous) return [];
      const lines = previous.split('\n');
      return lines
        .slice(1) // Skip the first line
        .filter((line) => line.startsWith('[') && !line.startsWith('[Historical Booking]'));
    }

    // 8. Reconstruct reception notes with preserved markers
    const historicalTag = '[Historical Booking]';
    const srvNote = resolvedServiceNames.length > 0 ? ` Services: ${resolvedServiceNames.join(', ')}.` : '';
    const prodNote = resolvedProductNames.length > 0
      ? ` ${resolvedProductNames.length > 1 ? 'Products' : 'Product'}: ${resolvedProductNames.join(', ')}.`
      : '';
    const valNote = ` [Invoice Total]: ${parsedValue} EGP.`;
    const spentNote = ` Actual Spent: ${parsedPaid} EGP.`;
    const paymentNote = paymentType ? ` Payment Method: ${paymentType}.` : '';
    const userNote = notes ? ` ${notes}` : '';
    const receptionNoteBase = `${historicalTag} Added manually for historical records.${srvNote}${pkgNotes}${prodNote}${valNote}${spentNote}${paymentNote}${userNote}`.trim();
    const preservedNotesMarkers = preservedMarkerLines(existing.notes);
    const receptionNote = preservedNotesMarkers.length > 0 ? `${receptionNoteBase}\n${preservedNotesMarkers.join('\n')}` : receptionNoteBase;

    const preservedReceptionMarkers = preservedMarkerLines(existing.reception_notes);
    const finalReceptionNote = preservedReceptionMarkers.length > 0 ? `${receptionNoteBase}\n${preservedReceptionMarkers.join('\n')}` : receptionNoteBase;

    // Load customer for balance updates
    let balancesBefore: { wallet: number; spent: number; outstanding: number } | null = null;
    let balancesAfter: { wallet: number; spent: number; outstanding: number } | null = null;

    if (existing.customer_id) {
      const { data: customer, error: custErr } = await supabaseServer
        .from('customers')
        .select('spent_amount, outstanding, wallet_balance')
        .eq('id', existing.customer_id)
        .maybeSingle();

      if (custErr) {
        console.warn('Error loading customer for PATCH:', custErr.message);
        warnings.push(`Could not load customer balances: ${custErr.message}`);
      } else if (customer) {
        balancesBefore = {
          wallet: Number(customer.wallet_balance || 0),
          spent: Number(customer.spent_amount || 0),
          outstanding: Number(customer.outstanding || 0),
        };
      }
    }

    // 9. Update reservation row (this can fail fatally)
    const updatePayload: Record<string, any> = {
      name: rawName,
      phone: cleanMobile,
      date: rawDate.slice(0, 10),
      service_id: resolvedServiceId,
      service_ids: resolvedServiceIds,
      provider_id: resolvedDoctorId,
      doctor_name: resolvedDoctorName || '—',
      branch_id: branchId || existing.branch_id || null,
      reception_notes: finalReceptionNote,
      notes: receptionNote,
      amount_paid: parsedPaid,
      amount_left: Math.max(0, parsedValue - parsedPaid),
      completed_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
      updated_at: new Date().toISOString()
    };

    const { data: updatedReservation, error: updateError } = await supabaseServer
      .from('reservations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update historical reservation:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update historical booking in database.', details: updateError.message },
        { status: 500 }
      );
    }

    // 10. Packages (DEC-098): update the patient's existing package or create a package added while editing.
    // Balances are NOT touched here — they are re-settled exactly once in step 11.
    if (existing.customer_id && incomingPackages.length > 0) {
      const enteredPackagePrice = enteredHistoricalPackagePrice(incomingPackages, {
        hasService: Boolean(resolvedServiceId),
        hasProduct: Boolean(productId || productName),
        invoiceValue: parsedValue,
      });
      for (const pkg of incomingPackages) {
        const outcome = await applyHistoricalPackage({
          pkg,
          customerId: existing.customer_id,
          bookingDate: rawDate,
          enteredPrice: enteredPackagePrice,
          mode: 'patch',
        });
        if (outcome.error) warnings.push(`Package ${pkg.packageName}: ${outcome.error}`);
        if (outcome.pulseUsageSyncError) warnings.push(`Package ${pkg.packageName} pulse history: ${outcome.pulseUsageSyncError}`);
      }
    }

    // 11. Customer balances (non-fatal errors)
    if (existing.customer_id && balancesBefore) {
      try {
        const settled = settleHistoricalEdit({
          current: balancesBefore as any,
          oldInvoiceValue,
          oldAmountPaid: oldPaid,
          newInvoiceValue: parsedValue,
          newAmountPaid: parsedPaid,
        });

        balancesAfter = settled;

        if (settled.wallet !== balancesBefore.wallet || settled.spent !== balancesBefore.spent || settled.outstanding !== balancesBefore.outstanding) {
          const { error: balErr } = await supabaseServer
            .from('customers')
            .update({
              spent_amount: settled.spent,
              outstanding: settled.outstanding,
              wallet_balance: settled.wallet,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.customer_id);

          if (balErr) {
            console.warn('Error updating customer balances:', balErr.message);
            warnings.push(`Customer balance update failed: ${balErr.message}`);
          }

          // Record wallet transaction if wallet changed
          if (settled.wallet !== balancesBefore.wallet) {
            const walletDelta = settled.wallet - balancesBefore.wallet;
            try {
              const dateStr = rawDate.slice(0, 10);
              const { error: walletErr } = await supabaseServer.from('wallet_txns').insert({
                customer_id: existing.customer_id,
                direction: walletDelta > 0 ? 'in' : 'out',
                amount: Math.abs(walletDelta),
                reason: `Adjusted by edit of historical booking on ${dateStr}`
              });
              if (walletErr) warnings.push(`Wallet transaction failed: ${walletErr.message}`);
            } catch (wErr: any) {
              console.warn('Could not insert wallet_txns entry:', wErr?.message);
              warnings.push(`Wallet transaction failed: ${wErr?.message}`);
            }
          }
        }
      } catch (balErr: any) {
        console.warn('Error settling balances:', balErr?.message);
        warnings.push(`Balance settlement failed: ${balErr?.message}`);
      }
    }

    // 12. Invoice (non-fatal errors)
    let transactionIdToLog: string | null = null;
    try {
      const newTotal = effectiveInvoiceValue(parsedValue, parsedPaid);

      if (existingInv) {
        // Update existing invoice
        const { error: upErr } = await supabaseServer
          .from('invoices')
          .update({
            issued_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
            subtotal: newTotal,
            grand_total: newTotal,
            branch_id: branchId || existing.branch_id || null
          })
          .eq('id', existingInv.id);

        if (upErr) {
          console.warn('Error updating invoice:', upErr.message);
          warnings.push(`Invoice update failed: ${upErr.message}`);
        } else {
          // Update invoice lines
          const { error: lineErr } = await supabaseServer
            .from('invoice_lines')
            .update({
              unit_price: newTotal,
              line_total: newTotal,
              description: `${resolvedServiceNames.join(', ') || 'Historical booking'} [historical backfill]`,
              service_id: resolvedServiceId || null
            })
            .eq('invoice_id', existingInv.id);

          if (lineErr) {
            console.warn('Error updating invoice lines:', lineErr.message);
            warnings.push(`Invoice line update failed: ${lineErr.message}`);
          }
        }

        // Handle payments
        const { data: existingPayments, error: payErr } = await supabaseServer
          .from('payments')
          .select('id')
          .eq('invoice_id', existingInv.id)
          .order('received_at', { ascending: true });

        if (payErr) {
          console.warn('Error loading payments:', payErr.message);
          warnings.push(`Payment lookup failed: ${payErr.message}`);
        } else if (existingPayments) {
          if (parsedPaid > 0) {
            if (existingPayments.length > 0) {
              // Update first payment
              const { error: updPayErr } = await supabaseServer
                .from('payments')
                .update({
                  amount: parsedPaid,
                  received_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
                  method: mapPaymentMethod(paymentType)
                })
                .eq('id', existingPayments[0].id);

              if (updPayErr) {
                console.warn('Error updating payment:', updPayErr.message);
                warnings.push(`Payment update failed: ${updPayErr.message}`);
              }
            } else {
              // Insert new payment
              const staffEmployeeId = (access as any).access?.employee?.id || null;
              const { error: insPayErr } = await supabaseServer
                .from('payments')
                .insert({
                  invoice_id: existingInv.id,
                  received_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
                  amount: parsedPaid,
                  method: mapPaymentMethod(paymentType),
                  received_by_employee_id: staffEmployeeId,
                  is_opening: true
                });

              if (insPayErr) {
                console.warn('Error inserting payment:', insPayErr.message);
                warnings.push(`Payment insertion failed: ${insPayErr.message}`);
              }
            }
          } else {
            // Delete all payments
            if (existingPayments.length > 0) {
              const { error: delPayErr } = await supabaseServer
                .from('payments')
                .delete()
                .eq('invoice_id', existingInv.id);

              if (delPayErr) {
                console.warn('Error deleting payments:', delPayErr.message);
                warnings.push(`Payment deletion failed: ${delPayErr.message}`);
              }
            }
          }
        }
      } else if (existing.customer_id && newTotal > 0) {
        // Create new invoice
        const staffEmployeeId = (access as any).access?.employee?.id || null;
        const result = await writeHistoricalBookingInvoice({
          reservationId: id,
          customerId: existing.customer_id,
          branchId: branchId || existing.branch_id || null,
          serviceId: resolvedServiceId,
          occurredAt: `${rawDate.slice(0, 10)}T12:00:00Z`,
          invoiceValue: parsedValue,
          amountPaid: parsedPaid,
          serviceName: resolvedServiceNames.join(', ') || null,
          packageName: resolvedPackageName,
          productName: resolvedProductNames.join(', ') || null,
          paymentType,
          employeeId: staffEmployeeId,
        });

        if (result.status === 'failed') {
          console.warn('Error creating invoice:', result.error);
          warnings.push(`Invoice creation failed: ${result.error}`);
        }
      }
    } catch (invErr: any) {
      console.warn('Could not reconcile historical invoice (non-fatal):', invErr?.message);
      warnings.push(`Invoice reconciliation failed: ${invErr?.message}`);
    }

    // 13. Transactions row (non-fatal errors)
    try {
      const { data: txnRows, error: txnErr } = await supabaseServer
        .from('transactions')
        .select('id')
        .eq('reservation_id', id)
        .eq('type', 'payment')
        .order('occurred_at', { ascending: true })
        .limit(1);
      const existingTxn: { id: string } | null = (txnRows && txnRows[0]) || null;

      if (txnErr) {
        console.warn('Error loading transaction:', txnErr.message);
        warnings.push(`Transaction lookup failed: ${txnErr.message}`);
      } else if (existingTxn) {
        transactionIdToLog = existingTxn.id;
        if (parsedPaid > 0) {
          // Update existing transaction
          const { error: upTxnErr } = await supabaseServer
            .from('transactions')
            .update({
              amount: parsedPaid,
              payment_method: mapTransactionPaymentMethod(paymentType),
              occurred_at: `${rawDate.slice(0, 10)}T12:00:00Z`
            })
            .eq('id', existingTxn.id);

          if (upTxnErr) {
            console.warn('Error updating transaction:', upTxnErr.message);
            warnings.push(`Transaction update failed: ${upTxnErr.message}`);
          }
        } else {
          // Delete existing transaction
          const { error: delTxnErr } = await supabaseServer
            .from('transactions')
            .delete()
            .eq('id', existingTxn.id);

          if (delTxnErr) {
            console.warn('Error deleting transaction:', delTxnErr.message);
            warnings.push(`Transaction deletion failed: ${delTxnErr.message}`);
          } else {
            transactionIdToLog = null;
          }
        }
      } else if (parsedPaid > 0 && existing.customer_id) {
        // Create new transaction
        const staffEmployeeId = (access as any).access?.employee?.id || null;
        const staffEmployeeName = (access as any).access?.employee?.email || 'Superadmin';

        const descItems: string[] = [];
        if (resolvedServiceNames.length > 0) descItems.push(`Services: ${resolvedServiceNames.join(', ')}`);
        if (resolvedPackageName) descItems.push(`Package: ${resolvedPackageName}`);
        if (resolvedProductNames.length > 0) {
          descItems.push(`${resolvedProductNames.length > 1 ? 'Products' : 'Product'}: ${resolvedProductNames.join(', ')}`);
        }
        const itemsDesc = descItems.length > 0 ? ` (${descItems.join(', ')})` : '';

        await recordTransaction({
          type: 'payment',
          amount: parsedPaid,
          description: `Payment for historical booking on ${rawDate.slice(0, 10)}${itemsDesc}`,
          customerId: existing.customer_id,
          branchId: branchId || existing.branch_id || null,
          reservationId: id,
          paymentMethod: mapTransactionPaymentMethod(paymentType),
          status: 'completed',
          source: 'manual',
          reason: notes || 'Historical booking payment',
          createdByEmployeeId: staffEmployeeId,
          createdByName: staffEmployeeName,
          occurredAt: `${rawDate.slice(0, 10)}T12:00:00Z`,
        });
        // recordTransaction does not return the row; read it back for the audit log.
        const { data: createdTxn } = await supabaseServer
          .from('transactions')
          .select('id')
          .eq('reservation_id', id)
          .eq('type', 'payment')
          .order('occurred_at', { ascending: true })
          .limit(1);
        if (createdTxn && createdTxn[0]) {
          transactionIdToLog = createdTxn[0].id;
        } else {
          warnings.push('Transaction creation failed: no payment row was recorded.');
        }
      }
    } catch (txnErr: any) {
      console.warn('Could not reconcile transaction (non-fatal):', txnErr?.message);
      warnings.push(`Transaction reconciliation failed: ${txnErr?.message}`);
    }

    // 14. Audit log (non-fatal)
    try {
      const staffEmployeeId = (access as any).access?.employee?.id || null;
      const staffEmployeeEmail = (access as any).access?.employee?.email || null;

      const auditDetails = {
        reservation_id: id,
        before: {
          invoiceValue: oldInvoiceValue,
          amountPaid: oldPaid,
          date: existing.date,
          serviceId: existing.service_id,
          name: existing.name
        },
        after: {
          invoiceValue: parsedValue,
          amountPaid: parsedPaid,
          date: rawDate.slice(0, 10),
          serviceId: resolvedServiceId,
          name: rawName
        },
        ...(balancesBefore && balancesAfter
          ? {
              balancesBefore,
              balancesAfter
            }
          : {})
      };

      const { error: auditErr } = await supabaseServer
        .from('transaction_audit_logs')
        .insert({
          transaction_id: transactionIdToLog,
          action: 'edited_historical_booking',
          performed_by_employee_id: staffEmployeeId,
          performed_by_name: staffEmployeeEmail,
          details: auditDetails
        });

      if (auditErr) {
        console.warn('Error inserting audit log:', auditErr.message);
        warnings.push(`Audit log insertion failed: ${auditErr.message}`);
      }
    } catch (auditErr: any) {
      console.warn('Could not insert audit log (non-fatal):', auditErr?.message);
      warnings.push(`Audit log failed: ${auditErr?.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Historical booking updated successfully.',
      booking: updatedReservation,
      balances: balancesAfter || null,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (err: any) {
    console.error('PATCH /api/reservations/previous error:', err);
    return NextResponse.json(
      { error: 'Internal server error while updating historical booking.', details: err?.message },
      { status: 500 }
    );
  }
}
