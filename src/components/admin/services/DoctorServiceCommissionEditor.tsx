'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

export interface ServiceOption {
  id: number;
  en: string;
  ar?: string;
  cat?: string;
}

export interface ServiceCategoryOption {
  key: string;
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
  categories?: ServiceCategoryOption[];
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
  categories = [],
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

  // Category picker (additive, alongside the "+ Add Service" dropdown above): lets the admin
  // narrow the service checklist to one or more categories at once. Checkboxes rather than a
  // <select> on purpose — a native select closes after every pick, so checking several
  // categories one at a time meant reopening it each time.
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);

  const categoryLookup = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.key, c.en || c.key));
    return map;
  }, [categories]);

  const categoryList = useMemo(() => {
    const seen = new Map<string, string>();
    allServices.forEach((s) => {
      const key = s.cat || '';
      if (!key || seen.has(key)) return;
      seen.set(key, categoryLookup.get(key) || key);
    });
    return Array.from(seen.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allServices, categoryLookup]);

  const toggleCategoryFilter = (key: string) => {
    setCategoryFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const servicesInView = useMemo(() => {
    const byCategory = categoryFilters.length === 0
      ? allServices
      : allServices.filter((s) => categoryFilters.includes(s.cat || ''));
    return [...byCategory].sort((a, b) => a.en.localeCompare(b.en));
  }, [allServices, categoryFilters]);

  const toggleServiceChecked = (svc: ServiceOption, checked: boolean) => {
    if (checked) handleAddService(svc.en);
    else handleRemoveService(svc.en);
  };

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
    ? 'block text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-secondary)] mb-1'
    : 'block text-xs uppercase tracking-wider text-[var(--color-brand-secondary)] font-bold mb-1.5';

  const inputClass = compact
    ? 'w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-white px-3 py-1.5 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]'
    : 'w-full rounded-2xl border border-[var(--cr-primary)]/15 bg-white px-4 py-2 text-sm text-[var(--cr-dark)] outline-none focus:border-[var(--cr-accent)]';

  const selectClass = inputClass;

  return (
    <div className="space-y-4">
      {/* Default commission fallback */}
      <div className="rounded-2xl border border-[var(--cr-primary)]/10 bg-white p-3 space-y-3">
        <h4 className={compact ? 'text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-secondary)] border-b border-[var(--cr-primary)]/10 pb-2' : 'text-xs font-bold uppercase tracking-wider text-[var(--cr-primary)] border-b border-[var(--cr-primary)]/10 pb-2'}>
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
      <div className="rounded-2xl border border-[var(--cr-primary)]/10 bg-white p-3 space-y-3">
        <h4 className={compact ? 'text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-secondary)] border-b border-[var(--cr-primary)]/10 pb-2' : 'text-xs font-bold uppercase tracking-wider text-[var(--cr-primary)] border-b border-[var(--cr-primary)]/10 pb-2'}>
          Services &amp; Commissions
        </h4>

        {services.length === 0 && (
          <p className="text-xs text-[var(--color-brand-secondary)]">No services added. Use the button below to add a service.</p>
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
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-[var(--cr-primary)]/10 bg-[var(--color-brand-light)] p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--cr-dark)] truncate">{serviceName}</div>
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

        {/* Add service — quick single pick */}
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

        {/* Add service, by category — on top of the quick picker above, not instead of it */}
        <div className="rounded-xl border border-[var(--cr-primary)]/10 bg-[var(--color-brand-light)] p-3 space-y-2.5 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className={`${labelClass} mb-0`}>Browse by Category</label>
              {categoryFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryFilters([])}
                  className="text-[11px] font-semibold text-[var(--color-brand-secondary)] hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            {/* Checkboxes, not a <select> — a dropdown closes after every pick, which made
                checking several categories in a row annoying (reopen, pick, reopen, pick...). */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {categoryList.map((c) => {
                const checked = categoryFilters.includes(c.key);
                return (
                  <label
                    key={c.key}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--cr-dark)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategoryFilter(c.key)}
                      className="h-3.5 w-3.5 rounded border-[var(--cr-primary)]/20 text-[var(--cr-primary)] focus:ring-[var(--cr-accent)]"
                    />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </div>

          {servicesInView.length === 0 ? (
            <p className="text-xs text-[var(--color-brand-secondary)]">No services in this category.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--cr-primary)]">
                <button
                  type="button"
                  onClick={() => {
                    const toAdd = servicesInView.filter((s) => !services.includes(s.en));
                    if (toAdd.length === 0) return;
                    onServicesChange([...services, ...toAdd.map((s) => s.en)]);
                    const initialType: PerServiceCommissionType =
                      defaultType === 'both' ? 'fixed' : (defaultType as PerServiceCommissionType);
                    onCommissionsChange([
                      ...commissions,
                      ...toAdd.map((s) => ({
                        service: s.en,
                        serviceId: s.id,
                        type: initialType,
                        value: Number(defaultValue || 0),
                      })),
                    ]);
                  }}
                  className="hover:underline"
                >
                  Select all in view
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const inView = new Set(servicesInView.map((s) => s.en));
                    onServicesChange(services.filter((s) => !inView.has(s)));
                    onCommissionsChange(commissions.filter((c) => !inView.has(c.service)));
                  }}
                  className="hover:underline"
                >
                  Clear all in view
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {servicesInView.map((svc) => {
                  const checked = services.includes(svc.en);
                  return (
                    <label
                      key={svc.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--cr-dark)] hover:bg-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleServiceChecked(svc, e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--cr-primary)]/20 text-[var(--cr-primary)] focus:ring-[var(--cr-accent)]"
                      />
                      <span className="truncate">{svc.en}{svc.ar ? ` - ${svc.ar}` : ''}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
