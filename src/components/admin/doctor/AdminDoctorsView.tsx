"use client";

import {
  ArrowLeft,
  Trash2,
  Plus,
  Search,
  Filter,
  ClipboardList,
  Star,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { Branch } from "@/types";
import {
  DoctorServiceCommissionEditor,
  DefaultCommissionType,
} from "@/components/admin/services/DoctorServiceCommissionEditor";
import { DoctorProfileDetailsView } from "@/components/admin/doctor/DoctorProfileDetailsView";
import { UseProviderFormReturn } from "@/components/admin/doctor/useProviderForm";

interface AdminDoctorsViewProps {
  providerForm: UseProviderFormReturn;
  branches: Branch[];
  allReservations: any[];
  localServices: any[];
  allServicesList: { id: number; en: string; ar?: string }[];
  getDoctorFirstReservationDate: (docName: string, resList: any[]) => string | null;
  parseEgyptianNationalId: (id: string) => {
    isValid: boolean;
    reason?: string;
    age: number | null;
    dobIso: string | null;
    dobFormatted: string | null;
    gender: string | null;
    governorate: string | null;
  };
  uniqueSpecialties: string[];
  filteredProviders: any[];
  expandedDoctorServices: Record<string, boolean>;
  toggleExpandedDoctorServices: (docKey: string) => void;
  activeDoctorRowMenuId: string | null;
  setActiveDoctorRowMenuId: (id: string | null | ((prev: string | null) => string | null)) => void;
  showAuditLogsModal: boolean;
  setShowAuditLogsModal: (show: boolean) => void;
  hasPermission: (perm: string) => boolean;
}

export default function AdminDoctorsView({
  providerForm,
  branches,
  allReservations,
  localServices,
  allServicesList,
  getDoctorFirstReservationDate,
  parseEgyptianNationalId,
  uniqueSpecialties,
  filteredProviders,
  expandedDoctorServices,
  toggleExpandedDoctorServices,
  activeDoctorRowMenuId,
  setActiveDoctorRowMenuId,
  setShowAuditLogsModal,
  hasPermission,
}: AdminDoctorsViewProps) {
  const {
    viewingDoctorDetails,
    setViewingDoctorDetails,
    editingDoctorInline,
    setEditingDoctorInline,
    providerFormName,
    setProviderFormName,
    providerFormSpecialty,
    setProviderFormSpecialty,
    providerFormPhone,
    setProviderFormPhone,
    providerFormNationalId,
    setProviderFormNationalId,
    providerFormGender,
    setProviderFormGender,
    providerFormBranchIds,
    setProviderFormBranchIds,
    providerFormSelectedScheduleBranchId,
    setProviderFormSelectedScheduleBranchId,
    handleScheduleBranchChange,
    providerFormStartDate,
    providerFormRating,
    setProviderFormRating,
    providerFormImage,
    setProviderFormImage,
    providerFormFixedSalary,
    setProviderFormFixedSalary,
    providerFormSelectedServices,
    setProviderFormSelectedServices,
    providerFormServiceCommissions,
    setProviderFormServiceCommissions,
    providerFormCommissionType,
    setProviderFormCommissionType,
    providerFormCommissionValue,
    setProviderFormCommissionValue,
    providerFormCommissionBase,
    setProviderFormCommissionBase,
    providerFormCommissionFixedComponent,
    setProviderFormCommissionFixedComponent,
    providerFormScheduleTab,
    setProviderFormScheduleTab,
    providerFormWorkingDaysHours,
    setProviderFormWorkingDaysHours,
    providerFormOnlineWorkingDaysHours,
    setProviderFormOnlineWorkingDaysHours,
    savingProvider,
    handleSaveProvider,
    openEditProviderModal,
    handleDeleteProvider,
    showProviderFilterPanel,
    setShowProviderFilterPanel,
    providerFilterBranchId,
    setProviderFilterBranchId,
    providerFilterSpecialty,
    setProviderFilterSpecialty,
    providerFilterGender,
    setProviderFilterGender,
    providerSearchQuery,
    setProviderSearchQuery,
  } = providerForm;

  return (
    <section className="space-y-6">
      {viewingDoctorDetails ? (
        <DoctorProfileDetailsView
          doctor={viewingDoctorDetails}
          onBack={() => setViewingDoctorDetails(null)}
          reservations={allReservations}
          branches={branches}
          localServices={localServices}
        />
      ) : editingDoctorInline ? (
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
          <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
            <div>
              <button
                onClick={() => setEditingDoctorInline(null)}
                className="mb-2 inline-flex items-center gap-2 rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#414E36] shadow-sm transition hover:bg-[#F2EFE9]"
              >
                <ArrowLeft size={14} /> Back to Doctors
              </button>
              <h1 className="text-3xl font-bold text-[#1F251A]">Edit Doctor: {providerFormName || editingDoctorInline.name}</h1>
            </div>
          </div>

          <div className="space-y-6">
            {/* Row 1: Name & Specialty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Doctor's Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Doe"
                  value={providerFormName}
                  onChange={(e) => setProviderFormName(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Dermatologist"
                  value={providerFormSpecialty}
                  onChange={(e) => setProviderFormSpecialty(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>

            {/* Row 2: Phone & National ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 01012345678"
                  value={providerFormPhone}
                  onChange={(e) => setProviderFormPhone(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">National ID</label>
                <input
                  type="text"
                  placeholder="14-digit National ID"
                  value={providerFormNationalId}
                  onChange={(e) => setProviderFormNationalId(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>

            {/* Row 3: Gender & Auto-calculated Age/DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Gender</label>
                <select
                  value={providerFormGender}
                  onChange={(e) => setProviderFormGender(e.target.value as "Male" | "Female" | "")}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Age &amp; Date of Birth</label>
                {(() => {
                  const check = parseEgyptianNationalId(providerFormNationalId);
                  if (check.isValid) {
                    return (
                      <div className="w-full rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC]/70 px-4 py-2 text-xs text-[#1F251A] font-semibold flex items-center justify-between min-h-[42px]">
                        <span>{check.age} yrs • DOB: {check.dobFormatted}</span>
                        <span className="text-[10px] text-[#414E36] font-bold bg-white px-2 py-0.5 rounded-full border border-[#414E36]/10">✓ National ID</span>
                      </div>
                    );
                  }
                  return (
                    <div className="w-full rounded-2xl border border-[#414E36]/15 bg-gray-50 px-4 py-2.5 text-xs text-[#5A6A51] italic min-h-[42px] flex items-center">
                      Auto-calculated from National ID
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 4: Branches & Start Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Branches (Select one or more)</label>
                <div className="flex flex-wrap gap-2 p-2 rounded-2xl border border-[#414E36]/15 bg-white min-h-[42px] items-center">
                  {branches.map((b) => {
                    const isSelected = providerFormBranchIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (providerFormBranchIds.length <= 1) {
                              alert("A doctor must be assigned to at least one branch.");
                              return;
                            }
                            const nextIds = providerFormBranchIds.filter((id) => id !== b.id);
                            setProviderFormBranchIds(nextIds);
                            if (providerFormSelectedScheduleBranchId === b.id) {
                              handleScheduleBranchChange(nextIds[0]);
                            }
                          } else {
                            const nextIds = [...providerFormBranchIds, b.id];
                            setProviderFormBranchIds(nextIds);
                            if (!providerFormSelectedScheduleBranchId) {
                              setProviderFormSelectedScheduleBranchId(b.id);
                            }
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-[#414E36] text-white border-[#414E36]"
                            : "bg-[#414E36]/5 text-[#414E36] border-transparent hover:bg-[#414E36]/10"
                        }`}
                      >
                        {b.name_en} {isSelected ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Start Date</label>
                <div className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 flex items-center justify-between min-h-[42px]">
                  {(() => {
                    const autoDate = getDoctorFirstReservationDate(providerFormName, allReservations);
                    const displayDate = autoDate || providerFormStartDate;
                    if (displayDate) {
                      return (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-semibold text-[#1F251A]">{displayDate}</span>
                          <span className="text-[10px] font-bold text-[#414E36] bg-[#EDF1EC] px-2.5 py-0.5 rounded-full border border-[#414E36]/15 flex items-center gap-1">
                            ⚡ Auto from 1st Booking
                          </span>
                        </div>
                      );
                    }
                    return (
                      <span className="text-xs italic text-[#5A6A51]/70">
                        Will auto-set on doctor's 1st reservation
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Row 5: Rating & Image */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  placeholder="e.g. 5"
                  value={providerFormRating}
                  onChange={(e) => setProviderFormRating(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Doctor's Image URL or Base64</label>
                <input
                  type="text"
                  placeholder="e.g. /images/doctors/dr-doe.jpg"
                  value={providerFormImage}
                  onChange={(e) => setProviderFormImage(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>

            {/* Services & Commission */}
            <div className="max-w-xs">
              <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Fixed Salary (EGP)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={providerFormFixedSalary}
                onChange={(e) => setProviderFormFixedSalary(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
            <DoctorServiceCommissionEditor
              allServices={allServicesList}
              services={providerFormSelectedServices}
              commissions={providerFormServiceCommissions}
              defaultType={providerFormCommissionType as DefaultCommissionType}
              defaultValue={providerFormCommissionValue}
              defaultBase={providerFormCommissionBase}
              defaultFixedComponent={providerFormCommissionFixedComponent}
              onServicesChange={setProviderFormSelectedServices}
              onCommissionsChange={setProviderFormServiceCommissions}
              onDefaultTypeChange={setProviderFormCommissionType}
              onDefaultValueChange={setProviderFormCommissionValue}
              onDefaultBaseChange={setProviderFormCommissionBase}
              onDefaultFixedComponentChange={setProviderFormCommissionFixedComponent}
            />

            {/* Weekly Working Schedule */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold">Weekly Working Days & Hours (Shifts)</label>
                  {providerFormBranchIds.length > 1 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-[#5A6A51]">Configure branch schedule:</span>
                      <select
                        value={providerFormSelectedScheduleBranchId}
                        onChange={(e) => handleScheduleBranchChange(e.target.value)}
                        className="rounded-xl border border-[#414E36]/15 bg-white px-2 py-1 text-xs text-[#1F251A] font-semibold outline-none focus:border-[#C4AE7C] shadow-sm cursor-pointer"
                      >
                        {providerFormBranchIds.map((bId) => {
                          const br = branches.find((b) => b.id === bId);
                          return (
                            <option key={bId} value={bId}>
                              {br ? br.name_en : bId}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex rounded-lg border border-[#414E36]/15 p-0.5 bg-gray-50 text-[10px] font-bold self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setProviderFormScheduleTab("in_person")}
                    className={`px-3 py-1 rounded transition-colors ${
                      providerFormScheduleTab === "in_person"
                        ? "bg-[#414E36] text-white"
                        : "text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    In-Clinic
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFormScheduleTab("online")}
                    className={`px-3 py-1 rounded transition-colors ${
                      providerFormScheduleTab === "online"
                        ? "bg-[#414E36] text-white"
                        : "text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    Online
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-3">
                {(() => {
                  const activeSched = providerFormScheduleTab === "in_person" ? providerFormWorkingDaysHours : providerFormOnlineWorkingDaysHours;
                  const setActiveSched = providerFormScheduleTab === "in_person" ? setProviderFormWorkingDaysHours : setProviderFormOnlineWorkingDaysHours;

                  return Object.keys(activeSched).map((day) => {
                    const sched = activeSched[day];
                    return (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#414E36]/5 pb-2.5 last:border-0 last:pb-0">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sched.isOpen}
                            onChange={(e) => {
                              setActiveSched({
                                ...activeSched,
                                [day]: { ...sched, isOpen: e.target.checked }
                              });
                            }}
                            className="h-4 w-4 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                          />
                          <span className="text-xs font-bold text-[#414E36] w-24">{day}</span>
                        </label>

                        {sched.isOpen ? (
                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {/* Shifts list */}
                            {((sched.shifts && sched.shifts.length > 0) ? sched.shifts : [{ start: sched.start || "09:00", end: sched.end || "17:00" }]).map((shft: any, shiftIdx: number) => (
                              <div key={shiftIdx} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={shft.start}
                                  onChange={(e) => {
                                    const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                    currentShifts[shiftIdx] = { ...currentShifts[shiftIdx], start: e.target.value };
                                    setActiveSched({
                                      ...activeSched,
                                      [day]: {
                                        ...sched,
                                        start: currentShifts[0].start,
                                        end: currentShifts[0].end,
                                        shifts: currentShifts
                                      }
                                    });
                                  }}
                                  className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-xs outline-none focus:border-[#C4AE7C]"
                                />
                                <span className="text-xs text-[#5A6A51]">to</span>
                                <input
                                  type="time"
                                  value={shft.end}
                                  onChange={(e) => {
                                    const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                    currentShifts[shiftIdx] = { ...currentShifts[shiftIdx], end: e.target.value };
                                    setActiveSched({
                                      ...activeSched,
                                      [day]: {
                                        ...sched,
                                        start: currentShifts[0].start,
                                        end: currentShifts[0].end,
                                        shifts: currentShifts
                                      }
                                    });
                                  }}
                                  className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-xs outline-none focus:border-[#C4AE7C]"
                                />
                                {shiftIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                      const filteredShifts = currentShifts.filter((_: any, i: number) => i !== shiftIdx);
                                      setActiveSched({
                                        ...activeSched,
                                        [day]: {
                                          ...sched,
                                          start: filteredShifts[0].start,
                                          end: filteredShifts[0].end,
                                          shifts: filteredShifts
                                        }
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700 transition cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const currentShifts = (sched.shifts && sched.shifts.length > 0) ? [...sched.shifts] : [{ start: sched.start || "09:00", end: sched.end || "17:00" }];
                                const newShifts = [...currentShifts, { start: "09:00", end: "17:00" }];
                                setActiveSched({
                                  ...activeSched,
                                  [day]: {
                                    ...sched,
                                    shifts: newShifts
                                  }
                                });
                              }}
                              className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] transition flex items-center gap-1 mt-1 cursor-pointer"
                            >
                              <Plus size={12} /> Add Shift
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Off / Closed</span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#E6E9EB]">
              <button
                onClick={handleSaveProvider}
                disabled={savingProvider}
                className="rounded-2xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2e3a26] disabled:opacity-50"
              >
                {savingProvider ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditingDoctorInline(null)}
                className="rounded-2xl border border-[#E6E9EB] bg-white px-6 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1F251A]">Doctors</h2>
              <p className="text-xs text-[#5A6A51]">Manage doctor schedules, services, and ratings</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAuditLogsModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#FBFBF9]"
              >
                <ClipboardList size={14} /> Audit Logs
              </button>
            </div>
          </div>

          {/* Search Bar Row above Table */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] z-10 pointer-events-none" />
              <input
                type="text"
                value={providerSearchQuery}
                onChange={(e) => setProviderSearchQuery(e.target.value)}
                placeholder="Search doctor by name, specialty..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:bg-white focus:ring-2 focus:ring-[#C4AE7C]/15"
              />
            </div>
            <button
              onClick={() => setShowProviderFilterPanel(prev => !prev)}
              title="Filter"
              className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
                showProviderFilterPanel || providerFilterBranchId !== "All" || providerFilterSpecialty !== "All" || providerFilterGender !== "All"
                  ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                  : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
              }`}
            >
              <Filter size={16} />
              {(providerFilterBranchId !== "All" || providerFilterSpecialty !== "All" || providerFilterGender !== "All") && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
              )}
            </button>
          </div>

          {/* Dynamic Filters Drawer */}
          {showProviderFilterPanel && (
            <div className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-[#414E36]/10 bg-[#F9F9F7] p-5 md:grid-cols-3 items-end shadow-sm animate-fadeIn">
              {/* Branch Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Branch</label>
                <select
                  value={providerFilterBranchId}
                  onChange={(e) => setProviderFilterBranchId(e.target.value)}
                  className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                >
                  <option value="All">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name_en}</option>
                  ))}
                </select>
              </div>

              {/* Specialty Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Specialty</label>
                <select
                  value={providerFilterSpecialty}
                  onChange={(e) => setProviderFilterSpecialty(e.target.value)}
                  className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                >
                  <option value="All">All Specialties</option>
                  {uniqueSpecialties.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              {/* Gender and Clear Options */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Gender</label>
                  <select
                    value={providerFilterGender}
                    onChange={(e) => setProviderFilterGender(e.target.value)}
                    className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                  >
                    <option value="All">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setProviderFilterBranchId("All");
                    setProviderFilterSpecialty("All");
                    setProviderFilterGender("All");
                    setProviderSearchQuery("");
                  }}
                  className="h-[42px] w-full rounded-2xl border border-red-200 bg-red-50/50 text-xs font-bold text-red-600 hover:bg-red-100/70 transition"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm scrollbar-none">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Doctor Name</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Bookings</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Services</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51] whitespace-nowrap">Rating</th>
                  <th className="px-4 py-3 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#414E36]/8">
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-[#5A6A51]">
                      No doctors/providers matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map((provider) => {
                    const docKey = provider.id || provider.name;
                    const isExpanded = !!expandedDoctorServices[docKey];
                    const displayServices = isExpanded ? provider.services : provider.services.slice(0, 2);
                    const hasMore = provider.services.length > 2;

                    return (
                      <tr
                        key={docKey}
                        onClick={() => setViewingDoctorDetails(provider)}
                        className="transition hover:bg-[#F9F9F7] cursor-pointer"
                      >
                        <td className="px-5 py-4 font-semibold text-[#1F251A]">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                              {provider.avatar_url || provider.image ? (
                                <img src={provider.avatar_url || provider.image} alt={provider.name} className="h-full w-full object-cover" />
                              ) : (
                                <span>{(provider.name || "D").charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span>{provider.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center font-medium text-[#1F251A]">{provider.bookings}</td>
                        <td className="px-5 py-4 text-[#5A6A51]">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                            {displayServices.map((service: string) => (
                              <span key={service} className="inline-block rounded-full border border-[#414E36]/15 bg-[#EDF1EC]/60 px-2.5 py-0.5 text-[11px] font-medium text-[#414E36]">
                                {service}
                              </span>
                            ))}
                            {hasMore && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandedDoctorServices(docKey);
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-[#C4AE7C]/20 hover:bg-[#C4AE7C]/35 border border-[#C4AE7C]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#414E36] transition active:scale-95 cursor-pointer shadow-2xs"
                                title={isExpanded ? "Click to show fewer services" : "Click to view all assigned services"}
                              >
                                {isExpanded ? "Show Less" : `+${provider.services.length - 2} More`}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center gap-1.5 text-[#1F251A] font-semibold text-xs">
                            <Star size={13} className="text-[#C4AE7C] fill-[#C4AE7C]" />
                            {provider.rating}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="dropdown-action-menu relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDoctorRowMenuId(prev => prev === docKey ? null : docKey);
                              }}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition cursor-pointer dropdown-action-menu ${
                                activeDoctorRowMenuId === docKey
                                  ? "border-[#414E36] bg-[#414E36] text-white"
                                  : "border-[#414E36]/15 bg-white text-[#5A6A51] hover:border-[#C4AE7C] hover:text-[#414E36]"
                              }`}
                              title="Actions"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {activeDoctorRowMenuId === docKey && (
                              <div className="absolute right-0 top-8 z-[9999] w-36 rounded-xl bg-white p-1 shadow-xl border border-[#414E36]/15 text-xs animate-in fade-in duration-150 text-left dropdown-action-menu">
                                {hasPermission("providers.edit") && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDoctorRowMenuId(null);
                                      openEditProviderModal(provider);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2 transition cursor-pointer"
                                  >
                                    <Pencil size={13} className="text-[#5A6A51]" />
                                    <span>Edit Doctor</span>
                                  </button>
                                )}
                                {provider.id && hasPermission("providers.delete") && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDoctorRowMenuId(null);
                                      handleDeleteProvider(provider.id);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 font-semibold text-red-600 flex items-center gap-2 transition cursor-pointer"
                                  >
                                    <Trash2 size={13} className="text-red-600" />
                                    <span>Delete Doctor</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
