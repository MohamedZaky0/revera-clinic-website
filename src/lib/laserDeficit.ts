export type PackageDeficitChoice = 'BUY_NEW_PACKAGE' | 'PAY_PER_PULSE' | null | undefined;

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function nonNegativeAmount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function resolveDeliveredPulses(primaryPulses: unknown, additionalLaserPulses: unknown): number {
  return nonNegativeInteger(primaryPulses) + nonNegativeInteger(additionalLaserPulses);
}

export function computePackageDeficit({
  deliveredPulses,
  remainingPulses,
  hasActivePackage,
}: {
  deliveredPulses: unknown;
  remainingPulses: unknown;
  hasActivePackage: boolean;
}): number {
  if (!hasActivePackage) return 0;
  return Math.max(0, nonNegativeInteger(deliveredPulses) - nonNegativeInteger(remainingPulses));
}

export function computeDeficitInvoiceImpact({
  deficitPulses,
  choice,
  pricePerPulse,
  newPackagePrice,
}: {
  deficitPulses: unknown;
  choice: PackageDeficitChoice;
  pricePerPulse: unknown;
  newPackagePrice: unknown;
}): number {
  const deficit = nonNegativeInteger(deficitPulses);
  return choice === 'PAY_PER_PULSE'
    ? deficit * nonNegativeAmount(pricePerPulse)
    : nonNegativeAmount(newPackagePrice);
}

/**
 * Extracts the pulse quota or remaining pulse count from reservation notes across all supported formats:
 * 1. Explicit remaining pulses format: "(2,500 pulses remaining)"
 * 2. New Package Purchase format: "[Purchasing New Pulses Package]: Name (1500 EGP · 2,500 pulses)"
 * 3. Package Redemption format: "[Laser Package Redemption]: Name (2,500 pulses)"
 * 4. General package note: "[Laser Package]: ... 2,500 pulses"
 */
export function extractPulsePackageQuota(notesStr?: string | null): number | null {
  if (!notesStr || typeof notesStr !== 'string') return null;

  // 1. Explicit remaining pulses format: "(X pulses remaining)"
  const remMatch = notesStr.match(/(\d+(?:,\d+)?)\s*pulses remaining/i);
  if (remMatch) return Number(remMatch[1].replace(/,/g, ''));

  // 2. New Package Purchase format: "[Purchasing New Pulses Package]: Name (Price EGP · 2,500 pulses)"
  const newPkgMatch = notesStr.match(/\[(?:Purchasing New Pulses Package|Laser Package Purchase & Redemption)\]:[^(]*\([^)]*?[·•]\s*(\d+(?:,\d+)?)\s*pulses/i) ||
    notesStr.match(/\[(?:Purchasing New Pulses Package|Laser Package Purchase & Redemption)\]:[^(]*\((\d+(?:,\d+)?)\s*pulses/i);
  if (newPkgMatch) return Number(newPkgMatch[1].replace(/,/g, ''));

  // 3. Fallback to any quota in bracketed package line:
  const pkgLineMatch = notesStr.match(/\[(?:Laser Package|Laser Package Redemption|Purchasing New Pulses Package)[^\]]*\]:[^\n]*?(\d+(?:,\d+)?)\s*pulses/i);
  if (pkgLineMatch) return Number(pkgLineMatch[1].replace(/,/g, ''));

  return null;
}

