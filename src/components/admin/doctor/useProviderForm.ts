"use client";

import { useEffect, useState } from "react";
import { Branch } from "@/types";
import { ServiceCommissionEntry } from "@/components/admin/services/DoctorServiceCommissionEditor";
import { clearFetchCache } from "@/lib/fetchCache";

interface UseProviderFormParams {
  branches: Branch[];
  session: any;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  fetchRolesAndEmployees: () => void;
  getDoctorFirstReservationDate: (docName: string, resList: any[]) => string | null;
  allReservations: any[];
  activeNav: string;
  adminRole: string | null;
  hasPermission: (perm: string) => boolean;
}

const DEFAULT_CLOSED_SCHEDULE: Record<string, { isOpen: boolean; start: string; end: string; shifts?: { start: string; end: string }[] }> = {
  Sunday: { isOpen: false, start: "10:00", end: "20:00" },
  Monday: { isOpen: false, start: "10:00", end: "20:00" },
  Tuesday: { isOpen: false, start: "10:00", end: "20:00" },
  Wednesday: { isOpen: false, start: "10:00", end: "20:00" },
  Thursday: { isOpen: false, start: "10:00", end: "20:00" },
  Friday: { isOpen: false, start: "10:00", end: "20:00" },
  Saturday: { isOpen: false, start: "10:00", end: "20:00" }
};

const DEFAULT_CLOSED_SCHEDULE_09: Record<string, { isOpen: boolean; start: string; end: string; shifts?: { start: string; end: string }[] }> = {
  Sunday: { isOpen: false, start: "09:00", end: "20:00" },
  Monday: { isOpen: false, start: "09:00", end: "20:00" },
  Tuesday: { isOpen: false, start: "09:00", end: "20:00" },
  Wednesday: { isOpen: false, start: "09:00", end: "20:00" },
  Thursday: { isOpen: false, start: "09:00", end: "20:00" },
  Friday: { isOpen: false, start: "09:00", end: "20:00" },
  Saturday: { isOpen: false, start: "09:00", end: "20:00" }
};

