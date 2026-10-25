/**
 * Pure helpers shared by the server route and the admin delete dialog (no database access here, so
 * the browser can import it). DEC-132 / RISK-138.
 */

/** What a permanent patient delete removes (or would remove), counted per kind. */
export interface PatientDeletionCounts {
  bookings: number;
  /** transactions + invoices + product sales */
  payments: number;
  /** Money received according to the transaction ledger (completed, money-in types); 0 when none. */
  paymentsAmount: number;
  packages: number;
  walletEntries: number;
  productBalances: number;
  laserSessions: number;
  /** medical records + medical reports + prescriptions */
  clinicalRecords: number;
}

export function emptyDeletionCounts(): PatientDeletionCounts {
  return {
    bookings: 0,
    payments: 0,
    paymentsAmount: 0,
    packages: 0,
    walletEntries: 0,
    productBalances: 0,
    laserSessions: 0,
    clinicalRecords: 0,
  };
}

/** True when anything besides the patient row itself is going to be removed. */
export function hasAnythingToDelete(c: PatientDeletionCounts): boolean {
  return (
    c.bookings > 0 ||
    c.payments > 0 ||
    c.packages > 0 ||
    c.walletEntries > 0 ||
    c.productBalances > 0 ||
    c.laserSessions > 0 ||
    c.clinicalRecords > 0
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function money(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * "3 bookings, 2 payment records (2,700 EGP) and 3 packages": only the kinds that are present.
 * Returns an empty string when the patient has nothing attached.
 */
export function describeDeletionCounts(c: PatientDeletionCounts, lang: 'en' | 'ar' = 'en'): string {
  const parts: string[] = [];
  if (lang === 'ar') {
    if (c.bookings) parts.push(`الحجوزات: ${c.bookings}`);
    if (c.payments) {
      parts.push(`سجلات الدفع: ${c.payments}${c.paymentsAmount > 0 ? ` (${money(c.paymentsAmount)} جنيه)` : ''}`);
    }
    if (c.packages) parts.push(`الباقات: ${c.packages}`);
    if (c.walletEntries) parts.push(`حركات المحفظة: ${c.walletEntries}`);
    if (c.productBalances) parts.push(`أرصدة المنتجات: ${c.productBalances}`);
    if (c.laserSessions) parts.push(`جلسات الليزر: ${c.laserSessions}`);
    if (c.clinicalRecords) parts.push(`السجلات الطبية والروشتات: ${c.clinicalRecords}`);
    return parts.join('، ');
  }

  if (c.bookings) parts.push(plural(c.bookings, 'booking', 'bookings'));
  if (c.payments) {
    parts.push(
      `${plural(c.payments, 'payment record', 'payment records')}${c.paymentsAmount > 0 ? ` (${money(c.paymentsAmount)} EGP)` : ''}`
    );
  }
  if (c.packages) parts.push(plural(c.packages, 'package', 'packages'));
  if (c.walletEntries) parts.push(plural(c.walletEntries, 'wallet entry', 'wallet entries'));
  if (c.productBalances) parts.push(plural(c.productBalances, 'product balance', 'product balances'));
  if (c.laserSessions) parts.push(plural(c.laserSessions, 'laser session', 'laser sessions'));
  if (c.clinicalRecords) parts.push(plural(c.clinicalRecords, 'medical record or prescription', 'medical records or prescriptions'));
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
