import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { normalizeEgyptMobile } from '@/lib/customerIdentity';
import { recordTransaction } from '@/lib/transactionLedger';

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
    if (packageId) {
      const { data: pkgRow } = await supabaseServer
        .from('packages')
        .select('id, name, name_ar, price, validity_days')
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

    // ── FINANCIAL LEDGER BALANCE CALCULATIONS ──
    // diff > 0: underpaid (cost exceeds payment) -> debt added to outstanding
    // diff < 0: overpaid (payment exceeds cost) -> settles outstanding debt first, excess credited to wallet
    // diff === 0: exact payment -> no change to debt or wallet
    let newOutstanding = currentOutstanding;
    let newWallet = currentWallet;
    let newSpent = currentSpent + parsedPaid;

    const diff = parsedValue - parsedPaid;

    if (diff > 0) {
      // Patient owes `diff`. If they have existing wallet credit, utilize wallet first.
      if (newWallet > 0) {
        if (newWallet >= diff) {
          newWallet = newWallet - diff;
        } else {
          const remainingDebt = diff - newWallet;
          newWallet = 0;
          newOutstanding = newOutstanding + remainingDebt;
        }
      } else {
        newOutstanding = newOutstanding + diff;
      }
    } else if (diff < 0) {
      // Patient overpaid by `overpaid`. Settle existing outstanding debt first, remainder goes to wallet.
      const overpaid = -diff;
      if (newOutstanding > 0) {
        if (overpaid <= newOutstanding) {
          newOutstanding = newOutstanding - overpaid;
        } else {
          const remainder = overpaid - newOutstanding;
          newOutstanding = 0;
          newWallet = newWallet + remainder;
        }
      } else {
        newWallet = newWallet + overpaid;
      }
    }

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
    const prodNote = resolvedProductName ? ` Product: ${resolvedProductName}.` : '';
    const valNote = parsedValue > 0 ? ` [Invoice Total]: ${parsedValue} EGP.` : '';
    const spentNote = ` Actual Spent: ${parsedPaid} EGP.`;
    const paymentNote = paymentType ? ` Payment Method: ${paymentType}.` : '';
    const userNote = notes ? ` ${notes}` : '';
    const receptionNote = `${historicalTag} Added manually for historical records.${srvNote}${pkgNote}${prodNote}${valNote}${spentNote}${paymentNote}${userNote}`.trim();

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

      // Create active package record for patient profile
      if (customerId && (packageId || packageRecord?.id)) {
        const pId = packageId || packageRecord?.id;
        const validityDays = Number(packageRecord?.validity_days || 365);
        const expiresAt = new Date(rawDate);
        expiresAt.setUTCDate(expiresAt.getUTCDate() + validityDays);

        try {
          const { data: cp, error: cpErr } = await supabaseServer
            .from('customer_packages')
            .insert({
              customer_id: customerId,
              package_id: pId,
              purchased_at: `${rawDate.slice(0, 10)}T12:00:00Z`,
              expires_at: expiresAt.toISOString(),
              price_paid: packagePrice,
              status: 'active'
            })
            .select('id')
            .maybeSingle();

          if (cp?.id) {
            const { data: pkgItems } = await supabaseServer
              .from('package_items')
              .select('service_id, qty')
              .eq('package_id', pId);

            if (pkgItems && pkgItems.length > 0) {
              await supabaseServer.from('customer_package_items').insert(
                pkgItems.map((item: any) => ({
                  customer_package_id: cp.id,
                  service_id: item.service_id,
                  qty_total: item.qty,
                  qty_used: 0,
                  qty_remaining: item.qty
                }))
              );
            }
          }
        } catch (cpErr: any) {
          console.warn('Could not insert customer_packages record (non-fatal):', cpErr?.message);
        }
      }
    }

    // 8. Record Financial Transaction (RISK-076) in `transactions` table
    if (parsedPaid > 0 && customerId) {
      let standardMethod = 'cash';
      if (paymentType) {
        const pLower = paymentType.toLowerCase();
        if (pLower.includes('card') || pLower.includes('visa') || pLower.includes('mastercard')) standardMethod = 'card';
        else if (pLower.includes('instapay')) standardMethod = 'instapay';
        else if (pLower.includes('wallet')) standardMethod = 'wallet';
        else if (pLower.includes('transfer')) standardMethod = 'transfer';
        else if (pLower.includes('vodafone') || pLower.includes('cash')) standardMethod = 'cash';
        else standardMethod = paymentType;
      }

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
        paymentMethod: standardMethod,
        status: 'completed',
        source: 'manual',
        reason: notes || 'Historical booking payment',
        createdByEmployeeId: staffEmployeeId,
        createdByName: staffEmployeeName,
        occurredAt: `${rawDate.slice(0, 10)}T12:00:00Z`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Historical booking added successfully.',
      booking: newReservation,
      customer: customerRecord,
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
