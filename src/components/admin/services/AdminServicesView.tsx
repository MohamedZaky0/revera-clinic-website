"use client";

import {
  Upload,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  GripVertical,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { ServiceItem, getDurationInMinutes } from "@/lib/services";
import {
  LocalCategory,
  saveDynamicCategories,
  setServiceToggle,
} from "@/lib/serviceStore";
import { compressImage } from "@/lib/image";
import ServiceRecipeEditor from "@/components/admin/services/ServiceRecipeEditor";
import ServiceDeviceEditor from "@/components/admin/services/ServiceDeviceEditor";
import { adminTranslations } from "@/components/admin/translations";

interface AdminServicesViewProps {
  // State
  localServices: ServiceItem[];
  setLocalServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  localCategories: LocalCategory[];
  setLocalCategories: React.Dispatch<React.SetStateAction<LocalCategory[]>>;
  expandedCategories: Record<string, boolean>;
  setExpandedCategories: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showAddCategoryModal: boolean;
  setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddServiceModal: boolean;
  setShowAddServiceModal: React.Dispatch<React.SetStateAction<boolean>>;
  addServiceTargetCategory: string;
  setAddServiceTargetCategory: React.Dispatch<React.SetStateAction<string>>;
  newCategoryNameEn: string;
  setNewCategoryNameEn: React.Dispatch<React.SetStateAction<string>>;
  newCategoryNameAr: string;
  setNewCategoryNameAr: React.Dispatch<React.SetStateAction<string>>;
  newServiceNameEn: string;
  setNewServiceNameEn: React.Dispatch<React.SetStateAction<string>>;
  newServiceNameAr: string;
  setNewServiceNameAr: React.Dispatch<React.SetStateAction<string>>;
  newServicePrice: string;
  setNewServicePrice: React.Dispatch<React.SetStateAction<string>>;
  deleteCategoryTarget: LocalCategory | null;
  setDeleteCategoryTarget: React.Dispatch<React.SetStateAction<LocalCategory | null>>;
  editingService: ServiceItem | null;
  setEditingService: React.Dispatch<React.SetStateAction<ServiceItem | null>>;
  deleteServiceTarget: ServiceItem | null;
  setDeleteServiceTarget: React.Dispatch<React.SetStateAction<ServiceItem | null>>;
  serviceNameEn: string;
  setServiceNameEn: React.Dispatch<React.SetStateAction<string>>;
  serviceNameAr: string;
  setServiceNameAr: React.Dispatch<React.SetStateAction<string>>;
  serviceCategory: string;
  setServiceCategory: React.Dispatch<React.SetStateAction<string>>;
  serviceDuration: string;
  setServiceDuration: React.Dispatch<React.SetStateAction<string>>;
  serviceDurationMinutes: number;
  setServiceDurationMinutes: React.Dispatch<React.SetStateAction<number>>;
  serviceUnitType: string;
  setServiceUnitType: React.Dispatch<React.SetStateAction<string>>;
  serviceDescEn: string;
  setServiceDescEn: React.Dispatch<React.SetStateAction<string>>;
  serviceDescAr: string;
  setServiceDescAr: React.Dispatch<React.SetStateAction<string>>;
  serviceSortOrder: number;
  setServiceSortOrder: React.Dispatch<React.SetStateAction<number>>;
  serviceIsShared: boolean;
  setServiceIsShared: React.Dispatch<React.SetStateAction<boolean>>;
  serviceEnableReminder: boolean;
  setServiceEnableReminder: React.Dispatch<React.SetStateAction<boolean>>;
  serviceImageUrl: string;
  setServiceImageUrl: React.Dispatch<React.SetStateAction<string>>;
  servicePrice: number;
  setServicePrice: React.Dispatch<React.SetStateAction<number>>;
  serviceBranchPricing: Required<ServiceItem>['branchPricing'];
  setServiceBranchPricing: React.Dispatch<React.SetStateAction<Required<ServiceItem>['branchPricing']>>;
  draggedServiceId: number | null;
  setDraggedServiceId: React.Dispatch<React.SetStateAction<number | null>>;
  dragOverServiceId: number | null;
  setDragOverServiceId: React.Dispatch<React.SetStateAction<number | null>>;
  rowDraggable: Record<number, boolean>;
  setRowDraggable: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  draggedCatKey: string | null;
  setDraggedCatKey: React.Dispatch<React.SetStateAction<string | null>>;
  dragOverCatKey: string | null;
  setDragOverCatKey: React.Dispatch<React.SetStateAction<string | null>>;
  catDraggable: Record<string, boolean>;
  setCatDraggable: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  serviceSearch: string;
  setServiceSearch: React.Dispatch<React.SetStateAction<string>>;
  serviceSortBy: "custom" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "newest";
  setServiceSortBy: React.Dispatch<React.SetStateAction<"custom" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "newest">>;
  showServiceFilterPanel: boolean;
  setShowServiceFilterPanel: React.Dispatch<React.SetStateAction<boolean>>;
  serviceFilterStatus: "All" | "Active" | "Inactive";
  setServiceFilterStatus: React.Dispatch<React.SetStateAction<"All" | "Active" | "Inactive">>;
  serviceToggles: Record<number, { visible: boolean; active: boolean }>;
  setServiceToggles: React.Dispatch<React.SetStateAction<Record<number, { visible: boolean; active: boolean }>>>;
  activeServiceRowMenuId: string | number | null;
  setActiveServiceRowMenuId: React.Dispatch<React.SetStateAction<string | number | null>>;
  // Computed
  filteredServices: ServiceItem[];
  groupedServices: Record<string, ServiceItem[]>;
  // Handlers
  handleEditService: (svc: ServiceItem) => void;
  handleReorderServices: (draggedId: number, targetId: number) => Promise<void>;
  handleReorderCategories: (draggedKey: string, targetKey: string) => void;
  toggleCategoryExpand: (cat: string) => void;
  removeCategory: (catKey: string) => Promise<void>;
  toggleService: (id: number, field: "visible" | "active") => void;
  // Shared/page-level
  syncServicesToApi: (services: ServiceItem[]) => Promise<ServiceItem[] | null>;
  loadServicesFromApi: () => Promise<void>;
  deleteServiceFromApi: (id: number) => Promise<boolean>;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  hasPermission: (perm: string) => boolean;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["services"];
}

export default function AdminServicesView(props: AdminServicesViewProps) {
  const {
    localServices, setLocalServices,
    localCategories, setLocalCategories,
    expandedCategories, setExpandedCategories,
    showAddCategoryModal, setShowAddCategoryModal,
    showAddServiceModal, setShowAddServiceModal,
    addServiceTargetCategory, setAddServiceTargetCategory,
    newCategoryNameEn, setNewCategoryNameEn,
    newCategoryNameAr, setNewCategoryNameAr,
    newServiceNameEn, setNewServiceNameEn,
    newServiceNameAr, setNewServiceNameAr,
    newServicePrice, setNewServicePrice,
    deleteCategoryTarget, setDeleteCategoryTarget,
    editingService, setEditingService,
    deleteServiceTarget, setDeleteServiceTarget,
    serviceNameEn, setServiceNameEn,
    serviceNameAr, setServiceNameAr,
    serviceCategory, setServiceCategory,
    serviceDuration, setServiceDuration,
    serviceDurationMinutes, setServiceDurationMinutes,
    serviceUnitType, setServiceUnitType,
    serviceDescEn, setServiceDescEn,
    serviceDescAr, setServiceDescAr,
    serviceSortOrder, setServiceSortOrder,
    serviceIsShared, setServiceIsShared,
    serviceEnableReminder, setServiceEnableReminder,
    serviceImageUrl, setServiceImageUrl,
    servicePrice, setServicePrice,
    serviceBranchPricing, setServiceBranchPricing,
    draggedServiceId, setDraggedServiceId,
    dragOverServiceId, setDragOverServiceId,
    rowDraggable, setRowDraggable,
    draggedCatKey, setDraggedCatKey,
    dragOverCatKey, setDragOverCatKey,
    catDraggable, setCatDraggable,
    serviceSearch, setServiceSearch,
    serviceSortBy, setServiceSortBy,
    showServiceFilterPanel, setShowServiceFilterPanel,
    serviceFilterStatus, setServiceFilterStatus,
    serviceToggles, setServiceToggles,
    activeServiceRowMenuId, setActiveServiceRowMenuId,
    filteredServices, groupedServices,
    handleEditService, handleReorderServices, handleReorderCategories,
    toggleCategoryExpand, removeCategory, toggleService,
    syncServicesToApi, loadServicesFromApi, deleteServiceFromApi,
    authenticatedJsonHeaders, hasPermission,
    lang, t,
  } = props;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[#1F251A]">{t.heading}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/30 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#414E36]/5">
            <Upload size={14} /> {t.importBtn}
          </button>
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#414E36] px-4 py-2 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] cursor-pointer"
          >
            <Plus size={14} /> {t.addCategoryBtn}
          </button>
        </div>
      </div>

      {/* Controls Bar: Search, Sort, Filter, and Expand/Collapse */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative max-w-xs flex-1 min-w-[220px] flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
              <input
                value={serviceSearch}
                onChange={(e) => { setServiceSearch(e.target.value); }}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white py-2 ps-9 pe-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowServiceFilterPanel(prev => !prev)}
              title={t.filterTitle}
              className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer shadow-2xs ${
                showServiceFilterPanel || serviceFilterStatus !== "All"
                  ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                  : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
              }`}
            >
              <Filter size={15} />
              {serviceFilterStatus !== "All" && (
                <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-[#5A6A51]" />
            <select
              value={serviceSortBy}
              onChange={(e) => setServiceSortBy(e.target.value as any)}
              className="rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#414E36] outline-none transition focus:border-[#C4AE7C] shadow-2xs cursor-pointer"
            >
              <option value="custom">{t.sortDefault}</option>
              <option value="name_asc">{t.sortNameAsc}</option>
              <option value="name_desc">{t.sortNameDesc}</option>
              <option value="price_asc">{t.sortPriceAsc}</option>
              <option value="price_desc">{t.sortPriceDesc}</option>
              <option value="newest">{t.sortNewest}</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const allExpanded = localCategories.every(c => expandedCategories[c.key] ?? true);
            const newStates = Object.fromEntries(localCategories.map(c => [c.key, !allExpanded]));
            setExpandedCategories(newStates);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#F9F9F7] transition shadow-2xs"
        >
          {localCategories.every(c => expandedCategories[c.key] ?? true) ? t.collapseAll : t.expandAll}
        </button>
      </div>

      {/* Dynamic Services Filter Panel */}
      {showServiceFilterPanel && (
        <div className="mb-5 grid grid-cols-1 gap-4 rounded-2xl border border-[#414E36]/10 bg-[#F9F9F7] p-4 md:grid-cols-3 items-end shadow-sm animate-fadeIn">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.statusFilterLabel}</label>
            <select
              value={serviceFilterStatus}
              onChange={(e) => setServiceFilterStatus(e.target.value as any)}
              className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            >
              <option value="All">{t.allStatuses}</option>
              <option value="Active">{t.activeOnly}</option>
              <option value="Inactive">{t.inactiveOnly}</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={() => {
                setServiceFilterStatus("All");
                setServiceSearch("");
              }}
              className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
            >
              {t.clearFilters}
            </button>
          </div>
        </div>
      )}

      {/* Category Accordions */}
      <div className="flex flex-col gap-4">
        {localCategories.map((cat) => {
          const catServicesRaw = (groupedServices[cat.key] ?? []).filter((svc) => {
            const toggles = serviceToggles[svc.id] ?? { visible: true, active: true };
            if (!toggles.visible) return false;
            if (serviceFilterStatus === "Active" && !toggles.active) return false;
            if (serviceFilterStatus === "Inactive" && toggles.active) return false;
            return true;
          });
          const catServices = [...catServicesRaw].sort((a, b) => {
            if (serviceSortBy === "name_asc") return (a.en || "").localeCompare(b.en || "");
            if (serviceSortBy === "name_desc") return (b.en || "").localeCompare(a.en || "");
            if (serviceSortBy === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
            if (serviceSortBy === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
            if (serviceSortBy === "newest") {
              const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return tB - tA;
            }
            return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          });
          const isExpanded = expandedCategories[cat.key] ?? true;
          const hasMatch = catServices.length > 0;
          if (serviceSearch.trim() && !hasMatch) return null;

          return (
            <div
              key={cat.key}
              draggable={!!catDraggable[cat.key]}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", cat.key);
                setDraggedCatKey(cat.key);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCatKey(cat.key);
              }}
              onDragEnd={() => {
                setDraggedCatKey(null);
                setDragOverCatKey(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedCatKey !== null && draggedCatKey !== cat.key) {
                  handleReorderCategories(draggedCatKey, cat.key);
                }
                setDraggedCatKey(null);
                setDragOverCatKey(null);
              }}
              className={`overflow-hidden rounded-2xl border border-[#414E36]/10 bg-white shadow-sm transition-all ${
                draggedCatKey === cat.key ? "opacity-30 bg-[#F2EFE9]" : ""
              } ${
                dragOverCatKey === cat.key ? "border-t-2 border-t-[#C4AE7C]" : ""
              }`}
            >
              {/* Category header row */}
              <div
                onClick={() => toggleCategoryExpand(cat.key)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#F9F9F7]"
              >
                <div className="flex items-center gap-3">
                  {/* Category Drag Handle */}
                  <div
                    onMouseEnter={() => setCatDraggable(prev => ({ ...prev, [cat.key]: true }))}
                    onMouseLeave={() => setCatDraggable(prev => ({ ...prev, [cat.key]: false }))}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing inline-flex h-7 w-7 items-center justify-center rounded border border-[#414E36]/10 bg-white text-[#5A6A51]/60 hover:bg-[#F2EFE9] hover:text-[#414E36] transition"
                    title={t.dragReorderCategory}
                  >
                    <GripVertical size={14} />
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF1EC]">
                    <Layers size={16} className="text-[#414E36]" />
                  </div>
                  <div className="text-start">
                    <p className="font-semibold text-[#1F251A]">{cat.en}</p>
                  </div>
                  <span className="ms-1 inline-flex items-center rounded-full bg-[#414E36]/8 px-2.5 py-0.5 text-xs font-semibold text-[#414E36]">
                    {catServices.length} {catServices.length !== 1 ? t.serviceCountSuffixPlural : t.serviceCountSuffix}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCategoryTarget(cat);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    {t.removeBtn}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddServiceTargetCategory(cat.key);
                      setServiceCategory(cat.key);
                      setServiceNameEn("");
                      setServiceNameAr("");
                      setServiceDuration("1:00 Hours");
                      setServiceDurationMinutes(60);
                      setServiceUnitType("both");
                      setServiceDescEn("");
                      setServiceDescAr("");
                      setServiceSortOrder(0);
                      setServiceIsShared(false);
                      setServiceEnableReminder(true);
                      setServiceImageUrl("");
                      setServicePrice(0);
                      setServiceBranchPricing([{ name: "Zayed", price: 0, visible: true, status: true, isDefault: true }]);
                      setEditingService(null);
                      setShowAddServiceModal(true);
                    }}
                    className={`${hasPermission("services.create") ? "inline-flex" : "hidden"} items-center gap-1.5 rounded-xl bg-[#414E36] px-3.5 py-1.5 text-xs font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] cursor-pointer`}
                  >
                    <Plus size={12} /> {t.addServiceBtn}
                  </button>
                  <span className="text-[#5A6A51] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <ChevronDown size={18} />
                  </span>
                </div>
              </div>

              {/* Services sub-table */}
              {isExpanded && (
                <div className="border-t border-[#414E36]/8">
                  {catServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF1EC]">
                        <Layers size={20} className="text-[#5A6A51]" />
                      </div>
                      <p className="text-sm font-medium text-[#1F251A]">{t.noServicesYet}</p>
                      <p className="text-xs text-[#5A6A51]">{t.noServicesHint}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead>
                          <tr className="bg-[#F9F9F7]">
                            <th className="w-10 px-3 py-2.5"></th>
                            <th className="px-5 py-2.5 text-start text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colId}</th>
                            <th className="px-5 py-2.5 text-start text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colName}</th>
                            <th className="px-5 py-2.5 text-start text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colCreatedAt}</th>
                            <th className="px-5 py-2.5 text-start text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colBranchPrice}</th>
                            <th className="px-5 py-2.5 text-start text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colBranches}</th>
                            <th className="px-5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colSortOrder}</th>
                            <th className="px-5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">{t.colStatus}</th>
                            <th className="px-3 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#414E36]/6">
                          {catServices.map((svc) => {
                            const toggles = serviceToggles[svc.id] ?? { visible: true, active: true };
                            const isInactive = !toggles.active;
                            const rowFaded = isInactive;
                            return (
                              <tr
                                key={svc.id}
                                draggable={!!rowDraggable[svc.id]}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", svc.id.toString());
                                  setDraggedServiceId(svc.id);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOverServiceId(svc.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedServiceId(null);
                                  setDragOverServiceId(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedServiceId !== null && draggedServiceId !== svc.id) {
                                    handleReorderServices(draggedServiceId, svc.id);
                                  }
                                  setDraggedServiceId(null);
                                  setDragOverServiceId(null);
                                }}
                                className={`transition ${
                                  draggedServiceId === svc.id ? "opacity-30 bg-[#F2EFE9]" : ""
                                } ${
                                  dragOverServiceId === svc.id ? "border-t-2 border-t-[#C4AE7C]" : ""
                                } ${
                                  rowFaded ? "opacity-50 bg-[#F9F9F7]" : "hover:bg-[#F9F9F7]"
                                }`}
                              >
                                {/* Drag Handle */}
                                <td className="px-3 py-3 text-center">
                                  <div
                                    onMouseEnter={() => setRowDraggable(prev => ({ ...prev, [svc.id]: true }))}
                                    onMouseLeave={() => setRowDraggable(prev => ({ ...prev, [svc.id]: false }))}
                                    className="cursor-grab active:cursor-grabbing inline-flex h-7 w-7 items-center justify-center rounded border border-[#414E36]/10 bg-white text-[#5A6A51]/60 hover:bg-[#F2EFE9] hover:text-[#414E36] transition"
                                    title={t.dragReorder}
                                  >
                                    <GripVertical size={14} />
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono text-xs text-[#5A6A51]">{svc.id}</td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold ${ rowFaded ? "line-through text-[#5A6A51]" : "text-[#1F251A]" }`}>{svc.en}</p>
                                    {isInactive && (
                                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500">{t.statusInactive}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-[#5A6A51]">
                                  {svc.createdAt ? (
                                    <>
                                      <span className="block text-sm font-medium text-[#1F251A]">
                                        {svc.createdAt.split(" ").slice(0, 2).join(" ")}
                                      </span>
                                      <span className="text-xs">
                                        {svc.createdAt.split(" ").slice(2).join(" ")}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="block text-sm font-medium text-[#1F251A]">30 Apr</span>
                                      <span className="text-xs">2:01 pm</span>
                                    </>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="font-medium text-[#C4AE7C]">EGP {svc.price ?? 0}</span>
                                </td>
                                <td className="px-5 py-3 text-xs text-[#5A6A51] max-w-[200px] truncate">
                                  {Array.isArray(svc.branchPricing) && svc.branchPricing.length > 0 ? (
                                    svc.branchPricing.map((bp) => (
                                      <div key={bp.name} className="flex items-center gap-1.5 mb-0.5 text-[11px]">
                                        <span className="font-medium text-[#1F251A]">{bp.name}:</span>
                                        <span className="text-[#C4AE7C]">EGP {bp.price}</span>
                                        {bp.isDefault && <span className="text-[8px] bg-[#414E36]/10 text-[#414E36] px-1 rounded font-bold">Def</span>}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-medium text-[#1F251A]">Zayed:</span>
                                      <span className="text-[#C4AE7C]">EGP {svc.price ?? 0}</span>
                                      <span className="text-[8px] bg-[#414E36]/10 text-[#414E36] px-1 rounded font-bold">Def</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className="font-medium text-[#1F251A]">{svc.sortOrder ?? 0}</span>
                                </td>
                                {/* Status Badge */}
                                <td className="px-5 py-3 text-center">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    toggles.active
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                      : "bg-gray-100 text-gray-500 border border-gray-200"
                                  }`}>
                                    {toggles.active ? t.statusActive : t.statusInactive}
                                  </span>
                                </td>
                                {/* 3 Dots Actions Menu */}
                                <td className="px-3 py-3 text-center">
                                  <div className="relative inline-block text-start">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveServiceRowMenuId(prev => prev === svc.id ? null : svc.id);
                                      }}
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition cursor-pointer dropdown-action-menu ${
                                        activeServiceRowMenuId === svc.id
                                          ? "border-[#414E36] bg-[#414E36] text-white"
                                          : "border-[#414E36]/15 bg-white text-[#5A6A51] hover:border-[#C4AE7C] hover:text-[#414E36]"
                                      }`}
                                      title={t.actionsTitle}
                                    >
                                      <MoreVertical size={13} />
                                    </button>

                                    {activeServiceRowMenuId === svc.id && (
                                      <div className="absolute end-0 top-8 z-50 w-44 rounded-xl bg-white p-1 shadow-xl border border-[#414E36]/15 text-xs animate-in fade-in duration-150 text-start dropdown-action-menu">
                                        {hasPermission("services.edit") && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveServiceRowMenuId(null);
                                                handleEditService(svc);
                                              }}
                                              className="w-full text-start px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                                            >
                                              <Pencil size={13} className="text-[#5A6A51]" />
                                              <span>{t.editService}</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleService(svc.id, "active");
                                              }}
                                              className="w-full text-start px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center justify-between transition cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${toggles.active ? "bg-emerald-500" : "bg-gray-300"}`} />
                                                <span>{toggles.active ? t.deactivate : t.activate}</span>
                                              </div>
                                              <span className="text-[10px] font-bold text-[#5A6A51] bg-[#F2EFE9] px-1.5 py-0.5 rounded">
                                                {toggles.active ? t.statusActive : t.statusOff}
                                              </span>
                                            </button>
                                          </>
                                        )}

                                        {hasPermission("services.delete") && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveServiceRowMenuId(null);
                                              setDeleteServiceTarget(svc);
                                            }}
                                            className="w-full text-start px-3 py-2 rounded-lg hover:bg-red-50 font-semibold text-red-600 flex items-center gap-2 transition cursor-pointer"
                                          >
                                            <Trash2 size={13} className="text-red-600" />
                                            <span>{t.deleteService}</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#414E36]/8 bg-white px-4 py-3 text-sm text-[#5A6A51] shadow-sm">
        <span>{t.summaryTotal(filteredServices.length, localCategories.length)}</span>
        <button
          onClick={() => setExpandedCategories(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))}
          className="text-xs font-medium text-[#414E36] underline-offset-2 hover:underline"
        >
          {t.expandAll}
        </button>
      </div>

      {/* ── DELETE CATEGORY CONFIRMATION MODAL ── */}
      {deleteCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#414E36]/10 animate-fadeIn">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#1F251A]">{t.deleteCategoryTitle}</h3>
            </div>
            
            <p className="text-sm text-[#5A6A51] leading-relaxed mb-6">
              {t.deleteCategoryConfirm(deleteCategoryTarget.en)}
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/8 pt-4">
              <button
                onClick={() => setDeleteCategoryTarget(null)}
                className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={() => {
                  removeCategory(deleteCategoryTarget.key);
                  setDeleteCategoryTarget(null);
                }}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {t.yesDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ── DELETE SERVICE CONFIRMATION MODAL ── */}
      {deleteServiceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#414E36]/10 animate-fadeIn">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#1F251A]">{t.deleteServiceTitle}</h3>
            </div>
            
            <p className="text-sm text-[#5A6A51] leading-relaxed mb-6">
              {t.deleteServiceConfirm(deleteServiceTarget.en)}
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/8 pt-4">
              <button
                onClick={() => {
                  setDeleteServiceTarget(null);
                  setShowAddServiceModal(true);
                }}
                className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={async () => {
                  setDeleteServiceTarget(null);
                  const ok = await deleteServiceFromApi(deleteServiceTarget.id);
                  if (ok) {
                    await loadServicesFromApi();
                  }
                }}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {t.yesDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── ADD CATEGORY MODAL ── */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1F251A]">{t.addNewCategoryTitle}</h3>
                <p className="text-sm text-[#5A6A51]">{t.addNewCategorySubtitle}</p>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] hover:bg-[#F9F9F7]"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">{t.categoryNameEnLabel}</label>
                <input
                  value={newCategoryNameEn}
                  onChange={(e) => setNewCategoryNameEn(e.target.value)}
                  placeholder={t.categoryNameEnPlaceholder}
                  className="w-full rounded-lg border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={() => {
                  if (!newCategoryNameEn.trim()) return;
                  const key = newCategoryNameEn.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                  const updated = [...localCategories, { key, en: newCategoryNameEn.trim(), ar: "" }];
                  setLocalCategories(updated);
                  saveDynamicCategories(updated);
                  setExpandedCategories(prev => ({ ...prev, [key]: true }));
                  setNewCategoryNameEn("");
                  setShowAddCategoryModal(false);
                }}
                className="rounded-lg bg-[#414E36] px-5 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
              >
                {t.createCategoryBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REDESIGNED ADD/EDIT SERVICE MODAL ── */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8 border border-[#414E36]/10 animate-fadeIn flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#414E36]/10 px-6 py-4">
              <h3 className="text-lg font-bold text-[#1F251A]">
                {editingService ? t.editServiceTitle : t.addServiceTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddServiceModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#FBFBF9] hover:text-[#1F251A]"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Service Image Section */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-[#5A6A51] mb-2">{t.serviceImageLabel}</span>
                <label className="relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#414E36]/20 bg-[#FBFBF9] transition hover:bg-[#F2EFE9] overflow-hidden group">
                  {serviceImageUrl ? (
                    <>
                      <img src={serviceImageUrl} alt="Service preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white font-medium text-center px-1">{t.changeImage}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#5A6A51]/60">
                      <svg className="mb-1 h-8 w-8 text-[#5A6A51]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 1000, 1000, 0.75);
                          setServiceImageUrl(compressed);
                        } catch (err) {
                          console.error("Failed to compress service image, using original:", err);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setServiceImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                  />
                </label>
                <span className="text-[11px] text-[#5A6A51]/75 mt-2">{t.clickToUpload}</span>
              </div>

              {/* 2-Column fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Service Category */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.serviceCategoryLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  >
                    <option value="" disabled>{t.selectCategory}</option>
                    {localCategories.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.en}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.durationLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={serviceDuration}
                    onChange={(e) => {
                      const text = e.target.value;
                      setServiceDuration(text);
                      setServiceDurationMinutes(getDurationInMinutes(text));
                    }}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  >
                    <option value="0:15 Hours">0:15 Hours</option>
                    <option value="0:30 Hours">0:30 Hours</option>
                    <option value="0:45 Hours">0:45 Hours</option>
                    <option value="1:00 Hours">1:00 Hours</option>
                    <option value="1:30 Hours">1:30 Hours</option>
                    <option value="2:00 Hours">2:00 Hours</option>
                    <option value="2:30 Hours">2:30 Hours</option>
                    <option value="3:00 Hours">3:00 Hours</option>
                  </select>
                </div>

                {/* Duration (minutes) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.durationMinutesLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={serviceDurationMinutes}
                    onChange={(e) => {
                      const minutes = Number(e.target.value) || 0;
                      setServiceDurationMinutes(minutes);
                      const matches = ["0:15 Hours", "0:30 Hours", "0:45 Hours", "1:00 Hours", "1:30 Hours", "2:00 Hours", "2:30 Hours", "3:00 Hours"].find(
                        (opt) => getDurationInMinutes(opt) === minutes
                      );
                      if (matches) setServiceDuration(matches);
                    }}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  />
                </div>

                {/* Session Type */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.sessionTypeLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={serviceUnitType}
                    onChange={(e) => setServiceUnitType(e.target.value)}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  >
                    <option value="in_clinic">{t.sessionInClinic}</option>
                    <option value="online">{t.sessionOnline}</option>
                    <option value="both">{t.sessionBoth}</option>
                  </select>
                </div>

                {/* Service Name EN */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.serviceNameEnLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={serviceNameEn}
                    onChange={(e) => setServiceNameEn(e.target.value)}
                    placeholder={t.serviceNameEnPlaceholder}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  />
                </div>

                {/* Service Name AR */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.serviceNameArLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={serviceNameAr}
                    onChange={(e) => setServiceNameAr(e.target.value)}
                    placeholder={t.serviceNameArPlaceholder}
                    dir="rtl"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  />
                </div>

                {/* English Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">{t.englishDescLabel}</label>
                  <textarea
                    value={serviceDescEn}
                    onChange={(e) => setServiceDescEn(e.target.value)}
                    rows={3}
                    placeholder={t.englishDescPlaceholder}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium resize-none"
                  />
                </div>

                {/* Arabic Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">{t.arabicDescLabel}</label>
                  <textarea
                    value={serviceDescAr}
                    onChange={(e) => setServiceDescAr(e.target.value)}
                    rows={3}
                    placeholder={t.arabicDescPlaceholder}
                    dir="rtl"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium resize-none"
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">{t.sortOrderLabel}</label>
                  <input
                    type="number"
                    value={serviceSortOrder}
                    onChange={(e) => setServiceSortOrder(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                    {t.priceLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] overflow-hidden text-sm">
                    <span className="bg-[#F2EFE9] border-e border-[#414E36]/15 px-3.5 py-2.5 text-[#5A6A51] font-semibold">EGP</span>
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-4 py-2.5 outline-none bg-transparent text-[#1F251A] font-medium"
                    />
                  </div>
                </div>

              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2">
                {/* Is Shared Toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#1F251A]">{t.isSharedLabel}</span>
                    <span className="text-xs text-[#5A6A51] mt-0.5">{t.isSharedDesc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServiceIsShared(!serviceIsShared)}
                    className="relative h-6 w-11 flex-shrink-0 rounded-full focus:outline-none transition-colors duration-300"
                    style={{ backgroundColor: serviceIsShared ? "#414E36" : "#E2E8F0" }}
                  >
                    <span
                      className="absolute top-[4px] h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300"
                      style={{ left: serviceIsShared ? "24px" : "4px" }}
                    />
                  </button>
                </div>

                {/* Enable Booking Reminder Toggle */}
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm font-semibold text-[#1F251A]">{t.enableReminderLabel}</span>
                  <button
                    type="button"
                    onClick={() => setServiceEnableReminder(!serviceEnableReminder)}
                    className="relative h-6 w-11 flex-shrink-0 rounded-full focus:outline-none transition-colors duration-300"
                    style={{ backgroundColor: serviceEnableReminder ? "#414E36" : "#E2E8F0" }}
                  >
                    <span
                      className="absolute top-[4px] h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300"
                      style={{ left: serviceEnableReminder ? "24px" : "4px" }}
                    />
                  </button>
                </div>
              </div>

              {editingService && (
                <>
                  <ServiceRecipeEditor serviceId={editingService.id} authHeaders={authenticatedJsonHeaders} />
                  <ServiceDeviceEditor serviceId={editingService.id} authHeaders={authenticatedJsonHeaders} />
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#414E36]/10 px-6 py-4 flex items-center justify-between gap-3 bg-[#FBFBF9] rounded-b-2xl">
              <div>
                {editingService && hasPermission("services.delete") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteServiceTarget(editingService);
                      setShowAddServiceModal(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>{t.deleteService}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="rounded-lg border border-[#414E36]/15 px-5 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
                >
                  {t.cancelBtn}
                </button>
              <button
                type="button"
                onClick={async () => {
                  if (!serviceNameEn.trim()) return;
                  if (serviceDurationMinutes <= 0 || serviceDurationMinutes > 1440) {
                    alert(t.durationAlert);
                    return;
                  }

                  const previousIds = new Set(localServices.map(s => s.id));

                  let updatedServices: ServiceItem[];
                  if (editingService) {
                    // Edit mode
                    updatedServices = localServices.map(s => {
                      if (s.id === editingService.id) {
                        return {
                          ...s,
                          en: serviceNameEn.trim(),
                          ar: serviceNameAr.trim(),
                          cat: serviceCategory,
                          unit: serviceUnitType.toLowerCase(),
                          price: servicePrice,
                          duration: serviceDuration,
                          duration_minutes: serviceDurationMinutes,
                          descriptionEn: serviceDescEn.trim(),
                          descriptionAr: serviceDescAr.trim(),
                          sortOrder: serviceSortOrder,
                          isShared: serviceIsShared,
                          enableReminder: serviceEnableReminder,
                          img: serviceImageUrl,
                          branchPricing: serviceBranchPricing.map(bp => ({ ...bp, price: servicePrice })),
                        };
                      }
                      return s;
                    });
                  } else {
                    // Add mode — let the database assign the id
                    const newService: ServiceItem = {
                      id: 0, // placeholder, removed by the API mapper
                      en: serviceNameEn.trim(),
                      ar: serviceNameAr.trim(),
                      cat: serviceCategory,
                      unit: serviceUnitType.toLowerCase(),
                      price: servicePrice,
                      duration: serviceDuration,
                      duration_minutes: serviceDurationMinutes,
                      descriptionEn: serviceDescEn.trim(),
                      descriptionAr: serviceDescAr.trim(),
                      sortOrder: serviceSortOrder,
                      isShared: serviceIsShared,
                      enableReminder: serviceEnableReminder,
                      img: serviceImageUrl,
                      branchPricing: serviceBranchPricing.map(bp => ({ ...bp, price: servicePrice })),
                      createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }),
                    };
                    updatedServices = [...localServices, newService];
                    setExpandedCategories(prev => ({ ...prev, [serviceCategory]: true }));
                  }

                  const synced = await syncServicesToApi(updatedServices);
                  if (synced) {
                    setLocalServices(synced);

                    const savedService = editingService
                      ? synced.find(s => s.id === editingService.id)
                      : synced.find(s => !previousIds.has(s.id));

                    const defaultBranch = serviceBranchPricing.find(b => b.isDefault);
                    if (savedService && defaultBranch) {
                      setServiceToggle(savedService.id, "active", defaultBranch.status);
                      setServiceToggle(savedService.id, "visible", defaultBranch.visible);
                      setServiceToggles(prev => ({
                        ...prev,
                        [savedService.id]: { visible: defaultBranch.visible, active: defaultBranch.status }
                      }));
                    }
                  }

                  setShowAddServiceModal(false);
                }}
                className="rounded-lg bg-[#414E36] px-6 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
              >
                {t.saveBtn}
              </button>
            </div>
          </div>

          </div>
        </div>
      )}
    </div>
  );
}
