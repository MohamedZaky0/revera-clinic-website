"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  Check,
  X,
  Layers,
  HelpCircle,
  Loader2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Tag
} from "lucide-react";
import { MedicalRecordTemplate, IntakeField } from "@/app/api/medical-records/templates/route";
import { SERVICES } from "@/lib/services";
import { supabase } from "@/lib/supabaseClient";

interface MedicalRecordsSettingsViewProps {
  services?: any[];
  lang?: "en" | "ar";
  authenticatedJsonHeaders?: Record<string, string>;
}

export default function MedicalRecordsSettingsView({
  services: initialServices = [],
  lang = "en",
  authenticatedJsonHeaders
}: MedicalRecordsSettingsViewProps) {
  const [allServices, setAllServices] = useState<any[]>(
    initialServices.length > 0 ? initialServices : SERVICES
  );
  const [templates, setTemplates] = useState<MedicalRecordTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getAuthHeaders = async () => {
    let token = "";
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || "";
    } catch {}
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(authenticatedJsonHeaders || {})
    };
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/services", { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.services) && data.services.length > 0) {
            setAllServices(data.services);
          }
        }
      } catch (err) {
        console.warn("Using fallback SERVICES catalog");
      }
    };
    loadServices();
  }, []);

  // Template Modal Form state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalIsDefault, setModalIsDefault] = useState(false);
  const [modalServiceIds, setModalServiceIds] = useState<(string | number)[]>([]);
  const [modalFields, setModalFields] = useState<IntakeField[]>([]);
  const [saving, setSaving] = useState(false);

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/medical-records/templates", { headers });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to load medical record templates.");
      }
    } catch (err: any) {
      console.error("Error loading templates:", err);
      setErrorMsg(err.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setModalTitle("");
    setModalDescription("");
    setModalIsDefault(templates.length === 0);
    setModalServiceIds([]);
    setModalFields([
      { id: "field_1", label: "Skin Type / Medical Assessment", type: "select", options: ["Normal", "Dry", "Oily", "Sensitive", "Combination"], required: true },
      { id: "field_2", label: "Known Allergies & Contraindications", type: "text", placeholder: "e.g. None or list allergies...", required: false },
      { id: "field_3", label: "Current Daily Medications", type: "text", placeholder: "e.g. None...", required: false }
    ]);
    setShowModal(true);
  };

  const openEditModal = (tmpl: MedicalRecordTemplate) => {
    setEditingTemplateId(tmpl.id);
    setModalTitle(tmpl.title);
    setModalDescription(tmpl.description || "");
    setModalIsDefault(Boolean(tmpl.is_default));
    setModalServiceIds(Array.isArray(tmpl.service_ids) ? [...tmpl.service_ids] : []);
    setModalFields(Array.isArray(tmpl.fields) ? JSON.parse(JSON.stringify(tmpl.fields)) : []);
    setShowModal(true);
  };

  const handleDuplicateTemplate = (tmpl: MedicalRecordTemplate) => {
    setEditingTemplateId(null);
    setModalTitle(`${tmpl.title} (Copy)`);
    setModalDescription(tmpl.description || "");
    setModalIsDefault(false);
    setModalServiceIds([]);
    setModalFields(Array.isArray(tmpl.fields) ? JSON.parse(JSON.stringify(tmpl.fields)) : []);
    setShowModal(true);
  };

  const handleDeleteTemplate = async (id: string, isDefault?: boolean) => {
    if (isDefault && templates.length > 1) {
      alert("Cannot delete the default intake template. Please assign another template as default first.");
      return;
    }
    if (!confirm("Are you sure you want to delete this medical record template?")) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/medical-records/templates?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => String(t.id) !== String(id)));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete template.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete template.");
    }
  };

  // Field manipulation helpers
  const handleAddField = () => {
    const newField: IntakeField = {
      id: `field_${Date.now()}`,
      label: "New Clinical Question",
      type: "text",
      placeholder: "",
      required: false
    };
    setModalFields([...modalFields, newField]);
  };

  const handleRemoveField = (idx: number) => {
    setModalFields(modalFields.filter((_, i) => i !== idx));
  };

  const handleUpdateField = (idx: number, patch: Partial<IntakeField>) => {
    setModalFields(
      modalFields.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  };

  const handleMoveField = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === modalFields.length - 1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const next = [...modalFields];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setModalFields(next);
  };

  // Service toggle helpers
  const handleToggleService = (sId: string | number) => {
    setModalServiceIds((prev) => {
      const exists = prev.some((id) => String(id) === String(sId));
      if (exists) {
        return prev.filter((id) => String(id) !== String(sId));
      } else {
        return [...prev, sId];
      }
    });
  };

  const handleSelectAllFilteredServices = (filteredIds: (string | number)[]) => {
    setModalServiceIds((prev) => {
      const set = new Set([...prev.map(String), ...filteredIds.map(String)]);
      return Array.from(set);
    });
  };

  const handleClearAllServices = () => {
    setModalServiceIds([]);
  };

  // Save handler (POST / PUT)
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      alert("Please enter a template title.");
      return;
    }

    if (modalFields.length === 0) {
      alert("Please add at least one intake field to the template.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingTemplateId || undefined,
        title: modalTitle.trim(),
        description: modalDescription.trim(),
        is_default: modalIsDefault,
        service_ids: modalServiceIds,
        fields: modalFields
      };

      const method = editingTemplateId ? "PUT" : "POST";
      const headers = await getAuthHeaders();
      const res = await fetch("/api/medical-records/templates", {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchTemplates();
        setShowModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save template.");
      }
    } catch (err: any) {
      console.error("Save template error:", err);
      alert(err.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [templates, searchQuery]);

  const filteredModalServices = useMemo(() => {
    if (!serviceSearch.trim()) return allServices;
    const q = serviceSearch.toLowerCase();
    return allServices.filter(
      (s: any) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.title_en && s.title_en.toLowerCase().includes(q)) ||
        (s.name_en && s.name_en.toLowerCase().includes(q)) ||
        (s.en && s.en.toLowerCase().includes(q)) ||
        (s.ar && s.ar.toLowerCase().includes(q))
    );
  }, [allServices, serviceSearch]);

  const getServiceName = (s: any) => {
    return s.title_en || s.name_en || s.title || s.name || s.en || `Service #${s.id}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#414E36] text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1F251A]">Medical Records Intake Templates</h2>
              <p className="text-xs text-[#5A6A51] font-medium mt-0.5">
                Customize clinical questionnaires and assign intake forms to one or more services.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#414E36] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#323D2A] shadow-sm cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Create Intake Template</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white p-5 border border-[#414E36]/10 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider block">Intake Templates</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[#1F251A]">{templates.length}</span>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers size={16} />
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-[#414E36]/10 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider block">Default Template</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-[#414E36] truncate max-w-[200px]">
              {templates.find((t) => t.is_default)?.title || "General Intake"}
            </span>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-[#414E36]/10 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider block">Assigned Services</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[#1F251A]">
              {templates.reduce((acc, t) => acc + (t.service_ids?.length || 0), 0)} Services
            </span>
            <span className="h-8 w-8 rounded-xl bg-[#EDF1EC] text-[#414E36] flex items-center justify-center">
              <Tag size={16} />
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates by title or keywords..."
          className="w-full rounded-2xl border border-[#414E36]/15 bg-white ps-11 pe-4 py-3 text-xs font-semibold text-[#1F251A] outline-none focus:border-emerald-700 shadow-xs"
        />
        <Search size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
      </div>

      {/* Templates List Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#414E36]/10 p-12 text-center text-sm text-[#5A6A51] flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-[#414E36]" /> Loading medical record templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#414E36]/10 p-12 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-[#EDF1EC] text-[#414E36] flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-[#1F251A]">No intake templates found</h4>
            <p className="text-xs text-[#5A6A51] max-w-sm mx-auto">
              Create customizable medical record intake forms tailored to specific treatments and procedures.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#323D2A] transition"
          >
            <Plus size={14} /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredTemplates.map((tmpl) => {
            const assignedServices = allServices.filter((s) =>
              Array.isArray(tmpl.service_ids) && tmpl.service_ids.some((id) => String(id) === String(s.id))
            );

            return (
              <div
                key={tmpl.id}
                className="bg-white rounded-3xl border border-[#414E36]/12 p-6 shadow-xs space-y-4 flex flex-col justify-between hover:border-[#414E36]/25 transition"
              >
                <div className="space-y-3.5">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-[#1F251A]">{tmpl.title}</h3>
                        {tmpl.is_default && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Default Template
                          </span>
                        )}
                      </div>
                      {tmpl.description && (
                        <p className="text-xs text-[#5A6A51] leading-relaxed line-clamp-2">{tmpl.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicateTemplate(tmpl)}
                        className="p-2 text-gray-400 hover:text-[#414E36] hover:bg-[#EDF1EC] rounded-xl transition"
                        title="Duplicate Template"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(tmpl)}
                        className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                        title="Edit Template"
                      >
                        <Edit2 size={15} />
                      </button>
                      {!tmpl.is_default && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.is_default)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Delete Template"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Assigned Services Badges */}
                  <div className="bg-[#FBFBF9] p-3.5 rounded-2xl border border-[#414E36]/8 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#5A6A51] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Tag size={12} className="text-[#414E36]" /> Assigned Services ({assignedServices.length})
                      </span>
                      {tmpl.is_default && (
                        <span className="text-[10px] font-semibold text-emerald-700 italic">
                          + Applies to all unassigned services
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
                      {assignedServices.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">
                          {tmpl.is_default ? "Applies to all services as clinic fallback" : "No specific services assigned yet"}
                        </span>
                      ) : (
                        assignedServices.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#1F251A] border border-[#414E36]/10 shadow-2xs"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            {getServiceName(s)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Intake Fields Summary */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider block">
                      Intake Questions & Fields ({tmpl.fields?.length || 0})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(tmpl.fields || []).slice(0, 4).map((f) => (
                        <div
                          key={f.id}
                          className="bg-[#EDF1EC]/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#1F251A] flex items-center justify-between truncate"
                        >
                          <span className="truncate">{f.label}</span>
                          <span className="text-[10px] font-bold text-[#5A6A51] uppercase bg-white px-1.5 py-0.5 rounded ml-1 shrink-0">
                            {f.type}
                          </span>
                        </div>
                      ))}
                      {(tmpl.fields || []).length > 4 && (
                        <div className="bg-[#F4F5F1] px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#5A6A51] flex items-center justify-center">
                          +{(tmpl.fields?.length || 0) - 4} more fields
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#414E36]/8 flex items-center justify-between text-xs text-[#5A6A51]">
                  <span>Updated {tmpl.updated_at ? new Date(tmpl.updated_at).toLocaleDateString() : "Recently"}</span>
                  <button
                    type="button"
                    onClick={() => openEditModal(tmpl)}
                    className="font-extrabold text-[#414E36] hover:underline"
                  >
                    Configure Questions & Services →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT TEMPLATE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-[#414E36]/15 space-y-6 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#414E36] text-white flex items-center justify-center shadow-sm">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1F251A]">
                    {editingTemplateId ? "Edit Medical Intake Template" : "Create Medical Intake Template"}
                  </h3>
                  <p className="text-xs text-[#5A6A51]">
                    Customize the intake questions and select the treatments this intake applies to.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form id="templateForm" onSubmit={handleSaveTemplate} className="overflow-y-auto pe-1 space-y-6 flex-1">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1F251A]">
                    Template Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Laser Hair Removal Intake Form"
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 text-xs font-bold text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1F251A]">
                    Default Fallback Template
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="isDefaultCheckbox"
                      checked={modalIsDefault}
                      onChange={(e) => setModalIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#414E36] cursor-pointer"
                    />
                    <label htmlFor="isDefaultCheckbox" className="text-xs font-semibold text-[#5A6A51] cursor-pointer">
                      Use as default intake for all unassigned services
                    </label>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-[#1F251A]">
                    Description & Purpose (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    placeholder="Brief description of when this intake form is required..."
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white p-3 text-xs text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Multi-Service Assignment Section */}
              <div className="rounded-3xl border border-[#414E36]/12 bg-[#FBFBF9] p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                      <Tag size={14} className="text-[#414E36]" /> Assign Services ({modalServiceIds.length} Selected)
                    </h4>
                    <p className="text-[11px] text-[#5A6A51]">
                      Select all services that should trigger this specialized intake form in doctor sessions.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFilteredServices(filteredModalServices.map((s) => s.id))}
                      className="text-[11px] font-bold text-[#414E36] hover:underline"
                    >
                      Select All Filtered
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllServices}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {/* Service Filter Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Filter services by name or category..."
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white ps-9 pe-3 py-2 text-xs text-[#1F251A] outline-none"
                  />
                  <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                </div>

                {/* Services Checkbox Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                  {filteredModalServices.map((srv: any) => {
                    const isSelected = modalServiceIds.some((id) => String(id) === String(srv.id));
                    return (
                      <button
                        type="button"
                        key={srv.id}
                        onClick={() => handleToggleService(srv.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition select-none text-left w-full ${
                          isSelected
                            ? "border-emerald-700 bg-emerald-50 font-bold text-emerald-950 shadow-2xs"
                            : "border-[#414E36]/10 bg-white font-medium text-[#1F251A] hover:bg-[#F4F5F1]"
                        }`}
                      >
                        <span className={`h-4 w-4 rounded flex items-center justify-center border transition shrink-0 ${
                          isSelected ? "bg-emerald-700 border-emerald-700 text-white" : "border-gray-300 bg-white"
                        }`}>
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </span>
                        <span className="truncate">{getServiceName(srv)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Intake Questions Builder */}
              <div className="rounded-3xl border border-[#414E36]/12 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#1F251A] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#414E36]" /> Intake Questions & Form Fields ({modalFields.length})
                    </h4>
                    <p className="text-[11px] text-[#5A6A51]">
                      Add questions, select answer input types, and configure custom options.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddField}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#EDF1EC] px-3.5 py-1.5 text-xs font-extrabold text-[#414E36] hover:bg-[#414E36] hover:text-white transition cursor-pointer"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                <div className="space-y-3">
                  {modalFields.map((field, idx) => (
                    <div
                      key={field.id || idx}
                      className="p-4 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-[#414E36] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                            placeholder="e.g. Skin Phototype, Laser Tanning History..."
                            className="flex-1 rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] outline-none min-w-[220px]"
                          />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateField(idx, { type: e.target.value as any })}
                            className="rounded-xl border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1F251A] outline-none"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Textarea</option>
                            <option value="select">Dropdown Select</option>
                            <option value="checkbox">Yes / No Checkbox</option>
                            <option value="number">Number</option>
                          </select>

                          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5A6A51] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                              className="h-3.5 w-3.5 rounded accent-[#414E36]"
                            />
                            Required
                          </label>

                          <div className="flex items-center gap-0.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, "down")}
                              disabled={idx === modalFields.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDown size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete Question"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Options Input */}
                      {field.type === "select" && (
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-[#5A6A51] uppercase">
                            Dropdown Options (Separate by comma)
                          </label>
                          <input
                            type="text"
                            value={(field.options || []).join(", ")}
                            onChange={(e) =>
                              handleUpdateField(idx, {
                                options: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              })
                            }
                            placeholder="e.g. Option 1, Option 2, Option 3"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#414E36]/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-2xl border border-[#414E36]/20 bg-white px-5 py-3 text-xs font-bold text-[#5A6A51] hover:bg-[#FBFBF9] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="templateForm"
                disabled={saving || !modalTitle.trim() || modalFields.length === 0}
                className="rounded-2xl bg-[#414E36] px-6 py-3 text-xs font-extrabold text-white hover:bg-[#323D2A] transition disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                <span>{saving ? "Saving Template..." : "Save Template"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
