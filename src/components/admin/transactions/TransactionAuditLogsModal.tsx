"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Clock, User, FileText, Loader2, ArrowRight } from "lucide-react";
import { TransactionAuditLog } from "./types";
import { getAuthHeaders } from "@/lib/authHeaders";

interface TransactionAuditLogsModalProps {
  onClose: () => void;
  lang?: "en" | "ar";
}

export const TransactionAuditLogsModal: React.FC<TransactionAuditLogsModalProps> = ({
  onClose,
  lang = "en",
}) => {
  const [logs, setLogs] = useState<TransactionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await fetch("/api/transactions/audit-logs?limit=50", { headers });
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#414E36]/10 text-[#414E36] flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1F251A]">
                Financial Audit Logs
              </h3>
              <p className="text-xs text-gray-500">
                Immutable audit trail of all manual and automated financial events
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Logs Content List */}
        <div className="flex-1 overflow-y-auto space-y-3 pe-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <p className="text-xs">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-xs">
              No audit logs recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl border border-gray-100 bg-[#F9F9F7] hover:bg-[#F4F4F0] transition-colors flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 capitalize">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    {log.details?.transaction_type && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                        {log.details.transaction_type.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {log.details?.customer_name && (
                    <p className="text-gray-600 text-[11px]">
                      Patient: <strong className="text-gray-800">{log.details.customer_name}</strong>
                      {log.details.amount && ` | Amount: EGP ${Math.abs(Number(log.details.amount)).toLocaleString()}`}
                    </p>
                  )}
                  {log.details?.description && (
                    <p className="text-gray-500 text-[11px] italic">
                      "{log.details.description}"
                    </p>
                  )}
                </div>

                <div className="text-end shrink-0 space-y-1 text-[11px] text-gray-400">
                  <div className="flex items-center gap-1 text-gray-600 font-semibold justify-end">
                    <User size={11} />
                    <span>{log.performed_by_name || "System"}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock size={11} />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
