"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Phone,
  User,
  Mail,
  Clock,
  Briefcase,
  CheckCircle2,
  Package,
  Printer,
  MessageSquare,
  ChevronDown,
  Loader2,
  Search,
  Users,
  Check,
  Building2,
  DoorOpen,
  AlertCircle,
  MapPin,
  Wallet,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { adminTranslations } from "@/components/admin/translations";
import { ALL_15MIN_SLOTS, getServiceDurationMinutes, normaliseTo24hSlot } from "@/lib/services";

interface ServiceItem {
  id: string | number;
  en?: string;
  name?: string;
  title?: string;
  name_en?: string;
  title_en?: string;
  ar?: string;
  price?: number;
  /** Free-text legacy field, e.g. "1:30 Hours". Prefer duration_minutes via getServiceDurationMinutes(). */
  duration?: string;
  duration_minutes?: number | null;
}

interface ProviderItem {
  id: string | number;
  name: string;
  specialty?: string;
  department?: string;
  sub_specialty?: string;
  image?: string;
  schedule?: any;
  working_days?: string[];
  service_ids?: any[];
  serviceIds?: any[];
  services?: any[];
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

interface BranchItem {
  id: string;
  name_en?: string;
  name_ar?: string;
  name?: string;
  service_hours?: any[];
}

interface RoomItem {
  id: string;
  name: string;
  branchId?: string;
  type?: string;
  status?: string;
}

interface AdminNewBookingViewProps {
  onClose: () => void;
  onBookingCreated?: () => void;
  services?: any[];
  providers?: any[];
  customers?: any[];
  branches?: any[];
  rooms?: any[];
  lang?: "en" | "ar";
  t?: any;
  activeBranchId?: string;
}

// Helper to extract service name cleanly. DB rows carry both `en` and `ar` columns —
// prefer the matching-language column when present, falling back to English/any other field.
function getServiceName(s: any, lang: "en" | "ar" = "en"): string {
  if (!s) return "Medical Service";
  if (lang === "ar" && s.ar) return s.ar;
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

function getSlotIndex(t: string | undefined): number {
  const normalized = normaliseTo24hSlot(t);
  return normalized ? ALL_15MIN_SLOTS.indexOf(normalized) : -1;
}

function isSlotInPast(tSlot: string, bookingDateStr: string): boolean {
  if (!bookingDateStr) return false;

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (bookingDateStr < todayISO) return true;
  if (bookingDateStr > todayISO) return false;

  // Same day: compare hour and minute with current time
  const formatted = formatSlotTo12h(tSlot);
  const match = formatted.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const curHours = now.getHours();
  const curMinutes = now.getMinutes();

  if (hours < curHours) return true;
  if (hours === curHours && minutes <= curMinutes) return true;

  return false;
}

function isDoctorAvailableForService(doctor: any, service: any): boolean {
  if (!doctor || !service) return true;

  const serviceIdStr = String(service.id);
  const serviceNameEn = (service.en || service.name || service.title || service.name_en || service.title_en || "").toLowerCase().trim();
  const serviceNameAr = (service.ar || "").toLowerCase().trim();
  const serviceCategory = (service.category || service.cat || "").toLowerCase().trim();

  // 1. Check provider.service_ids / provider.serviceIds / provider.services_ids
  const serviceIds = doctor.service_ids || doctor.serviceIds || doctor.services_ids;
  if (Array.isArray(serviceIds) && serviceIds.length > 0) {
    if (serviceIds.some((id: any) => String(id) === serviceIdStr)) {
      return true;
    }
  }

  // 2. Check provider.services array (can contain service names, titles, or IDs)
  const providerServices = doctor.services || doctor.services_provided;
  if (Array.isArray(providerServices) && providerServices.length > 0) {
    const matches = providerServices.some((s: any) => {
      if (s === null || s === undefined) return false;
      const sStr = String(s).toLowerCase().trim();
      if (!sStr) return false;

      if (sStr === serviceIdStr) return true;
      if (serviceNameEn && (sStr.includes(serviceNameEn) || serviceNameEn.includes(sStr))) return true;
      if (serviceNameAr && (sStr.includes(serviceNameAr) || serviceNameAr.includes(sStr))) return true;
      if (serviceCategory && (sStr.includes(serviceCategory) || serviceCategory.includes(sStr))) return true;

      return false;
    });

    if (matches) return true;
  }

  // 3. Check provider.specialty or provider.department matching category or service name
  const specialty = (doctor.specialty || doctor.department || doctor.sub_specialty || "").toLowerCase().trim();
  if (specialty) {
    if (serviceCategory && (specialty.includes(serviceCategory) || serviceCategory.includes(specialty))) return true;
    if (serviceNameEn && (specialty.includes(serviceNameEn) || serviceNameEn.includes(specialty))) return true;
  }

  // If doctor has no services or specialties configured at all, consider available by default
  const hasConfiguredServices = (Array.isArray(providerServices) && providerServices.length > 0) || (Array.isArray(serviceIds) && serviceIds.length > 0);
  if (!hasConfiguredServices && !specialty) {
    return true;
  }

  return false;
}

export default function AdminNewBookingView({
  onClose,
  onBookingCreated,
  services = [],
  providers = [],
  customers = [],
  branches = [],
  rooms = [],
  lang = "en",
  t,
  activeBranchId
}: AdminNewBookingViewProps) {
  const tr = t || adminTranslations[lang].bookings.adminNewBookingView;
  // Patient Search & Selection State
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [customerList, setCustomerList] = useState<CustomerItem[]>(customers);
  const [allCustomers, setAllCustomers] = useState<CustomerItem[]>(customers);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form State
  const [countryCode, setCountryCode] = useState("+20");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [formErrors, setFormErrors] = useState<{ phone?: boolean; firstName?: boolean; service?: boolean; doctor?: boolean; time?: boolean }>({});

  // Customer Lookup state
  const [patientFound, setPatientFound] = useState<boolean | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<CustomerItem | null>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [usePackageMode, setUsePackageMode] = useState(false);

  // Patient Account Auto-Detection Modal & Additional Fields
  const [showPatientAccountModal, setShowPatientAccountModal] = useState(false);
  const [showAdditionalPatientFields, setShowAdditionalPatientFields] = useState(false);
  const promptedPhoneRef = useRef<string>("");

  // Additional Personal Information (Photos 2 & 3)
  const [gender, setGender] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Address Information
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floorApt, setFloorApt] = useState("");

  // Financial Information (Optional)
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);

