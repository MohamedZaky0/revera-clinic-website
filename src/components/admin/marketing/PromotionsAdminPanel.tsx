"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Tag, Pencil, Trash2 } from "lucide-react";
import { ServiceItem } from "@/lib/services";
import { Branch } from "@/types";

interface PromotionsAdminPanelProps {
  localServices: ServiceItem[];
  setLocalServices: (services: ServiceItem[]) => void;
  branches: Branch[];
  syncServicesToApi: (services: ServiceItem[]) => Promise<ServiceItem[] | null>;
}

export function PromotionsAdminPanel({ localServices, setLocalServices, branches, syncServicesToApi }: PromotionsAdminPanelProps) {
  // Promotions management states
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<{
    serviceId: number;
    branchName: string;
    type: "percentage" | "fixed";
    value: number;
    startDate?: string;
    endDate?: string;
  } | null>(null);
  const [promoServiceIds, setPromoServiceIds] = useState<number[]>([]);
  const [promoServiceSearch, setPromoServiceSearch] = useState<string>("");
  const [promoBranchNames, setPromoBranchNames] = useState<string[]>([]);
  const [promoType, setPromoType] = useState<"percentage" | "fixed">("percentage");
  const [promoValue, setPromoValue] = useState<number>(0);
  const [promoStartDate, setPromoStartDate] = useState<string>("");
  const [promoEndDate, setPromoEndDate] = useState<string>("");
  const [promoSearchQuery, setPromoSearchQuery] = useState<string>("");
  const [promoFilterBranch, setPromoFilterBranch] = useState<string>("All");
  const [promoFilterStatus, setPromoFilterStatus] = useState<string>("All");

  // Promotions action handlers
  const promotionsList = useMemo(() => {
    const list: Array<{
      serviceId: number;
      serviceNameEn: string;
      serviceNameAr: string;
      branchName: string;
      basePrice: number;
      promotion: {
        enabled: boolean;
        type: "percentage" | "fixed";
        value: number;
        startDate?: string;
        endDate?: string;
      };
    }> = [];

    localServices.forEach(service => {
      if (Array.isArray(service.branchPricing)) {
        service.branchPricing.forEach((bp: any) => {
          if (bp.promotion) {
            list.push({
              serviceId: service.id,
              serviceNameEn: service.en,
              serviceNameAr: service.ar || "",
              branchName: bp.name,
              basePrice: bp.price,
              promotion: bp.promotion
            });
          }
        });
      }
    });

    return list;
  }, [localServices]);

  const getPromotionStatus = (promo: any) => {
    if (!promo || !promo.enabled) return "disabled";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    if (promo.startDate && todayStr < promo.startDate) return "scheduled";
    if (promo.endDate && todayStr > promo.endDate) return "expired";
    return "active";
  };

  const handleSavePromotion = async () => {
    if ((promoServiceIds.length === 0 && !editingPromo) || promoBranchNames.length === 0) return;

    const promoObj = {
      enabled: true,
      type: promoType,
      value: promoValue,
      startDate: promoStartDate || undefined,
      endDate: promoEndDate || undefined
    };

    const serviceIdsToUpdate = editingPromo
      ? [editingPromo.serviceId]
      : promoServiceIds;

    // Apply promotion to ALL selected branches
    const branchesToApply = promoBranchNames;

    const updatedServices = localServices.map(svc => {
      if (serviceIdsToUpdate.includes(svc.id)) {
        // Build branchPricing: use existing or create entry from global branches
        const bpArray = Array.isArray(svc.branchPricing) && svc.branchPricing.length > 0
          ? [...svc.branchPricing]
          : branches.map(b => ({ name: b.name_en, price: svc.price ?? 0, visible: true, status: true, isDefault: false }));

        // Ensure all selected branches exist in bpArray
        branchesToApply.forEach(branchName => {
          const branchExists = bpArray.some((bp: any) => bp.name.toLowerCase() === branchName.toLowerCase());
          if (!branchExists) {
            bpArray.push({ name: branchName, price: svc.price ?? 0, visible: true, status: true, isDefault: false } as any);
          }
        });

        const updatedBranchPricing = bpArray.map((bp: any) => {
          if (branchesToApply.some(b => b.toLowerCase() === bp.name.toLowerCase())) {
            return { ...bp, promotion: promoObj };
          }
          return bp;
        });
        return { ...svc, branchPricing: updatedBranchPricing };
      }
      return svc;
    });

    setLocalServices(updatedServices);
    await syncServicesToApi(updatedServices);
    setShowAddPromoModal(false);

    // Reset form states
    setPromoServiceIds([]);
    setPromoServiceSearch("");
    setPromoBranchNames([]);
    setPromoType("percentage");
    setPromoValue(0);
    setPromoStartDate("");
    setPromoEndDate("");
    setEditingPromo(null);
  };

  const handleDeletePromotion = async (serviceId: number, branchName: string) => {
    const updatedServices = localServices.map(svc => {
      if (svc.id === serviceId) {
        const updatedBranchPricing = (Array.isArray(svc.branchPricing) ? svc.branchPricing : []).map((bp: any) => {
          if (bp.name.toLowerCase() === branchName.toLowerCase()) {
            const { promotion, ...rest } = bp;
            return rest;
          }
          return bp;
        });
        return {
          ...svc,
          branchPricing: updatedBranchPricing
        };
      }
      return svc;
    });

    setLocalServices(updatedServices);
    await syncServicesToApi(updatedServices);
  };

  const handleTogglePromotion = async (serviceId: number, branchName: string, currentEnabled: boolean) => {
    const updatedServices = localServices.map(svc => {
      if (svc.id === serviceId) {
        const updatedBranchPricing = (Array.isArray(svc.branchPricing) ? svc.branchPricing : []).map((bp: any) => {
          if (bp.name.toLowerCase() === branchName.toLowerCase() && bp.promotion) {
            return {
              ...bp,
              promotion: {
                ...bp.promotion,
                enabled: !currentEnabled
              }
            };
          }
          return bp;
        });
        return {
          ...svc,
          branchPricing: updatedBranchPricing
        };
      }
      return svc;
    });

    setLocalServices(updatedServices);
    await syncServicesToApi(updatedServices);
  };

  const handleOpenEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setPromoServiceIds([promo.serviceId]);
    setPromoServiceSearch("");
    setPromoBranchNames([promo.branchName]);
    setPromoType(promo.promotion.type);
    setPromoValue(promo.promotion.value);
    setPromoStartDate(promo.promotion.startDate || "");
    setPromoEndDate(promo.promotion.endDate || "");
    setShowAddPromoModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#1F251A]">Promotions & Discounts / عروض وخصومات الفروع</h2>
          <p className="text-xs text-[#5A6A51] mt-1">Manage special pricing, percentage discounts, and fixed discounts across branches</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingPromo(null);
              setPromoServiceIds([]);
              setPromoServiceSearch("");
              setPromoBranchNames([]);
              setPromoType("percentage");
              setPromoValue(0);
              setPromoStartDate("");
              setPromoEndDate("");
              setShowAddPromoModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-4 py-2 text-sm font-semibold text-[#414E36] shadow-sm transition hover:bg-[#b59e6c]"
          >
            <Plus size={14} /> Add Promotion
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[#414E36]/10">
        {/* Search query */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
          <input
            type="text"
            value={promoSearchQuery}
            onChange={(e) => setPromoSearchQuery(e.target.value)}
            placeholder="Search by service..."
            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] pl-9 pr-4 py-2 text-xs outline-none transition focus:border-[#C4AE7C] text-[#1F251A]"
          />
        </div>

        {/* Filter branch */}
        <div>
          <select
            value={promoFilterBranch}
            onChange={(e) => setPromoFilterBranch(e.target.value)}
            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs outline-none focus:border-[#C4AE7C] text-[#1F251A]"
          >
            <option value="All">All Branches</option>
            {Array.from(new Set(promotionsList.map(p => p.branchName))).map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>

        {/* Filter status */}
        <div>
          <select
            value={promoFilterStatus}
            onChange={(e) => setPromoFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs outline-none focus:border-[#C4AE7C] text-[#1F251A]"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {(() => {
        const filtered = promotionsList.filter(item => {
          // Search query match
          const matchesSearch = item.serviceNameEn.toLowerCase().includes(promoSearchQuery.toLowerCase()) ||
            item.serviceNameAr.toLowerCase().includes(promoSearchQuery.toLowerCase());

          // Branch match
          const matchesBranch = promoFilterBranch === "All" || item.branchName === promoFilterBranch;

          // Status match
          const status = getPromotionStatus(item.promotion);
          const matchesStatus = promoFilterStatus === "All" || status === promoFilterStatus;

          return matchesSearch && matchesBranch && matchesStatus;
        });

        if (filtered.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#414E36]/10 text-center">
              <div className="h-12 w-12 rounded-full bg-[#414E36]/5 flex items-center justify-center text-[#C4AE7C] mb-4">
                <Tag size={20} />
              </div>
              <h3 className="text-base font-bold text-[#1F251A]">No promotions found</h3>
              <p className="text-xs text-[#5A6A51] max-w-sm mt-1">
                Get started by adding branch specific discount rules for your clinic's services.
              </p>
              <button
                onClick={() => setShowAddPromoModal(true)}
                className="mt-4 rounded-lg bg-[#414E36] px-4 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
              >
                Create Your First Promotion
              </button>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, index) => {
              const status = getPromotionStatus(item.promotion);
              const promoVal = item.promotion.value || 0;
              const basePrice = item.basePrice || 0;
              let finalPrice = basePrice;
              if (item.promotion.type === "percentage") {
                finalPrice = basePrice * (1 - promoVal / 100);
              } else {
                finalPrice = basePrice - promoVal;
              }
              finalPrice = Math.max(0, Math.round(finalPrice));

              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-[#414E36]/10 p-5 shadow-sm transition hover:shadow-md relative overflow-hidden flex flex-col justify-between"
                  style={{
                    filter: status === "disabled" ? "grayscale(100%)" : "none",
                    opacity: status === "disabled" ? 0.6 : 1
                  }}
                >
                  {/* Accent status border */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    status === "active" ? "bg-emerald-500" :
                    status === "scheduled" ? "bg-blue-400" :
                    status === "expired" ? "bg-amber-400" : "bg-gray-300"
                  }`} />

                  <div>
                    {/* Top badge line */}
                    <div className="flex justify-between items-start gap-2 mb-3 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#414E36]/5 text-[#414E36] px-2 py-0.5 rounded-md">
                        {item.branchName} Branch
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        status === "active" ? "bg-emerald-50 text-emerald-700" :
                        status === "scheduled" ? "bg-blue-50 text-blue-700" :
                        status === "expired" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {status}
                      </span>
                    </div>

                    {/* Service names */}
                    <h3 className="font-bold text-[#1F251A] text-sm leading-snug line-clamp-1">{item.serviceNameEn}</h3>
                    <h4 className="text-xs text-[#5A6A51] font-medium mt-0.5 dir-rtl text-right">{item.serviceNameAr}</h4>

                    {/* Pricing summary */}
                    <div className="mt-4 bg-[#FBFBF9] p-3 rounded-xl border border-[#414E36]/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#5A6A51] block font-semibold">Base Price</span>
                        <span className="text-xs font-semibold text-[#5A6A51]/80 line-through">{basePrice} EGP</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#C4AE7C] block font-bold">Offer Price</span>
                        <span className="text-sm font-extrabold text-[#414E36]">{finalPrice} EGP</span>
                      </div>
                    </div>

                    {/* Promo value details */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="bg-[#C4AE7C]/10 text-[#C4AE7C] font-bold px-2 py-0.5 rounded text-[10px]">
                        {item.promotion.type === "percentage" ? `${promoVal}% OFF` : `-${promoVal} EGP`}
                      </span>
                      <span className="text-[#5A6A51] text-[10px] font-medium">
                        {item.promotion.startDate || item.promotion.endDate ? (
                          <>
                            {item.promotion.startDate ? item.promotion.startDate : "Start"} to {item.promotion.endDate ? item.promotion.endDate : "End"}
                          </>
                        ) : (
                          "Always active"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Footer action bar */}
                  <div className="mt-5 pt-4 border-t border-[#414E36]/5 flex items-center justify-between gap-4">
                    {/* Toggle switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#5A6A51]">Enabled</span>
                      <button
                        onClick={() => handleTogglePromotion(item.serviceId, item.branchName, item.promotion.enabled)}
                        className="relative h-5 w-9 rounded-full focus:outline-none transition-colors duration-300"
                        style={{ backgroundColor: item.promotion.enabled ? "#414E36" : "#E2E8F0" }}
                      >
                        <span
                          className="absolute top-[2px] h-4.5 w-4.5 rounded-full bg-white shadow-md transition-all duration-300"
                          style={{ left: item.promotion.enabled ? "18px" : "2px" }}
                        />
                      </button>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditPromo(item)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E6E9EB] bg-[#F7F7F9] text-[#414E36] transition hover:bg-[#EDF1EC]"
                        title="Edit Promotion"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(item.serviceId, item.branchName)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                        title="Delete Promotion"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Add/Edit Promotion Modal */}
      {showAddPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#414E36]/10 animate-slideUp flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#414E36]/10 px-6 py-4">
              <h3 className="text-base font-bold text-[#1F251A]">
                {editingPromo ? "Edit Promotion / تعديل العرض" : "Add Promotion / إضافة عرض"}
              </h3>
              <button
                onClick={() => setShowAddPromoModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#FBFBF9]"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">

              {/* Services Multi-Select */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">
                  Select Services <span className="text-red-500">*</span>
                  {!editingPromo && promoServiceIds.length > 0 && (
                    <span className="ml-2 text-[10px] font-bold text-[#C4AE7C] bg-[#C4AE7C]/10 px-1.5 py-0.5 rounded-full">
                      {promoServiceIds.length} selected
                    </span>
                  )}
                </label>
                {editingPromo ? (
                  <div className="rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs text-[#1F251A] font-medium">
                    {localServices.find(s => s.id === editingPromo.serviceId)?.en || "—"}
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] overflow-hidden">
                    {/* Search inside list */}
                    <div className="relative border-b border-[#414E36]/10">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                      <input
                        type="text"
                        value={promoServiceSearch}
                        onChange={e => setPromoServiceSearch(e.target.value)}
                        placeholder="Search services..."
                        className="w-full bg-transparent pl-8 pr-3 py-2 text-xs outline-none text-[#1F251A] placeholder-[#5A6A51]/60"
                      />
                    </div>
                    {/* Select All / Clear row */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#414E36]/10 bg-[#F5F4F0]">
                      <button
                        type="button"
                        onClick={() => setPromoServiceIds(localServices.filter(s => s.en.toLowerCase().includes(promoServiceSearch.toLowerCase()) || (s.ar || "").toLowerCase().includes(promoServiceSearch.toLowerCase())).map(s => s.id))}
                        className="text-[10px] font-bold text-[#414E36] hover:underline"
                      >Select All</button>
                      <button
                        type="button"
                        onClick={() => setPromoServiceIds([])}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >Clear</button>
                    </div>
                    {/* Service list */}
                    <div className="max-h-44 overflow-y-auto">
                      {localServices
                        .filter(s => s.en.toLowerCase().includes(promoServiceSearch.toLowerCase()) || (s.ar || "").toLowerCase().includes(promoServiceSearch.toLowerCase()))
                        .map(svc => {
                          const checked = promoServiceIds.includes(svc.id);
                          return (
                            <label
                              key={svc.id}
                              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${
                                checked ? "bg-[#414E36]/5" : "hover:bg-[#414E36]/3"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setPromoServiceIds(prev =>
                                    checked ? prev.filter(id => id !== svc.id) : [...prev, svc.id]
                                  );
                                  setPromoBranchNames([]); // reset branches on change
                                }}
                                className="accent-[#414E36] h-3.5 w-3.5 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-[#1F251A] block truncate">{svc.en}</span>
                                {svc.ar && <span className="text-[10px] text-[#5A6A51] block truncate">{svc.ar}</span>}
                              </div>
                            </label>
                          );
                        })
                      }
                      {localServices.filter(s => s.en.toLowerCase().includes(promoServiceSearch.toLowerCase()) || (s.ar || "").toLowerCase().includes(promoServiceSearch.toLowerCase())).length === 0 && (
                        <div className="py-4 text-center text-xs text-[#5A6A51]">No services found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Branch Checkbox List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#5A6A51]">
                    Select Branches <span className="text-red-500">*</span>
                  </label>
                  {branches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (promoBranchNames.length === branches.length) {
                          setPromoBranchNames([]);
                        } else {
                          setPromoBranchNames(branches.map(b => b.name_en));
                        }
                      }}
                      className="text-[10px] font-bold text-[#414E36] underline hover:text-[#C4AE7C] transition"
                    >
                      {promoBranchNames.length === branches.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] divide-y divide-[#414E36]/10 max-h-40 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const branchList = branches.length > 0
                      ? branches.map(b => b.name_en)
                      : (() => {
                          const names = new Set<string>();
                          promoServiceIds.forEach(id => {
                            const svc = localServices.find(s => s.id === id);
                            (Array.isArray(svc?.branchPricing) ? svc.branchPricing : []).forEach((bp: any) => names.add(bp.name));
                          });
                          return Array.from(names);
                        })();
                    if (branchList.length === 0) {
                      return <p className="px-3 py-2 text-[10px] text-amber-600 font-medium">⚠ No branches found. Configure branches in Settings → Branches first.</p>;
                    }
                    return branchList.map(name => {
                      const checked = promoBranchNames.includes(name);
                      return (
                        <label key={name} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#EDF1EC]/60 transition">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setPromoBranchNames(prev =>
                                checked ? prev.filter(n => n !== name) : [...prev, name]
                              );
                            }}
                            className="h-3.5 w-3.5 rounded accent-[#414E36]"
                          />
                          <span className="text-xs font-medium text-[#1F251A]">{name}</span>
                        </label>
                      );
                    });
                  })()}
                </div>
                {promoBranchNames.length > 0 && (
                  <p className="mt-1 text-[10px] text-[#5A6A51] font-medium">{promoBranchNames.length} branch{promoBranchNames.length > 1 ? 'es' : ''} selected</p>
                )}
              </div>

              {/* Discount Type */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">Discount Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromoType("percentage")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      promoType === "percentage"
                        ? "bg-[#414E36] border-[#414E36] text-white"
                        : "bg-white border-[#414E36]/15 text-[#5A6A51] hover:bg-[#414E36]/5"
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoType("fixed")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      promoType === "fixed"
                        ? "bg-[#414E36] border-[#414E36] text-white"
                        : "bg-white border-[#414E36]/15 text-[#5A6A51] hover:bg-[#414E36]/5"
                    }`}
                  >
                    Fixed Amount (EGP)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5A6A51]">
                  Discount Value ({promoType === "percentage" ? "%" : "EGP"}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={promoValue}
                  onChange={(e) => setPromoValue(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2 text-xs outline-none transition focus:border-[#C4AE7C] text-[#1F251A] font-medium"
                />
              </div>

              {/* Start/End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-[#5A6A51]">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-2 py-1.5 text-xs outline-none focus:border-[#C4AE7C] text-[#1F251A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-[#5A6A51]">End Date (Optional)</label>
                  <input
                    type="date"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-2 py-1.5 text-xs outline-none focus:border-[#C4AE7C] text-[#1F251A]"
                  />
                </div>
              </div>

              {/* Live Price note — shows for single-service selection only */}
              {promoServiceIds.length === 1 && promoBranchNames.length > 0 && (() => {
                const selectedSvc = localServices.find(s => s.id === promoServiceIds[0]);
                if (!selectedSvc) return null;
                const branchesToPreview = promoBranchNames.includes("All")
                  ? branches.map(b => b.name_en)
                  : promoBranchNames;
                return (
                  <div className="pt-3 border-t border-[#414E36]/10 space-y-1.5">
                    <div className="text-xs font-bold text-[#414E36] mb-1">Preview Selling Price by Branch / معاينة السعر حسب الفرع:</div>
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                      {branchesToPreview.map(branchName => {
                        const selectedBp = (Array.isArray(selectedSvc.branchPricing) ? selectedSvc.branchPricing : []).find((bp: any) => bp.name.toLowerCase() === branchName.toLowerCase());
                        const basePrice = selectedBp ? selectedBp.price : (selectedSvc.price || 0);
                        const calcPrice = promoType === "percentage"
                          ? basePrice * (1 - promoValue / 100)
                          : basePrice - promoValue;
                        const isNegative = calcPrice < 0;
                        const finalDisplayPrice = Math.max(0, Math.round(calcPrice));
                        return (
                          <div key={branchName} className="flex justify-between items-center text-xs text-[#1F251A] bg-[#FBFBF9] p-1.5 rounded border border-[#414E36]/5">
                            <span className="font-medium text-[#414E36]">{branchName}</span>
                            <div className="text-right">
                              <span className={isNegative ? "text-red-500 font-extrabold" : "text-[#C4AE7C] font-bold"}>
                                {finalDisplayPrice} EGP
                              </span>
                              <span className="text-[10px] text-[#5A6A51] ml-1.5">(Base: {basePrice} EGP)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(promoServiceIds.length > 1 || promoBranchNames.length > 1) && (
                <div className="pt-3 border-t border-[#414E36]/10">
                  <p className="text-[10px] text-[#5A6A51] font-medium">
                    ℹ This promotion will apply to <strong>{editingPromo ? 1 : promoServiceIds.length} service{(!editingPromo && promoServiceIds.length > 1) ? 's' : ''}</strong> across <strong>{promoBranchNames.length > 0 ? promoBranchNames.join(', ') : 'selected'}</strong> branch{promoBranchNames.length > 1 ? 'es' : ''}.
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#414E36]/10 px-6 py-4 flex items-center justify-end gap-3 bg-[#FBFBF9] rounded-b-2xl">
              <button
                onClick={() => setShowAddPromoModal(false)}
                className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-xs font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
              >
                Cancel
              </button>
              <button
                disabled={(editingPromo ? false : promoServiceIds.length === 0) || promoBranchNames.length === 0}
                onClick={handleSavePromotion}
                className={`rounded-lg px-5 py-2 text-xs font-semibold text-[#FBFBF9] transition ${
                  (editingPromo ? false : promoServiceIds.length === 0) || promoBranchNames.length === 0
                    ? "bg-[#414E36]/50 cursor-not-allowed"
                    : "bg-[#414E36] hover:bg-[#2e3a26]"
                }`}
              >
                {editingPromo ? "Save Changes" : promoServiceIds.length > 1 ? `Apply to ${promoServiceIds.length} Services` : "Save Promotion"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
