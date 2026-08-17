"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface MedicalReportModalProps {
  setShowMedicalReportModal: (v: boolean) => void;
  viewingCustomerProfile: any;
  adminRole: string | null;
  authenticatedJsonHeaders: { "Content-Type": string; Authorization: string };
  setMedicalReports: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function MedicalReportModal({
  setShowMedicalReportModal,
  viewingCustomerProfile,
  adminRole,
  authenticatedJsonHeaders,
  setMedicalReports,
}: MedicalReportModalProps) {
  const [savingMedicalReport, setSavingMedicalReport] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFileUrl, setReportFileUrl] = useState("");
  const [reportDoctorName, setReportDoctorName] = useState(adminRole || "");

  async function handleSaveMedicalReport() {
    if (!viewingCustomerProfile?.id || !reportTitle.trim()) {
      alert("Please enter a report title.");
      return;
    }
    setSavingMedicalReport(true);
    try {
      const payload = {
        customer_id: viewingCustomerProfile.id,
        title: reportTitle.trim(),
        description: reportDescription.trim(),
        file_url: reportFileUrl.trim(),
        doctor_name: reportDoctorName.trim() || adminRole || "Staff",
        created_at: new Date().toISOString(),
      };

      const res = await fetch("/api/medical-records", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ type: "report", data: payload }),
      });

      if (res.ok) {
        const saved = await res.json();
        if (saved.report) {
          setMedicalReports((prev) => [saved.report, ...prev]);
        } else {
          setMedicalReports((prev) => [payload, ...prev]);
        }
        setShowMedicalReportModal(false);
      } else {
        alert("Failed to save report.");
      }
    } catch (err: any) {
      console.error("Error saving report:", err);
      alert(err.message || "An error occurred while saving report.");
    } finally {
      setSavingMedicalReport(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-[#414E36]/15 space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#1F251A]">Upload Medical Report & Document</h3>
            <p className="text-xs text-[#5A6A51] mt-0.5">Attach lab results, scan reports, or external clinical documents</p>
          </div>
          <button
            type="button"
            onClick={() => setShowMedicalReportModal(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Report Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g. Complete Blood Count & Hormonal Panel"
              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Description / Notes</label>
            <textarea
              rows={3}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Key clinical findings or doctor observations..."
              className="w-full rounded-xl border border-[#414E36]/15 bg-white p-3 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Document Link / File URL</label>
            <input
              type="url"
              value={reportFileUrl}
              onChange={(e) => setReportFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Recording Staff / Doctor Name</label>
            <input
              type="text"
              value={reportDoctorName}
              onChange={(e) => setReportDoctorName(e.target.value)}
              placeholder="e.g. Dr. Sarah Al-Sayed"
              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#414E36]/10">
          <button
            type="button"
            onClick={() => setShowMedicalReportModal(false)}
            className="rounded-xl border border-[#414E36]/15 px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveMedicalReport}
            disabled={savingMedicalReport || !reportTitle.trim()}
            className="rounded-xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
          >
            {savingMedicalReport ? "Uploading..." : "Save Medical Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
