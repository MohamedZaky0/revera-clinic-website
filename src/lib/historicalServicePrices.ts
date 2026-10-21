/**
 * A booking added through "Add Previous Booking" carries the Invoice Value that was typed when it
 * was entered, which is the price the patient was actually charged at the time (DEC-120). The
 * booking details screen used to price the service lines from the CURRENT catalog instead and only
 * let the invoice value raise the total, never lower it, so after a price change (or when the
 * invoice was lower than today's catalog price) an old booking showed today's price.
 *
 * The stored invoice value is a single number for the whole booking, while the screen lists one
 * line per service. This spreads the services' share of that number over the lines in proportion
 * to their catalog prices (equally when the catalog gives no basis), so the lines add up to exactly
 * what was charged. It allocates a known total; it never invents one.
 */
export function allocateServicePrices(catalogPrices: number[], targetTotal: number): number[] {
  const n = catalogPrices.length;
  if (n === 0) return [];
  const target = Number.isFinite(targetTotal) && targetTotal > 0 ? Math.round(targetTotal * 100) / 100 : 0;
  if (target === 0) return catalogPrices.map(() => 0);

  const clean = catalogPrices.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const sum = clean.reduce((a, b) => a + b, 0);

  const shares = sum > 0
    ? clean.map((p) => Math.round(((p / sum) * target) * 100) / 100)
    : clean.map(() => Math.round((target / n) * 100) / 100);

  // rounding can leave a cent or two over/under: the last line takes the difference
  const allocated = shares.slice(0, n - 1).reduce((a, b) => a + b, 0);
  shares[n - 1] = Math.round((target - allocated) * 100) / 100;
  return shares;
}
