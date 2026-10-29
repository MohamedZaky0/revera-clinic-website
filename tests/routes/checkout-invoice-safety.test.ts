/**
 * DEC-139 / RISK-143: safety of the invoice that already exists when a booking is checked out
 * (created at manual-booking time, DEC-135) and of the payments appended to it afterwards.
 *
 * A code review of commit 23f103b found:
 *  1. writeCheckoutInvoice rewrote an existing invoice by deleting every line and then inserting
 *     the authoritative ones - a failed insert left the invoice with totals and no lines.
 *  2. appendPaymentToExistingInvoice lost its `status = 'issued'` filter and could attach a
 *     payment to a void invoice; it also let a failing next_invoice_no RPC break the payment.
 *  3. Manual-booking / auto-created invoices were written with status 'paid', which the
 *     database CHECK (draft | issued | void) rejects - so the insert failed silently, burned an
 *     invoice number, and left the booking with no invoice at all.
 *
 * supabaseFake has no failure injection, so `from()` is wrapped here to force an insert/delete
 * failure on `invoice_lines` on demand.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

const hooks = { failLineInsert: false, failLineDeleteCalls: 0 };

function failed(message: string) {
  const result = { data: null, error: { message } };
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: any, rej: any) => Promise.resolve(result).then(res, rej),
  };
  return chain;
}

function wrappedFrom(table: string) {
  const b = fake.client.from(table);
  if (table === 'invoice_lines') {
    const origInsert = b.insert.bind(b);
    b.insert = (rows: any) => (hooks.failLineInsert ? failed('forced invoice_lines insert failure') : origInsert(rows));
    const origDelete = b.delete.bind(b);
    b.delete = () => {
      if (hooks.failLineDeleteCalls > 0) {
        hooks.failLineDeleteCalls -= 1;
        return failed('forced invoice_lines delete failure');
      }
      return origDelete();
    };
  }
  return b;
}

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args), getClaims: (...args: any[]) => fake.authGetClaims(...args) },
    from: (table: string) => wrappedFrom(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { PATCH, POST, appendPaymentToExistingInvoice } from '@/app/api/reservations/route';
import { GET as getInvoice } from '@/app/api/invoices/route';

const RES_ID = 'res-1';
const CUSTOMER_ID = 'cust-1';
const PROVIDER_ID = 'prov-1';
const BRANCH_ID = 'branch-1';
const EMP_ID = 'emp-1';
const USER_ID = 'user-1';
const SERVICE_ID = 10;
const VALID_INVOICE_STATUSES = ['draft', 'issued', 'void'];

function baseReservation(overrides: Record<string, any> = {}) {
  return {
    id: RES_ID, status: 'confirmed', date: '2026-01-10', time_slot: '10:00', requested_time: '10:00',
    name: 'Test Patient', email: 'patient@test.com', phone: '01035595691', notes: '', session_type: 'in_person',
    branch_id: BRANCH_ID, customer_id: CUSTOMER_ID, amount_paid: 0, amount_left: null, room_id: null, rooms: [],
    created_by_employee_id: null, doctor_name: 'Dr. Sara', provider_id: PROVIDER_ID, follow_up_date: null,
    started_at: null, actual_duration_minutes: null, completed_at: null, cancelled_at: null, approved_at: null,
    service_id: SERVICE_ID, service_ids: [SERVICE_ID], is_manual: false,
    ...overrides,
  };
}

function patchReq(body: any) {
  return new Request(`http://localhost:3000/api/reservations?id=${RES_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer staff-token' },
    body: JSON.stringify(body),
  });
}

function seedStaffAuth() {
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', email: 'r@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

/** An invoice as written at manual-booking time: one provisional line, optional deposit payment. */
function seedBookingTimeInvoice(opts: { id?: string; invoiceNo?: string; status?: string; createdAt?: string; deposit?: number } = {}) {
  const id = opts.id ?? 'inv-1';
  const invoice = {
    id, invoice_no: opts.invoiceNo ?? 'INV-000009', reservation_id: RES_ID, customer_id: CUSTOMER_ID, branch_id: BRANCH_ID,
    subtotal: 500, discount_total: 0, grand_total: 500, status: opts.status ?? 'issued',
    created_at: opts.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
  return {
    invoice,
    line: {
      id: `${id}-line-old`, invoice_id: id, line_type: 'service', service_id: SERVICE_ID, description: 'Facial (provisional)',
      qty: 1, unit_price: 500, discount: 0, tax_rate: 0, line_total: 500, created_at: '2026-01-01T00:00:00.000Z',
    },
    payment: opts.deposit
      ? { id: `${id}-pay-0`, invoice_id: id, amount: opts.deposit, method: 'cash', reference: invoice.invoice_no }
      : null,
  };
}

function seedInvoices(entries: ReturnType<typeof seedBookingTimeInvoice>[]) {
  fake.seed('invoices', entries.map((e) => e.invoice));
  fake.seed('invoice_lines', entries.map((e) => e.line));
  fake.seed('payments', entries.map((e) => e.payment).filter(Boolean) as any[]);
}

let txnSeq = 1001;

beforeEach(() => {
  fake.reset();
  hooks.failLineInsert = false;
  hooks.failLineDeleteCalls = 0;
  txnSeq = 1001;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  for (const t of [
    'reservations', 'customers', 'employee_accounts', 'roles', 'providers', 'branches', 'rooms', 'service_rooms',
    'services', 'reservation_products', 'invoices', 'invoice_lines', 'payments', 'service_consumables',
    'service_devices', 'inventory_products', 'inventory_devices', 'consumption_entries', 'stock_movements',
    'device_maintenance_history', 'page_settings', 'transactions',
  ]) {
    fake.seed(t, []);
  }
  seedStaffAuth();
  fake.seed('services', [{ id: SERVICE_ID, price: 500, branch_pricing: null, en: 'Facial', duration_minutes: 30 }]);
  fake.seed('branches', [{ id: BRANCH_ID, name_en: 'Downtown', name_ar: null }]);
  fake.seed('customers', [{ id: CUSTOMER_ID, wallet_balance: 0, spent_amount: 0, outstanding: 0 }]);
  fake.seed('providers', [{
    id: PROVIDER_ID, commission_type: 'percentage', commission_value: 15,
    commission_fixed_component: 0, commission_base: 'gross', service_commissions: [],
  }]);
});

// ── 1. Rewriting the lines of an existing invoice must never strand it without lines ──────────

describe('checkout over an existing invoice - line rewrite is insert-first', () => {
  it('replaces the provisional lines with the authoritative ones and keeps the same invoice', async () => {
    const e = seedBookingTimeInvoice({ deposit: 200 });
    seedInvoices([e]);
    fake.seed('reservations', [baseReservation({ amount_paid: 200, amount_left: 300, is_manual: true })]);

    const res = await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(200);

    const invoices = fake.rows('invoices').filter((i) => i.reservation_id === RES_ID);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].id).toBe('inv-1');
    expect(invoices[0].invoice_no).toBe('INV-000009');
    const lines = fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-1');
    expect(lines).toHaveLength(1);
    expect(lines[0].id).not.toBe('inv-1-line-old'); // the authoritative line, not the provisional one
    expect(lines[0].commission_snapshot).toBe(75); // costed
    // deposit row kept, only the new money appended
    const pays = fake.rows('payments').filter((p) => p.invoice_id === 'inv-1').map((p) => p.amount).sort((a, b) => a - b);
    expect(pays).toEqual([200, 300]);
  });

  it('keeps the old lines and the old totals when inserting the new lines fails', async () => {
    const e = seedBookingTimeInvoice({ deposit: 200 });
    // Different totals than the checkout will compute, so a premature header update is detectable.
    e.invoice.grand_total = 450; e.invoice.subtotal = 450; e.invoice.discount_total = 0;
    seedInvoices([e]);
    fake.seed('reservations', [baseReservation({ amount_paid: 200, amount_left: 300, is_manual: true })]);
    hooks.failLineInsert = true;

    await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));

    const lines = fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-1');
    expect(lines.map((l) => l.id)).toEqual(['inv-1-line-old']);
    const invoice = fake.rows('invoices').find((i) => i.id === 'inv-1')!;
    expect(invoice.grand_total).toBe(450);
    // and no payment was recorded against an invoice whose rewrite failed
    expect(fake.rows('payments').filter((p) => p.invoice_id === 'inv-1')).toHaveLength(1);
  });

  it('restores the old header and drops the new lines when deleting the old lines fails', async () => {
    const e = seedBookingTimeInvoice({ deposit: 200 });
    e.invoice.grand_total = 450; e.invoice.subtotal = 450;
    seedInvoices([e]);
    fake.seed('reservations', [baseReservation({ amount_paid: 200, amount_left: 300, is_manual: true })]);
    hooks.failLineDeleteCalls = 1; // only the removal of the OLD lines fails; the rollback delete works

    await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));

    const lines = fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-1');
    expect(lines.map((l) => l.id)).toEqual(['inv-1-line-old']); // no duplicates, no loss
    const invoice = fake.rows('invoices').find((i) => i.id === 'inv-1')!;
    expect(invoice.grand_total).toBe(450);
    expect(invoice.subtotal).toBe(450);
  });

  it('the no-existing-invoice path is unchanged: one new invoice, one line, one payment', async () => {
    fake.seed('reservations', [baseReservation()]);
    const res = await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(200);
    const invoices = fake.rows('invoices');
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({ status: 'issued', grand_total: 500 });
    expect(fake.rows('invoice_lines')).toHaveLength(1);
    expect(fake.rows('payments')).toMatchObject([{ amount: 500, reference: invoices[0].invoice_no }]);
  });
});

