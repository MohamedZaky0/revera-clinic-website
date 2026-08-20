"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Gauge,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Wrench,
  MoreVertical,
  Pencil,
  RotateCcw,
  History,
  X,
  Loader2,
  DollarSign,
} from "lucide-react";
import DeviceAuditLogsModal from "./DeviceAuditLogsModal";

type Branch = { id: string; name_en: string };

type Device = {
  id: string;
  name: string;
  model?: string;
  serial_number?: string;
  category?: string;
  branch_id?: string | null;
  status?: string;
  current_pulse_count?: number;
  initial_pulse_count?: number;
  warning_threshold_1?: number;
  maintenance_threshold_2?: number;
  lamp_replacement_cost?: number;
  notes?: string;
  last_maintenance_date?: string;
};

type DeviceHistory = {
  id: string;
  device_id: string;
  reason: string;
  reset_date: string;
  pulses_delivered?: number;
  ending_pulse_count?: number;
  performed_by?: string;
  notes?: string;
};

export type InventoryDevicesTabRef = {
  openAddDevice: () => void;
  openAuditLogs: () => void;
};

type Props = {
  authHeaders: Record<string, string>;
  branches: Branch[];
  canManage: boolean;
  onDeviceCountChange?: (count: number) => void;
};

const InventoryDevicesTab = forwardRef<InventoryDevicesTabRef, Props>(
  function InventoryDevicesTab({ authHeaders, branches, canManage, onDeviceCountChange }, ref) {
    // Device list state
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<DeviceHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [branchFilter, setBranchFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [activeRowMenuId, setActiveRowMenuId] = useState<string | number | null>(null);

    // Add/Edit Device modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [deviceName, setDeviceName] = useState("");
    const [deviceModel, setDeviceModel] = useState("");
    const [deviceSerial, setDeviceSerial] = useState("");
    const [deviceCategory, setDeviceCategory] = useState("Laser Hair Removal");
    const [deviceBranchId, setDeviceBranchId] = useState("");
    const [deviceInitialPulses, setDeviceInitialPulses] = useState("0");
    const [deviceWarningThreshold1, setDeviceWarningThreshold1] = useState("80000");
    const [deviceMaintenanceThreshold2, setDeviceMaintenanceThreshold2] = useState("100000");
    const [deviceLampReplacementCost, setDeviceLampReplacementCost] = useState("0");
    const [deviceNotes, setDeviceNotes] = useState("");

    // Update Pulse Count modal state
    const [selectedDeviceForPulses, setSelectedDeviceForPulses] = useState<Device | null>(null);
    const [newPulseCountInput, setNewPulseCountInput] = useState("");
    const [showUpdatePulsesModal, setShowUpdatePulsesModal] = useState(false);

    // Reset Pulses Counter modal state
    const [selectedDeviceForReset, setSelectedDeviceForReset] = useState<Device | null>(null);
    const [resetReason, setResetReason] = useState("Routine Maintenance");
    const [resetPerformedBy, setResetPerformedBy] = useState("");
    const [resetNotes, setResetNotes] = useState("");
    const [showResetPulsesModal, setShowResetPulsesModal] = useState(false);

    // History modal state
    const [selectedDeviceForHistory, setSelectedDeviceForHistory] = useState<Device | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Audit Logs modal state
    const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);

    // Row menu ref for click-outside
    const rowMenuRef = useRef<HTMLDivElement>(null);

    const fetchDevices = useCallback(async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/inventory/devices", {
          headers: authHeaders,
        });
        if (res.ok) {
          const data = await res.json();
          setDevices(data.devices || []);
          setHistory(data.history || []);
          onDeviceCountChange?.(data.devices?.length || 0);
        }
      } catch (err) {
        console.error("Error fetching inventory devices:", err);
      } finally {
        setLoading(false);
      }
    }, [authHeaders, onDeviceCountChange]);

    useEffect(() => {
      fetchDevices();
    }, [fetchDevices]);

    // Click-outside handler for row menu
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
          setActiveRowMenuId(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useImperativeHandle(ref, () => ({
      openAddDevice: () => {
        setEditingDevice(null);
        setDeviceName("");
        setDeviceModel("");
        setDeviceSerial("");
        setDeviceCategory("Laser Hair Removal");
        setDeviceBranchId(branches.length > 0 ? branches[0].id : "");
        setDeviceInitialPulses("0");
        setDeviceWarningThreshold1("80000");
        setDeviceMaintenanceThreshold2("100000");
        setDeviceLampReplacementCost("0");
        setDeviceNotes("");
        setShowAddModal(true);
      },
      openAuditLogs: () => {
        setShowAuditLogsModal(true);
      },
    }));

    const filteredDevices = devices.filter((dev) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = dev.name?.toLowerCase().includes(q);
        const matchModel = dev.model?.toLowerCase().includes(q);
        const matchSerial = dev.serial_number?.toLowerCase().includes(q);
        if (!matchName && !matchModel && !matchSerial) return false;
      }
      if (branchFilter !== "all" && dev.branch_id !== branchFilter) return false;
      if (statusFilter !== "all" && dev.status !== statusFilter) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Devices */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">
                Total Devices
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF1EC] text-[#414E36]">
                <Gauge size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-[#111827]">{devices.length}</span>
              <span className="text-xs font-semibold text-[#5A6A51]">Registered</span>
            </div>
          </div>

          {/* Card 2: Optimal Status */}
          <div className="rounded-2xl border border-emerald-100/60 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Optimal Status
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-[#111827]">
                {devices.filter((d) => d.status === "Optimal").length}
              </span>
              <span className="text-xs font-semibold text-emerald-600">Healthy</span>
            </div>
          </div>

          {/* Card 3: 1st Warning Reached */}
          <div className="rounded-2xl border border-amber-100/60 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                1st Warning Reached
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-[#111827]">
                {devices.filter((d) => d.status === "Warning").length}
              </span>
              <span className="text-xs font-semibold text-amber-600">Attention</span>
            </div>
          </div>

          {/* Card 4: Maintenance Due */}
          <div className="rounded-2xl border border-red-100/60 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
                Maintenance Due
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Wrench size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-[#111827]">
                {devices.filter((d) => d.status === "Maintenance Due").length}
              </span>
              <span className="text-xs font-semibold text-red-600">Action Needed</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mb-5 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
            <input
              type="text"
              placeholder="Search devices by name, model, or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 shadow-2xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            title="Filter"
            className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer shadow-2xs ${
              showFilterPanel || branchFilter !== "all" || statusFilter !== "all"
                ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
            }`}
          >
            <Filter size={15} />
            {(branchFilter !== "all" || statusFilter !== "all") && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
            )}
          </button>
        </div>

        {/* Filter Panel Drawer */}
        {showFilterPanel && (
          <div className="mb-5 grid grid-cols-1 gap-4 rounded-2xl border border-[#414E36]/10 bg-[#F9F9F7] p-4 md:grid-cols-2 items-end shadow-sm animate-fadeIn">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Branch Filter</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              >
                <option value="all">All Statuses</option>
                <option value="Optimal">Optimal</option>
                <option value="Warning">1st Warning Reached</option>
                <option value="Maintenance Due">Maintenance Due</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          </div>
        )}

        {/* Devices Table */}
        <div className="rounded-[36px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] border border-[#E6E9EB]">
          <div className="overflow-x-auto rounded-[28px] border border-[#E6E9EB] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.15em] text-[#5A6A51]">
                  <th className="px-6 py-4 text-left">Device &amp; Details</th>
                  <th className="px-6 py-4 text-left">Category &amp; Branch</th>
                  <th className="px-6 py-4 text-left">Pulse Counter &amp; Thresholds</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Last Service</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#5A6A51]">
                      <Loader2 className="inline-block animate-spin mr-2" size={18} /> Loading devices...
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#5A6A51]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Gauge size={32} className="text-[#A3B19B]" />
                        <p className="font-semibold text-[#1F251A]">No clinic devices found</p>
                        <p className="text-xs text-[#5A6A51]">Click below to register your first clinic machine or device.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDevice(null);
                            setDeviceName("");
                            setDeviceModel("");
                            setDeviceSerial("");
                            setDeviceCategory("Laser Hair Removal");
                            setDeviceBranchId(branches.length > 0 ? branches[0].id : "");
                            setDeviceInitialPulses("0");
                            setDeviceWarningThreshold1("80000");
                            setDeviceMaintenanceThreshold2("100000");
                            setDeviceNotes("");
                            setShowAddModal(true);
                          }}
                          className={`${canManage ? "inline-flex" : "hidden"} items-center gap-2 rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26] shadow-sm cursor-pointer`}
                        >
                          <Plus size={14} /> Add Device
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => {
                    const current = Number(dev.current_pulse_count) || 0;
                    const t1 = Number(dev.warning_threshold_1) || 80000;
                    const t2 = Number(dev.maintenance_threshold_2) || 100000;
                    const percent = Math.min(100, Math.round((current / t2) * 100));

                    const branchObj = branches.find((b) => b.id === dev.branch_id);

                    return (
                      <tr key={dev.id} className="transition hover:bg-[#F9F9F7]">
                        {/* Device Name & Serial */}
                        <td className="px-6 py-5">
                          <div className="font-bold text-[#1F251A] text-base">{dev.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-[#5A6A51] bg-[#F4F6F4] px-2 py-0.5 rounded-md border border-[#E6E9EB]">
                              Model: {dev.model || "N/A"}
                            </span>
                            <span className="text-xs font-mono text-[#5A6A51] bg-[#F4F6F4] px-2 py-0.5 rounded-md border border-[#E6E9EB]">
                              S/N: {dev.serial_number || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Category & Branch */}
                        <td className="px-6 py-5">
                          <div className="text-sm font-semibold text-[#1F251A]">{dev.category}</div>
                          <div className="text-xs text-[#5A6A51] mt-0.5">
                            {branchObj ? branchObj.name_en : "All Branches"}
                          </div>
                        </td>

                        {/* Pulse Counter Progress */}
                        <td className="px-6 py-5 min-w-[220px]">
                          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                            <span className="font-mono text-sm text-[#1F251A] font-bold">
                              {current.toLocaleString()} <span className="text-xs text-[#5A6A51] font-normal">pulses</span>
                            </span>
                            <span className="text-[11px] text-[#5A6A51] font-mono">
                              Max: {t2.toLocaleString()}
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-[#EBF0E6] h-2.5 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full transition-all duration-300 ${
                                dev.status === "Maintenance Due"
                                  ? "bg-red-500"
                                  : dev.status === "Warning"
                                  ? "bg-amber-500"
                                  : "bg-[#414E36]"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#8C9A84] mt-1 font-mono">
                            <span>1st Warn @ {t1.toLocaleString()}</span>
                            <span>Limit @ {t2.toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-5 text-center">
                          {dev.status === "Maintenance Due" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200 animate-pulse">
                              <Wrench size={13} /> Maintenance Due!
                            </span>
                          )}
                          {dev.status === "Warning" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                              <AlertTriangle size={13} /> 1st Warning
                            </span>
                          )}
                          {dev.status === "Optimal" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <CheckCircle size={13} /> Optimal
                            </span>
                          )}
                          {dev.status === "Out of Service" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 border border-gray-200">
                              Out of Service
                            </span>
                          )}
                        </td>

                        {/* Last Maintenance Date */}
                        <td className="px-6 py-5 text-center text-xs font-medium text-[#5A6A51]">
                          {dev.last_maintenance_date
                            ? new Date(dev.last_maintenance_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </td>

                        {/* Actions 3-Dots Dropdown Menu */}
                        <td className="px-6 py-5 text-right">
                          <div ref={rowMenuRef} className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId((prev) => (prev === dev.id ? null : dev.id));
                              }}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
                                activeRowMenuId === dev.id
                                  ? "border-[#414E36] bg-[#414E36] text-white"
                                  : "border-[#414E36]/15 bg-white text-[#5A6A51] hover:border-[#C4AE7C] hover:text-[#414E36]"
                              }`}
                              title="Actions"
                            >
                              <MoreVertical size={14} />
                            </button>

                            {activeRowMenuId === dev.id && (
                              <div className="absolute right-0 top-9 z-50 w-48 rounded-2xl bg-white p-1.5 shadow-xl border border-[#414E36]/15 text-xs text-left dropdown-action-menu">
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRowMenuId(null);
                                      setSelectedDeviceForPulses(dev);
                                      setNewPulseCountInput(String(dev.current_pulse_count || 0));
                                      setShowUpdatePulsesModal(true);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <Gauge size={14} className="text-[#414E36]" />
                                    <span>Update Pulses</span>
                                  </button>
                                )}

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRowMenuId(null);
                                      setSelectedDeviceForReset(dev);
                                      setResetReason("Routine Maintenance");
                                      setResetPerformedBy("");
                                      setResetNotes("");
                                      setShowResetPulsesModal(true);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 font-semibold text-amber-800 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <RotateCcw size={14} className="text-amber-600" />
                                    <span>Reset Counter</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRowMenuId(null);
                                    setSelectedDeviceForHistory(dev);
                                    setShowHistoryModal(true);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  <History size={14} className="text-[#5A6A51]" />
                                  <span>View History</span>
                                </button>

                                <div className="my-1 border-t border-gray-100" />

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRowMenuId(null);
                                      setEditingDevice(dev);
                                      setDeviceName(dev.name || "");
                                      setDeviceModel(dev.model || "");
                                      setDeviceSerial(dev.serial_number || "");
                                      setDeviceCategory(dev.category || "Laser Hair Removal");
                                      setDeviceBranchId(dev.branch_id || "");
                                      setDeviceInitialPulses(String(dev.initial_pulse_count || 0));
                                      setDeviceWarningThreshold1(String(dev.warning_threshold_1 || 80000));
                                      setDeviceMaintenanceThreshold2(String(dev.maintenance_threshold_2 || 100000));
                                      setDeviceLampReplacementCost(String(dev.lamp_replacement_cost ?? 0));
                                      setDeviceNotes(dev.notes || "");
                                      setShowAddModal(true);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FBFBF9] font-semibold text-[#1F251A] flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <Pencil size={14} className="text-[#5A6A51]" />
                                    <span>Edit Device</span>
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

        {/* ── MODAL: ADD / EDIT CLINIC DEVICE ── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-[#1F251A]">
                    {editingDevice ? "Edit Clinic Device" : "Add New Clinic Device"}
                  </h3>
                  <p className="text-xs text-[#5A6A51] mt-1">
                    Configure device specifications, initial pulse count, and maintenance alert thresholds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-full p-2 text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!deviceName.trim()) {
                    alert("Device Name is required.");
                    return;
                  }
                  if (Number(deviceLampReplacementCost) < 0) {
                    alert("Lamp Replacement Cost cannot be negative.");
                    return;
                  }
                  try {
                    const payload = {
                      id: editingDevice?.id,
                      name: deviceName.trim(),
                      model: deviceModel.trim(),
                      serial_number: deviceSerial.trim(),
                      category: deviceCategory.trim(),
                      branch_id: deviceBranchId || null,
                      initial_pulse_count: Number(deviceInitialPulses) || 0,
                      warning_threshold_1: Number(deviceWarningThreshold1) || 80000,
                      maintenance_threshold_2: Number(deviceMaintenanceThreshold2) || 100000,
                      lamp_replacement_cost: Number(deviceLampReplacementCost) || 0,
                      notes: deviceNotes.trim(),
                    };

                    const method = editingDevice ? "PUT" : "POST";
                    const res = await fetch("/api/inventory/devices", {
                      method,
                      headers: authHeaders,
                      body: JSON.stringify(payload),
                    });

                    if (res.ok) {
                      setShowAddModal(false);
                      fetchDevices();
                      alert(editingDevice ? "Device updated successfully!" : "Device registered successfully!");
                    } else {
                      const err = await res.json();
                      alert(err.error || "Failed to save device.");
                    }
                  } catch (err) {
                    console.error("Save device error:", err);
                    alert("Error saving device.");
                  }
                }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Device Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Candela GentleMax Pro"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Model</label>
                    <input
                      type="text"
                      placeholder="e.g. PRO-2026"
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. CN-892410"
                      value={deviceSerial}
                      onChange={(e) => setDeviceSerial(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Category</label>
                    <select
                      value={deviceCategory}
                      onChange={(e) => setDeviceCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    >
                      <option value="Laser Hair Removal">Laser Hair Removal</option>
                      <option value="Facial & Skincare">Facial &amp; Skincare</option>
                      <option value="Body Contouring">Body Contouring</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="General Equipment">General Equipment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Assigned Branch</label>
                    <select
                      value={deviceBranchId}
                      onChange={(e) => setDeviceBranchId(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    >
                      <option value="">All Branches / Main Storage</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F251A] mb-1">Initial Pulse Count</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={deviceInitialPulses}
                      onChange={(e) => setDeviceInitialPulses(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                  </div>
                </div>

                {/* Threshold Configuration Box */}
                <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#E6E9EB] space-y-3">
                  <div className="flex items-center gap-2 text-[#414E36] font-semibold text-xs uppercase tracking-wider">
                    <AlertTriangle size={14} className="text-amber-600" /> Maintenance Alert Thresholds
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5A6A51] mb-1">
                        1st Warning Threshold (Pulses)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={deviceWarningThreshold1}
                        onChange={(e) => setDeviceWarningThreshold1(e.target.value)}
                        className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-[10px] text-[#8C9A84] mt-1">Triggers 1st warning alert to admin.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5A6A51] mb-1">
                        2nd Threshold (Maintenance Due)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={deviceMaintenanceThreshold2}
                        onChange={(e) => setDeviceMaintenanceThreshold2(e.target.value)}
                        className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-[10px] text-[#8C9A84] mt-1">Triggers critical maintenance due notification.</p>
                    </div>
                  </div>
                </div>

                {/* Lamp/Handpiece Replacement Cost */}
                <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#E6E9EB] space-y-3">
                  <div className="flex items-center gap-2 text-[#414E36] font-semibold text-xs uppercase tracking-wider">
                    <DollarSign size={14} className="text-[#414E36]" /> Lamp / Handpiece Replacement Cost
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5A6A51] mb-1">
                      Replacement Cost (EGP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={deviceLampReplacementCost}
                      onChange={(e) => setDeviceLampReplacementCost(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm font-mono text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                    />
                    <p className="text-[10px] text-[#8C9A84] mt-1">
                      Cost to replace this device&apos;s consumable lamp/handpiece once it reaches its rated
                      pulse limit ({Number(deviceMaintenanceThreshold2 || 100000).toLocaleString()} pulses). Used to
                      calculate the per-pulse cost of services performed on this device.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Notes / Machine Location</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Primary Alexandrite laser system in Room 1."
                    value={deviceNotes}
                    onChange={(e) => setDeviceNotes(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E9EB]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-2xl border border-[#E6E9EB] px-5 py-2.5 text-sm font-semibold text-[#5A6A51] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2e3a26] transition shadow-sm"
                  >
                    {editingDevice ? "Save Changes" : "Create Device"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: UPDATE PULSE COUNT ── */}
        {showUpdatePulsesModal && selectedDeviceForPulses && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-6">
              <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">Update Current Pulse Count</h3>
                  <p className="text-xs text-[#5A6A51] mt-1">{selectedDeviceForPulses.name} ({selectedDeviceForPulses.model})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpdatePulsesModal(false)}
                  className="rounded-full p-2 text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const countVal = Number(newPulseCountInput);
                  if (isNaN(countVal) || countVal < 0) {
                    alert("Please enter a valid pulse count.");
                    return;
                  }

                  try {
                    const res = await fetch("/api/inventory/devices", {
                      method: "PUT",
                      headers: authHeaders,
                      body: JSON.stringify({
                        id: selectedDeviceForPulses.id,
                        current_pulse_count: countVal,
                      }),
                    });

                    if (res.ok) {
                      const updated = await res.json();
                      setShowUpdatePulsesModal(false);
                      setSelectedDeviceForPulses(null);
                      fetchDevices();

                      if (updated.status === "Maintenance Due") {
                        alert("⚠️ Maintenance Due! Counter has reached or exceeded the 2nd maintenance threshold.");
                      } else if (updated.status === "Warning") {
                        alert("⚡ First Warning Reached! Counter has crossed the 1st threshold.");
                      } else {
                        alert("Pulse count updated successfully.");
                      }
                    } else {
                      const err = await res.json();
                      alert(err.error || "Failed to update pulse count.");
                    }
                  } catch (err) {
                    console.error("Update pulse count error:", err);
                    alert("Error updating pulse count.");
                  }
                }}
                className="space-y-5"
              >
                <div className="rounded-2xl bg-[#FBFBF9] p-4 border border-[#E6E9EB] space-y-2 text-xs">
                  <div className="flex justify-between text-[#5A6A51]">
                    <span>1st Warning Threshold:</span>
                    <span className="font-mono font-bold text-[#1F251A]">
                      {Number(selectedDeviceForPulses.warning_threshold_1 || 80000).toLocaleString()} pulses
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5A6A51]">
                    <span>2nd Maintenance Due Threshold:</span>
                    <span className="font-mono font-bold text-[#1F251A]">
                      {Number(selectedDeviceForPulses.maintenance_threshold_2 || 100000).toLocaleString()} pulses
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">New Current Pulse Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPulseCountInput}
                    onChange={(e) => setNewPulseCountInput(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-4 py-3 text-lg font-mono font-bold text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                {/* Status Live Preview */}
                {(() => {
                  const inputVal = Number(newPulseCountInput) || 0;
                  const t1 = Number(selectedDeviceForPulses.warning_threshold_1 || 80000);
                  const t2 = Number(selectedDeviceForPulses.maintenance_threshold_2 || 100000);

                  if (inputVal >= t2) {
                    return (
                      <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                        <Wrench size={16} className="text-red-600 shrink-0" />
                        <span>Status will update to <strong>Maintenance Due</strong> and trigger critical notification.</span>
                      </div>
                    );
                  }
                  if (inputVal >= t1) {
                    return (
                      <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>Status will update to <strong>1st Warning</strong> and send alert notification.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                      <span>Status is <strong>Optimal</strong>. Pulse count is within normal operating range.</span>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E9EB]">
                  <button
                    type="button"
                    onClick={() => setShowUpdatePulsesModal(false)}
                    className="rounded-2xl border border-[#E6E9EB] px-5 py-2.5 text-sm font-semibold text-[#5A6A51] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2e3a26] transition shadow-sm"
                  >
                    Save Pulse Count
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: RESET PULSE COUNTER ── */}
        {showResetPulsesModal && selectedDeviceForReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-6">
              <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">Reset Pulse Counter</h3>
                  <p className="text-xs text-[#5A6A51] mt-1">
                    Reset maintenance cycle after service for {selectedDeviceForReset.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetPulsesModal(false)}
                  className="rounded-full p-2 text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch(`/api/inventory/devices/${selectedDeviceForReset.id}/reset-pulses`, {
                      method: "POST",
                      headers: authHeaders,
                      body: JSON.stringify({
                        reason: resetReason,
                        performedBy: resetPerformedBy,
                        notes: resetNotes,
                        resetToZero: true,
                      }),
                    });

                    if (res.ok) {
                      setShowResetPulsesModal(false);
                      setSelectedDeviceForReset(null);
                      fetchDevices();
                      alert("Counter reset successfully! Maintenance logged and alert cycle restarted.");
                    } else {
                      const err = await res.json();
                      alert(err.error || "Failed to reset counter.");
                    }
                  } catch (err) {
                    console.error("Reset pulses error:", err);
                    alert("Error resetting pulse counter.");
                  }
                }}
                className="space-y-5"
              >
                <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <RotateCcw size={14} /> Counter Reset Notice:
                  </p>
                  <p>
                    Current counter of <strong>{(Number(selectedDeviceForReset.current_pulse_count) || 0).toLocaleString()} pulses</strong> will be archived in maintenance history. The counter will reset to <strong>0</strong> and status returned to <strong>Optimal</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Maintenance / Service Reason *</label>
                  <select
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  >
                    <option value="Routine Maintenance">Routine Maintenance</option>
                    <option value="Flashlamp Replacement">Flashlamp Replacement</option>
                    <option value="Handpiece Diode Stack Service">Handpiece Diode Stack Service</option>
                    <option value="Vortex Tip & Filter Replacement">Vortex Tip &amp; Filter Replacement</option>
                    <option value="Calibration & Sensor Alignment">Calibration &amp; Sensor Alignment</option>
                    <option value="Other Service">Other Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Service Agent / Technician Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Eng. Karim (Official Service Agent)"
                    value={resetPerformedBy}
                    onChange={(e) => setResetPerformedBy(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F251A] mb-1">Service Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Replaced dual lamps, recalibrated energy sensors."
                    value={resetNotes}
                    onChange={(e) => setResetNotes(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E9EB] bg-white px-3.5 py-2 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E9EB]">
                  <button
                    type="button"
                    onClick={() => setShowResetPulsesModal(false)}
                    className="rounded-2xl border border-[#E6E9EB] px-5 py-2.5 text-sm font-semibold text-[#5A6A51] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 transition shadow-sm"
                  >
                    Reset Counter &amp; Restart Cycle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: DEVICE MAINTENANCE HISTORY ── */}
        {showHistoryModal && selectedDeviceForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl rounded-[36px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E6E9EB] space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E6E9EB] pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-[#1F251A]">Maintenance &amp; Reset History</h3>
                  <p className="text-xs text-[#5A6A51] mt-1">{selectedDeviceForHistory.name} (S/N: {selectedDeviceForHistory.serial_number || "N/A"})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-full p-2 text-[#5A6A51] hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* History Logs List */}
              <div className="space-y-4">
                {history.filter((h) => h.device_id === selectedDeviceForHistory.id).length === 0 ? (
                  <div className="text-center py-12 text-sm text-[#5A6A51] bg-[#FBFBF9] rounded-2xl border border-[#E6E9EB]">
                    No maintenance or counter reset logs recorded yet for this device.
                  </div>
                ) : (
                  history
                    .filter((h) => h.device_id === selectedDeviceForHistory.id)
                    .map((log) => (
                      <div key={log.id} className="rounded-2xl border border-[#E6E9EB] bg-[#FBFBF9] p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#1F251A]">{log.reason}</span>
                          <span className="text-xs text-[#5A6A51] font-mono">
                            {new Date(log.reset_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[#5A6A51] pt-1">
                          <div>
                            <span className="block text-[10px] uppercase text-[#8C9A84] font-semibold">Pulses Delivered</span>
                            <span className="font-mono font-bold text-[#1F251A]">
                              {(log.pulses_delivered || 0).toLocaleString()} pulses
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase text-[#8C9A84] font-semibold">Ending Count</span>
                            <span className="font-mono text-[#1F251A]">
                              {(log.ending_pulse_count || 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase text-[#8C9A84] font-semibold">Technician</span>
                            <span className="text-[#1F251A]">{log.performed_by || "Clinic Admin"}</span>
                          </div>
                        </div>

                        {log.notes && (
                          <p className="text-xs text-[#5A6A51] italic bg-white p-2.5 rounded-xl border border-[#E6E9EB] mt-2">
                            &ldquo;{log.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                )}
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-[#E6E9EB]">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2e3a26] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Device Audit Logs Modal */}
        <DeviceAuditLogsModal
          open={showAuditLogsModal}
          onClose={() => setShowAuditLogsModal(false)}
          authHeaders={authHeaders}
          devices={devices}
        />
      </div>
    );
  }
);

export default InventoryDevicesTab;
