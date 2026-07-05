import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getDurationInMinutes, ALL_15MIN_SLOTS, normaliseTo24hSlot } from '@/lib/services';

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Simple in-memory cache for database resources (stable definitions)
let cachedServices: any[] | null = null;
let cachedServicesExpiry = 0;

let cachedPageSettings: any = null;
let cachedPageSettingsExpiry = 0;

const roomsCache: Record<string, { rooms: any[]; expiry: number }> = {};
const serviceRoomsCache: Record<number, { roomIds: string[]; expiry: number }> = {};

const CACHE_TTL = 15000; // 15 seconds cache for database entities

async function fetchCachedServices() {
  const now = Date.now();
  if (cachedServices && now < cachedServicesExpiry) {
    return cachedServices;
  }
  const { data } = await supabaseServer.from('services').select('id, duration');
  cachedServices = data || [];
  cachedServicesExpiry = now + CACHE_TTL;
  return cachedServices;
}

async function fetchCachedServiceHours() {
  const now = Date.now();
  if (cachedPageSettings && now < cachedPageSettingsExpiry) {
    return cachedPageSettings;
  }
  const { data } = await supabaseServer
    .from('page_settings')
    .select('value')
    .eq('key', 'home')
    .maybeSingle();
  cachedPageSettings = data?.value?.footer?.serviceHours || [];
  cachedPageSettingsExpiry = now + CACHE_TTL;
  return cachedPageSettings;
}

async function fetchCachedRooms(branchId: string | null) {
  const key = branchId || 'all';
  const now = Date.now();
  if (roomsCache[key] && now < roomsCache[key].expiry) {
    return roomsCache[key].rooms;
  }
  let query = supabaseServer
    .from('rooms')
    .select('id, name, branch_id')
    .eq('type', 'clinical')
    .eq('status', 'available');
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  const { data } = await query;
  const list = data || [];
  roomsCache[key] = {
    rooms: list,
    expiry: now + CACHE_TTL
  };
  return list;
}

