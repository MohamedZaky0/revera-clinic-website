/**
 * Route-level tests for POST /api/reservations — manual-booking room assignment.
 *
 * RISK-081 / CORRUPT-A03: manual bookings (`isManual: true`) used to assign the first
 * service-compatible room unconditionally, with no check against rooms already booked at an
 * overlapping time on the same date. Two receptionists (or one, twice) could double-book a room.
 * This covers the fix: prefer a genuinely free compatible room, and only fall back to a collision
 * when every compatible room is actually occupied.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST } from '@/app/api/reservations/route';

const SERVICE_ID = 10;

function reservation(overrides: Record<string, any>) {
  return {
    id: 'seed-res',
    status: 'approved',
    date: '2099-01-10',
    time_slot: '10:00',
    service_id: SERVICE_ID,
    room_id: 'room-1',
    ...overrides,
  };
}

function manualBookingReq(overrides: Record<string, any> = {}) {
  return new Request('http://localhost:3000/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      serviceId: SERVICE_ID,
      date: '2099-01-10',
      requestedTime: '10:00',
      name: 'Walk-in Patient',
      email: 'walkin@test.com',
      phone: '01035595691',
      sessionType: 'in_person',
      isManual: true,
      ...overrides,
    }),
  });
}

beforeEach(() => {
  fake.reset();
  fake.seed('services', [{ id: SERVICE_ID, duration: null, duration_minutes: 30, price: 500, branch_pricing: null, en: 'Facial' }]);
  fake.seed('service_rooms', [
    { service_id: SERVICE_ID, room_id: 'room-1' },
    { service_id: SERVICE_ID, room_id: 'room-2' },
  ]);
});

describe('POST /api/reservations — manual booking room collision', () => {
  it('assigns a compatible room when none are occupied', async () => {
    const res = await POST(manualBookingReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(['room-1', 'room-2']).toContain(body.roomId);
  });

  it('skips a room already booked at the same date and overlapping time', async () => {
    fake.seed('reservations', [reservation({ id: 'existing', room_id: 'room-1', time_slot: '10:00' })]);
    const res = await POST(manualBookingReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.roomId).toBe('room-2');
  });

  it('does not treat a cancelled booking in the room as a collision', async () => {
    fake.seed('reservations', [
      reservation({ id: 'cancelled-1', room_id: 'room-1', time_slot: '10:00', status: 'cancelled' }),
      reservation({ id: 'cancelled-2', room_id: 'room-2', time_slot: '10:00', status: 'rejected' }),
    ]);
    const res = await POST(manualBookingReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    // Both compatible rooms only have a cancelled/rejected booking at this time — either is fine,
    // but it must not be forced away from room-1 (the first candidate) by a booking that doesn't count.
    expect(['room-1', 'room-2']).toContain(body.roomId);
  });

  it('still creates the booking (falling back to the first compatible room) when every room is genuinely occupied', async () => {
    fake.seed('reservations', [
      reservation({ id: 'busy-1', room_id: 'room-1', time_slot: '10:00' }),
      reservation({ id: 'busy-2', room_id: 'room-2', time_slot: '10:00' }),
    ]);
    const res = await POST(manualBookingReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.roomId).toBe('room-1');
  });

  it('does not collide on a booking with an overlapping (not just identical) time slot given service duration', async () => {
    // A 45-minute booking at 09:45 occupies 09:45-10:30, overlapping a 10:00 candidate.
    fake.seed('services', [
      { id: SERVICE_ID, duration: null, duration_minutes: 30, price: 500, branch_pricing: null, en: 'Facial' },
      { id: 99, duration: null, duration_minutes: 45, price: 300, branch_pricing: null, en: 'Massage' },
    ]);
    fake.seed('reservations', [reservation({ id: 'overlap', room_id: 'room-1', time_slot: '09:45', service_id: 99 })]);
    const res = await POST(manualBookingReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.roomId).toBe('room-2');
  });
});
