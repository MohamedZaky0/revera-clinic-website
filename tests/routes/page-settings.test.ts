/**
 * Route-level test for POST /api/page-settings — the shallow-merge data-loss bug
 * surfaced by Brief 26 Part 3.
 *
 * `savePageSettings()` in `src/app/admin/page.tsx:4328–4390` builds a `booking`
 * block that includes `minAdvance`, `maxAdvance`, `cancelWindow`, `maxPerSlot`,
 * `instantApproval`, `showDoctorNotes`, `depositPercentage`, and `termsText` —
 * but omits `staleSessionHours`. The POST handler at
 * `src/app/api/page-settings/route.ts:149–152` does a **shallow** merge:
 *
 *   const mergedValue = { ...existing?.value, ...body };
 *
 * Because the merge is shallow, the entire `booking` object from `body` replaces
 * the existing `booking` object. Any key not present in the payload is lost.
 * Every CMS save (any tab — Home, About, Services) calls `savePageSettings()`
 * which rebuilds the full payload including the incomplete `booking` block, so
 * `staleSessionHours` is silently destroyed on every save.
 *
 * This test seeds a row with `booking.staleSessionHours = 6`, POSTs the exact
 * payload shape `savePageSettings()` builds (without `staleSessionHours`), and
 * asserts the stored value. Marked `it.fails` per repo convention — the test
 * documents the bug so a future fix flips it green.
 *
 * Structure follows `tests/routes/roles-employees.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

// ── Fixed ids ─────────────────────────────────────────────────────────────────
const USER_ADMIN = 'u-admin-0000-0000-0000-000000000001';
const EMP_ADMIN = 'e-admin-0000-0000-0000-000000000001';

const fake = createSupabaseFake();
const mockAuthGetUser = fake.authGetUser;

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: (...args: any[]) => fake.authGetUser(...args),
    },
    from: (table: string) => fake.client.from(table),
  },
}));

import { POST } from '@/app/api/page-settings/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pageSettingsReq(body: any, token: string | null = 'admin-token'): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new Request('http://localhost:3000/api/page-settings', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** Seed an admin caller so `requireAdministratorAccess` passes. */
function seedAdminAuth() {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ADMIN } }, error: null });
  fake.seed('employee_accounts', [
    {
      id: EMP_ADMIN,
      employee_id: 'ADM-001',
      email: 'admin@clinic.test',
      role_name: 'admin',
      auth_user_id: USER_ADMIN,
    },
  ]);
  fake.seed('roles', [{ name: 'admin', permissions: [] }]);
}

/** Seed a `page_settings` row with a `booking` block that includes `staleSessionHours`. */
function seedPageSettings(bookingOverrides: Record<string, any> = {}) {
  fake.seed('page_settings', [
    {
      key: 'home',
      value: {
        hero: { slides: [], slides_ar: [] },
        booking: {
          minAdvance: 2,
          maxAdvance: 30,
          cancelWindow: 2,
          maxPerSlot: 1,
          instantApproval: false,
          showDoctorNotes: false,
          depositPercentage: 20,
          staleSessionHours: 6,
          termsText: 'X',
          ...bookingOverrides,
        },
      },
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.reset();
});

// ── Test: shallow-merge destroys staleSessionHours ───────────────────────────

describe('POST /api/page-settings — shallow-merge data-loss (staleSessionHours)', () => {
  /*
   * The payload below mirrors exactly what `savePageSettings()` builds at
   * `src/app/admin/page.tsx:4328–4390`. The `booking` block (lines 4380–4389)
   * includes eight fields but omits `staleSessionHours`. The route's shallow
   * merge replaces the entire `booking` object, so `staleSessionHours` is lost.
   */

  it.fails('preserves staleSessionHours across a CMS save', async () => {
    seedAdminAuth();
    seedPageSettings();

    // This is the exact payload shape savePageSettings() builds — no staleSessionHours.
    const payload = {
      hero: { slides: [], slides_ar: [] },
      about: { image1: '', image2: '', image3: '' },
      results: { pairs: [] },
      aboutPage: {
        whatWeDoImage1: '',
        whatWeDoImage2: '',
        whatWeDoList: [],
        whatWeDoListAr: [],
        faqTag: '',
        faqTagAr: '',
        faqHeading: '',
        faqHeadingAr: '',
        faqImage1: '',
        faqImage2: '',
        faqs: [],
        faqsAr: [],
      },
      howItWorks: {
        heading: '',
        description: '',
        headingAr: '',
        descriptionAr: '',
      },
      whyChooseUs: {
        yearsLabel: '',
        heading: '',
        description: '',
        quote: '',
        contactLabel: '',
        phone: '',
        yearsLabelAr: '',
        headingAr: '',
        descriptionAr: '',
        quoteAr: '',
        contactLabelAr: '',
        phoneAr: '',
        image1: '',
        image2: '',
      },
      footer: { serviceHours: [] },
      booking: {
        minAdvance: 2,
        maxAdvance: 30,
        cancelWindow: 2,
        maxPerSlot: 1,
        instantApproval: false,
        showDoctorNotes: false,
        depositPercentage: 20,
        termsText: 'X',
        // staleSessionHours is MISSING — this is the bug.
      },
    };

    const res = await POST(pageSettingsReq(payload));
    expect(res.status).toBe(200);

    // After the save, staleSessionHours should still be 6.
    // It won't be — the shallow merge replaced the entire booking object.
    // The supabase fake's upsert defaults to 'id' as conflict column, but
    // page_settings uses 'key' — so the upsert inserts a new row. Find it.
    const rows = fake.db.page_settings.filter((r: any) => r.key === 'home');
    const upserted = rows[rows.length - 1];
    expect(upserted.value.booking.staleSessionHours).toBe(6);
  });

  it('preserves top-level keys not included in the payload (shallow merge works at top level)', async () => {
    seedAdminAuth();
    seedPageSettings();

    // POST only the hero block — other top-level keys should survive the shallow merge.
    const res = await POST(
      pageSettingsReq({ hero: { slides: [{ welcome: 'Hi' }], slides_ar: [] } }),
    );
    expect(res.status).toBe(200);

    const rows = fake.db.page_settings.filter((r: any) => r.key === 'home');
    const upserted = rows[rows.length - 1];
    // booking survives at top level (shallow merge)…
    expect(upserted.value.booking).toBeDefined();
    expect(upserted.value.booking.minAdvance).toBe(2);
    // …but staleSessionHours is still there because we didn't touch booking.
    expect(upserted.value.booking.staleSessionHours).toBe(6);
  });
});