// ── 3. Which invoice a checkout reuses ──────────────────────────────────────────────────────

describe('checkout over an existing invoice - which invoice is reused', () => {
  it('never reuses (or resurrects) a void invoice: a fresh invoice is written instead', async () => {
    const voided = seedBookingTimeInvoice({ id: 'inv-void', invoiceNo: 'INV-000005', status: 'void', deposit: 100 });
    seedInvoices([voided]);
    fake.seed('reservations', [baseReservation({ amount_paid: 0 })]);

    await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));

    const voidInvoice = fake.rows('invoices').find((i) => i.id === 'inv-void')!;
    expect(voidInvoice.status).toBe('void');
    expect(fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-void').map((l) => l.id)).toEqual(['inv-void-line-old']);
    const live = fake.rows('invoices').filter((i) => i.reservation_id === RES_ID && i.status !== 'void');
    expect(live).toHaveLength(1);
    expect(live[0].id).not.toBe('inv-void');
    // the 500 is recorded on the live invoice, not on the void one
    const livePays = fake.rows('payments').filter((p) => p.invoice_id === live[0].id);
    expect(livePays.map((p) => p.amount)).toEqual([500]);
  });

  it('with several invoices, reuses the newest non-void one and leaves the others alone', async () => {
    const older = seedBookingTimeInvoice({ id: 'inv-old', invoiceNo: 'INV-000003', createdAt: '2026-01-01T00:00:00.000Z' });
    const newerVoid = seedBookingTimeInvoice({ id: 'inv-void', invoiceNo: 'INV-000004', status: 'void', createdAt: '2026-01-02T00:00:00.000Z' });
    seedInvoices([older, newerVoid]);
    fake.seed('reservations', [baseReservation({ amount_paid: 0 })]);

    await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));

    expect(fake.rows('invoices').filter((i) => i.reservation_id === RES_ID)).toHaveLength(2); // no third invoice
    expect(fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-void').map((l) => l.id)).toEqual(['inv-void-line-old']);
    const reusedLines = fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-old');
    expect(reusedLines).toHaveLength(1);
    expect(reusedLines[0].id).not.toBe('inv-old-line-old');
  });

  it('a zero-total existing invoice with no lines is filled in at checkout', async () => {
    const e = seedBookingTimeInvoice();
    e.invoice.subtotal = 0; e.invoice.grand_total = 0;
    fake.seed('invoices', [e.invoice]); // no lines, no payments
    fake.seed('reservations', [baseReservation()]);

    const res = await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(200);
    const invoice = fake.rows('invoices').find((i) => i.id === 'inv-1')!;
    expect(invoice.grand_total).toBe(500);
    expect(fake.rows('invoice_lines').filter((l) => l.invoice_id === 'inv-1')).toHaveLength(1);
    expect(fake.rows('payments').filter((p) => p.invoice_id === 'inv-1').map((p) => p.amount)).toEqual([500]);
  });
});

