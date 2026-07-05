import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getDurationInMinutes, ALL_15MIN_SLOTS, normaliseTo24hSlot } from '@/lib/services';

/**
 * pg returns DATE columns as JavaScript Date objects set to UTC midnight.
 * toISOString().slice(0,10) on a UTC-midnight Date is always correct (no tz shift).
 * String() on a Date gives "Mon Jun 22 ..." which breaks everything — never use that.
 */
function fmtDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10); // already a YYYY-MM-DD string
}

function mapRow(r: Record<string, any>) {
  return {
    id: r.id,
    serviceId: r.service_id,
    date: fmtDate(r.date),
    requestedTime: r.requested_time,
    name: r.name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    status: r.status,
    timeSlot: r.time_slot,
    sessionType: r.session_type,
    doctorName: r.doctor_name,
    createdAt: r.created_at,
    branchId: r.branch_id ?? null,
    customerId: r.customer_id ?? null,
    amountPaid: r.amount_paid ?? 0,
    amountLeft: r.amount_left ?? null,
    roomId: r.room_id ?? null,
    rooms: r.rooms || [],
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const status = params.get('status');
  const serviceId = params.get('serviceId');
  const date = params.get('date');
  const branchId = params.get('branchId');

  try {
    let q = supabaseServer
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);
    if (serviceId) q = q.eq('service_id', Number(serviceId));
    if (date) q = q.eq('date', date);
    // Include bookings that match this branch OR have no branch set (website bookings without branch)
    if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);

    const { data: rows, error } = await q;

    if (error) throw error;
    return NextResponse.json(rows ? rows.map(mapRow) : []);
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, date, requestedTime, name, email, phone, notes, sessionType, branchId, doctorName } = body;

    if (!serviceId || !date || !name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    let customerId: string | null = null;
    try {
      const { data: customer, error: customerError } = await supabaseServer
        .from('customers')
        .select('id, number_of_bookings')
        .eq('mobile', phone)
        .maybeSingle();

      if (customerError) {
        console.error('Customer lookup error:', customerError);
      }

      if (customer) {
        customerId = customer.id;
        const newBookings = (customer.number_of_bookings || 0) + 1;
        await supabaseServer
          .from('customers')
          .update({ number_of_bookings: newBookings })
          .eq('id', customerId);
      } else {
        const { data: newCustomer, error: createError } = await supabaseServer
          .from('customers')
          .insert({
            name,
            mobile: phone,
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

    // 2. Insert reservation linked to customer
    const { data, error } = await supabaseServer
      .from('reservations')
      .insert({
        service_id: Number(serviceId),
        date,
        requested_time: requestedTime || null,
        name,
        email,
        phone,
        notes: notes || '',
        status: 'pending',
        time_slot: null,
        session_type: sessionType || 'in_person',
        branch_id: branchId || null,
        customer_id: customerId,
        amount_paid: body.amountPaid !== undefined ? Number(body.amountPaid) : 0,
        amount_left: body.amountLeft !== undefined ? Number(body.amountLeft) : null,
        doctor_name: doctorName || null,
        rooms: compRoomIds,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(mapRow(data), { status: 201 });
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json();
    const { action, timeSlot, status, doctorName, notes, sessionType, amountPaid, amountLeft } = body;

    const { data: target, error: findError } = await supabaseServer
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'approve') {
      if (!timeSlot) return NextResponse.json({ error: 'Missing timeSlot' }, { status: 400 });

      // Get all active, available clinical rooms in this branch
      let roomsQuery = supabaseServer
        .from('rooms')
        .select('id, name')
        .eq('type', 'clinical')
        .eq('status', 'available');

      if (target.branch_id) {
        roomsQuery = roomsQuery.eq('branch_id', target.branch_id);
      }

      const { data: branchRooms, error: roomsError } = await roomsQuery;
      if (roomsError) throw roomsError;

      if (!branchRooms || branchRooms.length === 0) {
        return NextResponse.json({ error: 'No active clinical rooms found for this branch.' }, { status: 400 });
      }

      // Find compatible rooms for the service
      const { data: mappedRooms, error: mappingError } = await supabaseServer
        .from('service_rooms')
        .select('room_id')
        .eq('service_id', target.service_id);

      if (mappingError) throw mappingError;

      const mappedRoomIds = mappedRooms ? mappedRooms.map((mr: any) => mr.room_id) : [];
      const serviceCompRooms = branchRooms.filter((r: any) => mappedRoomIds.includes(r.id));

      if (serviceCompRooms.length === 0) {
        return NextResponse.json({ error: 'No clinical rooms are configured to perform this service in this branch.' }, { status: 400 });
      }

      // Fetch target service duration
      const { data: targetSvc, error: svcError } = await supabaseServer
        .from('services')
        .select('duration')
        .eq('id', target.service_id)
        .single();

      if (svcError) throw svcError;

      const targetDuration = targetSvc?.duration ? getDurationInMinutes(targetSvc.duration) : 30;
      const targetSlotsCount = Math.ceil(targetDuration / 15);

      const normSlot = normaliseTo24hSlot(timeSlot);
      if (!normSlot) return NextResponse.json({ error: 'Invalid time slot format' }, { status: 400 });

      const startIdx = ALL_15MIN_SLOTS.indexOf(normSlot);
      if (startIdx === -1) return NextResponse.json({ error: 'Invalid time slot value' }, { status: 400 });

      // Fetch all approved bookings for this date
      const { data: dayBookings, error: bookingsError } = await supabaseServer
        .from('reservations')
        .select('id, room_id, time_slot, service_id')
        .eq('date', target.date)
        .eq('status', 'approved')
        .not('room_id', 'is', null);

      if (bookingsError) throw bookingsError;

      // Fetch all service durations to calculate overlap
      const { data: allSvcs, error: allSvcsError } = await supabaseServer
        .from('services')
        .select('id, duration');

      if (allSvcsError) throw allSvcsError;

      const durationMap = new Map<number, number>();
      if (allSvcs) {
        allSvcs.forEach((s: any) => {
          durationMap.set(s.id, getDurationInMinutes(s.duration));
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

      if (availableRooms.length === 0) {
        return NextResponse.json({ error: 'No clinical rooms are available at this time slot.' }, { status: 400 });
      }

      let chosenRoom = availableRooms[0];

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

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update({
          status: 'approved',
          time_slot: timeSlot,
          doctor_name: doctorName || null,
          room_id: chosenRoom.id,
          rooms: serviceCompRooms.map((r: any) => r.id)
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

    } else if (status || notes !== undefined || doctorName !== undefined || sessionType !== undefined || amountPaid !== undefined || amountLeft !== undefined) {
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (doctorName !== undefined) updates.doctor_name = doctorName;
      if (sessionType !== undefined) updates.session_type = sessionType;
      if (amountPaid !== undefined) updates.amount_paid = amountPaid;
      if (amountLeft !== undefined) updates.amount_left = amountLeft;

      const { data: updated, error: updateError } = await supabaseServer
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
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
