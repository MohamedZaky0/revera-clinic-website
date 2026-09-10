"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Branch } from "@/types";
import { cachedFetch } from "@/lib/fetchCache";

type AuthHeaders = { "Content-Type": string; Authorization: string };
type ShowConfirm = (message: string, title?: string) => Promise<boolean>;

type ServiceHour = {
  day: string;
  dayAr: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

const DEFAULT_SERVICE_HOURS: ServiceHour[] = [
  { day: "Sunday", dayAr: "الأحد", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { day: "Monday", dayAr: "الإثنين", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { day: "Tuesday", dayAr: "الثلاثاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { day: "Wednesday", dayAr: "الأربعاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { day: "Thursday", dayAr: "الخميس", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { day: "Friday", dayAr: "الجمعة", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  { day: "Saturday", dayAr: "السبت", isOpen: true, openTime: "09:00", closeTime: "20:00" },
];

interface UseBranchStateParams {
  authenticatedJsonHeaders: AuthHeaders;
  showConfirm: ShowConfirm;
}

/**
 * Shared hook for Branches and Service Hours screens.
 * Manages branch CRUD state and service-hours state, both of which persist
 * via POST /api/branches.
 *
 * `branches` and `serviceHours` are returned so page.tsx can use them
 * in booking logic, provider forms, etc.
 */
export function useBranchState({ authenticatedJsonHeaders, showConfirm }: UseBranchStateParams) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchModal, setBranchModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    branch: Partial<Branch>;
  }>({ open: false, mode: "add", branch: {} });
  const [savingBranch, setSavingBranch] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [selectedBranchForHoursId, setSelectedBranchForHoursId] = useState<string>("");
  const [savingBranchHours, setSavingBranchHours] = useState(false);
  const [serviceHours, setServiceHours] = useState<ServiceHour[]>(DEFAULT_SERVICE_HOURS);

  const headersRef = useRef(authenticatedJsonHeaders);
  const showConfirmRef = useRef(showConfirm);
  useEffect(() => {
    headersRef.current = authenticatedJsonHeaders;
    showConfirmRef.current = showConfirm;
  }, [authenticatedJsonHeaders, showConfirm]);

  /** Fetch all branches from /api/branches. Returns the list and sets state. */
  const fetchBranches = useCallback(async (): Promise<Branch[]> => {
    setLoadingBranches(true);
    try {
      const data = await cachedFetch("/api/branches", 30000);
      const list: Branch[] = Array.isArray(data) ? data : [];
      setBranches(list);
      if (list.length > 0) {
        setSelectedBranchForHoursId((prev) => prev || list[0].id);
      }
      return list;
    } catch {
      setBranches([]);
      return [];
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  /** Also returns branches so page.tsx can set its own branch filter. */
  const fetchBranchesAndSetBranch = useCallback(async (): Promise<Branch[]> => {
    const list = await fetchBranches();
    return list;
  }, [fetchBranches]);

  // Sync serviceHours state with active branch selection
  useEffect(() => {
    if (!selectedBranchForHoursId) return;
    const branchRecord = branches.find((b) => b.id === selectedBranchForHoursId);
    if (branchRecord && Array.isArray(branchRecord.service_hours) && branchRecord.service_hours.length > 0) {
      setServiceHours(branchRecord.service_hours as ServiceHour[]);
    } else {
      setServiceHours(DEFAULT_SERVICE_HOURS);
    }
  }, [selectedBranchForHoursId, branches]);

  /** Save service hours for the selected branch via POST /api/branches. */
  const handleSaveBranchServiceHours = useCallback(async () => {
    if (!selectedBranchForHoursId) return;
    setSavingBranchHours(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: headersRef.current,
        body: JSON.stringify({
          id: selectedBranchForHoursId,
          service_hours: serviceHours,
        }),
      });
      if (res.ok) {
        const updatedBranch = await res.json();
        setBranches((prev) =>
          prev.map((b) =>
            b.id === updatedBranch.id || b.id === selectedBranchForHoursId
              ? { ...b, ...updatedBranch, service_hours: serviceHours }
              : b,
          ),
        );
        alert("Branch service hours saved successfully!");
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to save branch service hours: ${errJson.error || res.statusText || "Unknown error"}`);
      }
    } catch (err) {
      console.error("handleSaveBranchServiceHours error:", err);
      alert("Error saving branch service hours.");
    } finally {
      setSavingBranchHours(false);
    }
  }, [selectedBranchForHoursId, serviceHours]);

  /** Toggle a branch's active/inactive status. */
  const toggleBranchStatus = useCallback(async (br: Branch) => {
    const newStatus = br.status === "active" ? "inactive" : "active";
    await fetch("/api/branches", {
      method: "POST",
      headers: headersRef.current,
      body: JSON.stringify({ ...br, status: newStatus }),
    });
    setBranches((prev) => prev.map((b) => (b.id === br.id ? { ...b, status: newStatus } : b)));
  }, []);

  /** Delete a branch after confirmation. */
  const deleteBranch = useCallback(async (br: Branch) => {
    if (!(await showConfirmRef.current(`Delete "${br.name_en}"?`))) return;
    setDeletingBranchId(br.id);
    await fetch(`/api/branches?id=${br.id}`, { method: "DELETE", headers: headersRef.current });
    setBranches((prev) => prev.filter((b) => b.id !== br.id));
    setDeletingBranchId(null);
  }, []);

  /** Save (add or edit) a branch from the modal form. */
  const saveBranchFromModal = useCallback(async (): Promise<boolean> => {
    setSavingBranch(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: headersRef.current,
        body: JSON.stringify(branchModal.branch),
      });
      const saved = await res.json();
      if (branchModal.mode === "edit") {
        setBranches((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      } else {
        setBranches((prev) => [...prev, saved]);
      }
      setBranchModal({ open: false, mode: "add", branch: {} });
      return true;
    } catch {
      return false;
    } finally {
      setSavingBranch(false);
    }
  }, [branchModal]);

  return {
    branches,
    setBranches,
    loadingBranches,
    branchModal,
    setBranchModal,
    savingBranch,
    deletingBranchId,
    selectedBranchForHoursId,
    setSelectedBranchForHoursId,
    savingBranchHours,
    serviceHours,
    setServiceHours,
    fetchBranches,
    handleSaveBranchServiceHours,
    toggleBranchStatus,
    deleteBranch,
    saveBranchFromModal,
  };
}
