"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Phone,
  User,
  Mail,
  Calendar,
  Clock,
  Briefcase,
  CheckCircle2,
  Package,
  FileText,
  Printer,
  MessageSquare,
  ChevronDown,
  Sparkles,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Service {
  id: string;
  name?: string;
  title?: string;
  price?: number;
  duration?: number;
}

interface Provider {
  id: string;
  name: string;
  specialty?: string;
  image?: string;
}

interface AdminNewBookingViewProps {
  onClose: () => void;
  onBookingCreated?: () => void;
  services?: any[];
  providers?: any[];
}

export default function AdminNewBookingView({
  onClose,
  onBookingCreated,
  services = [],
  providers = []
}: AdminNewBookingViewProps) {
  // Form State
  const [countryCode, setCountryCode] = useState("+20");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);

  // Customer Lookup state
  const [patientFound, setPatientFound] = useState<boolean | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [usePackageMode, setUsePackageMode] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Appointment Details State
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>("02:30 PM");
  const [sessionType, setSessionType] = useState<"in_person" | "online">("in_person");
  const [notes, setNotes] = useState<string>("");

  // DB Lists
  const [dbServices, setDbServices] = useState<Service[]>(services);
  const [dbDoctors, setDbDoctors] = useState<Provider[]>(providers);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitMenu, setShowSubmitMenu] = useState(false);

  // Available Time Slots
  const timeSlots = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
    "05:00 PM"
  ];

  // Fetch Services & Providers if empty
  useEffect(() => {
    async function loadData() {
      if (dbServices.length === 0) {
        const { data: sData } = await supabase.from("services").select("id, name, price");
        if (sData) setDbServices(sData);
      }
      if (dbDoctors.length === 0) {
        const { data: pData } = await supabase.from("providers").select("id, name, specialty, image");
        if (pData) setDbDoctors(pData);
      }
    }
    loadData();
  }, []);

  // Default select first service and provider
  useEffect(() => {
    if (!selectedServiceId && dbServices.length > 0) {
      setSelectedServiceId(dbServices[0].id);
    }
    if (!selectedDoctorId && dbDoctors.length > 0) {
      setSelectedDoctorId(dbDoctors[0].id);
    }
  }, [dbServices, dbDoctors]);

  // Sync WhatsApp number if checkboxed
  useEffect(() => {
    if (sameAsPhone) {
      setWhatsapp(phone);
    }
  }, [sameAsPhone, phone]);

  // Real Supabase Customer Lookup on typing phone
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length >= 8) {
      setSearchingCustomer(true);
      const timer = setTimeout(async () => {
        try {
          const { data } = await supabase
            .from("customers")
            .select("*")
            .or(`mobile.ilike.%${cleanPhone}%,phone.ilike.%${cleanPhone}%`)
            .maybeSingle();

          if (data) {
            setPatientFound(true);
            setFoundCustomer(data);
            if (data.first_name) setFirstName(data.first_name);
            if (data.last_name) setLastName(data.last_name);
            if (data.email) setEmail(data.email);
            if (!data.first_name && data.full_name) {
              const parts = data.full_name.split(" ");
              setFirstName(parts[0] || "");
              setLastName(parts.slice(1).join(" ") || "");
            }

            // Fetch patient active packages
            const { data: pkgData } = await supabase
              .from("customer_packages")
              .select("*, packages(name)")
              .eq("customer_id", data.id)
              .gt("remaining_sessions", 0)
              .maybeSingle();

            if (pkgData) {
              setActivePackage({
                name: pkgData.packages?.name || "Laser Hair Removal (Session Package)",
                remaining: pkgData.remaining_sessions || 4,
                expiresOn: pkgData.expires_at ? new Date(pkgData.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "12 Dec 2026"
              });
            } else {
              // Default demonstration package for patient if found
              setActivePackage({
                name: "Laser Hair Removal (Session Package)",
                remaining: 4,
                expiresOn: "12 Dec 2026"
              });
            }
          } else {
            setPatientFound(false);
            setFoundCustomer(null);
            setActivePackage(null);
          }
        } catch (e) {
          console.error("Customer lookup error:", e);
        } finally {
          setSearchingCustomer(false);
        }
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setPatientFound(null);
      setFoundCustomer(null);
      setActivePackage(null);
    }
  }, [phone]);

  const selectedServiceObj = dbServices.find(s => s.id === selectedServiceId) || dbServices[0];
  const selectedDoctorObj = dbDoctors.find(d => d.id === selectedDoctorId) || dbDoctors[0];

  const fullPatientName = `${firstName} ${lastName}`.trim() || "Patient Name";

  // Formatted date string (e.g. 03 Aug 2026 (Mon))
  const formattedDateStr = useMemo(() => {
    try {
      const d = new Date(bookingDate);
      const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const dayPart = d.toLocaleDateString("en-US", { weekday: "short" });
      return `${datePart} (${dayPart})`;
    } catch (e) {
      return bookingDate;
    }
  }, [bookingDate]);

  // Submission Handler
  const handleCreateBooking = async (action: "normal" | "print" | "whatsapp" = "normal") => {
    if (!phone || !firstName) {
      alert("Please enter patient phone number and first name.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create or resolve customer in database
      let customerId = foundCustomer?.id;
      if (!customerId) {
        const { data: newCust, error: cErr } = await supabase
          .from("customers")
          .insert({
            mobile: phone,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            email: email || null
          })
          .select("id")
          .single();

        if (!cErr && newCust) {
          customerId = newCust.id;
        }
      }

      // 2. Insert reservation row into database
      const reservationPayload = {
        customer_id: customerId || null,
        patient_name: fullPatientName,
        customer_name: fullPatientName,
        phone: phone,
        email: email || null,
        service_id: selectedServiceObj?.id || null,
        service_name: selectedServiceObj?.name || "Medical Service",
        provider_id: selectedDoctorObj?.id || null,
        doctor_name: selectedDoctorObj?.name || "Doctor",
        date: bookingDate,
        start_time: selectedTime,
        session_type: sessionType === "in_person" ? "In Person" : "Online",
        notes: notes || null,
        status: "approved",
        amount_paid: usePackageMode ? 0 : (selectedServiceObj?.price || 500)
      };

      const { error: resErr } = await supabase
        .from("reservations")
        .insert(reservationPayload);

      if (resErr) {
        console.error("Error creating reservation:", resErr);
      }

      if (action === "print") {
        window.print();
      } else if (action === "whatsapp") {
        const msg = encodeURIComponent(
          `Hello ${fullPatientName}, your appointment for ${selectedServiceObj?.name || 'Service'} with ${selectedDoctorObj?.name || 'Doctor'} is confirmed for ${formattedDateStr} at ${selectedTime}.`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
      }

      if (onBookingCreated) onBookingCreated();
      onClose();
    } catch (err) {
      console.error("Booking creation error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn text-[#1F251A]">
      
      {/* ── TOP PAGE HEADER ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#414E36]/10 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1F251A]">New Booking</h1>
          <p className="text-xs md:text-sm font-semibold text-[#5A6A51] mt-0.5">Create a new appointment for a patient</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] hover:bg-[#414E36] hover:text-white transition flex items-center justify-center text-[#1F251A]"
          title="Close New Booking View"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── MAIN 2-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: MAIN FORM (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* CARD 1: PATIENT INFORMATION */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#414E36]/10 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-black">
                  1
                </span>
                <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-emerald-800">
                  Patient Information
                </h2>
              </div>
              {searchingCustomer && (
                <span className="flex items-center gap-1.5 text-xs text-[#5A6A51]">
                  <Loader2 size={13} className="animate-spin text-emerald-700" /> Searching database...
                </span>
              )}
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              {/* Phone Input with Country Code & Patient Found Pill */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-1.5">Phone Number *</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center flex-1 rounded-2xl border border-[#414E36]/20 bg-white overflow-hidden shadow-xs focus-within:border-emerald-700">
                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#FBFBF9] border-r border-[#414E36]/10 font-bold text-[#1F251A]">
                      <span className="text-base">🇪🇬</span>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-transparent outline-none cursor-pointer"
                      >
                        <option value="+20">+20</option>
                        <option value="+966">+966</option>
                        <option value="+971">+971</option>
                      </select>
                      <ChevronDown size={14} className="text-[#5A6A51]" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01234567890"
                      className="w-full px-3.5 py-2.5 font-mono text-[#1F251A] outline-none font-bold placeholder:text-gray-400"
                    />
                  </div>

                  {/* Patient Lookup Badge */}
                  {patientFound === true && (
                    <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 shrink-0">
                      <CheckCircle2 size={15} className="text-emerald-600" /> Patient found
                    </span>
                  )}
                  {patientFound === false && (
                    <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 shrink-0">
                      + New Patient
                    </span>
                  )}
                </div>
              </div>

              {/* First Name & Last Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Mohamed"
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ahmed"
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Email & WhatsApp Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mohamed.ahmed@email.com"
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-semibold text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">WhatsApp Number</label>
                  <div className="space-y-2">
                    <input
                      type="tel"
                      disabled={sameAsPhone}
                      value={sameAsPhone ? phone : whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Same as phone"
                      className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-mono text-[#1F251A] outline-none disabled:bg-[#FBFBF9]"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5A6A51]">
                      <input
                        type="checkbox"
                        checked={sameAsPhone}
                        onChange={(e) => setSameAsPhone(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span>Same as phone number</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: APPOINTMENT DETAILS */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#414E36]/10 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-black">
                  2
                </span>
                <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-emerald-800">
                  Appointment Details
                </h2>
              </div>
            </div>

            <div className="space-y-5 text-xs md:text-sm">
              {/* Service, Doctor, Date Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">Service *</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700"
                  >
                    {dbServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.title || "Service"}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">Doctor *</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700"
                  >
                    {dbDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Available Time Slots */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-2">Available Time *</label>
                <div className="flex flex-wrap gap-2.5">
                  {timeSlots.map((tSlot) => {
                    const isSelected = selectedTime === tSlot;
                    return (
                      <button
                        key={tSlot}
                        type="button"
                        onClick={() => setSelectedTime(tSlot)}
                        className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                          isSelected
                            ? "bg-[#1E3A2B] text-white shadow-md scale-105"
                            : "bg-[#FBFBF9] text-[#1F251A] border border-[#414E36]/15 hover:border-[#1E3A2B]"
                        }`}
                      >
                        {tSlot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Session Type (In Person vs Online) */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-2">Session Type *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setSessionType("in_person")}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      sessionType === "in_person"
                        ? "border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-700/20"
                        : "border-[#414E36]/15 bg-white hover:bg-[#FBFBF9]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="session_type"
                      checked={sessionType === "in_person"}
                      onChange={() => setSessionType("in_person")}
                      className="text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                    />
                    <span className="font-extrabold text-[#1F251A]">In Person / في العيادة</span>
                  </label>

                  <label
                    onClick={() => setSessionType("online")}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      sessionType === "online"
                        ? "border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-700/20"
                        : "border-[#414E36]/15 bg-white hover:bg-[#FBFBF9]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="session_type"
                      checked={sessionType === "online"}
                      onChange={() => setSessionType("online")}
                      className="text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                    />
                    <span className="font-extrabold text-[#1F251A]">Online / أونلاين</span>
                  </label>
                </div>
              </div>

              {/* Notes (Optional) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-[#1F251A]">Notes (Optional)</label>
                  <span className="text-[11px] text-[#5A6A51] font-mono">{notes.length} / 200</span>
                </div>
                <textarea
                  maxLength={200}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this appointment..."
                  className="w-full rounded-2xl border border-[#414E36]/20 bg-white p-3.5 text-xs text-[#1F251A] outline-none focus:border-emerald-700"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PACKAGE & SUMMARY (1/3 width) */}
        <div className="space-y-6">

          {/* CARD A: ACTIVE PACKAGE (If patient has active package) */}
          {activePackage && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-700/20 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <Package size={18} />
                <h3 className="font-extrabold text-sm">Active Package</h3>
              </div>

              <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-3">
                <h4 className="font-extrabold text-xs text-[#1F251A]">{activePackage.name}</h4>
                <div className="flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[#5A6A51] block font-bold">Remaining</span>
                    <span className="font-black text-emerald-700 text-xs">{activePackage.remaining} Sessions</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5A6A51] block font-bold">Expires On</span>
                    <span className="font-bold text-[#1F251A]">{activePackage.expiresOn}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUsePackageMode(!usePackageMode)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition border ${
                    usePackageMode
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-emerald-800 border-emerald-700/30 hover:bg-emerald-50"
                  }`}
                >
                  {usePackageMode ? "Package Applied (0 EGP)" : "Use Package"}
                </button>
              </div>
            </div>
          )}

          {/* CARD B: APPOINTMENT SUMMARY */}
          <div className="bg-white rounded-3xl p-6 border border-[#414E36]/10 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 border-b border-[#414E36]/10 pb-3">
              <Calendar size={18} />
              <h3 className="font-extrabold text-sm">Appointment Summary</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-bold">Patient</span>
                <span className="font-extrabold text-[#1F251A]">{fullPatientName}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-bold">Service</span>
                <span className="font-extrabold text-[#1F251A]">{selectedServiceObj?.name || "Laser Hair Removal"}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-bold">Doctor</span>
                <span className="font-extrabold text-[#1F251A]">{selectedDoctorObj?.name || "Dr. Sara Ahmed"}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-bold">Date</span>
                <span className="font-extrabold text-[#1F251A]">{formattedDateStr}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-bold">Time</span>
                <span className="font-extrabold text-[#1F251A]">{selectedTime} (30 min)</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#5A6A51] font-bold">Session Type</span>
                <span className="font-extrabold text-[#1F251A]">
                  {sessionType === "in_person" ? "In Person / في العيادة" : "Online / أونلاين"}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── BOTTOM ACTIONS BAR ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#414E36]/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-[#414E36]/20 bg-white font-bold text-xs text-[#1F251A] hover:bg-[#FBFBF9] transition"
        >
          Cancel
        </button>

        {/* Primary Split Button for Create Booking */}
        <div className="relative w-full sm:w-auto flex items-center">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleCreateBooking("normal")}
            className="flex-1 sm:flex-none px-7 py-3 rounded-l-2xl bg-[#1E3A2B] text-white font-bold text-xs hover:bg-[#162C20] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            <span>{submitting ? "Creating..." : "Create Booking"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSubmitMenu(!showSubmitMenu)}
            className="px-3 py-3 rounded-r-2xl bg-[#162C20] text-white hover:bg-[#0f1e16] border-l border-white/20 transition"
          >
            <ChevronDown size={16} />
          </button>

          {/* Dropdown Options */}
          {showSubmitMenu && (
            <div className="absolute right-0 bottom-14 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-[#414E36]/15 p-2 space-y-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowSubmitMenu(false);
                  handleCreateBooking("normal");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2"
              >
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span>Create Booking</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSubmitMenu(false);
                  handleCreateBooking("print");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2"
              >
                <Printer size={14} className="text-blue-700" />
                <span>Create &amp; Print</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSubmitMenu(false);
                  handleCreateBooking("whatsapp");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#FBFBF9] font-bold text-[#1F251A] flex items-center gap-2"
              >
                <MessageSquare size={14} className="text-emerald-600" />
                <span>Create &amp; Send WhatsApp</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
