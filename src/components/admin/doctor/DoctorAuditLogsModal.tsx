"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface DoctorAuditLogsModalProps {
  onClose: () => void;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  lang: "en" | "ar";
  t: typeof adminTranslations["en"]["doctors"]["doctorAuditLogsModal"];
}

export default function DoctorAuditLogsModal({
  onClose,
  authenticatedJsonHeaders,
  lang,
  t,
}: DoctorAuditLogsModalProps) {
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  useEffect(() => {
    setLoadingAuditLogs(true);
    fetch("/api/providers/schedule-audit-logs", { headers: authenticatedJsonHeaders })
      .then((res) => res.json())
      .then((data) => {
        setAuditLogsList(data || []);
      })
      .catch((err) => console.error("fetchAuditLogs error:", err))
      .finally(() => setLoadingAuditLogs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
      <div className="w-full max-w-4xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4 shrink-0">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">{t.headerLabel}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">{t.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pe-1 custom-scrollbar">
          {loadingAuditLogs ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#414E36] border-t-transparent" />
              <p className="text-xs text-[#5A6A51] font-semibold">{t.loadingText}</p>
            </div>
          ) : auditLogsList.length === 0 ? (
            <div className="text-center py-20 text-[#5A6A51] italic text-sm">
              {t.noLogsFound}
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogsList.map((log) => {
                const formatSchedPreview = (sched: any) => {
                  if (!sched) return <span className="text-gray-400 italic">{t.noneLabel}</span>;
                  if (sched.in_person || sched.online) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono leading-relaxed mt-2">
                        {sched.in_person && (
                          <div className="rounded-xl bg-white border border-[#414E36]/10 p-3">
                            <p className="font-bold text-[#414E36] border-b pb-1 mb-1 text-[10px] uppercase">{t.inClinicSchedule}</p>
                            {Object.entries(sched.in_person).map(([d, config]: any) => (
                              config.isOpen && <div key={d}>{d}: {config.start} - {config.end}</div>
                            ))}
                          </div>
                        )}
                        {sched.online && (
                          <div className="rounded-xl bg-white border border-[#414E36]/10 p-3">
                            <p className="font-bold text-[#414E36] border-b pb-1 mb-1 text-[10px] uppercase">{t.onlineSchedule}</p>
                            {Object.entries(sched.online).map(([d, config]: any) => (
                              config.isOpen && <div key={d}>{d}: {config.start} - {config.end}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-xl bg-white border border-[#414E36]/10 p-3 text-[11px] font-mono leading-relaxed mt-1">
                      {Object.entries(sched).map(([d, config]: any) => (
                        config.isOpen && <div key={d}>{d}: {config.start} - {config.end}</div>
                      ))}
                    </div>
                  );
                };

                return (
                  <div key={log.id} className="rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC]/40 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[#414E36]/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1F251A] text-sm">{log.provider_name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          log.action === "create_schedule"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}>
                          {log.action === "create_schedule" ? t.createdBadge : t.updatedBadge}
                        </span>
                      </div>
                      <div className="text-gray-500 text-[11px]">
                        {new Date(log.created_at).toLocaleString("en-GB")}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{t.previousSchedule}</p>
                        <div className="mt-1">{formatSchedPreview(log.previous_schedule)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider">{t.newSchedule}</p>
                        <div className="mt-1">{formatSchedPreview(log.new_schedule)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-[#5A6A51] border-t border-[#414E36]/5 pt-2">
                      <span>{t.changedByLabel} <strong className="text-[#414E36]">{log.changed_by}</strong></span>
                      <span className="opacity-60 font-mono">ID: {log.id.slice(0, 8)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#414E36]/10 pt-4 mt-4 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-3xl border border-[#414E36]/20 bg-[#fff] px-8 py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] transition"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
