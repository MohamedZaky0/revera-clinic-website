"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback, useRef, Fragment } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { ServiceItem, SERVICES, ALL_15MIN_SLOTS, getServiceDurationMinutes, getDurationInMinutes, normaliseTo24hSlot, getEffectiveServicePrice, getServicePriceDetails } from "@/lib/services";
import { 
  getServiceToggles, 
  setServiceToggle, 
  getDynamicCategories, 
  saveDynamicCategories,
  LocalCategory 
} from "@/lib/serviceStore";
import { compressImage } from "@/lib/image";
import { printInvoice, printPrescription } from "@/lib/printUtils";
import { Branch } from "@/types";
import { translations } from "@/lib/translations";
import { CLIENT } from "@/config/client";
import { adminTranslations } from "@/components/admin/translations";
import UserProfileView from "@/components/admin/UserProfileView";
import ClinicProfileSettingsView from "@/components/admin/settings/ClinicProfileSettingsView";
import MedicalRecordsSettingsView from "@/components/admin/settings/MedicalRecordsSettingsView";
import RoleManagementView from "@/components/admin/settings/RoleManagementView";
import BookingSettingsView from "@/components/admin/settings/BookingSettingsView";
import DepositSettingsView from "@/components/admin/settings/DepositSettingsView";
import NotificationSettingsView from "@/components/admin/settings/NotificationSettingsView";
import QueueSettingsView from "@/components/admin/settings/QueueSettingsView";
import InactivitySettingsView from "@/components/admin/settings/InactivitySettingsView";
import BranchesView from "@/components/admin/settings/BranchesView";
import ServiceHoursView from "@/components/admin/settings/ServiceHoursView";
import ServicesPageSettingsView from "@/components/admin/settings/ServicesPageSettingsView";
import HomePageSettingsView from "@/components/admin/settings/HomePageSettingsView";
import AboutUsPageSettingsView from "@/components/admin/settings/AboutUsPageSettingsView";
import MedicalReportModal from "@/components/admin/patients/MedicalReportModal";
import MedicalFormModal from "@/components/admin/patients/MedicalFormModal";
import CustomerFormModal from "@/components/admin/patients/CustomerFormModal";
import PatientsDirectoryView from "@/components/admin/patients/PatientsDirectoryView";
import { useCustomerProfile } from "@/components/admin/patients/useCustomerProfile";
import CustomerProfileDrawer from "@/components/admin/patients/CustomerProfileDrawer";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Camera,
  BarChart3,
  Bell,
  Box,
  CalendarDays,
  Calendar,
  Printer,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  MoreVertical,
  FileText,
  Filter,
  Info,
  Hourglass,
  Layers,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Monitor,
  Menu,
  Package,
  PackageCheck,
  Archive,
  Cpu,
  Gauge,
  History,
  RotateCcw,
  Wrench,
  AlertTriangle,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Play,
  Terminal,
  Activity,
  ShoppingBag,
  CircleDollarSign,
  Presentation,
  TrendingUp,
  CircleUser,
  User,
  Tag,
  PlusCircle,
  Pencil,
  Megaphone,
  Quote,
  Map as MapIcon,
  ClipboardList,
  Clock,
  Shield,
  Star,
  Store,
  Ticket,
  Trophy,
  Truck,
  Undo,
  Upload,
  Users,
  Trash2,
  Briefcase,
  Phone,
  Lock,
  Zap,
  Coffee,
  CheckCircle,
  UserX,
  Target,
  Check,
  GripVertical,
  X,
  ListOrdered,
  DoorOpen,
  MapPin,
  Loader2,
  Copy,
  Wallet,
  ReceiptText,
} from "lucide-react";
import { TransactionsView } from "@/components/admin/transactions/TransactionsView";
import { NewManualTransactionView } from "@/components/admin/transactions/NewManualTransactionView";
import RoomsManagerView from "@/components/RoomsManagerView";
import SupplierManagementScreen from "@/components/admin/inventory/SupplierManagementScreen";
import { PackageAdminPanel } from "@/components/admin/packages/PackageAdminPanel";
import { PromotionsAdminPanel } from "@/components/admin/marketing/PromotionsAdminPanel";
import { FinanceSection } from "@/components/admin/Finance/FinanceSection";
import { DoctorServiceCommissionEditor, ServiceCommissionEntry, DefaultCommissionType } from "@/components/admin/services/DoctorServiceCommissionEditor";
import DoctorAccountView from "@/components/admin/DoctorAccountView";
import ReceptionDashboardView from "@/components/admin/reception/ReceptionDashboardView";
import { AdminBookingsView } from "@/components/admin/bookings/AdminBookingsView";
import AdminNewBookingView from "@/components/admin/bookings/AdminNewBookingView";
import AdminAddPreviousBookingView from "@/components/admin/bookings/AdminAddPreviousBookingView";
import { DoctorProfileDetailsView } from "@/components/admin/doctor/DoctorProfileDetailsView";
import DoctorAuditLogsModal from "@/components/admin/doctor/DoctorAuditLogsModal";
import { useProviderForm } from "@/components/admin/doctor/useProviderForm";
import ProviderFormModal from "@/components/admin/doctor/ProviderFormModal";
import AdminDoctorsView from "@/components/admin/doctor/AdminDoctorsView";
import AdminServicesView from "@/components/admin/services/AdminServicesView";
import AdminInventoryView from "@/components/admin/inventory/AdminInventoryView";
import AdminEmployeesView from "@/components/admin/employees/AdminEmployeesView";
import AdminHrView from "@/components/admin/hr/AdminHrView";
import CustomerSupportView from "@/components/admin/support/CustomerSupportView";
import ReportsAnalyticsView from "@/components/admin/reports/ReportsAnalyticsView";
import type { InventoryProductsTabRef } from "@/components/admin/inventory/InventoryProductsTab";
import TermsManagerView from "@/components/TermsManagerView";
import { useAlertConfirm } from "@/contexts/AlertConfirmContext";
import { cachedFetch, clearFetchCache } from "@/lib/fetchCache";

type Req = {
  id: string;
  serviceId: number;
  serviceIds?: number[];
  date: string;
  requestedTime?: string | null;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  doctorNotes?: string | null;
  receptionNotes?: string | null;
  status: string;
  timeSlot?: string | null;
  sessionType?: string;
  doctorName?: string | null;
  createdAt?: string;
  isManual?: boolean;
  branchId?: string | null;
  customerId?: string | null;
  amountPaid?: number;
  amountLeft?: number | null;
  roomId?: string | null;
  rooms?: string[];
  createdByEmployeeId?: string | null;
  followUpDate?: string | null;
};

function getStatusBadgeClass(status: string): string {
  const s = status?.toLowerCase() || 'pending';
  switch (s) {
    case 'approved':
      return 'bg-green-50 text-green-700 border border-green-200/50';
    case 'confirmed':
      return 'bg-sky-50 text-sky-700 border border-sky-200/50';
    case 'started':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200/50';
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
    case 'cancelled':
    case 'canceled':
      return 'bg-gray-50 text-gray-500 border border-gray-200/50';
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200/50';
    case 'pending_deposit':
      return 'bg-purple-50 text-purple-700 border border-purple-200/50';
    case 'no_show':
      return 'bg-orange-50 text-orange-700 border border-orange-200/50';
    case 'postponed':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200/50';
    case 'pending':
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200/50';
  }
}

const SLOTS = ALL_15MIN_SLOTS;

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Bookings", icon: CalendarDays },
  { label: "Patients", icon: Users },
  { label: "Doctors", icon: ShieldCheck },
  { label: "Services", icon: Layers },
  { label: "Inventory", icon: PackageCheck },
  { label: "Employees", icon: CircleUser },
  { label: "HR", icon: ClipboardList },
  { label: "Marketing", icon: Megaphone, submenu: true },
  { label: "Transactions", icon: ReceiptText },
  { label: "Customer Support", icon: MessageSquare },
  { label: "Reports", icon: BarChart3 },
  { label: "Finance", icon: CircleDollarSign },
  { label: "Settings", icon: Settings, submenu: true },
  { label: "Logout", icon: LogOut },
];

const overviewCards = [
  { label: "Active bookings", value: "34", accent: "bg-[#C4AE7C]/10", icon: CalendarDays },
  { label: "New customers", value: "14", accent: "bg-[#C4AE7C]/10", icon: Users },
  { label: "Revenue", value: "$76K", accent: "bg-[#C4AE7C]/10", icon: DollarSign },
  { label: "Open requests", value: "9", accent: "bg-[#C4AE7C]/10", icon: FileText },
];

const PROVIDERS: any[] = [];

const TARGET_BONUSES = [] as const;

type Customer = {
  id?: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  lastBookingDate?: string | null;
  lastBookingTime?: string | null;
  bookings: number;
  spent: number;
  outstanding: number;
  wallet: number;
  mobile?: string;
  gender?: string | null;
  number_of_bookings?: number;
  registration_date?: string;
  active?: boolean;
  spent_amount?: number;
  wallet_balance?: number;
  area?: string | null;
  location_name?: string | null;
  street_name?: string | null;
  building_no?: string | null;
  floor_no?: string | null;
  city?: string | null;
  street?: string | null;
  building?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  // new demographic fields
  age?: number | null;
  national_id?: string | null;
  address?: string | null;
  referral?: string | null;
  avatar_url?: string | null;
  occupation?: string | null;
};

const MOCK_MEDICINES = [
  {
    id: "MED-001",
    name: "Amoxicillin 500mg",
    description: "Broad-spectrum antibiotic",
    category: "Antibiotics",
    dosageForm: "Capsule",
    price: "EGP 120.00",
    stock: "In Stock"
  },
  {
    id: "MED-002",
    name: "Paracetamol 500mg",
    description: "Analgesic and antipyretic",
    category: "Analgesics",
    dosageForm: "Tablet",
    price: "EGP 45.00",
    stock: "In Stock"
  },
  {
    id: "MED-003",
    name: "Ibuprofen 400mg",
    description: "Nonsteroidal anti-inflammatory drug",
    category: "Analgesics",
    dosageForm: "Tablet",
    price: "EGP 60.00",
    stock: "In Stock"
  },
  {
    id: "MED-004",
    name: "Claritin 10mg",
    description: "Non-drowsy 24-hour allergy relief",
    category: "Antihistamines",
    dosageForm: "Tablet",
    price: "EGP 180.00",
    stock: "Low Stock"
  },
  {
    id: "MED-005",
    name: "Flonase Nasal Spray",
    description: "Allergy symptom reliever spray",
    category: "Antihistamines",
    dosageForm: "Spray",
    price: "EGP 250.00",
    stock: "In Stock"
  },
  {
    id: "MED-006",
    name: "Lipitor 20mg",
    description: "Cholesterol-lowering medication",
    category: "Cardiovascular",
    dosageForm: "Tablet",
    price: "EGP 320.00",
    stock: "Out of Stock"
  }
];

function parseEgyptianNationalId(id: string) {
  if (!id || id.length !== 14 || !/^\d{14}$/.test(id)) {
    return { isValid: false, reason: "National ID must be exactly 14 digits.", age: null, dobIso: null, dobFormatted: null, gender: null, governorate: null };
  }

  const centuryDigit = parseInt(id.charAt(0));
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return { isValid: false, reason: "Invalid first digit (must start with 2 or 3).", age: null, dobIso: null, dobFormatted: null, gender: null, governorate: null };
  }

  const yearPart = id.substring(1, 3);
  const monthPart = id.substring(3, 5);
  const dayPart = id.substring(5, 7);

  const year = (centuryDigit === 2 ? 1900 : 2000) + parseInt(yearPart);
  const month = parseInt(monthPart);
  const day = parseInt(dayPart);

  // Validate date
  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return { isValid: false, reason: "Invalid birth date encoded in ID.", age: null, dobIso: null, dobFormatted: null, gender: null, governorate: null };
  }

  const govCode = id.substring(7, 9);
  const governorates: Record<string, string> = {
    "01": "Cairo",
    "02": "Alexandria",
    "03": "Port Said",
    "04": "Suez",
    "11": "Damietta",
    "12": "Dakahlia",
    "13": "Sharkia",
    "14": "Kalyobia",
    "15": "Kafr El-Sheikh",
    "16": "Gharbia",
    "17": "Menoufia",
    "18": "Beheira",
    "19": "Ismailia",
    "21": "Giza",
    "22": "Beni Suef",
    "23": "Fayoum",
    "24": "Minya",
    "25": "Asyut",
    "26": "Sohag",
    "27": "Qena",
    "28": "Aswan",
    "29": "Luxor",
    "31": "Red Sea",
    "32": "New Valley",
    "33": "Matrouh",
    "34": "North Sinai",
    "35": "South Sinai",
    "88": "Foreign birth"
  };

  const governorate = governorates[govCode] || "Unknown Governorate";

  const genderDigit = parseInt(id.charAt(12));
  const gender = genderDigit % 2 === 0 ? "Female" : "Male";

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }

  const dobIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dobFormatted = birthDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return {
    isValid: true,
    birthDate: birthDate.toLocaleDateString("en-US", { dateStyle: "long" }),
    dobFormatted,
    dobIso,
    age,
    governorate,
    gender
  };
}

function getDoctorFirstReservationDate(docName: string, resList: any[]): string | null {
  if (!docName || !Array.isArray(resList) || resList.length === 0) return null;
  const cleanDoc = docName.trim().toLowerCase();
  if (!cleanDoc) return null;
  
  const doctorBookings = resList.filter((r: any) => {
    if (!r || r.status === 'rejected' || r.status === 'cancelled') return false;
    const rName = (r.doctorName || r.doctor_name || '').trim().toLowerCase();
    if (!rName) return false;
    return rName.includes(cleanDoc) || cleanDoc.includes(rName);
  });

  if (doctorBookings.length === 0) return null;

  doctorBookings.sort((a, b) => {
    const da = String(a.date || '').slice(0, 10);
    const db = String(b.date || '').slice(0, 10);
    return da.localeCompare(db);
  });

  const firstDate = String(doctorBookings[0].date || '').slice(0, 10);
  return firstDate && /^\d{4}-\d{2}-\d{2}$/.test(firstDate) ? firstDate : null;
}

const DEFAULT_HERO_SLIDES = [
  {
    welcome: "Welcome to Revera Clinics",
    heading: "Transform Your Beauty Naturally!",
    description: "Expert dermatology and cosmetic surgery services with personalized care designed to help you achieve your beauty and health goals through advanced medical techniques.",
    bookBtn: "Book Appointment",
    rating: "4.5",
    reviewCount: "(1000+ review)",
    image: "/images/hero/slide-1.jpg"
  },
  {
    welcome: "Welcome to Revera Clinics",
    heading: "Advanced Medical Care You Can Trust!",
    description: "Discover comprehensive dermatology, cosmetic surgery, laser treatments, and physical therapy services tailored to your unique needs. With over 15 years of professional expertise, we're here to guide you toward lasting beauty and wellness.",
    bookBtn: "Book Appointment",
    rating: "4.5",
    reviewCount: "(1000+ review)",
    image: "/images/hero/slide-2.jpg"
  },
  {
    welcome: "Welcome to Revera Clinics",
    heading: "Your Beauty & Health Journey Starts Here!",
    description: "Specialized clinics under full medical supervision offering services in dermatology, cosmetic surgery, laser treatments, and physical therapy care for all ages.",
    bookBtn: "Book Appointment",
    rating: "4.5",
    reviewCount: "(1000+ review)",
    image: "/images/hero/slide-3.jpg"
  }
];

const DEFAULT_HERO_SLIDES_AR = [
  {
    welcome: "مرحباً بكم في عيادات ريفيرا",
    heading: "حوّل جمالك بشكل طبيعي!",
    description: "خدمات متخصصة في طب الجلدية والجراحة التجميلية مع رعاية شخصية مصممة لمساعدتك على تحقيق أهدافك في الجمال والصحة من خلال تقنيات طبية متقدمة.",
    bookBtn: "احجز موعدًا",
    rating: "4.5",
    reviewCount: "(1000+ تقييم)",
    image: "/images/hero/slide-1.jpg"
  },
  {
    welcome: "مرحباً بكم في عيادات ريفيرا",
    heading: "رعاية طبية متقدمة يمكنك الوثوق بها!",
    description: "اكتشف خدمات شاملة في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان المصممة لاحتياجاتك الفريدة. مع أكثر من 15 عاماً من الخبرة المهنية، نحن هنا لإرشادك نحو الجمال الدائم والعافية.",
    bookBtn: "احجز موعدًا",
    rating: "4.5",
    reviewCount: "(1000+ تقييم)",
    image: "/images/hero/slide-2.jpg"
  },
  {
    welcome: "مرحباً بكم في عيادات ريفيرا",
    heading: "رحلتك نحو الجمال والصحة تبدأ هنا!",
    description: "عيادات متخصصة تحت إشراف طبي كامل تقدم خدمات في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان لجميع الأعمار.",
    bookBtn: "احجز موعدًا",
    rating: "4.5",
    reviewCount: "(1000+ تقييم)",
    image: "/images/hero/slide-3.jpg"
  }
];

// Shows staff, wherever a patient is in view for booking/checkout, whether that patient owns
// active packages (with remaining sessions) and/or is eligible for an active promotion on a
// specific service — informational only here; redemption itself only happens at checkout
// (see the Payment Settlement modal), since a package session can only be consumed against a
// real completed reservation (DEC-023's deferred-revenue model).
function PatientPackagePromoBanner({
  packages,
  promotions,
}: {
  packages: any[];
  promotions: { serviceName: string; promotionText: string }[];
}) {
  const activeItems = packages
    .filter((pkg: any) => pkg.status === "active" && (!pkg.expiresAt || new Date(pkg.expiresAt) >= new Date()))
    .flatMap((pkg: any) =>
      (pkg.items || [])
        .filter((it: any) => it.qtyRemaining > 0)
        .map((it: any) => ({ key: `${pkg.id}-${it.id}`, packageName: pkg.packageName, serviceName: it.serviceName || `Service #${it.serviceId}`, qtyRemaining: it.qtyRemaining }))
    );

  if (activeItems.length === 0 && promotions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#C4AE7C]/30 bg-[#FBF8F0] p-4 space-y-2.5 text-xs">
      {activeItems.length > 0 && (
        <div>
          <p className="font-bold text-[#414E36] uppercase tracking-wider text-[10px] mb-1.5">Active Packages</p>
          <div className="flex flex-wrap gap-1.5">
            {activeItems.map((it) => (
              <span key={it.key} className="inline-flex rounded-full bg-white border border-[#C4AE7C]/40 px-2.5 py-1 font-semibold text-[#414E36]">
                {it.packageName}: {it.serviceName} ({it.qtyRemaining} left)
              </span>
            ))}
          </div>
        </div>
      )}
      {promotions.length > 0 && (
        <div>
          <p className="font-bold text-[#C4AE7C] uppercase tracking-wider text-[10px] mb-1.5">Active Promotion</p>
          <div className="flex flex-wrap gap-1.5">
            {promotions.map((p, idx) => (
              <span key={idx} className="inline-flex rounded-full bg-[#C4AE7C] text-white px-2.5 py-1 font-bold uppercase tracking-wide">
                {p.serviceName}: {p.promotionText}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { showConfirm } = useAlertConfirm();
  const { isRTL } = useLanguage();
  // Auth state
  const [session, setSession] = useState<any>(null);
  const authenticatedJsonHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token || ""}`
  };

  // Service CRUD helpers — services are now database-primary, not localStorage (RISK-025)
  const loadServicesFromApi = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/services", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("Failed to load services from API:", res.status, await res.text());
        return;
      }
      const data = await res.json();
      setLocalServices(Array.isArray(data) ? data : []);
      const storedToggles = getServiceToggles();
      const defaults = Object.fromEntries((Array.isArray(data) ? data : []).map((s: ServiceItem) => [s.id, { visible: true, active: true }]));
      setServiceToggles({ ...defaults, ...storedToggles });
    } catch (err) {
      console.error("Error loading services from API:", err);
    }
  }, [session?.access_token]);

  const syncServicesToApi = useCallback(async (services: ServiceItem[]) => {
    if (!session?.access_token) return null;
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(services),
      });
      if (!res.ok) {
        console.error("Failed to save services to API:", res.status, await res.text());
        return null;
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    } catch (err) {
      console.error("Error saving services to API:", err);
      return null;
    }
  }, [session?.access_token, authenticatedJsonHeaders]);

  const deleteServiceFromApi = useCallback(async (id: number) => {
    if (!session?.access_token) return false;
    try {
      const res = await fetch(`/api/services?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      return res.ok;
    } catch (err) {
      console.error("Error deleting service from API:", err);
      return false;
    }
  }, [session?.access_token]);

  // Inactivity Settings State
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(30);
  const [inactivityCountdown, setInactivityCountdown] = useState<number>(10);
  const [savingInactivitySettings, setSavingInactivitySettings] = useState(false);
  // RISK-043: how long a session may sit `started`/`in_progress` before AdminBookingsView flags it
  // as forgotten. Configurable so a clinic that runs longer sessions isn't stuck with false alarms.
  const [bookingStaleSessionHours, setBookingStaleSessionHours] = useState<number>(2);
  // Rooms state
  const [rooms, setRooms] = useState<any[]>([]);

  function fetchRooms() {
    cachedFetch("/api/rooms", 5000)
      .then(data => {
        setRooms(Array.isArray(data) ? data : []);
      })
      .catch(() => setRooms([]));
  }
  const [authChecking, setAuthChecking] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminDepartment, setAdminDepartment] = useState<string>("");
  const [forceAdminView, setForceAdminView] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const hasPermission = useCallback((permKey: string): boolean => {
    if (adminRole === 'superadmin') return true;
    if (!adminPermissions) return false;
    if (adminPermissions.includes(permKey)) return true;
    
    // Backward compatibility & hierarchical fallbacks
    // Bookings fallbacks
    if (permKey.startsWith("bookings.")) {
      if (adminPermissions.includes("Bookings") || adminPermissions.includes("bookings")) return true;
      if (["bookings.action_print_schedule", "bookings.action_export_csv"].includes(permKey)) {
        if (adminPermissions.includes("bookings.view_calendar") || adminPermissions.includes("bookings.view_list")) return true;
      }
      if (permKey === "bookings.action_add_previous" && adminPermissions.includes("bookings.create")) return true;
      if (["bookings.action_postpone", "bookings.action_cancel", "bookings.action_no_show", "bookings.status_change", "bookings.manage_services", "bookings.manage_notes", "bookings.manage_prescriptions", "bookings.manage_invoices", "bookings.settle_payment"].includes(permKey)) {
        if (adminPermissions.includes("bookings.edit")) return true;
      }
    }

    // Customers fallbacks
    if (permKey.startsWith("customers.")) {
      if (adminPermissions.includes("Customers") || adminPermissions.includes("customers")) return true;
      if (["customers.create", "customers.edit", "customers.import", "customers.action_edit", "customers.action_settle_balance", "customers.manage_wallet", "customers.manage_reports"].includes(permKey)) {
        if (adminPermissions.includes("customers.create_edit") || adminPermissions.includes("customers.edit")) return true;
      }
      if (["customers.action_view_profile", "customers.view_history", "customers.export"].includes(permKey)) {
        if (adminPermissions.includes("customers.view")) return true;
      }
      if (permKey === "customers.delete" || permKey === "customers.action_delete") {
        if (adminPermissions.includes("customers.delete")) return true;
      }
    }

    // Providers / Doctors fallbacks
    if (permKey.startsWith("providers.")) {
      if (adminPermissions.includes("Providers") || adminPermissions.includes("providers") || adminPermissions.includes("Doctors") || adminPermissions.includes("doctors")) return true;
      if (["providers.create", "providers.edit", "providers.action_edit", "providers.action_change_status", "providers.manage_schedule", "providers.commissions"].includes(permKey)) {
        if (adminPermissions.includes("providers.create_edit") || adminPermissions.includes("providers.edit")) return true;
      }
      if (permKey === "providers.delete" || permKey === "providers.action_delete") {
        if (adminPermissions.includes("providers.delete")) return true;
      }
    }

    // Services fallbacks
    if (permKey.startsWith("services.")) {
      if (adminPermissions.includes("Services") || adminPermissions.includes("services")) return true;
      if (["services.create", "services.create_category", "services.edit", "services.edit_category", "services.action_edit", "services.action_toggle_status"].includes(permKey)) {
        if (adminPermissions.includes("services.create_edit_delete") || adminPermissions.includes("services.edit") || adminPermissions.includes("services.create")) return true;
      }
      if (permKey === "services.delete" || permKey === "services.delete_category" || permKey === "services.action_delete") {
        if (adminPermissions.includes("services.create_edit_delete") || adminPermissions.includes("services.delete")) return true;
      }
    }

    // Inventory fallbacks
    if (permKey.startsWith("inventory.")) {
      if (adminPermissions.includes("Inventory") || adminPermissions.includes("inventory")) return true;
      if (["inventory.action_update_pulses", "inventory.action_reset_counter", "inventory.action_edit_device", "inventory.action_delete_device"].includes(permKey)) {
        if (adminPermissions.includes("inventory.manage_devices")) return true;
      }
      if (permKey === "inventory.action_view_device_history" && (adminPermissions.includes("inventory.view") || adminPermissions.includes("inventory.manage_devices"))) return true;
      if (["inventory.create_product", "inventory.edit_product", "inventory.adjust_stock", "inventory.delete_product"].includes(permKey)) {
        if (adminPermissions.includes("inventory.manage_products")) return true;
      }
      if (permKey === "inventory.manage_orders" && adminPermissions.includes("inventory.manage_suppliers")) return true;
    }

    // Employees fallbacks
    if (permKey.startsWith("employees.")) {
      if (adminPermissions.includes("Employees") || adminPermissions.includes("employees")) return true;
      if (permKey === "employees.action_view_info" && adminPermissions.includes("employees.view")) return true;
      if (["employees.action_edit", "employees.action_resend_invite", "employees.manage_departments"].includes(permKey)) {
        if (adminPermissions.includes("employees.edit")) return true;
      }
      if (permKey === "employees.action_delete" && adminPermissions.includes("employees.delete")) return true;
      if (permKey === "employees.export_attendance" && adminPermissions.includes("employees.view")) return true;
    }

    // HR fallbacks
    if (permKey.startsWith("hr.")) {
      if (adminPermissions.includes("HR") || adminPermissions.includes("hr")) return true;
      if (permKey === "hr.action_process_payroll" && (adminPermissions.includes("hr.manage_payroll") || adminPermissions.includes("hr.view_payroll"))) return true;
      if (permKey === "hr.export_attendance" && adminPermissions.includes("hr.view_attendance")) return true;
      if (["hr.manage_leaves", "hr.manage_performance"].includes(permKey) && adminPermissions.includes("hr.manage_attendance")) return true;
    }

    // Transactions fallbacks
    if (permKey.startsWith("transactions.")) {
      if (adminPermissions.includes("Transactions") || adminPermissions.includes("transactions")) return true;
      if (["transactions.action_view_details", "transactions.action_print_receipt"].includes(permKey)) {
        if (adminPermissions.includes("transactions.view")) return true;
      }
      if (permKey === "transactions.action_refund" && adminPermissions.includes("transactions.refund")) return true;
    }

    // Settings fallbacks
    if (permKey.startsWith("settings.")) {
      if (adminPermissions.includes("Settings") || adminPermissions.includes("settings")) return true;
    }

    // Clinical / Doctor Portal fallbacks
    if (permKey.startsWith("clinical.")) {
      if (adminPermissions.includes("Clinical") || adminPermissions.includes("clinical") || adminRole === "doctor" || adminRole === "Doctor") return true;
    }

    // Dashboard & Reception fallbacks
    if (permKey.startsWith("dashboard.") || permKey.startsWith("reception.")) {
      if (adminPermissions.includes("Dashboard") || adminPermissions.includes("dashboard") || adminPermissions.some(p => p.startsWith("dashboard.")) || adminPermissions.some(p => p.startsWith("reception."))) return true;
    }

    const parentScreenMap: Record<string, string> = {
      "dashboard": "Dashboard",
      "reception": "Dashboard",
      "bookings": "Bookings",
      "customers": "Patients",
      "providers": "Doctors",
      "services": "Services",
      "inventory": "Inventory",
      "employees": "Employees",
      "hr": "HR",
      "transactions": "Transactions",
      "marketing": "Marketing",
      "support": "Customer Support",
      "reports": "Reports",
      "finance": "Finance",
      "settings": "Settings",
      "clinical": "Clinical"
    };
    const category = permKey.split('.')[0];
    const legacyScreen = parentScreenMap[category];
    if (legacyScreen && adminPermissions.includes(legacyScreen)) {
      return true;
    }

    return false;
  }, [adminRole, adminPermissions]);

  const permittedSidebarItems = useMemo(() => {
    if (!adminRole) return [];
    if (adminRole === 'superadmin') return SIDEBAR_ITEMS;
    return SIDEBAR_ITEMS.filter(item => {
      if (item.label === 'Logout') return true;
      if (adminPermissions.includes(item.label)) return true;
      
      const parentScreenMap: Record<string, string> = {
        "Dashboard": "dashboard",
        "Bookings": "bookings",
        "Patients": "customers",
        "Doctors": "providers",
        "Services": "services",
        "Inventory": "inventory",
        "Employees": "employees",
        "HR": "hr",
        "Transactions": "transactions",
        "Marketing": "marketing",
        "Customer Support": "support",
        "Reports": "reports",
        "Finance": "finance",
        "Settings": "settings"
      };
      const prefix = parentScreenMap[item.label];
      if (prefix && (adminPermissions.includes(prefix) || adminPermissions.some(p => p.startsWith(prefix + ".")))) return true;
      if (prefix && hasPermission(prefix)) return true;
      
      return false;
    });
  }, [adminRole, adminPermissions, hasPermission]);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminEmployeeId, setAdminEmployeeId] = useState("");
  const [adminDbId, setAdminDbId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Setup password states (for invited users / password resets)
  const [showSetupPasswordModal, setShowSetupPasswordModal] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");

  // Role Management state
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [loadingRolesAndEmployees, setLoadingRolesAndEmployees] = useState(false);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState("");
  const [employeeCreateError, setEmployeeCreateError] = useState("");
  const [employeeCreateSuccess, setEmployeeCreateSuccess] = useState("");


  // Helpers: serialize structured address to a single string, and parse it back

  const [activeInfoFeature, setActiveInfoFeature] = useState<{ title: string; description: string } | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
  const [employeeProfileActiveTab, setEmployeeProfileActiveTab] = useState<string>("basic");
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isEditingEmployeeModalOpen, setIsEditingEmployeeModalOpen] = useState(false);






  // HR Module states
  const [hrActiveSubTab, setHrActiveSubTab] = useState("overview");
  const [payrollList, setPayrollList] = useState<any[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // Targets sub-tab states
  const [editingTargetEmployee, setEditingTargetEmployee] = useState<any | null>(null);
  const [targetAmountInput, setTargetAmountInput] = useState("");
  const [bonusPercentageInput, setBonusPercentageInput] = useState("");
  const [targetTypeInput, setTargetTypeInput] = useState<"reservations" | "revenue">("reservations");
  const [bonusTypeInput, setBonusTypeInput] = useState<"percentage" | "fixed">("percentage");

  // Doctor payroll states
  const [doctorPayrollList, setDoctorPayrollList] = useState<any[]>([]);
  const [loadingDoctorPayroll, setLoadingDoctorPayroll] = useState(false);
  const [selectedDoctorPayrollMonth, setSelectedDoctorPayrollMonth] = useState("2026-07");
  const [doctorPayrollSearchQuery, setDoctorPayrollSearchQuery] = useState("");
  const [doctorPayrollFilterStatus, setDoctorPayrollFilterStatus] = useState("All");
  const [doctorPayrollCurrentPage, setDoctorPayrollCurrentPage] = useState(1);

  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState("2026-07");
  const [payrollSearchQuery, setPayrollSearchQuery] = useState("");
  const [payrollFilterDepartment, setPayrollFilterDepartment] = useState("All");
  const [payrollFilterStatus, setPayrollFilterStatus] = useState("All");
  const [payrollCurrentPage, setPayrollCurrentPage] = useState(1);
  const [newLeaveEmployeeId, setNewLeaveEmployeeId] = useState("");
  const [newLeaveType, setNewLeaveType] = useState("Sick");
  const [newLeaveStartDate, setNewLeaveStartDate] = useState("");
  const [newLeaveEndDate, setNewLeaveEndDate] = useState("");
  const [newLeaveReason, setNewLeaveReason] = useState("");

  const [newReviewEmployeeId, setNewReviewEmployeeId] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComments, setNewReviewComments] = useState("");
  const [newReviewGoals, setNewReviewGoals] = useState("");
  // Attendance and Activity Monitoring states
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [activeMissingAlerts, setActiveMissingAlerts] = useState<any[]>([]);
  const [presenceModalOpen, setPresenceModalOpen] = useState(false);
  const [presenceCountdown, setPresenceCountdown] = useState(10);
  const [locationWarningOpen, setLocationWarningOpen] = useState(false);
  const [locationWarningMsg, setLocationWarningMsg] = useState("");
  // Profile settings states
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profilePasswordSaving, setProfilePasswordSaving] = useState(false);
  const [profilePasswordError, setProfilePasswordError] = useState("");
  const [profilePasswordSuccess, setProfilePasswordSuccess] = useState("");

  // Personal profile states
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileNatId, setProfileNatId] = useState("");
  const [profileNatIdFront, setProfileNatIdFront] = useState("");
  const [profileNatIdBack, setProfileNatIdBack] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState("");
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState("");


  const [requests, setRequests] = useState<Req[]>([]);
  const [allReservations, setAllReservations] = useState<Req[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Req | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Req | null>(null);
  const [drawerPrescriptions, setDrawerPrescriptions] = useState<any[]>([]);
  const [showDrawerPrescriptionModal, setShowDrawerPrescriptionModal] = useState(false);
  const [showDrawerProductModal, setShowDrawerProductModal] = useState(false);
  const [selectedDrawerProductId, setSelectedDrawerProductId] = useState("");
  const [selectedDrawerProductQty, setSelectedDrawerProductQty] = useState(1);
  const [drawerRxDiagnosis, setDrawerRxDiagnosis] = useState("");
  const [drawerRxMeds, setDrawerRxMeds] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [drawerRxNotes, setDrawerRxNotes] = useState("");
  const [savingDrawerRx, setSavingDrawerRx] = useState(false);

  useEffect(() => {
    if (viewingBooking) {
      const bookId = viewingBooking.id || "";
      const params = new URLSearchParams();
      if (bookId) {
        params.set("bookingId", String(bookId));
      }

      fetch(`/api/prescriptions?${params.toString()}`, { headers: authenticatedJsonHeaders })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setDrawerPrescriptions(Array.isArray(data) ? data : []))
        .catch((err) => console.warn("Error fetching drawer prescriptions:", err));
    } else {
      setDrawerPrescriptions([]);
    }
  }, [viewingBooking?.id]);

  function handleSendPrescriptionWhatsApp(rx: any, booking: any) {
    const rawPhone = String(booking?.phone || rx?.patient_phone || rx?.phone || '').trim();
    if (!rawPhone) {
      alert("No phone number found for this patient.");
      return;
    }
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
      cleanPhone = '20' + cleanPhone;
    }

    const patientName = rx.patient_name || rx.customer_name || booking?.name || 'Patient';
    const doctorName = rx.doctor_name || booking?.doctorName || 'Treating Doctor';
    const rxDate = rx.date ? String(rx.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const diagnosis = rx.diagnosis || 'Clinical Consultation';
    const notes = rx.general_notes || rx.instructions || rx.doctor_notes || rx.notes || '';

    const medsList: any[] = Array.isArray(rx.medications) && rx.medications.length > 0
      ? rx.medications
      : (Array.isArray(rx.items) ? rx.items : []);

    const medsText = medsList.length > 0
      ? medsList.map((m: any, idx: number) => 
          `${idx + 1}. *${m.name || m.medicine_name || m.medicine || 'Medication'}* ${m.dosage ? `(${m.dosage})` : ''}\n   ⏱️ التكرار / Frequency: ${m.frequency || 'حسب الإرشادات'}\n   ⏳ المدة / Duration: ${m.duration || 'حسب الحاجة'}`
        ).join('\n\n')
      : 'لا توجد أدوية مسجلة';

    const msg = 
`*REVERA CLINICS | روشتة طبية إلكترونية*
━━━━━━━━━━━━━━━━━━━━
👤 *المريض / Patient:* ${patientName}
📅 *التاريخ / Date:* ${rxDate}
👨‍⚕️ *الطبيب / Doctor:* ${doctorName}
${diagnosis ? `🩺 *التشخيص / Diagnosis:* ${diagnosis}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💊 *الأدوية الموصوفة / Prescribed Medications:*

${medsText}
━━━━━━━━━━━━━━━━━━━━
${notes ? `📝 *تعليمات الطبيب / Doctor Instructions:*\n${notes}\n━━━━━━━━━━━━━━━━━━━━\n` : ''}✨ مع تمنياتنا لكم بالشفاء العاجل ودوام الصحة والعافية.
📍 *Revera Clinics* — Sheikh Zayed & New Cairo
📞 (+20) 01035595691`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  const handleSaveDrawerPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingBooking) return;
    setSavingDrawerRx(true);
    try {
      const custId = viewingBooking.customerId || (viewingBooking as any).customer_id || null;
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          booking_id: viewingBooking.id,
          customer_id: custId ? String(custId) : null,
          patient_name: viewingBooking.name || "Patient",
          customer_name: viewingBooking.name || "Patient",
          doctor_name: viewingBooking.doctorName || null,
          date: viewingBooking.date || new Date().toISOString().slice(0, 10),
          diagnosis: drawerRxDiagnosis,
          medications: drawerRxMeds.filter((m) => m.name.trim() !== ""),
          instructions: drawerRxNotes,
          general_notes: drawerRxNotes,
          doctor_notes: viewingBooking.notes || ""
        })
      });

      if (res.ok) {
        alert("Digital Prescription saved successfully!");
        setShowDrawerPrescriptionModal(false);
        setDrawerRxDiagnosis("");
        setDrawerRxMeds([{ name: "", dosage: "", frequency: "", duration: "" }]);
        setDrawerRxNotes("");

        const params = new URLSearchParams();
        if (viewingBooking.id) params.set("bookingId", String(viewingBooking.id));

        const rxRes = await fetch(`/api/prescriptions?${params.toString()}`, { headers: authenticatedJsonHeaders });
        if (rxRes.ok) {
          const rxData = await rxRes.json();
          setDrawerPrescriptions(Array.isArray(rxData) ? rxData : []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save prescription.");
      }
    } catch (err: any) {
      console.error("Error saving prescription:", err);
      alert(err.message || "Error saving prescription.");
    } finally {
      setSavingDrawerRx(false);
    }
  };

  const handleAddProductToViewingBooking = async () => {
    if (!viewingBooking || !selectedDrawerProductId) return;
    const prod = (inventoryProducts || []).find((p: any) => String(p.id) === String(selectedDrawerProductId));
    if (!prod) return;

    const unitPrice = Number(prod.price || prod.unit_price || prod.selling_price || 0);
    const qty = Number(selectedDrawerProductQty) || 1;
    const total = unitPrice * qty;

    const currentProducts = Array.isArray((viewingBooking as any).attachedProducts) ? [...(viewingBooking as any).attachedProducts] : [];
    currentProducts.push({
      id: String(prod.id),
      name: prod.name,
      qty,
      unitPrice,
      total
    });

    // Calculate total base services cost
    const svcIds = Array.isArray(viewingBooking.serviceIds) ? viewingBooking.serviceIds : (viewingBooking.serviceId ? [viewingBooking.serviceId] : []);
    const baseServicesCost = svcIds.reduce((sum: number, id: number) => {
      const s = localServices.find(srv => srv.id === id);
      return sum + (s ? getEffectiveServicePrice(s, viewingBooking.branchId, branches) : 500);
    }, 0);

    // Calculate total attached products cost including newly added product
    const totalProductsCost = currentProducts.reduce((sum: number, p: any) => sum + (Number(p.total) || (Number(p.qty || 1) * Number(p.unitPrice || p.price || 0))), 0);
    const grandTotalCost = baseServicesCost + totalProductsCost;

    const sessionPaid = Number(viewingBooking.amountPaid || 0);
    const newLeft = Math.max(0, grandTotalCost - sessionPaid);

    const updatedNotes = (viewingBooking.notes || "") + `\n[Added Product]: ${prod.name} (x${qty}) - ${total} EGP`;

    // DEC-042: real reservation_products row, replacing free-text notes as the source of truth
    // for the drawer's Products panel / invoice line items (RISK-038, RISK-057). Notes append
    // above is kept as a human-readable audit trail and legacy display fallback, not removed.
    // If this reservation is already completed/invoiced, the endpoint folds the line into the
    // existing invoice immediately; otherwise it's picked up by writeCheckoutInvoice whenever this
    // booking is later completed.
    try {
      await fetch("/api/reservation-products", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          reservationId: viewingBooking.id,
          lineType: "product",
          productId: prod.id,
          description: prod.name,
          qty,
          unitPrice,
          addedByRole: "receptionist",
        }),
      });
    } catch (err) {
      console.error("Error persisting reservation_products row (non-fatal, amountLeft/notes PATCH still applies):", err);
    }

    try {
      const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
        method: "PATCH",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          amountLeft: newLeft,
          notes: updatedNotes,
          attachedProducts: currentProducts
        })
      });

      if (res.ok) {
        setViewingBooking((prev) =>
          prev
            ? {
                ...prev,
                amountLeft: newLeft,
                amount_left: newLeft,
                notes: updatedNotes,
                attachedProducts: currentProducts
              }
            : null
        );
        setShowDrawerProductModal(false);
        setSelectedDrawerProductId("");
        setSelectedDrawerProductQty(1);
        fetchAllReservations();
        fetchInventoryProducts();
        alert(`Product "${prod.name}" added to booking invoice!`);
      }
    } catch (err) {
      console.error("Error adding product to booking:", err);
    }
  };
  const [isEditingService, setIsEditingService] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  // Sync real-time reservation_products (products, additional services, pulses) on modal opens
  useEffect(() => {
    const activeId = viewingBooking?.id;
    if (!activeId) return;

    supabase
      .from('reservation_products')
      .select('*')
      .eq('reservation_id', activeId)
      .then((res: any) => {
        const { data, error } = res || {};
        if (!error && data && data.length > 0) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            name: p.description,
            qty: Number(p.qty) || 1,
            unitPrice: Number(p.unit_price) || 0,
            total: Number(p.total) || (Number(p.qty || 1) * Number(p.unit_price || 0)),
            addedBy: p.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist',
            lineType: p.line_type || (p.service_id ? 'additional_service' : 'product'),
            serviceId: p.service_id ?? null,
          }));
          setViewingBooking((prev: any) => {
            if (prev && String(prev.id) === String(activeId)) {
              return { ...prev, attachedProducts: mapped };
            }
            return prev;
          });
        }
      });
  }, [viewingBooking?.id]);
  const [dayBookingsSelector, setDayBookingsSelector] = useState<{
    open: boolean;
    date: string;
    bookings: any[];
  }>({
    open: false,
    date: "",
    bookings: [],
  });
  const [loadingApproveId, setLoadingApproveId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [slot, setSlot] = useState<string>("12:00");
  const [approveDate, setApproveDate] = useState<string>("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branch, setBranch] = useState<string>(""); // branch id; empty = all branches
  const [lang, setLang] = useState<"en" | "ar">(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(`${CLIENT.storagePrefix}_admin_lang`);
    return stored === "ar" ? "ar" : "en";
  });
  useEffect(() => {
    localStorage.setItem(`${CLIENT.storagePrefix}_admin_lang`, lang);
  }, [lang]);
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: "system-1",
      title: "Clinic System Active",
      message: "Twilio SMS integration and Supabase auth are fully operational.",
      time: "10m ago",
      read: false,
      type: "system"
    }
  ]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showExportCustomersModal, setShowExportCustomersModal] = useState(false);
  const [dbCustomers, setDbCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustomerFilterPanel, setShowCustomerFilterPanel] = useState(false);
  const [customerFilterGender, setCustomerFilterGender] = useState("All");
  const [customerFilterStatus, setCustomerFilterStatus] = useState("All");
  const [customerFilterReferral, setCustomerFilterReferral] = useState("All");
  const [showImportCustomersModal, setShowImportCustomersModal] = useState(false);
  const [showCustomerMoreMenu, setShowCustomerMoreMenu] = useState(false);
  const [activeCustomerRowMenuId, setActiveCustomerRowMenuId] = useState<string | null>(null);
  const [activeDoctorRowMenuId, setActiveDoctorRowMenuId] = useState<string | null>(null);
  const [activeServiceRowMenuId, setActiveServiceRowMenuId] = useState<string | number | null>(null);
  const [activeDeviceRowMenuId, setActiveDeviceRowMenuId] = useState<string | number | null>(null);
  const [activeProductRowMenuId, setActiveProductRowMenuId] = useState<string | number | null>(null);
  const customerMoreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && target.closest(".dropdown-action-menu")) {
        return;
      }
      if (customerMoreMenuRef.current && !customerMoreMenuRef.current.contains(event.target as Node)) {
        setShowCustomerMoreMenu(false);
      }
      setActiveCustomerRowMenuId(null);
      setActiveDoctorRowMenuId(null);
      setActiveServiceRowMenuId(null);
      setActiveDeviceRowMenuId(null);
      setActiveProductRowMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Customer Add/Edit Form states
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Checkout & Payment states
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null);
  const [checkoutAmountPaid, setCheckoutAmountPaid] = useState<string>("");
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(false);
  const [depositChangeToWallet, setDepositChangeToWallet] = useState<boolean>(false);
  const [savingCheckout, setSavingCheckout] = useState<boolean>(false);
  const [invoiceBooking, setInvoiceBooking] = useState<any>(null);
  const [ledgerInvoice, setLedgerInvoice] = useState<{ invoice: any; lines: any[] } | null>(null);
  const [copiedBookingRef, setCopiedBookingRef] = useState<boolean>(false);

  useEffect(() => {
    const activeId = invoiceBooking?.id;
    if (!activeId) { setLedgerInvoice(null); return; }

    // Fetch real ledger invoice from /api/invoices (Brief 32)
    if (session?.access_token) {
      fetch(`/api/invoices?reservationId=${encodeURIComponent(activeId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.invoice) {
            setLedgerInvoice(data);
          } else {
            setLedgerInvoice(null);
          }
        })
        .catch(() => setLedgerInvoice(null));
    } else {
      setLedgerInvoice(null);
    }

    supabase
      .from('reservation_products')
      .select('*')
      .eq('reservation_id', activeId)
      .then((res: any) => {
        const { data, error } = res || {};
        if (!error && data && data.length > 0) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            name: p.description,
            qty: Number(p.qty) || 1,
            unitPrice: Number(p.unit_price) || 0,
            total: Number(p.total) || (Number(p.qty || 1) * Number(p.unit_price || 0)),
            addedBy: p.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist',
            lineType: p.line_type || (p.service_id ? 'additional_service' : 'product'),
            serviceId: p.service_id ?? null,
          }));
          setInvoiceBooking((prev: any) => {
            if (prev && String(prev.id) === String(activeId)) {
              return { ...prev, attachedProducts: mapped };
            }
            return prev;
          });
        }
      });
  }, [invoiceBooking?.id]);

  // Postpone modal state (RISK-029 follow-up) — two modes: reschedule now (real date/time known)
  // or follow-up later (status becomes 'postponed', no date/time change yet).
  const [postponeBooking, setPostponeBooking] = useState<any>(null);
  const [postponeMode, setPostponeMode] = useState<"reschedule" | "followup">("reschedule");
  const [postponeNewDate, setPostponeNewDate] = useState("");
  const [postponeNewTime, setPostponeNewTime] = useState("");
  const [postponeFollowUpDate, setPostponeFollowUpDate] = useState("");
  const [savingPostpone, setSavingPostpone] = useState(false);

  // Customer Profile details drawer state
  const [customerAvatars, setCustomerAvatars] = useState<Record<string, string>>({});

  const fetchCustomerAvatars = useCallback(async () => {
    try {
      const res = await fetch("/api/customer-avatars");
      if (res.ok) {
        const data = await res.json();
        setCustomerAvatars(data || {});
      }
    } catch (e) {
      console.error("Failed to fetch customer avatars:", e);
    }
  }, []);

  useEffect(() => {
    fetchCustomerAvatars();
  }, [fetchCustomerAvatars]);

  const handleAvatarUpload = async (id: string, file: File) => {
    try {
      const compressedDataUrl = await compressImage(file, 400, 400, 0.8);
      setCustomerAvatars(prev => ({ ...prev, [id]: compressedDataUrl }));
      const res = await fetch(`/api/customer-avatars`, {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ id, avatar_url: compressedDataUrl })
      });
    } catch (e) {
      console.error("Avatar upload failed:", e);
    }
  };

  const handleAvatarRemove = async (id: string) => {
    try {
      setCustomerAvatars(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      await fetch("/api/customer-avatars", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ id, avatar_url: null })
      });
    } catch (e) {
      console.error("Avatar removal failed:", e);
    }
  };

  // Package/promotion awareness at booking + checkout time
  const [bookingCustomerPackages, setBookingCustomerPackages] = useState<any[]>([]);
  const [checkoutCustomerPackages, setCheckoutCustomerPackages] = useState<any[]>([]);
  const [redeemedPackageItems, setRedeemedPackageItems] = useState<Record<number, string>>({});
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [manualBookingCustomerPackages, setManualBookingCustomerPackages] = useState<any[]>([]);

  const [couponSearch, setCouponSearch] = useState("");
  const [couponDate, setCouponDate] = useState("");
  const [couponStatus, setCouponStatus] = useState("All");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceSortBy, setServiceSortBy] = useState<"custom" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "newest">("custom");
  const [showServiceFilterPanel, setShowServiceFilterPanel] = useState(false);
  const [serviceFilterStatus, setServiceFilterStatus] = useState<"All" | "Active" | "Inactive">("All");
  const [servicePage, setServicePage] = useState(1);
  const SERVICE_PAGE_SIZE = 10;

  // Services category state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [addServiceTargetCategory, setAddServiceTargetCategory] = useState<string>("");
  const [newCategoryNameEn, setNewCategoryNameEn] = useState("");
  const [newCategoryNameAr, setNewCategoryNameAr] = useState("");
  const [newServiceNameEn, setNewServiceNameEn] = useState("");
  const [newServiceNameAr, setNewServiceNameAr] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("0");
  // Local mutable services list (loaded on mount from localStorage/seeding)
  const [localServices, setLocalServices] = useState<ServiceItem[]>([]);
  // Local mutable categories list
  const [localCategories, setLocalCategories] = useState<LocalCategory[]>([]);
  // Delete Category confirmation target
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<LocalCategory | null>(null);

  // Service modal and drag-and-drop state variables
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<ServiceItem | null>(null);
  
  const [serviceNameEn, setServiceNameEn] = useState("");
  const [serviceNameAr, setServiceNameAr] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceDuration, setServiceDuration] = useState("1:00 Hours");
  const [serviceDurationMinutes, setServiceDurationMinutes] = useState<number>(60);
  const [serviceUnitType, setServiceUnitType] = useState("both");
  const [serviceDescEn, setServiceDescEn] = useState("");
  const [serviceDescAr, setServiceDescAr] = useState("");
  const [serviceSortOrder, setServiceSortOrder] = useState(0);
  const [serviceIsShared, setServiceIsShared] = useState(false);
  const [serviceEnableReminder, setServiceEnableReminder] = useState(true);
  const [serviceImageUrl, setServiceImageUrl] = useState("");
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [serviceBranchPricing, setServiceBranchPricing] = useState<Required<ServiceItem>['branchPricing']>([
    { name: "Zayed", price: 0, visible: true, status: true, isDefault: true }
  ]);

  // Drag and drop sorting states
  const [draggedServiceId, setDraggedServiceId] = useState<number | null>(null);
  const [dragOverServiceId, setDragOverServiceId] = useState<number | null>(null);
  const [rowDraggable, setRowDraggable] = useState<Record<number, boolean>>({});

  const handleEditService = (svc: ServiceItem) => {
    setEditingService(svc);
    setServiceCategory(svc.cat);
    setServiceNameEn(svc.en);
    setServiceNameAr(svc.ar || "");
    setServiceDuration(svc.duration || "1:00 Hours");
    setServiceDurationMinutes(getServiceDurationMinutes(svc));
    let unitTypeVal = svc.unit || "both";
    if (unitTypeVal !== "in_clinic" && unitTypeVal !== "online" && unitTypeVal !== "both") {
      unitTypeVal = "both";
    }
    setServiceUnitType(unitTypeVal);
    setServiceDescEn(svc.descriptionEn || "");
    setServiceDescAr(svc.descriptionAr || "");
    setServiceSortOrder(svc.sortOrder ?? 0);
    setServiceIsShared(svc.isShared ?? false);
    setServiceEnableReminder(svc.enableReminder ?? true);
    setServiceImageUrl(svc.img || "");
    setServicePrice(svc.price ?? 0);
    
    if (Array.isArray(svc.branchPricing) && svc.branchPricing.length > 0) {
      setServiceBranchPricing(svc.branchPricing);
    } else {
      const toggles = serviceToggles[svc.id] ?? { visible: true, active: true };
      setServiceBranchPricing([
        { name: "Zayed", price: svc.price ?? 0, visible: toggles.visible, status: toggles.active, isDefault: true }
      ]);
    }
    
    setShowAddServiceModal(true);
  };

  const handleReorderServices = async (draggedId: number, targetId: number) => {
    const draggedSvc = localServices.find(s => s.id === draggedId);
    const targetSvc = localServices.find(s => s.id === targetId);
    if (!draggedSvc || !targetSvc || draggedSvc.cat !== targetSvc.cat) return;

    const catSvcs = localServices
      .filter(s => s.cat === draggedSvc.cat)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const draggedIndex = catSvcs.findIndex(s => s.id === draggedId);
    const targetIndex = catSvcs.findIndex(s => s.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedCatSvcs = [...catSvcs];
    const [removed] = updatedCatSvcs.splice(draggedIndex, 1);
    updatedCatSvcs.splice(targetIndex, 0, removed);

    updatedCatSvcs.forEach((svc, index) => {
      svc.sortOrder = index;
    });

    const updatedAllServices = localServices.map(s => {
      const matched = updatedCatSvcs.find(u => u.id === s.id);
      return matched ? { ...s, sortOrder: matched.sortOrder } : s;
    });

    const sortedAllServices = updatedAllServices.sort((a, b) => {
      if (a.cat !== b.cat) return 0;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    setLocalServices(sortedAllServices);
    await syncServicesToApi(sortedAllServices);
  };

  // Category drag and drop states
  const [draggedCatKey, setDraggedCatKey] = useState<string | null>(null);
  const [dragOverCatKey, setDragOverCatKey] = useState<string | null>(null);
  const [catDraggable, setCatDraggable] = useState<Record<string, boolean>>({});

  const handleReorderCategories = (draggedKey: string, targetKey: string) => {
    const draggedIndex = localCategories.findIndex(c => c.key === draggedKey);
    const targetIndex = localCategories.findIndex(c => c.key === targetKey);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedCategories = [...localCategories];
    const [removed] = updatedCategories.splice(draggedIndex, 1);
    updatedCategories.splice(targetIndex, 0, removed);

    updatedCategories.forEach((cat, index) => {
      cat.sortOrder = index;
    });

    setLocalCategories(updatedCategories);
    saveDynamicCategories(updatedCategories);
  };

  function toggleCategoryExpand(cat: string) {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }
  async function removeCategory(catKey: string) {
    const removedServiceIds = localServices.filter(s => s.cat === catKey).map(s => s.id);

    const updatedCats = localCategories.filter(c => c.key !== catKey);
    setLocalCategories(updatedCats);
    saveDynamicCategories(updatedCats);

    const updatedSvcs = localServices.filter(s => s.cat !== catKey);
    setLocalServices(updatedSvcs);

    await Promise.all(removedServiceIds.map(id => deleteServiceFromApi(id)));
    await loadServicesFromApi();

    setExpandedCategories(prev => {
      const copy = { ...prev };
      delete copy[catKey];
      return copy;
    });
  }
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarView, setCalendarView] = useState<"Calendar" | "List" | "Schedule">("Calendar");

  useEffect(() => {
    if (adminRole === 'superadmin') return;
    if (adminPermissions.length > 0) {
      if (!hasPermission("bookings.view_calendar") && hasPermission("bookings.view_list")) {
        setCalendarView("List");
      }
    }
  }, [adminPermissions, adminRole, hasPermission]);

  useEffect(() => {
    setIsEditingService(false);
    setIsEditingNotes(false);
    setNotesDraft(viewingBooking?.notes || "");
  }, [viewingBooking]);

  const [scheduleDate, setScheduleDate] = useState<Date>(() => new Date());
  const [scheduleProviderFilter, setScheduleProviderFilter] = useState<string>("All");
  const [scheduleServiceFilter, setScheduleServiceFilter] = useState<string>("All");
  const [scheduleReservations, setScheduleReservations] = useState<Req[]>([]);

  // Quick Actions states
  const [showCancellationsModal, setShowCancellationsModal] = useState(false);
  const [showTodayBookingsModal, setShowTodayBookingsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showActionsMenuModal, setShowActionsMenuModal] = useState(false);
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [showFullViewNewBooking, setShowFullViewNewBooking] = useState(false);
  const [showAddPreviousBooking, setShowAddPreviousBooking] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("All"); // All, approved, pending, rejected
  const [typeFilter, setTypeFilter] = useState<string>("All");     // All, in_person, online
  const [docFilter, setDocFilter] = useState<string>("All");       // All, Dr...
  const [dateFilter, setDateFilter] = useState<string>("All");     // All, or "YYYY-MM-DD"

  // Form states for manual booking creation
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [showPatientSearchResults, setShowPatientSearchResults] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientDate, setNewPatientDate] = useState("");
  const [isManualWhatsappSame, setIsManualWhatsappSame] = useState(true);
  const [newPatientWhatsapp, setNewPatientWhatsapp] = useState("");
  const [newPatientTimeSlot, setNewPatientTimeSlot] = useState("12:00");
  const [newPatientService, setNewPatientService] = useState<number>(1);
  const [newPatientSessionType, setNewPatientSessionType] = useState("in_person");
  const [newPatientDoctor, setNewPatientDoctor] = useState("Dr. Sara El Gamel");
  const [newPatientNotes, setNewPatientNotes] = useState("");
  const [newPatientStatus, setNewPatientStatus] = useState("approved");
  const [newPatientBranch, setNewPatientBranch] = useState("");
  const [newPatientCreatedByEmployeeId, setNewPatientCreatedByEmployeeId] = useState("");
  const [approveUnavailableSlots, setApproveUnavailableSlots] = useState<string[]>([]);
  const [approveTimeWarning, setApproveTimeWarning] = useState<string>("");
  const [manualUnavailableSlots, setManualUnavailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (showAddBookingModal && adminDbId) {
      setNewPatientCreatedByEmployeeId(adminDbId);
    }
  }, [showAddBookingModal, adminDbId]);

  // Synchronize manual booking service selection and session type
  useEffect(() => {
    const selectedSvc = localServices.find(s => s.id === newPatientService);
    if (selectedSvc) {
      let allowedType = selectedSvc.unit?.toLowerCase() || "both";
      if (allowedType !== "both" && allowedType !== "in_clinic" && allowedType !== "online") {
        allowedType = "both";
      }
      if (allowedType === "in_clinic") {
        setNewPatientSessionType("in_person");
      } else if (allowedType === "online") {
        setNewPatientSessionType("online");
      }
    }
  }, [newPatientService, localServices]);
  const filteredReservations = useMemo(() => {
    return allReservations.filter((r) => {
      const matchStatus = statusFilter === "All"
        || r.status === statusFilter
        || (statusFilter === "pending" && (r.status === "pending" || r.status === "pending_deposit"))
        || (statusFilter === "pending_deposit" && (r.status === "pending" || r.status === "pending_deposit"));
      const matchType = typeFilter === "All" || r.sessionType === typeFilter;
      const matchDoc = docFilter === "All" || (r.doctorName || "Dr. Sara El Gamel") === docFilter;
      const matchDate = dateFilter === "All" || (r.date && String(r.date).slice(0, 10) === dateFilter);
      return matchStatus && matchType && matchDoc && matchDate;
    });
  }, [allReservations, statusFilter, typeFilter, docFilter, dateFilter]);

  const bookingCountsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    const monthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;

    filteredReservations.forEach((reservation) => {
      if (!reservation.date || !['approved', 'confirmed', 'started', 'completed'].includes(reservation.status)) return;
      // Slice directly — avoids UTC conversion that shifts dates for non-UTC timezones
      const normalizedDate = String(reservation.date).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return;
      const [year, month] = normalizedDate.split('-');
      const currentKey = `${year}-${month}`;
      if (currentKey !== monthKey) return;
      counts.set(normalizedDate, (counts.get(normalizedDate) ?? 0) + 1);
    });

    return counts;
  }, [filteredReservations, calendarMonth]);

  const currentMonthLabel = calendarMonth.toLocaleString('en-US', { month: 'long' });
  const currentYear = calendarMonth.getFullYear();
  const daysInMonth = new Date(currentYear, calendarMonth.getMonth() + 1, 0).getDate();
  const startWeekday = calendarMonth.getDay();

  // per-service toggle state: visible & status
  const [serviceToggles, setServiceToggles] = useState<Record<number, { visible: boolean; active: boolean }>>({});

  // Auth and Role Management effects & handlers
  useEffect(() => {
    if (!supabase) {
      setAuthChecking(false);
      return;
    }

    // 1. Initial sessionStorage Session Guard: Log out if browser/tab was closed
    supabase.auth.getSession().then(({ data: { session: cachedSession } }: any) => {
      const isSessionActive = typeof window !== "undefined" && sessionStorage.getItem("revera_admin_session_active");
      if (cachedSession && !isSessionActive) {
        console.log("Stale login session detected (tab reopened). Logging out.");
        supabase.auth.signOut().then(() => {
          setAuthChecking(false);
        }).catch((err: any) => {
          console.warn("signOut error:", err);
          setAuthChecking(false);
        });
      } else {
        if (cachedSession) {
          handleAuthSession(cachedSession);
        } else {
          setAuthChecking(false);
        }
      }
    }).catch((err: any) => {
      console.warn("getSession error:", err);
      setAuthChecking(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, newSession: any) => {
      if (event === "SIGNED_OUT") {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("revera_admin_session_active");
        }
      }
      handleAuthSession(newSession);
    });

    async function handleAuthSession(currSession: any) {
      setSession(currSession);
      if (!currSession?.user) {
        setAdminRole(null);
        setAdminPermissions([]);
        setAdminEmail("");
        setAdminEmployeeId("");
        setAdminDbId("");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("revera_admin_session_active");
        }
        setAuthChecking(false);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("revera_admin_session_active", "true");
      }
      // Reset activity timer upon successful authentication
      lastActivityRef.current = Date.now();

      try {
        const token = currSession.access_token;
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const authData = await res.json();
          setAdminRole(authData.role);
          setAdminDepartment(authData.department || "");
          setAdminPermissions(authData.permissions || []);
          setAdminEmail(authData.email || "");
          setAdminEmployeeId(authData.employeeId || "");
          setAdminDbId(authData.id || "");

          // Pre-fetch employee accounts list so doctor role is known immediately before rendering
          await fetchRolesAndEmployees();
        } else {
          console.warn("Unregistered employee session. Logging out.");
          await supabase.auth.signOut();
          setAdminRole(null);
          setAdminDepartment("");
          setAdminPermissions([]);
          setAdminEmail("");
          setAdminEmployeeId("");
          setAdminDbId("");
        }
      } catch (err) {
        console.error("Error retrieving admin permissions:", err);
      } finally {
        setAuthChecking(false);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Inactivity idle timeout: auto logout after 1 hour of complete inactivity
  useEffect(() => {
    if (!session || !adminRole) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      setPresenceModalOpen(prev => {
        if (prev) return false;
        return prev;
      });
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Check every 10 seconds. Timeout is 1 hour (3600000 ms)
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= 3600000) {
        clearInterval(interval);
        console.log("Inactivity timeout reached. Logging out.");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("revera_admin_session_active");
        }
        triggerCheckout().finally(() => {
          supabase.auth.signOut().then(() => {
            alert("Your session has expired due to 1 hour of inactivity. Please log in again.");
          });
        });
      }
    }, 10000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
  }, [session, adminRole]);

  const checkNavAccess = useCallback((nav: string): boolean => {
    if (!adminRole) return false;
    if (adminRole === 'superadmin') return true;
    if (nav === 'Logout' || nav === 'Profile') return true;
    
    const settingsSubsections: Record<string, string> = {
      "Clinic Profile": "settings.profile",
      "Service Hours": "settings.service_hours",
      "Branches": "settings.branches",
      "Rooms": "settings.rooms",
      "Booking Settings": "settings.booking_settings",
      "Terms & Conditions": "settings.terms",
      "Deposit Settings": "settings.booking_settings",
      "Inactivity Settings": "settings.booking_settings",
      "Notification Settings": "settings.notification",
      "Queue Settings": "settings.queue",
      "Pages Settings": "settings.pages",
      "Medical Records": "settings.medical_records",
      "Role Management": "settings.roles",
      "System Test Suite": "settings.test_suite"
    };
    
    if (settingsSubsections[nav]) {
      return hasPermission(settingsSubsections[nav]);
    }
    
    const parentScreenMap: Record<string, string> = {
      "Dashboard": "dashboard",
      "Bookings": "bookings",
      "Patients": "customers",
      "Doctors": "providers",
      "Services": "services",
      "Promotions": "marketing",
      "Packages": "marketing",
      "Inventory": "inventory",
      "Employees": "employees",
      "HR": "hr",
      "Transactions": "transactions",
      "Marketing": "marketing",
      "Customer Support": "support",
      "Reports": "reports",
      "Finance": "finance",
      "Settings": "settings",
      "Clinical": "clinical"
    };

    if (adminPermissions.includes(nav)) return true;
    const prefix = parentScreenMap[nav];
    if (prefix) {
      if (adminPermissions.includes(prefix) || adminPermissions.some(p => p.startsWith(prefix + "."))) return true;
      if (hasPermission(prefix)) return true;
    }
    
    return false;
  }, [adminRole, adminPermissions, hasPermission]);

  const hasAccessToActiveNav = useMemo(() => {
    return checkNavAccess(activeNav);
  }, [checkNavAccess, activeNav]);

  useEffect(() => {
    if (adminRole === 'superadmin') return;
    if (adminPermissions.length > 0) {
      const isPermitted = checkNavAccess(activeNav);
      if (!isPermitted && permittedSidebarItems.length > 0) {
        const firstPermitted = permittedSidebarItems.find(item => item.label !== 'Logout');
        if (firstPermitted && firstPermitted.label !== activeNav) {
          setActiveNav(firstPermitted.label);
        }
      }
    }
  }, [adminPermissions, adminRole, activeNav, permittedSidebarItems, checkNavAccess]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("setup") === "true" || searchParams.get("recovery") === "true") {
        setShowSetupPasswordModal(true);
      }
    }
  }, []);

  // Automatically select the first permitted sub-tab in Bookings and Providers view
  useEffect(() => {
    if (adminRole === 'superadmin') return;

    if (activeNav === "Bookings") {
      const hasCalendar = hasPermission("bookings.view_calendar");
      const hasList = hasPermission("bookings.view_list");
      if (hasList && !hasCalendar && (calendarView === "Calendar" || calendarView === "Schedule")) {
        setCalendarView("List");
      } else if (hasCalendar && !hasList && calendarView === "List") {
        setCalendarView("Calendar");
      }
    }
  }, [activeNav, adminRole, adminPermissions, hasPermission, calendarView]);

  // Close page-level dropdowns when any other dropdown is toggled
  useEffect(() => {
    const handleCloseDropdowns = (e: any) => {
      const origin = e.detail;
      if (origin !== "quickAction") setShowQuickActionMenu(false);
      if (origin !== "notifications") setShowNotificationMenu(false);
    };
    window.addEventListener("close-admin-dropdowns", handleCloseDropdowns);
    return () => window.removeEventListener("close-admin-dropdowns", handleCloseDropdowns);
  }, []);

  async function handleSetupPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!setupPassword || !setupConfirmPassword) {
      setSetupError("Please fill in both fields.");
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setSetupError("Passwords do not match.");
      return;
    }
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPasswordRegex.test(setupPassword)) {
      setSetupError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. @$!%*?&#).");
      return;
    }

    setSetupLoading(true);
    setSetupError("");
    setSetupSuccess("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: setupPassword,
      });

      if (error) {
        setSetupError(error.message);
      } else {
        setSetupSuccess("Your password has been successfully configured! Redirecting to dashboard...");
        setTimeout(() => {
          setShowSetupPasswordModal(false);
          // Remove query params from URL so it doesn't reopen
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("setup");
            url.searchParams.delete("recovery");
            window.history.replaceState({}, document.title, url.pathname + url.search);
          }
        }, 3000);
      }
    } catch (err: any) {
      setSetupError(err.message || "Failed to update password.");
    } finally {
      setSetupLoading(false);
    }
  }

  useEffect(() => {
    if (session && (employeesList.length === 0 || activeNav === "Profile" || activeNav === "Employees" || activeNav === "Role Management")) {
      fetchRolesAndEmployees();
    }
  }, [session, activeNav, employeesList.length]);

  useEffect(() => {
    if (!adminEmail || employeesList.length === 0) return;
    const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
    if (profileEmployee) {
      setProfileName(profileEmployee.name || "");
      setProfilePhone(profileEmployee.phone || "");
      setProfileAddress(profileEmployee.address || "");
      setProfileNatId(profileEmployee.national_id || "");
      setProfileNatIdFront(profileEmployee.national_id_front || "");
      setProfileNatIdBack(profileEmployee.national_id_back || "");
      if (adminRole !== "superadmin" && adminRole !== "admin" && profileEmployee.branch_id) {
        setBranch(profileEmployee.branch_id);
      }
    } else if (adminRole === "superadmin") {
      setProfileName("System Owner");
    }
  }, [adminEmail, employeesList, adminRole]);

  async function fetchRolesAndEmployees() {
    console.log("RBAC - fetchRolesAndEmployees called!");
    setLoadingRolesAndEmployees(true);
    try {
      if (!session?.access_token) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [rolesResponse, employeesResponse] = await Promise.all([
        fetch('/api/roles', { headers, cache: 'no-store' }),
        fetch('/api/employees', { headers, cache: 'no-store' })
      ]);
      if (!rolesResponse.ok || !employeesResponse.ok) {
        throw new Error('Unable to load roles and employees.');
      }
      const [roles, emps] = await Promise.all([rolesResponse.json(), employeesResponse.json()]);
      setRolesList(roles);
      setEmployeesList(emps);
    } catch (err) {
      console.error("Error loading roles and employees:", err);
    } finally {
      setLoadingRolesAndEmployees(false);
    }
  }

  async function fetchHrPayroll() {
    if (!session?.access_token) return;
    setLoadingPayroll(true);
    try {
      const res = await fetch('/api/hr/payroll', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setPayrollList(data);
      }
    } catch (err) {
      console.error("Error loading payroll:", err);
    } finally {
      setLoadingPayroll(false);
    }
  }

  async function fetchDoctorPayroll() {
    if (!session?.access_token) return;
    setLoadingDoctorPayroll(true);
    try {
      const res = await fetch('/api/hr/doctor-payroll', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorPayrollList(data);
      }
    } catch (err) {
      console.error("Error loading doctor payroll:", err);
    } finally {
      setLoadingDoctorPayroll(false);
    }
  }

  async function fetchHrLeaves() {
    if (!session?.access_token) return;
    setLoadingLeaves(true);
    try {
      const res = await fetch('/api/hr/leaves', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setLeavesList(data);
      }
    } catch (err) {
      console.error("Error loading leaves:", err);
    } finally {
      setLoadingLeaves(false);
    }
  }

  async function fetchHrPerformance() {
    if (!session?.access_token) return;
    setLoadingPerformance(true);
    try {
      const res = await fetch('/api/hr/performance', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setPerformanceReviews(data);
      }
    } catch (err) {
      console.error("Error loading performance reviews:", err);
    } finally {
      setLoadingPerformance(false);
    }
  }

  async function fetchHrAttendance() {
    if (!session?.access_token) return;
    setLoadingAttendance(true);
    try {
      const res = await fetch('/api/hr/attendance', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceList(data);
      }
    } catch (err) {
      console.error("Error loading attendance:", err);
    } finally {
      setLoadingAttendance(false);
    }
  }

  async function fetchHrAlerts() {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/hr/alerts', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMissingAlerts(data);
      }
    } catch (err) {
      console.error("Error loading missing alerts:", err);
    }
  }

  async function triggerCheckout() {
    if (session?.access_token && adminDbId) {
      try {
        console.log("Logging attendance check-out for user:", adminDbId);
        await fetch('/api/hr/attendance', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ employeeId: adminDbId })
        });
      } catch (err) {
        console.error("Error during attendance check-out:", err);
      }
    }
  }

  const fetchHrData = useCallback(async () => {
    await Promise.all([
      fetchHrPayroll(),
      fetchDoctorPayroll(),
      fetchHrLeaves(),
      fetchHrPerformance(),
      fetchHrAttendance(),
      fetchHrAlerts(),
      fetchRolesAndEmployees()
    ]);
  }, [session]);

  useEffect(() => {
    if (activeNav === "HR") {
      fetchHrData();
    }
  }, [activeNav, fetchHrData]);

  async function handleLogout() {
    if (supabase) {
      await triggerCheckout();
      await supabase.auth.signOut();
    }
  }

  // Geolocation Check-In on login resolution (Disabled for now per user request)
  useEffect(() => {
    // GPS Attendance Location Check-In Enforcement Disabled
  }, []);

  // Inactivity Presence Monitor for standard staff
  useEffect(() => {
    if (!session || !adminRole) return;
    // Only for standard employees (not superadmin, admin, or HR)
    if (adminRole === 'superadmin' || adminRole === 'admin' || adminRole === 'HR') return;

    const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
    if (!profileEmployee) return;

    const isTestMode = typeof window !== "undefined" && window.location.search.includes("test_presence=true");
    const thresholdMs = isTestMode ? 15000 : inactivityThreshold * 60 * 1000;
    const checkIntervalMs = isTestMode ? 1000 : 5000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= thresholdMs && !presenceModalOpen) {
        setPresenceCountdown(inactivityCountdown);
        setPresenceModalOpen(true);
      }
    }, checkIntervalMs);

    return () => clearInterval(interval);
  }, [session, adminRole, adminEmail, employeesList, inactivityThreshold, inactivityCountdown, presenceModalOpen]);

  // Presence countdown timer logic
  useEffect(() => {
    if (!presenceModalOpen) return;
    if (presenceCountdown <= 0) {
      setPresenceModalOpen(false);
      
      const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
      if (profileEmployee && session?.access_token) {
        fetch('/api/hr/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ employeeId: profileEmployee.id })
        }).then((res) => {
          if (res.ok) {
            alert("You did not respond in time. An inactivity alert has been sent to the administrator.");
          }
        }).catch((err) => console.error("Failed to send missing alert:", err));
      }
      return;
    }

    const timer = setTimeout(() => {
      setPresenceCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [presenceModalOpen, presenceCountdown, session, adminEmail, employeesList]);

  // Admin Missing Alerts Polling
  useEffect(() => {
    if (!session || !adminRole) return;
    if (adminRole !== 'superadmin' && adminRole !== 'admin' && adminRole !== 'HR') return;

    fetchHrAlerts();

    const isTestMode = typeof window !== "undefined" && window.location.search.includes("test_presence=true");
    const intervalMs = isTestMode ? 5000 : 30000;

    const poll = setInterval(() => {
      fetchHrAlerts();
    }, intervalMs);

    return () => clearInterval(poll);
  }, [session, adminRole]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter both email/ID and password.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");

    let emailToSign = loginEmail.trim();
    if (!emailToSign.includes("@")) {
      try {
        const res = await fetch(`/api/auth/employee-email?id=${encodeURIComponent(emailToSign)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.email) {
            emailToSign = data.email;
          }
        } else {
          setLoginError("Invalid Employee ID or account not found.");
          setLoginLoading(false);
          return;
        }
      } catch (err) {
        setLoginError("Failed to lookup Employee ID. Please try entering your full email.");
        setLoginLoading(false);
        return;
      }
    }
    // Verify that the email is not registered as a customer
    try {
      const checkRes = await fetch(`/api/customers?email=${encodeURIComponent(emailToSign)}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` }
      });
      if (checkRes.ok) {
        const customer = await checkRes.json();
        if (customer) {
          setLoginError("This email is registered as a customer and cannot be used for administrator access.");
          setLoginLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Customer email verification failed:", err);
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToSign,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }
    } catch (err: any) {
      setLoginError(err.message || "An authentication error occurred.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleDeleteEmployee(id: string) {
    if (!(await showConfirm("Are you sure you want to delete this employee account? They will lose access to the admin panel immediately."))) return;
    try {
      const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (res.ok) {
        clearFetchCache();
        fetchRolesAndEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to revoke credentials.");
      }
    } catch (err: any) {
      alert("Error deleting account: " + err.message);
    }
  }

  async function handleResendInvitation(id: string) {
    if (!(await showConfirm("Resend the invitation email to this employee? Their old invite link will be invalidated."))) return;
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        alert('Invitation re-sent successfully! The employee will receive a new email.');
        fetchRolesAndEmployees();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to resend invitation.');
      }
    } catch (err: any) {
      alert('Error resending invitation: ' + err.message);
    }
  }


  // Force English/LTR context on Admin page
  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    const prevBodyClass = document.body.className;

    const applyOverride = () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
      document.body.className = "ltr";
    };

    applyOverride();
    const timer = setTimeout(applyOverride, 0);
    const timer2 = setTimeout(applyOverride, 50);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      document.documentElement.dir = prevDir || "ltr";
      document.documentElement.lang = prevLang || "en";
      document.body.className = prevBodyClass || "ltr";
    };
  }, []);

  useEffect(() => {
    const cats = getDynamicCategories();
    setLocalCategories(cats);

    // Set all categories expanded by default
    const exp: Record<string, boolean> = {};
    cats.forEach(c => { exp[c.key] = true; });
    setExpandedCategories(exp);
  }, []);

  useEffect(() => {
    if (session?.access_token) loadServicesFromApi();
  }, [session?.access_token, loadServicesFromApi]);
  // BRANCHES is now derived from the real branches state loaded from Supabase

  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return localServices;
    const q = serviceSearch.toLowerCase();
    return localServices.filter((s) => s.en.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q));
  }, [serviceSearch, localServices]);

  const allServicesList = useMemo(() => {
    const map = new Map<string, { id: number; en: string; ar?: string }>();
    SERVICES.forEach(s => {
      map.set(s.en, { id: s.id, en: s.en, ar: s.ar });
    });
    localServices.forEach(s => {
      map.set(s.en, { id: s.id, en: s.en, ar: s.ar });
    });
    return Array.from(map.values()).sort((a, b) => a.en.localeCompare(b.en));
  }, [localServices]);

  const totalServicePages = Math.ceil(filteredServices.length / SERVICE_PAGE_SIZE);
  const pagedServices = filteredServices.slice((servicePage - 1) * SERVICE_PAGE_SIZE, servicePage * SERVICE_PAGE_SIZE);

  // Grouped services: category key → filtered services in that category
  const groupedServices = useMemo(() => {
    const groups: Record<string, typeof localServices> = {};
    localCategories.forEach(cat => { groups[cat.key] = []; });
    filteredServices.forEach(svc => {
      if (groups[svc.cat]) groups[svc.cat].push(svc);
      else groups[svc.cat] = [svc];
    });
    return groups;
  }, [filteredServices, localCategories]);

  function toggleService(id: number, field: "visible" | "active") {
    setServiceToggles((prev) => {
      const current = prev[id] ?? { visible: true, active: true };
      const newValue = !current[field];
      const updated = { ...prev, [id]: { ...current, [field]: newValue } };
      // Persist to localStorage so user-facing pages reflect the change
      setServiceToggle(id, field, newValue);
      return updated;
    });
  }

  const [eCommerceExpanded, setECommerceExpanded] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);


  // Inventory Products State — productsTabRef stays in page.tsx for useCustomerProfile's refreshProductSalesHistory wrapper
  const productsTabRef = useRef<InventoryProductsTabRef>(null);

  // ── System Test Suite State & Diagnostics Engine ──
  interface SystemTestCase {
    id: string;
    name: string;
    category: string;
    endpoint: string;
    description: string;
    status: 'idle' | 'running' | 'pass' | 'fail';
    durationMs?: number;
    statusCode?: number;
    responseDetails?: any;
    errorMsg?: string;
  }

  const INITIAL_SYSTEM_TEST_SUITES: SystemTestCase[] = [
    { id: 'TC-001', name: 'Supabase Database & Auth Health', category: 'Database & Auth', endpoint: '/api/health/supabase', description: 'Verifies live database connection, response latency, and env configurations.', status: 'idle' },
    { id: 'TC-002', name: 'Current User Session & RBAC Permissions', category: 'Database & Auth', endpoint: '/api/auth/me', description: 'Checks staff session authentication and user profile authorization.', status: 'idle' },
    { id: 'TC-003', name: 'Clinic Branches API Integrity', category: 'Services & Bookings', endpoint: '/api/branches', description: 'Verifies clinic branches data, operating hours, and location IDs.', status: 'idle' },
    { id: 'TC-004', name: 'Services Catalog & Category Mapping', category: 'Services & Bookings', endpoint: '/api/services', description: 'Validates service catalog pricing, durations, and category tags.', status: 'idle' },
    { id: 'TC-005', name: 'Dynamic Service Categories Store', category: 'Services & Bookings', endpoint: '/api/categories', description: 'Checks service category definitions and branch customization.', status: 'idle' },
    { id: 'TC-006', name: 'Inventory Products & Stock Levels', category: 'Inventory & Equipment', endpoint: '/api/inventory/products', description: 'Tests product stock levels, pricing, roles (retail/consumable), and SKUs.', status: 'idle' },
    { id: 'TC-007', name: 'Clinic Equipment Devices & Pulse Limits', category: 'Inventory & Equipment', endpoint: '/api/inventory/devices', description: 'Verifies laser pulse counters, threshold limits, and replacement costs.', status: 'idle' },
    { id: 'TC-008', name: 'Device Audit Logs System', category: 'Inventory & Equipment', endpoint: '/api/inventory/devices/audit-logs', description: 'Tests equipment maintenance history and pulse reset logs.', status: 'idle' },
    { id: 'TC-009', name: 'Provider Schedule Audit Logs', category: 'Inventory & Equipment', endpoint: '/api/providers/schedule-audit-logs', description: 'Validates doctor schedule modification logs and shift audit history.', status: 'idle' },
    { id: 'TC-010', name: 'Employee Roster & Accounts', category: 'HR & Payroll', endpoint: '/api/employees', description: 'Verifies employee list, departments, positions, and accounts.', status: 'idle' },
    { id: 'TC-011', name: 'Employee Role & Access Control Rules', category: 'HR & Payroll', endpoint: '/api/roles', description: 'Tests system role definitions and view/edit permission matrices.', status: 'idle' },
    { id: 'TC-012', name: 'Regular Staff Payroll Calculation Engine', category: 'HR & Payroll', endpoint: '/api/hr/payroll', description: 'Tests monthly staff salary, bonuses, deductions, and net pay calculations.', status: 'idle' },
    { id: 'TC-013', name: 'Doctor Payroll & Commission Engine', category: 'HR & Payroll', endpoint: '/api/hr/doctor-payroll', description: 'Validates doctor fixed salaries, commission tiers, and reservation pay.', status: 'idle' },
    { id: 'TC-014', name: 'Leave Requests Management', category: 'HR & Payroll', endpoint: '/api/hr/leaves', description: 'Tests employee leave request submissions and approval statuses.', status: 'idle' },
    { id: 'TC-015', name: 'GPS Attendance Check-in Engine', category: 'HR & Payroll', endpoint: '/api/hr/attendance', description: 'Tests geofenced attendance logs and shift duration calculations.', status: 'idle' },
    { id: 'TC-016', name: 'Patient Medical Records & Intake Reports', category: 'Medical & Patients', endpoint: '/api/medical-records', description: 'Validates intake form submission, medical history, and clinical notes.', status: 'idle' },
    { id: 'TC-017', name: 'Customer Product Purchase Balances', category: 'Medical & Patients', endpoint: '/api/customers/products', description: 'Tests customer retail package balances and product usage tracking.', status: 'idle' },
    { id: 'TC-018', name: 'Patient Prescriptions Register', category: 'Medical & Patients', endpoint: '/api/prescriptions', description: 'Verifies doctor prescription generation and dosage records.', status: 'idle' },
    { id: 'TC-019', name: 'Clinic Expense Categories & Ledger', category: 'Expenses & Assets', endpoint: '/api/expenses', description: 'Tests expense items, payment methods, and recurring expense rules.', status: 'idle' },
    { id: 'TC-020', name: 'Clinic Asset Depreciation Engine', category: 'Expenses & Assets', endpoint: '/api/assets', description: 'Validates capital asset valuation and straight-line depreciation.', status: 'idle' },
    { id: 'TC-021', name: 'Clinic Loans & Repayment Schedules', category: 'Expenses & Assets', endpoint: '/api/loans', description: 'Tests financial loans, interest schedules, and repayment logs.', status: 'idle' },
    { id: 'TC-022', name: 'Terms & Conditions Policy Config', category: 'System & Settings', endpoint: '/api/terms', description: 'Verifies deposit terms, cancellation policies, and clinic terms.', status: 'idle' },
    { id: 'TC-023', name: 'HR Missing Check-in Warning Alerts', category: 'HR & Payroll', endpoint: '/api/hr/alerts', description: 'Tests missing clock-in detection and automated HR warning alerts.', status: 'idle' },
    { id: 'TC-024', name: 'Customer Balances & Ledger Reconciliation', category: 'Medical & Patients', endpoint: '/api/customers/reconcile', description: 'Reconciles stored customer scalar balances against ledger transaction history.', status: 'idle' },
    { id: 'TC-025', name: 'Booking Products & Consumables Invoice Engine', category: 'Services & Bookings', endpoint: '/api/reservations', description: 'Verifies attached products & session consumables price recalculation and session left updates.', status: 'idle' },
    { id: 'TC-026', name: 'Doctor Schedule & Calendar View Data Pipeline', category: 'Services & Bookings', endpoint: '/api/reservations', description: 'Verifies doctor schedule reservations data pipeline and month/day calendar timeline structure.', status: 'idle' },
    { id: 'TC-027', name: 'Doctor Portal Bilingual & RTL Engine', category: 'Services & Bookings', endpoint: '/api/reservations', description: 'Verifies Doctor Portal English View and Arabic View toggle, localized dictionary copy, and RTL layout engine.', status: 'idle' },
    { id: 'TC-028', name: 'Doctor Portal Right Session Drawer & Notes Engine', category: 'Services & Bookings', endpoint: '/api/reservations', description: 'Verifies Right Slide-Over Session Drawer, clean doctor-written notes isolation, and structured payment/consumables callout cards.', status: 'idle' },
    { id: 'TC-029', name: 'Doctor Portal Patient Full Visit History Engine', category: 'Services & Bookings', endpoint: '/api/reservations', description: 'Verifies Patient Full Visit History Right Drawer, listing all historical visits, dates, services, and doctor clinical notes.', status: 'idle' },
    { id: 'TC-030', name: 'Admin Bookings View & Schedule UI Engine', category: 'Services & Bookings', endpoint: '/api/reservations', description: 'Verifies the redesigned Admin Bookings View, 4 analytic cards (without percentages), mini calendar date grid, and today schedule table.', status: 'idle' },
    { id: 'TC-031', name: 'Reception Dashboard & Shift Metrics Engine', category: 'HR & Payroll', endpoint: '/api/reception/dashboard', description: 'Verifies receptionist shift tracking, personal target calculations, and today bookings summary.', status: 'idle' },
    { id: 'TC-032', name: 'Employee Shift Start & Geofence Verification Engine', category: 'HR & Payroll', endpoint: '/api/reception/dashboard', description: 'Verifies employee shift start geolocation verification, branch radius check, and attendance clock-in.', status: 'idle' },
    { id: 'TC-033', name: 'Dashboard Notifications & Inventory Alerts Engine', category: 'Inventory & Equipment', endpoint: '/api/reception/dashboard', description: 'Verifies real-time system alerts for low stock, expired items, maintenance due, and overdue devices.', status: 'idle' },
    { id: 'TC-034', name: 'Medical Record Intake Templates Engine', category: 'Medical & Patients', endpoint: '/api/medical-records/templates', description: 'Verifies customizable medical record intake templates, multi-service assignments, and dynamic field schema.', status: 'idle' },
    { id: 'TC-035', name: 'Patient Profile Edit & Customer Intake Engine', category: 'Medical & Patients', endpoint: '/api/customers', description: 'Verifies customer profile records, phone/WhatsApp validation, address structure (City, Street, Building, Floor), and balances.', status: 'idle' },
    { id: 'TC-036', name: 'Doctor Status Management & Availability Lifecycle Engine', category: 'Services & Bookings', endpoint: '/api/providers', description: 'Verifies doctor status modal dialog, Active/Inactive status changes, and real-time synchronization across providers and linked employee accounts.', status: 'idle' },
    { id: 'TC-037', name: 'Financial Transactions & Daily Ledger Engine', category: 'Finance & Accounting', endpoint: '/api/transactions', description: 'Verifies the clinic financial transactions dashboard, daily net payments, outstanding debts, wallet balances, and manual transaction logging.', status: 'idle' },
    { id: 'TC-038', name: 'Historical & Previous Bookings Intake Engine', category: 'Services & Bookings', endpoint: '/api/reservations/previous', description: 'Verifies recording of previous historical clinic bookings, patient matching/creation, and booking history preservation.', status: 'idle' },
    { id: 'TC-039', name: 'Granular Role Permissions & Action-Level Access Control Engine', category: 'HR & Payroll', endpoint: '/api/roles', description: 'Validates system roles retrieval, permission structure integrity, and granular action-level access control matrix.', status: 'idle' },
    { id: 'TC-040', name: 'Availability Doctor & Inactive Status Filtering Engine', category: 'Services & Bookings', endpoint: '/api/availability', description: 'Verifies doctor slot availability engine, service name resolution, and inactive doctor exclusions.', status: 'idle' },
    { id: 'TC-041', name: 'Prescription Deduplication & Clinical Intake Engine', category: 'Medical & Patients', endpoint: '/api/prescriptions', description: 'Verifies doctor prescription generation, duplicate prevention on repeated saves, and intake templates.', status: 'idle' },
    { id: 'TC-042', name: 'Shift Location Verification & Geofence Guard Engine', category: 'HR & Payroll', endpoint: '/api/reception/dashboard', description: 'Verifies strict geolocation boundary checks preventing out-of-location shift starts.', status: 'idle' },
    { id: 'TC-043', name: 'Staff Shift & GPS Geofence Settings Engine', category: 'System & Settings', endpoint: '/api/page-settings', description: 'Verifies GPS shift check enable/disable setting configuration and reception dashboard GPS requirement toggle.', status: 'idle' }
  ];

  const [systemTestSuites, setSystemTestSuites] = useState<SystemTestCase[]>(INITIAL_SYSTEM_TEST_SUITES);
  const [transactionsSubView, setTransactionsSubView] = useState<'list' | 'new'>('list');
  const [transactionPreSelectedPatient, setTransactionPreSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [runningAllDiagnostics, setRunningAllDiagnostics] = useState(false);
  const [testCategoryFilter, setTestCategoryFilter] = useState<string>('all');
  const [testSuiteSearch, setTestSuiteSearch] = useState<string>('');
  const [expandedDiagnosticId, setExpandedDiagnosticId] = useState<string | null>(null);

  // RISK-066: shape-only summary (top-level key names, item count) — never field values, so a
  // diagnostics run never displays another patient's/staff member's actual data.
  function summarizeDiagnosticResponse(data: any): any {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        itemCount: data.length,
        sampleItemKeys: data[0] && typeof data[0] === 'object' ? Object.keys(data[0]) : []
      };
    }
    if (data && typeof data === 'object') {
      return { type: 'object', keys: Object.keys(data) };
    }
    return { type: typeof data };
  }

  const runSingleDiagnosticTest = async (testId: string) => {
    setSystemTestSuites((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'running', errorMsg: undefined } : t))
    );

    const targetTest = systemTestSuites.find((t) => t.id === testId);
    if (!targetTest) return;

    const startTime = performance.now();
    try {
      const res = await fetch(targetTest.endpoint, {
        headers: authenticatedJsonHeaders,
        cache: 'no-store'
      });
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      if (res.ok) {
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = { message: 'OK (non-JSON response)' };
        }
        setSystemTestSuites((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: 'pass',
                  durationMs,
                  statusCode: res.status,
                  // RISK-066: never store the raw response body — it can contain other
                  // patients'/staff's medical records, prescriptions, or payroll data.
                  // Keep only a shape summary (no field values) for diagnostic purposes.
                  responseDetails: summarizeDiagnosticResponse(data)
                }
              : t
          )
        );
      } else {
        const errText = await res.text();
        setSystemTestSuites((prev) =>
          prev.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  status: 'fail',
                  durationMs,
                  statusCode: res.status,
                  errorMsg: `HTTP ${res.status}: ${errText.slice(0, 300)}`
                }
              : t
          )
        );
      }
    } catch (err: any) {
      const endTime = performance.now();
      setSystemTestSuites((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: 'fail',
                durationMs: Math.round(endTime - startTime),
                errorMsg: err.message || 'Network error'
              }
            : t
        )
      );
    }
  };

  const runAllDiagnosticTests = async () => {
    setRunningAllDiagnostics(true);
    for (const test of systemTestSuites) {
      await runSingleDiagnosticTest(test.id);
    }
    setRunningAllDiagnostics(false);
  };

  // Inventory Products State
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [inventoryProductsLoading, setInventoryProductsLoading] = useState(false);
  const fetchInventoryProducts = useCallback(async () => {
    try {
      setInventoryProductsLoading(true);
      if (!session?.access_token) return;
      const res = await fetch("/api/inventory/products", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryProducts(data.products || []);
      }
    } catch (err) {
      console.error("Error fetching inventory products:", err);
    } finally {
      setInventoryProductsLoading(false);
    }
  }, [session]);

  // Also load once session is ready regardless of tab — the notification bell's low-stock
  // alerts need inventoryProducts populated even if the admin never visits the Inventory tab.
  useEffect(() => {
    fetchInventoryProducts();
  }, [fetchInventoryProducts]);

  // Synchronize dynamic bookings and low-stock alerts into the notifications list.
  // No early-return guard on reservations alone — a clinic with stock but no bookings yet still
  // needs to see low-stock alerts, so this must run even when allReservations is empty.
  useEffect(() => {
    const latestReservations = [...(allReservations || [])]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);

    const generatedNotifications = latestReservations.map((res) => {
      const isCancelled = res.status === "cancelled";
      const serviceName = localServices.find((s) => s.id === res.serviceId)?.en || `Service #${res.serviceId}`;
      const timeString = res.timeSlot || res.requestedTime || "unspecified time";
      return {
        id: res.id || String(Math.random()),
        title: isCancelled ? "Appointment Cancelled" : "New Booking Received",
        message: `${res.name || "A patient"} reserved ${serviceName} on ${res.date} at ${timeString}.`,
        time: res.createdAt ? new Date(res.createdAt).toLocaleDateString() : "Just now",
        read: false,
        type: isCancelled ? "cancelled" : "booking"
      };
    });

    // Low-stock alerts, worst-depleted first — same list the Inventory page's "Low Stock Alerts"
    // card counts, just surfaced somewhere staff will actually see it without visiting that page.
    const lowStockNotifications = (inventoryProducts || [])
      .filter((p) => Number(p.stock_quantity) <= Number(p.min_reorder_quantity))
      .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity))
      .slice(0, 5)
      .map((p) => ({
        id: `low-stock-${p.id}`,
        title: "Low Stock Alert",
        message: `${p.name} has ${p.stock_quantity} ${p.unit}${Number(p.stock_quantity) === 1 ? "" : "s"} left (reorder at ${p.min_reorder_quantity}).`,
        time: "Live",
        read: false,
        type: "low_stock"
      }));

    setNotifications([
      {
        id: "system-1",
        title: "Clinic System Active",
        message: "Twilio SMS integration and Supabase auth are fully operational.",
        time: "Active",
        read: false,
        type: "system"
      },
      ...lowStockNotifications,
      ...generatedNotifications
    ]);
  }, [allReservations, localServices, inventoryProducts]);

  // Shared fetch for a customer's purchased packages (customer_packages + items), reused across
  // the profile's Packages tab, the booking detail drawer, checkout, and manual booking creation —
  // each keeps its own state so switching which booking/profile is in view never shows stale data.
  const fetchCustomerPackagesInto = useCallback(async (customerId: string, setter: (data: any[]) => void) => {
    try {
      if (!session?.access_token) return;
      const res = await fetch(`/api/customers/packages?customer_id=${encodeURIComponent(customerId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setter(data.packages || []);
      }
    } catch (err) {
      console.error("Error fetching customer packages:", err);
    }
  }, [session]);

  // Product sales history — kept here because CustomerProfileDrawer needs it as a prop.
  // InventoryProductsTab owns its own copy; this one feeds the customer profile drawer.
  const [productSalesHistory, setProductSalesHistory] = useState<any[]>([]);
  const [productSalesLoading, setProductSalesLoading] = useState(false);

  const fetchProductSalesHistory = useCallback(async () => {
    try {
      setProductSalesLoading(true);
      if (!session?.access_token) return;
      const res = await fetch("/api/inventory/products/sales", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProductSalesHistory(data.sales || []);
      }
    } catch (err) {
      console.error("Error fetching product sales history:", err);
    } finally {
      setProductSalesLoading(false);
    }
  }, [session]);

  const refreshProductSalesHistory = useCallback(async () => {
    productsTabRef.current?.refreshSalesHistory();
    await fetchProductSalesHistory();
  }, [productsTabRef, fetchProductSalesHistory]);

  const {
    viewingCustomerProfile,
    setViewingCustomerProfile,
    medicalRecordForm,
    setMedicalRecordForm,
    medicalReports,
    setMedicalReports,
    loadingMedicalRecords,
    showMedicalFormModal,
    setShowMedicalFormModal,
    showMedicalReportModal,
    setShowMedicalReportModal,
    customerProfileTab,
    setCustomerProfileTab,
    customerRecordsSubTab,
    setCustomerRecordsSubTab,
    customerPrescriptions,
    loadingPrescriptions,
    prescriptionEditMode,
    setPrescriptionEditMode,
    editingPrescription,
    customerProductsSubTab,
    setCustomerProductsSubTab,
    customerProductBalances,
    loadingCustomerProducts,
    logUsageModalBalance,
    setLogUsageModalBalance,
    logUsageQty,
    setLogUsageQty,
    logUsageNotes,
    setLogUsageNotes,
    savingUsageLog,
    showAddPatientProductModal,
    setShowAddPatientProductModal,
    selectedAddProductId,
    setSelectedAddProductId,
    selectedAddProductName,
    setSelectedAddProductName,
    selectedAddProductQty,
    setSelectedAddProductQty,
    selectedAddProductUnitPrice,
    setSelectedAddProductUnitPrice,
    addingProductToPatient,
    customerPackagesSubTab,
    setCustomerPackagesSubTab,
    customerProfilePackages,
    loadingCustomerPackages,
    showSellPackageModal,
    setShowSellPackageModal,
    availablePackageOffers,
    selectedSellPackageId,
    setSelectedSellPackageId,
    sellPackagePaymentMethod,
    setSellPackagePaymentMethod,
    sellingPackage,
    customerPackageRedemptions,
    rxDiagnosis,
    setRxDiagnosis,
    rxMedications,
    setRxMedications,
    rxMedInput,
    setRxMedInput,
    rxMedDropdown,
    setRxMedDropdown,
    rxGeneralNotes,
    setRxGeneralNotes,
    rxDocNotes,
    setRxDocNotes,
    rxFollowUpDate,
    setRxFollowUpDate,
    savingPrescription,
    fetchCustomerProductBalances,
    fetchAvailablePackageOffers,
    handleSellPackageToCustomer,
    handleSaveUsageLog,
    handleAddProductToPatient,
    handleStartCreatePrescription,
    handleStartEditPrescription,
    handleAddMedication,
    handleRemoveMedication,
    handleSavePrescription,
    handleDeletePrescription,
    handleOpenMedicalFormModal,
    handleOpenMedicalReportModal,
    handleDeleteMedicalReport,
    handlePrintPrescription,
  } = useCustomerProfile({
    session,
    authenticatedJsonHeaders,
    fetchInventoryProducts,
    fetchProductSalesHistory: refreshProductSalesHistory,
    fetchCustomerPackagesInto,
    showConfirm,
  });

  useEffect(() => {
    if (activeNav === "Inventory" || activeNav === "Products" || activeNav === "Patients" || viewingCustomerProfile) {
      fetchInventoryProducts();
    }
  }, [activeNav, viewingCustomerProfile, fetchInventoryProducts]);

  useEffect(() => {
    const custId = viewingBooking?.customerId || (viewingBooking as any)?.customer_id || (viewingBooking?.phone ? dbCustomers.find(c => c.phone && c.phone.trim().replace(/\D/g, '') === (viewingBooking.phone || '').trim().replace(/\D/g, ''))?.id : null);
    if (custId) {
      fetchCustomerPackagesInto(custId, setBookingCustomerPackages);
    } else {
      setBookingCustomerPackages([]);
    }
  }, [viewingBooking?.customerId, (viewingBooking as any)?.customer_id, viewingBooking?.phone, dbCustomers, fetchCustomerPackagesInto]);

  useEffect(() => {
    const custId = checkoutBooking?.customerId || (checkoutBooking as any)?.customer_id || (checkoutBooking?.phone ? dbCustomers.find(c => c.phone && c.phone.trim().replace(/\D/g, '') === (checkoutBooking.phone || '').trim().replace(/\D/g, ''))?.id : null);
    if (custId) {
      fetchCustomerPackagesInto(custId, setCheckoutCustomerPackages);
    } else {
      setCheckoutCustomerPackages([]);
      setRedeemedPackageItems({});
    }
  }, [checkoutBooking?.customerId, (checkoutBooking as any)?.customer_id, checkoutBooking?.phone, dbCustomers, fetchCustomerPackagesInto]);

  useEffect(() => {
    if (matchedCustomerId) {
      fetchCustomerPackagesInto(matchedCustomerId, setManualBookingCustomerPackages);
    } else {
      setManualBookingCustomerPackages([]);
    }
  }, [matchedCustomerId, fetchCustomerPackagesInto]);

  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [marketingExpanded, setMarketingExpanded] = useState(false);
  const [pagesSettingsTab, setPagesSettingsTab] = useState<"Home" | "About Us" | "Services">("Home");
  const [termsText, setTermsText] = useState("");
  const [homeHeroSlides, setHomeHeroSlides] = useState<any[]>(DEFAULT_HERO_SLIDES);
  const [homeHeroSlidesAr, setHomeHeroSlidesAr] = useState<any[]>(() =>
    translations.ar.hero.slides.map((slide, index) => ({
      ...slide,
      image: DEFAULT_HERO_SLIDES[index]?.image,
    })),
  );

  const isDoctorAvailableAdmin = useCallback((
    doctor: any,
    branchId: string | null,
    dateStr: string | null,
    timeSlotStr: string | null,
    serviceId: number | null,
    sessionType?: string | null
  ): boolean => {
    if (!dateStr || !timeSlotStr || !serviceId) return true;
 
    if (branchId) {
      const wdh = doctor.workingDaysHours;
      if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
        if (!wdh.branch_ids.includes(branchId)) {
          return false;
        }
      } else if (doctor.branchId && doctor.branchId !== branchId) {
        return false;
      }
    }
 
    const targetService = localServices.find(s => s.id === serviceId);
    if (targetService) {
      if (doctor.services && doctor.services.length > 0) {
        if (!doctor.services.includes(targetService.en)) {
          return false;
        }
      }
    }
 
    const timeToMinutes = (timeStr: string): number => {
      const norm = normaliseTo24hSlot(timeStr);
      if (!norm) return 0;
      const [hh, mm] = norm.split(":").map(Number);
      return hh * 60 + mm;
    };
 
    const startNew = timeToMinutes(timeSlotStr);
    const durationNew = getServiceDurationMinutes(targetService);
    const endNew = startNew + durationNew;
 
    if (doctor.workingDaysHours) {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const weekdayName = weekdays[dateObj.getDay()];
        
        const wdh = doctor.workingDaysHours;
        let config = wdh;
        if (wdh.branch_schedules && branchId && wdh.branch_schedules[branchId]) {
          config = wdh.branch_schedules[branchId];
        }

        let dayConfig = config[weekdayName];
        if (!dayConfig) {
          const typeKey = sessionType === 'online' ? 'online' : 'in_person';
          dayConfig = config[typeKey]?.[weekdayName] || 
                      config.in_person?.[weekdayName] || 
                      config.online?.[weekdayName];
        }
 
        if (!dayConfig || !dayConfig.isOpen) {
          return false;
        }
        if (dayConfig.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
          const slotFitsAnyShift = dayConfig.shifts.some((shft: any) => {
            if (!shft.start || !shft.end) return false;
            const [sh, sm] = shft.start.split(":").map(Number);
            const [eh, em] = shft.end.split(":").map(Number);
            const shiftStart = sh * 60 + sm;
            const shiftEnd = eh * 60 + em;
            return startNew >= shiftStart && endNew <= shiftEnd;
          });
          if (!slotFitsAnyShift) {
            return false;
          }
        } else {
          const [sh, sm] = dayConfig.start.split(":").map(Number);
          const [eh, em] = dayConfig.end.split(":").map(Number);
          const shiftStart = sh * 60 + sm;
          const shiftEnd = eh * 60 + em;
   
          if (startNew < shiftStart || endNew > shiftEnd) {
            return false;
          }
        }
      }
    }

    const hasOverlap = allReservations.some((res) => {
      if (res.doctorName && res.doctorName === doctor.name && res.status !== "rejected") {
        if (res.date === dateStr && res.timeSlot) {
          const startRes = timeToMinutes(res.timeSlot);
          const resService = localServices.find((s) => s.id === res.serviceId);
          const durationRes = getServiceDurationMinutes(resService);
          const endRes = startRes + durationRes;

          if (startNew < endRes && startRes < endNew) {
            return true;
          }
        }
      }
      return false;
    });

    return !hasOverlap;
  }, [localServices, allReservations]);

  // ── Branches state (moved before provider hook so hook can use branches) ──
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchModal, setBranchModal] = useState<{ open: boolean; mode: "add" | "edit"; branch: Partial<Branch> }>({
    open: false, mode: "add", branch: {}
  });
  const [savingBranch, setSavingBranch] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [selectedBranchForHoursId, setSelectedBranchForHoursId] = useState<string>("");
  const [savingBranchHours, setSavingBranchHours] = useState(false);

  // ── Provider form hook (extracted from inline state — see Brief 15 Sub-PR 2) ──
  const providerForm = useProviderForm({
    branches,
    session,
    authenticatedJsonHeaders,
    showConfirm,
    fetchRolesAndEmployees,
    getDoctorFirstReservationDate,
    allReservations,
    activeNav,
    adminRole,
    hasPermission,
  });
  const {
    providers,
    setProviders,
    fetchProviders,
    editingDoctorInline,
    setEditingDoctorInline,
    viewingDoctorDetails,
    setViewingDoctorDetails,
    showProviderModal,
    setShowProviderModal,
    providerModalMode,
    setProviderModalMode,
    providerEditingId,
    setProviderEditingId,
    savingProvider,
    providerFormName,
    setProviderFormName,
    providerFormRating,
    setProviderFormRating,
    providerFormMore,
    setProviderFormMore,
    providerFormFixedSalary,
    setProviderFormFixedSalary,
    providerFormCommissionType,
    setProviderFormCommissionType,
    providerFormCommissionValue,
    setProviderFormCommissionValue,
    providerFormCommissionBase,
    setProviderFormCommissionBase,
    providerFormCommissionFixedComponent,
    setProviderFormCommissionFixedComponent,
    providerFormServiceCommissions,
    setProviderFormServiceCommissions,
    providerFormSelectedServices,
    setProviderFormSelectedServices,
    providerFormImage,
    setProviderFormImage,
    providerFormPhone,
    setProviderFormPhone,
    providerFormGender,
    setProviderFormGender,
    providerFormAge,
    setProviderFormAge,
    providerFormSpecialty,
    setProviderFormSpecialty,
    providerFormNationalId,
    setProviderFormNationalId,
    providerFormBranchId,
    setProviderFormBranchId,
    providerFormBranchIds,
    setProviderFormBranchIds,
    providerFormBranchSchedules,
    setProviderFormBranchSchedules,
    providerFormSelectedScheduleBranchId,
    setProviderFormSelectedScheduleBranchId,
    providerFormStartDate,
    setProviderFormStartDate,
    providerFormWorkingDaysHours,
    setProviderFormWorkingDaysHours,
    providerFormOnlineWorkingDaysHours,
    setProviderFormOnlineWorkingDaysHours,
    providerFormScheduleTab,
    setProviderFormScheduleTab,
    handleScheduleBranchChange,
    openAddProviderModal,
    openEditProviderModal,
    handleSaveProvider,
    handleDeleteProvider,
    providerTab,
    setProviderTab,
    attendanceDate,
    setAttendanceDate,
    attendanceRecords,
    loadingProviderAttendance,
    savingAttendanceId,
    fetchAttendance,
    handleToggleAttendance,
    showProviderFilterPanel,
    setShowProviderFilterPanel,
    providerFilterBranchId,
    setProviderFilterBranchId,
    providerFilterSpecialty,
    setProviderFilterSpecialty,
    providerFilterGender,
    setProviderFilterGender,
    providerSearchQuery,
    setProviderSearchQuery,
  } = providerForm;

  const availableDoctorsNewPatient = useMemo(() => {
    return providers.filter(p => isDoctorAvailableAdmin(p, newPatientBranch, newPatientDate, newPatientTimeSlot, newPatientService, newPatientSessionType));
  }, [providers, newPatientBranch, newPatientDate, newPatientTimeSlot, newPatientService, newPatientSessionType, isDoctorAvailableAdmin]);

  const availableDoctorsApprove = useMemo(() => {
    if (!selected) return [];
    return providers.filter(p => isDoctorAvailableAdmin(p, selected.branchId ?? null, selected.date, slot, selected.serviceId, selected.sessionType));
  }, [providers, selected, slot, isDoctorAvailableAdmin]);

  useEffect(() => {
    if (availableDoctorsNewPatient.length > 0) {
      if (!availableDoctorsNewPatient.some(d => d.name === newPatientDoctor)) {
        setNewPatientDoctor(availableDoctorsNewPatient[0].name);
      }
    } else {
      setNewPatientDoctor("");
    }
  }, [availableDoctorsNewPatient, newPatientDoctor]);

  useEffect(() => {
    if (selected && availableDoctorsApprove.length > 0) {
      if (!availableDoctorsApprove.some(d => d.name === doctorName)) {
        setDoctorName(availableDoctorsApprove[0].name);
      }
    } else if (selected) {
      setDoctorName("");
    }
  }, [availableDoctorsApprove, doctorName, selected]);


  // Custom provider inline & modal states
  const [expandedDoctorServices, setExpandedDoctorServices] = useState<Record<string, boolean>>({});
  const toggleExpandedDoctorServices = (docKey: string) => {
    setExpandedDoctorServices(prev => ({ ...prev, [docKey]: !prev[docKey] }));
  };
  const [departmentsList, setDepartmentsList] = useState<string[]>(["Receptionist", "Doctors"]);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);

  const [loadingPageSettings, setLoadingPageSettings] = useState(false);
  const [savingPageSettings, setSavingPageSettings] = useState(false);

  const [serviceHours, setServiceHours] = useState<Array<{ day: string; dayAr: string; isOpen: boolean; openTime: string; closeTime: string }>>([
    { day: "Sunday", dayAr: "الأحد", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Monday", dayAr: "الإثنين", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Tuesday", dayAr: "الثلاثاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Wednesday", dayAr: "الأربعاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Thursday", dayAr: "الخميس", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Friday", dayAr: "الجمعة", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Saturday", dayAr: "السبت", isOpen: true, openTime: "09:00", closeTime: "20:00" },
  ]);  const [pageSettingsLangTab, setPageSettingsLangTab] = useState<"en" | "ar">("en");
  const [aboutImage1, setAboutImage1] = useState<string>("");
  const [aboutImage2, setAboutImage2] = useState<string>("");
  const [aboutImage3, setAboutImage3] = useState<string>("");
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<any[]>([]);
  const [whatWeDoImage1, setWhatWeDoImage1] = useState<string>("");
  const [whatWeDoImage2, setWhatWeDoImage2] = useState<string>("");
  const [whatWeDoList, setWhatWeDoList] = useState<string[]>(["", "", "", ""]);
  const [whatWeDoListAr, setWhatWeDoListAr] = useState<string[]>(["", "", "", ""]);
  const [howItWorksHeading, setHowItWorksHeading] = useState<string>("");
  const [howItWorksDescription, setHowItWorksDescription] = useState<string>("");
  const [howItWorksHeadingAr, setHowItWorksHeadingAr] = useState<string>("");
  const [howItWorksDescriptionAr, setHowItWorksDescriptionAr] = useState<string>("");
  
  // Why Choose Us Section
  const [wcuYearsLabel, setWcuYearsLabel] = useState<string>("");
  const [wcuHeading, setWcuHeading] = useState<string>("");
  const [wcuDescription, setWcuDescription] = useState<string>("");
  const [wcuQuote, setWcuQuote] = useState<string>("");
  const [wcuContactLabel, setWcuContactLabel] = useState<string>("");
  const [wcuPhone, setWcuPhone] = useState<string>("");
  const [wcuYearsLabelAr, setWcuYearsLabelAr] = useState<string>("");
  const [wcuHeadingAr, setWcuHeadingAr] = useState<string>("");
  const [wcuDescriptionAr, setWcuDescriptionAr] = useState<string>("");
  const [wcuQuoteAr, setWcuQuoteAr] = useState<string>("");
  const [wcuContactLabelAr, setWcuContactLabelAr] = useState<string>("");
  const [wcuPhoneAr, setWcuPhoneAr] = useState<string>("");
  const [wcuImage1, setWcuImage1] = useState<string>("");
  const [wcuImage2, setWcuImage2] = useState<string>("");

  // FAQ Section
  const [faqTag, setFaqTag] = useState<string>("");
  const [faqTagAr, setFaqTagAr] = useState<string>("");
  const [faqHeading, setFaqHeading] = useState<string>("");
  const [faqHeadingAr, setFaqHeadingAr] = useState<string>("");
  const [faqImage1, setFaqImage1] = useState<string>("");
  const [faqImage2, setFaqImage2] = useState<string>("");
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [faqsAr, setFaqsAr] = useState<Array<{ question: string; answer: string }>>([]);
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const [reportsCustomerSearch, setReportsCustomerSearch] = useState("");
  const [smsTemplateSearch, setSmsTemplateSearch] = useState("");
  const [smsLogSearch, setSmsLogSearch] = useState("");
  const [settingsUserSearch, setSettingsUserSearch] = useState("");

  const [bookingMinAdvance, setBookingMinAdvance] = useState(2);
  const [bookingMaxAdvance, setBookingMaxAdvance] = useState(30);
  const [bookingCancelWindow, setBookingCancelWindow] = useState(4);
  const [bookingMaxPerSlot, setBookingMaxPerSlot] = useState(3);
  const [bookingInstantApproval, setBookingInstantApproval] = useState(false);
  const [bookingShowDoctorNotes, setBookingShowDoctorNotes] = useState(true);
  const [enableGpsShift, setEnableGpsShift] = useState(true);
  const [bookingDepositPercentage, setBookingDepositPercentage] = useState(20);
  const [savingBookingSettings, setSavingBookingSettings] = useState(false);
  
  // Deposit Settings State
  const [instapayName, setInstapayName] = useState("Revera Clinic");
  const [instapayAddress, setInstapayAddress] = useState("revera@instapay");
  const [instapayLink, setInstapayLink] = useState("https://www.instapay.eg");
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [walletName, setWalletName] = useState("Revera Clinics Cash");
  const [walletNumber, setWalletNumber] = useState("01012345678");
  const [walletLink, setWalletLink] = useState("");
  const [savingDepositSettings, setSavingDepositSettings] = useState(false);



  // ── Notification Settings State ──
  const [notifSmsOtp, setNotifSmsOtp] = useState(true);
  const [notifWhatsApp, setNotifWhatsApp] = useState(true);
  const [notifEmailConfirm, setNotifEmailConfirm] = useState(false);
  const [notifSmsTemplate, setNotifSmsTemplate] = useState("Hello {name}, your appointment for {service} is confirmed on {date} at {time}. See you at Revera Clinics!");
  const [notifSmsTemplateAr, setNotifSmsTemplateAr] = useState("مرحباً {name}، تم تأكيد موعدك لخدمة {service} بتاريخ {date} الساعة {time}. نراك في ريفيرا كلينيك!");
  const [notifReminderHours, setNotifReminderHours] = useState(24);
  const [notifStaffEmail, setNotifStaffEmail] = useState("admin@reveraclinics.com");
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  // ── Queue Settings State ──
  const [queueVirtualRoom, setQueueVirtualRoom] = useState(false);
  const [queueShowOnScreens, setQueueShowOnScreens] = useState(true);
  const [queueAutoCheckIn, setQueueAutoCheckIn] = useState(false);
  const [queueAlertThreshold, setQueueAlertThreshold] = useState(2);
  const [queueAvgSessionDuration, setQueueAvgSessionDuration] = useState(20);
  const [savingQueueSettings, setSavingQueueSettings] = useState(false);
  const getDayOperatingHoursAdmin = useCallback((dateStr: string | null) => {
    if (!dateStr || !newPatientService) return { start: "09:00", end: "20:00" };
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return { start: "09:00", end: "20:00" };

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[dateObj.getDay()];

    const selectedBranch = branches.find(b => b.id === newPatientBranch);
    const activeBranchHours = selectedBranch && Array.isArray(selectedBranch.service_hours) && selectedBranch.service_hours.length > 0
      ? selectedBranch.service_hours
      : serviceHours;

    const clinicDay = activeBranchHours.find(
      (sh) => sh.day?.toLowerCase() === weekdayName.toLowerCase()
    );

    let clinicStartMins = 9 * 60; // 09:00 default
    let clinicEndMins = 20 * 60;  // 20:00 default
    let clinicClosed = false;

    if (clinicDay) {
      if (!clinicDay.isOpen) {
        clinicClosed = true;
      } else {
        const [csh, csm] = clinicDay.openTime.split(":").map(Number);
        const [ceh, cem] = clinicDay.closeTime.split(":").map(Number);
        clinicStartMins = csh * 60 + csm;
        clinicEndMins = ceh * 60 + cem;
      }
    }

    if (clinicClosed) {
      return { start: "23:59", end: "23:59" };
    }
    
    const targetService = localServices.find(s => s.id === newPatientService);
    if (!targetService) return { start: "09:00", end: "20:00" };

    let minStart = 24 * 60; // in minutes
    let maxEnd = 0; // in minutes
    let found = false;

    providers.forEach((doc) => {
      // Check branch
      if (newPatientBranch) {
        const wdh = doc.workingDaysHours;
        if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
          if (!wdh.branch_ids.includes(newPatientBranch)) return;
        } else if (doc.branchId && doc.branchId !== newPatientBranch) {
          return;
        }
      }
      
      // Check service
      if (doc.services && doc.services.length > 0) {
        if (!doc.services.includes(targetService.en)) return;
      }
 
      // Check working days & hours
      if (doc.workingDaysHours) {
        const wdh = doc.workingDaysHours;
        let config = wdh;
        if (wdh.branch_schedules && newPatientBranch && wdh.branch_schedules[newPatientBranch]) {
          config = wdh.branch_schedules[newPatientBranch];
        }

        let dayConfig = config[weekdayName];
        if (!dayConfig) {
          const typeKey = newPatientSessionType === 'online' ? 'online' : 'in_person';
          dayConfig = config[typeKey]?.[weekdayName] || 
                      config.in_person?.[weekdayName] || 
                      config.online?.[weekdayName];
        }
        if (dayConfig && dayConfig.isOpen) {
          if (dayConfig.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
            dayConfig.shifts.forEach((shft: any) => {
              if (shft.start && shft.end) {
                const [sh, sm] = shft.start.split(":").map(Number);
                const [eh, em] = shft.end.split(":").map(Number);
                const startMins = sh * 60 + sm;
                const endMins = eh * 60 + em;
                if (startMins < minStart) minStart = startMins;
                if (endMins > maxEnd) maxEnd = endMins;
                found = true;
              }
            });
          } else {
            const [sh, sm] = dayConfig.start.split(":").map(Number);
            const [eh, em] = dayConfig.end.split(":").map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            if (startMins < minStart) minStart = startMins;
            if (endMins > maxEnd) maxEnd = endMins;
            found = true;
          }
        }
      } else {
        if (clinicStartMins < minStart) minStart = clinicStartMins;
        if (clinicEndMins > maxEnd) maxEnd = clinicEndMins;
        found = true;
      }
    });

    if (found) {
      if (minStart < clinicStartMins) minStart = clinicStartMins;
      if (maxEnd > clinicEndMins) maxEnd = clinicEndMins;
    } else {
      minStart = clinicStartMins;
      maxEnd = clinicEndMins;
    }

    const formatMins = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      start: formatMins(minStart),
      end: formatMins(maxEnd)
    };
  }, [providers, newPatientBranch, newPatientService, newPatientSessionType, localServices, serviceHours, branches]);

  const getDayOperatingHoursApprove = useCallback((selectedReq: Req | null) => {
    if (!selectedReq) return { start: "09:00", end: "20:00" };
    const dateStr = selectedReq.date;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return { start: "09:00", end: "20:00" };

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayName = weekdays[dateObj.getDay()];

    const selectedBranch = branches.find(b => b.id === selectedReq?.branchId);
    const activeBranchHours = selectedBranch && Array.isArray(selectedBranch.service_hours) && selectedBranch.service_hours.length > 0
      ? selectedBranch.service_hours
      : serviceHours;

    const clinicDay = activeBranchHours.find(
      (sh) => sh.day?.toLowerCase() === weekdayName.toLowerCase()
    );

    let clinicStartMins = 9 * 60; // 09:00 default
    let clinicEndMins = 20 * 60;  // 20:00 default
    let clinicClosed = false;

    if (clinicDay) {
      if (!clinicDay.isOpen) {
        clinicClosed = true;
      } else {
        const [csh, csm] = clinicDay.openTime.split(":").map(Number);
        const [ceh, cem] = clinicDay.closeTime.split(":").map(Number);
        clinicStartMins = csh * 60 + csm;
        clinicEndMins = ceh * 60 + cem;
      }
    }

    if (clinicClosed) {
      return { start: "23:59", end: "23:59" };
    }
    
    const targetService = localServices.find(s => s.id === selectedReq.serviceId);
    if (!targetService) return { start: "09:00", end: "20:00" };

    let minStart = 24 * 60; // in minutes
    let maxEnd = 0; // in minutes
    let found = false;

    providers.forEach((doc) => {
      // Check branch
      if (selectedReq.branchId) {
        const wdh = doc.workingDaysHours;
        if (wdh && typeof wdh === 'object' && Array.isArray(wdh.branch_ids)) {
          if (!wdh.branch_ids.includes(selectedReq.branchId)) return;
        } else if (doc.branchId && doc.branchId !== selectedReq.branchId) {
          return;
        }
      }
      
      // Check service
      if (doc.services && doc.services.length > 0) {
        if (!doc.services.includes(targetService.en)) return;
      }
 
      // Check working days & hours
      if (doc.workingDaysHours) {
        const wdh = doc.workingDaysHours;
        let config = wdh;
        if (wdh.branch_schedules && selectedReq.branchId && wdh.branch_schedules[selectedReq.branchId]) {
          config = wdh.branch_schedules[selectedReq.branchId];
        }

        let dayConfig = config[weekdayName];
        if (!dayConfig) {
          const typeKey = selectedReq.sessionType === 'online' ? 'online' : 'in_person';
          dayConfig = config[typeKey]?.[weekdayName] || 
                      config.in_person?.[weekdayName] || 
                      config.online?.[weekdayName];
        }
        if (dayConfig && dayConfig.isOpen) {
          if (dayConfig.shifts && Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
            dayConfig.shifts.forEach((shft: any) => {
              if (shft.start && shft.end) {
                const [sh, sm] = shft.start.split(":").map(Number);
                const [eh, em] = shft.end.split(":").map(Number);
                const startMins = sh * 60 + sm;
                const endMins = eh * 60 + em;
                if (startMins < minStart) minStart = startMins;
                if (endMins > maxEnd) maxEnd = endMins;
                found = true;
              }
            });
          } else {
            const [sh, sm] = dayConfig.start.split(":").map(Number);
            const [eh, em] = dayConfig.end.split(":").map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            if (startMins < minStart) minStart = startMins;
            if (endMins > maxEnd) maxEnd = endMins;
            found = true;
          }
        }
      } else {
        if (clinicStartMins < minStart) minStart = clinicStartMins;
        if (clinicEndMins > maxEnd) maxEnd = clinicEndMins;
        found = true;
      }
    });

    if (found) {
      if (minStart < clinicStartMins) minStart = clinicStartMins;
      if (maxEnd > clinicEndMins) maxEnd = clinicEndMins;
    } else {
      minStart = clinicStartMins;
      maxEnd = clinicEndMins;
    }

    const formatMins = (totalMins: number) => {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      start: formatMins(minStart),
      end: formatMins(maxEnd)
    };
  }, [providers, localServices, serviceHours, branches]);


  // Derive unique customers from database AND reservations
  const customers = useMemo<Customer[]>(() => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const dbList = Array.isArray(dbCustomers) ? dbCustomers : [];

    const normalizePhone = (p: string | null | undefined): string => {
      if (!p) return "";
      let digits = String(p).replace(/\D/g, "");
      if (digits.startsWith("0020")) digits = digits.slice(4);
      else if (digits.startsWith("20")) digits = digits.slice(2);
      if (digits.length === 10 && (digits.startsWith("10") || digits.startsWith("11") || digits.startsWith("12") || digits.startsWith("15"))) {
        digits = "0" + digits;
      }
      return digits;
    };

    const processedDbCustomers = dbList.map((c) => {
      const cPhoneClean = normalizePhone(c.mobile || c.phone);
      const customerReservations = allReservations.filter((r: any) => {
        if (r.customerId && c.id && String(r.customerId) === String(c.id)) return true;
        const rPhoneClean = normalizePhone(r.phone || r.mobile || r.customerPhone);
        if (cPhoneClean && rPhoneClean && cPhoneClean === rPhoneClean) return true;
        return false;
      });

      const hasRecentBooking = customerReservations.some((r: any) => {
        if (!r.date) return false;
        const bookingDate = new Date(String(r.date).slice(0, 10) + 'T00:00:00');
        return bookingDate >= twoWeeksAgo;
      });

      const totalBookingsCount = customerReservations.length > 0
        ? customerReservations.length
        : Number(c.number_of_bookings || 0);

      const totalSpentCalculated = customerReservations.reduce((sum: number, r: any) => {
        if (['approved', 'confirmed', 'completed', 'started'].includes(r.status)) {
          return sum + Number(r.price || r.totalPrice || 0);
        }
        return sum;
      }, 0);

      // Extract real last booking date and time from reservations
      let lastBookingDateVal: string | null = null;
      let lastBookingTimeVal: string | null = null;
      if (customerReservations.length > 0) {
        const sortedRes = [...customerReservations].sort((a: any, b: any) => {
          const dateA = a.date ? String(a.date).slice(0, 10) : (a.createdAt ? String(a.createdAt).slice(0, 10) : "");
          const timeA = a.timeSlot || a.requestedTime || "00:00";
          const dateB = b.date ? String(b.date).slice(0, 10) : (b.createdAt ? String(b.createdAt).slice(0, 10) : "");
          const timeB = b.timeSlot || b.requestedTime || "00:00";
          return `${dateB} ${timeB}`.localeCompare(`${dateA} ${timeA}`);
        });
        const latest = sortedRes[0];
        if (latest) {
          lastBookingDateVal = latest.date || latest.createdAt || null;
          lastBookingTimeVal = latest.timeSlot || latest.requestedTime || null;
        }
      }

      const regDateStr = c.registration_date || c.created_at || now.toISOString();
      const regDate = new Date(regDateStr);
      const registeredRecently = regDate >= twoWeeksAgo;
      const isActive = c.active !== false && (hasRecentBooking || registeredRecently || customerReservations.length > 0);

      return {
        ...c,
        id: c.id,
        email: c.email || "",
        name: c.name,
        phone: c.mobile || c.phone || "",
        createdAt: regDateStr,
        lastBookingDate: lastBookingDateVal,
        lastBookingTime: lastBookingTimeVal,
        bookings: totalBookingsCount,
        spent: Math.max(Number(c.spent_amount || 0), totalSpentCalculated),
        outstanding: Number(c.outstanding || 0),
        wallet: Number(c.wallet_balance || 0),
        active: isActive,
      };
    });

    // Synthesize entries for any patients in allReservations who aren't in dbCustomers
    const existingIds = new Set(processedDbCustomers.map((c) => c.id).filter(Boolean));
    const existingPhones = new Set(processedDbCustomers.map((c) => normalizePhone(c.phone || c.mobile)).filter(Boolean));

    const reservationDerivedCustomers: Customer[] = [];
    allReservations.forEach((r: any) => {
      // A reservation linked to a real customer record is always covered by that record
      if (r.customerId && existingIds.has(r.customerId)) return;

      const name = r.name || r.patient_name || r.customerName;
      const rawPhone = r.phone || r.mobile || r.customerPhone || "";
      const phoneClean = normalizePhone(rawPhone);
      const email = r.email || r.customerEmail || "";

      if (!name && !rawPhone) return;

      if (phoneClean && existingPhones.has(phoneClean)) {
        return; // already covered
      }

      if (phoneClean) existingPhones.add(phoneClean);

      const patientReservations = allReservations.filter((otherR: any) => {
        if (r.customerId && otherR.customerId && String(otherR.customerId) === String(r.customerId)) return true;
        const otherPhoneClean = normalizePhone(otherR.phone || otherR.mobile || otherR.customerPhone);
        if (phoneClean && otherPhoneClean && phoneClean === otherPhoneClean) return true;
        return false;
      });

      const totalSpent = patientReservations.reduce((sum: number, pr: any) => {
        if (['approved', 'confirmed', 'completed', 'started'].includes(pr.status)) {
          return sum + Number(pr.price || pr.totalPrice || 0);
        }
        return sum;
      }, 0);

      // Extract real last booking date and time for reservation-derived customers
      let lastBookingDateVal: string | null = null;
      let lastBookingTimeVal: string | null = null;
      if (patientReservations.length > 0) {
        const sortedRes = [...patientReservations].sort((a: any, b: any) => {
          const dateA = a.date ? String(a.date).slice(0, 10) : (a.createdAt ? String(a.createdAt).slice(0, 10) : "");
          const timeA = a.timeSlot || a.requestedTime || "00:00";
          const dateB = b.date ? String(b.date).slice(0, 10) : (b.createdAt ? String(b.createdAt).slice(0, 10) : "");
          const timeB = b.timeSlot || b.requestedTime || "00:00";
          return `${dateB} ${timeB}`.localeCompare(`${dateA} ${timeA}`);
        });
        const latest = sortedRes[0];
        if (latest) {
          lastBookingDateVal = latest.date || latest.createdAt || null;
          lastBookingTimeVal = latest.timeSlot || latest.requestedTime || null;
        }
      }

      const regDateStr = r.createdAt || r.date || now.toISOString();

      reservationDerivedCustomers.push({
        id: r.customerId || `res-cust-${phoneClean || Math.random().toString(36).slice(2, 9)}`,
        name,
        phone: rawPhone,
        email,
        createdAt: regDateStr,
        lastBookingDate: lastBookingDateVal,
        lastBookingTime: lastBookingTimeVal,
        bookings: patientReservations.length,
        spent: totalSpent,
        outstanding: 0,
        wallet: 0,
        active: true,
      } as any);
    });

    return [...processedDbCustomers, ...reservationDerivedCustomers];
  }, [dbCustomers, allReservations]);

  const todaysBookingsCount = useMemo(() => {
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateString(new Date());
    const ALL_ACTIVE = ['approved', 'confirmed', 'started', 'completed', 'pending'];
    const todays = allReservations.filter(
      r => String(r.date).slice(0, 10) === todayStr && ALL_ACTIVE.includes(r.status)
    );
    console.log('[Today Bookings] todayStr:', todayStr, '| all reservation dates:', allReservations.map(r => `${String(r.date).slice(0,10)}(${r.status})`));
    return todays.length;
  }, [allReservations]);

  const comingAppointmentsCount = useMemo(() => {
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateString(new Date());
    return allReservations.filter(
      r => ['approved', 'confirmed', 'started', 'completed'].includes(r.status) && String(r.date).slice(0, 10) >= todayStr
    ).length;
  }, [allReservations]);

  const dynamicOverviewCards = useMemo(() => {
    const activeBookings = allReservations.filter((r) => ['approved', 'confirmed', 'started', 'completed'].includes(r.status));
    const activeBookingsCount = activeBookings.length;
    const newCustomersCount = customers.length;
    const openRequestsCount = requests.length;

    // Map serviceId to price values in USD
    const prices: Record<number, number> = {
      1: 100, 2: 120, 3: 80, 4: 90, 5: 150, 6: 110, 7: 250,
      11: 150, 12: 130, 13: 200, 14: 180, 15: 220, 16: 190, 17: 100,
      21: 70, 22: 80, 23: 75,
      31: 90, 32: 85, 33: 95, 34: 110
    };
    
    const revenueSum = activeBookings.reduce((sum, r) => {
      const price = prices[r.serviceId] ?? 100;
      return sum + price;
    }, 0);

    const formattedRevenue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(revenueSum);

    return [
      { label: "Active bookings", value: String(activeBookingsCount), accent: "bg-[#C4AE7C]/10", icon: CalendarDays },
      { label: "New patients", value: String(newCustomersCount), accent: "bg-[#C4AE7C]/10", icon: Users },
      { label: "Revenue", value: formattedRevenue, accent: "bg-[#C4AE7C]/10", icon: DollarSign },
      { label: "Open requests", value: String(openRequestsCount), accent: "bg-[#C4AE7C]/10", icon: FileText },
    ];
  }, [allReservations, customers.length, requests.length]);

  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (customerFilterGender !== "All") {
      list = list.filter((c) => c.gender === customerFilterGender);
    }

    if (customerFilterStatus !== "All") {
      const wantActive = customerFilterStatus === "Active";
      list = list.filter((c) => (c.active !== undefined ? c.active : true) === wantActive);
    }

    if (customerFilterReferral !== "All") {
      list = list.filter((c) => c.referral === customerFilterReferral);
    }

    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      list = list.filter((c) => {
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const emailMatch = (c.email || "").toLowerCase().includes(q);
        const phoneMatch = (c.mobile || c.phone || "").toLowerCase().includes(q);
        const nationalIdMatch = (c.national_id || "").toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || nationalIdMatch;
      });
    }

    return list;
  }, [customers, customerSearch, customerFilterGender, customerFilterStatus, customerFilterReferral]);

  useEffect(() => {
    fetchPageSettings();
    fetchProviders();
    fetchRooms();
    // Fetch branches and set default branch
    setLoadingBranches(true);
    cachedFetch("/api/branches", 30000)
      .then(data => {
        const list: Branch[] = Array.isArray(data) ? data : [];
        setBranches(list);
        if (list.length > 0) {
          setBranch((prev) => prev || list[0].id);
          setSelectedBranchForHoursId((prev) => prev || list[0].id);
        }
      })
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, []);

  // Sync serviceHours state with active branch selection
  useEffect(() => {
    if (!selectedBranchForHoursId) return;
    const branchRecord = branches.find(b => b.id === selectedBranchForHoursId);
    if (branchRecord && Array.isArray(branchRecord.service_hours) && branchRecord.service_hours.length > 0) {
      setServiceHours(branchRecord.service_hours);
    } else {
      setServiceHours([
        { day: "Sunday", dayAr: "الأحد", isOpen: true, openTime: "09:00", closeTime: "20:00" },
        { day: "Monday", dayAr: "الإثنين", isOpen: true, openTime: "09:00", closeTime: "20:00" },
        { day: "Tuesday", dayAr: "الثلاثاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
        { day: "Wednesday", dayAr: "الأربعاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
        { day: "Thursday", dayAr: "الخميس", isOpen: true, openTime: "09:00", closeTime: "20:00" },
        { day: "Friday", dayAr: "الجمعة", isOpen: false, openTime: "09:00", closeTime: "20:00" },
        { day: "Saturday", dayAr: "السبت", isOpen: true, openTime: "09:00", closeTime: "20:00" },
      ]);
    }
  }, [selectedBranchForHoursId, branches]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setSidebarOpen(false);
    });
  }, [activeNav]);

  // Re-fetch bookings whenever branch selection changes and poll every 15 seconds for new requests
  useEffect(() => {
    if (!branch) return; // wait until branches are loaded

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    // Initial load WITH spinner
    fetchRequests(true);
    fetchAllReservations();

    const poll = async () => {
      try {
        // Clear specific endpoints cache entries to force fresh server response
        clearFetchCache(`/api/reservations?status=pending&branchId=${branch}`);
        clearFetchCache(`/api/reservations?branchId=${branch}`);
        
        await Promise.all([
          fetchRequests(false) || Promise.resolve(),
          fetchAllReservations() || Promise.resolve()
        ]);
      } catch (err) {
        if (err instanceof TypeError || String(err).includes("Failed to fetch")) {
          console.warn("Polling network connection lost (Failed to fetch)");
        } else {
          console.error("Polling error:", err);
        }
      } finally {
        if (isMounted) {
          // Schedule next poll in 15 seconds
          timerId = setTimeout(poll, 15000);
        }
      }
    };

    // Start background poll after 15 seconds
    timerId = setTimeout(poll, 15000);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  // RISK-053: this effect closes over fetchRequests/fetchAllReservations, which close over
  // authenticatedJsonHeaders/session. Without session?.access_token in the deps, the poll loop
  // keeps calling the closures captured whenever this effect last ran (i.e. whenever `branch`
  // last changed) for its entire lifetime. If Supabase silently rotates the access token later
  // (background refresh, or simply resolving async after `branch` was already set), the poll
  // keeps sending the stale token forever, every 401 ("Invalid or expired session") lands in
  // fetchRequests'/fetchAllReservations' .catch and overwrites requests/allReservations with []
  // — wiping Pending Approvals and every patient's Booking History even though a fully valid
  // session exists in state and localStorage. Re-creating the poll when the token value changes
  // keeps it on the live token going forward.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, session?.access_token]);

  // Fetch ALL reservations (no branch filter) for the schedule view whenever the date or view changes
  useEffect(() => {
    if (calendarView === "Schedule") {
      fetchScheduleReservations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarView, scheduleDate]);

  // Set default manual booking branch to the currently active branch filter
  useEffect(() => {
    if (showAddBookingModal) {
      setNewPatientBranch(branch);
    }
  }, [showAddBookingModal, branch]);

  // Update unavailable time slots for manual booking based on selected date, service, and branch
  useEffect(() => {
    if (!showAddBookingModal || !newPatientService || !newPatientDate) {
      setManualUnavailableSlots([]);
      return;
    }
    const branchQuery = newPatientBranch ? `&branchId=${newPatientBranch}` : "";
    fetch(`/api/availability?date=${newPatientDate}&serviceId=${newPatientService}${branchQuery}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.unavailableSlots)) {
          const { start, end } = getDayOperatingHoursAdmin(newPatientDate);
          const unavailable = data.unavailableSlots;
          setManualUnavailableSlots(unavailable);
          // Auto-select first available slot if current is unavailable, empty, or outside operating hours
          const filteredSlots = SLOTS.filter((s) => {
            const norm = normaliseTo24hSlot(s) ?? "";
            return norm >= start && norm < end;
          });
          const isCurrentInvalid = !newPatientTimeSlot || 
            unavailable.includes(newPatientTimeSlot) ||
            !filteredSlots.includes(newPatientTimeSlot);

          if (isCurrentInvalid) {
            const first = filteredSlots.find((s) => !unavailable.includes(s)) || filteredSlots[0] || SLOTS[0];
            setNewPatientTimeSlot(first);
          }
        }
      })
      .catch(() => setManualUnavailableSlots([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddBookingModal, newPatientService, newPatientDate, newPatientBranch]);

  function fetchPageSettings() {
    setLoadingPageSettings(true);
    cachedFetch("/api/page-settings", 15000, authenticatedJsonHeaders)
      .then((data) => {
        if (data) {
          setHomeHeroSlides(
            data.hero?.slides && data.hero.slides.length > 0
              ? data.hero.slides
              : DEFAULT_HERO_SLIDES
          );
          setHomeHeroSlidesAr(
            data.hero?.slides_ar &&
            data.hero.slides_ar.length > 0 &&
            !data.hero.slides_ar.some((slide: Record<string, unknown>) =>
              Object.values(slide).some(
                (value) => typeof value === "string" && value.includes("\u00C3"),
              ),
            )
              ? data.hero.slides_ar
              : translations.ar.hero.slides.map((slide, index) => ({
                  ...slide,
                  image: DEFAULT_HERO_SLIDES[index]?.image,
                }))
          );
          setAboutImage1(data.about?.image1 || "");
          setAboutImage2(data.about?.image2 || "");
          setAboutImage3(data.about?.image3 || "");
          setBeforeAfterPairs(data.results?.pairs || [
            { id: 1, before: "/images/before-after/1-before.jpeg", after: "/images/before-after/1-after.jpeg" },
            { id: 2, before: "/images/before-after/2-before.jpeg", after: "/images/before-after/2-after.jpeg" },
            { id: 3, before: "/images/before-after/3-before.jpeg", after: "/images/before-after/3-after.jpeg" },
            { id: 4, before: "/images/before-after/4-before.jpg",  after: "/images/before-after/4-after.jpg" },
            { id: 5, before: "/images/before-after/5-before.jpg",  after: "/images/before-after/5-after.jpg" },
            { id: 6, before: "/images/before-after/6-before.jpg",  after: "/images/before-after/6-after.jpg" },
          ]);
          setWhatWeDoImage1(data.aboutPage?.whatWeDoImage1 || "");
          setWhatWeDoImage2(data.aboutPage?.whatWeDoImage2 || "");
          setWhatWeDoList(data.aboutPage?.whatWeDoList || [
            "Dermatology & Aesthetic Treatments",
            "Gynecology & Women's Health",
            "Physical Therapy & Rehabilitation",
            "Osteopathy & Therapeutic Nutrition",
          ]);
          setWhatWeDoListAr(data.aboutPage?.whatWeDoListAr || [
            "علاجات الجلدية والتجميل",
            "النساء والتوليد وصحة المرأة",
            "العلاج الطبيعي وإعادة التأهيل",
            "تقويم العظام والتغذية العلاجية",
          ]);

          // Load FAQ Section Settings
          setFaqTag(data.aboutPage?.faqTag || "frequently asked questions");
          setFaqTagAr(data.aboutPage?.faqTagAr || "أسئلة شائعة");
          setFaqHeading(data.aboutPage?.faqHeading || "Questions? We have answers.");
          setFaqHeadingAr(data.aboutPage?.faqHeadingAr || "أسئلة؟ لدينا إجابات.");
          setFaqImage1(data.aboutPage?.faqImage1 || "");
          setFaqImage2(data.aboutPage?.faqImage2 || "");
          setFaqs(data.aboutPage?.faqs || [
            {
              question: "1. What services does Revera offer?",
              answer: "Revera is a premium polyclinic specializing in dermatology and aesthetic treatments, gynecology and women's health, physical therapy and rehabilitation, and osteopathy and therapeutic nutrition. Every service is delivered with medical precision and a luxury experience tailored to you."
            },
            {
              question: "2. Who is Revera designed for?",
              answer: "Revera is designed for women who value elegance, privacy, and visible results. Our clients seek the best — not the cheapest — and expect a medical experience that matches their standards."
            },
            {
              question: "3. How does my treatment plan work?",
              answer: "Your journey begins with a comprehensive consultation where we assess your health, aesthetic goals, and lifestyle. From this, our doctors build a fully personalized treatment plan — never a template — that evolves with your progress and needs."
            },
            {
              question: "4. What makes Revera different from other clinics?",
              answer: "Revera is a destination, not a clinic. The difference is in the feeling: a private, unhurried environment, doctors who listen, and a standard of care that you can see and feel at every touchpoint — from your first appointment to your last follow-up."
            }
          ]);
          setFaqsAr(data.aboutPage?.faqsAr || [
            {
              question: "١. ما الخدمات التي تقدمها ريفيرا؟",
              answer: "ريفيرا عيادة متميزة متخصصة في علاجات الجلدية والتجميل، وصحة المرأة والنساء والتوليد، والعلاج الطبيعي وإعادة التأهيل، وتقويم العظام والتغذية العلاجية. كل خدمة تُقدَّم بدقة طبية وتجربة فاخرة مصممة لكِ."
            },
            {
              question: "٢. لمن صُمِّمت ريفيرا؟",
              answer: "ريفيرا مصممة للمرأة التي تقدّر الأناقة والخصوصية والنتائج الحقيقية. عميلاتنا يبحثن عن الأفضل — لا الأرخص — ويتوقعن تجربة طبية تليق بمعاييرهن."
            },
            {
              question: "٣. كيف تعمل خطة علاجي؟",
              answer: "تبدأ رحلتكِ باستشارة شاملة نُقيّم فيها صحتكِ وأهدافكِ الجمالية وأسلوب حياتكِ. بناءً على ذلك، يضع أطباؤنا خطة علاج شخصية متكاملة — لا نموذجاً جاهزاً — تتطور مع تقدمكِ واحتياجاتكِ."
            },
            {
              question: "٤. ما الذي يجعل ريفيرا مختلفة؟",
              answer: "ريفيرا وجهة، لا مجرد عيادة. الفرق في الإحساس: بيئة خاصة وهادئة، وأطباء يستمعون، ومستوى رعاية يمكنكِ رؤيته والشعور به في كل لحظة — من موعدكِ الأول إلى متابعتكِ الأخيرة."
            }
          ]);
          setHowItWorksHeading(data.howItWorks?.heading || "Simple steps to beauty transformations");
          setHowItWorksDescription(data.howItWorks?.description || "Discover a seamless process designed to enhance your beauty and health through personalized consultations, customized treatment plans, and dedicated medical support. We guide you every step toward achieving your beauty and wellness goals.");
          setHowItWorksHeadingAr(data.howItWorks?.headingAr || "خطوات بسيطة لتحولات الجمال");
          setHowItWorksDescriptionAr(data.howItWorks?.descriptionAr || "اكتشف عملية سلسة مصممة لتعزيز جمالك وصحتك من خلال استشارات شخصية وخطط علاجية مخصصة ودعم طبي متخصص. نرشدك في كل خطوة نحو تحقيق أهداف الجمال والعافية.");

          // Load Why Choose Us Settings
          setWcuYearsLabel(data.whyChooseUs?.yearsLabel || "15+ years excellence");
          setWcuHeading(data.whyChooseUs?.heading || "Where medical expertise meets a luxury experience");
          setWcuDescription(data.whyChooseUs?.description || "At Revera, every detail is intentional — from your first consultation to the moment you walk out transformed. We deliver science-backed care with the calm confidence of a private medical destination.");
          setWcuQuote(data.whyChooseUs?.quote || '"We don\'t treat conditions — we transform confidence. Every session at Revera is designed around you: your goals, your skin, your journey."');
          setWcuContactLabel(data.whyChooseUs?.contactLabel || "Reach us:");
          setWcuPhone(data.whyChooseUs?.phone || "(+20) 01035595691");

          setWcuYearsLabelAr(data.whyChooseUs?.yearsLabelAr || "١٥+ عاماً من التميز");
          setWcuHeadingAr(data.whyChooseUs?.headingAr || "حيث تلتقي الخبرة الطبية بتجربة فاخرة");
          setWcuDescriptionAr(data.whyChooseUs?.descriptionAr || "في ريفيرا، كل تفصيل مقصود — بدءاً من استشارتك الأولى وحتى لحظة خروجك متحوّلة. نقدم رعاية مدعومة بالعلم مع الثقة الهادئة لوجهة طبية خاصة.");
          setWcuQuoteAr(data.whyChooseUs?.quoteAr || '"نحن لا نعالج فقط — بل نُحوّل الثقة. كل جلسة في ريفيرا مصممة حولكِ: أهدافكِ، بشرتكِ، رحلتكِ."');
          setWcuContactLabelAr(data.whyChooseUs?.contactLabelAr || "تواصلي معنا:");
          setWcuPhoneAr(data.whyChooseUs?.phoneAr || "(+20) 01035595691");

          setWcuImage1(data.whyChooseUs?.image1 || "");
          setWcuImage2(data.whyChooseUs?.image2 || "");

           if (data.booking) {
            setBookingMinAdvance(data.booking.minAdvance ?? 2);
            setBookingMaxAdvance(data.booking.maxAdvance ?? 30);
            setBookingCancelWindow(data.booking.cancelWindow ?? 4);
            setBookingMaxPerSlot(data.booking.maxPerSlot ?? 3);
            setBookingInstantApproval(data.booking.instantApproval ?? false);
            setBookingShowDoctorNotes(data.booking.showDoctorNotes ?? true);
            setEnableGpsShift(data.booking.enableGpsShift ?? data.shift?.gpsShiftEnabled ?? true);
            setBookingDepositPercentage(data.booking.depositPercentage ?? 20);
            setBookingStaleSessionHours(data.booking.staleSessionHours ?? 2);
          }
          if (data.deposit) {
            setInstapayName(data.deposit.instapayName || "Revera Clinic");
            setInstapayAddress(data.deposit.instapayAddress || "revera@instapay");
            setInstapayLink(data.deposit.instapayLink || "https://www.instapay.eg");
            setWalletEnabled(data.deposit.walletEnabled ?? true);
            setWalletName(data.deposit.walletName || "Revera Clinics Cash");
            setWalletNumber(data.deposit.walletNumber || "01012345678");
            setWalletLink(data.deposit.walletLink || "");
            if (data.deposit.depositPercentage !== undefined) {
              setBookingDepositPercentage(Number(data.deposit.depositPercentage));
            }
          } else {
            setInstapayName("Revera Clinic");
            setInstapayAddress("revera@instapay");
            setInstapayLink("https://www.instapay.eg");
            setWalletEnabled(true);
            setWalletName("Revera Clinics Cash");
            setWalletNumber("01012345678");
            setWalletLink("");
          }

          if (data.footer && data.footer.serviceHours) {
            setServiceHours(data.footer.serviceHours);
          }

          if (data.booking) {
            setTermsText(data.booking.termsText || "");
          }

          if (data.inactivity) {
            setInactivityThreshold(data.inactivity.threshold ?? 30);
            setInactivityCountdown(data.inactivity.countdown ?? 10);
          }

          if (data.notifications) {
            if (data.notifications.smsOtp !== undefined) setNotifSmsOtp(Boolean(data.notifications.smsOtp));
            if (data.notifications.whatsapp !== undefined) setNotifWhatsApp(Boolean(data.notifications.whatsapp));
            if (data.notifications.email !== undefined) setNotifEmailConfirm(Boolean(data.notifications.email));
            if (data.notifications.smsTemplate) setNotifSmsTemplate(String(data.notifications.smsTemplate));
            if (data.notifications.smsTemplateAr) setNotifSmsTemplateAr(String(data.notifications.smsTemplateAr));
            if (data.notifications.reminderHours !== undefined) setNotifReminderHours(Number(data.notifications.reminderHours));
            if (data.notifications.staffEmail) setNotifStaffEmail(String(data.notifications.staffEmail));
          }

          if (data.queue) {
            if (data.queue.virtualRoom !== undefined) setQueueVirtualRoom(Boolean(data.queue.virtualRoom));
            if (data.queue.showOnScreens !== undefined) setQueueShowOnScreens(Boolean(data.queue.showOnScreens));
            if (data.queue.autoCheckIn !== undefined) setQueueAutoCheckIn(Boolean(data.queue.autoCheckIn));
            if (data.queue.alertThreshold !== undefined) setQueueAlertThreshold(Number(data.queue.alertThreshold));
            if (data.queue.avgSessionDuration !== undefined) setQueueAvgSessionDuration(Number(data.queue.avgSessionDuration));
          }

          if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
            setDepartmentsList(data.departments);
          } else {
            setDepartmentsList(["Receptionist", "Doctors"]);
          }
        }
      })
      .catch((err) => console.error("fetchPageSettings error:", err))
      .finally(() => setLoadingPageSettings(false));
  }

  const handleProfileImageUpload = async (file: File, side: 'front' | 'back') => {
    try {
      const compressed = await compressImage(file, 1000, 1000, 0.75);
      if (side === 'front') {
        setProfileNatIdFront(compressed);
      } else {
        setProfileNatIdBack(compressed);
      }
    } catch (error) {
      console.error("Error compressing profile image:", error);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'front') {
          setProfileNatIdFront(reader.result as string);
        } else {
          setProfileNatIdBack(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSavePersonalProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileUpdateError("");
    setProfileUpdateSuccess("");
    try {
      const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
      if (!profileEmployee) {
        throw new Error("Could not locate employee account profile to update.");
      }

      // Check National ID format if entered
      if (profileNatId.trim() && profileNatId.trim().length !== 14) {
        throw new Error("Egyptian National ID must be exactly 14 digits.");
      }

      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          id: profileEmployee.id,
          name: profileName.trim(),
          phone: profilePhone.trim(),
          address: profileAddress.trim(),
          nationalId: profileNatId.trim() || null,
          nationalIdFront: profileNatIdFront || null,
          nationalIdBack: profileNatIdBack || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile details.");
      }

      setProfileUpdateSuccess("Profile updated successfully!");
      fetchRolesAndEmployees();
    } catch (err: any) {
      console.error("handleSavePersonalProfile error:", err);
      setProfileUpdateError(err.message || "Something went wrong.");
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleSavePersonalPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!profilePassword || !profileConfirmPassword) {
      setProfilePasswordError("Please fill in both password fields.");
      return;
    }
    if (profilePassword !== profileConfirmPassword) {
      setProfilePasswordError("Passwords do not match.");
      return;
    }
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPasswordRegex.test(profilePassword)) {
      setProfilePasswordError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. @$!%*?&#).");
      return;
    }

    setProfilePasswordSaving(true);
    setProfilePasswordError("");
    setProfilePasswordSuccess("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: profilePassword,
      });

      if (updateError) throw updateError;

      setProfilePasswordSuccess("Password changed successfully!");
      setProfilePassword("");
      setProfileConfirmPassword("");
    } catch (err: any) {
      console.error("handleSavePersonalPassword error:", err);
      setProfilePasswordError(err.message || "Failed to update password.");
    } finally {
      setProfilePasswordSaving(false);
    }
  }

  async function handleSaveDepositSettings() {
    setSavingDepositSettings(true);
    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          deposit: {
            instapayName: instapayName.trim(),
            instapayAddress: instapayAddress.trim(),
            instapayLink: instapayLink.trim(),
            walletEnabled,
            walletName: walletName.trim(),
            walletNumber: walletNumber.trim(),
            walletLink: walletLink.trim(),
            depositPercentage: bookingDepositPercentage
          }
        }),
      });
      if (res.ok) {
        alert("Deposit & InstaPay settings saved successfully!");
        clearFetchCache();
        fetchPageSettings();
      } else {
        alert("Failed to save deposit settings.");
      }
    } catch (err) {
      console.error("handleSaveDepositSettings error:", err);
      alert("Error saving deposit settings.");
    } finally {
      setSavingDepositSettings(false);
    }
  }

  async function handleSaveInactivitySettings() {
    setSavingInactivitySettings(true);
    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          inactivity: {
            threshold: Number(inactivityThreshold),
            countdown: Number(inactivityCountdown)
          }
        }),
      });
      if (res.ok) {
        alert("Inactivity settings saved successfully!");
        clearFetchCache();
        fetchPageSettings();
      } else {
        alert("Failed to save inactivity settings.");
      }
    } catch (err) {
      console.error("handleSaveInactivitySettings error:", err);
      alert("Error saving inactivity settings.");
    } finally {
      setSavingInactivitySettings(false);
    }
  }

  async function handleSaveBookingSettings() {
    setSavingBookingSettings(true);
    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          booking: {
            minAdvance: bookingMinAdvance,
            maxAdvance: bookingMaxAdvance,
            cancelWindow: bookingCancelWindow,
            maxPerSlot: bookingMaxPerSlot,
            instantApproval: bookingInstantApproval,
            showDoctorNotes: bookingShowDoctorNotes,
            enableGpsShift: enableGpsShift,
            depositPercentage: bookingDepositPercentage,
            staleSessionHours: bookingStaleSessionHours,
            termsText: termsText
          }
        }),
      });
      if (res.ok) {
        alert("Booking settings saved successfully!");
        clearFetchCache();
        fetchPageSettings();
      } else {
        alert("Failed to save booking settings.");
      }
    } catch (err) {
      console.error("handleSaveBookingSettings error:", err);
      alert("Error saving booking settings.");
    } finally {
      setSavingBookingSettings(false);
    }
  }

  async function handleSaveNotificationSettings() {
    setSavingNotificationSettings(true);
    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          notifications: {
            smsOtp: notifSmsOtp,
            whatsapp: notifWhatsApp,
            email: notifEmailConfirm,
            smsTemplate: notifSmsTemplate,
            smsTemplateAr: notifSmsTemplateAr,
            reminderHours: notifReminderHours,
            staffEmail: notifStaffEmail
          }
        }),
      });
      if (res.ok) {
        alert("Notification settings saved successfully!");
        clearFetchCache();
        fetchPageSettings();
      } else {
        alert("Failed to save notification settings.");
      }
    } catch (err) {
      console.error("handleSaveNotificationSettings error:", err);
      alert("Error saving notification settings.");
    } finally {
      setSavingNotificationSettings(false);
    }
  }

  async function handleSaveQueueSettings() {
    setSavingQueueSettings(true);
    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          queue: {
            virtualRoom: queueVirtualRoom,
            showOnScreens: queueShowOnScreens,
            autoCheckIn: queueAutoCheckIn,
            alertThreshold: queueAlertThreshold,
            avgSessionDuration: queueAvgSessionDuration
          }
        }),
      });
      if (res.ok) {
        alert("Queue settings saved successfully!");
        clearFetchCache();
        fetchPageSettings();
      } else {
        alert("Failed to save queue settings.");
      }
    } catch (err) {
      console.error("handleSaveQueueSettings error:", err);
      alert("Error saving queue settings.");
    } finally {
      setSavingQueueSettings(false);
    }
  }

  async function handleAutoTranslate(
    text: string,
    from: "en" | "ar",
    to: "en" | "ar",
    setter: (val: any) => void,
    fieldKey: string
  ) {
    if (!text || !text.trim()) return;
    setTranslatingField(fieldKey);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ text, from, to }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setter(data.translatedText);
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslatingField(null);
    }
  }

  async function savePageSettings(overrideData?: any) {
    setSavingPageSettings(true);
    
    // Construct the full payload merging current states and any overrides
    const heroSlides = overrideData?.hero?.slides || homeHeroSlides;
    const heroSlidesAr = overrideData?.hero?.slides_ar || homeHeroSlidesAr;
    const img1 = overrideData?.about?.image1 !== undefined ? overrideData.about.image1 : aboutImage1;
    const img2 = overrideData?.about?.image2 !== undefined ? overrideData.about.image2 : aboutImage2;
    const img3 = overrideData?.about?.image3 !== undefined ? overrideData.about.image3 : aboutImage3;
    const pairs = overrideData?.results?.pairs || beforeAfterPairs;
    
    const wwdImage1 = overrideData?.aboutPage?.whatWeDoImage1 !== undefined ? overrideData.aboutPage.whatWeDoImage1 : whatWeDoImage1;
    const wwdImage2 = overrideData?.aboutPage?.whatWeDoImage2 !== undefined ? overrideData.aboutPage.whatWeDoImage2 : whatWeDoImage2;
    const wwdList = overrideData?.aboutPage?.whatWeDoList !== undefined ? overrideData.aboutPage.whatWeDoList : whatWeDoList;
    const wwdListAr = overrideData?.aboutPage?.whatWeDoListAr !== undefined ? overrideData.aboutPage.whatWeDoListAr : whatWeDoListAr;

    const fTag = overrideData?.aboutPage?.faqTag !== undefined ? overrideData.aboutPage.faqTag : faqTag;
    const fTagAr = overrideData?.aboutPage?.faqTagAr !== undefined ? overrideData.aboutPage.faqTagAr : faqTagAr;
    const fHeading = overrideData?.aboutPage?.faqHeading !== undefined ? overrideData.aboutPage.faqHeading : faqHeading;
    const fHeadingAr = overrideData?.aboutPage?.faqHeadingAr !== undefined ? overrideData.aboutPage.faqHeadingAr : faqHeadingAr;
    const fImage1 = overrideData?.aboutPage?.faqImage1 !== undefined ? overrideData.aboutPage.faqImage1 : faqImage1;
    const fImage2 = overrideData?.aboutPage?.faqImage2 !== undefined ? overrideData.aboutPage.faqImage2 : faqImage2;
    const fList = overrideData?.aboutPage?.faqs !== undefined ? overrideData.aboutPage.faqs : faqs;
    const fListAr = overrideData?.aboutPage?.faqsAr !== undefined ? overrideData.aboutPage.faqsAr : faqsAr;

    const hiwHeading = overrideData?.howItWorks?.heading !== undefined ? overrideData.howItWorks.heading : howItWorksHeading;
    const hiwDescription = overrideData?.howItWorks?.description !== undefined ? overrideData.howItWorks.description : howItWorksDescription;
    const hiwHeadingAr = overrideData?.howItWorks?.headingAr !== undefined ? overrideData.howItWorks.headingAr : howItWorksHeadingAr;
    const hiwDescriptionAr = overrideData?.howItWorks?.descriptionAr !== undefined ? overrideData.howItWorks.descriptionAr : howItWorksDescriptionAr;

    const wcuYearsLabelVal = overrideData?.whyChooseUs?.yearsLabel !== undefined ? overrideData.whyChooseUs.yearsLabel : wcuYearsLabel;
    const wcuHeadingVal = overrideData?.whyChooseUs?.heading !== undefined ? overrideData.whyChooseUs.heading : wcuHeading;
    const wcuDescriptionVal = overrideData?.whyChooseUs?.description !== undefined ? overrideData.whyChooseUs.description : wcuDescription;
    const wcuQuoteVal = overrideData?.whyChooseUs?.quote !== undefined ? overrideData.whyChooseUs.quote : wcuQuote;
    const wcuContactLabelVal = overrideData?.whyChooseUs?.contactLabel !== undefined ? overrideData.whyChooseUs.contactLabel : wcuContactLabel;
    const wcuPhoneVal = overrideData?.whyChooseUs?.phone !== undefined ? overrideData.whyChooseUs.phone : wcuPhone;

    const wcuYearsLabelArVal = overrideData?.whyChooseUs?.yearsLabelAr !== undefined ? overrideData.whyChooseUs.yearsLabelAr : wcuYearsLabelAr;
    const wcuHeadingArVal = overrideData?.whyChooseUs?.headingAr !== undefined ? overrideData.whyChooseUs.headingAr : wcuHeadingAr;
    const wcuDescriptionArVal = overrideData?.whyChooseUs?.descriptionAr !== undefined ? overrideData.whyChooseUs.descriptionAr : wcuDescriptionAr;
    const wcuQuoteArVal = overrideData?.whyChooseUs?.quoteAr !== undefined ? overrideData.whyChooseUs.quoteAr : wcuQuoteAr;
    const wcuContactLabelArVal = overrideData?.whyChooseUs?.contactLabelAr !== undefined ? overrideData.whyChooseUs.contactLabelAr : wcuContactLabelAr;
    const wcuPhoneArVal = overrideData?.whyChooseUs?.phoneAr !== undefined ? overrideData.whyChooseUs.phoneAr : wcuPhoneAr;

    const wcuImage1Val = overrideData?.whyChooseUs?.image1 !== undefined ? overrideData.whyChooseUs.image1 : wcuImage1;
    const wcuImage2Val = overrideData?.whyChooseUs?.image2 !== undefined ? overrideData.whyChooseUs.image2 : wcuImage2;

    const sHours = overrideData?.footer?.serviceHours !== undefined ? overrideData.footer.serviceHours : serviceHours;

    const fullPayload = {
      hero: {
        slides: heroSlides,
        slides_ar: heroSlidesAr
      },
      about: {
        image1: img1,
        image2: img2,
        image3: img3
      },
      results: {
        pairs: pairs
      },
      aboutPage: {
        whatWeDoImage1: wwdImage1,
        whatWeDoImage2: wwdImage2,
        whatWeDoList: wwdList,
        whatWeDoListAr: wwdListAr,
        faqTag: fTag,
        faqTagAr: fTagAr,
        faqHeading: fHeading,
        faqHeadingAr: fHeadingAr,
        faqImage1: fImage1,
        faqImage2: fImage2,
        faqs: fList,
        faqsAr: fListAr
      },
      howItWorks: {
        heading: hiwHeading,
        description: hiwDescription,
        headingAr: hiwHeadingAr,
        descriptionAr: hiwDescriptionAr
      },
      whyChooseUs: {
        yearsLabel: wcuYearsLabelVal,
        heading: wcuHeadingVal,
        description: wcuDescriptionVal,
        quote: wcuQuoteVal,
        contactLabel: wcuContactLabelVal,
        phone: wcuPhoneVal,
        yearsLabelAr: wcuYearsLabelArVal,
        headingAr: wcuHeadingArVal,
        descriptionAr: wcuDescriptionArVal,
        quoteAr: wcuQuoteArVal,
        contactLabelAr: wcuContactLabelArVal,
        phoneAr: wcuPhoneArVal,
        image1: wcuImage1Val,
        image2: wcuImage2Val
      },
      footer: {
        serviceHours: sHours
      },
      booking: {
        minAdvance: bookingMinAdvance,
        maxAdvance: bookingMaxAdvance,
        cancelWindow: bookingCancelWindow,
        maxPerSlot: bookingMaxPerSlot,
        instantApproval: bookingInstantApproval,
        showDoctorNotes: bookingShowDoctorNotes,
        enableGpsShift: enableGpsShift,
        depositPercentage: bookingDepositPercentage,
        termsText: overrideData?.booking?.termsText !== undefined ? overrideData.booking.termsText : termsText,
      }
    };

    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify(fullPayload),
      });
      if (res.ok) {
        alert("Homepage settings saved successfully! Check the public website homepage to see changes.");
        clearFetchCache();
        fetchPageSettings();
      } else {
        alert("Failed to save settings. Please try again.");
      }
    } catch (err) {
      console.error("savePageSettings error:", err);
      alert("Error saving settings.");
    } finally {
      setSavingPageSettings(false);
    }
  }

  async function handleSaveBranchServiceHours() {
    if (!selectedBranchForHoursId) return;
    setSavingBranchHours(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({
          id: selectedBranchForHoursId,
          service_hours: serviceHours
        })
      });
      if (res.ok) {
        const updatedBranch = await res.json();
        setBranches(prev => prev.map(b => (b.id === updatedBranch.id || b.id === selectedBranchForHoursId) ? { ...b, ...updatedBranch, service_hours: serviceHours } : b));
        alert("Branch service hours saved successfully!");
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to save branch service hours: ${errJson.error || res.statusText || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("handleSaveBranchServiceHours error:", err);
      alert("Error saving branch service hours.");
    } finally {
      setSavingBranchHours(false);
    }
  }

  const handleMoveSlide = (index: number, dir: "up" | "down") => {
    const newIndex = dir === "up" ? index - 1 : index + 1;
    const slidesList = pageSettingsLangTab === "en" ? homeHeroSlides : homeHeroSlidesAr;
    if (newIndex < 0 || newIndex >= slidesList.length) return;
    
    // Swap in English
    const enList = [...homeHeroSlides];
    const tempEn = enList[index];
    enList[index] = enList[newIndex];
    enList[newIndex] = tempEn;
    setHomeHeroSlides(enList);

    // Swap in Arabic
    const arList = [...homeHeroSlidesAr];
    const tempAr = arList[index];
    arList[index] = arList[newIndex];
    arList[newIndex] = tempAr;
    setHomeHeroSlidesAr(arList);
  };

  const handleAddSlide = () => {
    const newEnSlide = {
      welcome: "Welcome to Revera Clinics",
      heading: "New Slide Title",
      description: "Expert dermatology and cosmetic surgery services designed for you.",
      bookBtn: "Book Appointment",
      rating: "4.5",
      reviewCount: "(1000+ review)",
      image: "/images/hero/slide-1.jpg"
    };
    const newArSlide = {
      welcome: "مرحباً بكم في عيادات ريفيرا",
      heading: "عنوان الشريحة الجديدة",
      description: "خدمات متخصصة في طب الجلدية والجراحة التجميلية مع رعاية شخصية.",
      bookBtn: "احجز موعدًا",
      rating: "4.5",
      reviewCount: "(1000+ تقييم)",
      image: "/images/hero/slide-1.jpg"
    };
    setHomeHeroSlides([...homeHeroSlides, newEnSlide]);
    setHomeHeroSlidesAr([...homeHeroSlidesAr, newArSlide]);
  };

  const handleDeleteSlide = async (index: number) => {
    console.log("handleDeleteSlide called for index:", index);
    console.log("Current English slides count:", homeHeroSlides.length);
    console.log("Current Arabic slides count:", homeHeroSlidesAr.length);
    
    if (await showConfirm("Are you sure you want to delete this slide?")) {
      const newEn = homeHeroSlides.filter((_, i) => i !== index);
      const newAr = homeHeroSlidesAr.filter((_, i) => i !== index);
      
      console.log("New English slides count after delete:", newEn.length);
      console.log("New Arabic slides count after delete:", newAr.length);
      
      setHomeHeroSlides(newEn);
      setHomeHeroSlidesAr(newAr);
      
      // Auto-save changes immediately to keep DB and UI in sync
      savePageSettings({ hero: { slides: newEn, slides_ar: newAr } });
    }
  };

  const handleUpdateField = (index: number, field: string, val: string) => {
    if (pageSettingsLangTab === "en") {
      const enList = [...homeHeroSlides];
      enList[index] = { ...enList[index], [field]: val };
      setHomeHeroSlides(enList);
      // Sync image to Arabic list
      if (field === "image" && homeHeroSlidesAr[index]) {
        const arList = [...homeHeroSlidesAr];
        arList[index] = { ...arList[index], image: val };
        setHomeHeroSlidesAr(arList);
      }
    } else {
      const arList = [...homeHeroSlidesAr];
      arList[index] = { ...arList[index], [field]: val };
      setHomeHeroSlidesAr(arList);
      // Sync image to English list
      if (field === "image" && homeHeroSlides[index]) {
        const enList = [...homeHeroSlides];
        enList[index] = { ...enList[index], image: val };
        setHomeHeroSlides(enList);
      }
    }
  };

  const handleTranslateSlideField = async (index: number, field: string, text: string, from: "en" | "ar", to: "en" | "ar") => {
    if (!text || !text.trim()) return;
    const fieldKey = `slide-${index}-${field}-${from}`;
    setTranslatingField(fieldKey);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ text, from, to }),
      });
      const data = await res.json();
      if (data.translatedText) {
        if (to === "ar") {
          const arList = [...homeHeroSlidesAr];
          if (!arList[index]) arList[index] = {};
          arList[index] = { ...arList[index], [field]: data.translatedText };
          setHomeHeroSlidesAr(arList);
        } else {
          const enList = [...homeHeroSlides];
          if (!enList[index]) enList[index] = {};
          enList[index] = { ...enList[index], [field]: data.translatedText };
          setHomeHeroSlides(enList);
        }
      }
    } catch (err) {
      console.error("Slide translation error:", err);
    } finally {
      setTranslatingField(null);
    }
  };

  const handleTranslateChecklistItem = async (index: number, text: string, from: "en" | "ar", to: "en" | "ar") => {
    if (!text || !text.trim()) return;
    const fieldKey = `whatwedo-${index}-${from}`;
    setTranslatingField(fieldKey);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ text, from, to }),
      });
      const data = await res.json();
      if (data.translatedText) {
        if (to === "ar") {
          const newList = [...whatWeDoListAr];
          newList[index] = data.translatedText;
          setWhatWeDoListAr(newList);
        } else {
          const newList = [...whatWeDoList];
          newList[index] = data.translatedText;
          setWhatWeDoList(newList);
        }
      }
    } catch (err) {
      console.error("Checklist translation error:", err);
    } finally {
      setTranslatingField(null);
    }
  };

  const handleTranslateFaqItem = async (
    index: number,
    field: "question" | "answer",
    text: string,
    from: "en" | "ar",
    to: "en" | "ar"
  ) => {
    if (!text || !text.trim()) return;
    const fieldKey = `faq-${index}-${field}-${from}`;
    setTranslatingField(fieldKey);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ text, from, to }),
      });
      const data = await res.json();
      if (data.translatedText) {
        if (to === "ar") {
          const newList = [...faqsAr];
          if (!newList[index]) newList[index] = { question: "", answer: "" };
          newList[index][field] = data.translatedText;
          setFaqsAr(newList);
        } else {
          const newList = [...faqs];
          if (!newList[index]) newList[index] = { question: "", answer: "" };
          newList[index][field] = data.translatedText;
          setFaqs(newList);
        }
      }
    } catch (err) {
      console.error("FAQ item translation error:", err);
    } finally {
      setTranslatingField(null);
    }
  };

  function fetchRequests(showSpinner = false) {
    if (showSpinner) {
      setLoading(true);
    }
    const branchParam = branch ? `&branchId=${branch}` : "";
    return cachedFetch(`/api/reservations?status=pending${branchParam}`, 2000, authenticatedJsonHeaders)
      .then((data) => {
        if (Array.isArray(data)) {
          setRequests(data);
        } else {
          console.error("fetchRequests: expected array, got", data);
          setRequests([]);
        }
        if (showSpinner) setLoading(false);
      })
      .catch((err) => {
        if (err instanceof TypeError || String(err).includes("Failed to fetch")) {
          console.warn("fetchRequests: Network connection lost (Failed to fetch)");
        } else {
          console.error("fetchRequests error:", err);
        }
        setRequests([]);
        if (showSpinner) setLoading(false);
      });
  }

  function fetchScheduleReservations() {
    const dateStr = [
      scheduleDate.getFullYear(),
      String(scheduleDate.getMonth() + 1).padStart(2, '0'),
      String(scheduleDate.getDate()).padStart(2, '0'),
    ].join('-');
    fetch(`/api/reservations?date=${dateStr}`, { cache: "no-store", headers: authenticatedJsonHeaders })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setScheduleReservations(data);
        else setScheduleReservations([]);
      })
      .catch(() => setScheduleReservations([]));
  }

  // useCallback keyed on [session]: Supabase's session resolves asynchronously, so a plain
  // mount-only effect calling this raced it — if the session wasn't ready yet the fetch bailed
  // out silently and nothing ever retried, leaving the patient list empty for the rest of the
  // session (surfaced as "Select Patient" showing nothing in the Sell Product modal). Giving this
  // a stable identity per session, paired with the effect below that depends on it, means the
  // moment `session` actually resolves, this function's identity changes and the effect re-fires
  // automatically — same pattern already used by fetchInventoryProducts/fetchInventoryDevices.
  const fetchCustomers = useCallback(() => {
    setLoadingCustomers(true);
    fetchCustomerAvatars();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    fetch("/api/customers", { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setDbCustomers(data);
        } else {
          console.error("fetchCustomers: expected array, got", data);
          setDbCustomers([]);
        }
      })
      .catch((err) => {
        console.error("fetchCustomers error:", err);
        setDbCustomers([]);
      })
      .finally(() => {
        setLoadingCustomers(false);
      });
  }, [session]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function handleExportBookingsCSV() {
    if (allReservations.length === 0) {
      alert("No reservations to export.");
      return;
    }
    const headers = ["ID", "Patient Name", "Email", "Phone", "Date", "Time Slot", "Session Type", "Doctor", "Status", "Notes"];
    const rows = allReservations.map(r => [
      r.id,
      r.name,
      r.email,
      r.phone,
      r.date,
      r.timeSlot || r.requestedTime || "",
      r.sessionType || "in_person",
      r.doctorName || "",
      r.status,
      (r.notes || "").replace(/"/g, '""')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reservations_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportCustomersCSV() {
    if (customers.length === 0) {
      alert("No customers available to export.");
      return;
    }

    const headers = [
      "id",
      "Customer Name",
      "Mobile",
      "Gender",
      "Email",
      "Number of Bookings",
      "Registration Date",
      "Active",
      "Spent Amount",
      "Outstanding",
      "Area",
      "Location Name",
      "Street Name",
      "Building No.",
      "Floor No.",
      "Note"
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str}"`;
      }
      return `"${str}"`;
    };

    const rows = customers.map(c => [
      escapeCSV(c.id || ""),
      escapeCSV(c.name || ""),
      escapeCSV(c.mobile || c.phone || ""),
      escapeCSV(c.gender || ""),
      escapeCSV(c.email || ""),
      escapeCSV(c.number_of_bookings !== undefined ? c.number_of_bookings : c.bookings),
      escapeCSV(c.registration_date ? new Date(c.registration_date).toLocaleDateString("en-GB") : (c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "")),
      escapeCSV(c.active !== undefined ? (c.active ? "Yes" : "No") : "Yes"),
      escapeCSV(c.spent_amount !== undefined ? c.spent_amount : c.spent),
      escapeCSV(c.outstanding || 0),
      escapeCSV(c.area || ""),
      escapeCSV(c.location_name || ""),
      escapeCSV(c.street_name || ""),
      escapeCSV(c.building_no || ""),
      escapeCSV(c.floor_no || ""),
      escapeCSV(c.note || "")
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportCustomersModal(false);
  }

  function handleOpenAddCustomer() {
    setSelectedCustomerForEdit(null);
    setShowCustomerFormModal(true);
  }

  function handleOpenEditCustomer(c: Customer) {
    setSelectedCustomerForEdit(c);
    setShowCustomerFormModal(true);
  }

  // CSV Import state and functions
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importLog, setImportLog] = useState<{ name: string; status: "success" | "error"; error?: string }[]>([]);

  const parseCSV = (text: string) => {
    const lines: string[] = [];
    let currentLine = "";
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = "";
        if (char === '\r' && text[i+1] === '\n') {
          i++;
        }
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }
    
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const splitCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let currentVal = "";
      let quoteActive = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          quoteActive = !quoteActive;
        } else if (char === ',' && !quoteActive) {
          result.push(currentVal.trim());
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      result.push(currentVal.trim());
      return result;
    };
    
    const headers = splitCSVLine(lines[0]);
    const headersClean = headers.map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = splitCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headersClean.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      rows.push(row);
    }
    
    return { headers, rows };
  };

  const mapRowToCustomer = (row: Record<string, string>) => {
    const keys = Object.keys(row);
    const getVal = (possibleHeaders: string[]) => {
      const match = keys.find(k => possibleHeaders.includes(k.toLowerCase().replace(/[\s_]+/g, '')));
      return match ? row[match] : "";
    };

    return {
      name: getVal(["name", "fullname", "patientname", "patient"]),
      mobile: getVal(["mobile", "phone", "phonenumber", "mobilephone", "tel"]),
      email: getVal(["email", "emailaddress"]),
      gender: getVal(["gender", "sex"]),
      age: getVal(["age"]),
      national_id: getVal(["nationalid", "national_id", "idcard"]),
      address: getVal(["address", "location"]),
      referral: getVal(["referral", "referralsource"]),
      occupation: getVal(["occupation", "job"]),
      note: getVal(["note", "notes", "comments", "description"])
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) {
        setImportError("The selected CSV file appears to be empty or invalid.");
        return;
      }
      setImportHeaders(headers);
      setImportRows(rows);
      setImportError("");
    };
    reader.onerror = () => {
      setImportError("Error reading the CSV file.");
    };
    reader.readAsText(file);
  };

  const handleStartImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportProgress(0);
    setImportLog([]);
    
    const logs: { name: string; status: "success" | "error"; error?: string }[] = [];
    
    for (let i = 0; i < importRows.length; i++) {
      const rawRow = importRows[i];
      const mapped = mapRowToCustomer(rawRow);
      
      if (!mapped.name || !mapped.mobile) {
        logs.push({
          name: mapped.name || `Row ${i + 1}`,
          status: "error",
          error: "Missing required fields (Name and Mobile are required)."
        });
        setImportLog([...logs]);
        setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
        continue;
      }
      
      try {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: authenticatedJsonHeaders,
          body: JSON.stringify({
            name: mapped.name,
            mobile: mapped.mobile,
            email: mapped.email || null,
            gender: mapped.gender || null,
            age: mapped.age ? Number(mapped.age) : null,
            national_id: mapped.national_id || null,
            address: mapped.address || null,
            referral: mapped.referral || null,
            occupation: mapped.occupation || null,
            note: mapped.note || null,
            active: true
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          logs.push({
            name: mapped.name,
            status: "error",
            error: data.error || "Failed to save to database."
          });
        } else {
          logs.push({
            name: mapped.name,
            status: "success"
          });
        }
      } catch (err: any) {
        logs.push({
          name: mapped.name,
          status: "error",
          error: err.message || "Network error."
        });
      }
      
      setImportLog([...logs]);
      setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
    }
    
    setImportLoading(false);
    fetchCustomers();
  };

  const handleCloseImportModal = () => {
    setShowImportCustomersModal(false);
    setImportFile(null);
    setImportHeaders([]);
    setImportRows([]);
    setImportLoading(false);
    setImportError("");
    setImportProgress(0);
    setImportLog([]);
  };

  function handleDeleteCustomer(id: string) {
    setDeletingCustomer(true);
    fetch(`/api/customers?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token || ""}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete customer");
        }
        return data;
      })
      .then(() => {
        fetchCustomers();
        setDeleteCustomerTarget(null);
        setShowCustomerFormModal(false);
      })
      .catch((err) => {
        console.error("handleDeleteCustomer error:", err);
        alert(err.message || "An error occurred while deleting the customer.");
      })
      .finally(() => {
        setDeletingCustomer(false);
      });
  }

  // Defaults to bypassing the cache. Nearly every caller here runs immediately after a write
  // (approve, reject, cancel, check-in, start/complete session, add product, new booking), and
  // cachedFetch has a 2s TTL with no write-invalidation — so the default of "reuse the cached
  // array" reliably returned a list that predated the change that had just been made, which is
  // why new bookings only appeared after a full page reload. Pass useCache=true only where a
  // slightly stale list is genuinely acceptable.
  function fetchAllReservations(useCache = false) {
    const branchParam = branch ? `?branchId=${branch}` : "";
    const url = `/api/reservations${branchParam}`;
    if (!useCache) clearFetchCache(url);
    return cachedFetch(url, 2000, authenticatedJsonHeaders)
      .then((data) => {
        if (Array.isArray(data)) {
          setAllReservations(data);
        } else {
          console.error("fetchAllReservations: expected array, got", data);
          setAllReservations([]);
        }
      })
      .catch((err) => {
        if (err instanceof TypeError || String(err).includes("Failed to fetch")) {
          console.warn("fetchAllReservations: Network connection lost (Failed to fetch)");
        } else {
          console.error("fetchAllReservations error:", err);
        }
        setAllReservations([]);
      });

    // Automatically keep schedule view reservations in sync if it's active
    if (calendarView === "Schedule") {
      fetchScheduleReservations();
    }
  }

  function getUnavailableSlots(approvedBookings: Req[], targetServiceId: number, end?: string): string[] {
    const svc = localServices.find(s => s.id === targetServiceId);
    const targetDuration = getServiceDurationMinutes(svc);
    const targetSlotsNeeded = Math.ceil(targetDuration / 15);
    
    const occupied = new Array(ALL_15MIN_SLOTS.length).fill(false);
    
    for (const b of approvedBookings) {
      if (b.timeSlot) {
        const norm = normaliseTo24hSlot(b.timeSlot);
        if (norm) {
          const idx = ALL_15MIN_SLOTS.indexOf(norm);
          if (idx >= 0) {
            for (let k = 0; k < targetSlotsNeeded; k++) {
              if (idx + k < occupied.length) {
                occupied[idx + k] = true;
              }
            }
          }
        }
      }
    }
    
    const unavailable: string[] = [];
    for (let i = 0; i < ALL_15MIN_SLOTS.length; i++) {
      let fit = true;
      for (let k = 0; k < targetSlotsNeeded; k++) {
        const slotIdx = i + k;
        if (slotIdx >= occupied.length || occupied[slotIdx]) {
          fit = false;
          break;
        }
        if (end && ALL_15MIN_SLOTS[slotIdx] >= end) {
          fit = false;
          break;
        }
      }
      if (!fit) {
        unavailable.push(ALL_15MIN_SLOTS[i]);
      }
    }
    return unavailable;
  }

  // Shared by the initial open and by changing the date inside the approve modal — recomputes
  // which time slots are actually pickable for whichever date is currently selected there.
  // Returns the freshly-computed availability rather than relying on the state it sets —
  // setApproveUnavailableSlots() does not update the caller's closure within the same tick, so a
  // caller that read the state variable straight after awaiting this would see the *previous*
  // booking's list (or [] on first open) and make its decision on stale data.
  async function refreshApproveAvailability(r: Req, dateStr: string) {
    const branchParam = r.branchId ? `&branchId=${r.branchId}` : "";
    const data = await fetch(`/api/availability?date=${dateStr}&serviceId=${r.serviceId}${branchParam}`).then((res) => res.json());
    const { start, end } = getDayOperatingHoursApprove({ ...r, date: dateStr });
    const unavailable = data && Array.isArray(data.unavailableSlots) ? data.unavailableSlots : [];
    setApproveUnavailableSlots(unavailable);
    const filteredSlots = SLOTS.filter((s) => {
      const norm = normaliseTo24hSlot(s) ?? "";
      return norm >= start && norm < end;
    });
    const first = filteredSlots.find((s) => !unavailable.includes(s)) || filteredSlots[0] || SLOTS[0];
    setSlot(first);
    return { unavailable, start, end };
  }

  async function openApprove(r: Req) {
    setLoadingApproveId(r.id);
    try {
      setApproveDate(r.date);
      setApproveTimeWarning("");
      const { unavailable, start, end } = await refreshApproveAvailability(r, r.date);

      // Always show the time the patient actually asked for. If it is not bookable, select it
      // anyway and warn — silently substituting the first free slot (09:00) is how approvals were
      // being confirmed at a time nobody requested.
      const requestedSlot = r.requestedTime || r.timeSlot || "";
      if (requestedSlot) {
        const norm = normaliseTo24hSlot(requestedSlot) ?? "";
        const outsideHours = !(norm >= start && norm < end);
        const taken = unavailable.includes(requestedSlot);
        setSlot(requestedSlot);
        if (taken) {
          setApproveTimeWarning(`Requested time ${requestedSlot} is already taken — pick another slot.`);
        } else if (outsideHours) {
          setApproveTimeWarning(`Requested time ${requestedSlot} is outside opening hours — pick another slot.`);
        }
      }

      // Pre-select the doctor the patient originally requested, if any.
      if (r.doctorName) {
        setDoctorName(r.doctorName);
      }

      setSelected(r);
    } catch (err) {
      console.error("openApprove error:", err);
    } finally {
      setLoadingApproveId(null);
    }
  }

  // Staff picking a different date than originally requested (e.g. the requested day turned out
  // to be a closed day, or is already fully booked) — re-derives available slots for that date
  // instead of forcing staff to reject the request just to change the date.
  async function handleApproveDateChange(newDateStr: string) {
    setApproveDate(newDateStr);
    // Staff deliberately moved off the requested date — the requested-time warning no longer
    // applies, and refreshApproveAvailability picks a fresh slot for the new date.
    setApproveTimeWarning("");
    if (!selected) return;
    await refreshApproveAvailability(selected, newDateStr);
  }

  async function approve() {
    if (!selected) return;
    const res = await fetch(
      "/api/reservations?id=" + encodeURIComponent(selected.id),
      {
        method: "PATCH",
        body: JSON.stringify({ action: "approve", timeSlot: slot, doctorName, date: approveDate || selected.date }),
        headers: authenticatedJsonHeaders,
      }
    );
    const json = await res.json();
    if (!res.ok) alert(json.error || "Failed");
    setSelected(null);
    clearFetchCache();
    fetchRequests();
    fetchAllReservations();
  }

  function selectExistingPatientForBooking(customer: any) {
    setNewPatientName(customer.name || "");
    setNewPatientEmail(customer.email || "");
    setNewPatientPhone(customer.mobile || customer.phone || "");
    setMatchedCustomerId(customer.id || null);
    setPatientSearchQuery("");
    setShowPatientSearchResults(false);
  }

  async function handleManualPhoneChange(val: string) {
    setNewPatientPhone(val);
    setMatchedCustomerId(null);

    // Clean and validate Egyptian mobile number
    let cleaned = val.replace(/[^\d]/g, "");
    if (cleaned.startsWith("201") && cleaned.length === 12) {
      cleaned = "0" + cleaned.slice(2);
    } else if (cleaned.startsWith("1") && cleaned.length === 10) {
      cleaned = "0" + cleaned;
    }

    if (/^01[0-9]{9}$/.test(cleaned)) {
      try {
        const res = await fetch(`/api/customers?mobile=${cleaned}`, {
          headers: { Authorization: `Bearer ${session?.access_token || ""}` }
        });
        if (res.ok) {
          const customer = await res.json();
          if (customer) {
            if (customer.name) setNewPatientName(customer.name);
            if (customer.email) setNewPatientEmail(customer.email);
            if (customer.id) setMatchedCustomerId(customer.id);
          }
        }
      } catch (err) {
        console.error("Error fetching customer by phone:", err);
      }
    }
  }

  async function handleCreateManualBooking() {
    if (!newPatientName || !newPatientEmail || !newPatientPhone || !newPatientDate) {
      alert("Please fill in all required fields (Name, Email, Phone, Date).");
      return;
    }

    // Validate Egyptian mobile number format
    const cleanedMobile = newPatientPhone.trim();
    if (!/^01[0125]\d{8}$/.test(cleanedMobile)) {
      alert("Please enter a valid Egyptian mobile number (must be 11 digits and start with 010, 011, 012, or 015).");
      return;
    }
    if (!isManualWhatsappSame) {
      const cleanedWA = newPatientWhatsapp.trim();
      if (!/^01[0125]\d{8}$/.test(cleanedWA)) {
        alert("Please enter a valid Egyptian mobile number for WhatsApp (must be 11 digits and start with 010, 011, 012, or 015).");
        return;
      }
    }

    const finalNotes = isManualWhatsappSame 
      ? newPatientNotes 
      : `${newPatientNotes ? newPatientNotes + "\n" : ""}[WhatsApp: ${newPatientWhatsapp}]`;

    const payload = {
      serviceId: Number(newPatientService),
      date: newPatientDate,
      requestedTime: newPatientTimeSlot,
      name: newPatientName,
      email: newPatientEmail,
      phone: newPatientPhone,
      // When staff explicitly picked an existing patient (search picker or a resolved phone
      // match), link the reservation to that exact customer id directly — bypasses the
      // phone-string-matching path entirely, so a typo/formatting difference in the phone field
      // can never fork off a duplicate customer for a patient staff already identified.
      customerId: matchedCustomerId || undefined,
      notes: finalNotes,
      sessionType: newPatientSessionType,
      status: newPatientStatus,
      timeSlot: newPatientStatus === 'approved' ? newPatientTimeSlot : null,
      doctorName: newPatientStatus === 'approved' ? newPatientDoctor : null,
      branchId: newPatientBranch || null,
      isManual: true,
      createdByEmployeeId: newPatientCreatedByEmployeeId || adminDbId || null,
    };

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created = await res.json();
      
      if (newPatientStatus === 'approved') {
        await fetch(`/api/reservations?id=${created.id}`, {
          method: "PATCH",
          headers: authenticatedJsonHeaders,
          body: JSON.stringify({
            action: "approve",
            timeSlot: newPatientTimeSlot,
            doctorName: newPatientDoctor,
          }),
        });
      } else if (newPatientStatus === 'rejected') {
        await fetch(`/api/reservations?id=${created.id}`, {
          method: "PATCH",
          headers: authenticatedJsonHeaders,
          body: JSON.stringify({
            action: "reject",
          }),
        });
      }

      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
      setMatchedCustomerId(null);
      setPatientSearchQuery("");
      setShowPatientSearchResults(false);
      setNewPatientDate("");
      setNewPatientTimeSlot("12:00");
      setNewPatientService(1);
      setNewPatientSessionType("in_person");
      setNewPatientDoctor("Dr. Sara El Gamel");
      setNewPatientNotes("");
      setNewPatientStatus("approved");
      setIsManualWhatsappSame(true);
      setNewPatientWhatsapp("");
      setNewPatientCreatedByEmployeeId(adminDbId || "");

      setShowAddBookingModal(false);
      clearFetchCache();
      fetchRequests();
      fetchAllReservations();
      alert("Manual booking created successfully!");
    } else {
      alert("Failed to create manual booking.");
    }
  }

  async function saveNotes(newNotes: string) {
    if (!viewingBooking) return;
    const res = await fetch(
      "/api/reservations?id=" + encodeURIComponent(viewingBooking.id),
      {
        method: "PATCH",
        body: JSON.stringify({ receptionNotes: newNotes }),
        headers: authenticatedJsonHeaders,
      }
    );
    if (!res.ok) {
      const json = await res.json();
      alert(json.error || "Failed to save notes");
    }
    fetchRequests();
    fetchAllReservations();
  }

  function handlePrintInvoice(booking: any, servicesList: any[], totalCost: number, walletUsed: number, branchName: string) {
    printInvoice(booking, servicesList, totalCost, walletUsed, branchName);
  }

  const calendarDays = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

  if (authChecking) {
    return (
      <div id="admin-root" className="admin-view flex min-h-screen items-center justify-center bg-[#F2EFE9] text-[#414E36]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-[#C4AE7C] border-t-transparent"></div>
          <p className="text-sm font-semibold tracking-wider">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  if (!session || !adminRole) {
    return (
      <div id="admin-root" className="admin-view flex min-h-screen items-center justify-center bg-[#F2EFE9] px-4">
        <div className="w-full max-w-md rounded-[32px] bg-[#FBFBF9] p-8 shadow-[0_20px_60px_rgba(31,37,26,0.15)]">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 relative h-16 w-16 overflow-hidden rounded-2xl bg-[#414E36] p-2.5 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/main_logo.png"
                alt="Revera Clinics"
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
              />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#5A6A51]/80 font-bold mb-1">Revera Clinics</p>
            <h2 className="text-2xl font-bold text-[#1F251A]">Admin Access Control</h2>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Email Address or Employee ID</label>
              <input
                type="text"
                required
                placeholder="Enter email or employee ID"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  if (loginError) setLoginError("");
                }}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Password</label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (loginError) setLoginError("");
                }}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl p-3">
                ⚠️ {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-2xl bg-[#414E36] py-3.5 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginLoading ? "Authenticating..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }
  const uniqueSpecialties = Array.from(new Set(providers.map((p) => p.specialty).filter(Boolean)));
  const filteredProviders = providers.filter((p) => {
    if (providerFilterBranchId !== "All" && p.branchId !== providerFilterBranchId) return false;
    if (providerFilterSpecialty !== "All" && p.specialty !== providerFilterSpecialty) return false;
    if (providerFilterGender !== "All" && p.gender !== providerFilterGender) return false;
    if (providerSearchQuery.trim()) {
      const q = providerSearchQuery.toLowerCase();
      const nameMatch = p.name?.toLowerCase().includes(q);
      const specMatch = p.specialty?.toLowerCase().includes(q);
      const phoneMatch = p.phone?.toLowerCase().includes(q);
      if (!nameMatch && !specMatch && !phoneMatch) return false;
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  function handleMarkAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }
  function handleMarkAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  const loggedEmpAccount = employeesList.find(
    (e) => e.id === adminDbId || e.email?.toLowerCase() === adminEmail.toLowerCase()
  );

  const isDoctorUserAccount =
    adminRole?.toLowerCase() === "doctor" ||
    adminRole?.toLowerCase() === "doctors" ||
    adminDepartment?.toLowerCase() === "doctors" ||
    adminDepartment?.toLowerCase() === "doctor" ||
    loggedEmpAccount?.department?.toLowerCase() === "doctors" ||
    loggedEmpAccount?.department?.toLowerCase() === "doctor" ||
    loggedEmpAccount?.role_name?.toLowerCase() === "doctor" ||
    loggedEmpAccount?.role_name?.toLowerCase() === "doctors";

  if (isDoctorUserAccount && !forceAdminView) {
    return (
      <div id="admin-root" className="admin-view flex-1 min-h-screen">
        <DoctorAccountView
          doctorDbId={loggedEmpAccount?.id || adminDbId}
          doctorName={loggedEmpAccount?.name || adminEmail || "Doctor"}
          doctorEmail={adminEmail}
          doctorBranch={
            branches.find((b) => b.id === loggedEmpAccount?.branch_id)?.name_en ||
            loggedEmpAccount?.branch_id ||
            "Main Branch"
          }
          branches={branches}
          initialReservations={allReservations}
          onLogout={handleLogout}
          onSwitchToAdmin={(adminRole === "superadmin" || adminRole === "admin") ? () => setForceAdminView(true) : undefined}
        />
      </div>
    );
  }

  return (
    <div id="admin-root" className="admin-view min-h-screen bg-[#F2EFE9] text-[#1F251A]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_1fr]" dir={lang === "ar" ? "rtl" : "ltr"}>
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside dir={lang === "ar" ? "rtl" : "ltr"} className={`fixed inset-y-0 start-0 z-50 flex w-[220px] h-screen flex-col bg-[#414E36] px-3.5 py-5 text-[#FBFBF9] shadow-[0_0_70px_rgba(0,0,0,0.08)] transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : (lang === "ar" ? "translate-x-full" : "-translate-x-full")
        }`}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-md p-1.5">
                <Image
                  src="/images/main_logo.png"
                  alt="Revera Clinics"
                  fill
                  style={{ objectFit: "contain", padding: "2px" }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#FBFBF9]/60 leading-none mb-0.5">
                  Revera Clinics
                </p>
                <h1 className="text-base font-bold leading-tight">Admin</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10 text-[#FBFBF9]/80 hover:text-[#FBFBF9] transition text-lg font-bold"
              title="Close sidebar"
            >
              ×
            </button>
          </div>

          {/* Global Language Toggle Switcher */}
          <div className="flex items-center rounded-xl bg-black/20 p-1 border border-white/10 shadow-inner w-full mb-6">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center ${
                lang === "en"
                  ? "bg-[#FBFBF9] text-[#414E36] shadow-sm"
                  : "text-[#FBFBF9]/70 hover:text-white hover:bg-white/10"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center ${
                lang === "ar"
                  ? "bg-[#FBFBF9] text-[#414E36] shadow-sm"
                  : "text-[#FBFBF9]/70 hover:text-white hover:bg-white/10"
              }`}
            >
              العربية
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pe-0.5">
            {permittedSidebarItems.map((item) => {
              if (item.label === "Settings") {
                const Icon = item.icon;
                const active = [
                  "Profile",
                  "Service Hours",
                  "Branches",
                  "Users",
                  "Booking Settings",
                  "Terms & Conditions",
                  "Notification Settings",
                  "Queue Settings",
                  "Pages Settings",
                  "Role Management",
                  "Deposit Settings",
                  "Inactivity Settings"
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsExpanded(!settingsExpanded);
                      }}
                      className={`group flex w-full items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-start text-xs font-semibold transition-all duration-200 ${
                        active
                          ? "bg-[#FBFBF9] text-[#414E36] shadow-lg"
                          : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            active ? "bg-[#C4AE7C]/20 text-[#414E36]" : "bg-[#FBFBF9]/10 text-[#FBFBF9] group-hover:bg-[#C4AE7C]/15"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="truncate">{adminTranslations[lang].sidebar[item.label] || item.label}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-current transition-transform duration-200 ${
                          settingsExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {settingsExpanded && (
                      <div className="mt-1 space-y-0.5 overflow-hidden rounded-xl bg-black/15 py-1 ps-2 pe-1">
                        {[
                          { label: "Clinic Profile", icon: Store, perm: "settings.profile" },
                          { label: "Service Hours", icon: Clock, perm: "settings.service_hours" },
                          { label: "Branches", icon: MapIcon, perm: "settings.branches" },
                          { label: "Rooms", icon: DoorOpen, perm: "settings.rooms" },
                          { label: "Booking Settings", icon: CalendarDays, perm: "settings.booking_settings" },
                          { label: "Terms & Conditions", icon: FileText, perm: "settings.terms" },
                          { label: "Deposit Settings", icon: CreditCard, perm: "settings.booking_settings" },
                          { label: "Inactivity Settings", icon: Hourglass, perm: "settings.booking_settings" },
                          { label: "Notification Settings", icon: Bell, perm: "settings.notification" },
                          { label: "Queue Settings", icon: ListOrdered, perm: "settings.queue" },
                          { label: "Pages Settings", icon: FileText, perm: "settings.pages" },
                          { label: "Medical Records", icon: ClipboardList, perm: "settings.medical_records" },
                          { label: "Role Management", icon: Shield, perm: "settings.roles" },
                          { label: "System Test Suite", icon: FlaskConical, perm: "settings.test_suite" }
                        ].filter(sub => {
                          // RISK-066: System Test Suite can fetch and display other patients'/
                          // staff's raw PII across every endpoint — superadmin only, no
                          // grantable-permission path, unlike every other Settings item.
                          if (sub.label === "System Test Suite") return adminRole === 'superadmin';
                          if (!sub.perm) return true;
                          if (adminRole === 'superadmin') return true;
                          return hasPermission(sub.perm);
                        }).map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = activeNav === sub.label;
                          return (
                            <button
                              key={sub.label}
                              type="button"
                              onClick={() => setActiveNav(sub.label)}
                              className={`group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[11px] font-medium transition-all duration-200 ${
                                subActive
                                  ? "bg-[#FBFBF9]/10 text-[#FBFBF9] border-s-[3px] border-[#C4AE7C] ps-2 rounded-s-none"
                                  : "text-[#FBFBF9]/70 hover:bg-[#FBFBF9]/5 hover:text-[#FBFBF9]"
                              }`}
                            >
                              <SubIcon size={13} className={subActive ? "text-[#C4AE7C]" : "text-[#FBFBF9]/60"} />
                              <span className="truncate">{adminTranslations[lang].sidebar[sub.label] || sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.label === "Marketing") {
                const Icon = item.icon;
                const active = ["Marketing", "Promotions", "Packages"].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMarketingExpanded(!marketingExpanded);
                        setActiveNav("Promotions");
                      }}
                      className={`group flex w-full items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-start text-xs font-semibold transition-all duration-200 ${
                        active
                          ? "bg-[#FBFBF9] text-[#414E36] shadow-lg"
                          : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            active ? "bg-[#C4AE7C]/20 text-[#414E36]" : "bg-[#FBFBF9]/10 text-[#FBFBF9] group-hover:bg-[#C4AE7C]/15"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="truncate">{adminTranslations[lang].sidebar[item.label] || item.label}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-current transition-transform duration-200 ${
                          marketingExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {marketingExpanded && (
                      <div className="mt-1 space-y-0.5 overflow-hidden rounded-xl bg-black/15 py-1 ps-2 pe-1">
                        {[
                          { label: "Promotions", icon: Tag, perm: null },
                          { label: "Packages", icon: Package, perm: null },
                        ].map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = activeNav === sub.label;
                          return (
                            <button
                              key={sub.label}
                              type="button"
                              onClick={() => setActiveNav(sub.label)}
                              className={`group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[11px] font-medium transition-all duration-200 ${
                                subActive
                                  ? "bg-[#FBFBF9]/10 text-[#FBFBF9] border-s-[3px] border-[#C4AE7C] ps-2 rounded-s-none"
                                  : "text-[#FBFBF9]/70 hover:bg-[#FBFBF9]/5 hover:text-[#FBFBF9]"
                              }`}
                            >
                              <SubIcon size={13} className={subActive ? "text-[#C4AE7C]" : "text-[#FBFBF9]/60"} />
                              <span className="truncate">{adminTranslations[lang].sidebar[sub.label] || sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const Icon = item.icon;
              const active = activeNav === item.label;
              const isComingSoon = Boolean((item as any).comingSoon);
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={isComingSoon}
                  aria-disabled={isComingSoon}
                  title={isComingSoon ? (adminTranslations[lang].sidebar.comingSoon || "Coming Soon") : undefined}
                  onClick={async () => {
                    if (isComingSoon) return;
                    if (item.label === "Logout") {
                      if (supabase) {
                        await triggerCheckout();
                        await supabase.auth.signOut();
                      }
                    } else {
                      setActiveNav(item.label);
                    }
                  }}
                  className={`group flex w-full items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-start text-xs font-semibold transition-all duration-200 ${
                    isComingSoon
                      ? "cursor-not-allowed opacity-50 text-[#FBFBF9]/50"
                      : active
                      ? "bg-[#FBFBF9] text-[#414E36] shadow-lg"
                      : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isComingSoon
                          ? "bg-[#FBFBF9]/5 text-[#FBFBF9]/40"
                          : active
                          ? "bg-[#C4AE7C]/20 text-[#414E36]"
                          : "bg-[#FBFBF9]/10 text-[#FBFBF9] group-hover:bg-[#C4AE7C]/15"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="truncate">{adminTranslations[lang].sidebar[item.label] || item.label}</span>
                  </div>
                  {isComingSoon || item.submenu ? (
                    <ChevronRight size={14} className="text-[#FBFBF9]/60" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <main dir="ltr" className="flex flex-col px-4 md:px-8 py-0 min-w-0">
          {/* Top Navigation Bar */}
          <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#414E36]/10 bg-[#F2EFE9]/90 px-2 py-3 backdrop-blur-md gap-3">
            {/* Left: language toggle + branch selector */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#414E36]/15 text-[#414E36] hover:bg-[#F9F9F7] shadow-sm transition"
                title="Open sidebar"
              >
                <Menu size={18} />
              </button>
              {adminRole === "superadmin" || adminRole === "admin" ? (
                <div className="relative">
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="appearance-none rounded-xl border border-[#414E36]/15 bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#1F251A] shadow-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name_en}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                </div>
              ) : (
                <div className="rounded-xl border border-[#414E36]/15 bg-white py-2 px-4 text-sm font-semibold text-[#1F251A] shadow-sm select-none">
                  {branches.find((b) => b.id === branch)?.name_en || "Loading assigned branch..."}
                </div>
              )}

              {/* Profile Button beside Branch Dropdown */}
              <button
                type="button"
                onClick={() => setActiveNav("Profile")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm border ${
                  activeNav === "Profile"
                    ? "bg-[#414E36] text-white border-[#414E36]"
                    : "bg-white text-[#414E36] border-[#414E36]/15 hover:bg-[#414E36]/10"
                }`}
                title="View Personal Profile & Staff Details"
              >
                <User size={14} />
                <span>Profile</span>
              </button>
            </div>

            {/* Right: new entry, notifications, user profile */}
            <div className="flex items-center gap-3">
              {/* Quick Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQuickActionMenu(prev => {
                      const nextState = !prev;
                      if (nextState) {
                        window.dispatchEvent(new CustomEvent("close-admin-dropdowns", { detail: "quickAction" }));
                      }
                      return nextState;
                    });
                    setShowNotificationMenu(false);
                  }}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#FBFBF9] shadow-sm transition ${
                    showQuickActionMenu ? "bg-[#2e3a26]" : "bg-[#414E36] hover:bg-[#2e3a26]"
                  }`}
                  title="Quick Actions"
                >
                  <Plus size={18} className={`transition-transform duration-200 ${showQuickActionMenu ? "rotate-45" : ""}`} />
                </button>
                {showQuickActionMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E6E9EB] bg-white p-2 shadow-[0_15px_40px_rgba(47,61,41,0.12)] z-50 animate-fadeIn">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] border-b border-[#E6E9EB] mb-1">
                      Quick Creation
                    </div>
                    {hasPermission("bookings.create") && (
                      <button
                        onClick={() => {
                          setShowQuickActionMenu(false);
                          setShowAddBookingModal(true);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#414E36] hover:bg-[#EDF1EC] flex items-center gap-2 transition"
                      >
                        <Plus size={14} className="text-[#C4AE7C]" /> New Appointment
                      </button>
                    )}
                    {hasPermission("customers.create") && (
                      <button
                        onClick={() => {
                          setShowQuickActionMenu(false);
                          handleOpenAddCustomer();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#414E36] hover:bg-[#EDF1EC] flex items-center gap-2 transition"
                      >
                        <Plus size={14} className="text-[#C4AE7C]" /> New Patient
                      </button>
                    )}
                    {hasPermission("providers.create") && (
                      <button
                        onClick={() => {
                          setShowQuickActionMenu(false);
                          openAddProviderModal();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#414E36] hover:bg-[#EDF1EC] flex items-center gap-2 transition"
                      >
                        <Plus size={14} className="text-[#C4AE7C]" /> New Doctor / Provider
                      </button>
                    )}
                    {hasPermission("services.create") && (
                      <button
                        onClick={() => {
                          setShowQuickActionMenu(false);
                          setShowAddCategoryModal(true);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#414E36] hover:bg-[#EDF1EC] flex items-center gap-2 transition"
                      >
                        <Plus size={14} className="text-[#C4AE7C]" /> New Service Category
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotificationMenu(prev => {
                      const nextState = !prev;
                      if (nextState) {
                        window.dispatchEvent(new CustomEvent("close-admin-dropdowns", { detail: "notifications" }));
                      }
                      return nextState;
                    });
                    setShowQuickActionMenu(false);
                  }}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    showNotificationMenu || unreadCount > 0
                      ? "bg-[#C4AE7C]/20 text-[#414E36]"
                      : "bg-[#414E36]/8 text-[#414E36] hover:bg-[#414E36]/15"
                  }`}
                  title="Notifications"
                >
                  <Bell size={18} />
                </button>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white pointer-events-none animate-pulse">
                    {unreadCount}
                  </span>
                )}
                {showNotificationMenu && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E6E9EB] bg-white shadow-[0_15px_40px_rgba(47,61,41,0.12)] z-50 animate-fadeIn overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#E6E9EB] bg-[#FBFBF9] px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1F251A]">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] font-semibold text-[#C4AE7C] hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E6E9EB]">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400 italic">No notifications yet.</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`p-3 text-left transition hover:bg-[#EDF1EC]/40 cursor-pointer ${
                              !n.read ? "bg-[#EDE4C8]/10" : ""
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                                n.type === "cancelled"
                                  ? "bg-red-500"
                                  : n.type === "low_stock"
                                    ? "bg-orange-500"
                                    : n.type === "system"
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-xs text-[#1F251A]">{n.title}</span>
                                  <span className="text-[10px] text-[#5A6A51] whitespace-nowrap">{n.time}</span>
                                </div>
                                <p className="text-[11px] text-[#414E36] leading-relaxed mt-0.5">{n.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-[#E6E9EB] bg-[#FBFBF9] px-4 py-2.5 text-center">
                      <button
                        onClick={() => {
                          setShowNotificationMenu(false);
                          setActiveNav("Bookings");
                        }}
                        className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26]"
                      >
                        View all bookings
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Removed Revera Clinics button */}
            </div>
          </div>

          <div className="py-8">
            {/* Active Missing Employee Alerts Banner */}
            {(adminRole === "superadmin" || adminRole === "admin" || adminRole === "HR") && activeMissingAlerts.length > 0 && (
              <div className="mb-6 space-y-3">
                {activeMissingAlerts.map((alertItem: any) => (
                  <div
                    key={alertItem.id}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800 shadow-sm animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">⚠️</span>
                      <p className="text-sm font-semibold">
                        Alert: Employee <strong>{alertItem.employee_accounts?.name}</strong> ({alertItem.employee_accounts?.role_name}) went missing at {new Date(alertItem.timestamp).toLocaleTimeString()}!
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/hr/alerts', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({ id: alertItem.id, resolved: true })
                          });
                          if (res.ok) {
                            fetchHrAlerts();
                          }
                        } catch (err) {
                          console.error("Failed to resolve alert:", err);
                        }
                      }}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      Dismiss Alert
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!hasAccessToActiveNav ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4 bg-white rounded-[40px] shadow-[0_30px_80px_rgba(47,61,41,0.07)] p-8">
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-bold text-[#1F251A]">Access Restrained</h3>
                <p className="text-sm text-[#5A6A51] max-w-md leading-relaxed">
                  Your administrator account role does not have authorization to view the <strong>"{activeNav}"</strong> module. Please contact the super admin to request access privileges.
                </p>
              </div>
            ) : (
              <>

          {/* ── PROVIDERS VIEW ── */}
          {activeNav === "Doctors" && (
            <AdminDoctorsView
              providerForm={providerForm}
              branches={branches}
              allReservations={allReservations}
              localServices={localServices}
              allServicesList={allServicesList}
              getDoctorFirstReservationDate={getDoctorFirstReservationDate}
              parseEgyptianNationalId={parseEgyptianNationalId}
              uniqueSpecialties={uniqueSpecialties}
              filteredProviders={filteredProviders}
              expandedDoctorServices={expandedDoctorServices}
              toggleExpandedDoctorServices={toggleExpandedDoctorServices}
              activeDoctorRowMenuId={activeDoctorRowMenuId}
              setActiveDoctorRowMenuId={setActiveDoctorRowMenuId}
              showAuditLogsModal={showAuditLogsModal}
              setShowAuditLogsModal={setShowAuditLogsModal}
              hasPermission={hasPermission}
              lang={lang}
              t={adminTranslations[lang].doctors.adminDoctorsView}
              tFormFields={adminTranslations[lang].doctors.providerFormFields}
            />
          )}

          {/* ── SERVICES VIEW ── */}
          {activeNav === "Services" && (
            <AdminServicesView
              localServices={localServices}
              setLocalServices={setLocalServices}
              localCategories={localCategories}
              setLocalCategories={setLocalCategories}
              expandedCategories={expandedCategories}
              setExpandedCategories={setExpandedCategories}
              showAddCategoryModal={showAddCategoryModal}
              setShowAddCategoryModal={setShowAddCategoryModal}
              showAddServiceModal={showAddServiceModal}
              setShowAddServiceModal={setShowAddServiceModal}
              addServiceTargetCategory={addServiceTargetCategory}
              setAddServiceTargetCategory={setAddServiceTargetCategory}
              newCategoryNameEn={newCategoryNameEn}
              setNewCategoryNameEn={setNewCategoryNameEn}
              newCategoryNameAr={newCategoryNameAr}
              setNewCategoryNameAr={setNewCategoryNameAr}
              newServiceNameEn={newServiceNameEn}
              setNewServiceNameEn={setNewServiceNameEn}
              newServiceNameAr={newServiceNameAr}
              setNewServiceNameAr={setNewServiceNameAr}
              newServicePrice={newServicePrice}
              setNewServicePrice={setNewServicePrice}
              deleteCategoryTarget={deleteCategoryTarget}
              setDeleteCategoryTarget={setDeleteCategoryTarget}
              editingService={editingService}
              setEditingService={setEditingService}
              deleteServiceTarget={deleteServiceTarget}
              setDeleteServiceTarget={setDeleteServiceTarget}
              serviceNameEn={serviceNameEn}
              setServiceNameEn={setServiceNameEn}
              serviceNameAr={serviceNameAr}
              setServiceNameAr={setServiceNameAr}
              serviceCategory={serviceCategory}
              setServiceCategory={setServiceCategory}
              serviceDuration={serviceDuration}
              setServiceDuration={setServiceDuration}
              serviceDurationMinutes={serviceDurationMinutes}
              setServiceDurationMinutes={setServiceDurationMinutes}
              serviceUnitType={serviceUnitType}
              setServiceUnitType={setServiceUnitType}
              serviceDescEn={serviceDescEn}
              setServiceDescEn={setServiceDescEn}
              serviceDescAr={serviceDescAr}
              setServiceDescAr={setServiceDescAr}
              serviceSortOrder={serviceSortOrder}
              setServiceSortOrder={setServiceSortOrder}
              serviceIsShared={serviceIsShared}
              setServiceIsShared={setServiceIsShared}
              serviceEnableReminder={serviceEnableReminder}
              setServiceEnableReminder={setServiceEnableReminder}
              serviceImageUrl={serviceImageUrl}
              setServiceImageUrl={setServiceImageUrl}
              servicePrice={servicePrice}
              setServicePrice={setServicePrice}
              serviceBranchPricing={serviceBranchPricing}
              setServiceBranchPricing={setServiceBranchPricing}
              draggedServiceId={draggedServiceId}
              setDraggedServiceId={setDraggedServiceId}
              dragOverServiceId={dragOverServiceId}
              setDragOverServiceId={setDragOverServiceId}
              rowDraggable={rowDraggable}
              setRowDraggable={setRowDraggable}
              draggedCatKey={draggedCatKey}
              setDraggedCatKey={setDraggedCatKey}
              dragOverCatKey={dragOverCatKey}
              setDragOverCatKey={setDragOverCatKey}
              catDraggable={catDraggable}
              setCatDraggable={setCatDraggable}
              serviceSearch={serviceSearch}
              setServiceSearch={setServiceSearch}
              serviceSortBy={serviceSortBy}
              setServiceSortBy={setServiceSortBy}
              showServiceFilterPanel={showServiceFilterPanel}
              setShowServiceFilterPanel={setShowServiceFilterPanel}
              serviceFilterStatus={serviceFilterStatus}
              setServiceFilterStatus={setServiceFilterStatus}
              serviceToggles={serviceToggles}
              setServiceToggles={setServiceToggles}
              activeServiceRowMenuId={activeServiceRowMenuId}
              setActiveServiceRowMenuId={setActiveServiceRowMenuId}
              filteredServices={filteredServices}
              groupedServices={groupedServices}
              handleEditService={handleEditService}
              handleReorderServices={handleReorderServices}
              handleReorderCategories={handleReorderCategories}
              toggleCategoryExpand={toggleCategoryExpand}
              removeCategory={removeCategory}
              toggleService={toggleService}
              syncServicesToApi={syncServicesToApi}
              loadServicesFromApi={loadServicesFromApi}
              deleteServiceFromApi={deleteServiceFromApi}
              authenticatedJsonHeaders={authenticatedJsonHeaders}
              hasPermission={hasPermission}
              lang={lang}
              t={adminTranslations[lang].services}
            />
          )}

          {/* ── MARKETING / PROMOTIONS VIEW ── */}
          {(activeNav === "Marketing" || activeNav === "Promotions") && (
            <PromotionsAdminPanel
              localServices={localServices}
              setLocalServices={setLocalServices}
              branches={branches}
              syncServicesToApi={syncServicesToApi}
            />
          )}

          {/* ── PACKAGES VIEW ── */}
          {activeNav === "Packages" && (
            <PackageAdminPanel session={session} />
          )}

          {/* ── CUSTOMER SUPPORT VIEW ── */}
          {activeNav === "Customer Support" && (
            <CustomerSupportView
              lang={lang}
              hasPermission={hasPermission}
            />
          )}

          {/* ── REPORTS & ANALYTICS VIEW ── */}
          {activeNav === "Reports" && (
            <ReportsAnalyticsView
              lang={lang}
              hasPermission={hasPermission}
              allReservations={allReservations}
              providers={providers}
              localServices={localServices}
              branches={branches}
            />
          )}

          {/* ── TRANSACTIONS VIEW ── */}
          {activeNav === "Transactions" && (
            transactionsSubView === "new" ? (
              <NewManualTransactionView
                onBack={() => {
                  setTransactionsSubView("list");
                  setTransactionPreSelectedPatient(null);
                }}
                onSuccess={() => {
                  setTransactionsSubView("list");
                  setTransactionPreSelectedPatient(null);
                }}
                preSelectedCustomerId={transactionPreSelectedPatient?.id}
                preSelectedCustomerName={transactionPreSelectedPatient?.name}
                staffName={loggedEmpAccount?.name || adminEmail.split("@")[0] || "Staff User"}
                branches={branches}
                onAddNewPatient={() => {
                  setActiveNav("Patients");
                  setShowCustomerFormModal(true);
                }}
                lang={lang}
              />
            ) : (
              <TransactionsView
                onNewTransaction={() => {
                  setTransactionsSubView("new");
                  setTransactionPreSelectedPatient(null);
                }}
                staffName={loggedEmpAccount?.name || adminEmail.split("@")[0] || "Staff User"}
                branches={branches}
                currentBranchId={branch || undefined}
                hasPermission={hasPermission}
                lang={lang}
              />
            )
          )}

          {/* ── FINANCE VIEW ── */}
          {activeNav === "Finance" && (
            <FinanceSection
              accessToken={session?.access_token}
              branches={branches.map((b) => ({ id: b.id, name_en: b.name_en, name_ar: b.name_ar }))}
            />
          )}

          {/* ── ALL PRESCRIPTIONS VIEW ── */}

          {/* ── MEDICINE LIBRARY VIEW ── */}

          {/* ── PRODUCTS VIEW ── */}

          {/* ── PRODUCT CATEGORIES VIEW ── */}

          {/* ── POINT OF SALE VIEW ── */}

          {/* ── INSIGHTS VIEW ── */}

          {/* ── SALES DASHBOARD VIEW ── */}

          {/* ── REFUNDS VIEW ── */}

          {/* ── SHIPPING METHODS VIEW ── */}

          {/* ── TARGET BONUSES VIEW ── */}

          {/* ── COUPONS VIEW ── */}

          {/* ── CUSTOMERS VIEW ── */}
          {activeNav === "Patients" && (
            <div>

              {/* ── INLINE: View Customer Profile ── */}
              {viewingCustomerProfile && (
                <CustomerProfileDrawer
                  onNavigateToNewTransaction={(patientId, patientName) => {
                    setActiveNav("Transactions");
                    setTransactionsSubView("new");
                    setTransactionPreSelectedPatient({ id: patientId, name: patientName });
                  }}
                  viewingCustomerProfile={viewingCustomerProfile}
                  setViewingCustomerProfile={setViewingCustomerProfile}
                  medicalRecordForm={medicalRecordForm}
                  setMedicalRecordForm={setMedicalRecordForm}
                  medicalReports={medicalReports}
                  setMedicalReports={setMedicalReports}
                  showMedicalFormModal={showMedicalFormModal}
                  setShowMedicalFormModal={setShowMedicalFormModal}
                  showMedicalReportModal={showMedicalReportModal}
                  setShowMedicalReportModal={setShowMedicalReportModal}
                  customerProfileTab={customerProfileTab}
                  setCustomerProfileTab={setCustomerProfileTab}
                  customerRecordsSubTab={customerRecordsSubTab}
                  setCustomerRecordsSubTab={setCustomerRecordsSubTab}
                  customerPrescriptions={customerPrescriptions}
                  loadingPrescriptions={loadingPrescriptions}
                  prescriptionEditMode={prescriptionEditMode}
                  setPrescriptionEditMode={setPrescriptionEditMode}
                  editingPrescription={editingPrescription}
                  customerProductsSubTab={customerProductsSubTab}
                  setCustomerProductsSubTab={setCustomerProductsSubTab}
                  customerProductBalances={customerProductBalances}
                  loadingCustomerProducts={loadingCustomerProducts}
                  logUsageModalBalance={logUsageModalBalance}
                  setLogUsageModalBalance={setLogUsageModalBalance}
                  logUsageQty={logUsageQty}
                  setLogUsageQty={setLogUsageQty}
                  logUsageNotes={logUsageNotes}
                  setLogUsageNotes={setLogUsageNotes}
                  savingUsageLog={savingUsageLog}
                  showAddPatientProductModal={showAddPatientProductModal}
                  setShowAddPatientProductModal={setShowAddPatientProductModal}
                  selectedAddProductId={selectedAddProductId}
                  setSelectedAddProductId={setSelectedAddProductId}
                  selectedAddProductName={selectedAddProductName}
                  setSelectedAddProductName={setSelectedAddProductName}
                  selectedAddProductQty={selectedAddProductQty}
                  setSelectedAddProductQty={setSelectedAddProductQty}
                  selectedAddProductUnitPrice={selectedAddProductUnitPrice}
                  setSelectedAddProductUnitPrice={setSelectedAddProductUnitPrice}
                  addingProductToPatient={addingProductToPatient}
                  customerPackagesSubTab={customerPackagesSubTab}
                  setCustomerPackagesSubTab={setCustomerPackagesSubTab}
                  customerProfilePackages={customerProfilePackages}
                  loadingCustomerPackages={loadingCustomerPackages}
                  showSellPackageModal={showSellPackageModal}
                  setShowSellPackageModal={setShowSellPackageModal}
                  availablePackageOffers={availablePackageOffers}
                  selectedSellPackageId={selectedSellPackageId}
                  setSelectedSellPackageId={setSelectedSellPackageId}
                  sellPackagePaymentMethod={sellPackagePaymentMethod}
                  setSellPackagePaymentMethod={setSellPackagePaymentMethod}
                  sellingPackage={sellingPackage}
                  customerPackageRedemptions={customerPackageRedemptions}
                  rxDiagnosis={rxDiagnosis}
                  setRxDiagnosis={setRxDiagnosis}
                  rxMedications={rxMedications}
                  setRxMedications={setRxMedications}
                  rxMedInput={rxMedInput}
                  setRxMedInput={setRxMedInput}
                  rxMedDropdown={rxMedDropdown}
                  setRxMedDropdown={setRxMedDropdown}
                  rxGeneralNotes={rxGeneralNotes}
                  setRxGeneralNotes={setRxGeneralNotes}
                  rxDocNotes={rxDocNotes}
                  setRxDocNotes={setRxDocNotes}
                  rxFollowUpDate={rxFollowUpDate}
                  setRxFollowUpDate={setRxFollowUpDate}
                  savingPrescription={savingPrescription}
                  fetchAvailablePackageOffers={fetchAvailablePackageOffers}
                  handleSellPackageToCustomer={handleSellPackageToCustomer}
                  handleSaveUsageLog={handleSaveUsageLog}
                  handleAddProductToPatient={handleAddProductToPatient}
                  handleStartCreatePrescription={handleStartCreatePrescription}
                  handleStartEditPrescription={handleStartEditPrescription}
                  handleAddMedication={handleAddMedication}
                  handleRemoveMedication={handleRemoveMedication}
                  handleSavePrescription={handleSavePrescription}
                  handleDeletePrescription={handleDeletePrescription}
                  handleOpenMedicalFormModal={handleOpenMedicalFormModal}
                  handleOpenMedicalReportModal={handleOpenMedicalReportModal}
                  handleDeleteMedicalReport={handleDeleteMedicalReport}
                  handlePrintPrescription={handlePrintPrescription}
                  hasPermission={hasPermission}
                  adminRole={adminRole}
                  handleOpenEditCustomer={handleOpenEditCustomer}
                  customerAvatars={customerAvatars}
                  handleAvatarUpload={handleAvatarUpload}
                  handleAvatarRemove={handleAvatarRemove}
                  allReservations={allReservations}
                  localServices={localServices}
                  getStatusBadgeClass={getStatusBadgeClass}
                  productSalesHistory={productSalesHistory}
                  inventoryProducts={inventoryProducts}
                  authenticatedJsonHeaders={authenticatedJsonHeaders}
                  lang={lang}
                  adminTranslations={adminTranslations}
                  MOCK_MEDICINES={MOCK_MEDICINES}
                />
              )}

              {/* ── INLINE: Add/Edit Customer Form ── */}
              {showCustomerFormModal && !viewingCustomerProfile && (
                <CustomerFormModal
                  setShowCustomerFormModal={setShowCustomerFormModal}
                  selectedCustomerForEdit={selectedCustomerForEdit}
                  authenticatedJsonHeaders={authenticatedJsonHeaders}
                  fetchCustomers={fetchCustomers}
                  lang={lang}
                  t={adminTranslations[lang].patients.customerFormModal}
                />
              )}

              {/* ── CUSTOMER TABLE (only when no inline view is active) ── */}
              {!viewingCustomerProfile && !showCustomerFormModal && (
              <PatientsDirectoryView
                filteredCustomers={filteredCustomers}
                hasPermission={hasPermission}
                handleOpenAddCustomer={handleOpenAddCustomer}
                handleOpenEditCustomer={handleOpenEditCustomer}
                setViewingCustomerProfile={setViewingCustomerProfile}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                showCustomerFilterPanel={showCustomerFilterPanel}
                setShowCustomerFilterPanel={setShowCustomerFilterPanel}
                customerFilterGender={customerFilterGender}
                setCustomerFilterGender={setCustomerFilterGender}
                customerFilterStatus={customerFilterStatus}
                setCustomerFilterStatus={setCustomerFilterStatus}
                customerFilterReferral={customerFilterReferral}
                setCustomerFilterReferral={setCustomerFilterReferral}
                showCustomerMoreMenu={showCustomerMoreMenu}
                setShowCustomerMoreMenu={setShowCustomerMoreMenu}
                setShowExportCustomersModal={setShowExportCustomersModal}
                setShowImportCustomersModal={setShowImportCustomersModal}
                activeCustomerRowMenuId={activeCustomerRowMenuId}
                setActiveCustomerRowMenuId={setActiveCustomerRowMenuId}
                customerMoreMenuRef={customerMoreMenuRef}
                fetchCustomers={fetchCustomers}
                lang={lang}
                t={adminTranslations[lang].patients.patientsDirectoryView}
              />
              )}
            </div>
          )}






          {/* ── SMS MANAGEMENT VIEWS ── */}







          {/* ── PAGES SETTINGS VIEW ── */}
          {activeNav === "Pages Settings" && (
            <div className="space-y-6">
              <div className="mb-2">
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">Settings</p>
                <h2 className="mt-2 text-4xl font-semibold text-[#1F251A]">Pages Settings</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Edit the content displayed on each public-facing page of the website.</p>
              </div>

              {/* Page tabs */}
              <div className="flex items-center gap-1 p-1 w-fit rounded-full border border-[#414E36]/12 bg-white shadow-sm">
                {(["Home", "About Us", "Services"] as const).map((page) => (
                  <button
                    key={page}
                    onClick={() => setPagesSettingsTab(page)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      pagesSettingsTab === page
                        ? "bg-[#414E36] text-[#FBFBF9] shadow-sm"
                        : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Home Page */}
              {pagesSettingsTab === "Home" && (
                <HomePageSettingsView
                  homeHeroSlides={homeHeroSlides}
                  homeHeroSlidesAr={homeHeroSlidesAr}
                  pageSettingsLangTab={pageSettingsLangTab}
                  setPageSettingsLangTab={setPageSettingsLangTab}
                  loadingPageSettings={loadingPageSettings}
                  savingPageSettings={savingPageSettings}
                  savePageSettings={savePageSettings}
                  translatingField={translatingField}
                  handleTranslateSlideField={handleTranslateSlideField}
                  handleAddSlide={handleAddSlide}
                  handleMoveSlide={handleMoveSlide}
                  handleDeleteSlide={handleDeleteSlide}
                  handleUpdateField={handleUpdateField}
                  beforeAfterPairs={beforeAfterPairs}
                  setBeforeAfterPairs={setBeforeAfterPairs}
                  showConfirm={showConfirm}
                />
              )}


              {/* About Us Page */}
              {pagesSettingsTab === "About Us" && (
                <AboutUsPageSettingsView
                  aboutImage1={aboutImage1}
                  setAboutImage1={setAboutImage1}
                  aboutImage2={aboutImage2}
                  setAboutImage2={setAboutImage2}
                  aboutImage3={aboutImage3}
                  setAboutImage3={setAboutImage3}
                  whatWeDoImage1={whatWeDoImage1}
                  setWhatWeDoImage1={setWhatWeDoImage1}
                  whatWeDoImage2={whatWeDoImage2}
                  setWhatWeDoImage2={setWhatWeDoImage2}
                  whatWeDoList={whatWeDoList}
                  setWhatWeDoList={setWhatWeDoList}
                  whatWeDoListAr={whatWeDoListAr}
                  setWhatWeDoListAr={setWhatWeDoListAr}
                  faqImage1={faqImage1}
                  setFaqImage1={setFaqImage1}
                  faqImage2={faqImage2}
                  setFaqImage2={setFaqImage2}
                  faqTag={faqTag}
                  setFaqTag={setFaqTag}
                  faqHeading={faqHeading}
                  setFaqHeading={setFaqHeading}
                  faqTagAr={faqTagAr}
                  setFaqTagAr={setFaqTagAr}
                  faqHeadingAr={faqHeadingAr}
                  setFaqHeadingAr={setFaqHeadingAr}
                  faqs={faqs}
                  setFaqs={setFaqs}
                  faqsAr={faqsAr}
                  setFaqsAr={setFaqsAr}
                  translatingField={translatingField}
                  handleAutoTranslate={handleAutoTranslate}
                  handleTranslateChecklistItem={handleTranslateChecklistItem}
                  handleTranslateFaqItem={handleTranslateFaqItem}
                  savingPageSettings={savingPageSettings}
                  savePageSettings={savePageSettings}
                />
              )}

              {/* Services Page */}
              {pagesSettingsTab === "Services" && (
                <ServicesPageSettingsView
                  howItWorksHeading={howItWorksHeading}
                  setHowItWorksHeading={setHowItWorksHeading}
                  howItWorksDescription={howItWorksDescription}
                  setHowItWorksDescription={setHowItWorksDescription}
                  howItWorksHeadingAr={howItWorksHeadingAr}
                  setHowItWorksHeadingAr={setHowItWorksHeadingAr}
                  howItWorksDescriptionAr={howItWorksDescriptionAr}
                  setHowItWorksDescriptionAr={setHowItWorksDescriptionAr}
                  wcuYearsLabel={wcuYearsLabel}
                  setWcuYearsLabel={setWcuYearsLabel}
                  wcuHeading={wcuHeading}
                  setWcuHeading={setWcuHeading}
                  wcuDescription={wcuDescription}
                  setWcuDescription={setWcuDescription}
                  wcuQuote={wcuQuote}
                  setWcuQuote={setWcuQuote}
                  wcuYearsLabelAr={wcuYearsLabelAr}
                  setWcuYearsLabelAr={setWcuYearsLabelAr}
                  wcuHeadingAr={wcuHeadingAr}
                  setWcuHeadingAr={setWcuHeadingAr}
                  wcuDescriptionAr={wcuDescriptionAr}
                  setWcuDescriptionAr={setWcuDescriptionAr}
                  wcuQuoteAr={wcuQuoteAr}
                  setWcuQuoteAr={setWcuQuoteAr}
                  wcuImage1={wcuImage1}
                  setWcuImage1={setWcuImage1}
                  wcuImage2={wcuImage2}
                  setWcuImage2={setWcuImage2}
                  translatingField={translatingField}
                  handleAutoTranslate={handleAutoTranslate}
                  savingPageSettings={savingPageSettings}
                  savePageSettings={savePageSettings}
                />
              )}


            </div>
          )}

          {/* ── SETTINGS VIEWS ── */}
          {activeNav === "Profile" && (() => {
            const isSuperadminBypass = adminRole === "superadmin";
            const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
            const currentBranchName = branches.find(b => b.id === branch)?.name_en || "New Cairo Branch";

            return (
              <UserProfileView
                user={{
                  id: profileEmployee?.id || profileEmployee?.employee_id || adminEmail || "my-profile",
                  name: profileName || profileEmployee?.name || (isSuperadminBypass ? "zaki" : "Employee Account"),
                  email: adminEmail || profileEmployee?.email || "",
                  phone: profilePhone || profileEmployee?.phone || "",
                  address: profileAddress || profileEmployee?.address || "",
                  role: isSuperadminBypass ? "Superadmin" : (profileEmployee?.role_name || "Employee"),
                  branch: currentBranchName,
                  department: profileEmployee?.department || "Reception",
                  employeeId: isSuperadminBypass ? "EMP-SUPER" : (profileEmployee?.employee_id || "EMP-001"),
                  employmentType: "Full Time",
                  joiningDate: profileEmployee?.created_at
                    ? new Date(profileEmployee.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                    : "July 21, 2026",
                  basicSalary: Number(profileEmployee?.salary || 0),
                  bonuses: Number(profileEmployee?.bonus || 0),
                  deductions: Number(profileEmployee?.deductions || 0),
                  monthlyTarget: Number(profileEmployee?.required_target_amount || 0),
                  avatarUrl: customerAvatars[profileEmployee?.id || profileEmployee?.employee_id || adminEmail || "my-profile"] || null
                }}
                onUpdateUser={async (updated) => {
                  if (updated.email) setAdminEmail(updated.email);
                  if (updated.phone) setProfilePhone(updated.phone);
                  if (updated.address) setProfileAddress(updated.address);
                  
                  const targetEmp = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                  if (targetEmp?.id) {
                    try {
                      await fetch("/api/employees", {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${session?.access_token || ''}`
                        },
                        body: JSON.stringify({
                          id: targetEmp.id,
                          phone: (updated.phone !== undefined ? updated.phone : profilePhone).trim(),
                          address: (updated.address !== undefined ? updated.address : profileAddress).trim()
                        })
                      });
                      fetchRolesAndEmployees();
                    } catch (e) {
                      console.error("Failed to save profile changes:", e);
                    }
                  }
                }}
                onUpdatePassword={async (pwd) => {
                  setProfilePassword(pwd);
                  setProfileConfirmPassword(pwd);
                }}
                onAvatarUpload={async (file) => {
                  const key = profileEmployee?.id || profileEmployee?.employee_id || adminEmail || "my-profile";
                  if (file && key) handleAvatarUpload(key, file);
                }}
                onAvatarRemove={async () => {
                  const key = profileEmployee?.id || profileEmployee?.employee_id || adminEmail || "my-profile";
                  if (key) handleAvatarRemove(key);
                }}
                lang={lang}
                t={adminTranslations[lang].userProfile}
              />
            );
          })()}

          {activeNav === "Clinic Profile" && (
            <ClinicProfileSettingsView authenticatedJsonHeaders={authenticatedJsonHeaders} />
          )}

          {activeNav === "Service Hours" && (
            <ServiceHoursView
              branches={branches}
              selectedBranchForHoursId={selectedBranchForHoursId}
              setSelectedBranchForHoursId={setSelectedBranchForHoursId}
              serviceHours={serviceHours}
              setServiceHours={setServiceHours}
              handleSaveBranchServiceHours={handleSaveBranchServiceHours}
              savingBranchHours={savingBranchHours}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.serviceHours}
            />
          )}

          {activeNav === "Branches" && (
            <BranchesView
              branches={branches}
              loadingBranches={loadingBranches}
              branchModal={branchModal}
              setBranchModal={setBranchModal}
              savingBranch={savingBranch}
              deletingBranchId={deletingBranchId}
              toggleBranchStatus={async (br) => {
                const newStatus = br.status === "active" ? "inactive" : "active";
                await fetch("/api/branches", {
                  method: "POST",
                  headers: authenticatedJsonHeaders,
                  body: JSON.stringify({ ...br, status: newStatus }),
                });
                setBranches(prev => prev.map(b => b.id === br.id ? { ...b, status: newStatus } : b));
              }}
              deleteBranch={async (br) => {
                if (!(await showConfirm(`Delete "${br.name_en}"?`))) return;
                setDeletingBranchId(br.id);
                await fetch(`/api/branches?id=${br.id}`, { method: "DELETE", headers: authenticatedJsonHeaders });
                setBranches(prev => prev.filter(b => b.id !== br.id));
                setDeletingBranchId(null);
              }}
              saveBranchFromModal={async () => {
                setSavingBranch(true);
                try {
                  const res = await fetch("/api/branches", {
                    method: "POST",
                    headers: authenticatedJsonHeaders,
                    body: JSON.stringify(branchModal.branch),
                  });
                  const saved = await res.json();
                  if (branchModal.mode === "edit") {
                    setBranches(prev => prev.map(b => b.id === saved.id ? saved : b));
                  } else {
                    setBranches(prev => [...prev, saved]);
                  }
                  setBranchModal({ open: false, mode: "add", branch: {} });
                  return true;
                } catch {
                  return false;
                } finally {
                  setSavingBranch(false);
                }
              }}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.branches}
            />
          )}
          {activeNav === "Rooms" && (
            <RoomsManagerView
              branches={branches}
              services={localServices}
              selectedBranchId={branch}
            />
          )}
          {activeNav === "Booking Settings" && (
            <BookingSettingsView
              bookingMinAdvance={bookingMinAdvance}
              setBookingMinAdvance={setBookingMinAdvance}
              bookingMaxAdvance={bookingMaxAdvance}
              setBookingMaxAdvance={setBookingMaxAdvance}
              bookingCancelWindow={bookingCancelWindow}
              setBookingCancelWindow={setBookingCancelWindow}
              bookingMaxPerSlot={bookingMaxPerSlot}
              setBookingMaxPerSlot={setBookingMaxPerSlot}
              bookingInstantApproval={bookingInstantApproval}
              setBookingInstantApproval={setBookingInstantApproval}
              bookingShowDoctorNotes={bookingShowDoctorNotes}
              setBookingShowDoctorNotes={setBookingShowDoctorNotes}
              bookingStaleSessionHours={bookingStaleSessionHours}
              setBookingStaleSessionHours={setBookingStaleSessionHours}
              enableGpsShift={enableGpsShift}
              setEnableGpsShift={setEnableGpsShift}
              handleSaveBookingSettings={handleSaveBookingSettings}
              savingBookingSettings={savingBookingSettings}
              setActiveInfoFeature={setActiveInfoFeature}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.bookingSettings}
            />
          )}

          {activeNav === "Terms & Conditions" && (
            <TermsManagerView
              termsText={termsText}
              setTermsText={setTermsText}
              handleSaveBookingSettings={handleSaveBookingSettings}
              savingBookingSettings={savingBookingSettings}
            />
          )}

          {activeNav === "Deposit Settings" && (
            <DepositSettingsView
              instapayName={instapayName}
              setInstapayName={setInstapayName}
              instapayAddress={instapayAddress}
              setInstapayAddress={setInstapayAddress}
              instapayLink={instapayLink}
              setInstapayLink={setInstapayLink}
              walletEnabled={walletEnabled}
              setWalletEnabled={setWalletEnabled}
              walletName={walletName}
              setWalletName={setWalletName}
              walletNumber={walletNumber}
              setWalletNumber={setWalletNumber}
              walletLink={walletLink}
              setWalletLink={setWalletLink}
              bookingDepositPercentage={bookingDepositPercentage}
              setBookingDepositPercentage={setBookingDepositPercentage}
              handleSaveDepositSettings={handleSaveDepositSettings}
              savingDepositSettings={savingDepositSettings}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.depositSettings}
            />
          )}

          {activeNav === "Inactivity Settings" && (
            <InactivitySettingsView
              inactivityThreshold={inactivityThreshold}
              setInactivityThreshold={setInactivityThreshold}
              inactivityCountdown={inactivityCountdown}
              setInactivityCountdown={setInactivityCountdown}
              handleSaveInactivitySettings={handleSaveInactivitySettings}
              savingInactivitySettings={savingInactivitySettings}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.inactivitySettings}
            />
          )}

          {activeNav === "Notification Settings" && (
            <NotificationSettingsView
              notifSmsOtp={notifSmsOtp}
              setNotifSmsOtp={setNotifSmsOtp}
              notifWhatsApp={notifWhatsApp}
              setNotifWhatsApp={setNotifWhatsApp}
              notifEmailConfirm={notifEmailConfirm}
              setNotifEmailConfirm={setNotifEmailConfirm}
              notifSmsTemplate={notifSmsTemplate}
              setNotifSmsTemplate={setNotifSmsTemplate}
              notifSmsTemplateAr={notifSmsTemplateAr}
              setNotifSmsTemplateAr={setNotifSmsTemplateAr}
              notifReminderHours={notifReminderHours}
              setNotifReminderHours={setNotifReminderHours}
              notifStaffEmail={notifStaffEmail}
              setNotifStaffEmail={setNotifStaffEmail}
              handleSaveNotificationSettings={handleSaveNotificationSettings}
              savingNotificationSettings={savingNotificationSettings}
              setActiveInfoFeature={setActiveInfoFeature}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.notificationSettings}
            />
          )}

          {activeNav === "Queue Settings" && (
            <QueueSettingsView
              queueVirtualRoom={queueVirtualRoom}
              setQueueVirtualRoom={setQueueVirtualRoom}
              queueShowOnScreens={queueShowOnScreens}
              setQueueShowOnScreens={setQueueShowOnScreens}
              queueAutoCheckIn={queueAutoCheckIn}
              setQueueAutoCheckIn={setQueueAutoCheckIn}
              queueAlertThreshold={queueAlertThreshold}
              setQueueAlertThreshold={setQueueAlertThreshold}
              queueAvgSessionDuration={queueAvgSessionDuration}
              setQueueAvgSessionDuration={setQueueAvgSessionDuration}
              handleSaveQueueSettings={handleSaveQueueSettings}
              savingQueueSettings={savingQueueSettings}
              setActiveInfoFeature={setActiveInfoFeature}
              lang={lang}
              t={adminTranslations[lang].settingsScreens.queueSettings}
            />
          )}



          {activeNav === "Medical Records" && (
            <MedicalRecordsSettingsView services={SERVICES as any[]} lang={lang} authenticatedJsonHeaders={authenticatedJsonHeaders} />
          )}

          {activeNav === "Role Management" && (adminRole === "superadmin" || hasPermission("settings.roles") || hasPermission("settings") || hasPermission("Settings")) && (
            <RoleManagementView
              rolesList={rolesList}
              employeesList={employeesList}
              loadingRolesAndEmployees={loadingRolesAndEmployees}
              newEmployeeName={newEmployeeName}
              setNewEmployeeName={setNewEmployeeName}
              newEmployeeEmail={newEmployeeEmail}
              setNewEmployeeEmail={setNewEmployeeEmail}
              newEmployeeRole={newEmployeeRole}
              setNewEmployeeRole={setNewEmployeeRole}
              employeeCreateError={employeeCreateError}
              setEmployeeCreateError={setEmployeeCreateError}
              employeeCreateSuccess={employeeCreateSuccess}
              setEmployeeCreateSuccess={setEmployeeCreateSuccess}
              departmentsList={departmentsList}
              setDepartmentsList={setDepartmentsList}
              adminRole={adminRole}
              session={session}
              authenticatedJsonHeaders={authenticatedJsonHeaders}
              showConfirm={showConfirm}
              handleDeleteEmployee={handleDeleteEmployee}
              handleResendInvitation={handleResendInvitation}
              fetchRolesAndEmployees={fetchRolesAndEmployees}
              lang={lang}
              t={adminTranslations[lang].roleManagement}
            />
          )}

          {activeNav === "System Test Suite" && (adminRole === "superadmin" || hasPermission("settings.test_suite")) && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#414E36]/10 text-[#414E36]">
                      <FlaskConical size={22} />
                    </div>
                    <h2 className="text-3xl font-bold text-[#1F251A]">System Test Suite & Automated Diagnostics</h2>
                  </div>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Automated end-to-end testing suite verifying every API endpoint, database query, HR calculation, and inventory process across the system.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={runningAllDiagnostics}
                    onClick={runAllDiagnosticTests}
                    className="flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#414E36]/20 transition-all hover:bg-[#343F2B] disabled:opacity-50"
                  >
                    {runningAllDiagnostics ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Running Diagnostics...</span>
                      </>
                    ) : (
                      <>
                        <Play size={16} fill="currentColor" />
                        <span>Run All Diagnostics</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Statistics Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Total Tests</span>
                  <div className="mt-2 text-3xl font-extrabold text-[#1F251A]">{systemTestSuites.length}</div>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Passed</span>
                  <div className="mt-2 text-3xl font-extrabold text-emerald-800">
                    {systemTestSuites.filter(t => t.status === 'pass').length}
                  </div>
                </div>

                <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Failed</span>
                  <div className="mt-2 text-3xl font-extrabold text-rose-800">
                    {systemTestSuites.filter(t => t.status === 'fail').length}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Pending / Idle</span>
                  <div className="mt-2 text-3xl font-extrabold text-slate-700">
                    {systemTestSuites.filter(t => t.status === 'idle' || t.status === 'running').length}
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#5A6A51] mr-1">Category:</span>
                  {['all', 'Database & Auth', 'Services & Bookings', 'Inventory & Equipment', 'HR & Payroll', 'Medical & Patients', 'Expenses & Assets', 'System & Settings'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTestCategoryFilter(cat)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                        testCategoryFilter === cat
                          ? 'bg-[#414E36] text-white shadow-sm'
                          : 'bg-white text-[#5A6A51] border border-[#E6E9EB] hover:border-[#414E36]'
                      }`}
                    >
                      {cat === 'all' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full max-w-xs">
                  <Search size={14} className="absolute left-3.5 top-3 text-[#5A6A51]" />
                  <input
                    type="text"
                    placeholder="Search test cases or endpoints..."
                    value={testSuiteSearch}
                    onChange={(e) => setTestSuiteSearch(e.target.value)}
                    className="w-full rounded-2xl border border-[#E6E9EB] bg-white pl-9 pr-4 py-2 text-xs text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                </div>
              </div>

              {/* Test Cases Table */}
              <div className="overflow-hidden rounded-[32px] border border-[#414E36]/10 bg-white shadow-[0_30px_80px_rgba(47,61,41,0.05)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-xs uppercase tracking-wider text-[#5A6A51]">
                      <tr>
                        <th className="px-6 py-4 font-bold">ID</th>
                        <th className="px-6 py-4 font-bold">Test Name & Target Endpoint</th>
                        <th className="px-6 py-4 font-bold">Category</th>
                        <th className="px-6 py-4 font-bold text-center">Status</th>
                        <th className="px-6 py-4 font-bold text-center">Latency</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#414E36]/05 text-[#1F251A]">
                      {systemTestSuites
                        .filter((tc) => {
                          const matchesCat = testCategoryFilter === 'all' || tc.category === testCategoryFilter;
                          const matchesSearch =
                            tc.name.toLowerCase().includes(testSuiteSearch.toLowerCase()) ||
                            tc.endpoint.toLowerCase().includes(testSuiteSearch.toLowerCase()) ||
                            tc.id.toLowerCase().includes(testSuiteSearch.toLowerCase());
                          return matchesCat && matchesSearch;
                        })
                        .map((tc) => {
                          const isExpanded = expandedDiagnosticId === tc.id;
                          return (
                            <Fragment key={tc.id}>
                              <tr className="hover:bg-[#FBFBF9]/80 transition">
                                <td className="px-6 py-4 font-mono font-bold text-[#414E36]">{tc.id}</td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-sm text-[#1F251A]">{tc.name}</div>
                                  <div className="mt-0.5 flex items-center gap-2">
                                    <span className="font-mono text-[11px] text-[#5A6A51] bg-[#EDF1EC] px-2 py-0.5 rounded-md">
                                      {tc.endpoint}
                                    </span>
                                    <span className="text-[11px] text-[#8C9A84]">{tc.description}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-block rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-2.5 py-1 text-[11px] font-semibold text-[#414E36]">
                                    {tc.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {tc.status === 'pass' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                      <CheckCircle2 size={14} className="text-emerald-600" /> PASS
                                    </span>
                                  )}
                                  {tc.status === 'fail' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                                      <XCircle size={14} className="text-rose-600" /> FAIL
                                    </span>
                                  )}
                                  {tc.status === 'running' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                      <Loader2 size={14} className="animate-spin text-amber-600" /> RUNNING
                                    </span>
                                  )}
                                  {tc.status === 'idle' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                      <span className="h-2 w-2 rounded-full bg-slate-400"></span> IDLE
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-xs font-bold text-[#5A6A51]">
                                  {tc.durationMs !== undefined ? `${tc.durationMs}ms` : '—'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={tc.status === 'running'}
                                      onClick={() => runSingleDiagnosticTest(tc.id)}
                                      className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#EDF1EC] transition disabled:opacity-50"
                                    >
                                      Run Test
                                    </button>
                                    {(tc.responseDetails || tc.errorMsg) && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedDiagnosticId(isExpanded ? null : tc.id)}
                                        className="rounded-xl bg-[#EDF1EC] p-1.5 text-[#414E36] hover:bg-[#414E36]/20 transition"
                                        title="View Details JSON"
                                      >
                                        <Terminal size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-[#1F251A]/03">
                                  <td colSpan={6} className="px-6 py-4">
                                    <div className="rounded-2xl bg-[#1F251A] p-4 text-emerald-400 font-mono text-[11px] overflow-x-auto shadow-inner">
                                      <div className="mb-2 flex items-center justify-between text-slate-400 border-b border-slate-700 pb-2">
                                        <span>Response Shape Summary ({tc.id}) — field values redacted</span>
                                        <span>Status Code: {tc.statusCode || 'N/A'}</span>
                                      </div>
                                      {tc.errorMsg && (
                                        <div className="text-rose-400 font-bold mb-2">Error: {tc.errorMsg}</div>
                                      )}
                                      {tc.responseDetails && (
                                        <pre>{JSON.stringify(tc.responseDetails, null, 2)}</pre>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY VIEW ── */}
          {activeNav === "Inventory" && (
            <AdminInventoryView
              authHeaders={authenticatedJsonHeaders}
              branches={branches}
              customers={customers}
              products={inventoryProducts}
              canManageDevices={hasPermission("inventory.manage_devices")}
              canManageProducts={hasPermission("inventory.manage_products")}
              canManageSuppliers={hasPermission("inventory.manage_suppliers")}
              isSuperadmin={adminRole === "superadmin"}
              onRefreshProducts={fetchInventoryProducts}
              onCustomerSpentChange={(customerId, newSpentAmount) => {
                setDbCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, spent_amount: newSpentAmount } : c)));
              }}
              productsTabRef={productsTabRef}
              lang={lang}
              t={adminTranslations[lang].inventory}
            />
          )}

          {/* ===================== EMPLOYEES SECTION ===================== */}
          {activeNav === "Employees" && (adminRole === "superadmin" || hasPermission("employees.view") || hasPermission("Employees")) && (
            <AdminEmployeesView
              newEmployeeName={newEmployeeName}
              setNewEmployeeName={setNewEmployeeName}
              newEmployeeEmail={newEmployeeEmail}
              setNewEmployeeEmail={setNewEmployeeEmail}
              newEmployeeRole={newEmployeeRole}
              setNewEmployeeRole={setNewEmployeeRole}
              viewingEmployee={viewingEmployee}
              setViewingEmployee={setViewingEmployee}
              editingEmployee={editingEmployee}
              setEditingEmployee={setEditingEmployee}
              isEditingEmployeeModalOpen={isEditingEmployeeModalOpen}
              setIsEditingEmployeeModalOpen={setIsEditingEmployeeModalOpen}
              employeeProfileActiveTab={employeeProfileActiveTab}
              setEmployeeProfileActiveTab={setEmployeeProfileActiveTab}
              hasPermission={hasPermission}
              branches={branches}
              rolesList={rolesList}
              departmentsList={departmentsList}
              employeesList={employeesList}
              loadingRolesAndEmployees={loadingRolesAndEmployees}
              attendanceList={attendanceList}
              loadingAttendance={loadingAttendance}
              providers={providers}
              fetchProviders={fetchProviders}
              customerAvatars={customerAvatars}
              handleAvatarUpload={handleAvatarUpload}
              handleAvatarRemove={handleAvatarRemove}
              allServicesList={allServicesList}
              session={session}
              adminDbId={adminDbId}
              adminEmail={adminEmail}
              fetchHrAttendance={fetchHrAttendance}
              handleDeleteEmployee={handleDeleteEmployee}
              handleResendInvitation={handleResendInvitation}
              fetchRolesAndEmployees={fetchRolesAndEmployees}
              getDoctorFirstReservationDate={getDoctorFirstReservationDate}
              allReservations={allReservations}
              parseEgyptianNationalId={parseEgyptianNationalId}
              lang={lang}
              t={adminTranslations[lang].employees}
            />
          )}
          {/* ============================================================= */}







          {/* ── HUMAN RESOURCES (HR) VIEW ── */}
          {activeNav === "HR" && (
            <AdminHrView
              hrActiveSubTab={hrActiveSubTab}
              setHrActiveSubTab={setHrActiveSubTab}
              payrollList={payrollList}
              setPayrollList={setPayrollList}
              loadingPayroll={loadingPayroll}
              leavesList={leavesList}
              loadingLeaves={loadingLeaves}
              performanceReviews={performanceReviews}
              loadingPerformance={loadingPerformance}
              doctorPayrollList={doctorPayrollList}
              loadingDoctorPayroll={loadingDoctorPayroll}
              selectedDoctorPayrollMonth={selectedDoctorPayrollMonth}
              setSelectedDoctorPayrollMonth={setSelectedDoctorPayrollMonth}
              doctorPayrollSearchQuery={doctorPayrollSearchQuery}
              setDoctorPayrollSearchQuery={setDoctorPayrollSearchQuery}
              doctorPayrollFilterStatus={doctorPayrollFilterStatus}
              setDoctorPayrollFilterStatus={setDoctorPayrollFilterStatus}
              doctorPayrollCurrentPage={doctorPayrollCurrentPage}
              setDoctorPayrollCurrentPage={setDoctorPayrollCurrentPage}
              selectedPayrollMonth={selectedPayrollMonth}
              setSelectedPayrollMonth={setSelectedPayrollMonth}
              payrollSearchQuery={payrollSearchQuery}
              setPayrollSearchQuery={setPayrollSearchQuery}
              payrollFilterDepartment={payrollFilterDepartment}
              setPayrollFilterDepartment={setPayrollFilterDepartment}
              payrollFilterStatus={payrollFilterStatus}
              setPayrollFilterStatus={setPayrollFilterStatus}
              payrollCurrentPage={payrollCurrentPage}
              setPayrollCurrentPage={setPayrollCurrentPage}
              newLeaveEmployeeId={newLeaveEmployeeId}
              setNewLeaveEmployeeId={setNewLeaveEmployeeId}
              newLeaveType={newLeaveType}
              setNewLeaveType={setNewLeaveType}
              newLeaveStartDate={newLeaveStartDate}
              setNewLeaveStartDate={setNewLeaveStartDate}
              newLeaveEndDate={newLeaveEndDate}
              setNewLeaveEndDate={setNewLeaveEndDate}
              newLeaveReason={newLeaveReason}
              setNewLeaveReason={setNewLeaveReason}
              newReviewEmployeeId={newReviewEmployeeId}
              setNewReviewEmployeeId={setNewReviewEmployeeId}
              newReviewRating={newReviewRating}
              setNewReviewRating={setNewReviewRating}
              newReviewComments={newReviewComments}
              setNewReviewComments={setNewReviewComments}
              newReviewGoals={newReviewGoals}
              setNewReviewGoals={setNewReviewGoals}
              editingTargetEmployee={editingTargetEmployee}
              setEditingTargetEmployee={setEditingTargetEmployee}
              targetAmountInput={targetAmountInput}
              setTargetAmountInput={setTargetAmountInput}
              bonusPercentageInput={bonusPercentageInput}
              setBonusPercentageInput={setBonusPercentageInput}
              targetTypeInput={targetTypeInput}
              setTargetTypeInput={setTargetTypeInput}
              bonusTypeInput={bonusTypeInput}
              setBonusTypeInput={setBonusTypeInput}
              employeesList={employeesList}
              attendanceList={attendanceList}
              loadingAttendance={loadingAttendance}
              activeMissingAlerts={activeMissingAlerts}
              setViewingEmployee={setViewingEmployee}
              session={session}
              adminEmail={adminEmail}
              branches={branches}
              localServices={localServices}
              allReservations={allReservations}
              showConfirm={showConfirm}
              fetchHrPayroll={fetchHrPayroll}
              fetchDoctorPayroll={fetchDoctorPayroll}
              fetchHrLeaves={fetchHrLeaves}
              fetchHrPerformance={fetchHrPerformance}
              fetchHrAttendance={fetchHrAttendance}
              fetchHrAlerts={fetchHrAlerts}
              fetchRolesAndEmployees={fetchRolesAndEmployees}
              lang={lang}
              t={adminTranslations[lang].hr}
            />
          )}

          {/* Presence Activity Check Overlay Modal */}
          {presenceModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[32px] bg-white border border-[#414E36]/10 p-8 shadow-2xl text-center space-y-6 mx-4">
                <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-[#1F251A]">Activity Verification</h3>
                  <p className="text-sm text-[#5A6A51] leading-relaxed">
                    Please verify that you are active at your workstation. If you do not click the button below within the next:
                  </p>
                  <div className={`text-5xl font-bold ${presenceCountdown <= 3 ? 'text-rose-600' : presenceCountdown <= 6 ? 'text-amber-500' : 'text-[#414E36]'} transition-colors`}>
                    {presenceCountdown}s
                  </div>
                  <p className="text-xs text-[#5A6A51]">An inactivity alert will be sent to the administrator.</p>
                </div>
                <button
                  onClick={() => setPresenceModalOpen(false)}
                  className="w-full rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md"
                >
                  ✓ I am Present &amp; Working
                </button>
              </div>
            </div>
          )}

          {/* Location Warning Modal */}
          {locationWarningOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md">
              <div className="w-full max-w-md rounded-[32px] bg-white border border-rose-100 p-8 shadow-2xl text-center space-y-6 mx-4">
                <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                  <MapPin size={32} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-[#1F251A]">Account Access Locked</h3>
                  <p className="text-sm text-[#5A6A51] leading-relaxed whitespace-pre-line">
                    {locationWarningMsg}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    setLocationWarningOpen(false);
                  }}
                  className="w-full rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 transition shadow-md"
                >
                  Sign Out &amp; Exit
                </button>
              </div>
            </div>
          )}

          {/* ── RECEPTION DASHBOARD VIEW ── */}
          {activeNav === "Dashboard" && (
            <ReceptionDashboardView
              receptionistName={loggedEmpAccount?.name || (adminEmail ? adminEmail.split("@")[0] : "Employee")}
              receptionistRole={loggedEmpAccount?.role_name || adminRole || "Staff"}
              employeeId={loggedEmpAccount?.id || adminDbId}
              email={adminEmail}
              accessToken={session?.access_token}
              onNavigateTab={(tabName) => setActiveNav(tabName)}
              onLogout={handleLogout}
              lang={lang}
              t={adminTranslations[lang].reception.dashboard}
            />
          )}

          {/* ── BOOKINGS, NEW BOOKING & PREVIOUS BOOKING FULL VIEW ── */}
          {activeNav === "Bookings" && (
            showFullViewNewBooking ? (
              <AdminNewBookingView
                onClose={() => setShowFullViewNewBooking(false)}
                onBookingCreated={() => {
                  clearFetchCache();
                  fetchAllReservations();
                  setShowFullViewNewBooking(false);
                }}
                services={localServices}
                providers={providers}
                customers={dbCustomers}
                branches={branches}
                lang={lang}
                t={adminTranslations[lang].bookings.adminNewBookingView}
                activeBranchId={branch}
              />
            ) : showAddPreviousBooking ? (
              <AdminAddPreviousBookingView
                onClose={() => setShowAddPreviousBooking(false)}
                onBookingCreated={() => {
                  clearFetchCache();
                  fetchAllReservations();
                  fetchCustomers();
                  setShowAddPreviousBooking(false);
                }}
                services={localServices}
                providers={providers}
                customers={dbCustomers}
                branches={branches}
                activeBranchId={branch}
                lang={lang}
                t={adminTranslations[lang].bookings.adminAddPreviousBooking}
              />
            ) : (
              <AdminBookingsView
                allReservations={allReservations as any}
                requests={requests as any}
                providers={providers}
                localServices={localServices}
                userName={loggedEmpAccount?.name?.split(" ")[0] || "Sara"}
                staleSessionThresholdHours={bookingStaleSessionHours}
                hasPermission={hasPermission}
                lang={lang}
                t={adminTranslations[lang].bookings.adminBookingsView}
                onNewBooking={() => setShowFullViewNewBooking(true)}
                onAddPreviousBooking={() => setShowAddPreviousBooking(true)}
                onPendingApprovalsClick={() => {
                  const el = document.getElementById("pending-approvals-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                onFilterClick={() => setShowFilterModal(true)}
                onViewBookingDetails={(booking: any) => {
                  // RISK-053: AdminBookingsView normalises status for its own table/badges
                  // ('started' -> 'in_progress', 'approved' -> 'confirmed') and returns that
                  // normalised object here. The shared details modal below switches its Session
                  // Flow actions on the *raw* DB status strings, so passing the normalised object
                  // straight through silently dropped the "Treatment In Session" banner and wrongly
                  // re-exposed Postpone/Cancel/No Show for a booking that is actively in session
                  // (the 'started' exclusion at the Other Actions block below never matched because
                  // the value it saw was already rewritten to 'in_progress'). Resolve the untouched
                  // record from allReservations by id instead.
                  const raw = allReservations.find((r: any) => String(r.id) === String(booking?.id));
                  setViewingBooking((raw || booking) as any);
                }}
                onPrint={() => window.print()}
                onExportCSV={handleExportBookingsCSV}
                onApproveBooking={(booking: any) => {
                  // RISK-047/052: must go through openApprove() so the modal is pre-filled from
                  // the actual booking (requested time, requested doctor, availability) instead
                  // of opening with whatever `slot`/`doctorName` state happened to be left over
                  // from a previous modal use — which is how this button independently
                  // reintroduced the hardcoded-doctor/wrong-time bug openApprove() itself fixed.
                  openApprove(booking as any);
                }}
                onRejectBooking={async (booking: any) => {
                  try {
                    if (booking?.id) {
                      await supabase.from("reservations").update({ status: "rejected" }).eq("id", booking.id);
                      setRequests(prev => prev.filter(r => String(r.id) !== String(booking.id)));
                      setAllReservations(prev => prev.map(r => String(r.id) === String(booking.id) ? { ...r, status: "rejected" } : r));
                    }
                  } catch (e) {
                    console.error("Reject error:", e);
                  }
                }}
              />
            )
          )}
          {activeNav === "New Booking" && (
            <AdminNewBookingView
              onClose={() => setActiveNav("Bookings")}
              onBookingCreated={() => {
                clearFetchCache();
                fetchAllReservations();
                setActiveNav("Bookings");
              }}
              services={localServices}
              providers={providers}
              customers={dbCustomers}
              branches={branches}
              lang={lang}
              t={adminTranslations[lang].bookings.adminNewBookingView}
              activeBranchId={branch}
            />
          )}
        </>
      )}
    </div>
  </main>
</div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4">
          <div className="w-full max-w-md rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                  Approve request
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                  {selected.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-[#F2EFE9] p-3 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#5A6A51]">
              Requested for {selected.date}. Confirm the date and time slot below — change the
              date if the requested one isn't available (e.g. a closed day).
            </p>
            <label className="mb-2 block text-sm font-semibold text-[#414E36]">
              Appointment date
            </label>
            <input
              type="date"
              value={approveDate || selected.date}
              onChange={(e) => handleApproveDateChange(e.target.value)}
              className="mb-4 w-full rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C]"
            />
            <label className="mb-2 block text-sm font-semibold text-[#414E36]">
              Time slot
            </label>
            <select
              value={slot}
              onChange={(e) => { setSlot(e.target.value); setApproveTimeWarning(""); }}
              className="mb-4 w-full rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C]"
            >
              {(() => {
                const { start, end } = getDayOperatingHoursApprove({ ...selected, date: approveDate || selected.date });
                const filteredSlots = SLOTS.filter((s) => {
                  const norm = normaliseTo24hSlot(s) ?? "";
                  return norm >= start && norm < end;
                });
                const options = filteredSlots.map((s) => {
                  const isUnavailable = approveUnavailableSlots.includes(s);
                  return (
                    <option key={s} value={s} disabled={isUnavailable}>
                      {s} {isUnavailable ? "(Unavailable)" : ""}
                    </option>
                  );
                });
                // The patient's requested time may fall outside opening hours, in which case it is
                // not in filteredSlots and the select would render blank — hiding what was asked
                // for. Surface it explicitly instead.
                if (slot && !filteredSlots.includes(slot)) {
                  options.unshift(
                    <option key={`requested-${slot}`} value={slot}>
                      {slot} (Requested — outside opening hours)
                    </option>
                  );
                }
                return options;
              })()}
            </select>
            {approveTimeWarning && (
              <p className="-mt-2 mb-4 text-xs font-semibold text-rose-600">
                {approveTimeWarning}
              </p>
            )}
            {(() => {
              const { start, end } = getDayOperatingHoursApprove({ ...selected, date: approveDate || selected.date });
              const hasSlots = SLOTS.some((s) => {
                const norm = normaliseTo24hSlot(s) ?? "";
                return norm >= start && norm < end;
              });
              if (hasSlots) return null;
              return (
                <p className="-mt-2 mb-4 text-xs font-semibold text-rose-600">
                  No time slots available on this date — it may be a closed day for this branch,
                  or fully booked. Pick a different date above.
                </p>
              );
            })()}

            <label className="mb-2 block text-sm font-semibold text-[#414E36]">
              Assign Doctor
            </label>
            <select
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="mb-6 w-full rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C]"
            >
              {availableDoctorsApprove.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              {availableDoctorsApprove.length === 0 && (
                <option value="">No Available Doctors</option>
              )}
            </select>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={approve}
                disabled={approveUnavailableSlots.includes(slot) || !slot}
                className="rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm approve
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-5 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date bookings selector modal */}
      {dayBookingsSelector.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] border border-[#414E36]/10">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Select Appointment</p>
                <h3 className="mt-2 text-xl font-semibold text-[#1F251A]">
                  Bookings on {new Date(dayBookingsSelector.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </h3>
              </div>
              <button
                onClick={() => setDayBookingsSelector({ open: false, date: "", bookings: [] })}
                className="rounded-full bg-white border border-[#414E36]/10 p-2 text-[#414E36] hover:bg-[#EDF1EC] transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {dayBookingsSelector.bookings.map((b: any) => {
                const svc = localServices.find(s => s.id === b.serviceId);
                const rm = rooms.find(room => room.id === b.roomId);
                
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setViewingBooking(b);
                      setDayBookingsSelector({ open: false, date: "", bookings: [] });
                    }}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#414E36]/10 bg-white p-4 hover:bg-[#EDF1EC]/30 hover:border-[#414E36]/30 transition cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-[#1F251A] group-hover:text-[#414E36] transition-colors">{b.name}</p>
                      <p className="text-xs text-[#5A6A51] font-medium">{svc ? svc.en : `Service #${b.serviceId}`}</p>
                      {rm && (
                        <p className="text-[11px] text-[#5A6A51] flex items-center gap-1">
                          <DoorOpen size={10} /> {rm.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex rounded-full bg-[#414E36]/10 text-[#414E36] px-2.5 py-1 text-xs font-semibold">
                        {b.timeSlot || b.requestedTime || "N/A"}
                      </span>
                      <p className="text-[10px] text-[#5A6A51]/80 mt-1 capitalize font-medium">{b.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewingBooking && (() => {
        const selectedServiceIds: number[] = Array.isArray(viewingBooking.serviceIds) 
          ? viewingBooking.serviceIds 
          : (viewingBooking.serviceId ? [Number(viewingBooking.serviceId)] : []);
        
        // Price Details map in EGP
        const prices: Record<number, number> = {
          1: 400, 2: 500, 3: 450, 4: 600, 5: 800, 6: 700, 7: 1500,
          11: 600, 12: 500, 13: 800, 14: 1200, 15: 1500, 16: 1000, 17: 400,
          21: 300, 22: 350, 23: 300,
          31: 400, 32: 350, 33: 400, 34: 500
        };

        const bookingServices = selectedServiceIds.map(id => {
          const s = localServices.find(item => item.id === id);
          return {
            id,
            name: s ? s.en : `Service #${id}`,
            price: s ? getEffectiveServicePrice(s, viewingBooking.branchId, branches) : (prices[id] ?? 500)
          };
        });

        const serviceNames = bookingServices.map(bs => bs.name).join(", ");
        const servicesCost = bookingServices.reduce((sum, bs) => sum + bs.price, 0);

        // Compute attached products and additional services from attachedProducts and notes
        const rawAttached: any[] = Array.isArray((viewingBooking as any).attachedProducts)
          ? [...(viewingBooking as any).attachedProducts]
          : [];

        const additionalServicesList: Array<{ name: string; qty: number; unitPrice: number; total: number; lineType: string }> = [];
        const productsConsumablesList: Array<{ name: string; qty: number; unitPrice: number; total: number; lineType: string; addedBy?: string }> = [];
        const existingNames = new Set<string>();

        // 1. Process structured attachedProducts
        for (const item of rawAttached) {
          const name = String(item.name || 'Item').replace(/^[,\s-]+/, '').trim();
          const qty = Number(item.qty) || 1;
          const unitPrice = Number(item.unitPrice || item.price || 0);
          const total = Number(item.total) || (qty * unitPrice);
          const lineType = item.lineType || (item.serviceId ? 'additional_service' : 'product');

          // Skip zero-cost device pulse counter tracking from billing products list
          const isPulse = lineType === 'device_pulses' || name.toLowerCase().includes('pulse');
          if (isPulse && (total === 0 || unitPrice === 0)) {
            continue;
          }

          if (!existingNames.has(name.toLowerCase())) {
            existingNames.add(name.toLowerCase());
            if (lineType === 'additional_service') {
              additionalServicesList.push({ name, qty, unitPrice, total, lineType });
            } else {
              productsConsumablesList.push({
                name,
                qty,
                unitPrice,
                total,
                lineType,
                addedBy: item.addedBy || (item.added_by_role === 'doctor_session' ? 'Doctor Session' : 'Receptionist')
              });
            }
          }
        }

        // 2. Parse from notes (safety net & historical support)
        if (viewingBooking.notes) {
          const notesStr = String(viewingBooking.notes);

          // a) Check for [Additional Services Used] or [Additional Services]
          const addSvcBlockMatch = notesStr.match(/\[(?:Additional Services|Extra Services|Services Used|Added Services)(?: Used)?(?: During Session)?\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
          if (addSvcBlockMatch) {
            const rawBlock = addSvcBlockMatch[1];
            // Split by comma or newline outside parentheses
            const items = rawBlock.split(/(?:,|\n)(?![^(]*\))/);
            for (const item of items) {
              const trimmed = item.trim();
              if (!trimmed || trimmed.startsWith("[")) continue;
              // Format 1: Name (Qty: 1 x 200 EGP = 200 EGP)
              const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m1) {
                const name = m1[1].replace(/^[,\s-]+/, '').trim();
                const qty = Number(m1[2]) || 1;
                const unitPrice = Number(m1[3]) || 0;
                const total = Number(m1[4]) || (qty * unitPrice);
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
              // Format 2: Name (Qty: 1 x 200 EGP)
              const m2 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m2) {
                const name = m2[1].replace(/^[,\s-]+/, '').trim();
                const qty = Number(m2[2]) || 1;
                const unitPrice = Number(m2[3]) || 0;
                const total = qty * unitPrice;
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
              // Format 3: Name - 200 EGP or Name (200 EGP) or Name: 200 EGP or Name @ 200 EGP
              const m3 = trimmed.match(/^(.+?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
              if (m3) {
                const name = m3[1].replace(/^[,\s-]+/, '').trim();
                const qty = m3[2] ? Number(m3[2]) : 1;
                const total = Number(m3[3]) || 0;
                const unitPrice = qty > 0 ? total / qty : total;
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
            }
          }

          // b) Added Service format: [Added Service]: Name - 350 EGP or [Additional Service]: Name - 200 EGP
          const addedServiceMatches = notesStr.matchAll(/\[(?:Added Service|Additional Service|Extra Service)\]:\s+(.*?)(?=\n|$)/gi);
          for (const match of addedServiceMatches) {
            const rawLine = match[1].trim();
            const m1 = rawLine.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
            if (m1) {
              const name = m1[1].replace(/^[,\s-]+/, '').trim();
              const qty = Number(m1[2]) || 1;
              const unitPrice = Number(m1[3]) || 0;
              const total = Number(m1[4]) || (qty * unitPrice);
              if (!existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
              }
              continue;
            }
            const m2 = rawLine.match(/^(.*?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
            if (m2) {
              const name = m2[1].replace(/^[,\s-]+/, '').trim();
              const qty = m2[2] ? Number(m2[2]) : 1;
              const total = Number(m2[3]);
              const unitPrice = qty > 0 ? total / qty : total;
              if (!existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                additionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
              }
              continue;
            }
          }

          // c) Products Used in notes
          const prodBlockMatch = notesStr.match(/\[Products Used During Session\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
          if (prodBlockMatch) {
            const rawProdBlock = prodBlockMatch[1];
            const items = rawProdBlock.split(/(?:,|\n)(?![^(]*\))/);
            for (const item of items) {
              const trimmed = item.trim();
              if (!trimmed || trimmed.startsWith("[")) continue;
              const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m1) {
                const name = m1[1].replace(/^[,\s-]+/, '').trim();
                const qty = Number(m1[2]) || 1;
                const unitPrice = Number(m1[3]) || 0;
                const total = Number(m1[4]) || (qty * unitPrice);
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  productsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product', addedBy: 'Doctor Session' });
                }
                continue;
              }
            }
          }

          // d) Receptionist Added Product: [Added Product]: Name (x2) - 1400 EGP
          const receptionistMatches = notesStr.matchAll(/\[Added Product\]:\s+(.*?)(?:\s*\(x(\d+)\))?\s*-\s+(\d+(?:\.\d+)?)\s+EGP/gi);
          for (const match of receptionistMatches) {
            const name = match[1].replace(/^[,\s-]+/, '').trim();
            const qty = match[2] ? Number(match[2]) : 1;
            const total = Number(match[3]);
            const unitPrice = qty > 0 ? total / qty : total;
            if (!existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              productsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product', addedBy: 'Receptionist' });
            }
          }

          // e) Extra Device Pulses matches
          const pulseMatches = notesStr.matchAll(/\[(?:Extra Device Pulses|Device Pulses Deducted)\]:\s*(.*?)=\s*(\d+(?:\.\d+)?)\s*EGP/gi);
          for (const match of pulseMatches) {
            const name = "Extra Device Pulses";
            const total = parseFloat(match[2]) || 0;
            if (total > 0 && !existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              productsConsumablesList.push({ name, qty: 1, unitPrice: total, total, lineType: 'device_pulses', addedBy: 'Doctor Session' });
            }
          }

          // f) Generic format: - Name (x2) @ 700 EGP
          const doctorMatches = notesStr.matchAll(/-\s+(.*?)\s+\(x(\d+)\)\s+@\s+(\d+(?:\.\d+)?)\s+EGP/gi);
          for (const match of doctorMatches) {
            const name = match[1].replace(/^[,\s-]+/, '').trim();
            const qty = Number(match[2]);
            const unitPrice = Number(match[3]);
            const total = qty * unitPrice;
            if (!existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              productsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product', addedBy: 'Doctor Session' });
            }
          }
        }

        // 3. Fallback reconciliation: If notes or booking balance recorded a higher invoice total than the sum of parsed lines,
        // recover the missing additional services / session adjustments difference!
        const baseAndAttachedTotal = servicesCost + additionalServicesList.reduce((sum, s) => sum + s.total, 0) + productsConsumablesList.reduce((sum, p) => sum + p.total, 0);
        let targetInvoiceTotal = baseAndAttachedTotal;

        if (viewingBooking.notes) {
          const invMatch = String(viewingBooking.notes).match(/\[(?:Invoice Total Updated|Total Invoice|Final Invoice|Updated Invoice Total|Total Price|Invoice Total)\]:\s*(\d+(?:\.\d+)?)\s*EGP/i);
          if (invMatch) {
            const notedTotal = Number(invMatch[1]);
            if (notedTotal > targetInvoiceTotal) {
              targetInvoiceTotal = notedTotal;
            }
          }
        }

        const rawPaid = Number(viewingBooking.amountPaid || (viewingBooking as any).amount_paid || 0);
        const additionalServicesCost = additionalServicesList.reduce((sum, s) => sum + s.total, 0);
        const productsCost = productsConsumablesList.reduce((sum, p) => sum + p.total, 0);
        const totalPrice = servicesCost + additionalServicesCost + productsCost;

        const sessionPaid = rawPaid;
        const sessionLeft = Math.max(0, totalPrice - sessionPaid);

        const isInvoicePaid = sessionLeft <= 0 || (sessionPaid >= totalPrice && totalPrice > 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
            <div className="w-full max-w-6xl rounded-[32px] bg-[#FBFBF9] p-6 sm:p-8 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[92vh] overflow-y-auto custom-scrollbar border border-[#414E36]/15 space-y-6">
              
              {/* ── HEADER ── */}
              <div className="flex items-start justify-between border-b border-[#414E36]/10 pb-5">
                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-[#1F251A] tracking-tight">
                    Booking Details
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
                    <span className="font-semibold text-[#5A6A51] flex items-center gap-1.5">
                      <span>Reference ID:</span>
                      <span className="font-mono font-bold text-[#1F251A]">{viewingBooking.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(String(viewingBooking.id));
                          setCopiedBookingRef(true);
                          setTimeout(() => setCopiedBookingRef(false), 2000);
                        }}
                        title="Copy Reference ID"
                        className="text-[#5A6A51] hover:text-[#1F251A] transition p-0.5 rounded cursor-pointer"
                      >
                        {copiedBookingRef ? <Check size={13} className="text-emerald-700 font-bold" /> : <Copy size={13} />}
                      </button>
                    </span>

                    {/* Status Badge */}
                    <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      viewingBooking.status === 'approved' || viewingBooking.status === 'confirmed'
                        ? 'bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]' 
                        : viewingBooking.status === 'rejected' 
                          ? 'bg-red-100 text-red-800' 
                          : viewingBooking.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : viewingBooking.status === 'started'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {viewingBooking.status === 'approved' ? 'CONFIRMED' : viewingBooking.status.toUpperCase()}
                    </span>

                    {/* Source Badge */}
                    <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                      viewingBooking.isManual 
                        ? 'bg-[#E8F0FE] text-[#1967D2]' 
                        : 'bg-[#FAF5EB] text-[#C4AE7C]'
                    }`}>
                      {viewingBooking.isManual ? "MANUAL BOOKING" : "WEBSITE BOOKING"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewingBooking(null);
                    setIsEditingService(false);
                  }}
                  className="h-9 w-9 rounded-full bg-gray-100/90 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── 2-COLUMN MAIN GRID ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* ── LEFT COLUMN (2/3 width) ── */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* 1. PATIENT INFORMATION CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                        <User size={14} className="text-[#0F3826]" />
                        <span>PATIENT INFORMATION</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanBookingPhone = (viewingBooking.phone || "").replace(/\D/g, "");
                          const customerRecord = dbCustomers.find(c => {
                            if (viewingBooking.customerId && c.id === viewingBooking.customerId) return true;
                            const cPhone = (c.mobile || c.phone || "").replace(/\D/g, "");
                            if (cPhone && cleanBookingPhone && (cPhone === cleanBookingPhone || cPhone.endsWith(cleanBookingPhone) || cleanBookingPhone.endsWith(cPhone))) {
                              return true;
                            }
                            if (c.name && viewingBooking.name && c.name.toLowerCase().trim() === viewingBooking.name.toLowerCase().trim()) {
                              return true;
                            }
                            return false;
                          });

                          const targetCustomer: any = customerRecord || {
                            id: viewingBooking.customerId || `cust_${Date.now()}`,
                            name: viewingBooking.name,
                            first_name: viewingBooking.name?.split(" ")[0] || "",
                            last_name: viewingBooking.name?.split(" ").slice(1).join(" ") || "",
                            mobile: viewingBooking.phone,
                            phone: viewingBooking.phone,
                            email: viewingBooking.email || ""
                          };

                          setViewingBooking(null);
                          setActiveNav("Patients");
                          setViewingCustomerProfile(targetCustomer);
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View Patient</span>
                      </button>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-[#1F251A]">
                        {viewingBooking.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#5A6A51] font-medium mt-1">
                        <span className="flex items-center gap-1">
                          <Phone size={13} className="text-[#5A6A51]" />
                          <span className="font-mono font-bold text-[#1F251A]">{viewingBooking.phone}</span>
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <FileText size={13} className="text-[#5A6A51]" />
                          <span>{viewingBooking.email || "No email provided"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 3-METRICS ROW: SERVICE, DATE & TIME, SESSION TYPE */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card A: SERVICE */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <ShoppingBag size={13} className="text-[#0F3826]" />
                        <span>SERVICE</span>
                      </div>
                      <p className="font-black text-sm text-[#1F251A] leading-snug line-clamp-1 pt-0.5" title={serviceNames}>
                        {bookingServices[0]?.name || serviceNames || "Clinic Service"}
                      </p>
                      <p className="text-xs text-[#5A6A51] font-medium line-clamp-1">
                        {bookingServices[0]?.name && bookingServices.length > 1 ? `+${bookingServices.length - 1} more service(s)` : "(Standard Procedure)"}
                      </p>
                    </div>

                    {/* Card B: DATE & TIME */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <Calendar size={13} className="text-[#0F3826]" />
                        <span>DATE &amp; TIME</span>
                      </div>
                      <p className="font-bold text-xs text-[#1F251A] flex items-center gap-1.5 pt-0.5">
                        <Clock size={12} className="text-[#5A6A51]" />
                        <span>
                          {(() => {
                            if (!viewingBooking.date) return "—";
                            try {
                              const d = new Date(viewingBooking.date);
                              const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                              const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
                              return `${day} (${weekday})`;
                            } catch {
                              return viewingBooking.date;
                            }
                          })()}
                        </span>
                      </p>
                      <p className="font-bold text-xs text-[#1F251A] flex items-center gap-1.5">
                        <Clock size={12} className="text-[#5A6A51]" />
                        <span>{viewingBooking.timeSlot || viewingBooking.requestedTime || "09:00 AM"}</span>
                      </p>
                    </div>

                    {/* Card C: SESSION TYPE */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <User size={13} className="text-[#0F3826]" />
                        <span>SESSION TYPE</span>
                      </div>
                      <p className="font-black text-xs text-[#1F251A] pt-0.5">
                        {viewingBooking.sessionType === 'online' ? "Online Consultation" : "In Person"}
                      </p>
                      <p className="text-xs text-[#5A6A51] font-medium flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${viewingBooking.sessionType === 'online' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <span>{viewingBooking.sessionType === 'online' ? "Virtual Consultation" : "In Clinic Visit"}</span>
                      </p>
                    </div>
                  </div>

                  {/* 3. 2-METRICS ROW: DOCTOR & LOCATION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card A: DOCTOR */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <User size={13} className="text-[#0F3826]" />
                        <span>DOCTOR</span>
                      </div>
                      <p className="font-black text-sm text-[#1F251A] pt-0.5">
                        {viewingBooking.doctorName || "Treating Doctor"}
                      </p>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        {"★".repeat(5)}
                        <span className="text-[#5A6A51] text-[11px] font-semibold ml-0.5">5.0</span>
                      </div>
                    </div>

                    {/* Card B: LOCATION */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                        <MapPin size={13} className="text-[#0F3826]" />
                        <span>LOCATION</span>
                      </div>
                      <p className="font-black text-sm text-[#1F251A] pt-0.5">
                        {(() => {
                          const r = rooms.find(rm => rm.id === viewingBooking.roomId);
                          return r ? r.name : "Clinical Room";
                        })()}
                      </p>
                      <p className="text-xs text-[#5A6A51] font-medium">
                        {(() => {
                          const r = rooms.find(rm => rm.id === viewingBooking.roomId);
                          const b = branches.find(br => br.id === viewingBooking.branchId);
                          const roomType = r ? `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} Room` : "Clinical Room";
                          const branchName = b ? (isRTL ? b.name_ar : b.name_en) : "Main Branch";
                          return `${roomType} • ${branchName}`;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* 4. SERVICE DETAILS CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                        <Box size={14} className="text-[#0F3826]" />
                        <span>SERVICE DETAILS</span>
                      </div>
                      {!isEditingService && hasPermission("bookings.edit") && viewingBooking.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => setIsEditingService(true)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Add Service</span>
                        </button>
                      )}
                    </div>

                    {/* Services List */}
                    <div className="space-y-2 text-xs">
                      {bookingServices.map((bs, index) => (
                        <div key={`bs-${bs.id}-${index}`} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                          <span className="font-semibold text-[#1F251A]">
                            {index + 1}. {bs.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#1F251A]">{bs.price} EGP</span>
                            {bookingServices.length > 1 && hasPermission("bookings.edit") && viewingBooking.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const updatedIds = selectedServiceIds.filter((_, i) => i !== index);
                                  try {
                                    const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                      method: "PATCH",
                                      headers: authenticatedJsonHeaders,
                                      body: JSON.stringify({ serviceIds: updatedIds }),
                                    });
                                    if (res.ok) {
                                      const updated = await res.json();
                                      setViewingBooking(updated);
                                      fetchAllReservations();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 font-bold px-1"
                                title="Remove Service"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Additional Services from session */}
                      {additionalServicesList.map((as, asIdx) => (
                        <div key={`as-${asIdx}`} className="flex items-center justify-between py-1 border-b border-gray-50">
                          <span className="font-semibold text-[#1F251A]">
                            {bookingServices.length + asIdx + 1}. {as.name} <span className="text-[10px] text-[#5A6A51]">(x{as.qty})</span>
                          </span>
                          <span className="font-extrabold text-[#1F251A]">{as.total} EGP</span>
                        </div>
                      ))}

                      {/* Add Service Inline Selector */}
                      {isEditingService && (
                        <div className="pt-2 flex items-center gap-2">
                          <select
                            value=""
                            onChange={async (e) => {
                              const newServiceId = Number(e.target.value);
                              if (!newServiceId) return;
                              const updatedServiceIds = [...selectedServiceIds, newServiceId];
                              try {
                                const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                  method: "PATCH",
                                  headers: authenticatedJsonHeaders,
                                  body: JSON.stringify({ serviceIds: updatedServiceIds }),
                                });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setViewingBooking(updated);
                                  fetchAllReservations();
                                  setIsEditingService(false);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="rounded-xl border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none font-bold"
                          >
                            <option value="" disabled>Select service to add...</option>
                            {localServices
                              .filter(svc => !selectedServiceIds.includes(svc.id))
                              .map((svc) => (
                                <option key={svc.id} value={svc.id}>
                                  {svc.en}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsEditingService(false)}
                            className="text-xs font-semibold text-[#5A6A51] hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Total Price Row */}
                    <div className="pt-3 border-t border-[#414E36]/10 flex items-center justify-between">
                      <span className="font-black text-sm text-[#1F251A]">Total Price</span>
                      <span className="font-black text-base text-[#1F251A]">{totalPrice} EGP</span>
                    </div>
                  </div>

                  {/* 5. 2-METRICS ROW: PRODUCTS & CONSUMABLES and PRESCRIPTION */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card A: PRODUCTS & CONSUMABLES */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                          <Box size={13} className="text-[#0F3826]" />
                          <span>PRODUCTS &amp; CONSUMABLES</span>
                        </div>
                        <button
                          type="button"
                          disabled={isInvoicePaid}
                          onClick={() => !isInvoicePaid && setShowDrawerProductModal(true)}
                          className="rounded-xl border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <Plus size={11} />
                          <span>Add Product</span>
                        </button>
                      </div>

                      {productsConsumablesList.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {productsConsumablesList.map((prod, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                              <span className="font-semibold text-[#1F251A] truncate">{prod.name} (x{prod.qty})</span>
                              <span className="font-extrabold text-[#1F251A]">{prod.total} EGP</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5A6A51] font-medium pt-1">No products added</p>
                      )}
                    </div>

                    {/* Card B: PRESCRIPTION */}
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                          <FileText size={13} className="text-[#0F3826]" />
                          <span>PRESCRIPTION</span>
                        </div>
                        {drawerPrescriptions.length > 0 && (
                          <span className="text-[10px] font-bold text-[#5A6A51] bg-gray-100 px-2 py-0.5 rounded-full">
                            {drawerPrescriptions[0].date ? new Date(drawerPrescriptions[0].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Recorded"}
                          </span>
                        )}
                      </div>

                      {drawerPrescriptions.length > 0 ? (() => {
                        const rx = drawerPrescriptions[0];
                        const medsList: any[] = Array.isArray(rx.medications) && rx.medications.length > 0
                          ? rx.medications
                          : (Array.isArray(rx.items) ? rx.items : []);
                        const rxNotes = rx.general_notes || rx.instructions || rx.doctor_notes || rx.notes;

                        return (
                          <div className="space-y-2.5">
                            {/* Diagnosis Box */}
                            {rx.diagnosis && (
                              <div className="rounded-xl bg-[#F4F5F1] p-2.5 border border-[#414E36]/10">
                                <span className="text-[10px] font-extrabold text-[#5A6A51] uppercase tracking-wider block">
                                  Diagnosis
                                </span>
                                <p className="font-bold text-xs text-[#1F251A] mt-0.5">
                                  {rx.diagnosis}
                                </p>
                              </div>
                            )}

                            {/* Itemized Medications */}
                            {medsList.length > 0 ? (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-extrabold text-[#5A6A51] uppercase tracking-wider block">
                                  Prescribed Medications ({medsList.length})
                                </span>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pe-1">
                                  {medsList.map((med: any, mIdx: number) => (
                                    <div
                                      key={mIdx}
                                      className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-2 text-xs space-y-1"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-extrabold text-[#1F251A] flex items-center gap-1.5 truncate">
                                          <span className="h-4 w-4 rounded-full bg-[#0F3826]/10 text-[#0F3826] flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {mIdx + 1}
                                          </span>
                                          <span className="truncate">{med.name || med.medicine_name || med.medicine || "Medication"}</span>
                                        </span>
                                        {med.dosage && (
                                          <span className="text-[10px] font-bold text-[#0F3826] bg-[#EBF7EE] px-1.5 py-0.5 rounded shrink-0">
                                            {med.dosage}
                                          </span>
                                        )}
                                      </div>

                                      {(med.frequency || med.duration) && (
                                        <div className="flex items-center gap-2 text-[11px] text-[#5A6A51] ps-5">
                                          {med.frequency && <span><strong>Freq:</strong> {med.frequency}</span>}
                                          {med.frequency && med.duration && <span>•</span>}
                                          {med.duration && <span><strong>Duration:</strong> {med.duration}</span>}
                                        </div>
                                      )}

                                      {med.instructions && (
                                        <p className="text-[11px] text-[#7A8A71] italic ps-5">
                                          ↳ {med.instructions}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : !rx.diagnosis && (
                              <p className="text-xs text-[#1F251A] font-bold">Prescription recorded</p>
                            )}

                            {/* Doctor Clinical Instructions */}
                            {rxNotes && (
                              <div className="rounded-xl bg-[#FBFBF9] p-2 border border-[#414E36]/10 text-xs">
                                <span className="text-[10px] font-extrabold text-[#5A6A51] uppercase tracking-wider block">
                                  Instructions
                                </span>
                                <p className="text-[11px] text-[#1F251A] mt-0.5 whitespace-pre-line leading-relaxed">
                                  {rxNotes}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => handleSendPrescriptionWhatsApp(rx, viewingBooking)}
                                className="flex-1 rounded-xl bg-[#25D366] text-white py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-[#1EBE5D] transition shadow-2xs cursor-pointer"
                              >
                                <MessageSquare size={12} />
                                <span>WhatsApp</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => printPrescription(rx, viewingBooking)}
                                className="flex-1 rounded-xl bg-[#0F3826] text-white py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-[#0A271A] transition shadow-2xs cursor-pointer"
                              >
                                <Printer size={12} />
                                <span>Print Rx</span>
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="py-2">
                          <p className="font-bold text-xs text-[#1F251A]">No prescription recorded</p>
                          <p className="text-[11px] text-[#5A6A51] font-medium mt-0.5">No prescription was written for this session.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. BOOKING INFORMATION CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[10px] uppercase tracking-wider">
                      <Info size={13} className="text-[#0F3826]" />
                      <span>BOOKING INFORMATION</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[#5A6A51] font-medium block">Booked By</span>
                        <span className="font-bold text-[#1F251A] mt-0.5 block">
                          {(() => {
                            const creator = employeesList.find(emp => emp.id === viewingBooking.createdByEmployeeId);
                            return creator ? creator.name : (viewingBooking.isManual ? "Employee" : "Patient");
                          })()}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#5A6A51] font-medium block">Booking Source</span>
                        <span className="font-bold text-[#1F251A] mt-0.5 block">
                          {viewingBooking.isManual ? "Manual Booking" : "Website Booking"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#5A6A51] font-medium block">Created At</span>
                        <span className="font-bold text-[#1F251A] mt-0.5 block">
                          {(() => {
                            const dateVal = (viewingBooking as any).created_at || viewingBooking.createdAt || viewingBooking.date;
                            if (!dateVal) return "—";
                            try {
                              const d = new Date(dateVal);
                              const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                              const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                              return `${day} • ${time}`;
                            } catch {
                              return dateVal;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── RIGHT COLUMN (1/3 width) ── */}
                <div className="lg:col-span-1 space-y-4">
                  
                  {/* 1. SESSION FLOW CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[#EBF7EE] text-[#1E7E34] flex items-center justify-center shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#0F3826]">
                          SESSION FLOW
                        </h4>
                        <p className="text-xs text-[#5A6A51] font-medium leading-tight mt-0.5">
                          {viewingBooking.status === 'completed'
                            ? (isInvoicePaid ? "Session completed and invoice fully settled." : "Treatment completed. Ready for invoice settlement.")
                            : viewingBooking.status === 'started'
                              ? "Treatment currently active with treating doctor."
                              : viewingBooking.status === 'checked_in'
                                ? "Customer is checked in and ready to start session."
                                : "The customer has arrived at the clinic and is ready for check-in."}
                        </p>
                      </div>
                    </div>

                    {/* Action Flow Buttons */}
                    <div className="space-y-2 pt-1">
                      {viewingBooking.status === 'approved' && (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                  method: 'PATCH',
                                  headers: authenticatedJsonHeaders,
                                  body: JSON.stringify({ status: 'confirmed' })
                                });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setViewingBooking(prev => prev ? { ...prev, ...updated, status: 'confirmed' } : null);
                                  fetchRequests();
                                  fetchAllReservations();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="w-full rounded-2xl border border-[#414E36]/20 bg-white py-3 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Check size={14} className="text-[#0F3826]" />
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                  method: 'PATCH',
                                  headers: authenticatedJsonHeaders,
                                  body: JSON.stringify({ status: 'checked_in' })
                                });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setViewingBooking(prev => prev ? { ...prev, ...updated } : null);
                                  fetchRequests();
                                  fetchAllReservations();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <User size={14} />
                            <span>Check In</span>
                          </button>
                        </div>
                      )}

                      {viewingBooking.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                method: 'PATCH',
                                headers: authenticatedJsonHeaders,
                                body: JSON.stringify({ status: 'checked_in' })
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setViewingBooking(prev => prev ? { ...prev, ...updated } : null);
                                fetchRequests();
                                fetchAllReservations();
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <User size={14} />
                          <span>Check In</span>
                        </button>
                      )}

                      {viewingBooking.status === 'checked_in' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                method: 'PATCH',
                                headers: authenticatedJsonHeaders,
                                body: JSON.stringify({ status: 'started' })
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setViewingBooking(prev => prev ? { ...prev, ...updated, status: 'started' } : null);
                                fetchRequests();
                                fetchAllReservations();
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Play size={14} />
                          <span>Start Session</span>
                        </button>
                      )}

                      {viewingBooking.status === 'started' && (
                        <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center text-xs font-extrabold text-amber-900 flex items-center justify-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Treatment In Session</span>
                        </div>
                      )}

                      {viewingBooking.status === 'completed' && (
                        !isInvoicePaid ? (
                          <button
                            type="button"
                            onClick={() => {
                              const b = viewingBooking;
                              setViewingBooking(null);
                              setCheckoutBooking(b);
                            }}
                            className="w-full rounded-2xl bg-[#0F3826] text-white py-3 text-xs font-bold hover:bg-[#0A271A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Receipt size={14} />
                            <span>Pay &amp; Settle Invoice</span>
                          </button>
                        ) : (
                          <div className="w-full rounded-2xl bg-[#EBF7EE] border border-[#C3E6CB] p-3 text-center text-xs font-extrabold text-[#1E7E34]">
                            ✓ Invoice Settled &amp; Paid
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* 2. OTHER ACTIONS CARD */}
                  {!['completed', 'cancelled', 'rejected', 'no_show', 'started'].includes(viewingBooking.status) && hasPermission("bookings.edit") && (
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A51]">OTHER ACTIONS</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPostponeBooking(viewingBooking);
                            setPostponeMode("reschedule");
                            setPostponeNewDate(viewingBooking.date || "");
                            setPostponeNewTime(viewingBooking.timeSlot || "");
                            setPostponeFollowUpDate("");
                          }}
                          className="rounded-2xl border border-[#414E36]/20 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Clock size={13} className="text-[#5A6A51]" />
                          <span>Postpone</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={async () => {
                            if (!(await showConfirm("Cancel this booking? Any deposit paid will be refunded to the patient's wallet."))) return;
                            const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                              method: 'PATCH',
                              headers: authenticatedJsonHeaders,
                              body: JSON.stringify({ action: 'cancel' }),
                            });
                            if (res.ok) {
                              setViewingBooking(null);
                              fetchAllReservations();
                              fetchCustomers();
                            }
                          }}
                          className="rounded-2xl border border-[#414E36]/20 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <XCircle size={13} className="text-[#5A6A51]" />
                          <span>Cancel</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!(await showConfirm("Mark this booking as a no-show? Any deposit paid will be forfeited as a cancellation fee, not refunded."))) return;
                            const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                              method: 'PATCH',
                              headers: authenticatedJsonHeaders,
                              body: JSON.stringify({ action: 'no_show' }),
                            });
                            if (res.ok) {
                              setViewingBooking(null);
                              fetchAllReservations();
                              fetchCustomers();
                            }
                          }}
                          className="rounded-2xl border border-[#FDE8E8] bg-[#FDF2F2] py-2.5 px-2 text-xs font-bold text-[#9B1C1C] hover:bg-rose-100 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <UserX size={13} className="text-[#9B1C1C]" />
                          <span>No Show</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. PAYMENT SUMMARY CARD */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                      <Wallet size={14} className="text-[#0F3826]" />
                      <span>PAYMENT SUMMARY</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-[#1F251A]">
                        <span className="font-semibold text-[#5A6A51]">Service Price</span>
                        <span className="font-bold">{totalPrice} EGP</span>
                      </div>

                      <div className="flex justify-between items-center text-[#1F251A]">
                        <span className="font-semibold text-[#5A6A51]">Paid Amount</span>
                        <span className="font-bold text-emerald-700">{sessionPaid} EGP</span>
                      </div>

                      <div className="flex justify-between items-center text-[#1F251A]">
                        <span className="font-semibold text-[#5A6A51]">Outstanding</span>
                        <span className={`font-bold ${sessionLeft > 0 ? 'text-[#9B1C1C]' : 'text-emerald-700'}`}>
                          {sessionLeft} EGP
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#414E36]/10 flex justify-between items-center">
                        <span className="font-semibold text-[#5A6A51]">Payment Status</span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${
                          isInvoicePaid 
                            ? 'bg-[#EBF7EE] text-[#1E7E34]' 
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {isInvoicePaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const b = viewingBooking;
                          setViewingBooking(null);
                          setInvoiceBooking(b);
                        }}
                        className="rounded-2xl border border-gray-200 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <FileText size={13} className="text-[#5A6A51]" />
                        <span>View Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (viewingBooking) {
                            const branchObj = branches.find(br => br.id === viewingBooking.branchId);
                            const bName = branchObj ? (isRTL ? branchObj.name_ar : branchObj.name_en) : "Revera Clinics";
                            const allInvoiceItems = [
                              ...bookingServices,
                              ...additionalServicesList.map(s => ({ id: s.name, name: s.name, price: s.total })),
                              ...productsConsumablesList.map(p => ({ id: p.name, name: `${p.name} (x${p.qty})`, price: p.total }))
                            ];
                            printInvoice(viewingBooking as any, allInvoiceItems, totalPrice, 0, bName);
                          }
                        }}
                        className="rounded-2xl border border-gray-200 bg-white py-2.5 px-2 text-xs font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Printer size={13} className="text-[#5A6A51]" />
                        <span>Print Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. NOTES CARD (Under Payment Summary) */}
                  {(() => {
                    const cleanBookingNotes = (() => {
                      // Brief 33: prefer reception_notes (clean column) for post-migration bookings
                      const receptionNote = viewingBooking?.receptionNotes ?? null;
                      if (receptionNote !== null && receptionNote !== undefined) return String(receptionNote).trim();
                      // Fallback: regex-clean legacy notes for pre-migration bookings
                      if (!viewingBooking?.notes) return "";
                      let text = String(viewingBooking.notes);
                      text = text.replace(/\[Products Used During Session\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Additional Services(?: Used)?(?: During Session)?\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Device Pulses Deducted\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Extra Device Pulses\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Invoice Total Updated\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Total Invoice\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Added Product\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/\[Added Service\]:[\s\S]*?(?=\[|$)/gi, "");
                      text = text.replace(/-\s+[\s\S]*?\(x\d+\)\s+@\s+\d+[\s\S]*?EGP/gi, "");
                      return text.trim();
                    })();

                    return (
                      <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[#0F3826] font-extrabold text-[11px] uppercase tracking-wider">
                            <FileText size={14} className="text-[#0F3826]" />
                            <span>NOTES</span>
                          </div>
                          {hasPermission("bookings.edit") && viewingBooking.status !== 'completed' && !isEditingNotes && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotesDraft(cleanBookingNotes);
                                setIsEditingNotes(true);
                              }}
                              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1F251A] hover:bg-gray-50 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Pencil size={11} />
                              <span>{cleanBookingNotes ? "Edit Note" : "+ Add Note"}</span>
                            </button>
                          )}
                        </div>

                        {isEditingNotes ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={3}
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              placeholder="Enter notes, observations, or instructions..."
                              className="w-full rounded-xl border border-[#414E36]/20 bg-[#FBFBF9] p-2.5 text-xs text-[#1F251A] outline-none focus:border-[#0F3826]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingNotes(false)}
                                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const cleanNote = notesDraft.trim();
                                  await saveNotes(cleanNote);
                                  setViewingBooking((prev: any) => prev ? { ...prev, receptionNotes: cleanNote } : null);
                                  setIsEditingNotes(false);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-[#0F3826] text-white text-xs font-bold hover:bg-[#0A271A] transition shadow-xs cursor-pointer"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : cleanBookingNotes ? (
                          <div className="rounded-xl bg-[#F7F7F3] border border-[#414E36]/10 p-3 text-xs text-[#1F251A] whitespace-pre-line leading-relaxed">
                            {cleanBookingNotes}
                          </div>
                        ) : (
                          <p className="text-xs text-[#5A6A51] font-medium pt-0.5">
                            No notes recorded for this booking.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Add Product Modal for Booking Drawer */}
      {showDrawerProductModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <h3 className="text-base font-bold text-[#1F251A]">Add Product / Session Consumable</h3>
              <button
                onClick={() => {
                  setShowDrawerProductModal(false);
                  setSelectedDrawerProductId("");
                  setSelectedDrawerProductQty(1);
                }}
                className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F251A] mb-1">Select Skincare / Medical Product</label>
                <select
                  value={selectedDrawerProductId}
                  onChange={(e) => setSelectedDrawerProductId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#414E36]"
                >
                  <option value="">-- Select Product --</option>
                  {(inventoryProducts || [])
                    .filter((p: any) => p.role !== 'consumable')
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — EGP {p.price || p.unit_price || p.selling_price || 0} (Stock: {p.stock ?? p.quantity ?? p.stock_quantity ?? 'N/A'})
                      </option>
                  ))}
                </select>
              </div>

              {selectedDrawerProductId && (() => {
                const selectedProd = (inventoryProducts || [])
                  .find((p: any) => String(p.id) === String(selectedDrawerProductId));
                const unitPrice = Number(selectedProd?.price || selectedProd?.unit_price || selectedProd?.selling_price || 0);
                const totalCost = unitPrice * selectedDrawerProductQty;

                return (
                  <div className="rounded-xl bg-[#FBFBF9] p-3 space-y-2 border border-[#414E36]/10">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-600">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDrawerProductQty(Math.max(1, selectedDrawerProductQty - 1))}
                          className="w-7 h-7 rounded-lg bg-gray-200 font-bold flex items-center justify-center hover:bg-gray-300 transition text-sm"
                        >
                          -
                        </button>
                        <span className="font-bold text-[#1F251A] px-2 text-sm">{selectedDrawerProductQty}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDrawerProductQty(selectedDrawerProductQty + 1)}
                          className="w-7 h-7 rounded-lg bg-gray-200 font-bold flex items-center justify-center hover:bg-gray-300 transition text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                      <span className="font-semibold text-gray-600">Unit Price:</span>
                      <span className="font-bold text-[#1F251A]">{unitPrice} EGP</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold border-t border-gray-200 pt-2 text-[#414E36]">
                      <span>Added to Invoice:</span>
                      <span>{totalCost} EGP</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDrawerProductModal(false);
                  setSelectedDrawerProductId("");
                  setSelectedDrawerProductQty(1);
                }}
                className="w-1/2 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDrawerProductId}
                onClick={handleAddProductToViewingBooking}
                className="w-1/2 rounded-xl bg-[#414E36] py-2.5 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 shadow-sm"
              >
                Add to Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prescription Modal for Booking Drawer */}
      {showDrawerPrescriptionModal && viewingBooking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8 border border-[#414E36]/10">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4AE7C]">Digital Rx</span>
                <h3 className="text-base font-bold text-[#1F251A] mt-0.5">Add Prescription for {viewingBooking.name}</h3>
              </div>
              <button
                onClick={() => {
                  setShowDrawerPrescriptionModal(false);
                  setDrawerRxDiagnosis("");
                  setDrawerRxMeds([{ name: "", dosage: "", frequency: "", duration: "" }]);
                  setDrawerRxNotes("");
                }}
                className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDrawerPrescription} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1F251A] mb-1">Clinical Diagnosis / التشخيص</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skin rejuvenation, Acne treatment, Post-laser care"
                  value={drawerRxDiagnosis}
                  onChange={(e) => setDrawerRxDiagnosis(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#1F251A]">Prescribed Medications / الأدوية</label>
                  <button
                    type="button"
                    onClick={() => setDrawerRxMeds(prev => [...prev, { name: "", dosage: "", frequency: "", duration: "" }])}
                    className="text-[11px] font-bold text-[#414E36] hover:underline"
                  >
                    + Add Medication
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {drawerRxMeds.map((med, mIdx) => (
                    <div key={mIdx} className="p-2.5 rounded-xl bg-[#FBFBF9] border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-[#5A6A51]">Medication #{mIdx + 1}</span>
                        {drawerRxMeds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDrawerRxMeds(prev => prev.filter((_, i) => i !== mIdx))}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Medication Name"
                          value={med.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, name: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg, 1 tab)"
                          value={med.dosage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, dosage: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Frequency (e.g. Twice daily)"
                          value={med.frequency}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, frequency: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 7 days)"
                          value={med.duration}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrawerRxMeds(prev => prev.map((item, i) => i === mIdx ? { ...item, duration: val } : item));
                          }}
                          className="rounded-lg border border-gray-300 p-2 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F251A] mb-1">Doctor Instructions & Advice / تعليمات الطبيب</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Avoid direct sunlight, apply sunscreen every 2 hours, drink plenty of water."
                  value={drawerRxNotes}
                  onChange={(e) => setDrawerRxNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-[#1F251A] outline-none focus:border-[#414E36]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDrawerPrescriptionModal(false);
                    setDrawerRxDiagnosis("");
                    setDrawerRxMeds([{ name: "", dosage: "", frequency: "", duration: "" }]);
                    setDrawerRxNotes("");
                  }}
                  className="w-1/2 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDrawerRx}
                  className="w-1/2 rounded-xl bg-[#414E36] py-2.5 text-xs font-bold text-white hover:bg-[#343F2B] transition disabled:opacity-50 shadow-sm"
                >
                  {savingDrawerRx ? "Saving..." : "Save Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Cancellations Modal */}
      {showCancellationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-4xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[85vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Quick actions</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">Canceled & Rejected Requests</h3>
              </div>
              <button
                onClick={() => setShowCancellationsModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            {allReservations.filter(r => r.status === 'rejected').length === 0 ? (
              <p className="py-12 text-center text-[#5A6A51] font-semibold">No canceled bookings found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 text-xs font-bold uppercase tracking-wider text-[#5A6A51]">
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Original Date</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReservations.filter(r => r.status === 'rejected').map(r => {
                      const service = localServices.find(s => s.id === r.serviceId);
                      return (
                        <tr key={r.id} className="border-b border-[#414E36]/5 hover:bg-[#F2EFE9]/20 transition text-sm text-[#1F251A]">
                          <td className="py-3 px-4 font-semibold">{r.name}</td>
                          <td className="py-3 px-4">{service ? service.en : `Service #${r.serviceId}`}</td>
                          <td className="py-3 px-4">{r.date}</td>
                          <td className="py-3 px-4">{r.phone}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={async () => {
                                await fetch(`/api/reservations?id=${r.id}`, {
                                  method: 'PATCH',
                                  headers: authenticatedJsonHeaders,
                                  body: JSON.stringify({ status: 'pending' })
                                });
                                fetchRequests();
                                fetchAllReservations();
                                alert(`Restored request for ${r.name}`);
                              }}
                              className="rounded-3xl border border-[#414E36]/20 bg-white px-4 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#f7f6f2] transition"
                            >
                              Restore Request
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Today's Bookings Modal */}
      {showTodayBookingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-2xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)]">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Quick actions</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                  Today's Bookings • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>
              <button
                onClick={() => setShowTodayBookingsModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const getLocalDateString = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              };
              const todayStr = getLocalDateString(new Date());
              const todaysBookings = allReservations.filter(
                r => String(r.date).slice(0, 10) === todayStr &&
                  ['approved', 'confirmed', 'started', 'completed', 'pending'].includes(r.status)
              );

              if (todaysBookings.length === 0) {
                return (
                  <p className="py-12 text-center text-[#5A6A51] font-semibold">No bookings scheduled for today.</p>
                );
              }

              return (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {todaysBookings.map(r => {
                    const service = localServices.find(s => s.id === r.serviceId);
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setShowTodayBookingsModal(false);
                          setViewingBooking(r);
                        }}
                        className="flex items-center justify-between rounded-2xl border border-[#414E36]/10 bg-white p-4 cursor-pointer hover:border-[#C4AE7C]/30 transition shadow-[0_4px_15px_rgba(0,0,0,0.02)]"
                      >
                        <div>
                          <p className="font-bold text-[#1F251A]">{r.name}</p>
                          <p className="text-xs text-[#5A6A51] mt-1">
                            {service ? service.en : `Service #${r.serviceId}`} • {r.timeSlot ? `@ ${r.timeSlot}` : 'Time not specified'}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#C4AE7C]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-[#414E36]">
                          {r.sessionType === 'online' ? 'Online' : 'In Person'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. Filter Bookings Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)]">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Quick actions</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">Filter Calendar Bookings</h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'approved', 'pending', 'rejected', 'pending_deposit', 'postponed', 'no_show'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-2xl border px-3 py-2.5 text-xs font-bold transition ${
                        statusFilter === st
                          ? 'border-[#414E36] bg-[#414E36] text-[#FBFBF9]'
                          : 'border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f7f6f2]'
                      }`}
                    >
                      {st === 'approved' ? 'Approved' : st === 'pending' ? 'Pending' : st === 'rejected' ? 'Rejected' : st === 'pending_deposit' ? 'Pending Deposit' : st === 'postponed' ? 'Postponed' : st === 'no_show' ? 'No Show' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Session Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['All', 'in_person', 'online'].map(ty => (
                    <button
                      key={ty}
                      onClick={() => setTypeFilter(ty)}
                      className={`rounded-2xl border px-3 py-2.5 text-xs font-bold transition ${
                        typeFilter === ty
                          ? 'border-[#414E36] bg-[#414E36] text-[#FBFBF9]'
                          : 'border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f7f6f2]'
                      }`}
                    >
                      {ty === 'in_person' ? 'In Person' : ty === 'online' ? 'Online' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Doctor / Provider</label>
                <select
                  value={docFilter}
                  onChange={(e) => setDocFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C] cursor-pointer font-semibold"
                >
                  <option value="All">All Doctors</option>
                  {providers.map(p => (
                    <option key={p.id || p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFilter === "All" ? "" : dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || "All")}
                    className="flex-1 rounded-2xl border border-[#414E36]/15 bg-white px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C] font-semibold"
                  />
                  {dateFilter !== "All" && (
                    <button
                      onClick={() => setDateFilter('All')}
                      className="rounded-2xl border border-[#414E36]/15 bg-white px-4 py-3 text-xs font-bold text-[#5A6A51] transition hover:bg-[#f7f6f2]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-[#414E36]/10 pt-4 flex gap-3">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 rounded-3xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition text-center"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setTypeFilter('All');
                    setDocFilter('All');
                    setDateFilter('All');
                    setShowFilterModal(false);
                  }}
                  className="flex-1 rounded-3xl border border-[#414E36]/20 bg-white py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] transition text-center"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Actions Menu Modal */}
      {showActionsMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)]">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Quick actions</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">Actions Menu</h3>
              </div>
              <button
                onClick={() => setShowActionsMenuModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => {
                  setShowActionsMenuModal(false);
                  setShowAddBookingModal(true);
                }}
                className="w-full rounded-2xl bg-[#414E36] py-3.5 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
              >
                + Add Manual Booking
              </button>
              <button
                onClick={() => {
                  if (allReservations.length === 0) {
                    alert("No reservations to export.");
                    return;
                  }
                  const headers = ["ID", "Patient Name", "Email", "Phone", "Date", "Time Slot", "Session Type", "Doctor", "Status", "Notes"];
                  const rows = allReservations.map(r => [
                    r.id,
                    r.name,
                    r.email,
                    r.phone,
                    r.date,
                    r.timeSlot || r.requestedTime || "",
                    r.sessionType || "in_person",
                    r.doctorName || "",
                    r.status,
                    (r.notes || "").replace(/"/g, '""')
                  ]);
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
                  
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `reservations_${new Date().toISOString().slice(0,10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setShowActionsMenuModal(false);
                }}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3.5 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] transition"
              >
                Export Bookings to CSV
              </button>

            </div>
          </div>
        </div>
      )}

      {/* 5. Add Booking Modal */}
      {showAddBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4">
          <div className="w-full max-w-xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Quick actions</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">Add Manual Reservation</h3>
              </div>
              <button
                onClick={() => setShowAddBookingModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 0. Select an existing patient, instead of relying on the phone field to match one */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">
                  Select Existing Patient (optional)
                </label>
                <input
                  type="text"
                  placeholder="Search patients by name or phone..."
                  value={patientSearchQuery}
                  onChange={(e) => {
                    setPatientSearchQuery(e.target.value);
                    setShowPatientSearchResults(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => setShowPatientSearchResults(patientSearchQuery.trim().length > 0)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
                {matchedCustomerId && (
                  <p className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                    ✓ Existing patient found{newPatientName ? `: ${newPatientName}` : ""}
                    <button
                      type="button"
                      onClick={() => setMatchedCustomerId(null)}
                      className="text-[#5A6A51] underline hover:text-[#414E36]"
                    >
                      Not them?
                    </button>
                  </p>
                )}
                {showPatientSearchResults && patientSearchQuery.trim().length > 0 && (() => {
                  const q = patientSearchQuery.trim().toLowerCase();
                  const matches = dbCustomers
                    .filter((c: any) => {
                      const phone = String(c.mobile || c.phone || "").toLowerCase();
                      return String(c.name || "").toLowerCase().includes(q) || phone.includes(q);
                    })
                    .slice(0, 8);
                  return (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-2xl border border-[#414E36]/15 bg-white shadow-lg">
                      {matches.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#8A9A81] italic">No matching patients — filling in the fields below will create a new one.</p>
                      ) : (
                        matches.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectExistingPatientForBooking(c)}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[#EDF1EC] border-b border-[#414E36]/5 last:border-b-0"
                          >
                            <span className="font-semibold text-[#1F251A]">{c.name}</span>
                            <span className="text-xs text-[#5A6A51]">{c.mobile || c.phone}</span>
                          </button>
                        ))
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 1. Phone Number at top */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="Enter phone (e.g. 01012345678)"
                  value={newPatientPhone}
                  onChange={(e) => handleManualPhoneChange(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] mb-2"
                />
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#414E36]">
                    <input
                      type="checkbox"
                      checked={isManualWhatsappSame}
                      onChange={(e) => setIsManualWhatsappSame(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#414E36] focus:ring-[#414E36]"
                    />
                    <span>This is the WhatsApp number too</span>
                  </label>
                  {!isManualWhatsappSame && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">WhatsApp Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Enter WhatsApp number"
                        value={newPatientWhatsapp}
                        onChange={(e) => setNewPatientWhatsapp(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {matchedCustomerId && (() => {
                const svc = localServices.find((s) => s.id === newPatientService);
                const promos = svc
                  ? (() => {
                      const details = getServicePriceDetails(svc, newPatientBranch, branches);
                      return details.hasPromotion ? [{ serviceName: svc.en, promotionText: details.promotionText || "" }] : [];
                    })()
                  : [];
                return <PatientPackagePromoBanner packages={manualBookingCustomerPackages} promotions={promos} />;
              })()}

              {/* 2. Patient Name and Email side-by-side */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email"
                    value={newPatientEmail}
                    onChange={(e) => setNewPatientEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              {/* 3. Booking Date and Time Slot stacked vertically */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Booking Date *</label>
                  <input
                    type="date"
                    required
                    value={newPatientDate}
                    onChange={(e) => setNewPatientDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Time Slot / Requested Time</label>
                  <select
                    value={newPatientTimeSlot}
                    onChange={(e) => setNewPatientTimeSlot(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    {(() => {
                      const { start, end } = getDayOperatingHoursAdmin(newPatientDate);
                      const filteredSlots = SLOTS.filter((s) => {
                        const norm = normaliseTo24hSlot(s) ?? "";
                        return norm >= start && norm < end;
                      });
                      return filteredSlots.map(s => {
                        const isUnavailable = manualUnavailableSlots.includes(s);
                        return (
                          <option key={s} value={s} disabled={isUnavailable}>
                            {s} {isUnavailable ? "(Unavailable)" : ""}
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
              </div>

              {/* 4. Service Type and Session Type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Service Type</label>
                  <select
                    value={newPatientService}
                    onChange={(e) => setNewPatientService(Number(e.target.value))}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    {localServices.map(s => (
                      <option key={s.id} value={s.id}>{s.en} ({s.cat})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Session Type</label>
                  <select
                    value={newPatientSessionType}
                    onChange={(e) => setNewPatientSessionType(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    {(() => {
                      const selectedSvc = localServices.find(s => s.id === newPatientService);
                      let allowedType = selectedSvc?.unit?.toLowerCase() || "both";
                      if (allowedType !== "both" && allowedType !== "in_clinic" && allowedType !== "online") {
                        allowedType = "both";
                      }
                      const showInClinic = allowedType === "both" || allowedType === "in_clinic";
                      const showOnline = allowedType === "both" || allowedType === "online";
                      return (
                        <>
                          {showInClinic && <option value="in_person">In Person / في العيادة</option>}
                          {showOnline && <option value="online">Online / أونلاين</option>}
                        </>
                      );
                    })()}
                  </select>
                </div>
              </div>

              {/* 5. Branch and Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Branch</label>
                  <select
                    value={newPatientBranch}
                    onChange={(e) => setNewPatientBranch(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name_en} / {b.name_ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Status</label>
                  <select
                    value={newPatientStatus}
                    onChange={(e) => setNewPatientStatus(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    <option value="approved">Approved (Active Booking)</option>
                    <option value="pending">Pending (Awaiting Approval)</option>
                    <option value="rejected">Rejected (Canceled Booking)</option>
                  </select>
                </div>
              </div>

              {/* 6. Doctor Name if Approved */}
              {newPatientStatus === 'approved' && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Assign Doctor</label>
                  <select
                    value={newPatientDoctor}
                    onChange={(e) => setNewPatientDoctor(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                  >
                    {availableDoctorsNewPatient.map(p => (
                      <option key={p.id || p.name} value={p.name}>{p.name}</option>
                    ))}
                    {availableDoctorsNewPatient.length === 0 && (
                      <option value="">No Available Doctors</option>
                    )}
                  </select>
                </div>
              )}

              {/* Created By Employee Selector */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Created By (Employee Credit) *</label>
                <select
                  value={newPatientCreatedByEmployeeId}
                  onChange={(e) => setNewPatientCreatedByEmployeeId(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {(employeesList || []).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role_name || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Notes */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Notes (Optional)</label>
                <textarea
                  placeholder="Add details/notes about this appointment"
                  value={newPatientNotes}
                  onChange={(e) => setNewPatientNotes(e.target.value)}
                  className="w-full min-h-[80px] rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div className="border-t border-[#414E36]/10 pt-4 flex gap-3">
                <button
                  onClick={handleCreateManualBooking}
                  className="flex-1 rounded-3xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] text-center"
                >
                  Create Booking
                </button>
                <button
                  onClick={() => setShowAddBookingModal(false)}
                  className="flex-1 rounded-3xl border border-[#414E36]/20 bg-[#fff] py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-2xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[85vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Search</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">Search Bookings & Requests</h3>
              </div>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                }}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5">
              <input
                type="text"
                placeholder="Search by patient name, email, phone, notes, status, doctor name, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-3 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
              />
            </div>

            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = allReservations.filter(r => {
                if (!q) return true;
                return (
                  r.name.toLowerCase().includes(q) ||
                  r.email.toLowerCase().includes(q) ||
                  r.phone.toLowerCase().includes(q) ||
                  (r.notes || "").toLowerCase().includes(q) ||
                  r.status.toLowerCase().includes(q) ||
                  (r.doctorName || "").toLowerCase().includes(q) ||
                  r.date.includes(q)
                );
              });

              if (filtered.length === 0) {
                return (
                  <p className="py-8 text-center text-[#5A6A51] font-semibold">No bookings match your search query.</p>
                );
              }

              return (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filtered.map(r => {
                    const service = localServices.find(s => s.id === r.serviceId);
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setShowSearchModal(false);
                          setSearchQuery("");
                          if (['approved', 'confirmed', 'started', 'completed'].includes(r.status)) {
                            setViewingBooking(r);
                          } else {
                            alert(`This booking request is ${r.status}. You can review it in the Pending approvals section.`);
                            document.getElementById("pending-approvals-section")?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="flex items-center justify-between rounded-2xl border border-[#414E36]/10 bg-white p-4 cursor-pointer hover:border-[#C4AE7C]/30 transition shadow-[0_4px_15px_rgba(0,0,0,0.02)]"
                      >
                        <div>
                          <p className="font-bold text-[#1F251A]">{r.name}</p>
                          <p className="text-xs text-[#5A6A51] mt-1">
                            {service ? service.en : `Service #${r.serviceId}`} • {r.date} {r.timeSlot ? `@ ${r.timeSlot}` : r.requestedTime ? `@ ${r.requestedTime}` : ""} • <span className="font-semibold text-[#414E36]">{branches.find(b => b.id === r.branchId)?.name_en || "Default/All"}</span>
                          </p>
                          {r.doctorName && (
                            <p className="text-xs text-[#C4AE7C] mt-0.5 font-semibold">
                              Doctor: {r.doctorName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            getStatusBadgeClass(r.status)
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add/Edit Provider Modal */}
      <ProviderFormModal
        providerForm={providerForm}
        branches={branches}
        allServicesList={allServicesList}
        getDoctorFirstReservationDate={getDoctorFirstReservationDate}
        allReservations={allReservations}
        parseEgyptianNationalId={parseEgyptianNationalId}
        lang={lang}
        t={adminTranslations[lang].doctors.providerFormModal}
        tFormFields={adminTranslations[lang].doctors.providerFormFields}
      />

      {/* Doctor Schedule Audit Logs Modal */}
      {showAuditLogsModal && (
        <DoctorAuditLogsModal
          onClose={() => setShowAuditLogsModal(false)}
          authenticatedJsonHeaders={authenticatedJsonHeaders}
          lang={lang}
          t={adminTranslations[lang].doctors.doctorAuditLogsModal}
        />
      )}

      {/* ── EXPORT CUSTOMERS MODAL ── */}
      {showExportCustomersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowExportCustomersModal(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#414E36]/10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#414E36]/10 bg-[#F9F9F7]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1EC] text-[#414E36]">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1F251A]">Export Customers</h3>
                  <p className="text-xs text-[#5A6A51]">{customers.length} customer{customers.length !== 1 ? "s" : ""} will be exported</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportCustomersModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#5A6A51]">
                The exported CSV file will contain the following data columns for each customer:
              </p>

              {/* Column Chips */}
              <div className="flex flex-wrap gap-2">
                {["ID", "Customer Name", "Mobile", "Gender", "Email", "Number of Bookings", "Registration Date", "Active", "Spent Amount", "Outstanding", "Area", "Location Name", "Street Name", "Building No.", "Floor No.", "Note"].map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#414E36]/15 bg-[#EDF1EC] px-3 py-1 text-xs font-medium text-[#414E36]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C4AE7C] flex-shrink-0" />
                    {col}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#414E36]/10 bg-[#F9F9F7] p-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#1F251A]">{customers.length}</p>
                  <p className="text-xs text-[#5A6A51] mt-0.5">Total Patients</p>
                </div>
                <div className="text-center border-x border-[#414E36]/10">
                  <p className="text-xl font-bold text-[#1F251A]">16</p>
                  <p className="text-xs text-[#5A6A51] mt-0.5">Columns</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#414E36]">CSV</p>
                  <p className="text-xs text-[#5A6A51] mt-0.5">Format</p>
                </div>
              </div>

              <p className="text-xs text-[#5A6A51] flex items-center gap-1.5">
                <FileText size={12} className="text-[#C4AE7C]" />
                The file will be UTF-8 encoded (BOM) for full compatibility with Microsoft Excel and Google Sheets.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#414E36]/10 bg-[#F9F9F7]">
              <button
                onClick={() => setShowExportCustomersModal(false)}
                className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC]"
              >
                Cancel
              </button>
              <button
                onClick={handleExportCustomersCSV}
                disabled={loadingCustomers}
                className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download size={15} />
                {loadingCustomers ? "Loading..." : "Export CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT CUSTOMERS MODAL ── */}
      {showImportCustomersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget && !importLoading) handleCloseImportModal(); }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-[#414E36]/10 overflow-hidden my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#414E36]/10 bg-[#F9F9F7]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1EC] text-[#414E36]">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1F251A]">Import Customers / Patients</h3>
                  <p className="text-xs text-[#5A6A51]">Upload a CSV file containing patient demographic details</p>
                </div>
              </div>
              <button
                disabled={importLoading}
                onClick={handleCloseImportModal}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36] disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {!importFile ? (
                // Step 1: Upload File Instructions and Box
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#414E36]/25 rounded-2xl p-8 bg-[#FBFBF9] hover:bg-[#F5F4F0] transition group relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-10 w-10 text-[#C4AE7C] mb-3 transition-transform group-hover:-translate-y-1" />
                  <span className="text-sm font-semibold text-[#1F251A]">Click to select CSV File</span>
                  <span className="text-xs text-[#5A6A51] mt-1">Accepts standard .csv comma-separated values</span>
                  <div className="mt-4 text-[10px] text-gray-400 text-center max-w-sm">
                    For best matching, make sure your CSV contains columns like: <strong>Name, Phone/Mobile, Email, Gender, National ID, Age</strong>.
                  </div>
                </div>
              ) : (
                // Step 2: File Selected and Parsed
                <div className="space-y-4">
                  {/* File Info Card */}
                  <div className="flex items-center justify-between rounded-xl border border-[#414E36]/10 bg-[#F9F9F7] p-3">
                    <div className="flex items-center gap-3">
                      <FileText size={24} className="text-[#C4AE7C]" />
                      <div>
                        <p className="text-sm font-semibold text-[#1F251A]">{importFile.name}</p>
                        <p className="text-xs text-[#5A6A51]">
                          {(importFile.size / 1024).toFixed(1)} KB • {importRows.length} rows found
                        </p>
                      </div>
                    </div>
                    {!importLoading && (
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setImportRows([]);
                          setImportHeaders([]);
                          setImportError("");
                          setImportLog([]);
                        }}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Change File
                      </button>
                    )}
                  </div>

                  {importError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                      {importError}
                    </div>
                  )}

                  {/* CSV Columns Detected */}
                  {!importLoading && importHeaders.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Headers Detected</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {importHeaders.map(h => (
                          <span key={h} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 border border-gray-200">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rows Preview */}
                  {!importLoading && importRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Preview (First 3 Rows Mapping)</h4>
                      <div className="overflow-x-auto rounded-xl border border-[#414E36]/10 bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-[#5A6A51]">Name</th>
                              <th className="px-3 py-2 font-semibold text-[#5A6A51]">Phone</th>
                              <th className="px-3 py-2 font-semibold text-[#5A6A51]">Email</th>
                              <th className="px-3 py-2 font-semibold text-[#5A6A51]">National ID</th>
                              <th className="px-3 py-2 font-semibold text-[#5A6A51]">Gender</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importRows.slice(0, 3).map((row, idx) => {
                              const m = mapRowToCustomer(row);
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="px-3 py-2 font-medium text-[#1F251A]">{m.name || <span className="text-red-400 italic">Missing</span>}</td>
                                  <td className="px-3 py-2 text-gray-600">{m.mobile || <span className="text-red-400 italic">Missing</span>}</td>
                                  <td className="px-3 py-2 text-gray-600">{m.email || "-"}</td>
                                  <td className="px-3 py-2 text-gray-600">{m.national_id || "-"}</td>
                                  <td className="px-3 py-2 text-gray-600">{m.gender || "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Progress & Live Log */}
                  {(importLoading || importLog.length > 0) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1F251A]">
                          {importLoading ? `Importing patients...` : "Import Complete"}
                        </span>
                        <span className="font-bold text-[#C4AE7C]">{importProgress}%</span>
                      </div>
                      
                      {/* Progress Bar container */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#414E36] transition-all duration-200"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>

                      {/* Log Container */}
                      <div className="h-40 overflow-y-auto rounded-xl border border-[#414E36]/10 bg-gray-50 p-3 space-y-1 text-[11px] font-mono">
                        {importLog.map((log, idx) => (
                          <div key={idx} className="flex justify-between items-center py-0.5 border-b border-gray-100/50 last:border-0">
                            <span className="font-medium text-gray-700 truncate max-w-sm">{log.name}</span>
                            {log.status === "success" ? (
                              <span className="text-green-600 font-semibold bg-green-50 px-1.5 rounded">Success</span>
                            ) : (
                              <span className="text-red-600 font-semibold bg-red-50 px-1.5 rounded" title={log.error}>
                                Error: {log.error || "failed"}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#414E36]/10 bg-[#F9F9F7]">
              <button
                disabled={importLoading}
                onClick={handleCloseImportModal}
                className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC] disabled:opacity-50"
              >
                {importProgress === 100 ? "Close" : "Cancel"}
              </button>
              {importFile && importRows.length > 0 && importProgress < 100 && (
                <button
                  onClick={handleStartImport}
                  disabled={importLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] disabled:opacity-60"
                >
                  {importLoading ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    `Import ${importRows.length} Patients`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── DELETE CUSTOMER CONFIRMATION MODAL ── */}
      {deleteCustomerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#FBFBF9] p-6 shadow-2xl border border-[#414E36]/10">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1F251A]">Delete Customer?</h3>
                <p className="mt-2 text-sm text-[#5A6A51] leading-relaxed">
                  Are you sure you want to delete the customer profile for{" "}
                  <span className="font-semibold text-[#1F251A]">{deleteCustomerTarget.name}</span>?
                  This action will permanently remove their records from Supabase. Any linked reservations will be unlinked (set to guest status).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-4">
              <button
                type="button"
                onClick={() => setDeleteCustomerTarget(null)}
                className="rounded-lg border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomer(deleteCustomerTarget.id!)}
                disabled={deletingCustomer}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingCustomer ? "Deleting..." : "Yes, Delete Customer"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Setup Password Modal (shown after accepting invite or password reset) ── */}
      {showSetupPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 rounded-3xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#1F251A] to-[#414E36] px-8 py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C4AE7C]/20 ring-2 ring-[#C4AE7C]/40">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#C4AE7C" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Set Your Password</h2>
              <p className="text-sm text-[#C4AE7C]/80">
                Welcome! Please create a secure password to complete your account setup.
              </p>
            </div>

            {/* Body */}
            <div className="px-8 py-7">
              {setupSuccess ? (
                <div className="flex flex-col items-center gap-4 text-center py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-green-700 font-semibold text-base">{setupSuccess}</p>
                  <p className="text-sm text-[#5A6A51]">You will be redirected automatically…</p>
                </div>
              ) : (
                <form onSubmit={handleSetupPassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6A51] mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-3 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                      disabled={setupLoading}
                      autoFocus
                    />
                    {setupPassword && (
                  <div className="mt-2 text-xs space-y-1 font-semibold text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span className={setupPassword.length >= 8 ? "text-green-600" : ""}>
                        {setupPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[A-Z]/.test(setupPassword) && /[a-z]/.test(setupPassword) ? "text-green-600" : ""}>
                        {/[A-Z]/.test(setupPassword) && /[a-z]/.test(setupPassword) ? "✓" : "○"} Uppercase & lowercase letters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/\d/.test(setupPassword) ? "text-green-600" : ""}>
                        {/\d/.test(setupPassword) ? "✓" : "○"} At least one number
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={/[^A-Za-z0-9]/.test(setupPassword) ? "text-green-600" : ""}>
                        {/[^A-Za-z0-9]/.test(setupPassword) ? "✓" : "○"} At least one special character (e.g. @$!%*?&#)
                      </span>
                    </div>
                  </div>
                )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6A51] mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={setupConfirmPassword}
                      onChange={(e) => setSetupConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-3 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                      disabled={setupLoading}
                    />
                  </div>

                  {setupError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                      {setupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={setupLoading}
                    className="w-full rounded-xl bg-[#414E36] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {setupLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Setting password…
                      </span>
                    ) : "Confirm & Access Dashboard"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── POSTPONE BOOKING MODAL ── */}
      {postponeBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FBFBF9] p-6 shadow-2xl border border-[#414E36]/10">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C4AE7C]">Reschedule</p>
                <h3 className="text-xl font-bold text-[#1F251A] mt-1">Postpone Booking</h3>
              </div>
              <button
                onClick={() => setPostponeBooking(null)}
                className="rounded-full bg-[#F2EFE9] p-2 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 rounded-2xl border border-[#414E36]/10 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setPostponeMode("reschedule")}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${postponeMode === "reschedule" ? "bg-[#414E36] text-white" : "text-[#414E36]"}`}
                >
                  I know the new date
                </button>
                <button
                  type="button"
                  onClick={() => setPostponeMode("followup")}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${postponeMode === "followup" ? "bg-[#414E36] text-white" : "text-[#414E36]"}`}
                >
                  Not sure yet
                </button>
              </div>

              {postponeMode === "reschedule" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5A6A51] mb-1">New Date</label>
                    <input
                      type="date"
                      value={postponeNewDate}
                      onChange={(e) => setPostponeNewDate(e.target.value)}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5A6A51] mb-1">New Time</label>
                    <select
                      value={postponeNewTime}
                      onChange={(e) => setPostponeNewTime(e.target.value)}
                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                    >
                      <option value="">Select time</option>
                      {ALL_15MIN_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] mb-1">Follow Up Around</label>
                  <input
                    type="date"
                    value={postponeFollowUpDate}
                    onChange={(e) => setPostponeFollowUpDate(e.target.value)}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                  <p className="text-[11px] text-[#8A9A81] mt-1.5">
                    The booking will be marked Postponed with no confirmed date until you come back and reschedule it.
                  </p>
                </div>
              )}

              <button
                disabled={savingPostpone || (postponeMode === "reschedule" ? !postponeNewDate : !postponeFollowUpDate)}
                onClick={async () => {
                  setSavingPostpone(true);
                  try {
                    const payload =
                      postponeMode === "reschedule"
                        ? { action: "postpone", date: postponeNewDate, timeSlot: postponeNewTime || undefined }
                        : { action: "postpone", followUpDate: postponeFollowUpDate };
                    const res = await fetch(`/api/reservations?id=${postponeBooking.id}`, {
                      method: "PATCH",
                      headers: authenticatedJsonHeaders,
                      body: JSON.stringify(payload),
                    });
                    if (res.ok) {
                      setPostponeBooking(null);
                      setViewingBooking(null);
                      fetchAllReservations();
                    } else {
                      const err = await res.json();
                      alert(err.error || "Failed to postpone booking.");
                    }
                  } catch (err) {
                    console.error(err);
                    alert("Error postponing booking.");
                  } finally {
                    setSavingPostpone(false);
                  }
                }}
                className="w-full rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
              >
                {savingPostpone ? "Saving..." : postponeMode === "reschedule" ? "Reschedule Booking" : "Mark as Postponed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT SETTLEMENT MODAL ── */}
      {checkoutBooking && (
        (() => {
          // 1. Calculate service cost
          const svcIds = Array.isArray(checkoutBooking.serviceIds) ? checkoutBooking.serviceIds : [checkoutBooking.serviceId];
          // A deposit collected at reservation time (BookingModal's "declare deposit paid" step)
          // is already stored on the booking as amountPaid — checkout must charge only what's
          // left of the service price, not the full price again. RISK-029.
          const depositAlreadyPaid = Number(checkoutBooking.amountPaid) || 0;
          const activeCustomerPackageItems = checkoutCustomerPackages
            .filter((pkg: any) => pkg.status === "active" && (!pkg.expiresAt || new Date(pkg.expiresAt) >= new Date()))
            .flatMap((pkg: any) => (pkg.items || []).map((it: any) => ({ ...it, packageName: pkg.packageName })));
          const bookingServicesList = svcIds.map((id: number) => {
            const s = localServices.find(srv => srv.id === id);
            const details = s ? getServicePriceDetails(s, checkoutBooking.branchId, branches) : null;
            // Match service with active package item
            const redeemableItem = activeCustomerPackageItems.find((it: any) => Number(it.serviceId) === Number(id) && it.qtyRemaining > 0) || null;
            return {
              serviceId: id,
              name: s?.en || `Service #${id}`,
              price: details ? details.discountedPrice : 500,
              hasPromotion: details?.hasPromotion || false,
              promotionText: details?.promotionText || "",
              redeemableItem,
            };
          });
          const baseServicesTotal = bookingServicesList.reduce(
            (sum: number, s: any) => redeemedPackageItems[s.serviceId] ? sum : sum + s.price,
            0
          );

          // Compute attached products and additional services from attachedProducts and notes
          const rawAttached: any[] = Array.isArray((checkoutBooking as any).attachedProducts)
            ? [...(checkoutBooking as any).attachedProducts]
            : [];

          const checkoutAdditionalServicesList: Array<{ name: string; qty: number; unitPrice: number; total: number; lineType: string }> = [];
          const checkoutProductsConsumablesList: Array<{ name: string; qty: number; unitPrice: number; total: number; lineType: string }> = [];
          const existingCheckoutNames = new Set<string>();

          // 1. Process structured attachedProducts
          for (const item of rawAttached) {
            const name = String(item.name || 'Item').trim();
            const qty = Number(item.qty) || 1;
            const unitPrice = Number(item.unitPrice || item.price || 0);
            const total = Number(item.total) || (qty * unitPrice);
            const lineType = item.lineType || (item.serviceId ? 'additional_service' : 'product');

            const isPulse = lineType === 'device_pulses' || name.toLowerCase().includes('pulse');
            if (isPulse && (total === 0 || unitPrice === 0)) {
              continue;
            }

            if (!existingCheckoutNames.has(name.toLowerCase())) {
              existingCheckoutNames.add(name.toLowerCase());
              if (lineType === 'additional_service') {
                checkoutAdditionalServicesList.push({ name, qty, unitPrice, total, lineType });
              } else {
                checkoutProductsConsumablesList.push({ name, qty, unitPrice, total, lineType });
              }
            }
          }

          // 2. Parse from notes (safety net & historical support)
          if (checkoutBooking.notes) {
            const notesStr = String(checkoutBooking.notes);

            // a) [Additional Services Used] / [Additional Services]
            const addSvcBlockMatch = notesStr.match(/\[(?:Additional Services|Extra Services|Services Used|Added Services)(?: Used)?(?: During Session)?\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
            if (addSvcBlockMatch) {
              const rawBlock = addSvcBlockMatch[1];
              const items = rawBlock.split(/(?:,|\n)(?![^(]*\))/);
              for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed || trimmed.startsWith("[")) continue;
                const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m1) {
                  const name = m1[1].trim();
                  const qty = Number(m1[2]) || 1;
                  const unitPrice = Number(m1[3]) || 0;
                  const total = Number(m1[4]) || (qty * unitPrice);
                  if (!existingCheckoutNames.has(name.toLowerCase())) {
                    existingCheckoutNames.add(name.toLowerCase());
                    checkoutAdditionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                  }
                  continue;
                }
                const m2 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m2) {
                  const name = m2[1].trim();
                  const qty = Number(m2[2]) || 1;
                  const unitPrice = Number(m2[3]) || 0;
                  const total = qty * unitPrice;
                  if (!existingCheckoutNames.has(name.toLowerCase())) {
                    existingCheckoutNames.add(name.toLowerCase());
                    checkoutAdditionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                  }
                  continue;
                }
                const m3 = trimmed.match(/^(.+?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
                if (m3) {
                  const name = m3[1].trim();
                  const qty = m3[2] ? Number(m3[2]) : 1;
                  const total = Number(m3[3]) || 0;
                  const unitPrice = qty > 0 ? total / qty : total;
                  if (!existingCheckoutNames.has(name.toLowerCase())) {
                    existingCheckoutNames.add(name.toLowerCase());
                    checkoutAdditionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                  }
                  continue;
                }
              }
            }

            // b) Added Service matches
            const addedServiceMatches = notesStr.matchAll(/\[(?:Added Service|Additional Service|Extra Service)\]:\s+(.*?)(?=\n|$)/gi);
            for (const match of addedServiceMatches) {
              const rawLine = match[1].trim();
              const m1 = rawLine.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m1) {
                const name = m1[1].trim();
                const qty = Number(m1[2]) || 1;
                const unitPrice = Number(m1[3]) || 0;
                const total = Number(m1[4]) || (qty * unitPrice);
                if (!existingCheckoutNames.has(name.toLowerCase())) {
                  existingCheckoutNames.add(name.toLowerCase());
                  checkoutAdditionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
              const m2 = rawLine.match(/^(.*?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
              if (m2) {
                const name = m2[1].trim();
                const qty = m2[2] ? Number(m2[2]) : 1;
                const total = Number(m2[3]);
                const unitPrice = qty > 0 ? total / qty : total;
                if (!existingCheckoutNames.has(name.toLowerCase())) {
                  existingCheckoutNames.add(name.toLowerCase());
                  checkoutAdditionalServicesList.push({ name, qty, unitPrice, total, lineType: 'additional_service' });
                }
                continue;
              }
            }

            // c) Products Used in notes
            const prodBlockMatch = notesStr.match(/\[Products Used During Session\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
            if (prodBlockMatch) {
              const rawProdBlock = prodBlockMatch[1];
              const items = rawProdBlock.split(/(?:,|\n)(?![^(]*\))/);
              for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed || trimmed.startsWith("[")) continue;
                const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m1) {
                  const name = m1[1].trim();
                  const qty = Number(m1[2]) || 1;
                  const unitPrice = Number(m1[3]) || 0;
                  const total = Number(m1[4]) || (qty * unitPrice);
                  if (!existingCheckoutNames.has(name.toLowerCase())) {
                    existingCheckoutNames.add(name.toLowerCase());
                    checkoutProductsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product' });
                  }
                  continue;
                }
              }
            }

            // d) Added Product matches
            const receptionistMatches = notesStr.matchAll(/\[Added Product\]:\s+(.*?)(?:\s*\(x(\d+)\))?\s*-\s+(\d+(?:\.\d+)?)\s+EGP/gi);
            for (const match of receptionistMatches) {
              const name = match[1].trim();
              const qty = match[2] ? Number(match[2]) : 1;
              const total = Number(match[3]);
              const unitPrice = qty > 0 ? total / qty : total;
              if (!existingCheckoutNames.has(name.toLowerCase())) {
                existingCheckoutNames.add(name.toLowerCase());
                checkoutProductsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product' });
              }
            }

            // e) Extra Device Pulses matches
            const pulseMatches = notesStr.matchAll(/\[(?:Extra Device Pulses|Device Pulses Deducted)\]:\s*(.*?)=\s*(\d+(?:\.\d+)?)\s*EGP/gi);
            for (const match of pulseMatches) {
              const name = "Extra Device Pulses";
              const total = parseFloat(match[2]) || 0;
              if (total > 0 && !existingCheckoutNames.has(name.toLowerCase())) {
                existingCheckoutNames.add(name.toLowerCase());
                checkoutProductsConsumablesList.push({ name, qty: 1, unitPrice: total, total, lineType: 'device_pulses' });
              }
            }

            // f) Generic format: - Name (x2) @ 700 EGP
            const doctorMatches = notesStr.matchAll(/-\s+(.*?)\s+\(x(\d+)\)\s+@\s+(\d+(?:\.\d+)?)\s+EGP/gi);
            for (const match of doctorMatches) {
              const name = match[1].trim();
              const qty = Number(match[2]);
              const unitPrice = Number(match[3]);
              const total = qty * unitPrice;
              if (!existingCheckoutNames.has(name.toLowerCase())) {
                existingCheckoutNames.add(name.toLowerCase());
                checkoutProductsConsumablesList.push({ name, qty, unitPrice, total, lineType: 'product' });
              }
            }
          }

          // 3. Fallback reconciliation if note or DB has higher total
          const baseAndAttachedTotal = baseServicesTotal + checkoutAdditionalServicesList.reduce((sum, s) => sum + s.total, 0) + checkoutProductsConsumablesList.reduce((sum, p) => sum + p.total, 0);
          let targetCheckoutTotal = baseAndAttachedTotal;

          if (checkoutBooking.notes) {
            const invMatch = String(checkoutBooking.notes).match(/\[(?:Invoice Total Updated|Total Invoice|Final Invoice|Updated Invoice Total|Total Price|Invoice Total)\]:\s*(\d+(?:\.\d+)?)\s*EGP/i);
            if (invMatch) {
              const notedTotal = Number(invMatch[1]);
              if (notedTotal > targetCheckoutTotal) {
                targetCheckoutTotal = notedTotal;
              }
            }
          }

          const checkoutAdditionalServicesCost = checkoutAdditionalServicesList.reduce((sum, s) => sum + s.total, 0);
          const checkoutProductsCost = checkoutProductsConsumablesList.reduce((sum, p) => sum + p.total, 0);
          const totalCost = baseServicesTotal + checkoutAdditionalServicesCost + checkoutProductsCost;
          const balanceDue = Math.max(0, totalCost - depositAlreadyPaid);

          // 2. Fetch customer details
          const targetCustId = checkoutBooking.customerId || (checkoutBooking as any).customer_id;
          const rawCustPhone = (checkoutBooking.phone || checkoutBooking.customer_phone || '').trim().replace(/\D/g, '');
          const customerRecord = dbCustomers.find(c => 
            (targetCustId && c.id === targetCustId) ||
            (rawCustPhone && c.phone && c.phone.trim().replace(/\D/g, '') === rawCustPhone)
          );
          const walletBalance = customerRecord ? Number(customerRecord.wallet || customerRecord.wallet_balance || 0) : 0;

          // 3. Math calculation
          const walletDeduction = useWalletBalance ? Math.min(walletBalance, balanceDue) : 0;
          const netDue = Math.max(0, balanceDue - walletDeduction);

          const amountPaidNum = parseFloat(checkoutAmountPaid) || 0;
          const diff = amountPaidNum - netDue;

          const changeAmount = diff > 0 ? diff : 0;
          const remainingAmount = diff < 0 ? -diff : 0;

          // Total paid on this reservation is the previous deposit + cash/card paid now + wallet balance applied!
          const totalPaidIncludingDeposit = depositAlreadyPaid + amountPaidNum + walletDeduction;

          const handleConfirmCheckout = async () => {
            setSavingCheckout(true);
            try {
              const res = await fetch(`/api/reservations?id=${checkoutBooking.id}`, {
                method: "PATCH",
                headers: authenticatedJsonHeaders,
                body: JSON.stringify({
                  status: "completed",
                  amountPaid: totalPaidIncludingDeposit,
                  amountLeft: remainingAmount,
                  walletWithdrawal: walletDeduction,
                  walletDeposit: changeAmount > 0 && depositChangeToWallet ? changeAmount : 0,
                  customerId: customerRecord?.id || (checkoutBooking as any).customerId || (checkoutBooking as any).customer_id,
                  redeemedServiceIds: Object.keys(redeemedPackageItems).map(Number)
                })
              });
              if (res.ok) {
                const redeemedEntries = Object.entries(redeemedPackageItems);
                const consumeFailures: string[] = [];
                for (const [serviceIdStr, customerPackageItemId] of redeemedEntries) {
                  try {
                    const consumeRes = await fetch("/api/packages/consume", {
                      method: "POST",
                      headers: authenticatedJsonHeaders,
                      body: JSON.stringify({ customerPackageItemId, reservationId: checkoutBooking.id })
                    });
                    if (!consumeRes.ok) {
                      const consumeErr = await consumeRes.json();
                      const svc = bookingServicesList.find((s: any) => String(s.serviceId) === serviceIdStr);
                      consumeFailures.push(`${svc?.name || `Service #${serviceIdStr}`}: ${consumeErr.error || "redemption failed"}`);
                    }
                  } catch (consumeErr) {
                    console.error("Error consuming package session:", consumeErr);
                    const svc = bookingServicesList.find((s: any) => String(s.serviceId) === serviceIdStr);
                    consumeFailures.push(`${svc?.name || `Service #${serviceIdStr}`}: redemption failed`);
                  }
                }

                setCheckoutBooking(null);
                setCheckoutAmountPaid("");
                setUseWalletBalance(false);
                setDepositChangeToWallet(false);
                setRedeemedPackageItems({});
                clearFetchCache();
                fetchAllReservations();
                fetchCustomers();
                setViewingBooking(null);

                if (consumeFailures.length > 0) {
                  alert(
                    `Checkout completed and charged correctly, but package redemption failed for:\n${consumeFailures.join("\n")}\n\nPlease reconcile this patient's package balance manually.`
                  );
                }
              } else {
                const err = await res.json();
                alert(err.error || "Failed to complete checkout");
              }
            } catch (err) {
              console.error(err);
              alert("Error completing checkout");
            } finally {
              setSavingCheckout(false);
            }
          };

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto my-auto rounded-3xl bg-[#FBFBF9] p-6 sm:p-8 shadow-2xl border border-[#414E36]/10 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C4AE7C]">Invoice Checkout</p>
                    <h3 className="text-xl font-bold text-[#1F251A] mt-1">Payment Settlement</h3>
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutBooking(null);
                      setCheckoutAmountPaid("");
                      setUseWalletBalance(false);
                      setDepositChangeToWallet(false);
                      setRedeemedPackageItems({});
                    }}
                    className="rounded-full bg-[#F2EFE9] p-2 text-[#414E36] transition hover:bg-[#e4e0d6]"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="space-y-4 text-sm text-[#414E36]">
                  {/* Customer Information */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1">Customer / المريض</p>
                    <p className="font-bold text-[#1F251A]">{checkoutBooking.name}</p>
                    <p className="text-xs text-[#5A6A51] mt-0.5">{checkoutBooking.phone}</p>
                  </div>

                  {/* Services Invoice details */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Services List / الخدمات</p>
                    {bookingServicesList.map((svc: any) => {
                      const isRedeemed = !!redeemedPackageItems[svc.serviceId];
                      return (
                        <div key={svc.serviceId} className="border-b border-[#414E36]/10 pb-2 space-y-1">
                          <div className="flex justify-between items-center text-sm font-semibold">
                            <span className="flex items-center gap-2">
                              <span>{svc.name}</span>
                              {svc.hasPromotion && !isRedeemed && (
                                <span className="text-[10px] font-bold bg-[#C4AE7C] text-white px-2 py-0.5 rounded-full">
                                  {svc.promotionText || "OFFER"}
                                </span>
                              )}
                            </span>
                            <span className={isRedeemed ? "line-through text-[#5A6A51]" : ""}>
                              {svc.price} EGP
                            </span>
                          </div>
                          {svc.redeemableItem && (
                            <label className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg p-2 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={isRedeemed}
                                onChange={(e) => {
                                  setRedeemedPackageItems((prev: any) => {
                                    const next = { ...prev };
                                    if (e.target.checked) {
                                      next[svc.serviceId] = svc.redeemableItem.id;
                                    } else {
                                      delete next[svc.serviceId];
                                    }
                                    return next;
                                  });
                                }}
                                className="h-4 w-4 rounded accent-emerald-700"
                              />
                              <span>
                                Apply from package: <strong>{svc.redeemableItem.packageName}</strong> ({svc.redeemableItem.qtyRemaining} left)
                              </span>
                            </label>
                          )}
                        </div>
                      );
                    })}

                    {/* Additional Services */}
                    {checkoutAdditionalServicesList.length > 0 && (
                      <div className="mt-2.5 rounded-xl border border-[#C4AE7C]/30 bg-[#FAF5EB]/50 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#C4AE7C]/20 pb-1.5">
                          <span className="font-bold text-[#414E36] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>✨</span> Additional Services / الخدمات الإضافية
                          </span>
                          <span className="font-bold text-[#C4AE7C]">+{checkoutAdditionalServicesCost} EGP</span>
                        </div>
                        <div className="space-y-1.5 pt-0.5">
                          {checkoutAdditionalServicesList.map((item, iIdx) => (
                            <div key={`chk-as-${iIdx}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#C4AE7C]/20 shadow-2xs">
                              <div>
                                <p className="font-bold text-[#1F251A]">{item.name}</p>
                                <p className="text-[11px] text-[#5A6A51]">Qty: {item.qty} {item.qty > 1 ? `× ${item.unitPrice} EGP` : ''}</p>
                              </div>
                              <span className="font-extrabold text-[#414E36]">+{item.total} EGP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Products & Session Consumables */}
                    {checkoutProductsConsumablesList.length > 0 && (
                      <div className="mt-2.5 rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-1.5">
                          <span className="font-bold text-[#414E36] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>📦</span> Session Consumables & Products / المستلزمات والمنتجات
                          </span>
                          <span className="font-bold text-[#414E36]">+{checkoutProductsCost} EGP</span>
                        </div>
                        <div className="space-y-1.5 pt-0.5">
                          {checkoutProductsConsumablesList.map((item, iIdx) => (
                            <div key={`chk-p-${iIdx}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#414E36]/10 shadow-2xs">
                              <div>
                                <p className="font-bold text-[#1F251A]">{item.name}</p>
                                <p className="text-[11px] text-[#5A6A51]">Qty: {item.qty} {item.qty > 1 ? `× ${item.unitPrice} EGP` : ''}</p>
                              </div>
                              <span className="font-extrabold text-[#414E36]">+{item.total} EGP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-[#414E36]/10 pt-2 flex justify-between font-bold text-[#1F251A] text-base">
                      <span>Total Cost / الإجمالي</span>
                      <span>{totalCost} EGP</span>
                    </div>
                    {depositAlreadyPaid > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-[#5A6A51]">
                          <span>Deposit already paid / العربون المدفوع</span>
                          <span>-{depositAlreadyPaid} EGP</span>
                        </div>
                        <div className="border-t border-[#414E36]/10 pt-2 flex justify-between font-bold text-[#414E36] text-base">
                          <span>Balance Due / المتبقي</span>
                          <span>{balanceDue} EGP</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Wallet Option */}
                  {walletBalance > 0 && (
                    <div className="rounded-2xl border border-[#C4AE7C]/20 bg-[#FBFBF9] p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#1F251A] flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#C4AE7C]"></span>
                          Use Customer Wallet / استخدام المحفظة
                        </p>
                        <p className="text-xs text-[#5A6A51] mt-0.5">Available balance: {walletBalance} EGP</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useWalletBalance}
                          onChange={(e) => setUseWalletBalance(e.target.checked)}
                          className="h-5 w-5 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                        />
                      </label>
                    </div>
                  )}

                  {/* Payment Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5A6A51] mb-1">
                        Net Due / المبلغ المستحق
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          value={`${netDue} EGP`}
                          className="w-full rounded-xl border border-[#414E36]/10 bg-[#EDF1EC]/30 px-3 py-2.5 text-sm font-bold text-[#1F251A] outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5A6A51] mb-1">
                        Amount Paid / المبلغ المدفوع
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={checkoutAmountPaid}
                          onChange={(e) => setCheckoutAmountPaid(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white pl-3 pr-10 py-2.5 text-sm font-bold text-[#1F251A] outline-none focus:border-[#C4AE7C] transition"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#5A6A51]">EGP</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculations & Overpay Options */}
                  {changeAmount > 0 && (
                    <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 space-y-3">
                      <div className="flex justify-between font-bold text-green-800 text-sm">
                        <span>Change / الباقي</span>
                        <span>{changeAmount} EGP</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={depositChangeToWallet}
                          onChange={(e) => setDepositChangeToWallet(e.target.checked)}
                          className="h-4 w-4 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-[#1F251A]">
                          Put change in customer's wallet / أضف الباقي إلى محفظة المريض
                        </span>
                      </label>
                    </div>
                  )}

                  {remainingAmount > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex justify-between font-bold text-red-800 text-sm">
                      <span>Outstanding Balance / الرصيد المستحق</span>
                      <span>{remainingAmount} EGP</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#414E36]/10 pt-4">
                  <button
                    onClick={() => {
                      setCheckoutBooking(null);
                      setCheckoutAmountPaid("");
                      setUseWalletBalance(false);
                      setDepositChangeToWallet(false);
                      setRedeemedPackageItems({});
                    }}
                    className="rounded-xl border border-[#414E36]/15 bg-white px-5 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={savingCheckout}
                    onClick={handleConfirmCheckout}
                    className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-60 flex items-center gap-1.5 shadow-md"
                  >
                    {savingCheckout ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Processing...
                      </>
                    ) : (
                      "Confirm & Complete"
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ── BOOKING INVOICE MODAL ── */}
      {invoiceBooking && (
        (() => {
          // Brief 32: If we have a real ledger invoice, use immutable data instead of live-recomputing
          if (ledgerInvoice) {
            const inv = ledgerInvoice.invoice;
            const allInvoiceItems = ledgerInvoice.lines.map((line: any) => ({
              name: isRTL ? (line.nameAr || line.nameEn || line.description) : (line.nameEn || line.description),
              nameAr: line.nameAr || line.description,
              qty: Number(line.qty) || 1,
              unitPrice: Number(line.unit_price) || 0,
              price: Number(line.unit_price) || 0,
              total: Number(line.line_total) || 0,
            }));
            const totalCost = Number(inv.grand_total) || 0;

            const rawPaid = Number(invoiceBooking.amountPaid || (invoiceBooking as any).amount_paid || 0);
            const rawLeft = (invoiceBooking as any).amountLeft !== undefined && (invoiceBooking as any).amountLeft !== null && (invoiceBooking as any).amountLeft !== ""
              ? Number((invoiceBooking as any).amountLeft)
              : ((invoiceBooking as any).amount_left !== undefined && (invoiceBooking as any).amount_left !== null && (invoiceBooking as any).amount_left !== ""
                  ? Number((invoiceBooking as any).amount_left)
                  : null);
            const finalPaid = rawPaid;
            const finalLeft = rawLeft ?? 0;
            const walletUsed = Math.max(0, totalCost - finalPaid - finalLeft);
            const branch = branches.find((b: any) => b.id === invoiceBooking.branchId);
            const branchName = branch ? (isRTL ? branch.name_ar : branch.name_en) : "Revera Zayed Clinic";
            const invoiceNo = inv.invoice_no || `REV-INV-${String(invoiceBooking.id || '').slice(0, 8).toUpperCase()}`;

            return (
              <div 
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
                onClick={() => setInvoiceBooking(null)}
              >
                <div 
                  className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-[#414E36]/10 my-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  
                  {/* Header Actions */}
                  <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 mb-3 shrink-0">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C4AE7C]">Invoice Preview</span>
                      <h3 className="text-base font-bold text-[#1F251A] mt-0.5 font-sans">Booking Invoice Details</h3>
                    </div>
                    <button
                      onClick={() => setInvoiceBooking(null)}
                      className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Printable Invoice Container (Scrollable) */}
                  <div className="overflow-y-auto pr-1.5 flex-1 border border-gray-100 rounded-2xl p-4 sm:p-5 bg-[#FBFBF9]/40 space-y-4">
                    {/* Top Header */}
                    <div className="flex justify-between items-start gap-4 pb-3.5 border-b border-[#414E36]/20">
                      <div>
                        <h1 className="text-lg sm:text-xl font-bold tracking-wider text-[#414E36]" style={{ fontFamily: "Marcellus, serif" }}>REVERA CLINICS</h1>
                        <p className="text-xs text-[#5A6A51] mt-0.5 font-semibold">Sheikh Zayed / New Cairo</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Phone: (+20) 01035595691</p>
                        <p className="text-[11px] text-gray-400">Email: inquiries@reveraclinics.com</p>
                      </div>
                      <div className="text-right">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#C4AE7C]" style={{ fontFamily: "Marcellus, serif" }}>INVOICE</h2>
                        <p className="text-xs text-[#1F251A] mt-1 font-bold">No: {invoiceNo}</p>
                        <p className="text-[11px] text-[#5A6A51] mt-0.5">Date: {invoiceBooking.date || new Date().toISOString().slice(0, 10)}</p>
                      </div>
                    </div>

                    {/* Customer / Billing Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs leading-relaxed">
                      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5 border-b border-gray-100 pb-1">Billed To</p>
                        <p className="font-bold text-[#1F251A] text-sm">{invoiceBooking.name || "Patient"}</p>
                        <p className="text-[#5A6A51] mt-0.5"><strong>Phone:</strong> {invoiceBooking.phone || "—"}</p>
                        <p className="text-[#5A6A51]"><strong>Email:</strong> {invoiceBooking.email || "—"}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5 border-b border-gray-100 pb-1">Booking Details</p>
                        <p className="text-[#5A6A51]"><strong>Doctor:</strong> {invoiceBooking.doctorName || "—"}</p>
                        <p className="text-[#5A6A51] mt-0.5"><strong>Time Slot:</strong> {invoiceBooking.timeSlot || "—"}</p>
                        <p className="text-[#5A6A51] mt-0.5"><strong>Branch:</strong> {branchName}</p>
                      </div>
                    </div>

                    {/* Table of Services & Add-ons */}
                    <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#EDF1EC] text-[#414E36] font-bold border-b border-gray-100">
                            <th className="p-2.5 text-left">Service / Item Rendered</th>
                            <th className="p-2.5 text-center w-14">Qty</th>
                            <th className="p-2.5 text-right w-24">Unit Price</th>
                            <th className="p-2.5 text-right w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {allInvoiceItems.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-2.5 font-semibold text-[#1F251A]">{item.name}</td>
                              <td className="p-2.5 text-center text-gray-500">{item.qty || 1}</td>
                              <td className="p-2.5 text-right text-gray-600">EGP {(Number(item.unitPrice || item.price) || 0).toLocaleString()}</td>
                              <td className="p-2.5 text-right font-bold text-[#1F251A]">EGP {(Number(item.total) || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pricing Summary */}
                    <div className="flex justify-end text-xs">
                      <div className="w-60 space-y-1.5">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal:</span>
                          <span className="font-semibold text-[#1F251A]">EGP {totalCost.toLocaleString()}</span>
                        </div>
                        {walletUsed > 0 && (
                          <div className="flex justify-between text-green-700 font-medium">
                            <span>Paid from Wallet:</span>
                            <span className="font-bold">- EGP {walletUsed.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-[#414E36] pt-1.5 text-sm font-bold text-[#414E36]">
                          <span>Amount Paid:</span>
                          <span>EGP {finalPaid.toLocaleString()}</span>
                        </div>
                        {finalLeft > 0 && (
                          <div className="flex justify-between font-bold text-red-600">
                            <span>Outstanding Due:</span>
                            <span>EGP {finalLeft.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Thank you */}
                    <div className="text-center text-[10px] text-gray-400 pt-2 border-t border-dashed border-gray-200">
                      <p>Thank you for choosing Revera Clinics!</p>
                    </div>
                  </div>

                  {/* Bottom Buttons */}
                  <div className="flex items-center justify-end gap-3 mt-3 border-t border-gray-100 pt-3 shrink-0">
                    <button
                      onClick={() => setInvoiceBooking(null)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => handlePrintInvoice(invoiceBooking, allInvoiceItems, totalCost, walletUsed, branchName)}
                      className="rounded-xl bg-[#414E36] px-4 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print / Save PDF
                    </button>
                  </div>

                </div>
              </div>
            );
          }

          // === FALLBACK: pre-ledger bookings (no invoice row) — existing logic unchanged ===
          // 1. Calculate service cost
          const svcIds = Array.isArray(invoiceBooking.serviceIds) ? invoiceBooking.serviceIds : (invoiceBooking.serviceId ? [invoiceBooking.serviceId] : []);
          const baseServicesList = svcIds.map((id: number) => {
            const s = localServices.find(srv => srv.id === id);
            const price = s ? getEffectiveServicePrice(s, invoiceBooking.branchId, branches) : 500;
            return {
              name: s?.en || `Service #${id}`,
              nameAr: s?.ar || `خدمة #${id}`,
              qty: 1,
              unitPrice: price,
              price: price,
              total: price
            };
          });

          // Extract attached products/consumables/add-ons and additional services
          const rawAttached: any[] = Array.isArray(invoiceBooking.attachedProducts)
            ? [...invoiceBooking.attachedProducts]
            : [];

          const invoiceAdditionalServicesList: Array<{ name: string; nameAr: string; qty: number; unitPrice: number; price: number; total: number }> = [];
          const invoiceProductsList: Array<{ name: string; nameAr: string; qty: number; unitPrice: number; price: number; total: number }> = [];
          const existingNames = new Set<string>();

          // 1. Process structured attachedProducts
          for (const item of rawAttached) {
            const name = String(item.name || 'Item').trim();
            const qty = Number(item.qty) || 1;
            const unitPrice = Number(item.unitPrice || item.price || 0);
            const total = Number(item.total) || (qty * unitPrice);
            const lineType = item.lineType || (item.serviceId ? 'additional_service' : 'product');

            // Skip device pulses counters from customer invoice
            const isPulse = lineType === 'device_pulses' || name.toLowerCase().includes('pulse');
            if (isPulse && (total === 0 || unitPrice === 0)) {
              continue;
            }

            if (!existingNames.has(name.toLowerCase())) {
              existingNames.add(name.toLowerCase());
              if (lineType === 'additional_service') {
                invoiceAdditionalServicesList.push({
                  name: `${name} (Additional Service)`,
                  nameAr: `${name} (خدمة إضافية)`,
                  qty,
                  unitPrice,
                  price: unitPrice,
                  total
                });
              } else {
                invoiceProductsList.push({
                  name: `${name} (Add-on)`,
                  nameAr: `${name} (إضافة)`,
                  qty,
                  unitPrice,
                  price: unitPrice,
                  total
                });
              }
            }
          }

          // 2. Parse from notes (safety net & historical support)
          if (invoiceBooking.notes) {
            const notesStr = String(invoiceBooking.notes);

            // a) Check for [Additional Services Used] or [Additional Services]
            const addSvcBlockMatch = notesStr.match(/\[(?:Additional Services|Extra Services|Services Used|Added Services)(?: Used)?(?: During Session)?\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
            if (addSvcBlockMatch) {
              const rawBlock = addSvcBlockMatch[1];
              const items = rawBlock.split(/(?:,|\n)(?![^(]*\))/);
              for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed || trimmed.startsWith("[")) continue;
                const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m1) {
                  const name = m1[1].trim();
                  const qty = Number(m1[2]) || 1;
                  const unitPrice = Number(m1[3]) || 0;
                  const total = Number(m1[4]) || (qty * unitPrice);
                  if (!existingNames.has(name.toLowerCase())) {
                    existingNames.add(name.toLowerCase());
                    invoiceAdditionalServicesList.push({
                      name: `${name} (Additional Service)`,
                      nameAr: `${name} (خدمة إضافية)`,
                      qty,
                      unitPrice,
                      price: unitPrice,
                      total
                    });
                  }
                  continue;
                }
                const m2 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m2) {
                  const name = m2[1].trim();
                  const qty = Number(m2[2]) || 1;
                  const unitPrice = Number(m2[3]) || 0;
                  const total = qty * unitPrice;
                  if (!existingNames.has(name.toLowerCase())) {
                    existingNames.add(name.toLowerCase());
                    invoiceAdditionalServicesList.push({
                      name: `${name} (Additional Service)`,
                      nameAr: `${name} (خدمة إضافية)`,
                      qty,
                      unitPrice,
                      price: unitPrice,
                      total
                    });
                  }
                  continue;
                }
                const m3 = trimmed.match(/^(.+?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
                if (m3) {
                  const name = m3[1].trim();
                  const qty = m3[2] ? Number(m3[2]) : 1;
                  const total = Number(m3[3]) || 0;
                  const unitPrice = qty > 0 ? total / qty : total;
                  if (!existingNames.has(name.toLowerCase())) {
                    existingNames.add(name.toLowerCase());
                    invoiceAdditionalServicesList.push({
                      name: `${name} (Additional Service)`,
                      nameAr: `${name} (خدمة إضافية)`,
                      qty,
                      unitPrice,
                      price: unitPrice,
                      total
                    });
                  }
                  continue;
                }
              }
            }

            // b) Added Service format: [Added Service]: Name - 350 EGP or [Additional Service]: Name - 200 EGP
            const addedServiceMatches = notesStr.matchAll(/\[(?:Added Service|Additional Service|Extra Service)\]:\s+(.*?)(?=\n|$)/gi);
            for (const match of addedServiceMatches) {
              const rawLine = match[1].trim();
              const m1 = rawLine.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
              if (m1) {
                const name = m1[1].trim();
                const qty = Number(m1[2]) || 1;
                const unitPrice = Number(m1[3]) || 0;
                const total = Number(m1[4]) || (qty * unitPrice);
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  invoiceAdditionalServicesList.push({
                    name: `${name} (Additional Service)`,
                    nameAr: `${name} (خدمة إضافية)`,
                    qty,
                    unitPrice,
                    price: unitPrice,
                    total
                  });
                }
                continue;
              }
              const m2 = rawLine.match(/^(.*?)(?:\s*\(x(\d+)\))?\s*(?:-|\(|\s+at\s+|:\s*|@\s*)(\d+(?:\.\d+)?)\s*(?:EGP|\))/i);
              if (m2) {
                const name = m2[1].trim();
                const qty = m2[2] ? Number(m2[2]) : 1;
                const total = Number(m2[3]);
                const unitPrice = qty > 0 ? total / qty : total;
                if (!existingNames.has(name.toLowerCase())) {
                  existingNames.add(name.toLowerCase());
                  invoiceAdditionalServicesList.push({
                    name: `${name} (Additional Service)`,
                    nameAr: `${name} (خدمة إضافية)`,
                    qty,
                    unitPrice,
                    price: unitPrice,
                    total
                  });
                }
                continue;
              }
            }

            // c) Products Used in notes
            const prodBlockMatch = notesStr.match(/\[Products Used During Session\]:\s*([\s\S]*?)(?=\n\s*\[|$)/i);
            if (prodBlockMatch) {
              const rawProdBlock = prodBlockMatch[1];
              const items = rawProdBlock.split(/(?:,|\n)(?![^(]*\))/);
              for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed || trimmed.startsWith("[")) continue;
                const m1 = trimmed.match(/^(.+?)\s*\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/i);
                if (m1) {
                  const name = m1[1].trim();
                  const qty = Number(m1[2]) || 1;
                  const unitPrice = Number(m1[3]) || 0;
                  const total = Number(m1[4]) || (qty * unitPrice);
                  if (!existingNames.has(name.toLowerCase())) {
                    existingNames.add(name.toLowerCase());
                    invoiceProductsList.push({
                      name: `${name} (Add-on)`,
                      nameAr: `${name} (إضافة)`,
                      qty,
                      unitPrice,
                      price: unitPrice,
                      total
                    });
                  }
                  continue;
                }
              }
            }

            // d) Receptionist Added Product: [Added Product]: Name (x2) - 1400 EGP
            const receptionistMatches = notesStr.matchAll(/\[Added Product\]:\s+(.*?)(?:\s*\(x(\d+)\))?\s*-\s+(\d+(?:\.\d+)?)\s+EGP/gi);
            for (const match of receptionistMatches) {
              const name = match[1].trim();
              const qty = match[2] ? Number(match[2]) : 1;
              const total = Number(match[3]);
              const unitPrice = qty > 0 ? total / qty : total;
              if (!existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                invoiceProductsList.push({
                  name: `${name} (Add-on)`,
                  nameAr: `${name} (إضافة)`,
                  qty,
                  unitPrice,
                  price: unitPrice,
                  total
                });
              }
            }

            // e) Generic format: - Name (x2) @ 700 EGP
            const doctorMatches = notesStr.matchAll(/-\s+(.*?)\s+\(x(\d+)\)\s+@\s+(\d+(?:\.\d+)?)\s+EGP/gi);
            for (const match of doctorMatches) {
              const name = match[1].trim();
              const qty = Number(match[2]);
              const unitPrice = Number(match[3]);
              const total = qty * unitPrice;
              if (!existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                invoiceProductsList.push({
                  name: `${name} (Add-on)`,
                  nameAr: `${name} (إضافة)`,
                  qty,
                  unitPrice,
                  price: unitPrice,
                  total
                });
              }
            }
          }

          // 3. Fallback reconciliation: If notes or booking balance recorded a higher invoice total than the sum of parsed lines,
          // recover the missing additional services / session adjustments difference!
          const baseCost = baseServicesList.reduce((sum: number, s: any) => sum + s.total, 0);
          const currentAttachedTotal = baseCost + invoiceAdditionalServicesList.reduce((sum: number, s: any) => sum + s.total, 0) + invoiceProductsList.reduce((sum: number, p: any) => sum + p.total, 0);
          let targetInvoiceTotal = currentAttachedTotal;

          if (invoiceBooking.notes) {
            const invMatch = String(invoiceBooking.notes).match(/\[(?:Invoice Total Updated|Total Invoice|Final Invoice|Updated Invoice Total|Total Price|Invoice Total)\]:\s*(\d+(?:\.\d+)?)\s*EGP/i);
            if (invMatch) {
              const notedTotal = Number(invMatch[1]);
              if (notedTotal > targetInvoiceTotal) {
                targetInvoiceTotal = notedTotal;
              }
            }
          }

          const rawPaid = Number(invoiceBooking.amountPaid || (invoiceBooking as any).amount_paid || 0);
          const rawLeft = (invoiceBooking as any).amountLeft !== undefined && (invoiceBooking as any).amountLeft !== null && (invoiceBooking as any).amountLeft !== ""
            ? Number((invoiceBooking as any).amountLeft)
            : ((invoiceBooking as any).amount_left !== undefined && (invoiceBooking as any).amount_left !== null && (invoiceBooking as any).amount_left !== ""
                ? Number((invoiceBooking as any).amount_left)
                : null);

          const allInvoiceItems = [...baseServicesList, ...invoiceAdditionalServicesList, ...invoiceProductsList].filter((item: any) => {
            const nameLower = String(item.name || '').toLowerCase();
            const isPulse = nameLower.includes('pulse') || nameLower.includes('device —') || nameLower.includes('device -');
            if (isPulse && (Number(item.total) === 0 || Number(item.unitPrice) === 0 || Number(item.price) === 0)) {
              return false;
            }
            return true;
          });
          const totalCost = allInvoiceItems.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);

          // 2. Fetch customer and branch details
          const finalPaid = rawPaid;
          const finalLeft = rawLeft ?? 0;
          const walletUsed = Math.max(0, totalCost - finalPaid - finalLeft);
          const branch = branches.find(b => b.id === invoiceBooking.branchId);
          const branchName = branch ? (isRTL ? branch.name_ar : branch.name_en) : "Revera Zayed Clinic";
          const invoiceNo = `REV-INV-${String(invoiceBooking.id || '').slice(0, 8).toUpperCase()}`;

          return (
            <div 
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
              onClick={() => setInvoiceBooking(null)}
            >
              <div 
                className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-[#414E36]/10 my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Header Actions */}
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 mb-3 shrink-0">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C4AE7C]">Invoice Preview</span>
                    <h3 className="text-base font-bold text-[#1F251A] mt-0.5 font-sans">Booking Invoice Details</h3>
                  </div>
                  <button
                    onClick={() => setInvoiceBooking(null)}
                    className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Printable Invoice Container (Scrollable) */}
                <div className="overflow-y-auto pr-1.5 flex-1 border border-gray-100 rounded-2xl p-4 sm:p-5 bg-[#FBFBF9]/40 space-y-4">
                  {/* Top Header */}
                  <div className="flex justify-between items-start gap-4 pb-3.5 border-b border-[#414E36]/20">
                    <div>
                      <h1 className="text-lg sm:text-xl font-bold tracking-wider text-[#414E36]" style={{ fontFamily: "Marcellus, serif" }}>REVERA CLINICS</h1>
                      <p className="text-xs text-[#5A6A51] mt-0.5 font-semibold">Sheikh Zayed / New Cairo</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Phone: (+20) 01035595691</p>
                      <p className="text-[11px] text-gray-400">Email: inquiries@reveraclinics.com</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#C4AE7C]" style={{ fontFamily: "Marcellus, serif" }}>INVOICE</h2>
                      <p className="text-xs text-[#1F251A] mt-1 font-bold">No: {invoiceNo}</p>
                      <p className="text-[11px] text-[#5A6A51] mt-0.5">Date: {invoiceBooking.date || new Date().toISOString().slice(0, 10)}</p>
                    </div>
                  </div>

                  {/* Customer / Billing Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs leading-relaxed">
                    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5 border-b border-gray-100 pb-1">Billed To</p>
                      <p className="font-bold text-[#1F251A] text-sm">{invoiceBooking.name || "Patient"}</p>
                      <p className="text-[#5A6A51] mt-0.5"><strong>Phone:</strong> {invoiceBooking.phone || "—"}</p>
                      <p className="text-[#5A6A51]"><strong>Email:</strong> {invoiceBooking.email || "—"}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5 border-b border-gray-100 pb-1">Booking Details</p>
                      <p className="text-[#5A6A51]"><strong>Doctor:</strong> {invoiceBooking.doctorName || "—"}</p>
                      <p className="text-[#5A6A51] mt-0.5"><strong>Time Slot:</strong> {invoiceBooking.timeSlot || "—"}</p>
                      <p className="text-[#5A6A51] mt-0.5"><strong>Branch:</strong> {branchName}</p>
                    </div>
                  </div>

                  {/* Table of Services & Add-ons */}
                  <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#EDF1EC] text-[#414E36] font-bold border-b border-gray-100">
                          <th className="p-2.5 text-left">Service / Item Rendered</th>
                          <th className="p-2.5 text-center w-14">Qty</th>
                          <th className="p-2.5 text-right w-24">Unit Price</th>
                          <th className="p-2.5 text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allInvoiceItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5 font-semibold text-[#1F251A]">{item.name}</td>
                            <td className="p-2.5 text-center text-gray-500">{item.qty || 1}</td>
                            <td className="p-2.5 text-right text-gray-600">EGP {(Number(item.unitPrice || item.price) || 0).toLocaleString()}</td>
                            <td className="p-2.5 text-right font-bold text-[#1F251A]">EGP {(Number(item.total) || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing Summary */}
                  <div className="flex justify-end text-xs">
                    <div className="w-60 space-y-1.5">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-[#1F251A]">EGP {totalCost.toLocaleString()}</span>
                      </div>
                      {walletUsed > 0 && (
                        <div className="flex justify-between text-green-700 font-medium">
                          <span>Paid from Wallet:</span>
                          <span className="font-bold">- EGP {walletUsed.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#414E36] pt-1.5 text-sm font-bold text-[#414E36]">
                        <span>Amount Paid:</span>
                        <span>EGP {finalPaid.toLocaleString()}</span>
                      </div>
                      {finalLeft > 0 && (
                        <div className="flex justify-between font-bold text-red-600">
                          <span>Outstanding Due:</span>
                          <span>EGP {finalLeft.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thank you */}
                  <div className="text-center text-[10px] text-gray-400 pt-2 border-t border-dashed border-gray-200">
                    <p>Thank you for choosing Revera Clinics!</p>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="flex items-center justify-end gap-3 mt-3 border-t border-gray-100 pt-3 shrink-0">
                  <button
                    onClick={() => setInvoiceBooking(null)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handlePrintInvoice(invoiceBooking, allInvoiceItems, totalCost, walletUsed, branchName)}
                    className="rounded-xl bg-[#414E36] px-4 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print / Save PDF
                  </button>
                </div>

              </div>
            </div>
          );
        })()
      )}


      {activeInfoFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/60 backdrop-blur-sm p-4">
          <div className="bg-[#FBFBF9] rounded-[32px] border border-[#414E36]/10 p-6 max-w-md w-full shadow-2xl relative">
            <h4 className="text-lg font-bold text-[#1F251A] pr-8 mb-2 flex items-center gap-2">
              <Info className="text-[#C4AE7C] shrink-0" size={20} />
              {activeInfoFeature.title}
            </h4>
            <div className="text-sm text-[#5A6A51] leading-relaxed space-y-2 font-medium">
              <p>{activeInfoFeature.description}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveInfoFeature(null)}
                className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md"
              >
                Got it
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveInfoFeature(null)}
              className="absolute top-5 right-5 text-[#5A6A51]/60 hover:text-[#1F251A] transition-colors hover:bg-gray-100 p-1.5 rounded-full"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}