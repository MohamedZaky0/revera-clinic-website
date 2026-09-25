/**
 * DEC-088 item 9: the Finance screens show cash received and revenue earned side by side and explain the gap, and
 * they show the deferred package balance (money collected for services not yet delivered) broken down by what it is
 * owed for. Pure functions only — no supabaseServer import, matching ledger.ts / customerBalances.ts — the routes
 * fetch the rows and this module does the arithmetic so it can be tested without a database.
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------------------------------------------
// Cash -> revenue bridge
// ---------------------------------------------------------------------------------------------------------------

export interface BridgeInput {
  /** Payments received in the period on live (non-opening) issued invoices — the Cash Flow figure. */
  cashReceived: number;
  /** The part of that cash that paid for packages (deferred, not yet earned). */
  packageCashReceived: number;
  /** Package revenue recognised in the period (sessions / pulses delivered). */
  packageRecognised: number;
  /** Revenue earned in the period — the P&L figure. */
  revenueEarned: number;
}

export interface RevenueBridge extends BridgeInput {
  /** Everything else that separates cash from revenue: services/products invoiced but not paid yet, or paid in another month. */
  otherTiming: number;
}

/**
 * cash received − package cash (deferred) + package revenue recognised + other timing = revenue earned.
 * `otherTiming` is the honest residual, so the four lines always add up to the revenue figure on the screen.
 */
export function computeRevenueBridge(input: BridgeInput): RevenueBridge {
  const cashReceived = round2(input.cashReceived);
  const packageCashReceived = round2(input.packageCashReceived);
  const packageRecognised = round2(input.packageRecognised);
  const revenueEarned = round2(input.revenueEarned);
  const otherTiming = round2(revenueEarned - (cashReceived - packageCashReceived + packageRecognised));
  return { cashReceived, packageCashReceived, packageRecognised, revenueEarned, otherTiming };
}

export interface InvoiceForCash {
  id: string;
  grandTotal: number;
}
export interface LineForCash {
  invoiceId: string;
  lineType: string;
  lineTotal: number;
}
export interface PaymentForCash {
  invoiceId: string;
  amount: number;
}

/**
 * How much of the cash received went to packages. A package sale invoice is all package; a checkout invoice can mix a
 * package purchase with services, so each payment is split by the package share of its invoice
 * (package lines ÷ grand total, capped at 1).
 */
export function packageCashReceived(invoices: InvoiceForCash[], lines: LineForCash[], payments: PaymentForCash[]): number {
  const grandById = new Map(invoices.map((i) => [i.id, Number(i.grandTotal) || 0]));
  const packageLinesById = new Map<string, number>();
  for (const l of lines) {
    if (l.lineType !== 'package') continue;
    packageLinesById.set(l.invoiceId, (packageLinesById.get(l.invoiceId) || 0) + (Number(l.lineTotal) || 0));
  }
  let total = 0;
  for (const p of payments) {
    const grand = grandById.get(p.invoiceId) || 0;
    const pkg = packageLinesById.get(p.invoiceId) || 0;
    if (grand <= 0 || pkg <= 0) continue;
    total += (Number(p.amount) || 0) * Math.min(1, pkg / grand);
  }
  return round2(total);
}

// ---------------------------------------------------------------------------------------------------------------
// Deferred package balance
// ---------------------------------------------------------------------------------------------------------------

export interface DeferredItemInput {
  serviceId: number | null;
  serviceName: string;
  qtyTotal: number;
  qtyRemaining: number;
}

export interface DeferredPackageInput {
  id: string;
  customerName: string;
  packageName: string;
  packageType: 'pulses' | 'services';
  status: string;
  expiresAt: string | null;
  pricePaid: number;
  pricePending: boolean;
  totalPulses: number;
  pulsesRemaining: number;
  items: DeferredItemInput[];
}

export interface DeferredServiceLine {
  serviceId: number | null;
  serviceName: string;
  sessionsRemaining: number;
  amount: number;
}

