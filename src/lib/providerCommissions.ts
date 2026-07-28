export type ServiceCommissionType = 'none' | 'fixed' | 'percentage';

export interface ServiceCommissionEntry {
  service: string;
  serviceId?: number;
  type: ServiceCommissionType;
  value: number;
}

const ALLOWED_SERVICE_COMMISSION_TYPES: ServiceCommissionType[] = ['none', 'fixed', 'percentage'];

export function normalizeServiceCommissions(input: unknown): ServiceCommissionEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: any) => ({
      service: String(item?.service || ''),
      serviceId: item?.serviceId ? Number(item.serviceId) : undefined,
      type: ALLOWED_SERVICE_COMMISSION_TYPES.includes(item?.type) ? item.type : 'none',
      value: Number.isFinite(Number(item?.value)) ? Number(item.value) : 0,
    }))
    .filter((item) => item.service);
}
