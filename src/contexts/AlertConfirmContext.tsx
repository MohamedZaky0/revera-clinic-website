"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, HelpCircle, Info, Trash2, Archive, AlertTriangle, ShieldAlert } from "lucide-react";

type DeleteChoice = "soft" | "hard" | false;

type DeleteConfirmOptions = {
  title?: string;
  message?: string;
  itemName?: string;
  itemType?: string;
  isSuperAdmin?: boolean;
};

type AlertConfirmContextType = {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showDeleteConfirm: (options: DeleteConfirmOptions | string) => Promise<DeleteChoice>;
};

const AlertConfirmContext = createContext<AlertConfirmContextType | undefined>(undefined);

export function useAlertConfirm() {
  const context = useContext(AlertConfirmContext);
  if (!context) {
    throw new Error("useAlertConfirm must be used within an AlertConfirmProvider");
  }
  return context;
}

export function AlertConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<{
    open: boolean;
    type: "alert" | "confirm" | "delete";
    title: string;
    message: string;
    itemName?: string;
    itemType?: string;
    isSuperAdmin?: boolean;
    resolve: ((value: any) => void) | null;
  }>({
    open: false,
    type: "alert",
    title: "",
    message: "",
    resolve: null,
  });

  const showAlert = useCallback((message: string, title = "Alert") => {
    setModal({
      open: true,
      type: "alert",
      title,
      message,
      resolve: null,
    });
  }, []);

  const showConfirm = useCallback((message: string, title = "Confirm Action") => {
    return new Promise<boolean>((resolve) => {
      setModal({
        open: true,
        type: "confirm",
        title,
        message,
        resolve,
      });
    });
  }, []);

  const showDeleteConfirm = useCallback((options: DeleteConfirmOptions | string) => {
    const opts: DeleteConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise<DeleteChoice>((resolve) => {
      setModal({
        open: true,
        type: "delete",
        title: opts.title || "Delete Confirmation",
        message: opts.message || "",
        itemName: opts.itemName,
        itemType: opts.itemType,
        isSuperAdmin: opts.isSuperAdmin ?? true,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((value: any) => {
    if (modal.resolve) {
      modal.resolve(value);
    }
    setModal(prev => ({ ...prev, open: false, resolve: null }));
  }, [modal]);

  // Hook into global window alert for simple alerts
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.alert = (msg) => {
        showAlert(String(msg), "System Notification");
      };
    }
  }, [showAlert]);

  return (
    <AlertConfirmContext.Provider value={{ showAlert, showConfirm, showDeleteConfirm }}>
      {children}
      
      {modal.open && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}>
          <style>{`
            @keyframes alertConfirmFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .alert-confirm-backdrop {
              animation: alertConfirmFadeIn 0.15s ease-out forwards;
            }
            .alert-confirm-card {
              animation: alertConfirmFadeIn 0.15s ease-out forwards;
            }
          `}</style>
          
          {/* Backdrop (Sibling layer, simple dark tint without blur to prevent rendering bugs) */}
          <div 
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            className="alert-confirm-backdrop" 
            onClick={() => handleClose(false)} 
          />
          
            {/* Modal Card (Pure inline styles, no transforms or filters to ensure 100% crisp fonts) */}
          <div 
            style={{
              position: "relative",
              width: "100%",
              maxWidth: modal.type === "delete" && modal.isSuperAdmin ? "34rem" : "28rem",
              borderRadius: "1.25rem",
              backgroundColor: "#ffffff",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              border: "1px solid rgba(65, 78, 54, 0.1)",
              display: "flex",
              flexDirection: "column",
              textAlign: "left",
            }}
            className="alert-confirm-card"
          >
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#414E36]/10 pb-4 mb-4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  modal.type === 'delete'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : modal.type === 'confirm'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10'
                }`} style={{ display: "flex", width: "2.5rem", height: "2.5rem", borderRadius: "9999px", alignItems: "center", justifyContent: "center" }}>
                  {modal.type === 'delete' ? <Trash2 size={20} /> : modal.type === 'confirm' ? <HelpCircle size={20} /> : <Info size={20} />}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#1F251A]" style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#1F251A" }}>{modal.title}</h3>
                </div>
              </div>
              <button
                onClick={() => handleClose(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            {modal.type === "delete" && modal.isSuperAdmin ? (
              <div className="space-y-4 mb-4">
                {modal.message ? (
                  <p className="text-xs text-[#5A6A51] leading-relaxed">
                    {modal.message}
                  </p>
                ) : (
                  <p className="text-xs text-[#5A6A51] leading-relaxed">
                    As a <strong>Super Admin</strong>, please select the deletion mode for {modal.itemName ? <span className="font-bold text-[#1F251A]">"{modal.itemName}"</span> : "this item"}:
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {/* Option 1: Soft Delete */}
                  <button
                    type="button"
                    onClick={() => handleClose("soft")}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-emerald-600/30 bg-emerald-50/50 hover:bg-emerald-50 text-start transition cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                      <Archive size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-emerald-950">Soft Delete (Deactivate / Archive)</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">Recommended</span>
                      </div>
                      <p className="text-[11px] text-emerald-900/80 mt-1 leading-relaxed">
                        Deactivates and hides this record from active operations while safely preserving all historical appointments, invoices, financial ledger records, and audit history.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Hard Delete */}
                  <button
                    type="button"
                    onClick={() => handleClose("hard")}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-start transition cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-rose-950">Hard Delete (Permanent Removal)</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200/70 text-rose-900 px-2 py-0.5 rounded-full">Irreversible</span>
                      </div>
                      <p className="text-[11px] text-rose-900/80 mt-1 leading-relaxed">
                        Permanently deletes this record directly from the database. Linked records will be cleaned or unlinked.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 py-2 text-sm text-[#5A6A51] leading-relaxed mb-6 whitespace-pre-line" style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#5A6A51", marginBottom: "1.5rem", marginTop: "0.5rem" }}>
                {modal.message}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-4" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid rgba(65, 78, 54, 0.1)", paddingTop: "1rem" }}>
              {modal.type === "delete" ? (
                modal.isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#f7f6f2] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleClose(false)}
                      className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#f7f6f2] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClose("hard")}
                      className="rounded-3xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-md cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                  </>
                )
              ) : modal.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#f7f6f2] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className="rounded-3xl bg-[#414E36] px-5 py-2.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md cursor-pointer"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className="rounded-3xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </AlertConfirmContext.Provider>
  );
}
