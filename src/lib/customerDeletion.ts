/**
 * Permanent delete of a patient (DEC-132 / RISK-138, which replaces DEC-128 / RISK-133).
 *
 * The product rule: when a patient is hard-deleted, EVERYTHING that belongs to them goes with them
 * (bookings, payments, packages, wallet, product balances, laser logs, medical records and
 * prescriptions) and the patient does not come back in the Patients list.
 *
 * Why this is more than `delete from customers`: on production every table pointing at `customers`
 * is ON DELETE SET NULL (reservations, transactions, invoices, product_sales) or ON DELETE CASCADE
 * (the rest). The SET NULL ones would survive un-linked, and the Patients list builds a patient
 * (id `res-cust-<phone>`) out of any booking with no matching patient row, so the patient would be
 * back. So the bookings and payments are deleted first, explicitly.
 *
 * Every table is also deleted explicitly here instead of relying on the cascades: the dev and
 * production databases were built by different paths (RISK-020), and it makes the counts exact.
 *
 * Order (patient row last, so a failure part-way leaves a patient who can simply be deleted again):
 *   transactions -> invoice payments -> invoices -> product sales -> wallet entries -> packages ->
 *   product balances -> laser logs -> medical records -> medical reports -> prescriptions ->
 *   bookings -> patient row.
 * These are separate requests, not one database transaction. A failing step stops the run and is
 * reported with its name; nothing after it is attempted and the Auth login is not touched.
 */
import { supabaseServer } from '@/lib/supabaseServer';
import { emptyDeletionCounts, type PatientDeletionCounts } from '@/lib/customerDeletionText';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Transaction types that are money received (positive), used only for the "EGP" total shown to the owner. */
const MONEY_IN_TYPES = new Set(['payment', 'outstanding_payment', 'product_purchase', 'wallet_topup']);

/** PostgREST puts every `in` value in the URL, so long id lists are sent in pieces. */
const CHUNK = 50;

function chunk<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

/**
 * The last 9 digits of a phone (so +20 / 0020 / 0 prefixes and spaces all compare equal), or null
 * when there are too few digits to identify anyone. Same rule as the derived-entry id below.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/**
 * The Patients list invents a patient for every booking whose patient has no `customers` row, with
 * the id `res-cust-<phone>`. Returns the phone key to search the bookings by, or null when the id
 * carries no usable phone.
 */
export function derivedPhoneFragment(id: string): string | null {
  if (!id.startsWith('res-cust-')) return null;
  return phoneKey(id.slice('res-cust-'.length));
}

function normalizeName(raw: string | null | undefined): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same person unless both names are present and neither contains the other. */
function namesCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return true;
  return x === y || x.includes(y) || y.includes(x);
}

export interface DeletionPlan {
  /** null for a reservation-derived entry (no patient row) */
  customerId: string | null;
  name: string | null;
  bookingIds: string[];
  transactionIds: string[];
  invoiceIds: string[];
  productSaleIds: string[];
  /** Un-linked bookings with the patient's phone but clearly another name: left alone. */
  keptBookingsOtherName: number;
  counts: PatientDeletionCounts;
}

