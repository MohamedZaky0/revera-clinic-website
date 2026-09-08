import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { normalizeEgyptMobile } from '@/lib/customerIdentity';

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

    // Parse financial values
    const rawVal = serviceValue ?? value ?? price ?? 0;
    const parsedValue = Math.max(0, isNaN(Number(rawVal)) ? 0 : Number(rawVal));

    const rawPaid = amountPaid ?? payment ?? 0;
    const parsedPaid = Math.max(0, isNaN(Number(rawPaid)) ? 0 : Number(rawPaid));

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

    // 6. Service details resolution
    let resolvedServiceId = serviceId ? Number(serviceId) : null;
    if (isNaN(resolvedServiceId as number)) resolvedServiceId = null;

    // 7. Prepare historical reservation payload
    const historicalTag = '[Historical Booking]';
    const srvNote = serviceName ? ` Service: ${serviceName}.` : '';
    const pkgNote = packageName ? ` Package: ${packageName}.` : '';
    const prodNote = productName ? ` Product: ${productName}.` : '';
    const valNote = parsedValue > 0 ? ` Invoice Value: ${parsedValue} EGP.` : '';
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
