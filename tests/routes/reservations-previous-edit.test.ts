/**
 * Tests for PATCH /api/reservations/previous (edit historical booking)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
    from: (table: string) => fake.client.from(table),
    rpc: (name: string, args?: any) => fake.client.rpc(name, args),
  },
}));

import { POST, PATCH } from '@/app/api/reservations/previous/route';

const USER_ID = 'staff-user';
const EMP_ID = 'emp-1';

function staffPost(body: any): Request {
  return new Request('http://localhost:3000/api/reservations/previous', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function staffPatch(body: any): Request {
  return new Request('http://localhost:3000/api/reservations/previous', {
    method: 'PATCH',
    headers: new Headers({ 'content-type': 'application/json', Authorization: 'Bearer staff-token' }),
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, any> = {}) {
  return { patientPhone: '01012345678', patientName: 'Amira Test', date: '2026-05-11', ...overrides };
}

const rows = (t: string) => (fake.db[t] || []) as any[];

function asSuperadmin() {
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'superadmin', name: 'Admin', email: 'admin@revera.com' }]);
  fake.seed('roles', [{ name: 'superadmin', permissions: ['all'] }]);
}

function asReception() {
  fake.seed('employee_accounts', [{ id: EMP_ID, auth_user_id: USER_ID, role_name: 'reception', name: 'Nour', email: 'n@test.com' }]);
  fake.seed('roles', [{ name: 'reception', permissions: [] }]);
}

beforeEach(() => {
  fake.reset();
  for (const t of [
    'reservations', 'customers', 'providers', 'products', 'packages', 'package_items', 'reservation_products',
    'product_sales', 'customer_packages', 'customer_package_items', 'wallet_txns', 'transactions',
    'invoices', 'invoice_lines', 'payments', 'transaction_audit_logs',
  ]) {
    fake.seed(t, []);
  }
  fake.authGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  asSuperadmin();
  fake.seed('services', [{ id: 15, en: 'Laser Face', ar: 'ليزر وجه', price: 1200 }]);
  fake.seed('packages', [{ id: 'pkg-1', name: 'Laser 6 Sessions', price: 3000, validity_days: 365 }]);
  let txnSeq = 1;
  let invSeq = 100;
  fake.setRpc('next_transaction_seq', () => ({ data: txnSeq++, error: null }));
  fake.setRpc('next_invoice_no', () => ({ data: invSeq++, error: null }));
});

// Helper to validate allowed keys in specific tables
function validatePaymentKeys(payment: any) {
  const allowed = new Set(['id', 'invoice_id', 'received_at', 'amount', 'method', 'received_by_employee_id', 'reference', 'is_opening', 'created_at']);
  const actual = new Set(Object.keys(payment));
  for (const key of actual) {
    if (!allowed.has(key)) {
      throw new Error(`Invalid payment key: ${key}`);
    }
  }
}

function validateInvoiceLineKeys(line: any) {
  const allowed = new Set(['id', 'invoice_id', 'line_type', 'service_id', 'product_id', 'package_id', 'description', 'qty', 'unit_price', 'discount', 'tax_rate', 'line_total', 'cogs_snapshot', 'commission_snapshot', 'provider_id', 'created_at']);
  const actual = new Set(Object.keys(line));
  for (const key of actual) {
    if (!allowed.has(key)) {
      throw new Error(`Invalid invoice_line key: ${key}`);
    }
  }
}

describe('PATCH /api/reservations/previous (edit historical booking)', () => {
  it('1. reception role → 403; nothing changed', async () => {
    // Create a booking as reception
    asReception();
    const createRes = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1200, actualSpent: 1200 })));
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();
    const resId = createJson.booking.id;
    const initialBooking = rows('reservations')[0];

    // Try to edit as reception
    const patchRes = await PATCH(staffPatch({ id: resId, invoiceValue: 1500, actualSpent: 1500 }));
    expect(patchRes.status).toBe(403);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toContain('superadmin');

    // Verify nothing changed
    const currentBooking = rows('reservations')[0];
    expect(currentBooking.amount_paid).toBe(initialBooking.amount_paid);
    expect(currentBooking.amount_left).toBe(initialBooking.amount_left);
  });

  it('2. a live (non-historical) reservation → 409; row unchanged', async () => {
    // Seed a live reservation directly
    fake.seed('reservations', [{
      id: 'live-res-1',
      is_historical: false,
      name: 'Test Patient',
      phone: '01012345678',
      date: '2026-05-11',
      amount_paid: 1000,
      amount_left: 200,
      notes: 'Regular booking',
      reception_notes: 'Regular booking',
      customer_id: 'c1',
      service_id: 15,
      branch_id: null
    }]);

    const patchRes = await PATCH(staffPatch({ id: 'live-res-1', invoiceValue: 1500, actualSpent: 1500 }));
    expect(patchRes.status).toBe(409);
    expect((await patchRes.json()).error).toContain('historical');

    // Verify nothing changed
    const res = rows('reservations')[0];
    expect(res.amount_paid).toBe(1000);
    expect(res.amount_left).toBe(200);
  });

  it('3. phone change → 400 with field: patientPhone', async () => {
    const createRes = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1200, actualSpent: 1200 })));
    expect(createRes.status).toBe(200);
    const resId = (await createRes.json()).booking.id;

    const patchRes = await PATCH(staffPatch({
      id: resId,
      patientPhone: '01099999999',
      invoiceValue: 1200,
      actualSpent: 1200
    }));
    expect(patchRes.status).toBe(400);
    const patchJson = await patchRes.json();
    expect(patchJson.field).toBe('patientPhone');
    expect(patchJson.error).toContain('phone');
  });

  it('4. value 1000 paid 1000 → edit value 1500 paid 1000: customer outstanding +500, spent unchanged, invoice grand_total 1500, payment 1000', async () => {
    const createRes = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1000, actualSpent: 1000 })));
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();
    const resId = createJson.booking.id;
    const customerId = createJson.booking.customer_id;

    expect(createJson.balances.outstanding).toBe(0);
    expect(createJson.balances.spent_amount).toBe(1000);

    const patchRes = await PATCH(staffPatch({
      id: resId,
      invoiceValue: 1500,
      actualSpent: 1000
    }));
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();

    expect(patchJson.balances.outstanding).toBe(500);
    expect(patchJson.balances.spent).toBe(1000);
    expect(patchJson.warnings).toBeUndefined();

    // The stored customer row, not just the response, carries the new balances.
    const customer = rows('customers').find((c) => c.id === customerId);
    expect(Number(customer.outstanding)).toBe(500);
    expect(Number(customer.spent_amount)).toBe(1000);
    expect(Number(customer.wallet_balance)).toBe(0);

    // Check invoice
    expect(rows('invoices')[0].grand_total).toBe(1500);

    // Check invoice line
    const line = rows('invoice_lines')[0];
    validateInvoiceLineKeys(line);
    expect(line.line_total).toBe(1500);

    // Check payment
    const payment = rows('payments')[0];
    validatePaymentKeys(payment);
    expect(payment.amount).toBe(1000);
  });

  it('5. value 1000 paid 1000 → edit paid 600: spent −400, outstanding +400, payment amount 600', async () => {
    const createRes = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1000, actualSpent: 1000 })));
    expect(createRes.status).toBe(200);
    const resId = (await createRes.json()).booking.id;

    const patchRes = await PATCH(staffPatch({
      id: resId,
      invoiceValue: 1000,
      actualSpent: 600
    }));
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();

    expect(patchJson.balances.spent).toBe(600);
    expect(patchJson.balances.outstanding).toBe(400);

    // Check payment
    const payment = rows('payments')[0];
    expect(payment.amount).toBe(600);

    // Check transaction
    const txn = rows('transactions').find((t) => t.type === 'payment');
    expect(txn.amount).toBe(600);
  });

  it('6. edit paid to 0: invoice has no payments, transaction payment row is gone, audit log has transaction_id: null', async () => {
    const createRes = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1000, actualSpent: 1000 })));
    expect(createRes.status).toBe(200);
    const resId = (await createRes.json()).booking.id;

    const patchRes = await PATCH(staffPatch({
      id: resId,
      invoiceValue: 1000,
      actualSpent: 0
    }));
    expect(patchRes.status).toBe(200);

    // No payments
    expect(rows('payments')).toHaveLength(0);

    // Transaction deleted
    expect(rows('transactions').filter((t) => t.type === 'payment')).toHaveLength(0);

    // Audit log has transaction_id: null
    const audit = rows('transaction_audit_logs')[0];
    expect(audit.transaction_id).toBeNull();
  });

  it('7. customer had wallet 300 before the booking → raising the value draws the wallet first', async () => {
    // Seed customer with wallet
    fake.seed('customers', [{
      id: 'c1',
      name: 'Mona',
      mobile: '01012345678',
      wallet_balance: 300,
      spent_amount: 0,
      outstanding: 0
    }]);

    const createRes = await POST(staffPost(body({
      patientPhone: '01012345678',
      patientName: 'Mona',
      serviceId: 15,
      invoiceValue: 1000,
      actualSpent: 1000
    })));
    expect(createRes.status).toBe(200);
    const resId = (await createRes.json()).booking.id;

    // Edit: raise value to 1500
    const patchRes = await PATCH(staffPatch({
      id: resId,
      invoiceValue: 1500,
      actualSpent: 1000
    }));
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();

    // Wallet should be drawn: 300 - 500 = 0, outstanding = 200
    expect(patchJson.balances.wallet).toBe(0);
    expect(patchJson.balances.outstanding).toBe(200);
  });

  it('8. notes preservation: markers stay in notes and reception_notes', async () => {
    // Create with special markers in notes
    const res = await POST(staffPost(body({
      serviceId: 15,
      invoiceValue: 1000,
      actualSpent: 1000,
      notes: 'Added manually\n[Customer Package ID]: CP-9\n[Laser Pulses Delivered]: Primary: 500 pulses'
    })));
    const resId = (await res.json()).booking.id;

    // Update notes
    const patchRes = await PATCH(staffPatch({
      id: resId,
      invoiceValue: 1200,
      actualSpent: 1200,
      notes: 'Updated note'
    }));
    expect(patchRes.status).toBe(200);

    // Check that markers are preserved
    const updated = rows('reservations')[0];
    expect(updated.notes).toContain('[Customer Package ID]: CP-9');
    expect(updated.notes).toContain('[Laser Pulses Delivered]: Primary: 500 pulses');
    expect(updated.reception_notes).toContain('[Customer Package ID]: CP-9');
  });

  it('9. legacy historical booking with no invoice row → PATCH creates one invoice with is_opening: true, payment has is_opening: true', async () => {
    // Seed a historical reservation directly without invoice
    fake.seed('customers', [{ id: 'c1', name: 'Sara', mobile: '01012345678' }]);
    fake.seed('reservations', [{
      id: 'legacy-1',
      is_historical: true,
      name: 'Sara',
      phone: '01012345678',
      date: '2026-03-15',
      customer_id: 'c1',
      amount_paid: 800,
      amount_left: 200,
      notes: '[Historical Booking] Added manually',
      reception_notes: '[Historical Booking] Added manually',
      service_id: 15,
      branch_id: null
    }]);

    // Edit to create invoice
    const patchRes = await PATCH(staffPatch({
      id: 'legacy-1',
      invoiceValue: 1000,
      actualSpent: 800,
      patientName: 'Sara'
    }));
    expect(patchRes.status).toBe(200);

    // Check invoice was created
    expect(rows('invoices')).toHaveLength(1);
    const inv = rows('invoices')[0];
    expect(inv.is_opening).toBe(true);
    expect(inv.grand_total).toBe(1000);

    // Check payment
    expect(rows('payments')).toHaveLength(1);
    const pay = rows('payments')[0];
    expect(pay.is_opening).toBe(true);
    expect(pay.amount).toBe(800);
  });

  it('10. exactly one transaction_audit_logs row with action: edited_historical_booking and correct before/after amounts', async () => {
    const createRes = await POST(staffPost(body({ serviceId: 15, invoiceValue: 1000, actualSpent: 1000 })));
    expect(createRes.status).toBe(200);
    const resId = (await createRes.json()).booking.id;

    const patchRes = await PATCH(staffPatch({
      id: resId,
      invoiceValue: 1200,
      actualSpent: 900
    }));
    expect(patchRes.status).toBe(200);

    expect(rows('transaction_audit_logs')).toHaveLength(1);
    const audit = rows('transaction_audit_logs')[0];
    expect(audit.action).toBe('edited_historical_booking');
    expect(audit.details.before.invoiceValue).toBe(1000);
    expect(audit.details.before.amountPaid).toBe(1000);
    expect(audit.details.after.invoiceValue).toBe(1200);
    expect(audit.details.after.amountPaid).toBe(900);
  });

  it('11. POST regression for C1: POST with actualSpent: 1000 and no invoiceValue → customer wallet_balance stays 0 and outstanding stays 0', async () => {
    asReception();
    const res = await POST(staffPost(body({
      serviceId: 15,
      actualSpent: 1000
    })));
    expect(res.status).toBe(200);
    const json = await res.json();

    // With no invoiceValue, effective value = actualSpent = 1000, so it's exact payment
    // wallet should be 0, outstanding should be 0
    expect(json.balances.wallet_balance).toBe(0);
    expect(json.balances.outstanding).toBe(0);
    expect(json.balances.spent_amount).toBe(1000);
  });

  it('12. POST with paymentType: Bank Transfer → transactions row has payment_method: bank_transfer', async () => {
    asReception();
    const res = await POST(staffPost(body({
      serviceId: 15,
      invoiceValue: 1000,
      actualSpent: 1000,
      paymentType: 'Bank Transfer'
    })));
    expect(res.status).toBe(200);

    const txn = rows('transactions').find((t) => t.type === 'payment');
    expect(txn.payment_method).toBe('bank_transfer');
  });

  it('13. legacy booking with no transactions row → PATCH records one through the ledger helper, with a TXN number', async () => {
    fake.seed('customers', [{ id: 'c2', name: 'Mona', mobile: '01012345678', spent_amount: 0, outstanding: 0, wallet_balance: 0 }]);
    fake.seed('reservations', [{
      id: 'legacy-2', is_historical: true, name: 'Mona', phone: '01012345678', date: '2026-03-15',
      customer_id: 'c2', amount_paid: 0, amount_left: 0, service_id: 15, branch_id: null,
      notes: '[Historical Booking] Added manually', reception_notes: '[Historical Booking] Added manually',
    }]);

    const patchRes = await PATCH(staffPatch({ id: 'legacy-2', invoiceValue: 700, actualSpent: 700, paymentType: 'Cash' }));
    expect(patchRes.status).toBe(200);

    const payments = rows('transactions').filter((t) => t.type === 'payment' && t.reservation_id === 'legacy-2');
    expect(payments).toHaveLength(1);
    // transactions.transaction_id is NOT NULL UNIQUE in the real schema; a row without it cannot exist.
    expect(payments[0].transaction_id).toMatch(/^TXN-/);
    expect(Number(payments[0].amount)).toBe(700);
    expect(payments[0].payment_method).toBe('cash');

    const audit = rows('transaction_audit_logs')[0];
    expect(audit.transaction_id).toBe(payments[0].id);
  });
});