async function selectRows(table: string, columns: string, apply: (q: any) => any): Promise<any[]> {
  const { data, error } = await apply(supabaseServer.from(table).select(columns));
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function countByCustomer(table: string, customerId: string): Promise<number> {
  return (await selectRows(table, 'id', (q) => q.eq('customer_id', customerId))).length;
}

/** Transactions and invoices that belong to the patient or to the bookings being deleted. */
async function collectPayments(customerId: string | null, bookingIds: string[]) {
  const txns = new Map<string, any>();
  const invoices = new Map<string, any>();
  const mine = (row: any) => row.customer_id == null || (customerId != null && String(row.customer_id) === customerId);

  if (customerId) {
    for (const r of await selectRows('transactions', 'id, amount, type, status, customer_id', (q) => q.eq('customer_id', customerId))) txns.set(r.id, r);
    for (const r of await selectRows('invoices', 'id, customer_id', (q) => q.eq('customer_id', customerId))) invoices.set(r.id, r);
  }
  for (const ids of chunk(bookingIds)) {
    for (const r of await selectRows('transactions', 'id, amount, type, status, customer_id', (q) => q.in('reservation_id', ids))) {
      if (mine(r)) txns.set(r.id, r);
    }
    for (const r of await selectRows('invoices', 'id, customer_id', (q) => q.in('reservation_id', ids))) {
      if (mine(r)) invoices.set(r.id, r);
    }
  }
  return { transactions: [...txns.values()], invoiceIds: [...invoices.keys()] };
}

function moneyReceived(transactions: any[]): number {
  return transactions
    .filter((t) => MONEY_IN_TYPES.has(String(t.type)) && String(t.status) === 'completed' && Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/** Un-linked bookings (customer_id null) whose phone has this key. */
async function unlinkedBookingsWithPhone(key: string): Promise<any[]> {
  const rows = await selectRows('reservations', 'id, name, phone', (q) => q.is('customer_id', null));
  return rows.filter((r) => phoneKey(r.phone) === key);
}

/** Is there a patient row (other than `exceptId`) whose phone has this key? */
async function otherPatientOwnsPhone(key: string, exceptId: string | null): Promise<boolean> {
  const rows = await selectRows('customers', 'id, mobile', (q) => q.ilike('mobile', `%${key}`));
  return rows.some((r) => String(r.id) !== exceptId && phoneKey(r.mobile) === key);
}

/** What a permanent delete of this patient row would remove. Read only. */
export async function planPatientDeletion(customer: { id: string; name?: string | null; mobile?: string | null }): Promise<DeletionPlan> {
  const id = customer.id;
  const bookingIds = new Set<string>();
  for (const r of await selectRows('reservations', 'id', (q) => q.eq('customer_id', id))) bookingIds.add(r.id);

  // Un-linked bookings that carry this patient's phone are shown under this patient in the list, and
  // would rebuild a patient once the row is gone. Take them only when the phone and name clearly say
  // it is the same person and no other patient row owns that phone.
  let keptBookingsOtherName = 0;
  const key = phoneKey(customer.mobile);
  if (key && !(await otherPatientOwnsPhone(key, id))) {
    for (const r of await unlinkedBookingsWithPhone(key)) {
      if (namesCompatible(r.name, customer.name)) bookingIds.add(r.id);
      else keptBookingsOtherName += 1;
    }
  }

  const ids = [...bookingIds];
  const { transactions, invoiceIds } = await collectPayments(id, ids);
  const productSaleIds = (await selectRows('product_sales', 'id', (q) => q.eq('customer_id', id))).map((r) => r.id);

  const [packages, walletEntries, productBalances, laserSessions, medicalRecords, medicalReports, prescriptions] = await Promise.all([
    countByCustomer('customer_packages', id),
    countByCustomer('wallet_txns', id),
    countByCustomer('customer_product_balances', id),
    countByCustomer('laser_pulse_logs', id),
    countByCustomer('medical_records', id),
    countByCustomer('medical_reports', id),
    countByCustomer('prescriptions', id),
  ]);

  return {
    customerId: id,
    name: customer.name || null,
    bookingIds: ids,
    transactionIds: transactions.map((t) => t.id),
    invoiceIds,
    productSaleIds,
    keptBookingsOtherName,
    counts: {
      bookings: ids.length,
      payments: transactions.length + invoiceIds.length + productSaleIds.length,
      paymentsAmount: moneyReceived(transactions),
      packages,
      walletEntries,
      productBalances,
      laserSessions,
      clinicalRecords: medicalRecords + medicalReports + prescriptions,
    },
  };
}

/**
 * What deleting a reservation-derived entry (`res-cust-<phone>`) would remove: the un-linked
 * bookings with that phone and their payments. Returns 'owned' when a patient row now owns the
 * phone (the list on screen is stale: those bookings belong to that patient).
 */
export async function planDerivedDeletion(phoneFragment: string): Promise<DeletionPlan | 'owned'> {
  if (await otherPatientOwnsPhone(phoneFragment, null)) return 'owned';
  const bookings = await unlinkedBookingsWithPhone(phoneFragment);
  const ids = bookings.map((b) => b.id);
  const { transactions, invoiceIds } = await collectPayments(null, ids);
  return {
    customerId: null,
    name: bookings[0]?.name || null,
    bookingIds: ids,
    transactionIds: transactions.map((t) => t.id),
    invoiceIds,
    productSaleIds: [],
    keptBookingsOtherName: 0,
    counts: {
      ...emptyDeletionCounts(),
      bookings: ids.length,
      payments: transactions.length + invoiceIds.length,
      paymentsAmount: moneyReceived(transactions),
    },
  };
}

/** A deletion step failed. `removedSoFar` says what the earlier steps already took out. */
export class PatientDeletionError extends Error {
  constructor(
    public step: string,
    public cause: unknown,
    public removedSoFar: Record<string, number>
  ) {
    super(`${step}: ${(cause as any)?.message || String(cause)}`);
    this.name = 'PatientDeletionError';
  }
}

async function removeRows(table: string, apply: (q: any) => any): Promise<number> {
  const { data, error } = await apply(supabaseServer.from(table).delete()).select('id');
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

async function removeByIds(table: string, ids: string[]): Promise<number> {
  let n = 0;
  for (const part of chunk(ids)) n += await removeRows(table, (q) => q.in('id', part));
  return n;
}

export interface DeletionResult {
  /** What was really removed, per kind (same shape as the preview). */
  removed: PatientDeletionCounts;
  /** Rows removed per table, for the audit line. */
  perTable: Record<string, number>;
}

/** Runs the plan. Throws PatientDeletionError at the first failing step. */
export async function executeDeletionPlan(plan: DeletionPlan): Promise<DeletionResult> {
  const perTable: Record<string, number> = {};
  const customerId = plan.customerId;

  const steps: Array<{ table: string; run: () => Promise<number> }> = [
    { table: 'transactions', run: () => removeByIds('transactions', plan.transactionIds) },
  ];
  if (plan.invoiceIds.length) {
    steps.push({
      table: 'payments',
      run: async () => {
        let n = 0;
        for (const part of chunk(plan.invoiceIds)) n += await removeRows('payments', (q) => q.in('invoice_id', part));
        return n;
      },
    });
  }
  steps.push({ table: 'invoices', run: () => removeByIds('invoices', plan.invoiceIds) });
  if (customerId) {
    steps.push({ table: 'product_sales', run: () => removeByIds('product_sales', plan.productSaleIds) });
    for (const table of [
      'wallet_txns',
      'customer_packages',
      'customer_product_balances',
      'laser_pulse_logs',
      'medical_records',
      'medical_reports',
      'prescriptions',
    ]) {
      steps.push({ table, run: () => removeRows(table, (q) => q.eq('customer_id', customerId)) });
    }
  }
  steps.push({ table: 'reservations', run: () => removeByIds('reservations', plan.bookingIds) });
  if (customerId) {
    steps.push({
      table: 'customers',
      run: async () => {
        const n = await removeRows('customers', (q) => q.eq('id', customerId));
        if (n === 0) throw new Error('the database removed no patient row');
        return n;
      },
    });
  }

  for (const step of steps) {
    try {
      perTable[step.table] = await step.run();
    } catch (err) {
      throw new PatientDeletionError(step.table, err, { ...perTable });
    }
  }

  const t = (name: string) => perTable[name] || 0;
  return {
    perTable,
    removed: {
      bookings: t('reservations'),
      payments: t('transactions') + t('invoices') + t('product_sales'),
      paymentsAmount: plan.counts.paymentsAmount,
      packages: t('customer_packages'),
      walletEntries: t('wallet_txns'),
      productBalances: t('customer_product_balances'),
      laserSessions: t('laser_pulse_logs'),
      clinicalRecords: t('medical_records') + t('medical_reports') + t('prescriptions'),
    },
  };
}

/** One line for the server log: who was deleted and what went with them. */
export function auditLine(plan: DeletionPlan, result: DeletionResult, actor: string): string {
  const r = result.removed;
  return (
    `patient hard delete: id=${plan.customerId ?? 'derived'} name="${plan.name ?? ''}" by=${actor} ` +
    `bookings=${r.bookings} payments=${r.payments} amount=${r.paymentsAmount} packages=${r.packages} ` +
    `wallet=${r.walletEntries} balances=${r.productBalances} laser=${r.laserSessions} clinical=${r.clinicalRecords}`
  );
}
