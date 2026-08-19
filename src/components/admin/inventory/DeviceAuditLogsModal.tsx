"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, RotateCcw, Search, X } from "lucide-react";

type DeviceAuditLog = {
  id: string;
  device_id: string;
  device_name: string;
  type?: string;
  action_type?: string;
  date?: string;
  created_at: string;
  starting_pulse_count?: number;
  ending_pulse_count?: number;
  pulses_delivered?: number;
  reason?: string;
  notes?: string;
  performed_by?: string;
};

type Device = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  authHeaders: Record<string, string>;
  devices: Device[];
};

export default function DeviceAuditLogsModal({ open, onClose, authHeaders, devices }: Props) {
  const [auditLogs, setAuditLogs] = useState<DeviceAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory/devices/audit-logs", {
        headers: authHeaders,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error("fetchDeviceAuditLogs error:", err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, fetchLogs]);

  if (!open) return null;

  const filteredLogs = auditLogs.filter((log) => {
    const matchDevice = filterDevice === "all" || log.device_id === filterDevice;
    const matchType =
      filterType === "all" ||
      (log.type || log.action_type || "").toLowerCase().includes(filterType.toLowerCase());
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      (log.device_name || "").toLowerCase().includes(query) ||
      (log.reason || "").toLowerCase().includes(query) ||
      (log.notes || "").toLowerCase().includes(query) ||
      (log.performed_by || "").toLowerCase().includes(query);
    return matchDevice && matchType && matchQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
      <div className="w-full max-w-5xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#414E36]/10 pb-4 shrink-0">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#5A6A51] font-bold">Inventory Audit History</p>
            <h3 className="mt-1 text-2xl font-semibold text-[#1F251A] flex items-center gap-2">
              <Gauge size={22} className="text-[#414E36]" /> Clinic Device Audit &amp; Maintenance Logs
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              className="rounded-full bg-[#EBF0E6] p-2.5 text-[#414E36] transition hover:bg-[#d8e3d2]"
              title="Refresh Audit Logs"
            >
              <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter controls bar */}
        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E6E9EB]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9A84]" />
            <input
              type="text"
              placeholder="Search logs by device, serial number, reason, performed by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#E6E9EB] bg-[#FBFBF9] pl-9 pr-3 py-2 text-xs text-[#1F251A] placeholder-[#8C9A84] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="rounded-xl border border-[#E6E9EB] bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            >
              <option value="all">All Devices</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-[#E6E9EB] bg-[#FBFBF9] px-3 py-2 text-xs font-semibold text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            >
              <option value="all">All Action Types</option>
              <option value="Pulse Reset">Pulse Reset / Maintenance</option>
              <option value="Device Created">Device Created</option>
              <option value="Device Updated">Device Updated</option>
              <option value="Status Changed">Status Changed</option>
            </select>
          </div>
        </div>

        {/* Logs List Content */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#414E36] border-t-transparent" />
              <p className="text-xs text-[#5A6A51] font-semibold">Loading Device Audit Logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-[#5A6A51] italic text-sm bg-white rounded-2xl border border-[#E6E9EB]">
              No device audit logs found matching your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const actionType = log.type || log.action_type || "Pulse Reset";
                const isReset = actionType.toLowerCase().includes("reset") || actionType.toLowerCase().includes("maintenance");
                const isCreated = actionType.toLowerCase().includes("create");
                const isStatus = actionType.toLowerCase().includes("status");

                let badgeClass = "bg-purple-100 text-purple-700 border-purple-200";
                if (isReset) badgeClass = "bg-indigo-100 text-indigo-700 border-indigo-200";
                else if (isCreated) badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                else if (isStatus) badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
                else badgeClass = "bg-amber-100 text-amber-700 border-amber-200";

                return (
                  <div key={log.id} className="rounded-2xl border border-[#414E36]/15 bg-white p-4 shadow-sm hover:border-[#414E36]/30 transition space-y-3">
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E9EB] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[#1F251A] text-sm flex items-center gap-1.5">
                          <Gauge size={14} className="text-[#414E36]" /> {log.device_name}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                          {actionType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#5A6A51]">
                        <span className="font-mono text-[11px] bg-[#F7F7F9] px-2 py-0.5 rounded-md border border-[#E6E9EB]">
                          {new Date(log.date || log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Card Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-[#FBFBF9] p-2.5 rounded-xl border border-[#E6E9EB]">
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Pulses &amp; Counter</p>
                        {log.starting_pulse_count !== undefined || log.ending_pulse_count !== undefined ? (
                          <p className="font-mono text-[#1F251A]">
                            {Number(log.starting_pulse_count || 0).toLocaleString()} → <strong className="text-[#414E36]">{Number(log.ending_pulse_count || 0).toLocaleString()}</strong>
                            {log.pulses_delivered !== undefined && log.pulses_delivered > 0 && (
                              <span className="ml-1 text-[11px] text-indigo-600 font-semibold">({log.pulses_delivered.toLocaleString()} delivered)</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-[#5A6A51] italic text-[11px]">N/A or Configuration update</p>
                        )}
                      </div>

                      <div className="bg-[#FBFBF9] p-2.5 rounded-xl border border-[#E6E9EB]">
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Reason / Action Summary</p>
                        <p className="font-medium text-[#1F251A]">{log.reason || log.notes || "Routine Operation"}</p>
                      </div>

                      <div className="bg-[#FBFBF9] p-2.5 rounded-xl border border-[#E6E9EB]">
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider mb-1">Performed By</p>
                        <p className="font-semibold text-[#414E36]">{log.performed_by || "Clinic Admin"}</p>
                      </div>
                    </div>

                    {log.notes && log.notes !== log.reason && (
                      <div className="text-[11px] text-[#5A6A51] bg-[#EDF1EC]/40 p-2.5 rounded-xl border border-[#414E36]/10">
                        <strong className="text-[#414E36]">Notes:</strong> {log.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#414E36]/10 pt-4 mt-4 shrink-0 flex items-center justify-between">
          <span className="text-xs text-[#5A6A51] font-medium">
            Total Audit Log Entries: <strong>{auditLogs.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="rounded-3xl border border-[#414E36]/20 bg-[#fff] px-8 py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#f7f6f2] transition"
          >
            Close Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
}
