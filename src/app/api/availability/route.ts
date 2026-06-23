import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getDurationInMinutes, ALL_15MIN_SLOTS, normaliseTo24hSlot } from '@/lib/services';

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
  const branchId = params.get('branchId');
  const days = Number(params.get('days') || '30');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dateKeys.push(formatDate(d));
  }

  try {
    let targetDuration = 30; // default 30 mins
    if (serviceId) {
      const { data: svc } = await supabaseServer
        .from('services')
        .select('duration')
        .eq('id', Number(serviceId))
        .single();
      if (svc && svc.duration) {
        targetDuration = getDurationInMinutes(svc.duration);
      }
    }

    let q = supabaseServer
      .from('reservations')
      .select('date, time_slot')
      .eq('status', 'approved')
      .in('date', dateKeys);

    if (serviceId) {
      q = q.eq('service_id', Number(serviceId));
    }
    if (branchId) {
      q = q.eq('branch_id', branchId);
    }

    const { data: rows, error } = await q;

    if (error) throw error;

    // Group by date
    const groupedByDate = new Map<string, string[]>();
    for (const key of dateKeys) {
      groupedByDate.set(key, []);
    }
    if (rows) {
      for (const row of rows) {
        const key = String(row.date).slice(0, 10);
        if (groupedByDate.has(key)) {
          if (row.time_slot) groupedByDate.get(key)!.push(row.time_slot);
        }
      }
    }

    const output = dateKeys.map((key) => {
      const slots = groupedByDate.get(key) ?? [];
      
      // Calculate availability for target service
      const isOccupied = new Array(ALL_15MIN_SLOTS.length).fill(false);
      const targetSlotsNeeded = Math.ceil(targetDuration / 15);
      
      // Mark occupied slots for each approved booking
      for (const s of slots) {
        const norm = normaliseTo24hSlot(s);
        if (norm) {
          const idx = ALL_15MIN_SLOTS.indexOf(norm);
          if (idx >= 0) {
            for (let k = 0; k < targetSlotsNeeded; k++) {
              if (idx + k < isOccupied.length) {
                isOccupied[idx + k] = true;
              }
            }
          }
        }
      }

      // Check if there is at least one starting slot that fits targetSlotsNeeded contiguous free slots
      let hasAvailableSlot = false;
      for (let i = 0; i <= ALL_15MIN_SLOTS.length - targetSlotsNeeded; i++) {
        let fit = true;
        for (let k = 0; k < targetSlotsNeeded; k++) {
          if (isOccupied[i + k]) {
            fit = false;
            break;
          }
        }
        if (fit) {
          hasAvailableSlot = true;
          break;
        }
      }

      return {
        date: key,
        approvedCount: slots.length,
        approvedSlots: slots,
        isAvailable: hasAvailableSlot
      };
    });

    return NextResponse.json(output);
  } catch (err) {
    console.error('GET /api/availability error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
