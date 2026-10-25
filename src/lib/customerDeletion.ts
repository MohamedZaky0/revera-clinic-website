/**
 * What stands in the way of permanently deleting a patient (DEC-128 / RISK-133).
 *
 * Every table that points at `customers` is either ON DELETE SET NULL (reservations, transactions,
 * invoices, product_sales) or ON DELETE CASCADE (packages, wallet entries, product balances, laser
 * logs, medical records/reports, prescriptions). So Postgres never refuses the delete: it silently
 * un-links the bookings and payments, or silently wipes the rest. The un-linked bookings then keep
 * the patient's name and phone, and the Patients list builds the patient straight back from them.
 * The route therefore checks this history itself and refuses, naming what is in the way.
 */
import { supabaseServer } from '@/lib/supabaseServer';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PatientBlockers {
  bookings: number;
  /** transactions + invoices + product sales */
  payments: number;
  packages: number;
  walletEntries: number;
  productBalances: number;
  laserSessions: number;
  /** medical records + medical reports + prescriptions */
  clinicalRecords: number;
}

async function countRows(table: string, column: string, value: string): Promise<number> {
  const { data, error } = await supabaseServer.from(table).select('id').eq(column, value);
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

/** Counts, per kind, the history that hangs off one real patient row. */
export async function countPatientHistory(customerId: string): Promise<PatientBlockers> {
  const [
    bookings,
    transactions,
    invoices,
    productSales,
    packages,
    walletEntries,
    productBalances,
    laserSessions,
    medicalRecords,
    medicalReports,
    prescriptions,
  ] = await Promise.all([
    countRows('reservations', 'customer_id', customerId),
    countRows('transactions', 'customer_id', customerId),
    countRows('invoices', 'customer_id', customerId),
    countRows('product_sales', 'customer_id', customerId),
    countRows('customer_packages', 'customer_id', customerId),
    countRows('wallet_txns', 'customer_id', customerId),
    countRows('customer_product_balances', 'customer_id', customerId),
    countRows('laser_pulse_logs', 'customer_id', customerId),
    countRows('medical_records', 'customer_id', customerId),
    countRows('medical_reports', 'customer_id', customerId),
    countRows('prescriptions', 'customer_id', customerId),
  ]);

  return {
    bookings,
    payments: transactions + invoices + productSales,
    packages,
    walletEntries,
    productBalances,
    laserSessions,
    clinicalRecords: medicalRecords + medicalReports + prescriptions,
  };
}

export function hasBlockingHistory(b: PatientBlockers): boolean {
  return Object.values(b).some((n) => n > 0);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2 bookings, 3 payment records and 1 package" (only the kinds that are present). */
export function describeBlockers(b: PatientBlockers): string {
  const parts: string[] = [];
  if (b.bookings) parts.push(plural(b.bookings, 'booking', 'bookings'));
  if (b.payments) parts.push(plural(b.payments, 'payment record', 'payment records'));
  if (b.packages) parts.push(plural(b.packages, 'package', 'packages'));
  if (b.walletEntries) parts.push(plural(b.walletEntries, 'wallet entry', 'wallet entries'));
  if (b.productBalances) parts.push(plural(b.productBalances, 'product balance', 'product balances'));
  if (b.laserSessions) parts.push(plural(b.laserSessions, 'laser session', 'laser sessions'));
  if (b.clinicalRecords) parts.push(plural(b.clinicalRecords, 'medical record or prescription', 'medical records or prescriptions'));
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The Patients list invents a patient for every booking whose patient has no `customers` row, with
 * the id `res-cust-<phone>`. Returns the digits to search the bookings by (last 9, so +20 / 0 / 0020
 * prefixes all match), or null when the id carries no usable phone.
 */
export function derivedPhoneFragment(id: string): string | null {
  if (!id.startsWith('res-cust-')) return null;
  const digits = id.slice('res-cust-'.length).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.length >= 9 ? digits.slice(-9) : digits;
}
