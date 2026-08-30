"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  User,
  Star,
  Send,
  Plus,
  RefreshCw,
  TrendingUp,
  Headphones,
  Check
} from "lucide-react";
import { adminTranslations } from "../translations";

interface SupportTicket {
  id: string;
  patientName: string;
  patientPhone: string;
  subject: string;
  category: "General" | "Booking" | "Treatment" | "Billing" | "Feedback";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved";
  channel: "WhatsApp" | "Call" | "Website" | "In-Person";
  createdAt: string;
  lastMessage?: string;
  assignedTo?: string;
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "TICK-101",
    patientName: "Nouran Mansour",
    patientPhone: "+201012345678",
    subject: "Inquiry about post-treatment laser care routine",
    category: "Treatment",
    priority: "medium",
    status: "open",
    channel: "WhatsApp",
    createdAt: "Today, 02:15 PM",
    lastMessage: "Can I use vitamin C serum right after the fractional session?",
    assignedTo: "Dr. Sara"
  },
  {
    id: "TICK-102",
    patientName: "Karim Abdelrahman",
    patientPhone: "+201123456789",
    subject: "Reschedule next Tuesday appointment to Friday",
    category: "Booking",
    priority: "high",
    status: "in_progress",
    channel: "Call",
    createdAt: "Today, 11:30 AM",
    lastMessage: "Patient requested morning slot at Sheikh Zayed branch.",
    assignedTo: "Reception Zayed"
  },
  {
    id: "TICK-103",
    patientName: "Mona El-Shenawy",
    patientPhone: "+201234567890",
    subject: "Question regarding invoice receipt calculation",
    category: "Billing",
    priority: "low",
    status: "resolved",
    channel: "Website",
    createdAt: "Yesterday, 04:40 PM",
    lastMessage: "Clarified 10% package discount application. Patient satisfied.",
    assignedTo: "Accounts Dept"
  },
  {
    id: "TICK-104",
    patientName: "Dalia Hossam",
    patientPhone: "+201098765432",
    subject: "Positive feedback on HydraFacial session experience",
    category: "Feedback",
    priority: "low",
    status: "resolved",
    channel: "WhatsApp",
    createdAt: "2 days ago",
    lastMessage: "Exceptional service by the medical team!",
    assignedTo: "Quality Team"
  }
];

interface Props {
  lang?: "en" | "ar";
  hasPermission?: (perm: string) => boolean;
}