export interface DeferredPendingPackage {
  id: string;
  customerName: string;
  packageName: string;
  packageType: 'pulses' | 'services';
  /** pulses for a pulses package, sessions for a services package */
  remaining: number;
}

export interface DeferredBreakdown {
  /** Money collected for services not yet delivered — active and expired-but-not-yet-recognised. */
  total: number;
  activeTotal: number;
  /** Past `expires_at` but still deferred: expiry breakage is not recognised yet (DEC-088 item 5). */
  expiredTotal: number;
  pulses: { packages: number; pulsesRemaining: number; amount: number };
  services: DeferredServiceLine[];
  /** Packages with no confirmed price: listed, never silently counted as 0. */
  pending: { count: number; packages: DeferredPendingPackage[] };
}

/**
 * deferred = price_paid × remaining ÷ total (DEC-023 pro-rata). A services package's amount is split across its
 * items by remaining sessions. Fully used packages and packages with nothing left contribute nothing.
 */
export function computeDeferredBreakdown(packages: DeferredPackageInput[], now: Date = new Date()): DeferredBreakdown {
  let activeTotal = 0;
  let expiredTotal = 0;
  let pulsePackages = 0;
  let pulsesRemainingTotal = 0;
  let pulseAmount = 0;
  const serviceMap = new Map<string, DeferredServiceLine>();
  const pending: DeferredPendingPackage[] = [];

  for (const pkg of packages) {
    if (pkg.status === 'fully_used') continue;
    const isExpired = pkg.status === 'expired' || (pkg.expiresAt !== null && new Date(pkg.expiresAt).getTime() < now.getTime());

    if (pkg.packageType === 'pulses') {
      const remaining = Math.max(0, Number(pkg.pulsesRemaining) || 0);
      if (remaining <= 0) continue;
      if (pkg.pricePending) {
        pending.push({ id: pkg.id, customerName: pkg.customerName, packageName: pkg.packageName, packageType: 'pulses', remaining });
        continue;
      }
      const total = Number(pkg.totalPulses) || 0;
      if (total <= 0) continue;
      const amount = round2((Number(pkg.pricePaid) || 0) * Math.min(1, remaining / total));
      pulsePackages += 1;
      pulsesRemainingTotal += remaining;
      pulseAmount += amount;
      if (isExpired) expiredTotal += amount; else activeTotal += amount;
      continue;
    }

    const totalSessions = pkg.items.reduce((sum, i) => sum + (Number(i.qtyTotal) || 0), 0);
    const remainingSessions = pkg.items.reduce((sum, i) => sum + Math.max(0, Number(i.qtyRemaining) || 0), 0);
    if (remainingSessions <= 0) continue;
    if (pkg.pricePending) {
      pending.push({ id: pkg.id, customerName: pkg.customerName, packageName: pkg.packageName, packageType: 'services', remaining: remainingSessions });
      continue;
    }
    if (totalSessions <= 0) continue;
    for (const item of pkg.items) {
      const rem = Math.max(0, Number(item.qtyRemaining) || 0);
      if (rem <= 0) continue;
      const amount = round2(((Number(pkg.pricePaid) || 0) * rem) / totalSessions);
      const key = item.serviceId === null ? `name:${item.serviceName}` : `id:${item.serviceId}`;
      const line = serviceMap.get(key) || { serviceId: item.serviceId, serviceName: item.serviceName, sessionsRemaining: 0, amount: 0 };
      line.sessionsRemaining += rem;
      line.amount = round2(line.amount + amount);
      serviceMap.set(key, line);
      if (isExpired) expiredTotal += amount; else activeTotal += amount;
    }
  }

  const services = Array.from(serviceMap.values()).sort((a, b) => b.amount - a.amount);
  return {
    total: round2(activeTotal + expiredTotal),
    activeTotal: round2(activeTotal),
    expiredTotal: round2(expiredTotal),
    pulses: { packages: pulsePackages, pulsesRemaining: pulsesRemainingTotal, amount: round2(pulseAmount) },
    services,
    pending: { count: pending.length, packages: pending },
  };
}
