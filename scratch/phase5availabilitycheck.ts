// Regression check for task 5.4 (RISK/PROPOSAL-002 Phase 5): a split-shift provider (e.g.
// 9am-1pm, then 4pm-8pm) was previously collapsed to one 9am-8pm window in
// src/app/api/availability/route.ts, overstating available minutes by the size of the gap.
// This seeds a branch, service, provider and clinical room with a real split shift and confirms
// GET /api/availability?date=... excludes slots inside the gap while still offering slots inside
// each real shift.
//
//   npm run dev   (in one terminal)
//   npx tsx scratch/phase5availabilitycheck.ts   (in another)
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });

const BASE_URL = process.env.PHASE5_CHECK_BASE_URL || 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

let failed = 0;
function checkTrue(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(70)}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
}

const cleanup: Array<() => Promise<void>> = [];
async function runCleanup() {
  for (const fn of cleanup.slice().reverse()) {
    try {
      await fn();
    } catch (e) {
      console.error('cleanup error:', e);
    }
  }
}

function nextWeekdayDateStr(targetWeekday: number): string {
  // Same parsing convention the route itself uses (new Date('YYYY-MM-DD').getDay()) so the
  // computed weekday name lines up with what the server will resolve for this date string.
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const str = `${y}-${m}-${day}`;
    if (new Date(str).getDay() === targetWeekday) return str;
  }
  throw new Error('could not find target weekday within 14 days');
}

async function main() {
  const stamp = Date.now();
  const dateStr = nextWeekdayDateStr(1); // Monday
  const weekdayName = 'Monday';

  // Note: `branches.service_hours` does not actually exist on the live table (DB_SCHEMA.md is
  // stale here — confirmed by direct query while writing this check) and the global
  // page_settings('home').footer.serviceHours fallback is also empty on this dev DB, so the
  // route's hardcoded default (09:00-20:00, every day) is what actually governs clinic hours
  // today. That default is wide enough to contain both this fixture's shifts, so no service-hours
  // setup is needed here — this check is scoped to the shift-collapse bug (5.4), not the
  // separate service_hours drift (worth its own follow-up, not fixed by this task).
  const { data: branch, error: branchErr } = await admin
    .from('branches')
    .insert({
      name_en: `Phase5 Check Branch ${stamp}`,
      name_ar: `Phase5 Check Branch ${stamp}`,
      address_en: 'x',
      address_ar: 'x',
      status: 'active',
    })
    .select()
    .single();
  if (branchErr || !branch) throw new Error(`branch insert failed: ${branchErr?.message}`);
  cleanup.push(async () => { await admin.from('branches').delete().eq('id', branch.id); });

  const { data: room, error: roomErr } = await admin
    .from('rooms')
    .insert({ name: `Phase5 Check Room ${stamp}`, type: 'clinical', status: 'available', branch_id: branch.id })
    .select()
    .single();
  if (roomErr || !room) throw new Error(`room insert failed: ${roomErr?.message}`);
  cleanup.push(async () => { await admin.from('rooms').delete().eq('id', room.id); });

  const { data: service, error: svcErr } = await admin
    .from('services')
    .insert({ en: `Phase5 Check Service ${stamp}`, ar: `Phase5 Check Service ${stamp}`, price: 100, unit: 'session', duration_minutes: 60 })
    .select()
    .single();
  if (svcErr || !service) throw new Error(`service insert failed: ${svcErr?.message}`);
  cleanup.push(async () => { await admin.from('services').delete().eq('id', service.id); });

  // Split shift: 09:00-13:00, then 16:00-20:00. start/end deliberately set to the old collapsed
  // window (09:00-20:00) so this fixture would have passed under the pre-fix logic and only
  // fails once the fix correctly reads shifts[] instead.
  const { data: provider, error: provErr } = await admin
    .from('providers')
    .insert({
      name: `Phase5 Check Provider ${stamp}`,
      services: [],
      working_days_hours: {
        [weekdayName]: {
          isOpen: true,
          start: '09:00',
          end: '20:00',
          shifts: [
            { start: '09:00', end: '13:00' },
            { start: '16:00', end: '20:00' },
          ],
        },
      },
    })
    .select()
    .single();
  if (provErr || !provider) throw new Error(`provider insert failed: ${provErr?.message}`);
  cleanup.push(async () => { await admin.from('providers').delete().eq('id', provider.id); });

  const res = await fetch(
    `${BASE_URL}/api/availability?serviceId=${service.id}&branchId=${branch.id}&date=${dateStr}`
  );
  const json: any = await res.json();
  checkTrue('GET /api/availability => 200', res.status === 200, res.status);

  const available: string[] = json.availableSlots || [];
  console.log('availableSlots:', available);

  // Inside shift 1 (09:00-13:00), a 60-min session must fit starting at 09:00 and at 12:00 (ends 13:00).
  checkTrue('09:00 (start of shift 1) is available', available.includes('09:00'));
  checkTrue('12:00 (last slot fully inside shift 1, ends 13:00) is available', available.includes('12:00'));
  // A 60-min session starting at 12:15 would end at 13:15, past shift 1's end -> must not be offered.
  checkTrue('12:15 (would spill past shift 1 end) is NOT available', !available.includes('12:15'));
  // The gap itself: 13:00-16:00 has no shift covering it at all.
  checkTrue('13:00 (inside the gap) is NOT available', !available.includes('13:00'));
  checkTrue('14:00 (inside the gap) is NOT available', !available.includes('14:00'));
  checkTrue('15:00 (inside the gap) is NOT available', !available.includes('15:00'));
  // Inside shift 2 (16:00-20:00).
  checkTrue('16:00 (start of shift 2) is available', available.includes('16:00'));
  checkTrue('19:00 (last slot fully inside shift 2, ends 20:00) is available', available.includes('19:00'));
  checkTrue('19:15 (would spill past shift 2 end) is NOT available', !available.includes('19:15'));

  await runCleanup();
  console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  await runCleanup();
  process.exit(1);
});
