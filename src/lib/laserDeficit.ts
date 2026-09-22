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
