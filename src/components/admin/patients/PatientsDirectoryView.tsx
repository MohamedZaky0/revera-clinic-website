"use client";

import React from "react";
import { Plus, MoreVertical, Download, Upload, Search, Filter, Pencil, User } from "lucide-react";

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
}: PatientsDirectoryViewProps) {
  return (
    <>
      {/* Page header and controls panel (floating directly on background without white box) */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F251A]">Patients Directory</h2>
            <p className="text-xs text-[#5A6A51]">Manage demographic profiles and clinical histories</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-[#5A6A51] border border-[#414E36]/15 bg-white px-3.5 py-2 rounded-xl font-medium flex items-center gap-1 shadow-2xs">
              Total Patients: <span className="font-bold text-[#1F251A]">{filteredCustomers.length}</span>
            </div>

            {hasPermission("customers.create") && (
              <button
                onClick={handleOpenAddCustomer}
                className="inline-flex items-center gap-2 rounded-xl bg-[#414E36] px-5 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Add Patient
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
                title="More Actions"
              >
                <MoreVertical size={16} />
              </button>

              {showCustomerMoreMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-white p-1.5 shadow-2xl border border-[#414E36]/15 text-xs animate-in fade-in duration-150 dropdown-action-menu">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomerMoreMenu(false);
                      setShowExportCustomersModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Download size={15} className="text-[#5A6A51]" />
                    <span>Export Patients</span>
                  </button>

                  {hasPermission("customers.import") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomerMoreMenu(false);
                        setShowImportCustomersModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Upload size={15} className="text-[#5A6A51]" />
                      <span>Import Patients</span>
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
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] z-10 pointer-events-none" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name, phone, national ID..."
              className="w-full rounded-xl border border-[#414E36]/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/15 shadow-2xs"
            />
          </div>
          <button
            onClick={() => setShowCustomerFilterPanel(prev => !prev)}
            title="Filter"
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer shadow-2xs ${
              showCustomerFilterPanel || customerFilterGender !== "All" || customerFilterStatus !== "All" || customerFilterReferral !== "All"
                ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
            }`}
          >
            <Filter size={16} />
            {(customerFilterGender !== "All" || customerFilterStatus !== "All" || customerFilterReferral !== "All") && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
            )}
          </button>
        </div>
      </div>

      {/* Toggleable Customer Filters Drawer */}
      {showCustomerFilterPanel && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-[#414E36]/10 bg-[#F9F9F7] p-5 md:grid-cols-4 items-end shadow-sm animate-fadeIn">
          {/* Gender Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Gender</label>
            <select
              value={customerFilterGender}
              onChange={(e) => setCustomerFilterGender(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Status</label>
            <select
              value={customerFilterStatus}
              onChange={(e) => setCustomerFilterStatus(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Referral Source Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Referral Source</label>
            <select
              value={customerFilterReferral}
              onChange={(e) => setCustomerFilterReferral(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
            >
              <option value="All">All Referrals</option>
              <option value="Google">Google Search</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Friend">Friend / Family</option>
              <option value="Doctor Referral">Doctor Referral</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Other">Other</option>
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
              className="h-[42px] w-full rounded-2xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Customer</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Created At</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Bookings</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Active</th>
              <th className="px-4 py-3 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#414E36]/8">
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#5A6A51]">
                  No customers found.
                </td>
              </tr>
            )}
            {filteredCustomers.map((c) => {
              const dt = new Date(c.createdAt);
              const dateStr = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
              const uniqueKey = c.id || c.email || c.phone;
              const displayPhone = c.mobile || c.phone || "—";
              const displayEmail = c.email || "—";
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
                  <td className="px-5 py-4 text-[#5A6A51]">
                    <span className="block font-medium text-[#1F251A]">{dateStr}</span>
                    <span className="text-xs">{timeStr}</span>
                  </td>
                  <td className="px-5 py-4 text-center text-[#1F251A]">{c.bookings}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${c.active !== false ? "bg-green-50 text-green-700 border-green-200/50" : "bg-red-50 text-red-700 border-red-200/50"}`}>
                      {c.active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="dropdown-action-menu relative inline-block text-left">
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
                        title="Actions"
                      >
                        <MoreVertical size={13} />
                      </button>

                      {activeCustomerRowMenuId === uniqueKey && (
                        <div className="absolute right-0 top-8 z-[9999] w-36 rounded-xl bg-white p-1 shadow-xl border border-[#414E36]/15 text-xs animate-in fade-in duration-150 text-left dropdown-action-menu">
                          {hasPermission("customers.edit") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCustomerRowMenuId(null);
                                handleOpenEditCustomer(c);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                            >
                              <Pencil size={13} className="text-[#5A6A51]" />
                              <span>Edit Patient</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCustomerRowMenuId(null);
                              setViewingCustomerProfile(c);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                          >
                            <User size={13} className="text-[#5A6A51]" />
                            <span>View Profile</span>
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
    </>
  );
}