export function useProviderForm({
  branches,
  session,
  authenticatedJsonHeaders,
  showConfirm,
  fetchRolesAndEmployees,
  getDoctorFirstReservationDate,
  allReservations,
  activeNav,
  adminRole,
  hasPermission,
}: UseProviderFormParams) {
  // ── Provider list state ──
  const [providers, setProviders] = useState<any[]>([]);

  // ── Custom provider inline & modal states ──
  const [editingDoctorInline, setEditingDoctorInline] = useState<any | null>(null);
  const [viewingDoctorDetails, setViewingDoctorDetails] = useState<any | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerModalMode, setProviderModalMode] = useState<"add" | "edit">("add");
  const [providerEditingId, setProviderEditingId] = useState<string | null>(null);
  const [providerFormName, setProviderFormName] = useState("");
  const [providerFormRating, setProviderFormRating] = useState(5);
  const [providerFormMore, setProviderFormMore] = useState(0);
  const [providerFormFixedSalary, setProviderFormFixedSalary] = useState("0");
  const [providerFormCommissionType, setProviderFormCommissionType] = useState("none");
  const [providerFormCommissionValue, setProviderFormCommissionValue] = useState("0");
  const [providerFormCommissionBase, setProviderFormCommissionBase] = useState<"gross" | "net_of_materials">("gross");
  const [providerFormCommissionFixedComponent, setProviderFormCommissionFixedComponent] = useState("0");
  const [providerFormServiceCommissions, setProviderFormServiceCommissions] = useState<ServiceCommissionEntry[]>([]);
  const [providerFormSelectedServices, setProviderFormSelectedServices] = useState<string[]>([]);
  const [providerFormImage, setProviderFormImage] = useState("");
  const [providerFormPhone, setProviderFormPhone] = useState("");
  const [providerFormGender, setProviderFormGender] = useState<"Male" | "Female" | "">("");
  const [providerFormAge, setProviderFormAge] = useState<string>("");
  const [providerFormSpecialty, setProviderFormSpecialty] = useState("");
  const [providerFormNationalId, setProviderFormNationalId] = useState("");
  const [providerFormBranchId, setProviderFormBranchId] = useState("");
  const [providerFormBranchIds, setProviderFormBranchIds] = useState<string[]>([]);
  const [providerFormBranchSchedules, setProviderFormBranchSchedules] = useState<Record<string, { in_person: any; online: any }>>({});
  const [providerFormSelectedScheduleBranchId, setProviderFormSelectedScheduleBranchId] = useState<string>("");
  const [providerFormStartDate, setProviderFormStartDate] = useState("");
  const [providerFormWorkingDaysHours, setProviderFormWorkingDaysHours] = useState<Record<string, { isOpen: boolean; start: string; end: string; shifts?: { start: string; end: string }[] }>>({ ...DEFAULT_CLOSED_SCHEDULE });
  const [providerFormOnlineWorkingDaysHours, setProviderFormOnlineWorkingDaysHours] = useState<Record<string, { isOpen: boolean; start: string; end: string; shifts?: { start: string; end: string }[] }>>({ ...DEFAULT_CLOSED_SCHEDULE });
  const [providerFormScheduleTab, setProviderFormScheduleTab] = useState<"in_person" | "online">("in_person");
  const [savingProvider, setSavingProvider] = useState(false);

  // ── Dead Attendance plumbing (declared and fetched but never displayed — see Brief 15) ──
  const [providerTab, setProviderTab] = useState<"Doctors" | "Attendance">("Doctors");
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingProviderAttendance, setLoadingProviderAttendance] = useState(false);
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);

  // ── Provider filter/search state ──
  const [showProviderFilterPanel, setShowProviderFilterPanel] = useState(false);
  const [providerFilterBranchId, setProviderFilterBranchId] = useState("All");
  const [providerFilterSpecialty, setProviderFilterSpecialty] = useState("All");
  const [providerFilterGender, setProviderFilterGender] = useState("All");
  const [providerSearchQuery, setProviderSearchQuery] = useState("");

  // ── Permission-normalization effect (extracted from page.tsx larger effect) ──
  useEffect(() => {
    if (adminRole === 'superadmin') return;

    if (activeNav === "Doctors") {
      const hasView = hasPermission("providers.view");
      const hasAttendance = hasPermission("providers.attendance");
      if (hasAttendance && !hasView && providerTab === "Doctors") {
        setProviderTab("Attendance");
      } else if (hasView && !hasAttendance && providerTab === "Attendance") {
        setProviderTab("Doctors");
      }
    }
  }, [activeNav, adminRole, hasPermission, providerTab]);

  // ── Attendance fetch effect ──
  async function fetchAttendance(dateStr: string) {
    setLoadingProviderAttendance(true);
    try {
      const res = await fetch(`/api/provider-attendance?date=${dateStr}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data);
      } else {
        console.error("Failed to fetch attendance");
      }
    } catch (err) {
      console.error("fetchAttendance error:", err);
    } finally {
      setLoadingProviderAttendance(false);
    }
  }

  useEffect(() => {
    if (providerTab === "Attendance") {
      fetchAttendance(attendanceDate);
    }
  }, [providerTab, attendanceDate, fetchAttendance]);

  async function handleToggleAttendance(providerId: string, status: "Present" | "Absent" | "On Leave") {
    setSavingAttendanceId(providerId);
    try {
      const existing = attendanceRecords.find(r => r.provider_id === providerId);
      const payload = {
        providerId,
        date: attendanceDate,
        status,
        checkIn: status === "Present" ? "09:00" : null,
        checkOut: status === "Present" ? "17:00" : null,
        notes: existing?.notes || ""
      };

      const res = await fetch("/api/provider-attendance", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchAttendance(attendanceDate);
      } else {
        alert("Failed to save attendance record.");
      }
    } catch (err) {
      console.error("handleToggleAttendance error:", err);
      alert("Error saving attendance.");
    } finally {
      setSavingAttendanceId(null);
    }
  }

  // ── fetchProviders ──
  function fetchProviders() {
    clearFetchCache("/api/providers");
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProviders(data);
        }
      })
      .catch((err) => console.error("fetchProviders error:", err));
  }

  // ── handleScheduleBranchChange ──
  const handleScheduleBranchChange = (nextBranchId: string) => {
    const prevBranchId = providerFormSelectedScheduleBranchId;
    if (!prevBranchId) {
      setProviderFormSelectedScheduleBranchId(nextBranchId);
      return;
    }

    // Save current schedule configuration to the prev branch ID
    const updatedSchedules = {
      ...providerFormBranchSchedules,
      [prevBranchId]: {
        in_person: providerFormWorkingDaysHours,
        online: providerFormOnlineWorkingDaysHours
      }
    };
    setProviderFormBranchSchedules(updatedSchedules);
    setProviderFormSelectedScheduleBranchId(nextBranchId);

    // Load next branch schedule
    const nextSched = updatedSchedules[nextBranchId] || {};
    let inClinicSched = { ...DEFAULT_CLOSED_SCHEDULE_09 };
    let onlineSched = { ...inClinicSched };

    if (nextSched.in_person) inClinicSched = { ...inClinicSched, ...nextSched.in_person };
    if (nextSched.online) onlineSched = { ...onlineSched, ...nextSched.online };

    setProviderFormWorkingDaysHours(inClinicSched);
    setProviderFormOnlineWorkingDaysHours(onlineSched);
  };

  // ── openAddProviderModal ──
  function openAddProviderModal() {
    setProviderModalMode("add");
    setProviderEditingId(null);
    setProviderFormName("");
    setProviderFormRating(5);
    setProviderFormMore(0);
    setProviderFormFixedSalary("0");
    setProviderFormCommissionType("none");
    setProviderFormCommissionValue("0");
    setProviderFormCommissionBase("gross");
    setProviderFormCommissionFixedComponent("0");
    setProviderFormServiceCommissions([]);
    setProviderFormSelectedServices([]);
    setProviderFormImage("");
    setProviderFormPhone("");
    setProviderFormGender("");
    setProviderFormAge("");
    setProviderFormSpecialty("");
    setProviderFormNationalId("");

    // Multi-branch initial state
    const defaultBranchIds = branches.length > 0 ? [branches[0].id] : [];
    setProviderFormBranchIds(defaultBranchIds);
    setProviderFormBranchSchedules({});

    const activeBranchId = defaultBranchIds.length > 0 ? defaultBranchIds[0] : "";
    setProviderFormSelectedScheduleBranchId(activeBranchId);
    setProviderFormBranchId(activeBranchId); // Backwards compatibility for legacy branchId state

    setProviderFormStartDate("");
    setProviderFormWorkingDaysHours({ ...DEFAULT_CLOSED_SCHEDULE_09 });
    setProviderFormOnlineWorkingDaysHours({ ...DEFAULT_CLOSED_SCHEDULE_09 });
    setProviderFormScheduleTab("in_person");
    setShowProviderModal(true);
  }

  // ── openEditProviderModal ──
  function openEditProviderModal(provider: any) {
    setProviderModalMode("edit");
    setProviderEditingId(provider.id);
    setProviderFormName(provider.name);
    setProviderFormRating(provider.rating || 5);
    setProviderFormMore(provider.more || 0);
    setProviderFormSelectedServices(provider.services || []);
    setProviderFormImage(provider.image || "");
    setProviderFormPhone(provider.phone || "");
    setProviderFormGender(provider.gender || "");
    setProviderFormAge(provider.age ? String(provider.age) : "");
    setProviderFormSpecialty(provider.specialty || "");
    setProviderFormNationalId(provider.nationalId || "");
    setProviderFormStartDate(provider.startDate || "");
    setProviderFormFixedSalary(String(provider.fixedSalary || 0));
    setProviderFormCommissionType(provider.commissionType || "none");
    setProviderFormCommissionValue(String(provider.commissionValue || 0));
    setProviderFormCommissionBase(provider.commissionBase || "gross");
    setProviderFormCommissionFixedComponent(String(provider.commissionFixedComponent || 0));
    setProviderFormServiceCommissions(Array.isArray(provider.serviceCommissions) ? provider.serviceCommissions : []);

    const rawSched = provider.workingDaysHours || {};

    // Parse branch IDs
    let initialBranchIds: string[] = [];
    if (rawSched && typeof rawSched === 'object' && Array.isArray(rawSched.branch_ids)) {
      initialBranchIds = rawSched.branch_ids;
    } else if (provider.branchId) {
      initialBranchIds = [provider.branchId];
    } else if (branches.length > 0) {
      initialBranchIds = [branches[0].id];
    }
    setProviderFormBranchIds(initialBranchIds);

    // Parse branch schedules
    let initialBranchSchedules: Record<string, any> = {};
    if (rawSched && typeof rawSched === 'object' && rawSched.branch_schedules) {
      initialBranchSchedules = rawSched.branch_schedules;
    } else if (provider.branchId) {
      initialBranchSchedules = {
        [provider.branchId]: {
          in_person: rawSched.in_person || rawSched,
          online: rawSched.online || rawSched
        }
      };
    }
    setProviderFormBranchSchedules(initialBranchSchedules);

    // Set selected schedule branch
    const activeBranchId = initialBranchIds.length > 0 ? initialBranchIds[0] : (branches.length > 0 ? branches[0].id : "");
    setProviderFormSelectedScheduleBranchId(activeBranchId);
    setProviderFormBranchId(activeBranchId); // Backwards compatibility

    // Load active branch schedule
    let inClinicSched = { ...DEFAULT_CLOSED_SCHEDULE_09 };
    let onlineSched = { ...inClinicSched };

    const activeBranchSched = initialBranchSchedules[activeBranchId] || {};
    if (activeBranchSched.in_person) {
      inClinicSched = { ...inClinicSched, ...activeBranchSched.in_person };
    }
    if (activeBranchSched.online) {
      onlineSched = { ...onlineSched, ...activeBranchSched.online };
    }

    setProviderFormWorkingDaysHours(inClinicSched);
    setProviderFormOnlineWorkingDaysHours(onlineSched);
    setProviderFormScheduleTab("in_person");
    setEditingDoctorInline(provider);
    setShowProviderModal(false);
  }

  // ── handleSaveProvider ──
  function handleSaveProvider() {
    if (!providerFormName.trim()) {
      alert("Provider Name is required.");
      return;
    }

    if (providerFormBranchIds.length === 0) {
      alert("Please select at least one branch for the provider.");
      return;
    }

    // Capture the current working schedule to the active branch configuration
    const finalSchedules = {
      ...providerFormBranchSchedules,
      ...(providerFormSelectedScheduleBranchId ? {
        [providerFormSelectedScheduleBranchId]: {
          in_person: providerFormWorkingDaysHours,
          online: providerFormOnlineWorkingDaysHours
        }
      } : {})
    };

    // Auto-populate default closed schedules for any assigned branches that haven't been configured yet
    providerFormBranchIds.forEach((bId) => {
      if (!finalSchedules[bId]) {
        finalSchedules[bId] = {
          in_person: { ...DEFAULT_CLOSED_SCHEDULE_09 },
          online: { ...DEFAULT_CLOSED_SCHEDULE_09 }
        };
      }
    });

    // Comprehensive Cross-Branch & Multi-Shift Overlap Validation
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const extractShiftsForDay = (dayConfig: any) => {
      if (!dayConfig || !dayConfig.isOpen) return [];
      const shifts: Array<{ startMins: number; endMins: number; startStr: string; endStr: string }> = [];
      const timeToMins = (tStr: string) => {
        if (!tStr) return 0;
        const [h, m] = tStr.split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      if (Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
        dayConfig.shifts.forEach((s: any) => {
          if (s.start && s.end) {
            shifts.push({
              startMins: timeToMins(s.start),
              endMins: timeToMins(s.end),
              startStr: s.start,
              endStr: s.end,
            });
          }
        });
      } else if (dayConfig.start && dayConfig.end) {
        shifts.push({
          startMins: timeToMins(dayConfig.start),
          endMins: timeToMins(dayConfig.end),
          startStr: dayConfig.start,
          endStr: dayConfig.end,
        });
      }
      return shifts;
    };

    for (const day of weekdays) {
      const dayShifts: Array<{
        branchId: string;
        branchName: string;
        type: 'In-Clinic' | 'Online';
        startMins: number;
        endMins: number;
        startStr: string;
        endStr: string;
      }> = [];

      for (const bId of providerFormBranchIds) {
        const sched = finalSchedules[bId];
        if (!sched) continue;
        const branchName = branches.find((b) => b.id === bId)?.name_en || bId;

        // In-Clinic shifts
        const inClinicShifts = extractShiftsForDay(sched.in_person?.[day]);
        inClinicShifts.forEach((s) => {
          dayShifts.push({ branchId: bId, branchName, type: 'In-Clinic', ...s });
        });

        // Online shifts
        const onlineShifts = extractShiftsForDay(sched.online?.[day]);
        onlineShifts.forEach((s) => {
          dayShifts.push({ branchId: bId, branchName, type: 'Online', ...s });
        });
      }

      // Check all pairs of shifts for overlap on this day
      for (let i = 0; i < dayShifts.length; i++) {
        for (let j = i + 1; j < dayShifts.length; j++) {
          const s1 = dayShifts[i];
          const s2 = dayShifts[j];

          if (s1.startMins < s2.endMins && s2.startMins < s1.endMins) {
            alert(`Schedule overlap detected on ${day}!\nDoctor cannot be scheduled at "${s1.branchName}" (${s1.type}: ${s1.startStr} - ${s1.endStr}) and "${s2.branchName}" (${s2.type}: ${s2.startStr} - ${s2.endStr}) at the same time.`);
            return;
          }
        }
      }
    }

    setSavingProvider(true);

    const payload = {
      name: providerFormName.trim(),
      services: providerFormSelectedServices,
      rating: Number(providerFormRating),
      more: Math.max(0, providerFormSelectedServices.length - 2),
      image: providerFormImage || null,
      phone: providerFormPhone || null,
      gender: providerFormGender || null,
      age: providerFormAge ? Number(providerFormAge) : null,
      specialty: providerFormSpecialty || null,
      nationalId: providerFormNationalId || null,
      workingDaysHours: {
        branch_ids: providerFormBranchIds,
        branch_schedules: finalSchedules
      },
      branchId: providerFormBranchIds[0] || null, // Keep legacy branchId column in sync with first branch
      startDate: getDoctorFirstReservationDate(providerFormName, allReservations) || providerFormStartDate || null,
      fixedSalary: Number(providerFormFixedSalary || 0),
      commissionType: providerFormCommissionType,
      commissionValue: Number(providerFormCommissionValue || 0),
      commissionBase: providerFormCommissionBase,
      commissionFixedComponent: Number(providerFormCommissionFixedComponent || 0),
      serviceCommissions: providerFormServiceCommissions
    };

    const isEdit = providerModalMode === "edit";
    const url = isEdit ? `/api/providers?id=${providerEditingId}` : "/api/providers";
    const method = isEdit ? "PATCH" : "POST";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          fetchProviders();
          fetchRolesAndEmployees();
          setShowProviderModal(false);
          setEditingDoctorInline(null);
          alert(isEdit ? "Provider updated successfully!" : "Provider added successfully!");
        } else {
          alert(data.error || "Failed to save provider.");
        }
      })
      .catch((err) => {
        console.error("handleSaveProvider error:", err);
        alert("Error saving provider.");
      })
      .finally(() => {
        setSavingProvider(false);
      });
  }

  // ── handleToggleProviderStatus ──
  async function handleToggleProviderStatus(provider: any) {
    if (!provider?.id) return;
    const newStatus = provider.active === false ? true : false;

    // Optimistic local update
    setProviders(prev => prev.map(p => (p.id === provider.id || p.name === provider.name) ? { ...p, active: newStatus } : p));
    if (viewingDoctorDetails && (viewingDoctorDetails.id === provider.id || viewingDoctorDetails.name === provider.name)) {
      setViewingDoctorDetails((prev: any) => prev ? { ...prev, active: newStatus } : null);
    }

    try {
      const res = await fetch(`/api/providers?id=${provider.id}`, {
        method: "PUT",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ active: newStatus }),
      });
      if (!res.ok) {
        throw new Error("Failed to update doctor status");
      }
      fetchProviders();
    } catch (err) {
      console.error("handleToggleProviderStatus error:", err);
      fetchProviders();
    }
  }

  // ── handleDeleteProvider ──
  async function handleDeleteProvider(id: string) {
    if (!id) return;
    if (await showConfirm("Are you sure you want to delete this provider?")) {
      fetch(`/api/providers?id=${id}`, {
        method: "DELETE",
        headers: authenticatedJsonHeaders,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            fetchProviders();
            alert("Provider deleted successfully!");
          } else {
            alert("Failed to delete provider.");
          }
        })
        .catch((err) => {
          console.error("handleDeleteProvider error:", err);
          alert("Error deleting provider.");
        });
    }
  }

  return {
    // Provider list state
    providers,
    setProviders,
    fetchProviders,
    handleToggleProviderStatus,

    // Inline & modal state
    editingDoctorInline,
    setEditingDoctorInline,
    viewingDoctorDetails,
    setViewingDoctorDetails,
    showProviderModal,
    setShowProviderModal,
    providerModalMode,
    setProviderModalMode,
    providerEditingId,
    setProviderEditingId,
    savingProvider,

    // Provider form state
    providerFormName,
    setProviderFormName,
    providerFormRating,
    setProviderFormRating,
    providerFormMore,
    setProviderFormMore,
    providerFormFixedSalary,
    setProviderFormFixedSalary,
    providerFormCommissionType,
    setProviderFormCommissionType,
    providerFormCommissionValue,
    setProviderFormCommissionValue,
    providerFormCommissionBase,
    setProviderFormCommissionBase,
    providerFormCommissionFixedComponent,
    setProviderFormCommissionFixedComponent,
    providerFormServiceCommissions,
    setProviderFormServiceCommissions,
    providerFormSelectedServices,
    setProviderFormSelectedServices,
    providerFormImage,
    setProviderFormImage,
    providerFormPhone,
    setProviderFormPhone,
    providerFormGender,
    setProviderFormGender,
    providerFormAge,
    setProviderFormAge,
    providerFormSpecialty,
    setProviderFormSpecialty,
    providerFormNationalId,
    setProviderFormNationalId,
    providerFormBranchId,
    setProviderFormBranchId,
    providerFormBranchIds,
    setProviderFormBranchIds,
    providerFormBranchSchedules,
    setProviderFormBranchSchedules,
    providerFormSelectedScheduleBranchId,
    setProviderFormSelectedScheduleBranchId,
    providerFormStartDate,
    setProviderFormStartDate,
    providerFormWorkingDaysHours,
    setProviderFormWorkingDaysHours,
    providerFormOnlineWorkingDaysHours,
    setProviderFormOnlineWorkingDaysHours,
    providerFormScheduleTab,
    setProviderFormScheduleTab,

    // Schedule branch change handler
    handleScheduleBranchChange,

    // CRUD handlers
    openAddProviderModal,
    openEditProviderModal,
    handleSaveProvider,
    handleDeleteProvider,

    // Dead Attendance plumbing (declared and fetched but never displayed)
    providerTab,
    setProviderTab,
    attendanceDate,
    setAttendanceDate,
    attendanceRecords,
    loadingProviderAttendance,
    savingAttendanceId,
    fetchAttendance,
    handleToggleAttendance,

    // Provider filter/search state
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
  };
}

export type UseProviderFormReturn = ReturnType<typeof useProviderForm>;
