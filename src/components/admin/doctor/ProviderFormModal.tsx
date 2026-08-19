"use client";

import { X, Plus, Trash2 } from "lucide-react";
import { Branch } from "@/types";
import {
  DoctorServiceCommissionEditor,
  DefaultCommissionType,
} from "@/components/admin/services/DoctorServiceCommissionEditor";
import { UseProviderFormReturn } from "@/components/admin/doctor/useProviderForm";

interface ProviderFormModalProps {
  providerForm: UseProviderFormReturn;
  branches: Branch[];
  allServicesList: { id: number; en: string; ar?: string }[];
  getDoctorFirstReservationDate: (docName: string, resList: any[]) => string | null;
  allReservations: any[];
  parseEgyptianNationalId: (id: string) => {
    isValid: boolean;
    reason?: string;
    age: number | null;
    dobIso: string | null;
    dobFormatted: string | null;
    gender: string | null;
    governorate: string | null;
  };
}

export default function ProviderFormModal({
  providerForm,
  branches,
  allServicesList,
  getDoctorFirstReservationDate,
  allReservations,
  parseEgyptianNationalId,
}: ProviderFormModalProps) {
  const {
    showProviderModal,
    setShowProviderModal,
    providerModalMode,
    savingProvider,
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
    handleSaveProvider,
  } = providerForm;

  if (!showProviderModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4 shrink-0">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">
              {providerModalMode === "edit" ? "Edit Doctor / Provider" : "Add Doctor / Provider"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
              {providerModalMode === "edit" ? "Modify Provider Details" : "Create New Provider"}
            </h3>
          </div>
          <button
            onClick={() => setShowProviderModal(false)}
            className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          
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

          {/* Row 4: Branch & Start Date */}
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

          {/* Row 5: Rating & Provider Image URL/Base64 */}
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
            <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">
              Fixed Salary (EGP)
            </label>
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
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold">Weekly Working Days & Hours</label>
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
                          {((sched.shifts && sched.shifts.length > 0) ? sched.shifts : [{ start: sched.start || "09:00", end: sched.end || "17:00" }]).map((shft, shiftIdx) => (
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
                                    const filteredShifts = currentShifts.filter((_, i) => i !== shiftIdx);
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
                                  className="text-red-500 hover:text-red-700 transition"
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
                            className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] transition flex items-center gap-1 mt-1"
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

        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#414E36]/10 pt-4 mt-4 flex gap-3 shrink-0">
          <button
            onClick={handleSaveProvider}
            disabled={savingProvider}
            className="flex-1 rounded-3xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] disabled:opacity-50 text-center"
          >
            {savingProvider ? "Saving..." : providerModalMode === "edit" ? "Save Changes" : "Add Provider"}
          </button>
          <button
            onClick={() => setShowProviderModal(false)}
            className="flex-1 rounded-3xl border border-[#414E36]/20 bg-[#fff] py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] text-center"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