// ── 2. appendPaymentToExistingInvoice ───────────────────────────────────────────────────────

describe('appendPaymentToExistingInvoice - which invoice may take a payment', () => {
  it('never appends to a void invoice and returns false so the caller records a standalone transaction', async () => {
    seedInvoices([seedBookingTimeInvoice({ id: 'inv-void', status: 'void' })]);

    const ok = await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null);

    expect(ok).toBe(false);
    expect(fake.rows('payments')).toHaveLength(0);
    expect(fake.rows('transactions')).toHaveLength(0);
  });

  it('skips a newer void invoice and appends to the older issued one', async () => {
    seedInvoices([
      seedBookingTimeInvoice({ id: 'inv-issued', invoiceNo: 'INV-000003', createdAt: '2026-01-01T00:00:00.000Z' }),
      seedBookingTimeInvoice({ id: 'inv-void', invoiceNo: 'INV-000004', status: 'void', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]);

    const ok = await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null);

    expect(ok).toBe(true);
    const pays = fake.rows('payments');
    expect(pays).toHaveLength(1);
    expect(pays[0].invoice_id).toBe('inv-issued');
  });

  it('does not append to a draft invoice either', async () => {
    seedInvoices([seedBookingTimeInvoice({ id: 'inv-draft', status: 'draft' })]);
    expect(await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null)).toBe(false);
    expect(fake.rows('payments')).toHaveLength(0);
  });

  it('with several issued invoices (does not throw), appends to the newest', async () => {
    seedInvoices([
      seedBookingTimeInvoice({ id: 'inv-a', invoiceNo: 'INV-000003', createdAt: '2026-01-01T00:00:00.000Z' }),
      seedBookingTimeInvoice({ id: 'inv-b', invoiceNo: 'INV-000004', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]);
    expect(await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null)).toBe(true);
    expect(fake.rows('payments').map((p) => p.invoice_id)).toEqual(['inv-b']);
  });

  it('PATCH on a completed booking whose only invoice is void records a standalone outstanding_payment', async () => {
    seedInvoices([seedBookingTimeInvoice({ id: 'inv-void', status: 'void' })]);
    fake.seed('reservations', [baseReservation({ status: 'completed', amount_paid: 300, amount_left: 200 })]);

    const res = await PATCH(patchReq({ amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(200);

    expect(fake.rows('payments')).toHaveLength(0);
    const txns = fake.rows('transactions').filter((t) => t.reservation_id === RES_ID);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: 'outstanding_payment', amount: 200 });
    expect(txns[0].invoice_id ?? null).toBeNull();
  });
});

describe('appendPaymentToExistingInvoice - the payment reference degrades gracefully', () => {
  it('a failing next_invoice_no (error result) does not fail the payment and the reference stays unique', async () => {
    seedInvoices([seedBookingTimeInvoice({ deposit: 200 })]);
    fake.setRpc('next_invoice_no', () => ({ data: null, error: { message: 'rpc down' } }));

    expect(await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null)).toBe(true);
    expect(await appendPaymentToExistingInvoice(RES_ID, 50, EMP_ID, 'cash', null)).toBe(true);

    const pays = fake.rows('payments').filter((p) => p.invoice_id === 'inv-1');
    expect(pays.map((p) => p.amount).sort((a, b) => a - b)).toEqual([50, 100, 200]);
    const refs = pays.map((p) => p.reference);
    expect(refs.every((r) => typeof r === 'string' && r.length > 0)).toBe(true);
    expect(new Set(refs).size).toBe(refs.length);
    // the history rows carry the same distinct references as the payments
    const txnRefs = fake.rows('transactions').map((t) => t.reference_no);
    expect(new Set(txnRefs).size).toBe(txnRefs.length);
    expect(txnRefs.every(Boolean)).toBe(true);
  });

  it('a next_invoice_no that throws is also swallowed', async () => {
    seedInvoices([seedBookingTimeInvoice()]);
    fake.setRpc('next_invoice_no', () => { throw new Error('network'); });
    expect(await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null)).toBe(true);
    expect(fake.rows('payments')).toHaveLength(1);
  });

  it('draws a fresh sequential reference when the RPC works, and uses a caller-supplied one as is', async () => {
    seedInvoices([seedBookingTimeInvoice()]);
    await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null);
    await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', 'MY-REF');
    const refs = fake.rows('payments').map((p) => p.reference);
    expect(refs[0]).toMatch(/^INV-\d{6}$/);
    expect(refs[0]).not.toBe('INV-000009');
    expect(refs[1]).toBe('MY-REF');
  });

  it('does not draw an invoice number when there is no invoice that can take the payment', async () => {
    let draws = 0;
    fake.setRpc('next_invoice_no', () => ({ data: ++draws, error: null }));
    seedInvoices([seedBookingTimeInvoice({ status: 'void' })]);
    await appendPaymentToExistingInvoice(RES_ID, 100, EMP_ID, 'cash', null);
    expect(draws).toBe(0);
  });
});

