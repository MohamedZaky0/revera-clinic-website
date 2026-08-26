"use client";

import React, { useState, useMemo } from "react";
import { Plus, MoreVertical, Download, Upload, Search, Filter, Pencil, User, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface PatientsDirectoryViewProps {
  filteredCustomers: any[];
  hasPermission: (permKey: string) => boolean;
  handleOpenAddCustomer: () => void;
  handleOpenEditCustomer: (c: any) => void;
  setViewingCustomerProfile: (c: any) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  showCustomerFilterPanel: boolean;
  setShowCustomerFilterPanel: React.Dispatch<React.SetStateAction<boolean>>;
  customerFilterGender: string;
  setCustomerFilterGender: (v: string) => void;
  customerFilterStatus: string;
  setCustomerFilterStatus: (v: string) => void;
  customerFilterReferral: string;
  setCustomerFilterReferral: (v: string) => void;
  showCustomerMoreMenu: boolean;
  setShowCustomerMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowExportCustomersModal: (v: boolean) => void;
  setShowImportCustomersModal: (v: boolean) => void;
  activeCustomerRowMenuId: string | null;
  setActiveCustomerRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  customerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["patients"]["patientsDirectoryView"];
}

function formatLastBooking(dateVal?: string | null, timeVal?: string | null) {
  if (!dateVal) return null;
  let dateObj: Date;
  try {
    if (dateVal.includes("T")) {
      dateObj = new Date(dateVal);
    } else {
      dateObj = new Date(dateVal.slice(0, 10) + "T00:00:00");
    }
  } catch {
    return null;
  }
  if (isNaN(dateObj.getTime())) return null;

  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let formattedTime = "";
  if (timeVal) {
    const cleaned = timeVal.split("-")[0].trim();
    if (cleaned.toLowerCase().includes("am") || cleaned.toLowerCase().includes("pm")) {
      formattedTime = cleaned.toUpperCase();
    } else {
      const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        let hour = parseInt(match[1], 10);
        const minute = match[2];
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        formattedTime = `${String(hour).padStart(2, "0")}:${minute} ${ampm}`;
      } else {
        formattedTime = cleaned;
      }
    }
  } else if (dateVal.includes("T")) {
    formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return { formattedDate, formattedTime };
}

export default function PatientsDirectoryView({
  filteredCustomers,
  hasPermission,
  handleOpenAddCustomer,
  handleOpenEditCustomer,
  setViewingCustomerProfile,
  customerSearch,
  setCustomerSearch,
  showCustomerFilterPanel,
  setShowCustomerFilterPanel,
  customerFilterGender,
  setCustomerFilterGender,
  customerFilterStatus,
  setCustomerFilterStatus,
  customerFilterReferral,
  setCustomerFilterReferral,
  showCustomerMoreMenu,
  setShowCustomerMoreMenu,
  setShowExportCustomersModal,
  setShowImportCustomersModal,
  activeCustomerRowMenuId,
  setActiveCustomerRowMenuId,
  customerMoreMenuRef,
  lang,
  t,
}: PatientsDirectoryViewProps) {
  const [sortField, setSortField] = useState<"lastBooking" | "bookings" | "outstanding" | "name" | "status" | null>("lastBooking");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [openSortDropdown, setOpenSortDropdown] = useState<"lastBooking" | "outstanding" | null>(null);

  // Close sort dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".sort-dropdown-container")) {
        setOpenSortDropdown(null);
      }
    }
    if (openSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openSortDropdown]);

  const sortedCustomers = useMemo(() => {
    if (!sortField) return filteredCustomers;
    return [...filteredCustomers].sort((a, b) => {
      let comparison = 0;
      if (sortField === "lastBooking") {
        const timeA = a.lastBookingDate ? new Date(a.lastBookingDate).getTime() : 0;
        const timeB = b.lastBookingDate ? new Date(b.lastBookingDate).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortField === "bookings") {
        comparison = (Number(a.bookings) || 0) - (Number(b.bookings) || 0);
      } else if (sortField === "outstanding") {
        comparison = (Number(a.outstanding) || 0) - (Number(b.outstanding) || 0);
      } else if (sortField === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortField === "status") {
        comparison = (a.active !== false ? 1 : 0) - (b.active !== false ? 1 : 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredCustomers, sortField, sortDirection]);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Page header and controls panel */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F251A]">{t.title}</h2>
            <p className="text-xs text-[#5A6A51]">{t.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-[#5A6A51] border border-[#414E36]/15 bg-white px-3.5 py-2 rounded-xl font-medium flex items-center gap-1 shadow-2xs">
              {t.totalPatientsLabel} <span className="font-bold text-[#1F251A]">{filteredCustomers.length}</span>
            </div>

            {hasPermission("customers.create") && (
              <button
                onClick={handleOpenAddCustomer}
                className="inline-flex items-center gap-2 rounded-xl bg-[#414E36] px-5 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> {t.addPatientBtn}
              </button>
            )}

            {/* 3-Dots Actions Menu for Export & Import */}
            <div ref={customerMoreMenuRef} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomerMoreMenu(prev => !prev);
                }}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer shadow-2xs dropdown-action-menu ${
                  showCustomerMoreMenu
                    ? "border-[#414E36] bg-[#414E36] text-white"
                    : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
                }`}
                title={t.moreActionsTitle}
              >
                <MoreVertical size={16} />
              </button>

              {showCustomerMoreMenu && (
                <div className="absolute end-0 top-11 z-50 w-48 rounded-2xl bg-white p-1.5 shadow-2xl border border-[#414E36]/15 text-xs dropdown-action-menu">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomerMoreMenu(false);
                      setShowExportCustomersModal(true);
                    }}
                    className="w-full text-start px-3.5 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Download size={15} className="text-[#5A6A51]" />
                    <span>{t.exportBtn}</span>
                  </button>

                  {hasPermission("customers.import") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomerMoreMenu(false);
                        setShowImportCustomersModal(true);
                      }}
                      className="w-full text-start px-3.5 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Upload size={15} className="text-[#5A6A51]" />
                      <span>{t.importBtn}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Search and Icon-only Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] z-10 pointer-events-none" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-[#414E36]/15 bg-white py-2.5 ps-10 pe-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/15 shadow-2xs"
            />
          </div>
          <button
            onClick={() => setShowCustomerFilterPanel(prev => !prev)}
            title={t.filterTitle}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer shadow-2xs ${
              showCustomerFilterPanel || customerFilterGender !== "All" || customerFilterStatus !== "All" || customerFilterReferral !== "All"
                ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
            }`}
          >
            <Filter size={16} />
            {(customerFilterGender !== "All" || customerFilterStatus !== "All" || customerFilterReferral !== "All") && (
              <span className="absolute -top-1 -end-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
            )}
          </button>
        </div>
      </div>

      {/* Toggleable Customer Filters Drawer */}
      {showCustomerFilterPanel && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-[#414E36]/10 bg-[#F9F9F7] p-5 md:grid-cols-4 items-end shadow-sm animate-fadeIn">
          {/* Gender Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.genderFilterLabel}</label>
            <select
              value={customerFilterGender}
              onChange={(e) => setCustomerFilterGender(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
            >
              <option value="All">{t.genderAll}</option>
              <option value="Male">{t.genderMale}</option>
              <option value="Female">{t.genderFemale}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.statusFilterLabel}</label>
            <select
              value={customerFilterStatus}
              onChange={(e) => setCustomerFilterStatus(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
            >
              <option value="All">{t.statusAll}</option>
              <option value="Active">{t.statusActive}</option>
              <option value="Inactive">{t.statusInactive}</option>
            </select>
          </div>

          {/* Referral Source Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{t.referralFilterLabel}</label>
            <select
              value={customerFilterReferral}
              onChange={(e) => setCustomerFilterReferral(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
            >
              <option value="All">{t.referralAll}</option>
              <option value="Google">{t.referralFilterOptions["Google"]}</option>
              <option value="Facebook">{t.referralFilterOptions["Facebook"]}</option>
              <option value="Instagram">{t.referralFilterOptions["Instagram"]}</option>
              <option value="Friend">{t.referralFilterOptions["Friend"]}</option>
              <option value="Doctor Referral">{t.referralFilterOptions["Doctor Referral"]}</option>
              <option value="Walk-in">{t.referralFilterOptions["Walk-in"]}</option>
              <option value="Other">{t.referralFilterOptions["Other"]}</option>
            </select>
          </div>

          {/* Clear Button */}
          <div>
            <button
              onClick={() => {
                setCustomerFilterGender("All");
                setCustomerFilterStatus("All");
                setCustomerFilterReferral("All");
                setCustomerSearch("");
              }}
              className="h-[42px] w-full rounded-2xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
            >
              {t.clearFiltersBtn}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
        <table className="w-full min-w-[750px] text-sm">
          <thead>
            <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
              {/* Customer Column */}
              <th className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap select-none">
                <span>{t.colCustomer}</span>
              </th>

              {/* Last Booking Date Column with Sort Droplist */}
              <th className="relative px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap select-none sort-dropdown-container">
                <div className="inline-flex items-center gap-2">
                  <span>{t.colLastBookingDate}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenSortDropdown(prev => prev === "lastBooking" ? null : "lastBooking");
                    }}
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-lg transition cursor-pointer ${
                      sortField === "lastBooking"
                        ? "bg-[#E6EDE4] text-[#2E5233]"
                        : "bg-[#F3EFE6] text-[#5A6A51] hover:bg-[#EBE5D8]"
                    }`}
                    title={t.sortBy || "Sort by"}
                  >
                    <ArrowUpDown size={12} />
                  </button>
                </div>

                {openSortDropdown === "lastBooking" && (
                  <div className="absolute start-5 top-full mt-1.5 z-50 w-48 rounded-2xl bg-white p-2 shadow-2xl border border-[#414E36]/15 text-xs animate-fadeIn dropdown-action-menu normal-case font-normal text-start">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-[#8A9A81] tracking-normal">
                      {t.sortBy || "Sort by"}
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortField("lastBooking");
                        setSortDirection("desc");
                        setOpenSortDropdown(null);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-xs ${
                        sortField === "lastBooking" && sortDirection === "desc"
                          ? "bg-[#E7EFE6] font-semibold text-[#2E5233]"
                          : "font-medium text-[#1F251A] hover:bg-[#F9F9F7]"
                      }`}
                    >
                      <span>{t.newestToOldest || "Newest to Oldest"}</span>
                      <ArrowDown size={14} className={sortField === "lastBooking" && sortDirection === "desc" ? "text-[#2E5233]" : "text-[#8A9A81]"} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortField("lastBooking");
                        setSortDirection("asc");
                        setOpenSortDropdown(null);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-xs ${
                        sortField === "lastBooking" && sortDirection === "asc"
                          ? "bg-[#E7EFE6] font-semibold text-[#2E5233]"
                          : "font-medium text-[#1F251A] hover:bg-[#F9F9F7]"
                      }`}
                    >
                      <span>{t.oldestToNewest || "Oldest to Newest"}</span>
                      <ArrowUp size={14} className={sortField === "lastBooking" && sortDirection === "asc" ? "text-[#2E5233]" : "text-[#8A9A81]"} />
                    </button>
                  </div>
                )}
              </th>

              {/* Bookings Count Column */}
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap select-none">
                <span>{t.colBookings}</span>
              </th>

              {/* Outstanding Column with Sort Droplist */}
              <th className="relative px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap select-none sort-dropdown-container">
                <div className="inline-flex items-center gap-2">
                  <span>{t.colOutstanding}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenSortDropdown(prev => prev === "outstanding" ? null : "outstanding");
                    }}
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-lg transition cursor-pointer ${
                      sortField === "outstanding"
                        ? "bg-[#E6EDE4] text-[#2E5233]"
                        : "bg-[#F3EFE6] text-[#5A6A51] hover:bg-[#EBE5D8]"
                    }`}
                    title={t.sortBy || "Sort by"}
                  >
                    <ArrowUpDown size={12} />
                  </button>
                </div>

                {openSortDropdown === "outstanding" && (
                  <div className="absolute start-5 top-full mt-1.5 z-50 w-44 rounded-2xl bg-white p-2 shadow-2xl border border-[#414E36]/15 text-xs animate-fadeIn dropdown-action-menu normal-case font-normal text-start">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-[#8A9A81] tracking-normal">
                      {t.sortBy || "Sort by"}
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortField("outstanding");
                        setSortDirection("desc");
                        setOpenSortDropdown(null);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-xs ${
                        sortField === "outstanding" && sortDirection === "desc"
                          ? "bg-[#E7EFE6] font-semibold text-[#2E5233]"
                          : "font-medium text-[#1F251A] hover:bg-[#F9F9F7]"
                      }`}
                    >
                      <span>{t.highToLow || "High to Low"}</span>
                      <ArrowDown size={14} className={sortField === "outstanding" && sortDirection === "desc" ? "text-[#2E5233]" : "text-[#8A9A81]"} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortField("outstanding");
                        setSortDirection("asc");
                        setOpenSortDropdown(null);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-xs ${
                        sortField === "outstanding" && sortDirection === "asc"
                          ? "bg-[#E7EFE6] font-semibold text-[#2E5233]"
                          : "font-medium text-[#1F251A] hover:bg-[#F9F9F7]"
                      }`}
                    >
                      <span>{t.lowToHigh || "Low to High"}</span>
                      <ArrowUp size={14} className={sortField === "outstanding" && sortDirection === "asc" ? "text-[#2E5233]" : "text-[#8A9A81]"} />
                    </button>
                  </div>
                )}
              </th>

              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">{t.colActive}</th>
              <th className="px-4 py-3 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#414E36]/8">
            {sortedCustomers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[#5A6A51]">
                  {t.noCustomers}
                </td>
              </tr>
            )}
            {sortedCustomers.map((c, index) => {
              const bookingInfo = formatLastBooking(c.lastBookingDate, c.lastBookingTime);
              const uniqueKey = c.id || c.email || c.phone;
              const displayPhone = c.mobile || c.phone || "—";
              const displayEmail = c.email || "—";
              const outstandingAmount = Number(c.outstanding) || 0;
              const currency = lang === "ar" ? "ج.م" : "EGP";
              const isNearBottom = index >= sortedCustomers.length - 2 && sortedCustomers.length > 2;

              return (
                <tr
                  key={uniqueKey}
                  onClick={() => setViewingCustomerProfile(c)}
                  className="transition hover:bg-[#F9F9F7] cursor-pointer"
                >
                  <td className="px-5 py-4 font-semibold text-[#1F251A]">
                    <div>
                      <span className="block text-sm font-extrabold text-[#1F251A]">{c.name}</span>
                      <div className="flex flex-col text-xs font-normal text-[#5A6A51] mt-0.5">
                        {displayPhone !== "—" && <span className="font-mono">{displayPhone}</span>}
                        {displayEmail !== "—" && <span className="text-[#6B7280]">{displayEmail}</span>}
                      </div>
                    </div>
                  </td>

                  {/* Last Booking Date */}
                  <td className="px-5 py-4">
                    {bookingInfo ? (
                      <div>
                        <span className="block text-sm font-bold text-[#1F251A]">{bookingInfo.formattedDate}</span>
                        {bookingInfo.formattedTime && (
                          <span className="block text-xs font-medium text-[#5A6A51] mt-0.5">{bookingInfo.formattedTime}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#8A9A81]">—</span>
                    )}
                  </td>

                  {/* Bookings Count */}
                  <td className="px-5 py-4 text-center text-sm font-bold text-[#1F251A]">
                    {c.bookings || 0}
                  </td>

                  {/* Outstanding Balance */}
                  <td className="px-5 py-4 text-start font-semibold text-sm">
                    {outstandingAmount > 0 ? (
                      <span className="text-rose-600 font-bold">
                        {outstandingAmount.toLocaleString("en-US")} {currency}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold">
                        0 {currency}
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${c.active !== false ? "bg-green-50 text-green-700 border-green-200/50" : "bg-red-50 text-red-700 border-red-200/50"}`}>
                      {c.active !== false ? t.activeBadge : t.inactiveBadge}
                    </span>
                  </td>

                  {/* 3-Dots Row Actions */}
                  <td className="px-4 py-4 text-center">
                    <div className="dropdown-action-menu relative inline-block text-start">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCustomerRowMenuId(prev => prev === uniqueKey ? null : uniqueKey);
                        }}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition cursor-pointer dropdown-action-menu ${
                          activeCustomerRowMenuId === uniqueKey
                            ? "border-[#414E36] bg-[#414E36] text-white"
                            : "border-[#414E36]/15 bg-white text-[#5A6A51] hover:border-[#C4AE7C] hover:text-[#414E36]"
                        }`}
                        title={t.actionsTitle}
                      >
                        <MoreVertical size={13} />
                      </button>

                      {activeCustomerRowMenuId === uniqueKey && (
                        <div className={`absolute end-0 ${isNearBottom ? "bottom-8" : "top-8"} z-[9999] w-36 rounded-xl bg-white p-1 shadow-2xl border border-[#414E36]/15 text-xs text-start dropdown-action-menu`}>
                          {hasPermission("customers.edit") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCustomerRowMenuId(null);
                                handleOpenEditCustomer(c);
                              }}
                              className="w-full text-start px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                            >
                              <Pencil size={13} className="text-[#5A6A51]" />
                              <span>{t.editPatientBtn}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCustomerRowMenuId(null);
                              setViewingCustomerProfile(c);
                            }}
                            className="w-full text-start px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                          >
                            <User size={13} className="text-[#5A6A51]" />
                            <span>{t.viewProfileBtn}</span>
                          </button>
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
    </div>
  );
}

