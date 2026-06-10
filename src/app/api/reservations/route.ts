import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'reservations.json');

type Reservation = {
  id: string;
  serviceId: number;
  date: string; // yyyy-mm-dd
  requestedTime?: string | null; // optional user-picked time (display)
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  timeSlot?: string | null; // assigned time when approved, HH:MM 24h
  createdAt: string;
};

function readData(): Reservation[] {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeData(items: Reservation[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), 'utf8');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const status = params.get('status');
  const serviceId = params.get('serviceId');
  const date = params.get('date');

  const data = readData();
  let out = data;
  if (status) out = out.filter((r) => r.status === status);
  if (serviceId) out = out.filter((r) => String(r.serviceId) === serviceId);
  if (date) out = out.filter((r) => r.date === date);

  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { serviceId, date, requestedTime, name, email, phone, notes } = body;
  if (!serviceId || !date || !name || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const data = readData();
  const id = String(Date.now()) + '-' + Math.floor(Math.random() * 1000);
  const item: Reservation = {
    id,
    serviceId: Number(serviceId),
    date,
    requestedTime: requestedTime || null,
    name,
    email,
    phone,
    notes: notes || '',
    status: 'pending',
    timeSlot: null,
    createdAt: new Date().toISOString(),
  };
  data.push(item);
  writeData(data);
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const id = params.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const { action, timeSlot, status } = body; // action: approve/reject

  const data = readData();
  const idx = data.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const target = data[idx];

  if (action === 'approve') {
    if (!timeSlot) return NextResponse.json({ error: 'Missing timeSlot' }, { status: 400 });
    // check already approved count for this service+date
    const approved = data.filter((r) => r.serviceId === target.serviceId && r.date === target.date && r.status === 'approved');
    if (approved.length >= 8) {
      return NextResponse.json({ error: 'Day is fully booked' }, { status: 400 });
    }
    // ensure timeSlot not already taken
    if (approved.some((a) => a.timeSlot === timeSlot)) {
      return NextResponse.json({ error: 'Time slot already taken' }, { status: 400 });
    }
    data[idx] = { ...target, status: 'approved', timeSlot };
  } else if (action === 'reject') {
    data[idx] = { ...target, status: 'rejected' };
  } else if (status) {
    data[idx] = { ...target, status };
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  writeData(data);
  return NextResponse.json(data[idx]);
}
