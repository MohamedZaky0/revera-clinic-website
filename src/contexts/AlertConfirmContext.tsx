"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, HelpCircle, Info } from "lucide-react";

type AlertConfirmContextType = {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
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
    type: "alert" | "confirm";
    title: string;
    message: string;
    resolve: ((value: boolean) => void) | null;
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

  const handleClose = useCallback((value: boolean) => {
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
    <AlertConfirmContext.Provider value={{ showAlert, showConfirm }}>
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
              maxWidth: "28rem",
              borderRadius: "1rem",
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
                  modal.type === 'confirm' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10'
                }`} style={{ display: "flex", width: "2.5rem", height: "2.5rem", borderRadius: "9999px", alignItems: "center", justifyContent: "center" }}>
                  {modal.type === 'confirm' ? <HelpCircle size={20} /> : <Info size={20} />}
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
            <div className="flex-1 py-2 text-sm text-[#5A6A51] leading-relaxed mb-6 whitespace-pre-line" style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#5A6A51", marginBottom: "1.5rem", marginTop: "0.5rem" }}>
              {modal.message}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-4" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid rgba(65, 78, 54, 0.1)", paddingTop: "1rem" }}>
              {modal.type === "confirm" ? (
                <>
                  <button
                    onClick={() => handleClose(false)}
                    className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#f7f6f2] transition"
                    style={{ borderRadius: "1.5rem", padding: "0.625rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, border: "1px solid rgba(65, 78, 54, 0.15)", backgroundColor: "#FBFBF9", color: "#414E36", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleClose(true)}
                    className="rounded-3xl bg-[#414E36] px-5 py-2.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md"
                    style={{ borderRadius: "1.5rem", padding: "0.625rem 1.25rem", fontSize: "0.75rem", fontWeight: 600, border: "none", backgroundColor: "#414E36", color: "#FBFBF9", cursor: "pointer" }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleClose(true)}
                  className="rounded-3xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md"
                  style={{ borderRadius: "1.5rem", padding: "0.625rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, border: "none", backgroundColor: "#414E36", color: "#FBFBF9", cursor: "pointer" }}
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
