import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'reservations.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8') || '[]'); } catch (e) { return []; }
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const serviceId = params.get('serviceId');
  // default window: next 30 days
  const days = Number(params.get('days') || '30');

  const data = readData();

  const results: { date: string; approvedCount: number; approvedSlots: string[] }[] = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  for (let i=0;i<days;i++){
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    const key = formatDate(d);
    const approved = data.filter((r: any) => r.status === 'approved' && r.date === key && (!serviceId || String(r.serviceId) === serviceId));
    results.push({ date: key, approvedCount: approved.length, approvedSlots: approved.map((a:any)=>a.timeSlot).filter(Boolean) });
  }

  return NextResponse.json(results);
}