  // Appointment Details State
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  });
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [sessionType, setSessionType] = useState<"in_person" | "online">("in_person");
  const [notes, setNotes] = useState<string>("");
  const [customBookingValue, setCustomBookingValue] = useState<number | null>(null);
  const [amountPaidNow, setAmountPaidNow] = useState<number | "">("");

  // DB Lists
  const [dbServices, setDbServices] = useState<ServiceItem[]>(services);
  const [dbDoctors, setDbDoctors] = useState<ProviderItem[]>(providers);
  const [dbBranches, setDbBranches] = useState<BranchItem[]>(branches);
  const [dbRooms, setDbRooms] = useState<RoomItem[]>(rooms);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Load Services, Providers, Customers, Branches & Rooms from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch Services if empty
        if (dbServices.length === 0) {
          const { data: sData } = await supabase.from("services").select("*").order("sort_order", { ascending: true });
          if (sData && sData.length > 0) setDbServices(sData);
        }

        // Fetch Providers if empty
        if (dbDoctors.length === 0) {
          const { data: pData } = await supabase.from("providers").select("*").order("name", { ascending: true });
          if (pData && pData.length > 0) setDbDoctors(pData);
        }

        // Fetch Branches if empty
        if (dbBranches.length === 0) {
          const { data: bData } = await supabase.from("branches").select("*").order("name_en", { ascending: true });
          if (bData && bData.length > 0) setDbBranches(bData);
        }

        // Fetch Rooms from API / Supabase
        if (dbRooms.length === 0) {
          try {
            const res = await fetch("/api/rooms");
            if (res.ok) {
              const rData = await res.json();
              if (Array.isArray(rData) && rData.length > 0) setDbRooms(rData);
            } else {
              const { data: rawRooms } = await supabase.from("rooms").select("*");
              if (rawRooms) setDbRooms(rawRooms);
            }
          } catch (e) {
            const { data: rawRooms } = await supabase.from("rooms").select("*");
            if (rawRooms) setDbRooms(rawRooms);
          }
        }

        // Fetch Customers List from Supabase
        const { data: cData } = await supabase
          .from("customers")
          .select("id, name, first_name, last_name, full_name, mobile, phone, email, whatsapp")
          .order("created_at", { ascending: false })
          .limit(100);
        
        if (cData && cData.length > 0) {
          setAllCustomers(cData);
          setCustomerList(cData);
        } else if (customers.length > 0) {
          setAllCustomers(customers);
          setCustomerList(customers);
        }
      } catch (err) {
        console.error("Error initializing New Booking View data:", err);
      }
    }
    loadData();
  }, []);

  // Update lists when props update
  useEffect(() => {
    if (customers && customers.length > 0 && allCustomers.length === 0) {
      setAllCustomers(customers);
      setCustomerList(customers);
    }
    if (branches && branches.length > 0 && dbBranches.length === 0) {
      setDbBranches(branches);
    }
    if (rooms && rooms.length > 0 && dbRooms.length === 0) {
      setDbRooms(rooms);
    }
  }, [customers, branches, rooms]);

  // Set default selected branch, service & provider
  useEffect(() => {
    if (activeBranchId) {
      setSelectedBranchId(String(activeBranchId));
    } else if (!selectedBranchId && dbBranches.length > 0) {
      setSelectedBranchId(String(dbBranches[0].id));
    }
    if (!selectedServiceId && dbServices.length > 0) {
      setSelectedServiceId(String(dbServices[0].id));
    }
    if (!selectedDoctorId && dbDoctors.length > 0) {
      setSelectedDoctorId(String(dbDoctors[0].id));
    }
  }, [activeBranchId, dbBranches, dbServices, dbDoctors]);

  // Selected service object for doctor filtering
  const currentServiceObj = useMemo(() => {
    return dbServices.find(s => String(s.id) === String(selectedServiceId));
  }, [dbServices, selectedServiceId]);

  // Filter doctors by selected service availability
  const filteredDoctors = useMemo(() => {
    if (!currentServiceObj) return dbDoctors;
    const matched = dbDoctors.filter(d => isDoctorAvailableForService(d, currentServiceObj));
    return matched.length > 0 ? matched : dbDoctors;
  }, [dbDoctors, currentServiceObj]);

  // Sync selectedDoctorId when filteredDoctors list changes
  useEffect(() => {
    if (filteredDoctors.length > 0) {
      const isStillAvailable = filteredDoctors.some(d => String(d.id) === String(selectedDoctorId));
      if (!isStillAvailable) {
        setSelectedDoctorId(String(filteredDoctors[0].id));
      }
    }
  }, [filteredDoctors, selectedDoctorId]);

  // Filter rooms by selected branch
  const filteredRooms = useMemo(() => {
    if (!selectedBranchId) return dbRooms;
    return dbRooms.filter(r => !r.branchId || String(r.branchId) === String(selectedBranchId));
  }, [dbRooms, selectedBranchId]);

  // Sync WhatsApp number if checkboxed
  useEffect(() => {
    if (sameAsPhone) {
      setWhatsapp(phone);
    }
  }, [sameAsPhone, phone]);

  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown & time dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 2. Real-time Customer Search & Filter based on Phone Number field
  useEffect(() => {
    const q = phone.trim().toLowerCase();
    const cleanDigits = phone.replace(/\D/g, "");

    if (!q) {
      setCustomerList(allCustomers);
      return;
    }

    const filtered = allCustomers.filter(c => {
      const nameMatch = (c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).toLowerCase().includes(q);
      const phoneMatch = (c.mobile || c.phone || "").replace(/\D/g, "").includes(cleanDigits);
      const emailMatch = (c.email || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || emailMatch;
    });

    setCustomerList(filtered);
    if (filtered.length === 0) {
      setShowCustomerDropdown(false);
    }

    // Auto-prompt Patient Account Modal if phone number length is >= 10 and not found in database
    if (cleanDigits.length >= 10) {
      const exactMatch = allCustomers.find(c => {
        const cPhone = (c.mobile || c.phone || "").replace(/\D/g, "");
        return cPhone && (cPhone === cleanDigits || cPhone.endsWith(cleanDigits) || cleanDigits.endsWith(cPhone));
      });

      if (!exactMatch && promptedPhoneRef.current !== cleanDigits) {
        promptedPhoneRef.current = cleanDigits;
        setFoundCustomer(null);
        setPatientFound(false);
        setShowPatientAccountModal(true);
      } else if (exactMatch && !foundCustomer) {
        handleSelectCustomer(exactMatch);
      }
    }
  }, [phone, allCustomers]);

  // Handle Select Customer from List
  async function handleSelectCustomer(cust: any) {
    setFoundCustomer(cust);
    setPatientFound(true);
    const p = cust.mobile || cust.phone || "";
    setPhone(p);
    promptedPhoneRef.current = p.replace(/\D/g, "");
    setShowPatientAccountModal(false);

    const fName = cust.first_name || cust.name?.split(" ")[0] || cust.full_name?.split(" ")[0] || "";
    const lName = cust.last_name || cust.name?.split(" ").slice(1).join(" ") || cust.full_name?.split(" ").slice(1).join(" ") || "";

    setFirstName(fName);
    setLastName(lName);
    setEmail(cust.email || "");
    setWhatsapp(cust.whatsapp || p);
    setPatientSearchQuery(`${cust.name || cust.full_name || `${fName} ${lName}`}`.trim());
    setShowCustomerDropdown(false);

    // Populate additional fields if present on customer object
    if (cust.gender) setGender(cust.gender);
    if (cust.national_id) setNationalId(cust.national_id);
    if (cust.age) setAge(String(cust.age));
    if (cust.occupation) setOccupation(cust.occupation);
    if (cust.referral || cust.referral_source) setReferralSource(cust.referral || cust.referral_source);
    if (cust.area || cust.city || cust.location_name) setCity(cust.area || cust.city || cust.location_name);
    if (cust.street_name || cust.street) setStreet(cust.street_name || cust.street);
    if (cust.building_no || cust.building) setBuilding(cust.building_no || cust.building);
    if (cust.floor_no || cust.floor_apt) setFloorApt(cust.floor_no || cust.floor_apt);
    if (cust.wallet_balance !== undefined) setWalletBalance(Number(cust.wallet_balance) || 0);
    if (cust.spent_amount !== undefined || cust.total_spent !== undefined) setTotalSpent(Number(cust.spent_amount ?? cust.total_spent) || 0);
    if (cust.outstanding !== undefined || cust.outstanding_balance !== undefined) setOutstandingBalance(Number(cust.outstanding ?? cust.outstanding_balance) || 0);

    if (cust.gender || cust.national_id || cust.age || cust.occupation || cust.area || cust.street_name) {
      setShowAdditionalPatientFields(true);
    }

    // Fetch active packages for this customer
    try {
      const { data: pkgData } = await supabase
        .from("customer_packages")
        .select("*, customer_package_items(*)")
        .eq("customer_id", cust.id)
        .eq("status", "active");

      if (pkgData && pkgData.length > 0) {
        const firstPkg = pkgData[0];
        const items = firstPkg.customer_package_items || [];
        const totalRemaining = items.reduce((sum: number, it: any) => sum + (it.qty_remaining || 0), 0);
        if (totalRemaining > 0) {
          setActivePackage({
            name: firstPkg.package_name || "Session Package",
            remaining: totalRemaining,
            expiresOn: firstPkg.expires_at ? new Date(firstPkg.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"
          });
        } else {
          setActivePackage(null);
        }
      } else {
        setActivePackage(null);
      }
    } catch (e) {
      console.error("Error loading customer package:", e);
    }
  }

  const selectedServiceObj = dbServices.find(s => String(s.id) === String(selectedServiceId)) || dbServices[0];
  const selectedDoctorObj = dbDoctors.find(d => String(d.id) === String(selectedDoctorId)) || dbDoctors[0];
  const selectedBranchObj = dbBranches.find(b => String(b.id) === String(selectedBranchId)) || dbBranches[0];

  const weekdayName = useMemo(() => {
    if (!bookingDate) return "";
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return weekdays[new Date(bookingDate).getDay()];
  }, [bookingDate]);

  // Check if branch is closed on the selected weekday
  const isBranchClosedToday = useMemo(() => {
    if (!weekdayName || !selectedBranchObj?.service_hours) return false;
    const sh = selectedBranchObj.service_hours.find((s: any) => s.day?.toLowerCase() === weekdayName.toLowerCase());
    return sh ? sh.isOpen === false : false;
  }, [selectedBranchObj, weekdayName]);

  // Check if doctor is closed on the selected weekday
  const isDoctorClosedToday = useMemo(() => {
    if (!weekdayName || !selectedDoctorObj) return false;
    if (selectedDoctorObj.schedule) {
      const dDay = selectedDoctorObj.schedule[weekdayName] || selectedDoctorObj.schedule[weekdayName.toLowerCase()];
      if (dDay && dDay.isOpen === false) return true;
    }
    if (Array.isArray(selectedDoctorObj.working_days) && selectedDoctorObj.working_days.length > 0) {
      const works = selectedDoctorObj.working_days.some((wd: string) => wd.toLowerCase() === weekdayName.toLowerCase());
      if (!works) return true;
    }
    return false;
  }, [selectedDoctorObj, weekdayName]);

  // 3. Dynamic Real Time Slots Calculation (Combining API & Provider Working Hours + Booked Slots)
  useEffect(() => {
    async function fetchActualTimeSlots() {
      setLoadingSlots(true);

      // If branch or doctor is closed on this day, no available slots
      if (isBranchClosedToday || isDoctorClosedToday) {
        setAllTimeSlots([]);
        setAvailableTimeSlots([]);
        setSelectedTimes([]);
        setBookedTimeSlots([]);
        setLoadingSlots(false);
        return;
      }

      const booked: string[] = [];
      try {
        // Query existing reservations for selected date & doctor to calculate booked slots
        if (bookingDate) {
          let qRes = supabase
            .from("reservations")
            .select("time_slot, requested_time, start_time")
            .eq("date", bookingDate)
            .neq("status", "cancelled")
            .neq("status", "rejected");

          if (selectedDoctorId) {
            qRes = qRes.eq("provider_id", selectedDoctorId);
          }

          const { data: resData } = await qRes;
          if (resData) {
            resData.forEach((r: any) => {
              const start = r.time_slot || r.requested_time || r.start_time || "";
              const startIndex = getSlotIndex(start);
              if (startIndex < 0) return;

              const durationMinutes = getServiceDurationMinutes(
                dbServices.find((service) => String(service.id) === String(r.service_id))
              );
              const slotsNeeded = Math.max(1, Math.ceil(durationMinutes / 15));
              for (let slotOffset = 0; slotOffset < slotsNeeded; slotOffset += 1) {
                const occupiedSlot = ALL_15MIN_SLOTS[startIndex + slotOffset];
                if (occupiedSlot) booked.push(normalizeTimeSlot(occupiedSlot));
              }
            });
          }
        }
        setBookedTimeSlots(Array.from(new Set(booked)));

        // Try /api/availability endpoint
        const params = new URLSearchParams();
        if (selectedServiceId) params.append("serviceId", String(selectedServiceId));
        if (bookingDate) params.append("date", bookingDate);
        if (selectedBranchId) params.append("branchId", String(selectedBranchId));
        if (selectedDoctorId) params.append("doctorId", String(selectedDoctorId));
        params.append("sessionType", sessionType);

        const res = await fetch(`/api/availability?${params.toString()}`);
        if (res.ok) {
          const apiData = await res.json();
          let rawAvailableSlots: string[] = [];
          let rawUnavailableSlots: string[] = [];
          if (Array.isArray(apiData)) {
            rawAvailableSlots = apiData.map(formatSlotTo12h);
          } else if (apiData && typeof apiData === "object") {
            const availableList = apiData[bookingDate]?.availableSlots || apiData.availableSlots || apiData.slots;
            const unavailableList = apiData[bookingDate]?.unavailableSlots || apiData.unavailableSlots;
            if (Array.isArray(availableList)) rawAvailableSlots = availableList.map(formatSlotTo12h);
            if (Array.isArray(unavailableList)) rawUnavailableSlots = unavailableList.map(formatSlotTo12h);
          }

          const displaySlots = Array.from(new Set([...rawAvailableSlots, ...rawUnavailableSlots]))
            .filter((slot) => !isSlotInPast(slot, bookingDate))
            .sort((a, b) => getSlotIndex(a) - getSlotIndex(b));
          const validFutureSlots = rawAvailableSlots.filter((slot) => {
            const isPast = isSlotInPast(slot, bookingDate);
            const isBooked = booked.includes(normalizeTimeSlot(slot));
            return !isPast && !isBooked;
          });

          setAllTimeSlots(displaySlots);
          setAvailableTimeSlots(validFutureSlots);
          setSelectedTimes((prev) => {
            const stillValid = prev.filter(s => validFutureSlots.includes(s));
            if (stillValid.length > 0) return [stillValid[0]];
            return validFutureSlots.length > 0 ? [validFutureSlots[0]] : [];
          });
          setLoadingSlots(false);
          return;
        }
      } catch (e) {
        console.warn("API availability fetch fallback:", e);
      }

      // Standard doctor shifts fallback with strict past and booked filtering
      const shiftRanges = [
        { start: "09:00", end: "14:00" },
        { start: "17:00", end: "21:00" }
      ];
      const serviceDurationMinutes = getServiceDurationMinutes(selectedServiceObj);
      const slotsNeeded = Math.max(1, Math.ceil(serviceDurationMinutes / 15));
      const generated = ALL_15MIN_SLOTS
        .filter((slot) => shiftRanges.some((range) => slot >= range.start && slot < range.end))
        .map(formatSlotTo12h);
      const validFallbackSlots = generated.filter((slot) => {
        const startIndex = getSlotIndex(slot);
        const start24 = normaliseTo24hSlot(slot);
        const lastRequiredSlot = ALL_15MIN_SLOTS[startIndex + slotsNeeded - 1];
        const fitsShift = Boolean(start24 && lastRequiredSlot) && shiftRanges.some(
          (range) => start24 !== null && lastRequiredSlot !== undefined && start24 >= range.start && lastRequiredSlot < range.end
        );
        if (!fitsShift || isSlotInPast(slot, bookingDate)) return false;

        for (let slotOffset = 0; slotOffset < slotsNeeded; slotOffset += 1) {
          const requiredSlot = ALL_15MIN_SLOTS[startIndex + slotOffset];
          if (!requiredSlot || booked.includes(normalizeTimeSlot(requiredSlot))) return false;
        }
        return true;
      });

      setAllTimeSlots(generated.filter((slot) => !isSlotInPast(slot, bookingDate)));
      setAvailableTimeSlots(validFallbackSlots);
      setSelectedTimes((prev) => {
        const stillValid = prev.filter(s => validFallbackSlots.includes(s));
        if (stillValid.length > 0) return [stillValid[0]];
        return validFallbackSlots.length > 0 ? [validFallbackSlots[0]] : [];
      });
      setLoadingSlots(false);
    }

    fetchActualTimeSlots();
  }, [bookingDate, selectedDoctorId, selectedServiceId, selectedBranchId, sessionType, isBranchClosedToday, isDoctorClosedToday]);

  const toggleTimeSlot = (slot: string) => {
    if (!availableTimeSlots.includes(slot) || bookedTimeSlots.includes(normalizeTimeSlot(slot))) return;
    setFormErrors((prev) => ({ ...prev, time: false }));
    setSelectedTimes((prev) => (prev[0] === slot ? [] : [slot]));
  };

  const handleClearSlots = () => {
    setSelectedTimes([]);
  };

  const selectedServiceName = getServiceName(selectedServiceObj, lang);
  const selectedDoctorName = selectedDoctorObj?.name || "Doctor";
  const selectedBranchName = selectedBranchObj?.name_en || selectedBranchObj?.name || selectedBranchObj?.name_ar || "Clinic Branch";
  const selectedRoomName = dbRooms.length > 0 ? (dbRooms[0]?.name || "Room 1 (Auto)") : "Room 1 (Auto)";

  const fullPatientName = `${firstName} ${lastName}`.trim() || "Patient Name";

  const baseServicePrice = Number(selectedServiceObj?.price || 0);
  const autoBookingValue = baseServicePrice * Math.max(1, selectedTimes.length);
  const bookingValue = customBookingValue !== null && customBookingValue !== undefined ? Number(customBookingValue) : autoBookingValue;
  const numAmountPaid = typeof amountPaidNow === "number" ? amountPaidNow : 0;
  const remainingValue = bookingValue - numAmountPaid;
  const selectedTime = selectedTimes[0] || "";
  const totalDurationMinutes = getServiceDurationMinutes(selectedServiceObj);
  const requiredSlotCount = Math.max(1, Math.ceil(totalDurationMinutes / 15));

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

  const handleOpenSummaryModal = () => {
    setFormErrors({});
    if (!phone || !firstName) {
      setFormErrors({ phone: !phone, firstName: !firstName });
      alert(tr.phoneFirstNameAlert);
      return;
    }
    if (!selectedServiceId) {
      setFormErrors({ service: true });
      alert(tr.selectServiceAlert);
      return;
    }
    if (!selectedDoctorId) {
      setFormErrors({ doctor: true });
      alert(tr.selectDoctorAlert);
      return;
    }
    if (isBranchClosedToday) {
      alert(tr.branchClosedAlert || `The branch is closed on ${weekdayName}s. Please choose an open date.`);
      return;
    }
    if (isDoctorClosedToday) {
      alert(tr.doctorUnavailableAlert || `${selectedDoctorName} is not available on ${weekdayName}s. Please choose another date or doctor.`);
      return;
    }
    if (selectedTimes.length === 0) {
      setFormErrors({ time: true });
      alert(tr.selectTimeAlert || "Please select at least one available time slot.");
      return;
    }
    const hasPast = selectedTimes.some(slot => isSlotInPast(slot, bookingDate));
    if (hasPast) {
      alert(tr.slotInPastAlert || "One or more selected time slots have already passed. Please select future time slots.");
      return;
    }
    const hasBooked = selectedTimes.some(slot => bookedTimeSlots.includes(normalizeTimeSlot(slot)));
    if (hasBooked) {
      alert(tr.slotAlreadyBookedAlert || "One or more selected time slots are already booked. Please choose other slots.");
      return;
    }
    setShowConfirmModal(true);
  };

  // Submission Handler connecting to POST /api/reservations + Direct Supabase fallback
  const handleCreateBooking = async (action: "normal" | "print" | "whatsapp" = "normal") => {
    if (!phone || !firstName) {
      alert(tr.phoneFirstNameAlert);
      return;
    }

    setSubmitting(true);
    try {
      let resolvedCustomerId = foundCustomer?.id || null;

      // If customer is not found in DB, auto-create customer profile with all collected fields
      if (!resolvedCustomerId && (firstName || phone)) {
        try {
          const custPayload = {
            name: fullPatientName,
            first_name: firstName,
            last_name: lastName,
            mobile: phone,
            email: email || null,
            gender: gender || null,
            national_id: nationalId || null,
            age: age ? Number(age) : null,
            occupation: occupation || null,
            referral: referralSource || null,
            area: city || null,
            street_name: street || null,
            building_no: building || null,
            floor_no: floorApt || null,
            wallet_balance: Number(walletBalance || 0),
            spent_amount: Number(totalSpent || 0),
            outstanding: Number(outstandingBalance || 0)
          };

          const createCustRes = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(custPayload)
          });

          if (createCustRes.ok) {
            const newCust = await createCustRes.json();
            if (newCust && newCust.id) {
              resolvedCustomerId = newCust.id;
            }
          }
        } catch (custErr) {
          console.warn("Auto-create customer error (non-fatal):", custErr);
        }
      }

      const payload = {
        name: fullPatientName,
        phone: phone,
        email: email || null,
        serviceId: selectedServiceObj?.id,
        doctorId: selectedDoctorObj?.id,
        branchId: selectedBranchObj?.id || null,
        roomId: selectedRoomId || null,
        date: bookingDate,
        requestedTime: selectedTime,
        sessionType: sessionType === "in_person" ? "in_person" : "online",
        notes: notes || null,
        isManual: true,
        status: "approved",
        explicitCustomerId: resolvedCustomerId,
        amountPaid: numAmountPaid,
        amountLeft: Math.max(0, remainingValue)
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = (errData as any)?.error || (errData as any)?.message || tr.bookingFailedAlert;
        alert(errMsg);
        return;
      }

      if (action === "print") {
        window.print();
      } else if (action === "whatsapp") {
        const msg = encodeURIComponent(
          `Hello ${fullPatientName}, your appointment for ${selectedServiceName} at ${selectedBranchName} with ${selectedDoctorName} is confirmed for ${formattedDateStr} at ${selectedTime}.`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
      }

      if (onBookingCreated) onBookingCreated();
      onClose();
    } catch (err) {
      console.error("Booking creation error:", err);
      alert(tr.bookingCreationFailedAlert);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn text-[#1F251A]">
      
      {/* ── TOP PAGE HEADER ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#414E36]/10 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1F251A]">{tr.title}</h1>
          <p className="text-xs md:text-sm font-semibold text-[#5A6A51] mt-0.5">{tr.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] hover:bg-[#414E36] hover:text-white transition flex items-center justify-center text-[#1F251A]"
          title={tr.closeTitle}
        >
          <X size={20} />
        </button>
      </div>

      {/* ── MAIN FORM & LAYOUT ── */}
      <div className={activePackage ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>

        {/* MAIN FORM */}
        <div className={activePackage ? "lg:col-span-2 space-y-6" : "space-y-6"}>

          {/* CARD 1: PATIENT INFORMATION */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#414E36]/10 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-black">
                  1
                </span>
                <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-emerald-800">
                  {tr.patientInfoHeading}
                </h2>
              </div>

              {/* Patient Status Indicator & Toggle Button */}
              <div className="flex items-center gap-2 flex-wrap">
                {patientFound === true && (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={15} className="text-emerald-600" /> {tr.patientFoundBadge}
                  </span>
                )}
                {patientFound === false && (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-700">
                    {tr.newPatientBadge}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowAdditionalPatientFields(!showAdditionalPatientFields)}
                  className="text-xs font-bold text-[#0F3826] hover:underline bg-[#EBF2EB] px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <User size={13} />
                  <span>{showAdditionalPatientFields ? "Hide Account Details" : "+ Patient Account Details"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              {/* Phone Input with Country Code & Integrated Patients Dropdown */}
              <div className="relative" ref={phoneDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#1F251A]">{tr.phoneLabel}</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (showCustomerDropdown) {
                        setShowCustomerDropdown(false);
                      } else {
                        setCustomerList(allCustomers);
                        setShowCustomerDropdown(true);
                      }
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Users size={13} />
                    <span>{showCustomerDropdown ? tr.hidePatientsListBtn : tr.browsePatientsBtn}</span>
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className={`flex items-center rounded-2xl border bg-white overflow-hidden shadow-xs focus-within:border-emerald-700 ${
                  formErrors.phone ? "border-red-500 ring-2 ring-red-200" : "border-[#414E36]/20"
                }`}>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#FBFBF9] border-e border-[#414E36]/10 font-bold text-[#1F251A]">
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
                    onFocus={() => {
                      if (customerList.length > 0) setShowCustomerDropdown(true);
                    }}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (e.target.value) setFormErrors((prev) => ({ ...prev, phone: false }));
                      if (customerList.length > 0) setShowCustomerDropdown(true);
                    }}
                    placeholder={tr.phonePlaceholder}
                    className="w-full px-3.5 py-2.5 font-mono text-[#1F251A] outline-none font-bold placeholder:text-gray-400 placeholder:font-sans"
                  />
                  {phone ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPhone("");
                        setFoundCustomer(null);
                        setPatientFound(null);
                        setShowCustomerDropdown(false);
                      }}
                      className="pe-3 text-[#5A6A51] hover:text-[#1F251A]"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
                {formErrors.phone && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{tr.requiredField}</p>
                )}

                {/* Scrollable Floating Customer List Dropdown */}
                {showCustomerDropdown && customerList.length > 0 && (
                  <div className="absolute start-0 end-0 top-full mt-1 z-[100] max-h-64 overflow-y-auto bg-white rounded-2xl border border-[#414E36]/20 shadow-2xl p-2 space-y-1">
                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#5A6A51] bg-[#FBFBF9] rounded-xl flex justify-between items-center mb-1">
                      <span>{tr.databasePatientsPrefix} ({customerList.length})</span>
                      <button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-[#1F251A] font-bold text-xs">{tr.closeBtn}</button>
                    </div>
                    
                    {customerList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#5A6A51] font-semibold">
                        {tr.noMatchingPatients}
                      </div>
                    ) : (
                      customerList.map((c) => {
                        const cName = c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || tr.patientAccountFallback;
                        const cPhone = c.mobile || c.phone || tr.noPhoneLabel;
                        const isSelected = foundCustomer?.id === c.id;

                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between border-b border-gray-100 last:border-0 ${
                              isSelected ? "bg-emerald-100/70 border-emerald-300" : "hover:bg-emerald-50/70"
                            }`}
                          >
                            <div>
                              <span className="font-extrabold text-[#1F251A] text-xs block">{cName}</span>
                              <span className="text-[11px] font-mono text-[#5A6A51]">
                                {cPhone} {c.email ? `• ${c.email}` : ""}
                              </span>
                            </div>
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-xl flex items-center gap-1 ${
                              isSelected ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {isSelected ? <Check size={12} /> : null}
                              {isSelected ? tr.selectedBadge : tr.selectBadge}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* First Name & Last Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.firstNameLabel}</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (e.target.value) setFormErrors((prev) => ({ ...prev, firstName: false }));
                    }}
                    placeholder={tr.firstNamePlaceholder}
                    className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 ${
                      formErrors.firstName ? "border-red-500 ring-2 ring-red-200" : "border-[#414E36]/20"
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">{tr.requiredField}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.lastNameLabel}</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={tr.lastNamePlaceholder}
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Email & WhatsApp Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.emailLabel}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={tr.emailPlaceholder}
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-semibold text-[#1F251A] outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.whatsappLabel}</label>
                  <div className="space-y-2">
                    <input
                      type="tel"
                      disabled={sameAsPhone}
                      value={sameAsPhone ? phone : whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder={tr.whatsappPlaceholder}
                      className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-mono text-[#1F251A] outline-none disabled:bg-[#FBFBF9]"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#5A6A51]">
                      <input
                        type="checkbox"
                        checked={sameAsPhone}
                        onChange={(e) => setSameAsPhone(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span>{tr.sameAsPhoneLabel}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── ADDITIONAL PATIENT INTAKE DATA (Photos 2 & 3) ── */}
              {showAdditionalPatientFields && (
                <div className="space-y-4 pt-4 border-t border-[#414E36]/10 animate-fadeIn">
                  {/* Row 1: Gender & National ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">Gender</label>
                      <div className="relative">
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700 appearance-none text-xs"
                        >
                          <option value="">Select Gender</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                        </select>
                        <ChevronDown size={14} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">National ID</label>
                      <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="Enter 14-digit National ID"
                        maxLength={14}
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 2: Referral Source & Occupation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">Referral Source</label>
                      <div className="relative">
                        <select
                          value={referralSource}
                          onChange={(e) => setReferralSource(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700 appearance-none text-xs"
                        >
                          <option value="">Select Referral Source...</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Friend/Family">Friend / Family</option>
                          <option value="TikTok">TikTok</option>
                          <option value="Google Search">Google Search</option>
                          <option value="Walk-in">Walk-in</option>
                          <option value="Doctor Referral">Doctor Referral</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown size={14} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">Occupation</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="e.g. Engineer, Doctor"
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 3: Age (Photo 3) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 28"
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* ADDRESS INFORMATION SECTION (Photo 2) */}
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center gap-2 text-[#0F3826] font-black text-xs uppercase tracking-wider">
                      <div className="h-6 w-6 rounded-full bg-[#EBF2EB] flex items-center justify-center text-[#0F3826]">
                        <MapPin size={13} />
                      </div>
                      <span>ADDRESS INFORMATION</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">City / Area</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. New Cairo"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">Street</label>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="e.g. 90th Street"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">Building</label>
                        <input
                          type="text"
                          value={building}
                          onChange={(e) => setBuilding(e.target.value)}
                          placeholder="e.g. Building 14"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">Floor / Apt</label>
                        <input
                          type="text"
                          value={floorApt}
                          onChange={(e) => setFloorApt(e.target.value)}
                          placeholder="e.g. Floor 3, Apt 6"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FINANCIAL INFORMATION SECTION (OPTIONAL - Photo 2) */}
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center gap-2 text-[#0F3826] font-bold text-xs">
                      <div className="h-6 w-6 rounded-full bg-[#EBF2EB] flex items-center justify-center text-[#0F3826]">
                        <Wallet size={13} />
                      </div>
                      <span>Financial Information (Optional)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">Wallet Balance (EGP)</label>
                        <input
                          type="number"
                          value={walletBalance}
                          onChange={(e) => setWalletBalance(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">Total Spent (EGP)</label>
                        <input
                          type="number"
                          value={totalSpent}
                          onChange={(e) => setTotalSpent(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">Outstanding Balance (EGP)</label>
                        <input
                          type="number"
                          value={outstandingBalance}
                          onChange={(e) => setOutstandingBalance(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  {tr.appointmentDetailsHeading}
                </h2>
              </div>
            </div>

            <div className="space-y-5 text-xs md:text-sm">
              {/* Service, Doctor, Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.serviceLabel}</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value);
                      if (e.target.value) setFormErrors((prev) => ({ ...prev, service: false }));
                    }}
                    className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700 ${
                      formErrors.service ? "border-red-500 ring-2 ring-red-200" : "border-[#414E36]/20"
                    }`}
                  >
                    {dbServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {getServiceName(s, lang)}
                      </option>
                    ))}
                  </select>
                  {formErrors.service && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">{tr.requiredField}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.doctorLabel}</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      if (e.target.value) setFormErrors((prev) => ({ ...prev, doctor: false }));
                    }}
                    className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700 ${
                      formErrors.doctor ? "border-red-500 ring-2 ring-red-200" : "border-[#414E36]/20"
                    }`}
                  >
                    {filteredDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {formErrors.doctor && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">{tr.requiredField}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#1F251A] mb-1.5">{tr.dateLabel}</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* ── 1. AVAILABLE TIME (MULTI-SLOT SELECTION) ── */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-2">{tr.availableTimeLabel}</label>
                <div ref={timeDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTimeDropdown((open) => !open)}
                    aria-expanded={showTimeDropdown}
                    className={`w-full max-w-md rounded-2xl border-2 bg-[var(--cr-white)] px-4 py-3.5 flex items-center gap-3 text-sm font-extrabold text-[var(--cr-dark)] transition ${
                      formErrors.time ? "border-red-500 ring-2 ring-red-200" : "border-[var(--cr-primary)] hover:bg-white"
                    }`}
                  >
                    <Clock size={22} className="text-[var(--cr-primary)] shrink-0" />
                    <span className="flex-1 text-start">
                      {selectedTime || tr.showAvailableTimeLabel}
                    </span>
                    <ChevronDown size={22} className={`text-[var(--cr-primary)] transition-transform ${showTimeDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {showTimeDropdown && (
                    <div className="absolute start-0 end-0 top-full z-40 mt-4 rounded-2xl border border-[var(--cr-primary)]/15 bg-white p-5 shadow-xl sm:max-w-4xl">
                      <span className="absolute -top-3 start-8 h-6 w-6 rotate-45 border-l border-t border-[var(--cr-primary)]/15 bg-white" />
                      <div className="relative space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-lg font-black text-[var(--cr-dark)]">{tr.availableTimeHeading}</h3>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <span className="text-sm font-semibold text-[var(--cr-secondary)]">
                              {totalDurationMinutes} {tr.minutesPerSlotLabel}
                            </span>
                            {selectedTimes.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearSlots}
                                className="rounded-xl bg-[var(--cr-secondary)] px-3.5 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                              >
                                {tr.clearSlotsBtn}
                              </button>
                            )}
                          </div>
                        </div>

                        {loadingSlots ? (
                          <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-[#5A6A51]">
                            <Loader2 size={18} className="animate-spin text-emerald-700" /> {tr.fetchingSlotsLabel}
                          </div>
                        ) : allTimeSlots.length > 0 ? (
                          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${
                            formErrors.time ? "rounded-2xl border border-red-500 p-2 ring-2 ring-red-200" : ""
                          }`}>
                            {allTimeSlots.map((tSlot) => {
                              const isSelected = selectedTime === tSlot;
                              const selectedStartIndex = getSlotIndex(selectedTime);
                              const currentSlotIndex = getSlotIndex(tSlot);
                              const isInsideSelectedService = selectedStartIndex >= 0
                                && currentSlotIndex > selectedStartIndex
                                && currentSlotIndex < selectedStartIndex + requiredSlotCount;
                              const isBooked = bookedTimeSlots.includes(normalizeTimeSlot(tSlot));
                              const isAvailableStart = availableTimeSlots.includes(tSlot) && !isBooked;
                              const isDisabled = !isAvailableStart || isInsideSelectedService;

                              return (
                                <button
                                  key={tSlot}
                                  type="button"
                                  disabled={isDisabled && !isSelected}
                                  onClick={() => toggleTimeSlot(tSlot)}
                                  title={isDisabled && !isSelected ? tr.slotUnavailableTitle : undefined}
                                  className={`min-h-16 rounded-2xl border px-3.5 py-3 text-sm font-extrabold transition flex items-center justify-between gap-2 select-none ${
                                    isSelected
                                      ? "border-[var(--cr-primary)] bg-[var(--cr-primary)] text-white shadow-sm ring-2 ring-emerald-700/20"
                                      : isDisabled
                                      ? "cursor-not-allowed border-[var(--cr-divider)] bg-[var(--cr-white)] text-[var(--cr-secondary)] opacity-70"
                                      : "cursor-pointer border-[var(--cr-divider)] bg-white text-[var(--cr-dark)] hover:border-[var(--cr-primary)] hover:bg-[var(--cr-secondary)]"
                                  }`}
                                >
                                  <span>{tSlot}</span>
                                  {isSelected ? (
                                    <Check size={20} className="shrink-0 text-white" />
                                  ) : (
                                    <Clock size={20} className="shrink-0 text-[var(--cr-secondary)]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50 p-3.5 text-xs text-amber-900">
                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                            <span className="font-bold">
                              {isBranchClosedToday
                                ? (tr.branchClosedAlert || `${selectedBranchName} is closed on ${weekdayName}s. Please choose an open date.`)
                                : isDoctorClosedToday
                                ? (tr.doctorUnavailableAlert || `${selectedDoctorName} is not available on ${weekdayName}s. Please choose another date or doctor.`)
                                : (tr.noSlotsAvailableWarning || "No available time slots on this date (clinic is closed or all slots are booked/past). Please choose another date.")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {formErrors.time && (
                  <p className="mt-1.5 text-[11px] font-bold text-red-600">{tr.selectTimeAlert || "Please select an available time slot."}</p>
                )}
              </div>

              {/* ── 2. SESSION TYPE (IN PERSON VS ONLINE) ── */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-2">{tr.sessionTypeLabel}</label>
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
                    <span className="font-extrabold text-[#1F251A]">{tr.inPersonLabel}</span>
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
                    <span className="font-extrabold text-[#1F251A]">{tr.onlineLabel}</span>
                  </label>
                </div>
              </div>

              {/* Notes (Optional) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-[#1F251A]">{tr.notesLabel}</label>
                  <span className="text-[11px] text-[#5A6A51] font-mono">{notes.length} / 200</span>
                </div>
                <textarea
                  maxLength={200}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={tr.notesPlaceholder}
                  className="w-full rounded-2xl border border-[#414E36]/20 bg-white p-3.5 text-xs text-[#1F251A] outline-none focus:border-emerald-700"
                />
              </div>

              {/* ── 3. FINANCIAL FIELDS (BOOKING VALUE & AMOUNT PAID NOW) ── */}
              <div className="pt-2 border-t border-[#414E36]/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Booking Value */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="font-bold text-[#1F251A]">{tr.bookingValueLabel || "Booking Value"}</label>
                      <span className="text-[11px] text-[#5A6A51] font-mono">{tr.egpLabel || "EGP"}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={bookingValue === 0 ? "" : bookingValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomBookingValue(val === "" ? 0 : Math.max(0, Number(val)));
                        }}
                        placeholder="0"
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white p-3.5 text-xs font-bold text-[#1F251A] outline-none focus:border-emerald-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Amount Paid Now */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="font-bold text-[#1F251A]">{tr.amountPaidLabel || "Amount Paid Now"}</label>
                      <span className="text-[11px] text-[#5A6A51] font-mono">{tr.egpLabel || "EGP"}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={amountPaidNow === 0 ? "" : amountPaidNow}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountPaidNow(val === "" ? "" : Math.max(0, Number(val)));
                        }}
                        placeholder="0"
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white p-3.5 text-xs font-bold text-[#1F251A] outline-none focus:border-emerald-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Remaining Balance Calculation Callout */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FBFBF9] border border-[#414E36]/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#5A6A51]">{tr.remainingValueLabel || "Remaining Value"}:</span>
                    <span className="text-[11px] text-[#5A6A51]">({tr.bookingValueLabel || "Booking Value"} - {tr.actualPaidLabel || "Actual Paid"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${remainingValue > 0 ? "text-amber-800" : remainingValue < 0 ? "text-blue-800" : "text-emerald-800"}`}>
                      {remainingValue} {tr.egpLabel || "EGP"}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      remainingValue === 0 
                        ? "bg-emerald-100 text-emerald-800" 
                        : remainingValue > 0 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {remainingValue === 0 ? (tr.fullySettledBadge || "Fully Settled") : remainingValue > 0 ? (tr.dueOnVisitBadge || "Due on Visit") : (tr.creditBalanceBadge || "Credit Balance")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVE PACKAGE (1/3 width, if active package exists) */}
        {activePackage && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-emerald-700/20 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <Package size={18} />
                <h3 className="font-extrabold text-sm">{tr.activePackageHeading}</h3>
              </div>

              <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#414E36]/10 space-y-3">
                <h4 className="font-extrabold text-xs text-[#1F251A]">{activePackage.name}</h4>
                <div className="flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[#5A6A51] block font-bold">{tr.remainingLabel}</span>
                    <span className="font-black text-emerald-700 text-xs">{activePackage.remaining} {tr.sessionsSuffix}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-[#5A6A51] block font-bold">{tr.expiresOnLabel}</span>
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
                  {usePackageMode ? tr.packageAppliedLabel : tr.usePackageBtn}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM ACTIONS BAR ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#414E36]/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-[#414E36]/20 bg-white font-bold text-xs text-[#1F251A] hover:bg-[#FBFBF9] transition"
        >
          {tr.cancelBtn}
        </button>

        {/* Single Full Create Booking Button */}
        <button
          type="button"
          disabled={submitting || selectedTimes.length === 0 || isBranchClosedToday || isDoctorClosedToday || availableTimeSlots.length === 0}
          onClick={handleOpenSummaryModal}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#1E3A2B] text-white font-extrabold text-xs hover:bg-[#162C20] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          <span>{tr.createBookingBtn}</span>
        </button>
      </div>

      {/* ── BOOKING SUMMARY CONFIRMATION POPUP MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#414E36]/15 space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div className="flex items-center gap-2.5 text-[#1E3A2B]">
                <div className="h-9 w-9 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-800 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1F251A]">{tr.confirmModalTitle}</h3>
                  <p className="text-[11px] text-[#5A6A51] font-medium">{tr.confirmModalSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Details Grid */}
            <div className="bg-[#FBFBF9] rounded-2xl p-4 border border-[#414E36]/10 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.patientNameLabel}</span>
                <span className="font-extrabold text-[#1F251A] text-end">{fullPatientName}</span>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.phoneNumberLabel}</span>
                <span className="font-mono font-bold text-[#1F251A] text-end">{phone}</span>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.serviceLabel.replace(" *", "")}</span>
                <span className="font-extrabold text-[#1F251A] text-end">{selectedServiceName}</span>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.doctorLabel.replace(" *", "")}</span>
                <span className="font-extrabold text-[#1F251A] text-end">{selectedDoctorName}</span>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.branchLabel ? tr.branchLabel.replace(" *", "") : "Branch"}</span>
                <span className="font-extrabold text-[#1F251A] text-end">
                  {selectedBranchName}
                </span>
              </div>

              <div className="flex justify-between items-start pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.dateTimeLabel}</span>
                <div className="text-end">
                  <span className="font-extrabold text-emerald-800 block">
                    {formattedDateStr}
                  </span>
                  <span className="text-[11px] font-bold text-[#1F251A] block mt-0.5">
                    {selectedTime} ({totalDurationMinutes} {tr.minutesLabel})
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                <span className="text-[#5A6A51] font-semibold">{tr.sessionTypeLabel.replace(" *", "")}</span>
                <span className="font-bold text-[#1F251A] text-end">
                  {sessionType === "in_person" ? tr.inPersonLabel : tr.onlineLabel}
                </span>
              </div>

              {usePackageMode ? (
                <div className="flex justify-between items-center pt-0.5 text-emerald-800 font-extrabold">
                  <span>{tr.pricePaymentLabel}</span>
                  <span>{tr.activePackagePriceLabel}</span>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center font-extrabold text-[#1F251A]">
                    <span className="text-[#5A6A51] font-semibold">{tr.bookingValueLabel || "Booking Value"}</span>
                    <span className="text-[#1F251A] font-extrabold">{bookingValue} {tr.egpLabel}</span>
                  </div>
                  <div className="flex justify-between items-center font-extrabold text-[#1F251A]">
                    <span className="text-[#5A6A51] font-semibold">{tr.actualPaidLabel || tr.amountPaidLabel || "Amount Paid Now"}</span>
                    <span className="text-emerald-800 font-extrabold">{numAmountPaid} {tr.egpLabel}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#414E36]/10 font-extrabold">
                    <span className="text-[#5A6A51] font-semibold">{tr.remainingValueLabel || "Remaining Value"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-black ${remainingValue > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                        {remainingValue} {tr.egpLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        remainingValue === 0 ? "bg-emerald-100 text-emerald-800" : remainingValue > 0 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {remainingValue === 0 ? (tr.fullySettledBadge || "Fully Settled") : remainingValue > 0 ? (tr.dueOnVisitBadge || "Due on Visit") : (tr.creditBalanceBadge || "Credit Balance")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {notes && (
                <div className="pt-2 border-t border-[#414E36]/10">
                  <span className="text-[#5A6A51] font-semibold block mb-1">{tr.notesLabel.replace(" (Optional)", "")}</span>
                  <p className="text-[11px] text-[#1F251A] bg-white p-2.5 rounded-xl border border-[#414E36]/10">{notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-3 rounded-2xl border border-[#414E36]/20 bg-white font-bold text-xs text-[#1F251A] hover:bg-[#FBFBF9] transition cursor-pointer"
              >
                {tr.backToEditBtn}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  await handleCreateBooking("normal");
                  setShowConfirmModal(false);
                }}
                className="px-6 py-3 rounded-2xl bg-[#1E3A2B] text-white font-extrabold text-xs hover:bg-[#162C20] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>{submitting ? tr.creatingBtn : tr.confirmCreateBookingBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PATIENT ACCOUNT AUTO-POPUP MODAL (Photo 1) ── */}
      {showPatientAccountModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 animate-scaleIn border border-[#414E36]/15">
            {/* Top Avatar Icon */}
            <div className="h-20 w-20 rounded-full bg-[#EBF2EB] mx-auto flex items-center justify-center text-[#1E4D38] shadow-inner">
              <ShieldCheck size={38} className="text-[#0F3826]" />
            </div>

            {/* Title & Question */}
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1F251A]">Patient Account</h3>
              <p className="text-sm font-medium text-[#5A6A51]">
                Does the patient already have an account?
              </p>
            </div>

            <div className="w-full border-b border-gray-100" />

            {/* Actions: No / Yes */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPatientAccountModal(false);
                }}
                className="flex-1 py-3 px-5 rounded-2xl border border-[#414E36]/30 text-[#1F251A] font-bold text-sm hover:bg-gray-50 transition cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdditionalPatientFields(true);
                  setShowPatientAccountModal(false);
                }}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#0F3826] text-white font-bold text-sm hover:bg-[#0A271A] transition shadow-md cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
