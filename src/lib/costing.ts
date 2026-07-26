export type CommissionType = 'fixed' | 'percentage' | 'both' | 'none';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function nonNegativeNumber(value: number, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a finite number greater than or equal to 0.`);
  }
  return parsed;
}

export function consumptionCost(entries: Array<{ qty: number; unitCostSnapshot: number }>): number {
  return round2(entries.reduce((total, entry) => {
    return total + nonNegativeNumber(entry.qty, 'qty') * nonNegativeNumber(entry.unitCostSnapshot, 'unitCostSnapshot');
  }, 0));
}

export function costPerPulse(lampReplacementCost: number, ratedPulses: number): number {
  const cost = nonNegativeNumber(lampReplacementCost, 'lampReplacementCost');
  const pulses = Number(ratedPulses);
  if (!Number.isFinite(pulses) || pulses <= 0) {
    throw new Error('ratedPulses must be a finite number greater than 0.');
  }
  return round2(cost / pulses);
}

export function computeCommission(
  base: number,
  type: CommissionType,
  value: number,
  fixedComponent = 0
): number {
  const commissionBase = nonNegativeNumber(base, 'base');
  const commissionValue = nonNegativeNumber(value, 'value');
  const fixed = nonNegativeNumber(fixedComponent, 'fixedComponent');

  switch (type) {
    case 'none':
      return 0;
    case 'fixed':
      return round2(commissionValue);
    case 'percentage':
      return round2(commissionBase * commissionValue / 100);
    case 'both':
      return round2(fixed + commissionBase * commissionValue / 100);
    default:
      throw new Error(`Unsupported commission type: ${type}`);
  }
}
