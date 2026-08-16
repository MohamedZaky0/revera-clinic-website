"use client";

import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "@/components/admin/doctor/utils";
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Info,
  ExternalLink
} from "lucide-react";

export interface TermItem {
  id: string;
  sort_order: number;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  link_text_en?: string;
  link_text_ar?: string;
  link_url?: string;
  is_active: boolean;
}

interface TermsManagerViewProps {
  termsText: string;
  setTermsText: (val: string) => void;
  handleSaveBookingSettings: () => Promise<void>;
  savingBookingSettings: boolean;
}

const DEFAULT_TERMS_SEED = [
  {
    sort_order: 1,
    title_en: "Acceptance of Terms",
    title_ar: "قبول الشروط",
    content_en: "By using Revera Clinic's website or services, you agree to be bound by these Terms & Conditions and all applicable laws and regulations.",
    content_ar: "باستخدامك لموقع أو خدمات عيادة ريفيرا، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها.",
    is_active: true
  },
  {
    sort_order: 2,
    title_en: "Use of Services",
    title_ar: "استخدام الخدمات",
    content_en: "You agree to use our services only for lawful purposes and in accordance with our policies. You must provide accurate and complete information when booking or registering.",
    content_ar: "تتوافق على استخدام خدماتنا فقط لأغراض قانونية ووفقاً لسياساتنا. يجب عليك تقديم معلومات دقيقة وكاملة عند الحجز أو التسجيل.",
    is_active: true
  },
  {
    sort_order: 3,
    title_en: "Appointments & Bookings",
    title_ar: "المواعيد والحجوزات",
    content_en: "All appointments are subject to availability and confirmation. Please arrive on time. Late arrivals may result in shortened or rescheduled appointments.",
    content_ar: "جميع المواعيد تخضع للتوافر والتأكيد. يرجى الحضور في الموعد المحدد. قد يؤدي التأخير إلى تقصير مدة الجلسة أو إعادة جدولتها.",
    is_active: true
  },
  {
    sort_order: 4,
    title_en: "Cancellations & Rescheduling",
    title_ar: "الإلغاء وإعادة الجدولة",
    content_en: "You can cancel or reschedule your appointment through our website or by contacting us. Please review our cancellation policy for more details.",
    content_ar: "يمكنك إلغاء أو إعادة جدولة موعدك من خلال موقعنا أو بالاتصال بنا. يرجى مراجعة سياسة الإلغاء الخاصة بنا للمزيد من التفاصيل.",
    link_text_en: "cancellation policy",
    link_text_ar: "سياسة الإلغاء",
    link_url: "/terms#cancellation",
    is_active: true
  },
  {
    sort_order: 5,
    title_en: "Payments & Refunds",
    title_ar: "المدفوعات واسترداد الأموال",
    content_en: "Certain services may require advance payment. Refund eligibility depends on our refund policy. We accept payments through the methods displayed at checkout.",
    content_ar: "قد تتطلب بعض الخدمات الدفع المسبق. تعتمد أهليّة الاسترداد على سياسة الاسترداد الخاصة بنا. نقبل الدفع عبر الطرق الموضحة عند الدفع.",
    link_text_en: "refund policy",
    link_text_ar: "سياسة الاسترداد",
    link_url: "/terms#refund",
    is_active: true
  }
];

