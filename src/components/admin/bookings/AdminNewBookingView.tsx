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
  ShieldCheck,
  Sparkles,
  Zap
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
  initialData?: any;
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
  activeBranchId,
  initialData,
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

  // Customer Lookup & Packages state
  const [patientFound, setPatientFound] = useState<boolean | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<CustomerItem | null>(null);
  const [customerPackages, setCustomerPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedPackageItemId, setSelectedPackageItemId] = useState<string>("");
  const [usePackagePayment, setUsePackagePayment] = useState(false);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [usePackageMode, setUsePackageMode] = useState(false);
  const [catalogPackages, setCatalogPackages] = useState<any[]>([]);
  const [selectedCatalogPulsePkg, setSelectedCatalogPulsePkg] = useState<any>(null);
  const [selectedCustomerPulsePkgId, setSelectedCustomerPulsePkgId] = useState<string>("");

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

  // Laser Payment Mode (Option 1: Service Fixed, Option 2: Pay per Pulse, Option 3: Pulses Package)
  const [laserPaymentMode, setLaserPaymentMode] = useState<"SERVICE" | "PER_PULSE" | "PACKAGE">("SERVICE");
  const [laserPerPulsePrice, setLaserPerPulsePrice] = useState<number>(5);

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

        // Fetch Customers List from /api/customers endpoint and Supabase
        try {
          const { data: authData } = await supabase.auth.getSession();
          const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (authData?.session?.access_token) {
            authHeaders["Authorization"] = `Bearer ${authData.session.access_token}`;
          }
          const cRes = await fetch("/api/customers", { headers: authHeaders });
          if (cRes.ok) {
            const apiCustomers = await cRes.json();
            if (Array.isArray(apiCustomers) && apiCustomers.length > 0) {
              setAllCustomers(apiCustomers);
              setCustomerList(apiCustomers);
            }
          } else {
            const { data: cData } = await supabase
              .from("customers")
              .select("id, name, first_name, last_name, full_name, mobile, phone, email, whatsapp")
              .order("created_at", { ascending: false })
              .limit(100);
            if (cData && cData.length > 0) {
              setAllCustomers(cData);
              setCustomerList(cData);
            }
          }
        } catch (cErr) {
          console.warn("Failed to load customers in New Booking View:", cErr);
        }

        if (customers && customers.length > 0) {
          setAllCustomers(prev => (prev.length === 0 ? customers : prev));
          setCustomerList(prev => (prev.length === 0 ? customers : prev));
        }
        // Fetch Catalog Pulses Packages for laser package selection
        try {
          const pRes = await fetch("/api/packages");
          if (pRes.ok) {
            const pData = await pRes.json();
            const pkgs = Array.isArray(pData) ? pData : pData.packages || [];
            const pulseOnly = pkgs.filter((p: any) =>
              p.package_type === "pulses" ||
              p.packageType === "pulses" ||
              Number(p.total_pulses || p.totalPulses || 0) > 0 ||
              p.name?.toLowerCase().includes("pulse") ||
              p.name?.toLowerCase().includes("laser") ||
              p.name?.includes("نبض") ||
              p.name?.includes("ليزر")
            );
            setCatalogPackages(pulseOnly);
            if (pulseOnly.length > 0) {
              setSelectedCatalogPulsePkg(pulseOnly[0]);
            }
          }
        } catch (e) {
          console.warn("Failed to load catalog packages:", e);
        }
      } catch (err) {
        console.error("Error initializing New Booking View data:", err);
      }
    }
    loadData();
  }, []);

  // Update lists when props update
  useEffect(() => {
    if (customers && customers.length > 0) {
      setAllCustomers(customers);
      if (!phone.trim()) {
        setCustomerList(customers);
      }
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

  const [showTimeModal, setShowTimeModal] = useState(false);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── PRE-FILL FROM INITIAL DATA (e.g., Follow-Up Reminder Convert to Booking) ──
  const initialDataAppliedRef = useRef(false);
  useEffect(() => {
    if (!initialData || initialDataAppliedRef.current) return;
    initialDataAppliedRef.current = true;

    if (initialData.phone) {
      setPhone(initialData.phone);
    }
    if (initialData.patientName) {
      const parts = String(initialData.patientName).trim().split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setPatientSearchQuery(initialData.patientName);
    }
    if (initialData.date) {
      setBookingDate(initialData.date);
    }
    if (initialData.notes) {
      setNotes(initialData.notes);
    }
    if (initialData.branchId) {
      setSelectedBranchId(String(initialData.branchId));
    }
  }, [initialData]);

  // Match and select customer account from initialData
  useEffect(() => {
    if (!initialData) return;
    const searchPhone = (initialData.phone || "").replace(/\D/g, "");
    const searchId = initialData.customerId ? String(initialData.customerId) : "";
    const searchName = (initialData.patientName || "").trim().toLowerCase();

    if (allCustomers && allCustomers.length > 0) {
      const matched = allCustomers.find(c => {
        if (searchId && String(c.id) === searchId) return true;
        const cPhone = (c.mobile || c.phone || "").replace(/\D/g, "");
        if (searchPhone && cPhone && (cPhone === searchPhone || cPhone.endsWith(searchPhone) || searchPhone.endsWith(cPhone))) return true;
        const cName = (c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).trim().toLowerCase();
        if (searchName && cName && (cName === searchName || cName.includes(searchName) || searchName.includes(cName))) return true;
        return false;
      });
      if (matched) {
        handleSelectCustomer(matched);
      }
    }
  }, [initialData, allCustomers]);

  // Match and select doctor from initialData
  useEffect(() => {
    if (!initialData || (!initialData.doctorName && !initialData.doctorId)) return;
    if (dbDoctors && dbDoctors.length > 0) {
      const targetDocId = initialData.doctorId ? String(initialData.doctorId) : "";
      const targetDocName = (initialData.doctorName || "").replace(/^Dr\.?\s*/i, "").trim().toLowerCase();

      const matched = dbDoctors.find(d => {
        const dAny = d as any;
        if (targetDocId && (String(d.id) === targetDocId || String(dAny.provider_id) === targetDocId)) return true;
        const dName = (d.name || dAny.full_name || dAny.name_en || "").replace(/^Dr\.?\s*/i, "").trim().toLowerCase();
        if (targetDocName && dName && (dName === targetDocName || dName.includes(targetDocName) || targetDocName.includes(dName))) return true;
        return false;
      });

      if (matched) {
        setSelectedDoctorId(String(matched.id));
      }
    }
  }, [initialData, dbDoctors]);

  // Match and select service from initialData
  useEffect(() => {
    if (!initialData || (!initialData.serviceName && !initialData.serviceId)) return;
    if (dbServices && dbServices.length > 0) {
      const targetSvcId = initialData.serviceId ? String(initialData.serviceId) : "";
      const targetSvcName = (initialData.serviceName || "").trim().toLowerCase();

      const matched = dbServices.find(s => {
        const sAny = s as any;
        if (targetSvcId && String(s.id) === targetSvcId) return true;
        const sEn = (sAny.en || s.name || sAny.title || sAny.name_en || "").trim().toLowerCase();
        const sAr = (sAny.ar || sAny.name_ar || sAny.title_ar || "").trim().toLowerCase();
        if (targetSvcName && (sEn === targetSvcName || sAr === targetSvcName || sEn.includes(targetSvcName) || targetSvcName.includes(sEn))) return true;
        return false;
      });

      if (matched) {
        setSelectedServiceId(String(matched.id));
      }
    }
  }, [initialData, dbServices]);

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
    if (filtered.length === 0 && !showCustomerDropdown) {
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
    if (cust.id || p) {
      await loadCustomerPackages(cust.id, p);
    } else {
      setCustomerPackages([]);
      setActivePackage(null);
    }
  }

  // Fetch active packages for a customer with joined items and services via API
  async function loadCustomerPackages(custId?: string, custPhone?: string) {
    const idToUse = custId || foundCustomer?.id || "";
    const rawPhone = custPhone || phone || foundCustomer?.mobile || foundCustomer?.phone || "";
    const phoneToUse = rawPhone.replace(/\D/g, "");

    if (!idToUse && phoneToUse.length < 10) {
      setCustomerPackages([]);
      setActivePackage(null);
      return;
    }

    setLoadingPackages(true);
    try {
      const params = new URLSearchParams();
      if (idToUse) params.append("customer_id", String(idToUse));
      if (phoneToUse) params.append("mobile", phoneToUse);

      const res = await fetch(`/api/customers/packages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const pkgs = data.packages || [];
        const activePkgs = pkgs.filter((p: any) => p.status === "active" || !p.status);
        setCustomerPackages(activePkgs);

        if (activePkgs.length > 0) {
          const firstPkg = activePkgs[0];
          const isPulses = Boolean(
            firstPkg.packageType === "pulses" ||
            firstPkg.package_type === "pulses" ||
            Number(firstPkg.totalPulses || firstPkg.total_pulses || firstPkg.includedPulses || firstPkg.included_pulses || 0) > 0 ||
            Number(firstPkg.pulsesRemaining || firstPkg.pulses_remaining || firstPkg.remainingPulses || firstPkg.remaining_pulses || 0) > 0 ||
            firstPkg.packageName?.toLowerCase().includes("pulse") ||
            firstPkg.packageName?.toLowerCase().includes("laser") ||
            firstPkg.packageName?.includes("نبض") ||
            firstPkg.packageName?.includes("ليزر")
          );
          const remPulses = Number(firstPkg.pulsesRemaining ?? firstPkg.pulses_remaining ?? firstPkg.remainingPulses ?? firstPkg.remaining_pulses ?? firstPkg.totalPulses ?? 0);
          const totalRemaining = isPulses
            ? remPulses
            : (firstPkg.items || []).reduce((sum: number, it: any) => sum + (it.qtyRemaining || 0), 0);
          if (totalRemaining > 0) {
            setActivePackage({
              name: (lang === "ar" && firstPkg.packageNameAr) ? firstPkg.packageNameAr : firstPkg.packageName,
              remaining: totalRemaining,
              isPulses,
              expiresOn: firstPkg.expiresAt ? new Date(firstPkg.expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"
            });
          } else {
            setActivePackage(null);
          }
        } else {
          setActivePackage(null);
        }
      } else {
        setCustomerPackages([]);
        setActivePackage(null);
      }
    } catch (err) {
      console.error("Error loading customer packages:", err);
      setCustomerPackages([]);
      setActivePackage(null);
    } finally {
      setLoadingPackages(false);
    }
  }

  // Reactive auto-fetch packages whenever foundCustomer or entered phone changes
  useEffect(() => {
    const cleanDigits = phone.replace(/\D/g, "");
    if (foundCustomer?.id || cleanDigits.length >= 10) {
      loadCustomerPackages(foundCustomer?.id, phone);
    } else if (!foundCustomer && cleanDigits.length < 10) {
      setCustomerPackages([]);
      setActivePackage(null);
    }
  }, [foundCustomer?.id, phone]);

  const selectedServiceObj = dbServices.find(s => String(s.id) === String(selectedServiceId)) || dbServices[0];
  const selectedDoctorObj = dbDoctors.find(d => String(d.id) === String(selectedDoctorId)) || dbDoctors[0];
  const selectedBranchObj = dbBranches.find(b => String(b.id) === String(selectedBranchId)) || dbBranches[0];

  // Dynamic Laser Service Determination
  const isLaserService = useMemo(() => {
    if (!selectedServiceObj) return false;
    const sAny = selectedServiceObj as any;
    return Boolean(
      sAny.islaser ||
      sAny.is_laser ||
      (sAny.category && sAny.category.toLowerCase().includes("laser")) ||
      (sAny.cat && sAny.cat.toLowerCase().includes("laser")) ||
      (sAny.en && sAny.en.toLowerCase().includes("laser")) ||
      (sAny.name && sAny.name.toLowerCase().includes("laser")) ||
      (sAny.title && sAny.title.toLowerCase().includes("laser")) ||
      (sAny.ar && sAny.ar.includes("ليزر"))
    );
  }, [selectedServiceObj]);

  const checkIsPulsesPackage = (pkg: any) => {
    if (!pkg) return false;
    return Boolean(
      pkg.packageType === "pulses" ||
      pkg.package_type === "pulses" ||
      Number(pkg.totalPulses || pkg.total_pulses || pkg.includedPulses || pkg.included_pulses || 0) > 0 ||
      Number(pkg.pulsesRemaining || pkg.pulses_remaining || pkg.remainingPulses || pkg.remaining_pulses || 0) > 0 ||
      pkg.packageName?.toLowerCase().includes("pulse") ||
      pkg.packageName?.toLowerCase().includes("laser") ||
      pkg.packageName?.includes("نبض") ||
      pkg.packageName?.includes("ليزر") ||
      pkg.name?.toLowerCase().includes("pulse") ||
      pkg.name?.toLowerCase().includes("laser") ||
      pkg.name?.includes("نبض") ||
      pkg.name?.includes("ليزر")
    );
  };

  const getPackagePulsesBalance = (pkg: any) => {
    if (!pkg) return { remaining: 0, total: 0 };
    const rem = Number(
      pkg.pulsesRemaining !== undefined
        ? pkg.pulsesRemaining
        : pkg.pulses_remaining !== undefined
        ? pkg.pulses_remaining
        : pkg.remainingPulses !== undefined
        ? pkg.remainingPulses
        : pkg.remaining_pulses !== undefined
        ? pkg.remaining_pulses
        : pkg.totalPulses ?? pkg.total_pulses ?? pkg.includedPulses ?? pkg.included_pulses ?? 0
    );
    const tot = Number(
      pkg.totalPulses !== undefined
        ? pkg.totalPulses
        : pkg.total_pulses !== undefined
        ? pkg.total_pulses
        : pkg.includedPulses !== undefined
        ? pkg.includedPulses
        : pkg.included_pulses !== undefined
        ? pkg.included_pulses
        : rem
    );
    return { remaining: rem, total: Math.max(rem, tot) };
  };

  // Active laser pulses packages owned by the patient
  const customerPulsePackages = useMemo(() => {
    return customerPackages.filter((pkg) => {
      if (pkg.status && pkg.status !== "active") return false;
      if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) return false;
      if (!checkIsPulsesPackage(pkg)) return false;
      const { remaining } = getPackagePulsesBalance(pkg);
      return remaining > 0;
    });
  }, [customerPackages]);

  // Selected patient pulses package
  const selectedCustomerPulsePkg = useMemo(() => {
    if (customerPulsePackages.length === 0) return null;
    const found = customerPulsePackages.find((p) => p.id === selectedCustomerPulsePkgId);
    return found || customerPulsePackages[0];
  }, [customerPulsePackages, selectedCustomerPulsePkgId]);

  // Backward compatibility alias for single pulse package checks
  const customerActivePulsePkg = selectedCustomerPulsePkg;

  // Regular non-laser service packages
  const customerServicePackages = useMemo(() => {
    return customerPackages.filter((pkg) => !checkIsPulsesPackage(pkg));
  }, [customerPackages]);

  // Keep selectedCustomerPulsePkgId in sync with customerPulsePackages
  useEffect(() => {
    if (customerPulsePackages.length > 0) {
      if (!selectedCustomerPulsePkgId || !customerPulsePackages.some((p) => p.id === selectedCustomerPulsePkgId)) {
        setSelectedCustomerPulsePkgId(customerPulsePackages[0].id);
      }
    } else {
      setSelectedCustomerPulsePkgId("");
    }
  }, [customerPulsePackages, selectedCustomerPulsePkgId]);

  // Matching active package item for currently selected service
  const { matchingPackage, matchingPackageItem } = useMemo(() => {
    if (!selectedServiceId || customerPackages.length === 0) {
      return { matchingPackage: null, matchingPackageItem: null };
    }

    const curSvc = dbServices.find(s => String(s.id) === String(selectedServiceId));
    const curSvcEn = (curSvc?.en || curSvc?.name || "").toLowerCase().trim();
    const curSvcAr = (curSvc?.ar || "").toLowerCase().trim();

    // 1. If current service is laser, prioritize selected customer pulses package!
    if (isLaserService) {
      if (selectedCustomerPulsePkg) {
        const { remaining, total } = getPackagePulsesBalance(selectedCustomerPulsePkg);
        if (remaining > 0) {
          return {
            matchingPackage: selectedCustomerPulsePkg,
            matchingPackageItem: {
              id: `pulse-${selectedCustomerPulsePkg.id}`,
              serviceId: Number(selectedServiceId),
              serviceName: curSvc?.en || curSvc?.name || "Laser Hair Removal",
              serviceNameAr: curSvc?.ar || "جلسة ليزر",
              qtyRemaining: remaining,
              qtyTotal: total,
              isPulses: true
            }
          };
        }
      }
    }

    // 2. Regular session package matching
    const matchesService = (item: any) => {
      if (String(item.serviceId) === String(selectedServiceId)) return true;
      const itEn = (item.serviceName || "").toLowerCase().trim();
      const itAr = (item.serviceNameAr || "").toLowerCase().trim();
      if (curSvcEn && itEn && (itEn === curSvcEn || itEn.includes(curSvcEn) || curSvcEn.includes(itEn))) return true;
      if (curSvcAr && itAr && (itAr === curSvcAr || itAr.includes(curSvcAr) || curSvcAr.includes(itAr))) return true;
      return false;
    };

    for (const pkg of customerPackages) {
      if (!checkIsPulsesPackage(pkg)) {
        const it = (pkg.items || []).find((item: any) => matchesService(item) && Number(item.qtyRemaining || 0) > 0);
        if (it) return { matchingPackage: pkg, matchingPackageItem: it };
      }
    }
    for (const pkg of customerPackages) {
      if (!checkIsPulsesPackage(pkg)) {
        const it = (pkg.items || []).find((item: any) => matchesService(item));
        if (it) return { matchingPackage: pkg, matchingPackageItem: it };
      }
    }
    return { matchingPackage: null, matchingPackageItem: null };
  }, [selectedServiceId, customerPackages, dbServices, isLaserService]);

  // Auto-reset package payment if selected service is no longer covered
  useEffect(() => {
    if (usePackagePayment) {
      if (matchingPackageItem?.isPulses) {
        if (!isLaserService || matchingPackageItem.qtyRemaining <= 0) {
          setUsePackagePayment(false);
          setSelectedPackageItemId("");
          setSelectedPackageId("");
          setCustomBookingValue(null);
        }
      } else if (!matchingPackageItem || matchingPackageItem.qtyRemaining <= 0) {
        setUsePackagePayment(false);
        setSelectedPackageItemId("");
        setSelectedPackageId("");
        setCustomBookingValue(null);
      }
    }
  }, [selectedServiceId, matchingPackageItem, usePackagePayment, isLaserService]);

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
    setSelectedTimes([slot]);
    setShowTimeModal(false);
  };

  const handleClearSlots = () => {
    setSelectedTimes([]);
  };

  const selectedServiceName = getServiceName(selectedServiceObj, lang);
  const selectedDoctorName = selectedDoctorObj?.name || "Doctor";
  const selectedBranchName = selectedBranchObj?.name_en || selectedBranchObj?.name || selectedBranchObj?.name_ar || "Clinic Branch";
  const selectedRoomName = dbRooms.length > 0 ? (dbRooms[0]?.name || "Room 1 (Auto)") : "Room 1 (Auto)";

  const fullPatientName = `${firstName} ${lastName}`.trim() || "Patient Name";

  const isPackageCovered = Boolean(usePackagePayment || usePackageMode || (isLaserService && laserPaymentMode === "PACKAGE" && customerActivePulsePkg));
  const isPerPulseMode = Boolean(isLaserService && laserPaymentMode === "PER_PULSE");
  const isNewPackagePurchase = Boolean(
    isLaserService &&
    laserPaymentMode === "PACKAGE" &&
    !customerActivePulsePkg &&
    selectedCatalogPulsePkg
  );
  const baseServicePrice = Number(selectedServiceObj?.price || 0);
  const autoBookingValue = isNewPackagePurchase
    ? Number(selectedCatalogPulsePkg?.price || 0)
    : isPackageCovered || isPerPulseMode
    ? 0
    : baseServicePrice * Math.max(1, selectedTimes.length);
  const bookingValue = isNewPackagePurchase
    ? (customBookingValue !== null && customBookingValue !== undefined ? Number(customBookingValue) : Number(selectedCatalogPulsePkg?.price || 0))
    : isPackageCovered || isPerPulseMode
    ? 0
    : (customBookingValue !== null && customBookingValue !== undefined ? Number(customBookingValue) : autoBookingValue);
  const numAmountPaid = isNewPackagePurchase
    ? (typeof amountPaidNow === "number" ? amountPaidNow : Number(selectedCatalogPulsePkg?.price || 0))
    : isPackageCovered || isPerPulseMode
    ? 0
    : (typeof amountPaidNow === "number" ? amountPaidNow : 0);
  const remainingValue = isNewPackagePurchase
    ? Math.max(0, bookingValue - numAmountPaid)
    : isPackageCovered || isPerPulseMode
    ? 0
    : Math.max(0, bookingValue - numAmountPaid);
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

      // If customer is not found in DB, search allCustomers by phone or auto-create customer profile
      if (!resolvedCustomerId && phone) {
        const cleanDigits = phone.replace(/\D/g, "");
        const matchedInAll = allCustomers.find(c => {
          const cPhone = (c.mobile || c.phone || "").replace(/\D/g, "");
          return cPhone && (cPhone === cleanDigits || cPhone.endsWith(cleanDigits) || cleanDigits.endsWith(cPhone));
        });
        if (matchedInAll?.id) {
          resolvedCustomerId = matchedInAll.id;
        }
      }

      if (!resolvedCustomerId && (firstName || phone)) {
        try {
          const custPayload = {
            name: fullPatientName,
            first_name: firstName,
            last_name: lastName,
            mobile: phone,
            email: email.trim() || null,
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
            const newId = newCust?.id || newCust?.customer?.id;
            if (newId) {
              resolvedCustomerId = newId;
            }
          }
        } catch (custErr) {
          console.warn("Auto-create customer error (non-fatal):", custErr);
        }
      }

      // If purchasing a new pulses package in Option 3, sell package now so it immediately exists in customer_packages
      let createdCustomerPackageId: string | null = null;
      if (isNewPackagePurchase && selectedCatalogPulsePkg && (resolvedCustomerId || phone)) {
        try {
          const { data: authData } = await supabase.auth.getSession();
          const sellHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (authData?.session?.access_token) {
            sellHeaders["Authorization"] = `Bearer ${authData.session.access_token}`;
          }
          const sellRes = await fetch("/api/packages/sell", {
            method: "POST",
            headers: sellHeaders,
            body: JSON.stringify({
              customerId: resolvedCustomerId || phone,
              packageId: selectedCatalogPulsePkg.id,
              branchId: selectedBranchObj?.id || null,
              paymentMethod: numAmountPaid > 0 ? "cash" : "cash"
            })
          });

          if (sellRes.ok) {
            const sellData = await sellRes.json().catch(() => null);
            createdCustomerPackageId = sellData?.customerPackage?.id || null;
            if (sellData?.customerPackage?.customer_id && !resolvedCustomerId) {
              resolvedCustomerId = sellData.customerPackage.customer_id;
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("revera-laser-change"));
            }
          } else {
            console.error("Package sale failed during booking:", await sellRes.text());
          }
        } catch (sellErr) {
          console.error("Error selling package during booking:", sellErr);
        }
      }

      const packageNote = isNewPackagePurchase && selectedCatalogPulsePkg
        ? `\n[Purchasing New Pulses Package]: ${(lang === "ar" && selectedCatalogPulsePkg.name_ar) ? selectedCatalogPulsePkg.name_ar : selectedCatalogPulsePkg.name} (${Number(selectedCatalogPulsePkg.price || 0)} EGP · ${Number(selectedCatalogPulsePkg.total_pulses || selectedCatalogPulsePkg.totalPulses || 10000).toLocaleString()} pulses)${createdCustomerPackageId ? `\n[Customer Package ID]: ${createdCustomerPackageId}` : ""}`
        : (usePackagePayment && matchingPackage && matchingPackageItem)
        ? matchingPackageItem.isPulses
          ? `\n[Laser Package Redemption]: ${(lang === "ar" && matchingPackage.packageNameAr) ? matchingPackage.packageNameAr : matchingPackage.packageName} (${Number(matchingPackageItem.qtyRemaining).toLocaleString()} pulses remaining)`
          : `\n[Package Redemption]: ${(lang === "ar" && matchingPackage.packageNameAr) ? matchingPackage.packageNameAr : matchingPackage.packageName} - ${selectedServiceName} (Item ID: ${matchingPackageItem.id})`
        : "";

      const laserNote = isLaserService
        ? `\n[Laser Service Payment Mode]: ${
            laserPaymentMode === "SERVICE"
              ? "Option 1: Pay by Service (Fixed Price)"
              : laserPaymentMode === "PER_PULSE"
              ? `Option 2: Pay per Pulse (@ ${laserPerPulsePrice} EGP/pulse)`
              : isNewPackagePurchase && selectedCatalogPulsePkg
              ? `Option 3: Pay with Pulses Package (New Package: ${selectedCatalogPulsePkg.name})`
              : "Option 3: Pay with Pulses Package"
          }`
        : "";

      const combinedNotes = (notes ? `${notes}${packageNote}${laserNote}` : `${packageNote}${laserNote}`.trim()) || null;

      const payload = {
        name: fullPatientName,
        phone: phone,
        email: email.trim() || null,
        serviceId: selectedServiceObj?.id,
        doctorId: selectedDoctorObj?.id,
        branchId: selectedBranchObj?.id || null,
        roomId: selectedRoomId || null,
        date: bookingDate,
        requestedTime: selectedTime,
        sessionType: sessionType === "in_person" ? "in_person" : "online",
        notes: combinedNotes,
        isManual: true,
        status: "approved",
        explicitCustomerId: resolvedCustomerId,
        amountPaid: numAmountPaid,
        amountLeft: Math.max(0, remainingValue),
        isLaserService: isLaserService,
        laserPaymentMode: isLaserService ? laserPaymentMode : null,
        laserPricePerPulse: isLaserService && laserPaymentMode === "PER_PULSE" ? laserPerPulsePrice : null,
        purchasingPackageId: isNewPackagePurchase ? selectedCatalogPulsePkg?.id : null,
        customerPackageId: createdCustomerPackageId || null,
        packageId: createdCustomerPackageId || (isNewPackagePurchase ? selectedCatalogPulsePkg?.id : (matchingPackage?.id || null)),
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("revera-booking-change"));
        window.dispatchEvent(new CustomEvent("revera-prescription-change"));
        window.dispatchEvent(new CustomEvent("revera-laser-change"));
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
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#414E36]/10 shadow-xs flex items-center justify-between">
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
      <div className="space-y-6">

        {/* MAIN FORM */}
        <div className="space-y-6">

          {/* CARD 1: PATIENT INFORMATION */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-[#414E36]/10 shadow-xs space-y-6 relative z-30">
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
                  <span>{showAdditionalPatientFields ? (tr.hideAccountDetailsBtn || "Hide Account Details") : (tr.patientAccountDetailsBtn || "+ Patient Account Details")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              {/* Phone Input with Country Code & Integrated Patients Dropdown */}
              <div className="relative z-50" ref={phoneDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#1F251A]">{tr.phoneLabel}</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (showCustomerDropdown) {
                        setShowCustomerDropdown(false);
                      } else {
                        setPatientSearchQuery("");
                        setCustomerList(allCustomers);
                        setShowCustomerDropdown(true);
                      }
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Users size={13} />
                    <span>{showCustomerDropdown ? tr.hidePatientsListBtn : tr.browsePatientsBtn}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showCustomerDropdown ? "rotate-180" : ""}`} />
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
                      if (allCustomers.length > 0) {
                        if (!phone.trim()) setCustomerList(allCustomers);
                        setShowCustomerDropdown(true);
                      }
                    }}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (e.target.value) setFormErrors((prev) => ({ ...prev, phone: false }));
                      setShowCustomerDropdown(true);
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
                {showCustomerDropdown && (
                  <div className="absolute start-0 end-0 top-full mt-1.5 z-[100] max-h-80 overflow-y-auto overscroll-contain bg-white rounded-2xl border border-[#414E36]/20 shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-2 space-y-1">
                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#5A6A51] bg-[#FBFBF9] rounded-xl flex justify-between items-center mb-1 sticky top-0 z-10 border border-[#414E36]/5">
                      <span>{tr.databasePatientsPrefix} ({customerList.length})</span>
                      <button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-[#1F251A] hover:text-red-700 font-bold text-xs cursor-pointer">{tr.closeBtn}</button>
                    </div>

                    {/* Dedicated Patient Search Bar in Dropdown */}
                    <div className="p-1">
                      <div className="relative">
                        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                        <input
                          type="text"
                          placeholder={lang === "ar" ? "ابحث بالاسم أو رقم الهاتف أو البريد..." : "Search patients by name, phone, or email..."}
                          value={patientSearchQuery}
                          onChange={(e) => {
                            const query = e.target.value;
                            setPatientSearchQuery(query);
                            const cleanQuery = query.trim().toLowerCase();
                            const cleanDigits = query.replace(/\D/g, "");
                            if (!cleanQuery) {
                              setCustomerList(allCustomers);
                            } else {
                              const filtered = allCustomers.filter((c: any) => {
                                const nameMatch = (c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).toLowerCase().includes(cleanQuery);
                                const phoneMatch = cleanDigits ? (c.mobile || c.phone || "").replace(/\D/g, "").includes(cleanDigits) : false;
                                const emailMatch = (c.email || "").toLowerCase().includes(cleanQuery);
                                return nameMatch || phoneMatch || emailMatch;
                              });
                              setCustomerList(filtered);
                            }
                          }}
                          className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-[#414E36]/20 bg-[#FBFBF9] text-[#1F251A] outline-none font-bold focus:border-emerald-700 placeholder:text-gray-400 placeholder:font-normal"
                        />
                      </div>
                    </div>
                    
                    {customerList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#5A6A51] font-semibold space-y-2">
                        <p>{tr.noMatchingPatients}</p>
                        {allCustomers.length === 0 && (
                          <p className="text-[11px] text-amber-700">
                            {lang === "ar" ? "جاري تحميل المرضى من قاعدة البيانات أو لم يتم العثور على سجلات." : "Loading patients from database or no records found."}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerList(allCustomers);
                            setPatientSearchQuery("");
                          }}
                          className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          {lang === "ar" ? "عرض جميع المرضى" : "Show all patients"}
                        </button>
                      </div>
                    ) : (
                      customerList.map((c) => {
                        const cName = c.name || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || tr.patientAccountFallback;
                        const cPhone = c.mobile || c.phone || tr.noPhoneLabel;
                        const isSelected = foundCustomer?.id === c.id;

                        return (
                          <div
                            key={c.id || cPhone}
                            onClick={() => handleSelectCustomer(c)}
                            className={`p-2.5 sm:p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 border-b border-gray-100 last:border-0 ${
                              isSelected ? "bg-emerald-100/70 border-emerald-300" : "hover:bg-emerald-50/70"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-[#1F251A] text-xs block truncate">{cName}</span>
                              <span className="text-[11px] font-mono text-[#5A6A51] block truncate">
                                {cPhone} {c.email ? `• ${c.email}` : ""}
                              </span>
                            </div>
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-xl flex items-center gap-1 shrink-0 ${
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
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">{tr.genderLabel || "Gender"}</label>
                      <div className="relative">
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700 appearance-none text-xs"
                        >
                          <option value="">{tr.selectGenderPlaceholder || "Select Gender"}</option>
                          <option value="Female">{tr.genderFemale || "Female"}</option>
                          <option value="Male">{tr.genderMale || "Male"}</option>
                        </select>
                        <ChevronDown size={14} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">{tr.nationalIdLabel || "National ID"}</label>
                      <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder={tr.nationalIdPlaceholder || "Enter 14-digit National ID"}
                        maxLength={14}
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 2: Referral Source & Occupation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">{tr.referralLabel || "Referral Source"}</label>
                      <div className="relative">
                        <select
                          value={referralSource}
                          onChange={(e) => setReferralSource(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none cursor-pointer focus:border-emerald-700 appearance-none text-xs"
                        >
                          <option value="">{tr.selectReferralPlaceholder || "Select Referral Source..."}</option>
                          <option value="Instagram">{tr.referralInstagram || "Instagram"}</option>
                          <option value="Facebook">{tr.referralFacebook || "Facebook"}</option>
                          <option value="Friend/Family">{tr.referralFriend || "Friend / Family"}</option>
                          <option value="TikTok">{tr.referralTikTok || "TikTok"}</option>
                          <option value="Google Search">{tr.referralGoogle || "Google Search"}</option>
                          <option value="Walk-in">{tr.referralWalkIn || "Walk-in"}</option>
                          <option value="Doctor Referral">{tr.referralDoctor || "Doctor Referral"}</option>
                          <option value="Other">{tr.referralOther || "Other"}</option>
                        </select>
                        <ChevronDown size={14} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">{tr.occupationLabel || "Occupation"}</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder={tr.occupationPlaceholder || "e.g. Engineer, Doctor"}
                        className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3.5 py-2.5 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 3: Age (Photo 3) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#1F251A] mb-1.5 text-xs">{tr.ageLabel || "Age"}</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder={tr.agePlaceholder || "e.g. 28"}
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
                      <span>{tr.addressInformationHeading || "ADDRESS INFORMATION"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.cityAreaLabel || "City / Area"}</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder={tr.cityAreaPlaceholder || "e.g. New Cairo"}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.streetLabel || "Street"}</label>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder={tr.streetPlaceholder || "e.g. 90th Street"}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.buildingLabel || "Building"}</label>
                        <input
                          type="text"
                          value={building}
                          onChange={(e) => setBuilding(e.target.value)}
                          placeholder={tr.buildingPlaceholder || "e.g. Building 14"}
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.floorAptLabel || "Floor / Apt"}</label>
                        <input
                          type="text"
                          value={floorApt}
                          onChange={(e) => setFloorApt(e.target.value)}
                          placeholder={tr.floorAptPlaceholder || "e.g. Floor 3, Apt 6"}
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
                      <span>{tr.financialInformationHeading || "Financial Information (Optional)"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.walletBalanceLabel || "Wallet Balance (EGP)"}</label>
                        <input
                          type="number"
                          value={walletBalance}
                          onChange={(e) => setWalletBalance(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.totalSpentLabel || "Total Spent (EGP)"}</label>
                        <input
                          type="number"
                          value={totalSpent}
                          onChange={(e) => setTotalSpent(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full rounded-2xl border border-[#414E36]/20 bg-white px-3 py-2 font-bold text-[#1F251A] outline-none focus:border-emerald-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#1F251A] mb-1 text-[11px]">{tr.outstandingBalanceLabel || "Outstanding Balance (EGP)"}</label>
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
          <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-[#414E36]/10 shadow-xs space-y-6 relative z-10">
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

              {/* ── LASER SERVICE PAYMENT MODE SELECTOR (When Service is Laser) ── */}
              {isLaserService && (
                <div className="space-y-3 rounded-2xl border-2 border-emerald-700/30 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 p-4 sm:p-5 shadow-xs animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-emerald-800/10 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-emerald-950">
                      <div className="h-7 w-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-950 flex items-center gap-2">
                          <span>{tr.laserOptionsHeading || "Laser Service Payment Mode"}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                            Laser Service
                          </span>
                        </h4>
                        <p className="text-[11px] text-[#5A6A51] font-medium mt-0.5">
                          {tr.laserOptionsSub || "Select the agreed payment method for this laser booking:"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Payment Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: Pay by Service */}
                    <div
                      onClick={() => {
                        setLaserPaymentMode("SERVICE");
                        setCustomBookingValue(null);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        laserPaymentMode === "SERVICE"
                          ? "border-emerald-700 bg-emerald-50/90 ring-2 ring-emerald-700/20 shadow-xs"
                          : "border-[#414E36]/15 bg-white hover:border-emerald-600/50 hover:bg-[#FBFBF9]"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#1F251A] flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-[#EDF1EC] text-emerald-800 flex items-center justify-center text-[10px] font-black">1</span>
                            {tr.laserOption1Title || "Option 1: Pay by Service"}
                          </span>
                          {laserPaymentMode === "SERVICE" && <Check size={16} className="text-emerald-700 shrink-0 font-bold" />}
                        </div>
                        <p className="text-[11px] text-[#5A6A51] leading-relaxed">
                          {tr.laserOption1Desc || "Fixed catalog price regardless of pulses delivered."}
                        </p>
                      </div>
                      <div className="pt-2 mt-2 border-t border-[#414E36]/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[#5A6A51]">{tr.servicePriceLabel || "Price"}:</span>
                        <span className="text-xs font-black text-emerald-900">{baseServicePrice} {tr.egpLabel || "EGP"}</span>
                      </div>
                    </div>

                    {/* Option 2: Pay per Pulse */}
                    <div
                      onClick={() => {
                        setLaserPaymentMode("PER_PULSE");
                        setCustomBookingValue(0);
                        setAmountPaidNow(0);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        laserPaymentMode === "PER_PULSE"
                          ? "border-emerald-700 bg-emerald-50/90 ring-2 ring-emerald-700/20 shadow-xs"
                          : "border-[#414E36]/15 bg-white hover:border-emerald-600/50 hover:bg-[#FBFBF9]"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#1F251A] flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-[#EDF1EC] text-emerald-800 flex items-center justify-center text-[10px] font-black">2</span>
                            {tr.laserOption2Title || "Option 2: Pay per Pulse"}
                          </span>
                          {laserPaymentMode === "PER_PULSE" && <Check size={16} className="text-emerald-700 shrink-0 font-bold" />}
                        </div>
                        <p className="text-[11px] text-[#5A6A51] leading-relaxed">
                          {tr.laserOption2Desc || "Deal per pulse at reception. Invoiced after session based on actual pulses used."}
                        </p>
                      </div>
                      <div className="pt-2 mt-2 border-t border-[#414E36]/10 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <label className="text-[10px] font-bold text-[#5A6A51] shrink-0">{tr.ratePerPulseLabel || "Rate"}:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0.1}
                            step={0.5}
                            value={laserPerPulsePrice}
                            onChange={(e) => setLaserPerPulsePrice(Math.max(0.1, parseFloat(e.target.value) || 1))}
                            className="w-16 rounded-lg border border-[#414E36]/20 bg-white px-2 py-0.5 text-xs font-black text-[#1F251A] text-end outline-none focus:border-emerald-700"
                          />
                          <span className="text-[10px] font-bold text-[#5A6A51]">{tr.egpLabel || "EGP"}/p</span>
                        </div>
                      </div>
                    </div>

                    {/* Option 3: Pay with Pulse Package */}
                    <div
                      onClick={() => {
                        setLaserPaymentMode("PACKAGE");
                        if (customerPulsePackages.length > 0) {
                          const activePkg = selectedCustomerPulsePkg || customerPulsePackages[0];
                          setSelectedCustomerPulsePkgId(activePkg.id);
                          setSelectedPackageId(activePkg.id);
                          setSelectedPackageItemId(`pulse-${activePkg.id}`);
                          setUsePackagePayment(true);
                          setCustomBookingValue(0);
                          setAmountPaidNow(0);
                        } else if (selectedCatalogPulsePkg || catalogPackages[0]) {
                          const catPkg = selectedCatalogPulsePkg || catalogPackages[0];
                          setSelectedCatalogPulsePkg(catPkg);
                          setUsePackagePayment(true);
                          setCustomBookingValue(Number(catPkg.price || 0));
                          setAmountPaidNow(Number(catPkg.price || 0));
                        } else {
                          setUsePackagePayment(true);
                          setCustomBookingValue(0);
                          setAmountPaidNow(0);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        laserPaymentMode === "PACKAGE"
                          ? "border-emerald-700 bg-emerald-50/90 ring-2 ring-emerald-700/20 shadow-xs"
                          : "border-[#414E36]/15 bg-white hover:border-emerald-600/50 hover:bg-[#FBFBF9]"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#1F251A] flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-[#EDF1EC] text-emerald-800 flex items-center justify-center text-[10px] font-black">3</span>
                            {tr.laserOption3Title || "Option 3: Pulses Package"}
                          </span>
                          {laserPaymentMode === "PACKAGE" && <Check size={16} className="text-emerald-700 shrink-0 font-bold" />}
                        </div>
                        <p className="text-[11px] text-[#5A6A51] leading-relaxed">
                          {tr.laserOption3Desc || "Deduct session pulses from patient package with deficit spillover support."}
                        </p>
                      </div>
                      <div className="pt-2 mt-2 border-t border-[#414E36]/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[#5A6A51]">{tr.bookingValueLabel || "Booking"}:</span>
                        <span className="text-xs font-black text-emerald-900">
                          {customerPulsePackages.length > 0
                            ? `0 ${tr.egpLabel || "EGP"} (${tr.paymentMethodPackage || "Package"})`
                            : selectedCatalogPulsePkg
                            ? `${Number(selectedCatalogPulsePkg.price || 0)} ${tr.egpLabel || "EGP"} (${tr.buyPackageSuffix || "Buy Package"})`
                            : `0 ${tr.egpLabel || "EGP"}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* If Option 3 is active: display linked package status OR catalog package selection if patient has no package */}
                  {laserPaymentMode === "PACKAGE" && (
                    <div className="mt-3 space-y-3">
                      {customerPulsePackages.length > 0 ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-300/80 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Zap size={16} className="text-emerald-700 fill-emerald-600 shrink-0" />
                              <span className="font-bold text-xs text-emerald-950">
                                {tr.selectPatientActivePulsePackage || "Select which active pulses package to use for this session:"}
                              </span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                              {customerPulsePackages.length} {tr.activePulsesPackagesCount || "Active Pulses Package(s)"}
                            </span>
                          </div>

                          {/* Grid of patient's active pulses packages to choose between */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {customerPulsePackages.map((pkg) => {
                              const isSelected = selectedCustomerPulsePkg?.id === pkg.id;
                              const { remaining, total } = getPackagePulsesBalance(pkg);
                              const pct = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 100;
                              return (
                                <div
                                  key={pkg.id}
                                  onClick={() => {
                                    setSelectedCustomerPulsePkgId(pkg.id);
                                    setSelectedPackageId(pkg.id);
                                    setSelectedPackageItemId(`pulse-${pkg.id}`);
                                    setUsePackagePayment(true);
                                    setCustomBookingValue(0);
                                    setAmountPaidNow(0);
                                  }}
                                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                    isSelected
                                      ? "border-emerald-700 bg-white ring-2 ring-emerald-600/30 shadow-xs"
                                      : "border-emerald-200 bg-white/70 hover:bg-white"
                                  }`}
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-emerald-950 truncate">
                                        {(lang === "ar" && pkg.packageNameAr) ? pkg.packageNameAr : pkg.packageName}
                                      </span>
                                      {isSelected && <Check size={14} className="text-emerald-700 shrink-0 font-bold" />}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-emerald-800 font-bold">
                                        {remaining.toLocaleString()} {lang === "ar" ? "نبضة متبقية" : (tr.pulsesRemainingBadge || "pulses left")}
                                      </span>
                                      <span className="text-[10px] text-[#5A6A51]">
                                        / {total.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
                                      <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    {pkg.expiresAt && (
                                      <span className="text-[10px] text-[#5A6A51] block mt-1">
                                        {tr.packageExpires || "Expires:"} {new Date(pkg.expiresAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="pt-2 mt-2 border-t border-emerald-100 flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold text-emerald-800">{tr.bookingValueLabel || "Booking"}:</span>
                                    <span className="text-xs font-black text-emerald-900">
                                      0 {tr.egpLabel || "EGP"} ({tr.paymentMethodPackage || "Package"})
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Green Confirmation Banner for the selected package */}
                          {selectedCustomerPulsePkg && (
                            <div className="p-3 rounded-2xl bg-white border border-emerald-300/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                                <div>
                                  <span className="font-bold text-emerald-950 block">
                                    {lang === "ar"
                                      ? `الجلسة مغطاة بباقة المريض: ${(selectedCustomerPulsePkg.packageNameAr || selectedCustomerPulsePkg.packageName)}`
                                      : `Session covered by patient package: ${selectedCustomerPulsePkg.packageName}`}
                                  </span>
                                  <span className="text-[11px] text-emerald-800 font-medium">
                                    {lang === "ar"
                                      ? `${getPackagePulsesBalance(selectedCustomerPulsePkg).remaining.toLocaleString()} نبضة متبقية في الرصيد · 0 ج.م مستحق للحجز (سيتم خصم النبضات بعد الجلسة)`
                                      : `${getPackagePulsesBalance(selectedCustomerPulsePkg).remaining.toLocaleString()} pulses remaining in quota · 0 EGP booking fee (session pulses will be deducted upon completion)`}
                                  </span>
                                </div>
                              </div>
                              <span className="font-black text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                                0 EGP
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300/80 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Zap size={16} className="text-amber-600 fill-amber-500 shrink-0" />
                              <span className="font-bold text-xs text-amber-950">
                                {tr.selectPulsesPackageToBuy || "Patient has no active pulses package. Select a Pulses Package to purchase with this session:"}
                              </span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                              {lang === "ar" ? "شراء باقة جديدة" : "New Package Purchase"}
                            </span>
                          </div>
                          {catalogPackages.length === 0 ? (
                            <p className="text-xs text-amber-800">
                              {tr.noPulsePackageNotice || "No active pulse package found in catalog. You can choose Pay by Service or Pay per Pulse."}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {catalogPackages.map((catPkg) => {
                                const isSelected = selectedCatalogPulsePkg?.id === catPkg.id;
                                const totalPulses = catPkg.total_pulses || catPkg.totalPulses || 10000;
                                return (
                                  <div
                                    key={catPkg.id}
                                    onClick={() => {
                                      setSelectedCatalogPulsePkg(catPkg);
                                      setUsePackagePayment(true);
                                      setCustomBookingValue(Number(catPkg.price || 0));
                                      setAmountPaidNow(Number(catPkg.price || 0));
                                    }}
                                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                      isSelected
                                        ? "border-amber-600 bg-white ring-2 ring-amber-500 shadow-xs"
                                        : "border-amber-200 bg-white/70 hover:bg-white"
                                    }`}
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-xs text-amber-950 truncate">
                                          {(lang === "ar" && catPkg.name_ar) ? catPkg.name_ar : catPkg.name}
                                        </span>
                                        {isSelected && <Check size={14} className="text-amber-700 shrink-0 font-bold" />}
                                      </div>
                                      <span className="text-[11px] text-amber-800 font-semibold block">
                                        {Number(totalPulses).toLocaleString()} {lang === "ar" ? "نبضة" : "pulses"}
                                      </span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-amber-100 flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold text-amber-800">{tr.servicePriceLabel || "Price"}:</span>
                                      <span className="text-xs font-black text-amber-950">
                                        {Number(catPkg.price || 0).toLocaleString()} {tr.egpLabel || "EGP"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── CUSTOMER PACKAGES & SUBSCRIPTIONS SECTION (For Non-Laser Service Packages) ── */}
              {!isLaserService && (
                <div className="pt-1 pb-1">
                  {!foundCustomer && !phone ? (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#FBFBF9] border border-[#414E36]/10 text-xs text-[#5A6A51]">
                      <Package size={16} className="shrink-0 text-[#8B9882]" />
                      <span className="font-medium">
                        {tr.selectPatientForPackagesHint || "Select or enter a patient above to check available packages and session balances."}
                      </span>
                    </div>
                  ) : loadingPackages ? (
                    <div className="flex items-center gap-2 p-4 rounded-2xl bg-[#FBFBF9] border border-[#414E36]/10 text-xs text-[#5A6A51]">
                      <Loader2 size={16} className="animate-spin text-emerald-700" />
                      <span>{tr.loading || "Checking patient packages..."}</span>
                    </div>
                  ) : customerServicePackages.length === 0 ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900">
                      <Package size={18} className="shrink-0 text-amber-600" />
                      <div>
                        <span className="font-black block">{tr.noPackagesFound || "No active packages found for this patient"}</span>
                        <span className="text-[11px] text-amber-800/80 font-medium">
                          {tr.noPackagesSub || "This patient does not currently have any active packages or prepaid session plans."}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-emerald-800/20 bg-emerald-50/30 p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-emerald-800/10 pb-2.5">
                        <div className="flex items-center gap-2 text-emerald-900">
                          <Package size={18} className="text-emerald-700" />
                          <h4 className="font-black text-xs uppercase tracking-wider">
                            {tr.packagesHeading || "Patient Packages & Subscriptions"}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {customerServicePackages.length} {tr.activePackagesCount || "Active Package(s)"}
                        </span>
                      </div>

                      {/* Packages List */}
                      <div className="space-y-3">
                        {customerServicePackages.map((pkg) => {
                          const totalPkgRemaining = (pkg.items || []).reduce((sum: number, it: any) => sum + (it.qtyRemaining || 0), 0);
                          const isServiceCoveredInThisPkg = (pkg.items || []).some(
                            (it: any) => String(it.serviceId) === String(selectedServiceId) && it.qtyRemaining > 0
                          );

                          return (
                            <div key={pkg.id} className="rounded-xl border border-[#414E36]/15 bg-white p-3.5 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h5 className="font-black text-xs text-[#1F251A] flex items-center gap-1.5">
                                    <span>{(lang === "ar" && pkg.packageNameAr) ? pkg.packageNameAr : pkg.packageName}</span>
                                  </h5>
                                  <p className="text-[10px] text-[#5A6A51] font-semibold mt-0.5">
                                    {pkg.expiresAt ? `${tr.packageExpires || "Expires:"} ${new Date(pkg.expiresAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                                  </p>
                                </div>
                                <span className="text-xs font-black text-emerald-800 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60">
                                  {totalPkgRemaining} {totalPkgRemaining === 1 ? (tr.sessionRemainingBadge || "session left") : (tr.sessionsRemainingBadge || "sessions left")}
                                </span>
                              </div>

                              {/* Included Services List */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] block">
                                  {tr.packageServicesCovered || "Included Services & Sessions:"}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(pkg.items || []).map((it: any) => {
                                    const isSelected = String(it.serviceId) === String(selectedServiceId);
                                    const svcName = (lang === "ar" && it.serviceNameAr) ? it.serviceNameAr : it.serviceName;

                                    return (
                                      <div
                                        key={it.id}
                                        onClick={() => {
                                          if (!isSelected) {
                                            setSelectedServiceId(String(it.serviceId));
                                          }
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                                          isSelected
                                            ? "border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-600 text-emerald-900 font-bold"
                                            : "border-gray-200 bg-gray-50/50 hover:bg-white text-[#1F251A]"
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          {isSelected ? (
                                            <Check size={13} className="text-emerald-700 shrink-0" />
                                          ) : (
                                            <Sparkles size={13} className="text-[#8B9882] shrink-0" />
                                          )}
                                          <span className="truncate">{svcName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            it.qtyRemaining > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                                          }`}>
                                            {it.qtyRemaining} / {it.qtyTotal}
                                          </span>
                                          {isSelected && (
                                            <span className="text-[9px] font-black uppercase text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                                              {tr.currentlySelectedService || "Selected"}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Pay with Package Checkbox / Option */}
                              {matchingPackageItem && matchingPackageItem.qtyRemaining > 0 && matchingPackage?.id === pkg.id ? (
                                <div className="pt-2 border-t border-[#414E36]/10">
                                  <label
                                    onClick={() => {
                                      const next = !usePackagePayment;
                                      setUsePackagePayment(next);
                                      if (next) {
                                        setSelectedPackageId(pkg.id);
                                        setSelectedPackageItemId(matchingPackageItem.id);
                                        setCustomBookingValue(0);
                                        setAmountPaidNow(0);
                                      } else {
                                        setSelectedPackageId("");
                                        setSelectedPackageItemId("");
                                        setCustomBookingValue(null);
                                        setAmountPaidNow("");
                                      }
                                    }}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                      usePackagePayment
                                        ? "border-emerald-600 bg-emerald-100/60 ring-1 ring-emerald-600"
                                        : "border-gray-200 bg-[#FBFBF9] hover:bg-emerald-50/40"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={usePackagePayment}
                                      onChange={(e) => {
                                        const next = e.target.checked;
                                        setUsePackagePayment(next);
                                        if (next) {
                                          setSelectedPackageId(pkg.id);
                                          setSelectedPackageItemId(matchingPackageItem.id);
                                          setCustomBookingValue(0);
                                          setAmountPaidNow(0);
                                        } else {
                                          setSelectedPackageId("");
                                          setSelectedPackageItemId("");
                                          setCustomBookingValue(null);
                                          setAmountPaidNow("");
                                        }
                                      }}
                                      className="mt-0.5 h-4 w-4 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                                    />
                                    <div className="space-y-0.5 flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-xs text-emerald-950">
                                          {tr.payWithPackageOption || "Pay with Package Session"}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                                          0 EGP
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-emerald-900/80 font-medium">
                                        {tr.payWithPackageDesc || "Redeem 1 session from patient's package for this appointment (0 EGP to pay)"}
                                      </p>
                                      {usePackagePayment && (
                                        <p className="text-[10px] text-emerald-800 font-bold pt-1 flex items-center gap-1">
                                          <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                                          <span>{tr.packageDeductionNote || "1 session will be deducted from package upon appointment completion"}</span>
                                        </p>
                                      )}
                                    </div>
                                  </label>
                                </div>
                              ) : !isServiceCoveredInThisPkg ? (
                                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                                  <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-bold">
                                      {tr.serviceNotCoveredInPackage || "Selected service is not covered in this package"}
                                    </span>
                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                      <span className="text-[10px] text-[#5A6A51] font-semibold">
                                        {tr.switchToCoveredService || "Switch to a covered service:"}
                                      </span>
                                      {(pkg.items || []).filter((it: any) => it.qtyRemaining > 0).map((it: any) => (
                                        <button
                                          key={it.id}
                                          type="button"
                                          onClick={() => setSelectedServiceId(String(it.serviceId))}
                                          className="text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-100/60 px-2 py-0.5 rounded-md border border-emerald-300 transition cursor-pointer"
                                        >
                                          + {(lang === "ar" && it.serviceNameAr) ? it.serviceNameAr : it.serviceName} ({it.qtyRemaining})
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 1. AVAILABLE TIME (MULTI-SLOT SELECTION) ── */}
              <div>
                <label className="block font-bold text-[#1F251A] mb-2">{tr.availableTimeLabel}</label>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTimeModal(true)}
                    className={`w-full max-w-md rounded-2xl border-2 bg-[var(--cr-white)] px-4 py-3.5 flex items-center gap-3 text-sm font-extrabold text-[var(--cr-dark)] transition cursor-pointer ${
                      formErrors.time ? "border-red-500 ring-2 ring-red-200" : "border-[var(--cr-primary)] hover:bg-white"
                    }`}
                  >
                    <Clock size={22} className="text-[var(--cr-primary)] shrink-0" />
                    <span className="flex-1 text-start">
                      {selectedTime || tr.showAvailableTimeLabel}
                    </span>
                    <ChevronDown size={22} className="text-[var(--cr-primary)]" />
                  </button>

                  {showTimeModal && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto animate-fadeIn"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setShowTimeModal(false);
                      }}
                    >
                      <div
                        className="relative w-full max-w-2xl rounded-3xl border border-[#414E36]/15 bg-white p-6 shadow-2xl space-y-4 text-start animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-full bg-[#EDF1EC] text-emerald-800 flex items-center justify-center shrink-0">
                              <Clock size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm md:text-base font-black text-[var(--cr-dark)]">{tr.availableTimeHeading}</h3>
                                <span className="text-xs font-semibold text-[var(--cr-secondary)]">
                                  ({totalDurationMinutes} {tr.minutesPerSlotLabel})
                                </span>
                              </div>
                              <p className="text-xs text-[#5A6A51] mt-0.5">
                                {formattedDateStr} • {selectedDoctorName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedTimes.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearSlots}
                                className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                              >
                                {tr.clearSlotsBtn}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowTimeModal(false)}
                              className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-[#1F251A] transition cursor-pointer"
                              title="Close"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        {loadingSlots ? (
                          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-[#5A6A51]">
                            <Loader2 size={20} className="animate-spin text-emerald-700" /> {tr.fetchingSlotsLabel}
                          </div>
                        ) : allTimeSlots.length > 0 ? (
                          <div className="max-h-72 overflow-y-auto pr-1">
                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${
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
                                    className={`h-11 rounded-xl border px-3 text-xs font-bold transition flex items-center justify-between gap-1.5 select-none ${
                                      isSelected
                                        ? "border-[var(--cr-primary)] bg-[#1E3A2B] text-white shadow-sm ring-2 ring-emerald-700/20"
                                        : isDisabled
                                        ? "cursor-not-allowed border-[var(--cr-divider)] bg-[var(--cr-white)] text-[var(--cr-secondary)] opacity-50"
                                        : "cursor-pointer border-[#414E36]/15 bg-white text-[#1F251A] hover:border-emerald-700 hover:bg-emerald-50/50"
                                    }`}
                                  >
                                    <span>{tSlot}</span>
                                    {isSelected ? (
                                      <Check size={14} className="shrink-0 text-white" />
                                    ) : (
                                      <Clock size={14} className="shrink-0 text-[#8B9882]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 text-xs text-amber-900">
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

      </div>

      {/* ── BOTTOM ACTIONS BAR ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#414E36]/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
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
                <div className="text-end">
                  <span className="font-extrabold text-[#1F251A] block">{selectedServiceName}</span>
                  {isLaserService && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded mt-0.5">
                      <Sparkles size={10} /> Laser Service
                    </span>
                  )}
                </div>
              </div>

              {isLaserService && (
                <div className="flex justify-between items-center pb-2.5 border-b border-[#414E36]/10">
                  <span className="text-[#5A6A51] font-semibold">{tr.laserPaymentModeLabel || "Laser Payment"}</span>
                  <span className="font-bold text-emerald-900 text-end text-xs">
                    {laserPaymentMode === "SERVICE"
                      ? (tr.laserOption1Title || "Pay by Service (Fixed Price)")
                      : laserPaymentMode === "PER_PULSE"
                      ? `${tr.laserOption2Title || "Pay per Pulse"} (@ ${laserPerPulsePrice} ${tr.egpLabel || "EGP"}/p)`
                      : (tr.laserOption3Title || "Pay with Pulse Package")}
                  </span>
                </div>
              )}

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

              {usePackagePayment || usePackageMode ? (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center font-extrabold text-[#1F251A]">
                    <span className="text-[#5A6A51] font-semibold">{tr.pricePaymentLabel}</span>
                    <span className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-700" />
                      <span>0 {tr.egpLabel} ({tr.paymentMethodPackage || "Package Redemption"})</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#5A6A51] font-semibold">{tr.activePackageHeading || "Package"}</span>
                    <span className="font-bold text-emerald-900">
                      {matchingPackage ? ((lang === "ar" && matchingPackage.packageNameAr) ? matchingPackage.packageNameAr : matchingPackage.packageName) : (activePackage?.name || "Prepaid Package")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#414E36]/10 font-extrabold">
                    <span className="text-[#5A6A51] font-semibold">{tr.remainingValueLabel || "Remaining Value"}</span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      0 {tr.egpLabel} ({tr.fullySettledBadge || "Fully Settled"})
                    </span>
                  </div>
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
              <h3 className="text-2xl font-black text-[#1F251A]">{tr.patientAccountModalTitle || "Patient Account"}</h3>
              <p className="text-sm font-medium text-[#5A6A51]">
                {tr.patientAccountModalQuestion || "Does the patient already have an account?"}
              </p>
            </div>

            <div className="w-full border-b border-gray-100" />

            {/* Actions: No (New patient -> Show Additional Fields, Primary Color) / Yes (Existing patient -> Hide Additional Fields, White/Outline) */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAdditionalPatientFields(true);
                  setShowPatientAccountModal(false);
                }}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#0F3826] text-white font-bold text-sm hover:bg-[#0A271A] transition shadow-md cursor-pointer"
              >
                {tr.patientAccountModalNo || "No"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdditionalPatientFields(false);
                  setShowPatientAccountModal(false);
                }}
                className="flex-1 py-3 px-5 rounded-2xl border border-[#414E36]/30 text-[#1F251A] font-bold text-sm hover:bg-gray-50 transition cursor-pointer"
              >
                {tr.patientAccountModalYes || "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