async function fetchCachedServiceRooms(serviceId: number) {
  const now = Date.now();
  if (serviceRoomsCache[serviceId] && now < serviceRoomsCache[serviceId].expiry) {
    return serviceRoomsCache[serviceId].roomIds;
  }
  const { data } = await supabaseServer
    .from('service_rooms')
    .select('room_id')
    .eq('service_id', serviceId);
  const roomIds = data ? data.map(sr => sr.room_id) : [];
  serviceRoomsCache[serviceId] = {
    roomIds,
    expiry: now + CACHE_TTL
  };
  return roomIds;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const serviceId = params.get('serviceId');
  const branchId = params.get('branchId');
  const days = Number(params.get('days') || '30');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateParam = params.get('date');
  const dateKeys: string[] = [];
  
  if (dateParam) {
    dateKeys.push(dateParam);
  } else {
    const days = Number(params.get('days') || '30');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dateKeys.push(formatDate(d));
    }
  }

  try {
    const t0 = Date.now();
    const dbServices = await fetchCachedServices();
    const servicesMap = new Map<number, number>();
    for (const s of dbServices) {
      servicesMap.set(s.id, getDurationInMinutes(s.duration));
    }

    let targetDuration = 30; // default 30 mins
    if (serviceId) {
      const selectedSvc = dbServices.find((s: any) => s.id === Number(serviceId));
      if (selectedSvc && selectedSvc.duration) {
        targetDuration = getDurationInMinutes(selectedSvc.duration);
      }
    }

    // Fetch clinic-wide service hours from page settings (cached)
    const serviceHours = await fetchCachedServiceHours();

    // Get all active clinical rooms for this branch (cached)
    const dbRooms = await fetchCachedRooms(branchId);

    // Fetch service rooms compatibility (cached)
    let activeCompRooms: { id: string; name: string }[] = [];
    if (serviceId) {
      const compRoomIds = await fetchCachedServiceRooms(Number(serviceId));
      activeCompRooms = dbRooms.filter((r: any) => compRoomIds.includes(r.id));
    }
    const t1 = Date.now();
    console.log(`[API availability] Metadata load took ${t1 - t0}ms`);

    let q = supabaseServer
      .from('reservations')
      .select('date, time_slot, service_id, room_id')
      .eq('status', 'approved')
      .in('date', dateKeys)
      .not('room_id', 'is', null);

    if (branchId) {
      q = q.eq('branch_id', branchId);
    }

    const t2 = Date.now();
    const { data: rows, error } = await q;
    const t3 = Date.now();
    console.log(`[API availability] Reservations DB Query took ${t3 - t2}ms`);

    if (error) throw error;

    // Group by date
    const groupedByDate = new Map<string, { timeSlot: string; serviceId: number; roomId: string }[]>();
    for (const key of dateKeys) {
      groupedByDate.set(key, []);
    }
    if (rows) {
      for (const row of rows) {
        const key = String(row.date).slice(0, 10);
        if (groupedByDate.has(key)) {
          if (row.time_slot && row.service_id && row.room_id) {
            groupedByDate.get(key)!.push({
              timeSlot: row.time_slot,
              serviceId: row.service_id,
              roomId: row.room_id
            });
          }
        }
      }
    }

    const output = dateKeys.map((key) => {
      const slots = groupedByDate.get(key) ?? [];
      
      // Calculate weekday name
      const dateObj = new Date(key);
      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weekdayName = weekdays[dateObj.getDay()];

      const clinicDay = serviceHours.find(
        (sh: any) => sh.day?.toLowerCase() === weekdayName.toLowerCase()
      );

      let clinicStart = "09:00";
      let clinicEnd = "20:00";
      let clinicClosed = false;

      if (clinicDay) {
        if (!clinicDay.isOpen) {
          clinicClosed = true;
        } else {
          clinicStart = clinicDay.openTime || "09:00";
          clinicEnd = clinicDay.closeTime || "20:00";
        }
      }

      if (clinicClosed || activeCompRooms.length === 0) {
        return {
          date: key,
          approvedCount: slots.length,
          approvedSlots: slots.map(s => s.timeSlot),
          isAvailable: false
        };
      }

      // Calculate availability for target service
      const targetSlotsNeeded = Math.ceil(targetDuration / 15);
      let hasAvailableSlot = false;

      for (const room of activeCompRooms) {
        const isOccupied = new Array(ALL_15MIN_SLOTS.length).fill(false);
        
        // Mask slots outside clinic operating hours
        for (let i = 0; i < ALL_15MIN_SLOTS.length; i++) {
          const slotTime = ALL_15MIN_SLOTS[i];
          if (slotTime < clinicStart || slotTime >= clinicEnd) {
            isOccupied[i] = true;
          }
        }

        // Mask occupied slots for approved bookings assigned to this room on this date
        const roomSlots = slots.filter(s => s.roomId === room.id);
        for (const r of roomSlots) {
          const norm = normaliseTo24hSlot(r.timeSlot);
          if (norm) {
            const idx = ALL_15MIN_SLOTS.indexOf(norm);
            if (idx >= 0) {
              const resDuration = servicesMap.get(r.serviceId) ?? 30;
              const resSlotsOccupied = Math.ceil(resDuration / 15);
              for (let k = 0; k < resSlotsOccupied; k++) {
                if (idx + k < isOccupied.length) {
                  isOccupied[idx + k] = true;
                }
              }
            }
          }
        }

        // Check if this room has at least one starting slot that fits targetSlotsNeeded contiguous free slots
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

        if (hasAvailableSlot) {
          break; // found at least one room that is available for this slot, so this date has availability
        }
      }

      return {
        date: key,
        approvedCount: slots.length,
        approvedSlots: slots.map(s => s.timeSlot),
        isAvailable: hasAvailableSlot
      };
    });

    if (dateParam) {
      const key = dateParam;
      const slots = groupedByDate.get(key) ?? [];
      
      const dateObj = new Date(key);
      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weekdayName = weekdays[dateObj.getDay()];

      const clinicDay = serviceHours.find(
        (sh: any) => sh.day?.toLowerCase() === weekdayName.toLowerCase()
      );

      let clinicStart = "09:00";
      let clinicEnd = "20:00";
      let clinicClosed = false;

      if (clinicDay) {
        if (!clinicDay.isOpen) {
          clinicClosed = true;
        } else {
          clinicStart = clinicDay.openTime || "09:00";
          clinicEnd = clinicDay.closeTime || "20:00";
        }
      }

      const targetSlotsNeeded = Math.ceil(targetDuration / 15);
      const availableSlots: string[] = [];
      const unavailableSlots: string[] = [];

      for (let i = 0; i < ALL_15MIN_SLOTS.length; i++) {
        const slotTime = ALL_15MIN_SLOTS[i];
        
        if (clinicClosed || activeCompRooms.length === 0 || slotTime < clinicStart || slotTime >= clinicEnd) {
          unavailableSlots.push(slotTime);
          continue;
        }

        let slotIsFreeInAtLeastOneRoom = false;

        for (const room of activeCompRooms) {
          const isRoomOccupied = (slotIdx: number) => {
            const roomBookings = slots.filter(s => s.roomId === room.id);
            for (const r of roomBookings) {
              const norm = normaliseTo24hSlot(r.timeSlot);
              if (norm) {
                const idx = ALL_15MIN_SLOTS.indexOf(norm);
                if (idx >= 0) {
                  const resDuration = servicesMap.get(r.serviceId) ?? 30;
                  const resSlotsOccupied = Math.ceil(resDuration / 15);
                  if (slotIdx >= idx && slotIdx < idx + resSlotsOccupied) {
                    return true;
                  }
                }
              }
            }
            return false;
          };

          let fit = true;
          for (let k = 0; k < targetSlotsNeeded; k++) {
            const slotIdx = i + k;
            if (slotIdx >= ALL_15MIN_SLOTS.length || ALL_15MIN_SLOTS[slotIdx] >= clinicEnd || isRoomOccupied(slotIdx)) {
              fit = false;
              break;
            }
          }

          if (fit) {
            slotIsFreeInAtLeastOneRoom = true;
            break;
          }
        }

        if (slotIsFreeInAtLeastOneRoom) {
          availableSlots.push(slotTime);
        } else {
          unavailableSlots.push(slotTime);
        }
      }

      return NextResponse.json({
        date: key,
        availableSlots,
        unavailableSlots
      });
    }

    return NextResponse.json(output);
  } catch (err) {
    console.error('GET /api/availability error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
