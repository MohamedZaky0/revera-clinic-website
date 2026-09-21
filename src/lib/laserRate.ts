function positiveRate(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function resolveLaserPulseRate({
  reservationRate,
  clinicDefaultRate,
  notes,
}: {
  reservationRate: unknown;
  clinicDefaultRate: unknown;
  notes?: unknown;
}): number | null {
  const snapshotRate = positiveRate(reservationRate);
  if (snapshotRate !== null) return snapshotRate;

  const defaultRate = positiveRate(clinicDefaultRate);
  if (defaultRate !== null) return defaultRate;

  // Legacy read only: reservations created before laser_price_per_pulse existed stored the rate in notes.
  const match = String(notes || '').match(/@\s*(\d+(?:\.\d+)?)\s*EGP\/pulse/i);
  return positiveRate(match?.[1]);
}
