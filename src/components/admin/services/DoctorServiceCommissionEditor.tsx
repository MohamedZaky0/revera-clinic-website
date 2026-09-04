'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';

export interface ServiceOption {
  id: number;
  en: string;
  ar?: string;
}

export type PerServiceCommissionType = 'none' | 'fixed' | 'percentage';

export interface ServiceCommissionEntry {
  service: string;
  serviceId?: number;
  type: PerServiceCommissionType;
  value: number;
}

export type DefaultCommissionType = 'none' | 'fixed' | 'percentage' | 'both';

interface DoctorServiceCommissionEditorProps {
  allServices: ServiceOption[];
  services: string[];
  commissions: ServiceCommissionEntry[];
  defaultType: DefaultCommissionType;
  defaultValue: string;
  defaultBase?: 'gross' | 'net_of_materials';
  defaultFixedComponent?: string;
  onServicesChange: (services: string[]) => void;
  onCommissionsChange: (commissions: ServiceCommissionEntry[]) => void;
  onDefaultTypeChange?: (type: DefaultCommissionType) => void;
  onDefaultValueChange?: (value: string) => void;
  onDefaultBaseChange?: (base: 'gross' | 'net_of_materials') => void;
  onDefaultFixedComponentChange?: (value: string) => void;
  compact?: boolean;
}

