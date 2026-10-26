/**
 * RISK-140 / DEC-134: the PUBLIC projection of a doctor (`providers` row).
 *
 * `GET /api/providers` is called by the public booking popup without a login, so what an anonymous
 * caller receives must be limited to what that popup (and the website) actually shows or computes
 * with. This is an ALLOW-LIST: every field is named here on purpose, and anything not named (phone,
 * email, national id, salary, commission settings, age, gender, bookings count, and every key a
 * future column adds) is absent by construction. Do not turn it into "copy the row and delete the
 * secret fields".
 *
 * Public fields:
 *   id, name, specialty, image, services, rating, active, branchId, workingDaysHours
 *
 * `workingDaysHours` is the booking schedule the popup reads (BookingModal: branch_ids,
 * branch_schedules[branchId], per-weekday isOpen/start/end/shifts, and the in_person / online
 * sub-maps). It is rebuilt key by key as well, because the same JSON column also holds `email`,
 * `employment_type`, `languages` and `session_type` (stashed there by POST/PATCH /api/providers).
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const SESSION_MAPS = ['in_person', 'online'] as const;

type Json = Record<string, any>;

function isObj(v: unknown): v is Json {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function publicShift(s: unknown): Json | null {
  if (!isObj(s) || typeof s.start !== 'string' || typeof s.end !== 'string') return null;
  return { start: s.start, end: s.end };
}

function publicDay(d: unknown): Json | null {
  if (!isObj(d)) return null;
  const out: Json = { isOpen: Boolean(d.isOpen) };
  if (typeof d.start === 'string') out.start = d.start;
  if (typeof d.end === 'string') out.end = d.end;
  if (Array.isArray(d.shifts)) {
    out.shifts = d.shifts.map(publicShift).filter((s): s is Json => s !== null);
  }
  return out;
}

function publicDayMap(m: unknown): Json {
  const out: Json = {};
  if (!isObj(m)) return out;
  for (const day of WEEKDAYS) {
    const d = publicDay(m[day]);
    if (d) out[day] = d;
  }
  return out;
}

/** A schedule config: weekdays directly, and/or an `in_person` / `online` map of weekdays. */
function publicConfig(c: unknown): Json {
  const out: Json = publicDayMap(c);
  if (!isObj(c)) return out;
  for (const key of SESSION_MAPS) {
    if (isObj(c[key])) out[key] = publicDayMap(c[key]);
  }
  return out;
}

export function publicSchedule(w: unknown): Json | null {
  if (!isObj(w)) return null;
  const out: Json = publicConfig(w);
  if (Array.isArray(w.branch_ids)) {
    out.branch_ids = w.branch_ids.filter((b: unknown) => typeof b === 'string' || typeof b === 'number');
  }
  if (isObj(w.branch_schedules)) {
    const schedules: Json = {};
    for (const [branchId, cfg] of Object.entries(w.branch_schedules)) {
      if (branchId === '__proto__' || !isObj(cfg)) continue;
      schedules[branchId] = publicConfig(cfg);
    }
    out.branch_schedules = schedules;
  }
  return out;
}

/**
 * Accepts a `providers` row (snake_case) and, for the local-JSON fallback file, an entry already in
 * the mapped camelCase shape. Always returns exactly the same set of keys.
 */
export function mapPublicProvider(p: Record<string, any>) {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty || null,
    image: p.image || null,
    services: Array.isArray(p.services) ? p.services.filter((s: unknown) => typeof s === 'string') : [],
    rating: Number(p.rating || 0),
    active: p.active !== false,
    branchId: p.branch_id || p.branchId || null,
    workingDaysHours: publicSchedule(p.working_days_hours ?? p.workingDaysHours),
  };
}

/** The exact key set of a public provider (used by tests and documentation). */
export const PUBLIC_PROVIDER_KEYS = [
  'id',
  'name',
  'specialty',
  'image',
  'services',
  'rating',
  'active',
  'branchId',
  'workingDaysHours',
] as const;
