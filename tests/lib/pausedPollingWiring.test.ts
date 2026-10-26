/**
 * RISK-136 / DEC-130: the admin shell and the doctor view are too large to mount in a unit test, so
 * this pins the wiring of the polling fixes in the source, the way profileFinancialWriters.test.ts
 * does. The behaviour itself is covered by tests/components/visiblePoll.test.tsx and
 * tests/lib/adminDirectory.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = readFileSync(path.join(__dirname, '../../src/app/admin/page.tsx'), 'utf8');
const DOCTOR = readFileSync(path.join(__dirname, '../../src/components/admin/DoctorAccountView.tsx'), 'utf8');

describe('admin shell polls (src/app/admin/page.tsx)', () => {
  it('runs the 15 s booking poll through startVisiblePoll and stands down in the doctor workspace', () => {
    expect(PAGE).toMatch(/return startVisiblePoll\(poll, 15000\);/);
    expect(PAGE).toMatch(/if \(showDoctorWorkspace\) return;/);
    expect(PAGE).toMatch(/\[branch, session\?\.access_token, showDoctorWorkspace\]/);
    expect(PAGE).not.toMatch(/timerId = setTimeout\(poll, 15000\)/);
  });

  it('runs the HR alerts poll through startVisiblePoll, not a bare setInterval', () => {
    expect(PAGE).toMatch(/startVisiblePoll\(fetchHrAlerts, intervalMs, \{ immediate: true \}\)/);
    expect(PAGE).not.toMatch(/setInterval\(\(\) => \{\s*fetchHrAlerts\(\);/);
  });

  it('asks for roles and employees only for roles the server lets through', () => {
    expect(PAGE).toMatch(/!canLoadAdminDirectory\(adminRoleRef\.current\)\) return;/);
    expect(PAGE).not.toMatch(/loadJson\(['"]\/api\/(roles|employees)['"]\)/);
  });
});

describe('doctor view (src/components/admin/DoctorAccountView.tsx)', () => {
  it('polls every 15 s, not every 3 s', () => {
    expect(DOCTOR).toMatch(/const DOCTOR_POLL_MS = 15000;/);
    expect(DOCTOR).toMatch(/\}, DOCTOR_POLL_MS\);/);
    expect(DOCTOR).not.toMatch(/\}, 3000\);/);
  });

  it('does not send a limit the route ignores (a clinic-wide cap would hide the doctor\'s own older bookings)', () => {
    expect(DOCTOR).not.toMatch(/api\/reservations\?limit=/);
  });
});