describe('checkout payment reference degrades gracefully', () => {
  it('a failing next_invoice_no at checkout still records the balance payment with a distinct reference', async () => {
    seedInvoices([seedBookingTimeInvoice({ deposit: 200 })]);
    fake.seed('reservations', [baseReservation({ amount_paid: 200, amount_left: 300, is_manual: true })]);
    fake.setRpc('next_invoice_no', () => { throw new Error('network'); });

    const res = await PATCH(patchReq({ status: 'completed', amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(200);

    const pays = fake.rows('payments').filter((p) => p.invoice_id === 'inv-1');
    expect(pays.map((p) => p.amount).sort((a, b) => a - b)).toEqual([200, 300]);
    const refs = pays.map((p) => p.reference);
    expect(refs.every(Boolean)).toBe(true);
    expect(new Set(refs).size).toBe(2);
  });
});

// ── 3. Invoice status written at booking time must be a status the database accepts ─────────

function manualBookingReq(overrides: Record<string, any> = {}) {
  return new Request('http://localhost:3000/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      serviceId: SERVICE_ID, date: '2099-01-10', requestedTime: '10:00', name: 'Walk-in Patient',
      email: 'walkin@test.com', phone: '01035595691', sessionType: 'in_person', isManual: true,
      ...overrides,
    }),
  });
}