export default function TermsManagerView({
  termsText,
  setTermsText,
  handleSaveBookingSettings,
  savingBookingSettings
}: TermsManagerViewProps) {
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingOrder, setSavingOrder] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<TermItem | null>(null);
  const [submittingForm, setSubmittingForm] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    title_en: "",
    title_ar: "",
    content_en: "",
    content_ar: "",
    link_text_en: "",
    link_text_ar: "",
    link_url: "",
    is_active: true
  });

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terms");
      if (res.ok) {
        const data = await res.json();
        setTerms(data.terms || []);
      }
    } catch (e) {
      console.error("Failed to load terms:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      title_en: "",
      title_ar: "",
      content_en: "",
      content_ar: "",
      link_text_en: "",
      link_text_ar: "",
      link_url: "",
      is_active: true
    });
    setModalMode("add");
  };

  const handleOpenEditModal = (item: TermItem) => {
    setEditingItem(item);
    setFormData({
      title_en: item.title_en || "",
      title_ar: item.title_ar || "",
      content_en: item.content_en || "",
      content_ar: item.content_ar || "",
      link_text_en: item.link_text_en || "",
      link_text_ar: item.link_text_ar || "",
      link_url: item.link_url || "",
      is_active: item.is_active !== false
    });
    setModalMode("edit");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setEditingItem(null);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title_en || !formData.content_en) {
      alert("Title (EN) and Content (EN) are required.");
      return;
    }

    setSubmittingForm(true);
    try {
      if (modalMode === "add") {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/terms", {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...formData,
            sort_order: terms.length + 1
          })
        });
        if (!res.ok) throw new Error("Failed to add terms item");
      } else if (modalMode === "edit" && editingItem) {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/terms", {
          method: "PUT",
          headers,
          body: JSON.stringify({
            id: editingItem.id,
            ...formData
          })
        });
        if (!res.ok) throw new Error("Failed to update terms item");
      }
      handleCloseModal();
      await fetchTerms();
    } catch (err: any) {
      console.error("Error saving terms item:", err);
      alert(err.message || "Failed to save terms item");
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/terms?id=${id}`, { method: "DELETE", headers });
      if (res.ok) {
        setTerms((prev) => prev.filter((t) => t.id !== id));
      } else {
        alert("Failed to delete terms item.");
      }
    } catch (e) {
      console.error("Failed to delete item:", e);
      alert("Error deleting terms item.");
    }
  };

  const handleToggleActive = async (item: TermItem) => {
    const newStatus = !item.is_active;
    setTerms((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, is_active: newStatus } : t))
    );

    try {
      const headers = await getAuthHeaders();
      await fetch("/api/terms", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: item.id, is_active: newStatus })
      });
    } catch (e) {
      console.error("Failed to toggle status:", e);
      fetchTerms();
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === terms.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...terms];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Update sort_order numbers
    const reordered = updated.map((item, idx) => ({
      ...item,
      sort_order: idx + 1
    }));

    setTerms(reordered);
    setSavingOrder(true);

    try {
      const payload = reordered.map((item) => ({
        id: item.id,
        sort_order: item.sort_order
      }));

      const headers = await getAuthHeaders();
      await fetch("/api/terms", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Failed to persist order:", e);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm("Populate standard clinic terms default entries into database?")) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      for (const item of DEFAULT_TERMS_SEED) {
        await fetch("/api/terms", {
          method: "POST",
          headers,
          body: JSON.stringify(item)
        });
      }
      await fetchTerms();
    } catch (e) {
      console.error("Failed to seed default terms:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">Terms & Conditions Settings</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">
            Create, edit, and reorder clinic terms items displayed to patients on the website and checkout modal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] shadow-md cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Terms Item</span>
          </button>
        </div>
      </div>

      {/* Main Section */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#1F251A]">Structured Terms & Conditions List</h3>
            <p className="text-xs text-[#5A6A51] mt-1">
              Use the Up / Down arrows to sort the order of appearance.
            </p>
          </div>
          {savingOrder && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#414E36] bg-[#EDF1EC] px-3 py-1 rounded-full animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              <span>Saving order…</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[#5A6A51]">
            Loading Terms & Conditions...
          </div>
        ) : terms.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-[#414E36]/20 bg-[#FBFBF9] p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF1EC] text-[#414E36]">
              <FileText size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1F251A]">No Terms Items Configured</h4>
              <p className="text-xs text-[#5A6A51] mt-1">
                You haven't added any structured terms items yet. You can add items manually or seed default clinic terms.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleSeedDefaults}
                className="flex items-center gap-2 rounded-2xl bg-[#C4AE7C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#b09b6a] shadow-sm cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Populate Default Terms</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26] shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>Add First Item</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {terms.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === terms.length - 1;

              return (
                <div
                  key={item.id || index}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border p-5 transition ${
                    item.is_active
                      ? "border-[#414E36]/15 bg-[#FBFBF9] hover:border-[#414E36]/30"
                      : "border-gray-200 bg-gray-50/70 opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3.5 w-full sm:w-auto">
                    {/* Sort Order Number Badge */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#414E36] text-[#FBFBF9] font-bold text-xs shadow-xs">
                      {index + 1}
                    </div>

                    {/* Content Preview */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[#1F251A]">
                          {item.title_en}
                        </h4>
                        {item.title_ar && (
                          <span className="text-xs font-semibold text-[#5A6A51] bg-[#EDF1EC] px-2 py-0.5 rounded-full" dir="rtl">
                            {item.title_ar}
                          </span>
                        )}
                        {!item.is_active && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5A6A51] line-clamp-2 max-w-2xl leading-relaxed">
                        {item.content_en}
                      </p>
                      {item.link_url && (
                        <div className="flex items-center gap-1 text-[11px] text-[#414E36] font-medium pt-0.5">
                          <ExternalLink size={11} />
                          <span>Link: {item.link_text_en || item.link_url}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {/* Reorder Buttons */}
                    <div className="flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-2xs mr-2">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMove(index, "up")}
                        className="rounded-xl p-1.5 text-gray-500 hover:bg-[#EDF1EC] hover:text-[#414E36] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMove(index, "down")}
                        className="rounded-xl p-1.5 text-gray-500 hover:bg-[#EDF1EC] hover:text-[#414E36] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    {/* Active Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`rounded-2xl p-2.5 transition cursor-pointer ${
                        item.is_active
                          ? "bg-[#EDF1EC] text-[#414E36] hover:bg-[#dbe4da]"
                          : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                      }`}
                      title={item.is_active ? "Set Inactive" : "Set Active"}
                    >
                      {item.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="rounded-2xl bg-[#F4F6F4] p-2.5 text-[#414E36] transition hover:bg-[#414E36] hover:text-white cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, item.title_en)}
                      className="rounded-2xl bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-600 hover:text-white cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legacy Fallback Text Editor Accordion */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-4 max-w-4xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#1F251A]">Checkout Gate Fallback Text</h3>
            <p className="text-xs text-[#5A6A51] mt-0.5">
              This text is displayed on the Step 4 reservation checkout gate checkbox.
            </p>
          </div>
          <button
            onClick={handleSaveBookingSettings}
            disabled={savingBookingSettings}
            className="rounded-2xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {savingBookingSettings ? "Saving…" : "Save Fallback Text"}
          </button>
        </div>

        <textarea
          rows={5}
          value={termsText}
          onChange={(e) => setTermsText(e.target.value)}
          placeholder="By proceeding with this booking, you agree to our terms and conditions..."
          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] leading-relaxed font-mono"
        />
      </div>

      {/* Add / Edit Terms Item Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-200 text-[#1F251A] max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-2xl font-bold text-[#1F251A] mb-1">
              {modalMode === "add" ? "Add Terms & Conditions Item" : "Edit Terms Item"}
            </h3>
            <p className="text-xs text-[#5A6A51] mb-6">
              Enter English and Arabic titles and content for this terms section.
            </p>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5 uppercase tracking-wider">
                    Title (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder="e.g. Acceptance of Terms"
                    className="w-full rounded-2xl border border-gray-300 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none focus:border-[#414E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5 uppercase tracking-wider">
                    Title (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    placeholder="مثال: قبول الشروط"
                    className="w-full rounded-2xl border border-gray-300 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none focus:border-[#414E36]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5 uppercase tracking-wider">
                  Content (English) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.content_en}
                  onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                  placeholder="Describe this condition in English..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none focus:border-[#414E36] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] mb-1.5 uppercase tracking-wider">
                  Content (Arabic)
                </label>
                <textarea
                  rows={4}
                  dir="rtl"
                  value={formData.content_ar}
                  onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                  placeholder="اكتب تفاصيل الشرط باللغة العربية..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none focus:border-[#414E36] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase">
                    Link Text (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.link_text_en}
                    onChange={(e) => setFormData({ ...formData, link_text_en: e.target.value })}
                    placeholder="cancellation policy"
                    className="w-full rounded-xl border border-gray-300 bg-[#FBFBF9] px-3 py-2 text-xs outline-none focus:border-[#414E36]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase">
                    Link Text (AR)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.link_text_ar}
                    onChange={(e) => setFormData({ ...formData, link_text_ar: e.target.value })}
                    placeholder="سياسة الإلغاء"
                    className="w-full rounded-xl border border-gray-300 bg-[#FBFBF9] px-3 py-2 text-xs outline-none focus:border-[#414E36]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5A6A51] mb-1 uppercase">
                    Link Target URL
                  </label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="/terms#cancellation"
                    className="w-full rounded-xl border border-gray-300 bg-[#FBFBF9] px-3 py-2 text-xs outline-none focus:border-[#414E36]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#1F251A]">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="accent-[#414E36] w-4 h-4 cursor-pointer"
                  />
                  <span>Active & Visible to Public</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-2xl border border-gray-300 px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#2e3a26] transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {submittingForm ? "Saving…" : modalMode === "add" ? "Add Item" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
