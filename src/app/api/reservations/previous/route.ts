import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { normalizeEgyptMobile } from '@/lib/customerIdentity';
import { recordTransaction } from '@/lib/transactionLedger';
import { writeHistoricalBookingInvoice, mapPaymentMethod, mapTransactionPaymentMethod, syncPreLaunchPulseUsage } from '@/lib/historicalInvoice';
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
      packageId,
      packageName,
      customerPackageId,
      existingCustomerPackageId,
      packagePulsesTotal,
      packagePulsesUsed,
      packagePulsesRemaining,
      packageItemsUsage,
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

    // Resolve product metadata & prices
    let productPrice = 0;
    let resolvedProductName = productName || null;
    if (productId) {
      const { data: prodRow } = await supabaseServer
        .from('products')
        .select('id, name, selling_price, price, arabic_name')
        .eq('id', productId)
        .maybeSingle();
      if (prodRow) {
        productPrice = Number(prodRow.selling_price ?? prodRow.price ?? 0);
        if (!resolvedProductName) resolvedProductName = prodRow.name || prodRow.arabic_name;
      }
    }

    // Resolve package metadata & prices
    let packagePrice = 0;
    let resolvedPackageName = packageName || null;
    let packageRecord: any = null;
    // Outcome of creating or updating the patient's package, returned to the caller (DEC-088 item 6).
    let packageOutcome: { created: boolean; updated?: boolean; existingId?: string; pricePending?: boolean; packageType?: string; totalPulses?: number; error?: string; pulseUsageSyncError?: string } | null = null;
    if (packageId) {
      const { data: pkgRow } = await supabaseServer
        .from('packages')
        .select('id, name, name_ar, price, validity_days, package_type, total_pulses')
        .eq('id', packageId)
        .maybeSingle();
      if (pkgRow) {
        packageRecord = pkgRow;
        packagePrice = Number(pkgRow.price ?? 0);
        if (!resolvedPackageName) resolvedPackageName = pkgRow.name || pkgRow.name_ar;
      }
    }

    // Resolve service metadata
    let resolvedServiceId = serviceId ? Number(serviceId) : null;
    if (isNaN(resolvedServiceId as number)) resolvedServiceId = null;
    let resolvedServiceName = serviceName || null;
    if (resolvedServiceId) {
      const { data: srvRow } = await supabaseServer
        .from('services')
        .select('id, en, ar, price')
        .eq('id', resolvedServiceId)
        .maybeSingle();
      if (srvRow) {
        if (!resolvedServiceName) resolvedServiceName = srvRow.en || srvRow.ar;
      }
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
    const srvNote = resolvedServiceName ? ` Service: ${resolvedServiceName}.` : '';
    const pkgNote = resolvedPackageName ? ` Package: ${resolvedPackageName}.` : '';

    // Construct package usage breakdown note
    let pkgUsageNote = '';
    const isPulsesPackage = packageRecord?.package_type === 'pulses' || (packageRecord?.total_pulses && Number(packageRecord.total_pulses) > 0) || (packagePulsesTotal != null && Number(packagePulsesTotal) > 0);
    const catalogTotalPulses = packagePulsesTotal != null ? Math.max(0, Math.floor(Number(packagePulsesTotal))) : Math.max(0, Math.floor(Number(packageRecord?.total_pulses || 0)));
    const pulsesUsed = packagePulsesUsed != null ? Math.max(0, Math.min(catalogTotalPulses, Math.floor(Number(packagePulsesUsed)))) : 0;
    const pulsesRemaining = packagePulsesRemaining != null ? Math.max(0, Math.min(catalogTotalPulses, Math.floor(Number(packagePulsesRemaining)))) : Math.max(0, catalogTotalPulses - pulsesUsed);

    if (packageId || resolvedPackageName) {
      if (isPulsesPackage && catalogTotalPulses > 0) {
        pkgUsageNote = ` [Package Usage]: ${pulsesUsed.toLocaleString()} / ${catalogTotalPulses.toLocaleString()} pulses used (${pulsesRemaining.toLocaleString()} pulses remaining).`;
      } else if (Array.isArray(packageItemsUsage) && packageItemsUsage.length > 0) {
        const usageParts = packageItemsUsage.map(
          (it: any) => `${it.serviceName || `Service #${it.serviceId}`}: ${it.qtyUsed ?? 0}/${it.qtyTotal ?? it.qty ?? 0} used (${it.qtyRemaining ?? 0} remaining)`
        );
        if (usageParts.length > 0) {
          pkgUsageNote = ` [Package Usage]: ${usageParts.join('; ')}.`;
        }
      }
    }

    const prodNote = resolvedProductName ? ` Product: ${resolvedProductName}.` : '';
    const valNote = parsedValue > 0 ? ` [Invoice Total]: ${parsedValue} EGP.` : '';
    const spentNote = ` Actual Spent: ${parsedPaid} EGP.`;
    const paymentNote = paymentType ? ` Payment Method: ${paymentType}.` : '';
    const userNote = notes ? ` ${notes}` : '';
    const receptionNote = `${historicalTag} Added manually for historical records.${srvNote}${pkgNote}${pkgUsageNote}${prodNote}${valNote}${spentNote}${paymentNote}${userNote}`.trim();

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
      service_ids: resolvedServiceId ? [resolvedServiceId] : [],
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

    // 7a. Insert product into reservation_products
    if (productId || resolvedProductName) {
      try {
        await supabaseServer.from('reservation_products').insert({
          reservation_id: newReservation.id,
          line_type: 'product',
          product_id: productId || null,
          description: resolvedProductName || 'Product',
          qty: 1,
          unit_price: productPrice,
          total: productPrice,
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
            product_id: productId || null,
            product_name: resolvedProductName || 'Product',
            quantity: 1,
            unit_price: productPrice,
            total_price: productPrice,
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

    // 7b. Insert package into reservation_products and customer_packages
    if (packageId || resolvedPackageName) {
      try {
        await supabaseServer.from('reservation_products').insert({
          reservation_id: newReservation.id,
          line_type: 'additional_service',
          description: resolvedPackageName ? `Package: ${resolvedPackageName}` : 'Package',
          qty: 1,
          unit_price: packagePrice,
          total: packagePrice,
          added_by_employee_id: staffEmployeeId,
          added_by_role: 'receptionist'
        });
      } catch (rpErr: any) {
        console.warn('Could not insert reservation_products for package (non-fatal):', rpErr?.message);
      }

      // Create or update active package record for patient profile
      const targetExistingPkgId = customerPackageId || existingCustomerPackageId;
      if (customerId && (targetExistingPkgId || packageId || packageRecord?.id)) {
        const pId = packageId || packageRecord?.id;
        const validityDays = Number(packageRecord?.validity_days || 365);
        const expiresAt = new Date(rawDate);
        expiresAt.setUTCDate(expiresAt.getUTCDate() + validityDays);

        // DEC-088 item 6: never guess the price. The entered invoice value is the package price only when
        // the booking is the package alone (a mixed booking's value cannot be split); otherwise the price is
        // left pending for staff to enter — NOT defaulted to the catalog price.
        const packageOnlyBooking = !resolvedServiceId && !resolvedProductName && !productId;
        const enteredPackagePrice = packageOnlyBooking && parsedValue > 0 ? parsedValue : null;
        const pricePending = enteredPackagePrice === null;

        const isServicesFullyUsed = Array.isArray(packageItemsUsage) && packageItemsUsage.length > 0
          ? packageItemsUsage.every((it: any) => Number(it.qtyRemaining ?? 0) <= 0)
          : false;
        const status = isPulsesPackage
          ? (catalogTotalPulses > 0 && pulsesRemaining <= 0 ? 'fully_used' : 'active')
          : (isServicesFullyUsed ? 'fully_used' : 'active');

        try {
          if (targetExistingPkgId) {
            // Update existing customer_packages record
            const { data: cp, error: cpErr } = await supabaseServer
              .from('customer_packages')
              .update({
                status,
                ...(isPulsesPackage
                  ? { pulses_used: pulsesUsed, pulses_remaining: pulsesRemaining }
                  : {})
              })
              .eq('id', targetExistingPkgId)
              .select('id')
              .maybeSingle();

            packageOutcome = {
              created: false,
              updated: Boolean(cp?.id),
              existingId: targetExistingPkgId,
              packageType: isPulsesPackage ? 'pulses' : 'services',
              totalPulses: isPulsesPackage ? catalogTotalPulses : 0,
              ...(cpErr ? { error: cpErr.message } : {})
            };

            // RISK-106: keep the pulses used before launch in the same audit trail
            // confirm_historical_package_price uses, so they stay visible to the deferred
            // balance and remain eligible for revenue recognition once linked to a booking.
            if (isPulsesPackage && cp?.id) {
              const sync = await syncPreLaunchPulseUsage({
                customerPackageId: targetExistingPkgId,
                quantityUsed: pulsesUsed,
                remainingAfter: pulsesRemaining,
                purchasedAt: `${rawDate.slice(0, 10)}T12:00:00Z`,
              });
              if (sync.status === 'failed') {
                console.warn('Could not sync pre-launch pulse usage (non-fatal):', sync.error);
                packageOutcome.pulseUsageSyncError = sync.error;
              }
            }

            if (Array.isArray(packageItemsUsage) && packageItemsUsage.length > 0) {
              for (const it of packageItemsUsage) {
                await supabaseServer
                  .from('customer_package_items')
                  .update({
                    qty_used: it.qtyUsed,
                    qty_remaining: it.qtyRemaining
                  })
                  .eq('customer_package_id', targetExistingPkgId)
                  .eq('service_id', it.serviceId);
              }
            }
          } else {
            // Insert fresh customer_packages record
            const { data: cp, error: cpErr } = await supabaseServer
              .from('customer_packages')
              .insert({
                customer_id: customerId,
                package_id: pId,
                purchased_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
                expires_at: expiresAt.toISOString(),
                price_paid: pricePending ? 0 : enteredPackagePrice,
                price_pending: pricePending,
                status,
                ...(isPulsesPackage
                  ? { package_type: 'pulses', total_pulses: catalogTotalPulses, pulses_used: pulsesUsed, pulses_remaining: pulsesRemaining }
                  : {})
              })
              .select('id')
              .maybeSingle();

            packageOutcome = {
              created: Boolean(cp?.id),
              pricePending,
              packageType: isPulsesPackage ? 'pulses' : 'services',
              totalPulses: isPulsesPackage ? catalogTotalPulses : 0,
              ...(cpErr ? { error: cpErr.message } : {}),
            };
            if (cpErr) console.error('Failed to create customer_packages record for historical booking:', cpErr.message);

            // RISK-106: same audit trail as the update branch above.
            if (isPulsesPackage && cp?.id) {
              const sync = await syncPreLaunchPulseUsage({
                customerPackageId: cp.id,
                quantityUsed: pulsesUsed,
                remainingAfter: pulsesRemaining,
                purchasedAt: `${rawDate.slice(0, 10)}T12:00:00Z`,
              });
              if (sync.status === 'failed') {
                console.warn('Could not sync pre-launch pulse usage (non-fatal):', sync.error);
                packageOutcome.pulseUsageSyncError = sync.error;
              }
            }

            if (cp?.id) {
              const { data: pkgItems } = await supabaseServer
                .from('package_items')
                .select('service_id, qty')
                .eq('package_id', pId);

              if (pkgItems && pkgItems.length > 0) {
                await supabaseServer.from('customer_package_items').insert(
                  pkgItems.map((item: any) => {
                    const usageMatch = Array.isArray(packageItemsUsage)
                      ? packageItemsUsage.find((u: any) => Number(u.serviceId) === Number(item.service_id))
                      : null;
                    const qtyTotal = Number(usageMatch?.qtyTotal ?? item.qty);
                    const qtyUsed = Number(usageMatch?.qtyUsed ?? 0);
                    const qtyRemaining = Number(usageMatch?.qtyRemaining ?? Math.max(0, qtyTotal - qtyUsed));

                    return {
                      customer_package_id: cp.id,
                      service_id: item.service_id,
                      qty_total: qtyTotal,
                      qty_used: qtyUsed,
                      qty_remaining: qtyRemaining
                    };
                  })
                );
              }
            }
          }
        } catch (cpErr: any) {
          console.warn('Could not process customer_packages record (non-fatal):', cpErr?.message);
          packageOutcome = { created: false, pricePending, packageType: isPulsesPackage ? 'pulses' : 'services', totalPulses: isPulsesPackage ? catalogTotalPulses : 0, error: cpErr?.message || String(cpErr) };
        }
      }
    }

    // 8. Record Financial Transaction (RISK-076) in `transactions` table
    if (parsedPaid > 0 && customerId) {
      const descItems: string[] = [];
      if (resolvedServiceName) descItems.push(`Service: ${resolvedServiceName}`);
      if (resolvedPackageName) descItems.push(`Package: ${resolvedPackageName}`);
      if (resolvedProductName) descItems.push(`Product: ${resolvedProductName}`);
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
        serviceName: resolvedServiceName,
        packageName: resolvedPackageName,
        productName: resolvedProductName,
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
      package: packageOutcome,
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
      packageId,
      packageName,
      customerPackageId,
      existingCustomerPackageId,
      packagePulsesTotal,
      packagePulsesUsed,
      packagePulsesRemaining,
      packageItemsUsage,
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

    const resolvedServiceId = serviceId ? Number(serviceId) : (existing.service_id ? Number(existing.service_id) : null);
    let resolvedServiceName = serviceName || null;
    if (resolvedServiceId && !resolvedServiceName) {
      const { data: svc } = await supabaseServer.from('services').select('id, en, ar').eq('id', resolvedServiceId).maybeSingle();
      if (svc) resolvedServiceName = svc.en || svc.ar || `Service #${svc.id}`;
    }

    // Fetch package details if packageId present
    let packageRecord: any = null;
    if (packageId) {
      const { data: pkgData } = await supabaseServer
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .maybeSingle();
      if (pkgData) packageRecord = pkgData;
    }

    // Construct package usage breakdown note
    let pkgUsageNote = '';
    const isPulsesPackage = packageRecord?.package_type === 'pulses' || (packageRecord?.total_pulses && Number(packageRecord.total_pulses) > 0) || (packagePulsesTotal != null && Number(packagePulsesTotal) > 0);
    const catalogTotalPulses = packagePulsesTotal != null ? Math.max(0, Math.floor(Number(packagePulsesTotal))) : Math.max(0, Math.floor(Number(packageRecord?.total_pulses || 0)));
    const pulsesUsed = packagePulsesUsed != null ? Math.max(0, Math.min(catalogTotalPulses, Math.floor(Number(packagePulsesUsed)))) : 0;
    const pulsesRemaining = packagePulsesRemaining != null ? Math.max(0, Math.min(catalogTotalPulses, Math.floor(Number(packagePulsesRemaining)))) : Math.max(0, catalogTotalPulses - pulsesUsed);

    if (packageId || packageName) {
      if (isPulsesPackage && catalogTotalPulses > 0) {
        pkgUsageNote = ` [Package Usage]: ${pulsesUsed.toLocaleString()} / ${catalogTotalPulses.toLocaleString()} pulses used (${pulsesRemaining.toLocaleString()} pulses remaining).`;
      } else if (Array.isArray(packageItemsUsage) && packageItemsUsage.length > 0) {
        const usageParts = packageItemsUsage.map(
          (it: any) => `${it.serviceName || `Service #${it.serviceId}`}: ${it.qtyUsed ?? 0}/${it.qtyTotal ?? it.qty ?? 0} used (${it.qtyRemaining ?? 0} remaining)`
        );
        if (usageParts.length > 0) {
          pkgUsageNote = ` [Package Usage]: ${usageParts.join('; ')}.`;
        }
      }
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
    const srvNote = resolvedServiceName ? ` Service: ${resolvedServiceName}.` : '';
    const pkgNote = packageName ? ` Package: ${packageName}.` : '';
    const prodNote = productName ? ` Product: ${productName}.` : '';
    const valNote = parsedValue > 0 ? ` [Invoice Total]: ${parsedValue} EGP.` : '';
    const spentNote = ` Actual Spent: ${parsedPaid} EGP.`;
    const paymentNote = paymentType ? ` Payment Method: ${paymentType}.` : '';
    const userNote = notes ? ` ${notes}` : '';
    const receptionNoteBase = `${historicalTag} Added manually for historical records.${srvNote}${pkgNote}${pkgUsageNote}${prodNote}${valNote}${spentNote}${paymentNote}${userNote}`.trim();
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
      service_ids: resolvedServiceId ? [resolvedServiceId] : [],
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

    // 10. 4b. If package is associated with this booking, update or create customer_packages record
    const targetPatchPkgId = customerPackageId || existingCustomerPackageId;
    if (existing.customer_id && (targetPatchPkgId || packageId || packageRecord?.id)) {
      const pId = packageId || packageRecord?.id;
      const isServicesFullyUsed = Array.isArray(packageItemsUsage) && packageItemsUsage.length > 0
        ? packageItemsUsage.every((it: any) => Number(it.qtyRemaining ?? 0) <= 0)
        : false;
      const status = isPulsesPackage
        ? (catalogTotalPulses > 0 && pulsesRemaining <= 0 ? 'fully_used' : 'active')
        : (isServicesFullyUsed ? 'fully_used' : 'active');

      try {
        let cpIdToUpdate = targetPatchPkgId;
        if (!cpIdToUpdate) {
          const { data: existingCp } = await supabaseServer
            .from('customer_packages')
            .select('id')
            .eq('customer_id', existing.customer_id)
            .eq('package_id', pId)
            .order('purchased_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existingCp?.id) {
            cpIdToUpdate = existingCp.id;
          }
        }

        if (cpIdToUpdate) {
          await supabaseServer
            .from('customer_packages')
            .update({
              status,
              ...(isPulsesPackage
                ? { package_type: 'pulses', total_pulses: catalogTotalPulses, pulses_used: pulsesUsed, pulses_remaining: pulsesRemaining }
                : {})
            })
            .eq('id', cpIdToUpdate);

          // RISK-106: same audit trail as POST, so a superadmin edit keeps pre-launch pulses
          // visible to the deferred balance and eligible for revenue recognition once linked.
          if (isPulsesPackage) {
            const sync = await syncPreLaunchPulseUsage({
              customerPackageId: cpIdToUpdate,
              quantityUsed: pulsesUsed,
              remainingAfter: pulsesRemaining,
              purchasedAt: `${rawDate.slice(0, 10)}T12:00:00Z`,
            });
            if (sync.status === 'failed') {
              console.warn('Could not sync pre-launch pulse usage during edit (non-fatal):', sync.error);
              warnings.push(`Pre-launch pulse sync failed: ${sync.error}`);
            }
          }

          if (Array.isArray(packageItemsUsage) && packageItemsUsage.length > 0) {
            for (const it of packageItemsUsage) {
              await supabaseServer
                .from('customer_package_items')
                .update({
                  qty_total: it.qtyTotal,
                  qty_used: it.qtyUsed,
                  qty_remaining: it.qtyRemaining
                })
                .eq('customer_package_id', cpIdToUpdate)
                .eq('service_id', it.serviceId);
            }
          }
        }
      } catch (cpUpdateErr: any) {
        console.warn('Could not update customer_packages record during edit:', cpUpdateErr?.message);
        warnings.push(`Package update failed: ${cpUpdateErr?.message}`);
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
              description: `${resolvedServiceName || 'Historical booking'} [historical backfill]`,
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
          serviceName: resolvedServiceName,
          packageName: packageName,
          productName: productName,
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
        if (resolvedServiceName) descItems.push(`Service: ${resolvedServiceName}`);
        if (packageName) descItems.push(`Package: ${packageName}`);
        if (productName) descItems.push(`Product: ${productName}`);
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