describe('manual booking invoice', () => {
  it('a fully paid manual booking gets an invoice with a valid status (not "paid"), its line and its payment', async () => {
    const res = await POST(manualBookingReq({ amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(201);
    const body = await res.json();

    const invoices = fake.rows('invoices');
    expect(invoices).toHaveLength(1);
    expect(VALID_INVOICE_STATUSES).toContain(invoices[0].status);
    expect(invoices[0].status).toBe('issued');
    expect(body.invoiceNo).toBe(invoices[0].invoice_no);
    expect(fake.rows('invoice_lines').filter((l) => l.invoice_id === invoices[0].id)).toHaveLength(1);
    expect(fake.rows('payments')).toMatchObject([{ invoice_id: invoices[0].id, amount: 500 }]);
  });

  it('an unpaid and an overpaid manual booking also use a valid status', async () => {
    await POST(manualBookingReq({ amountPaid: 0, amountLeft: 500 }));
    await POST(manualBookingReq({ amountPaid: 800, amountLeft: 0, requestedTime: '12:00' }));
    const invoices = fake.rows('invoices');
    expect(invoices).toHaveLength(2);
    for (const i of invoices) expect(VALID_INVOICE_STATUSES).toContain(i.status);
  });

  it('when the invoice lines cannot be written, no empty invoice is left behind and the booking still succeeds', async () => {
    hooks.failLineInsert = true;
    const res = await POST(manualBookingReq({ amountPaid: 500, amountLeft: 0 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(fake.rows('invoices')).toHaveLength(0);
    expect(body.invoiceNo ?? null).toBeNull();
    // the money is still recorded in the customer history, and does not point at a ghost invoice
    const txns = fake.rows('transactions');
    expect(txns).toHaveLength(1);
    expect(txns[0].invoice_id ?? null).toBeNull();
  });
});

describe('GET /api/invoices auto-created invoice', () => {
  it('uses a valid status even when the booking is already fully paid', async () => {
    fake.seed('reservations', [baseReservation({ status: 'completed', amount_paid: 500, amount_left: 0 })]);
    const res = await getInvoice(new Request(`http://localhost:3000/api/invoices?reservationId=${RES_ID}`, {
      headers: { Authorization: 'Bearer staff-token' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoice).toBeTruthy();
    expect(VALID_INVOICE_STATUSES).toContain(body.invoice.status);
    expect(fake.rows('invoices')).toHaveLength(1);
    expect(VALID_INVOICE_STATUSES).toContain(fake.rows('invoices')[0].status);
  });
});
