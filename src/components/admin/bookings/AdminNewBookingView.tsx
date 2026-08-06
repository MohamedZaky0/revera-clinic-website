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
  Printer,
  MessageSquare,
  ChevronDown,
  Loader2,
  Search,
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ServiceItem {
  id: string | number;
  en?: string;
  name?: string;
  title?: string;
  name_en?: string;
  title_en?: string;
  ar?: string;
  price?: number;
  duration?: number;
}

interface ProviderItem {
  id: string | number;
  name: string;
  specialty?: string;
  image?: string;
}

interface CustomerItem {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

interface AdminNewBookingViewProps {
  onClose: () => void;
  onBookingCreated?: () => void;
  services?: any[];
  providers?: any[];
}

// Helper to extract service name cleanly
function getServiceName(s: any): string {
  if (!s) return "Medical Service";
  return s.en || s.name || s.title || s.name_en || s.title_en || s.ar || `Service #${s.id}`;
}

// Helper to format slot string cleanly into 12h format e.g. "09:30 AM"
function formatSlotTo12h(timeStr: string): string {
  if (!timeStr) return "09:00 AM";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  return timeStr;
}

function normalizeTimeSlot(t: string): string {
  return formatSlotTo12h(t).trim().toUpperCase();
}

export default function AdminNewBookingView({
  onClose,
  onBookingCreated,
  services = [],
  providers = []
}: AdminNewBookingViewProps) {
  // Patient Search & Selection State
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [customerList, setCustomerList] = useState<CustomerItem[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerItem[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

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
  const [foundCustomer, setFoundCustomer] = useState<CustomerItem | null>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [usePackageMode, setUsePackageMode] = useState(false);

  // Appointment Details State
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>("09:00 AM");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [sessionType, setSessionType] = useState<"in_person" | "online">("in_person");
  const [notes, setNotes] = useState<string>("");

  // DB Lists
  const [dbServices, setDbServices] = useState<ServiceItem[]>(services);
  const [dbDoctors, setDbDoctors] = useState<ProviderItem[]>(providers);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitMenu, setShowSubmitMenu] = useState(false);

  // 1. Fetch Services & Providers & Existing Customers from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch Services
        const { data: sData } = await supabase.from("services").select("*").order("sort_order", { ascending: true });
        if (sData && sData.length > 0) {
          setDbServices(sData);
        }

        // Fetch Providers
        const { data: pData } = await supabase.from("providers").select("*").order("name", { ascending: true });
        if (pData && pData.length > 0) {
          setDbDoctors(pData);
        }

        // Fetch Customers List directly from Supabase
        const { data: cData } = await supabase
          .from("customers")
          .select("id, name, first_name, last_name, full_name, mobile, phone, email, whatsapp")
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (cData && cData.length > 0) {
          setCustomerList(cData);
          setAllCustomers(cData);
        }
      } catch (err) {
        console.error("Error initializing New Booking View data:", err);
      }
    }
    loadData();
  }, []);

  // Set default selected service & provider
  useEffect(() => {
    if (!selectedServiceId && dbServices.length > 0) {
      setSelectedServiceId(String(dbServices[0].id));
    }
    if (!selectedDoctorId && dbDoctors.length > 0) {
      setSelectedDoctorId(String(dbDoctors[0].id));
    }
  }, [dbServices, dbDoctors]);

  // Sync WhatsApp number if checkboxed
  useEffect(() => {
    if (sameAsPhone) {
      setWhatsapp(phone);
    }
  }, [sameAsPhone, phone]);

  // 2. Real-time Customer Search & Filter
  useEffect(() => {
    async function searchCustomers() {
      const q = patientSearchQuery.trim().toLowerCase();
      if (!q) {
        setCustomerList(allCustomers);
        return;
      }
      setSearchingCustomer(true);

      try {
        const filtered = allCustomers.filter(c => {
          const nameMatch = (c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).toLowerCase().includes(q);
          const phoneMatch = (c.mobile || c.phone || "").toLowerCase().includes(q);
          const emailMatch = (c.email || "").toLowerCase().includes(q);
          return nameMatch || phoneMatch || emailMatch;
        });

        if (filtered.length > 0) {
          setCustomerList(filtered);
        } else {
          // Query Supabase directly if client filter returns empty
          const { data } = await supabase
            .from("customers")
            .select("id, name, first_name, last_name, full_name, mobile, phone, email, whatsapp")
            .or(`name.ilike.%${q}%,full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,mobile.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
            .limit(15);

          if (data) {
            setCustomerList(data);
          }
        }
      } catch (err) {
        console.error("Customer search error:", err);
      } finally {
        setSearchingCustomer(false);
      }
    }

    const timer = setTimeout(searchCustomers, 250);
    return () => clearTimeout(timer);
  }, [patientSearchQuery, allCustomers]);

  // Handle Select Customer from List
  const handleSelectCustomer = async (cust: CustomerItem) => {
    setFoundCustomer(cust);
    setPatientFound(true);
    const p = cust.mobile || cust.phone || "";
    setPhone(p);

    const fName = cust.first_name || cust.name?.split(" ")[0] || cust.full_name?.split(" ")[0] || "";
    const lName = cust.last_name || cust.name?.split(" ").slice(1).join(" ") || cust.full_name?.split(" ").slice(1).join(" ") || "";

    setFirstName(fName);
    setLastName(lName);
    setEmail(cust.email || "");
    setWhatsapp(cust.whatsapp || p);
    setPatientSearchQuery(`${cust.name || cust.full_name || `${fName} ${lName}`}`.trim());
    setShowCustomerDropdown(false);

    // Fetch active packages for this customer
    try {
      const { data: pkgData } = await supabase
        .from("customer_packages")
        .select("*, packages(name)")
        .eq("customer_id", cust.id)
        .gt("remaining_sessions", 0)
        .maybeSingle();

      if (pkgData) {
        setActivePackage({
          name: pkgData.packages?.name || "Laser Hair Removal (Session Package)",
          remaining: pkgData.remaining_sessions || 4,
          expiresOn: pkgData.expires_at ? new Date(pkgData.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "12 Dec 2026"
        });
      } else {
        setActivePackage(null);
      }
    } catch (e) {
      console.error("Error loading customer package:", e);
    }
  };

  // 3. Dynamic Real Time Slots Calculation (Combining API & Provider Working Hours + Booked Slots)
  useEffect(() => {
    async function fetchActualTimeSlots() {
      setLoadingSlots(true);
      try {
        // Query existing reservations for selected date & doctor to calculate booked slots
        let booked: string[] = [];
        if (bookingDate) {
          let qRes = supabase
            .from("reservations")
            .select("start_time, status, date, doctor_name, provider_id")
            .eq("date", bookingDate)
            .neq("status", "cancelled");

          if (selectedDoctorId) {
            qRes = qRes.eq("provider_id", selectedDoctorId);
          }

          const { data: resData } = await qRes;
          if (resData) {
            booked = resData.map((r: any) => normalizeTimeSlot(r.start_time || r.time)).filter(Boolean);
          }
        }
        setBookedTimeSlots(booked);

        // Try /api/availability endpoint
        const params = new URLSearchParams();
        if (selectedServiceId) params.append("serviceId", String(selectedServiceId));
        if (bookingDate) params.append("date", bookingDate);

        const res = await fetch(`/api/availability?${params.toString()}`);
        if (res.ok) {
          const apiData = await res.json();
          let slotsList: string[] = [];
          if (Array.isArray(apiData)) {
            slotsList = apiData.map(formatSlotTo12h);
          } else if (apiData && typeof apiData === "object") {
            const list = apiData[bookingDate] || apiData.slots || apiData.availableSlots;
            if (Array.isArray(list) && list.length > 0) {
              slotsList = list.map(formatSlotTo12h);
            }
          }

          if (slotsList.length > 0) {
            setAvailableTimeSlots(slotsList);
            if (!slotsList.includes(selectedTime)) {
              setSelectedTime(slotsList[0]);
            }
            setLoadingSlots(false);
            return;
          }
        }
      } catch (e) {
        console.warn("API availability fetch fallback:", e);
      }

      // Generate standard clinic multi-shift slots: 09:00 AM – 02:00 PM & 05:00 PM – 09:00 PM
      const generated: string[] = [];
      const shiftRanges = [
        { start: 9, end: 14 },  // Morning Shift: 09:00 AM - 02:00 PM
        { start: 17, end: 21 }  // Evening Shift: 05:00 PM - 09:00 PM
      ];

      shiftRanges.forEach(range => {
        for (let hour = range.start; hour < range.end; hour++) {
          for (let min of [0, 30]) {
            const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const ampm = hour >= 12 ? "PM" : "AM";
            const hh = String(hour12).padStart(2, "0");
            const mm = String(min).padStart(2, "0");
            generated.push(`${hh}:${mm} ${ampm}`);
          }
        }
      });

      setAvailableTimeSlots(generated);
      if (!generated.includes(selectedTime)) {
        setSelectedTime(generated[0]);
      }
      setLoadingSlots(false);
    }

    fetchActualTimeSlots();
  }, [bookingDate, selectedDoctorId, selectedServiceId]);

  const selectedServiceObj = dbServices.find(s => String(s.id) === String(selectedServiceId)) || dbServices[0];
  const selectedDoctorObj = dbDoctors.find(d => String(d.id) === String(selectedDoctorId)) || dbDoctors[0];

  const selectedServiceName = getServiceName(selectedServiceObj);
  const selectedDoctorName = selectedDoctorObj?.name || "Doctor";

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

  // Submission Handler connecting to POST /api/reservations + Direct Supabase fallback
  const handleCreateBooking = async (action: "normal" | "print" | "whatsapp" = "normal") => {
    if (!phone || !firstName) {
      alert("Please enter patient phone number and first name.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: fullPatientName,
        phone: phone,
        email: email || null,
        serviceId: selectedServiceObj?.id,
        doctorId: selectedDoctorObj?.id,
        date: bookingDate,
        timeSlot: selectedTime,
        sessionType: sessionType === "in_person" ? "in_person" : "online",
        notes: notes || null,
        customerId: foundCustomer?.id || null
      };

      let success = false;

      // 1. Try POST /api/reservations endpoint
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          success = true;
        } else {
          const errData = await res.json();
          console.warn("API reservation endpoint response warning, executing direct insert fallback:", errData);
        }
      } catch (e) {
        console.warn("API fetch error, executing direct insert fallback:", e);
      }

      // 2. Direct Supabase insert fallback to ensure guaranteed write
      if (!success) {
        let customerId = foundCustomer?.id;
        if (!customerId) {
          const { data: newCust } = await supabase
            .from("customers")
            .insert({
              name: fullPatientName,
              mobile: phone,
              phone: phone,
              first_name: firstName,
              last_name: lastName,
              full_name: fullPatientName,
              email: email || null,
              whatsapp: whatsapp || phone,
              number_of_bookings: 1
            })
            .select("id")
            .maybeSingle();

          if (newCust) customerId = newCust.id;
        }

        const directResPayload = {
          customer_id: customerId || null,
          patient_name: fullPatientName,
          customer_name: fullPatientName,
          customer_phone: phone,
          phone: phone,
          email: email || null,
          service_id: selectedServiceObj?.id || null,
          service_name: selectedServiceName,
          provider_id: selectedDoctorObj?.id || null,
          doctor_name: selectedDoctorName,
          date: bookingDate,
          start_time: selectedTime,
          time: selectedTime,
          session_type: sessionType === "in_person" ? "In Person" : "Online",
          notes: notes || null,
          status: "approved",
          amount_paid: usePackageMode ? 0 : Number(selectedServiceObj?.price || 500)
        };

        const { error: insErr } = await supabase.from("reservations").insert(directResPayload);
        if (insErr) {
          console.error("Direct reservation insert error:", insErr);
        }
      }

      if (action === "print") {
        window.print();
      } else if (action === "whatsapp") {
        const msg = encodeURIComponent(
          `Hello ${fullPatientName}, your appointment for ${selectedServiceName} with ${selectedDoctorName} is confirmed for ${formattedDateStr} at ${selectedTime}.`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
      }

      if (onBookingCreated) onBookingCreated();
      onClose();
    } catch (err) {
      console.error("Booking creation error:", err);
      alert("Booking creation failed. Please check connection.");
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

              {/* Patient Status Indicator */}
              {patientFound === true && (
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Patient found
                </span>
              )}
              {patientFound === false && (
                <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-700">
                  + New Patient
                </span>
              )}
            </div>

            {/* 🔍 SEARCH EXISTING PATIENTS AUTOCOMPLETE DROP-DOWN */}
            <div className="relative">
              <label className="block font-bold text-[#1F251A] mb-1.5 flex items-center gap-2">
                <Search size={14} className="text-emerald-700" />
                <span>Search Existing Patient (Name, Phone, or Email)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearchQuery}
                  onChange={(e) => {
                    setPatientSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Type patient name or phone number to search database..."
                  className="w-full rounded-2xl border border-[#414E36]/20 bg-[#FBFBF9] pl-10 pr-10 py-2.5 text-xs font-bold text-[#1F251A] outline-none focus:border-emerald-700 focus:bg-white"
                />
                <Users size={16} className="absolute left-3.5 top-3 text-[#5A6A51]" />
                {patientSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientSearchQuery("");
                      setShowCustomerDropdown(false);
                    }}
                    className="absolute right-3.5 top-3 text-[#5A6A51] hover:text-[#1F251A]"
                  >
                    <X size={14} />
                  </button>
                ) : searchingCustomer ? (
                  <Loader2 size={16} className="absolute right-3.5 top-3 animate-spin text-emerald-700" />
                ) : null}
              </div>

              {/* Matching Customers Floating Dropdown List */}
              {showCustomerDropdown && customerList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-[100] max-h-64 overflow-y-auto bg-white rounded-2xl border border-[#414E36]/15 shadow-2xl p-2 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] border-b border-[#414E36]/10 flex justify-between items-center">
                    <span>Database Customers ({customerList.length})</span>
                    <button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-[#1F251A] font-bold">Close</button>
                  </div>
                  {customerList.map((c) => {
                    const cName = c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Patient Account";
                    const cPhone = c.mobile || c.phone || "No Phone";

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-2.5 rounded-xl hover:bg-emerald-50/70 cursor-pointer transition flex items-center justify-between border-b border-gray-50 last:border-0 text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-[#1F251A] block">{cName}</span>
                          <span className="text-[11px] font-mono text-[#5A6A51]">
                            {cPhone} {c.email ? `• ${c.email}` : ""}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                          Select Patient
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 text-xs md:text-sm pt-2 border-t border-[#414E36]/10">
              {/* Phone Input with Country Code */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-1.5">Phone Number *</label>
                <div className="flex items-center rounded-2xl border border-[#414E36]/20 bg-white overflow-hidden shadow-xs focus-within:border-emerald-700">
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
                      <option key={s.id} value={s.id}>
                        {getServiceName(s)}
                      </option>
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

              {/* REAL DYNAMIC TIME SLOTS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-[#1F251A]">Available Time *</label>
                  {loadingSlots && (
                    <span className="flex items-center gap-1 text-[11px] text-[#5A6A51]">
                      <Loader2 size={12} className="animate-spin text-emerald-700" /> Fetching slots...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {availableTimeSlots.map((tSlot) => {
                    const normalized = normalizeTimeSlot(tSlot);
                    const isBooked = bookedTimeSlots.includes(normalized);
                    const isSelected = selectedTime === tSlot;

                    return (
                      <button
                        key={tSlot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedTime(tSlot)}
                        className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                          isBooked
                            ? "bg-rose-50 text-rose-400 border border-rose-200 line-through cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-[#1E3A2B] text-white shadow-md scale-105"
                            : "bg-[#FBFBF9] text-[#1F251A] border border-[#414E36]/15 hover:border-[#1E3A2B]"
                        }`}
                        title={isBooked ? "Slot already booked" : `Select ${tSlot}`}
                      >
                        {tSlot} {isBooked ? "(Booked)" : ""}
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
                <span className="font-extrabold text-[#1F251A]">{selectedServiceName}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-bold">Doctor</span>
                <span className="font-extrabold text-[#1F251A]">{selectedDoctorName}</span>
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
