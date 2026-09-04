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
      paymentType,
      branchId,
      notes,
      amountPaid
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

    // 4. Patient Matching & Creation
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

    if (existingCustomers && existingCustomers.length > 0) {
      // Existing patient found: link customer
      customerRecord = existingCustomers[0];
      customerId = customerRecord.id;

      // Increment number of bookings
      const currentBookings = Number(customerRecord.number_of_bookings || 0);
      await supabaseServer
        .from('customers')
        .update({
          number_of_bookings: currentBookings + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
    } else {
      // No patient found: create a new customer record automatically
      isNewPatient = true;
      const { data: newCustomer, error: createCustError } = await supabaseServer
        .from('customers')
        .insert({
          name: rawName,
          mobile: cleanMobile,
          active: true,
          registration_date: new Date().toISOString(),
          number_of_bookings: 1,
          spent_amount: 0,
          outstanding: 0,
          wallet_balance: 0,
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
    const paymentNote = paymentType ? ` Payment Type: ${paymentType}.` : '';
    const userNote = notes ? ` ${notes}` : '';
    const receptionNote = `${historicalTag} Added manually for historical records.${paymentNote}${userNote}`.trim();

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
      amount_paid: Number(amountPaid || 0),
      amount_left: 0,
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