export default function CustomerSupportView({ lang = "en", hasPermission }: Props) {
  const isAr = lang === "ar";
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // New Ticket Form State
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState<SupportTicket["category"]>("General");
  const [newPriority, setNewPriority] = useState<SupportTicket["priority"]>("medium");
  const [newChannel, setNewChannel] = useState<SupportTicket["channel"]>("WhatsApp");

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.patientName.toLowerCase().includes(q) ||
        t.patientPhone.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newSubject.trim()) return;
    const newT: SupportTicket = {
      id: `TICK-${Math.floor(100 + Math.random() * 900)}`,
      patientName: newPatientName.trim(),
      patientPhone: newPatientPhone.trim() || "+201000000000",
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      status: "open",
      channel: newChannel,
      createdAt: "Just now",
      lastMessage: newSubject.trim(),
      assignedTo: "Support Team"
    };
    setTickets([newT, ...tickets]);
    setShowNewTicketModal(false);
    setNewPatientName("");
    setNewPatientPhone("");
    setNewSubject("");
  };

  const handleUpdateStatus = (id: string, newStatus: SupportTicket["status"]) => {
    setTickets(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
    );
    if (selectedTicket?.id === id) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F251A] tracking-tight">
            {isAr ? "دعم العملاء وخدمة المرضى" : "Customer Support & Inquiries"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5A6A51]">
            {isAr
              ? "متابعة استفسارات المرضى، تذاكر المساعدة، وقنوات التواصل المباشر"
              : "Manage patient helpdesk tickets, live WhatsApp inquiries, and service feedback"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewTicketModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>{isAr ? "تذكرة دعم جديدة" : "New Support Ticket"}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">
              {isAr ? "تذاكر مفتوحة" : "Open Tickets"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">{openCount}</div>
          <p className="mt-1 text-xs text-amber-600 font-semibold">{isAr ? "تحتاج إلى متابعة" : "Requires attention"}</p>
        </div>

        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">
              {isAr ? "قيد المعالجة" : "In Progress"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">{inProgressCount}</div>
          <p className="mt-1 text-xs text-sky-600 font-semibold">{isAr ? "جاري التعامل معها" : "Under review"}</p>
        </div>

        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">
              {isAr ? "تم حلها بنجاح" : "Resolved"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">{resolvedCount}</div>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">{isAr ? "تم إغلاقها برضا المريض" : "Closed with satisfaction"}</p>
        </div>

        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">
              {isAr ? "معدل الرضا العام" : "Satisfaction Rate"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C4AE7C]/20 text-[#414E36]">
              <Star size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1F251A]">98.4%</div>
          <p className="mt-1 text-xs text-[#5A6A51] font-semibold">{isAr ? "بناءً على تقييم المرضى" : "Based on verified reviews"}</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#414E36]/10 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className={`absolute ${isAr ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-[#5A6A51]/60 pointer-events-none`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بالاسم، الهاتف، أو رقم التذكرة..." : "Search patient name, phone, or ticket ID..."}
            className={`w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] ${isAr ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
          >
            <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
            <option value="open">{isAr ? "مفتوحة" : "Open"}</option>
            <option value="in_progress">{isAr ? "قيد المتابعة" : "In Progress"}</option>
            <option value="resolved">{isAr ? "تم الحل" : "Resolved"}</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
          >
            <option value="all">{isAr ? "جميع الأولويات" : "All Priorities"}</option>
            <option value="urgent">{isAr ? "عاجل" : "Urgent"}</option>
            <option value="high">{isAr ? "مرتفع" : "High"}</option>
            <option value="medium">{isAr ? "متوسط" : "Medium"}</option>
            <option value="low">{isAr ? "عادي" : "Low"}</option>
          </select>
        </div>
      </div>

      {/* Tickets List and Inspection Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tickets Table */}
        <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-[#414E36]/10 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1F251A]" dir={isAr ? "rtl" : "ltr"}>
              <thead className="bg-[#F9F9F7] text-[11px] font-bold uppercase tracking-wider text-[#5A6A51] border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4">{isAr ? "المريض والتذكرة" : "Patient & ID"}</th>
                  <th className="px-4 py-4">{isAr ? "الموضوع" : "Subject"}</th>
                  <th className="px-4 py-4">{isAr ? "القناة" : "Channel"}</th>
                  <th className="px-4 py-4 text-center">{isAr ? "الأولوية" : "Priority"}</th>
                  <th className="px-4 py-4 text-center">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      {isAr ? "لا توجد تذاكر تطابق معايير البحث." : "No support tickets found matching criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`cursor-pointer transition hover:bg-[#FBFBF9] ${isSelected ? "bg-[#EDE4C8]/30 font-semibold" : ""}`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-[#1F251A]">{t.patientName}</div>
                          <div className="text-[10px] text-[#5A6A51] font-mono">{t.id} • {t.patientPhone}</div>
                        </td>
                        <td className="px-4 py-4 max-w-xs truncate">
                          <div className="truncate font-semibold text-[#1F251A]">{t.subject}</div>
                          <div className="text-[10px] text-[#5A6A51] truncate">{t.lastMessage}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 font-semibold text-[11px] text-gray-700">
                            {t.channel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            t.priority === "urgent" || t.priority === "high"
                              ? "bg-red-50 text-red-700 border border-red-200/60"
                              : t.priority === "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                              : "bg-gray-50 text-gray-700 border border-gray-200/60"
                          }`}>
                            {t.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            t.status === "resolved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : t.status === "in_progress"
                              ? "bg-sky-50 text-sky-700 border border-sky-200/60"
                              : "bg-amber-50 text-amber-700 border border-amber-200/60"
                          }`}>
                            {t.status === "resolved" ? (isAr ? "تم الحل" : "Resolved") : t.status === "in_progress" ? (isAr ? "قيد المعالجة" : "In Progress") : (isAr ? "مفتوحة" : "Open")}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Ticket Details / Quick Action Drawer */}
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-6 shadow-xs flex flex-col justify-between">
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#5A6A51] uppercase">{selectedTicket.id}</span>
                  <h3 className="text-base font-bold text-[#1F251A] mt-0.5">{selectedTicket.subject}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  selectedTicket.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div className="rounded-2xl bg-[#FBFBF9] p-3.5 space-y-2 border border-[#414E36]/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5A6A51]">{isAr ? "المريض:" : "Patient:"}</span>
                  <span className="font-bold text-[#1F251A]">{selectedTicket.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6A51]">{isAr ? "رقم الهاتف:" : "Phone:"}</span>
                  <span className="font-mono text-[#1F251A]">{selectedTicket.patientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6A51]">{isAr ? "القناة:" : "Channel:"}</span>
                  <span className="font-semibold text-[#1F251A]">{selectedTicket.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6A51]">{isAr ? "المسؤول:" : "Assigned To:"}</span>
                  <span className="font-semibold text-[#414E36]">{selectedTicket.assignedTo}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{isAr ? "آخر رسالة / ملاحظات:" : "Last Message / Description:"}</label>
                <p className="mt-1 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed">
                  {selectedTicket.lastMessage}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">{isAr ? "تحديث حالة التذكرة:" : "Update Ticket Status:"}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedTicket.id, "open")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${selectedTicket.status === "open" ? "bg-amber-500 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    {isAr ? "مفتوحة" : "Open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedTicket.id, "in_progress")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${selectedTicket.status === "in_progress" ? "bg-sky-500 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    {isAr ? "معالجة" : "Progress"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedTicket.id, "resolved")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${selectedTicket.status === "resolved" ? "bg-emerald-600 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    {isAr ? "تم الحل" : "Resolved"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <Headphones size={36} className="text-gray-300 mb-3" />
              <p className="text-xs font-semibold">{isAr ? "اختر تذكرة من القائمة لعرض تفاصيلها والرد السريع." : "Select a ticket from the table to review details and take action."}</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-[#1F251A]">
              {isAr ? "إنشاء تذكرة دعم جديدة" : "Create New Support Ticket"}
            </h3>
            <p className="text-xs text-[#5A6A51] mt-1">
              {isAr ? "تسجيل استفسار أو شكوى أو ملاحظة لمريض" : "Log a patient inquiry, request, or feedback"}
            </p>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#1F251A]">{isAr ? "اسم المريض *" : "Patient Name *"}</label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="e.g. Nouran Mansour"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F251A]">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                <input
                  type="text"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  placeholder="+201..."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F251A]">{isAr ? "موضوع التذكرة *" : "Subject / Inquiry *"}</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Appointment rescheduling request"
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1F251A]">{isAr ? "التصنيف" : "Category"}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-[#C4AE7C]"
                  >
                    <option value="General">General</option>
                    <option value="Booking">Booking</option>
                    <option value="Treatment">Treatment</option>
                    <option value="Billing">Billing</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1F251A]">{isAr ? "القناة" : "Channel"}</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-[#C4AE7C]"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Call">Call</option>
                    <option value="Website">Website</option>
                    <option value="In-Person">In-Person</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#414E36] px-5 py-2 text-xs font-bold text-white hover:bg-[#2e3a26] cursor-pointer"
                >
                  {isAr ? "حفظ التذكرة" : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
