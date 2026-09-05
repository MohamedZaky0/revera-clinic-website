import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getServiceDurationMinutes, ALL_15MIN_SLOTS, normaliseTo24hSlot } from '@/lib/services';

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// A doctor's day may be a single start..end window, or a real shifts[] array (split shift,
// e.g. 9am-1pm then 4pm-8pm). Falling back to start/end only when shifts is absent/empty
// matches admin/page.tsx's own shift-reading convention — see RISK/PROPOSAL-002 Phase 5 note
// on why treating a split shift as one collapsed window overstates available minutes.
function getDayShiftWindows(dayConfig: any): { start: string; end: string }[] {
  if (dayConfig?.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
    return dayConfig.shifts.filter((s: any) => s?.start && s?.end);
  }
  if (dayConfig?.start && dayConfig?.end) {
    return [{ start: dayConfig.start, end: dayConfig.end }];
  }
  return [];
}

// The whole session must fit inside one continuous shift — it must not span the gap between
// two shifts (e.g. a 1pm-4pm gap in a 9-1/4-8 split shift).
function sessionFitsWithinShift(
  slotTime: string,
  durationMinutes: number,
  windows: { start: string; end: string }[]
): boolean {
  const startMin = timeToMinutes(slotTime);
  const endMin = startMin + durationMinutes;
  return windows.some((w) => startMin >= timeToMinutes(w.start) && endMin <= timeToMinutes(w.end));
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
  const { data } = await supabaseServer.from('services').select('id, en, name, duration, duration_minutes');
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

async function fetchBranchServiceHours(branchId: string | null) {
  if (branchId && branchId !== 'All' && branchId !== 'null' && branchId !== 'undefined') {
    try {
      const { data, error } = await supabaseServer
        .from('branches')
        .select('service_hours')
        .eq('id', branchId)
        .maybeSingle();
      if (!error && data && Array.isArray(data.service_hours) && data.service_hours.length > 0) {
        return data.service_hours;
      }
    } catch (err) {
      console.error('Error fetching branch service hours:', err);
    }
  }
  return await fetchCachedServiceHours();
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
  const roomIds = data ? data.map((sr: any) => sr.room_id) : [];
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
  const sessionType = params.get('sessionType') || 'in_person';

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
    const dbServices = (await fetchCachedServices()) || [];
    const servicesMap = new Map<number, number>();
    for (const s of dbServices) {
      servicesMap.set(s.id, getServiceDurationMinutes(s));
    }

    let targetDuration = 30; // default 30 mins
    let selectedServiceNameEn = '';
    if (serviceId) {
      const selectedSvc = dbServices.find((s: any) => s.id === Number(serviceId));
      if (selectedSvc) {
        if (selectedSvc.duration_minutes || selectedSvc.duration) {
          targetDuration = getServiceDurationMinutes(selectedSvc);
        }
        selectedServiceNameEn = selectedSvc.en || selectedSvc.name || '';
        if (!selectedServiceNameEn) {
          try {
            const { data: fullSvc } = await supabaseServer
              .from('services')
              .select('en, name')
              .eq('id', Number(serviceId))
              .maybeSingle();
            if (fullSvc) {
              selectedServiceNameEn = (fullSvc as any).en || (fullSvc as any).name || '';
            }
          } catch (e) {
            console.warn("Could not load service details for name:", e);
          }
        }
      }
    }

    // Fetch service hours for this branch
    const serviceHours = await fetchBranchServiceHours(branchId);

    // Get all active clinical rooms for this branch (cached)
    let dbRooms = await fetchCachedRooms(branchId);
    if (dbRooms.length === 0) {
      dbRooms = [{ id: '00000000-0000-0000-0000-000000000000', name: 'Virtual Clinical Room', branch_id: branchId }];
    }

    // Fetch service rooms compatibility (cached)
    let activeCompRooms: { id: string; name: string }[] = [];
    if (serviceId) {
      const compRoomIds = await fetchCachedServiceRooms(Number(serviceId));
      if (compRoomIds.length > 0) {
        activeCompRooms = dbRooms.filter((r: any) => compRoomIds.includes(r.id));
      }
      if (activeCompRooms.length === 0) {
        activeCompRooms = dbRooms;
      }
    } else {
      activeCompRooms = dbRooms;
    }

    // Fetch active providers/doctors
    const { data: rawProviders, error: providersErr } = await supabaseServer
      .from('providers')
      .select('*');
    if (providersErr) throw providersErr;

    // Filter compatible providers
    const activeCompProviders = (rawProviders || []).filter((provider: any) => {
      // Inactive doctor check
      if (provider.active === false || provider.status === 'inactive') {
        return false;
      }
      // Branch check
      if (branchId) {
        const wdh = provider.working_days_hours;
        if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
          if (!wdh.branch_ids.includes(branchId)) {
            return false;
          }
        } else if (provider.branch_id && provider.branch_id !== branchId) {
          return false;
        }
      }
      // Service compatibility check
      if (selectedServiceNameEn && provider.services && provider.services.length > 0) {
        if (!provider.services.includes(selectedServiceNameEn)) {
          return false;
        }
      }
      return true;
    });

    const t1 = Date.now();
    console.log(`[API availability] Metadata load took ${t1 - t0}ms`);

    let q = supabaseServer
      .from('reservations')
      .select('date, time_slot, service_id, room_id, doctor_name')
      .eq('status', 'approved')
      .in('date', dateKeys);

    if (branchId) {
      q = q.eq('branch_id', branchId);
    }

    const t2 = Date.now();
    const { data: rows, error } = await q;
    const t3 = Date.now();
    console.log(`[API availability] Reservations DB Query took ${t3 - t2}ms`);

    if (error) throw error;

    // Group by date
    const groupedByDate = new Map<string, { timeSlot: string; serviceId: number; roomId: string | null; doctorName: string | null }[]>();
    for (const key of dateKeys) {
      groupedByDate.set(key, []);
    }
    if (rows) {
      for (const row of rows) {
        const key = String(row.date).slice(0, 10);
        if (groupedByDate.has(key)) {
          if (row.time_slot && row.service_id) {
            groupedByDate.get(key)!.push({
              timeSlot: row.time_slot,
              serviceId: row.service_id,
              roomId: row.room_id,
              doctorName: row.doctor_name
            });
          }
        }
      }
    }

    // Helper to get doctor schedule config on weekday
    const getDoctorDayConfig = (provider: any, weekday: string) => {
      if (!provider.working_days_hours) return null;
      const wdh = provider.working_days_hours;
      let config = wdh;
      if (wdh.branch_schedules && branchId && wdh.branch_schedules[branchId]) {
        config = wdh.branch_schedules[branchId];
      }
      if (config[sessionType]) {
        return config[sessionType][weekday] || null;
      }
      return config[weekday] || null;
    };

    const output = dateKeys.map((key) => {
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

      if (clinicClosed || activeCompProviders.length === 0 || (sessionType === 'in_person' && activeCompRooms.length === 0)) {
        return {
          date: key,
          approvedCount: slots.length,
          approvedSlots: slots.map(s => s.timeSlot),
          isAvailable: false
        };
      }

      const targetSlotsNeeded = Math.ceil(targetDuration / 15);
      let hasAvailableSlot = false;

      for (let i = 0; i <= ALL_15MIN_SLOTS.length - targetSlotsNeeded; i++) {
        const slotTime = ALL_15MIN_SLOTS[i];
        if (slotTime < clinicStart || slotTime >= clinicEnd) continue;

        let doctorFound = false;

        for (const doc of activeCompProviders) {
          const dayConfig = getDoctorDayConfig(doc, weekdayName);
          if (!dayConfig || !dayConfig.isOpen) continue;

          const shiftWindows = getDayShiftWindows(dayConfig);
          if (!sessionFitsWithinShift(slotTime, targetDuration, shiftWindows)) continue;

          let docFree = true;
          const docBookings = slots.filter(s => s.doctorName === doc.name);

          for (let k = 0; k < targetSlotsNeeded; k++) {
            const currentSlot = ALL_15MIN_SLOTS[i + k];
            if (currentSlot === undefined || currentSlot >= clinicEnd) {
              docFree = false;
              break;
            }

            for (const rb of docBookings) {
              const rbNorm = normaliseTo24hSlot(rb.timeSlot);
              if (!rbNorm) continue;
              const rbIdx = ALL_15MIN_SLOTS.indexOf(rbNorm);
              const rbDuration = servicesMap.get(rb.serviceId) ?? 30;
              const rbSlotsCount = Math.ceil(rbDuration / 15);

              const currentSlotIdx = i + k;
              if (currentSlotIdx >= rbIdx && currentSlotIdx < rbIdx + rbSlotsCount) {
                docFree = false;
                break;
              }
            }
            if (!docFree) break;
          }

          if (docFree) {
            doctorFound = true;
            break;
          }
        }

        if (!doctorFound) continue;

        if (sessionType === 'in_person') {
          let roomFound = false;

          for (const room of activeCompRooms) {
            let roomFree = true;
            const roomBookings = slots.filter(s => s.roomId === room.id);

            for (let k = 0; k < targetSlotsNeeded; k++) {
              const currentSlotIdx = i + k;
              if (currentSlotIdx >= ALL_15MIN_SLOTS.length || ALL_15MIN_SLOTS[currentSlotIdx] >= clinicEnd) {
                roomFree = false;
                break;
              }

              for (const rb of roomBookings) {
                const rbNorm = normaliseTo24hSlot(rb.timeSlot);
                if (!rbNorm) continue;
                const rbIdx = ALL_15MIN_SLOTS.indexOf(rbNorm);
                const rbDuration = servicesMap.get(rb.serviceId) ?? 30;
                const rbSlotsCount = Math.ceil(rbDuration / 15);

                if (currentSlotIdx >= rbIdx && currentSlotIdx < rbIdx + rbSlotsCount) {
                  roomFree = false;
                  break;
                }
              }
              if (!roomFree) break;
            }

            if (roomFree) {
              roomFound = true;
              break;
            }
          }

          if (roomFound) {
            hasAvailableSlot = true;
            break;
          }
        } else {
          hasAvailableSlot = true;
          break;
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

        if (clinicClosed || activeCompProviders.length === 0 || (sessionType === 'in_person' && activeCompRooms.length === 0) || slotTime < clinicStart || slotTime >= clinicEnd) {
          unavailableSlots.push(slotTime);
          continue;
        }

        let doctorFound = false;

        for (const doc of activeCompProviders) {
          const dayConfig = getDoctorDayConfig(doc, weekdayName);
          if (!dayConfig || !dayConfig.isOpen) continue;

          const shiftWindows = getDayShiftWindows(dayConfig);
          if (!sessionFitsWithinShift(slotTime, targetDuration, shiftWindows)) continue;

          let docFree = true;
          const docBookings = slots.filter(s => s.doctorName === doc.name);

          for (let k = 0; k < targetSlotsNeeded; k++) {
            const currentSlotIdx = i + k;
            if (currentSlotIdx >= ALL_15MIN_SLOTS.length || ALL_15MIN_SLOTS[currentSlotIdx] >= clinicEnd) {
              docFree = false;
              break;
            }

            for (const rb of docBookings) {
              const rbNorm = normaliseTo24hSlot(rb.timeSlot);
              if (!rbNorm) continue;
              const rbIdx = ALL_15MIN_SLOTS.indexOf(rbNorm);
              const rbDuration = servicesMap.get(rb.serviceId) ?? 30;
              const rbSlotsCount = Math.ceil(rbDuration / 15);

              if (currentSlotIdx >= rbIdx && currentSlotIdx < rbIdx + rbSlotsCount) {
                docFree = false;
                break;
              }
            }
            if (!docFree) break;
          }

          if (docFree) {
            doctorFound = true;
            break;
          }
        }

        if (!doctorFound) {
          unavailableSlots.push(slotTime);
          continue;
        }

        if (sessionType === 'in_person') {
          let roomFound = false;

          for (const room of activeCompRooms) {
            let roomFree = true;
            const roomBookings = slots.filter(s => s.roomId === room.id);

            for (let k = 0; k < targetSlotsNeeded; k++) {
              const currentSlotIdx = i + k;
              if (currentSlotIdx >= ALL_15MIN_SLOTS.length || ALL_15MIN_SLOTS[currentSlotIdx] >= clinicEnd) {
                roomFree = false;
                break;
              }

              for (const rb of roomBookings) {
                const rbNorm = normaliseTo24hSlot(rb.timeSlot);
                if (!rbNorm) continue;
                const rbIdx = ALL_15MIN_SLOTS.indexOf(rbNorm);
                const rbDuration = servicesMap.get(rb.serviceId) ?? 30;
                const rbSlotsCount = Math.ceil(rbDuration / 15);

                if (currentSlotIdx >= rbIdx && currentSlotIdx < rbIdx + rbSlotsCount) {
                  roomFree = false;
                  break;
                }
              }
              if (!roomFree) break;
            }

            if (roomFree) {
              roomFound = true;
              break;
            }
          }

          if (roomFound) {
            availableSlots.push(slotTime);
          } else {
            unavailableSlots.push(slotTime);
          }
        } else {
          availableSlots.push(slotTime);
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