export function DoctorServiceCommissionEditor({
  allServices,
  services,
  commissions,
  defaultType,
  defaultValue,
  defaultBase = 'gross',
  defaultFixedComponent = '0',
  onServicesChange,
  onCommissionsChange,
  onDefaultTypeChange,
  onDefaultValueChange,
  onDefaultBaseChange,
  onDefaultFixedComponentChange,
  compact,
}: DoctorServiceCommissionEditorProps) {
  const availableToAdd = useMemo(() => {
    const selectedSet = new Set(services);
    return allServices.filter((s) => !selectedSet.has(s.en)).sort((a, b) => a.en.localeCompare(b.en));
  }, [allServices, services]);

  const getCommission = (serviceName: string): ServiceCommissionEntry | undefined => {
    return commissions.find((c) => c.service === serviceName);
  };

  const updateCommission = (serviceName: string, patch: Partial<ServiceCommissionEntry>) => {
    const existing = getCommission(serviceName);
    let next: ServiceCommissionEntry[];
    if (existing) {
      next = commissions.map((c) =>
        c.service === serviceName ? { ...c, ...patch } : c
      );
    } else {
      const svc = allServices.find((s) => s.en === serviceName);
      next = [
        ...commissions,
        {
          service: serviceName,
          serviceId: svc?.id,
          type: defaultType === 'both' ? 'fixed' : (defaultType as PerServiceCommissionType),
          value: Number(defaultValue || 0),
          ...patch,
        },
      ];
    }
    onCommissionsChange(next);
  };

  const handleAddService = (serviceName: string) => {
    if (!serviceName || services.includes(serviceName)) return;
    const svc = allServices.find((s) => s.en === serviceName);
    const initialType: PerServiceCommissionType =
      defaultType === 'both' ? 'fixed' : (defaultType as PerServiceCommissionType);
    onServicesChange([...services, serviceName]);
    onCommissionsChange([
      ...commissions,
      {
        service: serviceName,
        serviceId: svc?.id,
        type: initialType,
        value: Number(defaultValue || 0),
      },
    ]);
  };

  const handleRemoveService = (serviceName: string) => {
    onServicesChange(services.filter((s) => s !== serviceName));
    onCommissionsChange(commissions.filter((c) => c.service !== serviceName));
  };

  const labelClass = compact
    ? 'block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1'
    : 'block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5';

  const inputClass = compact
    ? 'w-full rounded-2xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]'
    : 'w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]';

  const selectClass = inputClass;

  return (
    <div className="space-y-4">
      {/* Default commission fallback */}
      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-3 space-y-3">
        <h4 className={compact ? 'text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] border-b border-[#414E36]/10 pb-2' : 'text-xs font-bold uppercase tracking-wider text-[#414E36] border-b border-[#414E36]/10 pb-2'}>
          Default Commission (fallback when a service has no override)
        </h4>
        <div className={`grid gap-3 ${compact ? 'sm:grid-cols-3' : 'md:grid-cols-3'}`}>
          {onDefaultBaseChange && (
            <div>
              <label className={labelClass}>Base</label>
              <select
                value={defaultBase}
                onChange={(e) => onDefaultBaseChange(e.target.value as 'gross' | 'net_of_materials')}
                className={selectClass}
              >
                <option value="gross">Gross service price</option>
                <option value="net_of_materials">Net after materials</option>
              </select>
            </div>
          )}
          {onDefaultTypeChange && (
            <div>
              <label className={labelClass}>Commission Type</label>
              <select
                value={defaultType}
                onChange={(e) => onDefaultTypeChange(e.target.value as DefaultCommissionType)}
                className={selectClass}
              >
                <option value="none">None</option>
                <option value="fixed">Fixed Amount per Service</option>
                <option value="percentage">Percentage of Service Price</option>
                <option value="both">Fixed + Percentage</option>
              </select>
            </div>
          )}
          {onDefaultValueChange && (defaultType === 'percentage' || defaultType === 'both') && (
            <div>
              <label className={labelClass}>Percentage (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 10"
                value={defaultValue}
                onChange={(e) => onDefaultValueChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          {onDefaultFixedComponentChange && (defaultType === 'both' || defaultType === 'fixed') && (
            <div>
              <label className={labelClass}>Fixed Component (EGP)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150"
                value={defaultFixedComponent}
                onChange={(e) => onDefaultFixedComponentChange(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* Per-service commission list */}
      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-3 space-y-3">
        <h4 className={compact ? 'text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] border-b border-[#414E36]/10 pb-2' : 'text-xs font-bold uppercase tracking-wider text-[#414E36] border-b border-[#414E36]/10 pb-2'}>
          Services &amp; Commissions
        </h4>

        {services.length === 0 && (
          <p className="text-xs text-[#5A6A51]">No services added. Use the button below to add a service.</p>
        )}

        <div className="space-y-2">
          {services.map((serviceName) => {
            const svc = allServices.find((s) => s.en === serviceName);
            const commission = getCommission(serviceName);
            const type = commission?.type || (defaultType === 'both' ? 'fixed' : (defaultType as PerServiceCommissionType)) || 'none';
            const value = commission ? String(commission.value) : defaultValue;
            return (
              <div
                key={serviceName}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-[#414E36]/10 bg-[#FBFBF9] p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1F251A] truncate">{serviceName}</div>
                  {svc?.ar && <div className="text-[10px] text-gray-400 truncate">{svc.ar}</div>}
                </div>
                <div className="flex flex-1 gap-2 items-center">
                  <select
                    value={type}
                    onChange={(e) => updateCommission(serviceName, { type: e.target.value as PerServiceCommissionType })}
                    className={`${selectClass} flex-1`}
                  >
                    <option value="none">Use default</option>
                    <option value="fixed">Fixed (EGP)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                  {type !== 'none' && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={type === 'fixed' ? 'EGP' : '%'}
                      value={value}
                      onChange={(e) => updateCommission(serviceName, { value: Number(e.target.value) })}
                      className={`${inputClass} flex-1`}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveService(serviceName)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition self-start sm:self-center"
                  title="Remove service"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add service */}
        <div className="flex items-center gap-2 pt-1">
          <select
            value=""
            onChange={(e) => {
              handleAddService(e.target.value);
              e.target.value = '';
            }}
            className={selectClass}
          >
            <option value="">+ Add Service</option>
            {availableToAdd.map((svc) => (
              <option key={svc.id} value={svc.en}>
                {svc.en} {svc.ar ? `- ${svc.ar}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
