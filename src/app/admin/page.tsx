"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { ServiceItem, SERVICES, ALL_15MIN_SLOTS, getDurationInMinutes, normaliseTo24hSlot } from "@/lib/services";
import { 
  getServiceToggles, 
  setServiceToggle, 
  getDynamicCategories, 
  saveDynamicCategories, 
  getDynamicServices, 
  saveDynamicServices,
  LocalCategory 
} from "@/lib/serviceStore";
import { compressImage } from "@/lib/image";
import { Branch } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Bell,
  Box,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  Info,
  Layers,
  LogOut,
  MessageSquare,
  Monitor,
  Menu,
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
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
  GripVertical,
  X,
  ListOrdered,
  DoorOpen,
  MapPin,
} from "lucide-react";
import RoomsManagerView from "@/components/RoomsManagerView";
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
    case 'pending':
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200/50';
  }
}

const SLOTS = ALL_15MIN_SLOTS;

const SIDEBAR_ITEMS = [
  { label: "Bookings", icon: CalendarDays },
  { label: "Customers", icon: Users },
  { label: "Providers", icon: ShieldCheck },
  { label: "Services", icon: Layers },
  { label: "Employees", icon: CircleUser },
  { label: "HR", icon: ClipboardList },
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
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  // new demographic fields
  age?: number | null;
  national_id?: string | null;
  address?: string | null;
  referral?: string | null;
  occupation?: string | null;
};

const MOCK_PRESCRIPTIONS = [
  {
    id: "PR-1082",
    patientName: "Mariam Ali",
    patientEmail: "mariam.ali@example.com",
    doctorName: "Dr. Ahmed Medhat",
    date: "10 Jun 2026",
    time: "4:15 pm",
    medicines: ["Amoxicillin 500mg (Capsule)", "Paracetamol 500mg (Tablet)"],
    status: "Active"
  },
  {
    id: "PR-1081",
    patientName: "John Doe",
    patientEmail: "john.doe@example.com",
    doctorName: "Dr. Sara El Gamel",
    date: "09 Jun 2026",
    time: "11:30 am",
    medicines: ["Ibuprofen 400mg (Tablet)"],
    status: "Completed"
  },
  {
    id: "PR-1080",
    patientName: "Youssef Hassan",
    patientEmail: "youssef.h@example.com",
    doctorName: "Dr. Radwa Seif",
    date: "08 Jun 2026",
    time: "2:45 pm",
    medicines: ["Claritin 10mg (Tablet)", "Flonase Nasal Spray"],
    status: "Active"
  },
  {
    id: "PR-1079",
    patientName: "Fatima Omar",
    patientEmail: "fatima.o@example.com",
    doctorName: "Dr. Ahmed Medhat",
    date: "07 Jun 2026",
    time: "9:15 am",
    medicines: ["Lipitor 20mg (Tablet)", "CoQ10 100mg (Softgel)"],
    status: "Completed"
  }
];

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

const MOCK_PRODUCTS = [
  { id: "PROD-001", name: "Hydrating Facial Cream", category: "Skincare", price: "EGP 450.00", stock: 24, status: "In Stock" },
  { id: "PROD-002", name: "Sunscreen SPF 50+", category: "Sun Protection", price: "EGP 600.00", stock: 12, status: "In Stock" },
  { id: "PROD-003", name: "Retinol Anti-Aging Serum", category: "Serums", price: "EGP 850.00", stock: 5, status: "Low Stock" },
  { id: "PROD-004", name: "Gentle Cleansing Gel", category: "Skincare", price: "EGP 320.00", stock: 0, status: "Out of Stock" },
];

const MOCK_PRODUCT_CATEGORIES = [
  { id: "CAT-01", name: "Skincare", description: "Lotions, creams, and cleansers for skin health", productCount: 12 },
  { id: "CAT-02", name: "Sun Protection", description: "Broad-spectrum SPF blockers", productCount: 4 },
  { id: "CAT-03", name: "Serums", description: "Concentrated active formula serums", productCount: 8 },
  { id: "CAT-04", name: "Haircare", description: "Therapeutic shampoos and conditioners", productCount: 6 },
];

const MOCK_SUPPLIERS = [
  { id: "SUP-01", name: "DermaCare Pharma", contact: "Mohamed Hany", phone: "+20 100 234 5678", email: "hany@dermacare.com", city: "Cairo", country: "Egypt", totalPurchasesValue: "EGP 125,400.00", outstandingBalance: "EGP 12,800.00", status: "Active" },
  { id: "SUP-02", name: "Aura Aesthetics Ltd", contact: "Sarah Jenkins", phone: "+44 20 7946 0958", email: "orders@aura.co.uk", city: "London", country: "United Kingdom", totalPurchasesValue: "EGP 98,200.00", outstandingBalance: "EGP 7,400.00", status: "Active" },
  { id: "SUP-03", name: "BioBeauty Trade", contact: "Ahmed Kamel", phone: "+20 122 987 6543", email: "kamel@biobeauty.eg", city: "Giza", country: "Egypt", totalPurchasesValue: "EGP 54,800.00", outstandingBalance: "EGP 0.00", status: "Inactive" },
];

const MOCK_PURCHASES = [
  { id: "PUR-1002", supplier: "DermaCare Pharma", date: "09 Jun 2026", itemsCount: 150, total: "EGP 45,200.00", status: "Delivered" },
  { id: "PUR-1001", supplier: "Aura Aesthetics Ltd", date: "05 Jun 2026", itemsCount: 80, total: "EGP 68,000.00", status: "Pending" },
];

const MOCK_BATCHES = [
  { id: "BAT-908", productName: "Hydrating Facial Cream", batchCode: "HF-2605A", supplier: "DermaCare Pharma", quantity: 100, purchasePrice: "EGP 230.00", sellingPrice: "EGP 320.00", expiryDate: "May 2028", status: "Active" },
  { id: "BAT-907", productName: "Retinol Anti-Aging Serum", batchCode: "RT-2512C", supplier: "Aura Aesthetics Ltd", quantity: 50, purchasePrice: "EGP 550.00", sellingPrice: "EGP 850.00", expiryDate: "Dec 2027", status: "Active" },
  { id: "BAT-906", productName: "Sunscreen SPF 50+", batchCode: "SS-2601D", supplier: "BioBeauty Trade", quantity: 150, purchasePrice: "EGP 280.00", sellingPrice: "EGP 450.00", expiryDate: "Jan 2029", status: "Expired" },
];

const MOCK_POS_ORDERS = [
  { id: "ORD-5002", customerName: "Nour Salim", date: "10 Jun 2026", time: "6:30 pm", itemsCount: 3, total: "EGP 1,370.00", paymentMethod: "Card" },
  { id: "ORD-5001", customerName: "Kareem Soliman", date: "09 Jun 2026", time: "2:15 pm", itemsCount: 1, total: "EGP 450.00", paymentMethod: "Cash" },
];

const MOCK_REFUNDS = [
  { id: "REF-201", orderId: "ORD-4981", customerName: "Heba Fathy", date: "08 Jun 2026", amount: "EGP 600.00", reason: "Allergic reaction to sunscreen", status: "Processed" },
  { id: "REF-200", orderId: "ORD-4950", customerName: "Sherif Ali", date: "05 Jun 2026", amount: "EGP 320.00", reason: "Damaged packaging", status: "Approved" },
];

const MOCK_SHIPPING = [
  { id: "SHIP-01", name: "Standard Courier Delivery", rate: "EGP 50.00", time: "2-3 business days", status: "Active" },
  { id: "SHIP-02", name: "Express Next-Day Shipping", rate: "EGP 120.00", time: "1 business day", status: "Active" },
  { id: "SHIP-03", name: "Self-Pickup from Zayed Branch", rate: "EGP 0.00", time: "Immediate", status: "Active" },
];

const MOCK_EXPENSE_CATEGORIES = [
  { id: "CAT-FN-01", name: "Medical Supplies", description: "Injectables, needles, gloves, antiseptics, and clinic disposables", budget: "EGP 150,000.00", spent: "EGP 124,500.00", remaining: "EGP 25,500.00", status: "Within Budget" },
  { id: "CAT-FN-02", name: "Staff Salaries", description: "Base salaries and periodic bonuses for doctors, nurses, and admins", budget: "EGP 400,000.00", spent: "EGP 385,000.00", remaining: "EGP 15,000.00", status: "Within Budget" },
  { id: "CAT-FN-03", name: "Marketing & Ads", description: "Social media campaigns, search ads, and branding events", budget: "EGP 80,000.00", spent: "EGP 78,900.00", remaining: "EGP 1,100.00", status: "Near Limit" },
  { id: "CAT-FN-04", name: "Utilities & Rent", description: "Electricity, water, high-speed internet, and building rent lease", budget: "EGP 120,000.00", spent: "EGP 125,000.00", remaining: "-EGP 5,000.00", status: "Over Budget" },
  { id: "CAT-FN-05", name: "Equipment Maintenance", description: "Laser machine calibration, software licensing, and general repairs", budget: "EGP 50,000.00", spent: "EGP 34,200.00", remaining: "EGP 15,800.00", status: "Within Budget" },
];

const MOCK_FINANCE_TRANSACTIONS = [
  { id: "TX-9005", description: "Patient Booking #1085 Payment", category: "Medical Services", type: "Credit", amount: "EGP 1,200.00", date: "12 Jun 2026", status: "Completed" },
  { id: "TX-9004", description: "Purchase Order #PUR-1002 (DermaCare)", category: "Medical Supplies", type: "Debit", amount: "EGP 45,200.00", date: "11 Jun 2026", status: "Completed" },
  { id: "TX-9003", description: "Monthly Zayed Branch Rent Payment", category: "Utilities & Rent", type: "Debit", amount: "EGP 95,000.00", date: "10 Jun 2026", status: "Completed" },
  { id: "TX-9002", description: "Patient POS Order #ORD-5002 Payment", category: "Product Sales", type: "Credit", amount: "EGP 1,370.00", date: "10 Jun 2026", status: "Completed" },
  { id: "TX-9001", description: "Instagram Ad Campaign (June)", category: "Marketing & Ads", type: "Debit", amount: "EGP 25,000.00", date: "09 Jun 2026", status: "Completed" },
  { id: "TX-9000", description: "Patient Booking #1084 Payment", category: "Medical Services", type: "Credit", amount: "EGP 2,500.00", date: "09 Jun 2026", status: "Completed" },
  { id: "TX-8999", description: "Laser Machine Service Deposit", category: "Equipment Maintenance", type: "Debit", amount: "EGP 15,000.00", date: "08 Jun 2026", status: "Completed" },
  { id: "TX-8998", description: "Patient POS Order #ORD-5001 Payment", category: "Product Sales", type: "Credit", amount: "EGP 450.00", date: "09 Jun 2026", status: "Completed" },
];

const MOCK_EXPENSES = [
  { id: "EXP-3004", payee: "DermaCare Pharma", category: "Medical Supplies", amount: "EGP 45,200.00", method: "Bank Transfer", date: "11 Jun 2026", approver: "Dr. Ahmed Medhat" },
  { id: "EXP-3003", payee: "Zayed Real Estate Corp", category: "Utilities & Rent", amount: "EGP 95,000.00", method: "Bank Transfer", date: "10 Jun 2026", approver: "Dr. Ahmed Medhat" },
  { id: "EXP-3002", payee: "Meta Platforms Ads", category: "Marketing & Ads", amount: "EGP 25,000.00", method: "Credit Card", date: "09 Jun 2026", approver: "Dr. Ahmed Medhat" },
  { id: "EXP-3001", payee: "Spectra Laser Services", category: "Equipment Maintenance", amount: "EGP 15,000.00", method: "Bank Transfer", date: "08 Jun 2026", approver: "Dr. Radwa Seif" },
  { id: "EXP-3000", payee: "State Grid Electricity", category: "Utilities & Rent", amount: "EGP 8,500.00", method: "Cash", date: "05 Jun 2026", approver: "Dr. Sara El Gamel" },
];

const MOCK_PAYROLL = [
  { id: "PRL-001", name: "Dr. Ahmed Medhat", role: "Senior Dermatologist", base: "EGP 80,000.00", bonus: "EGP 12,500.00", deductions: "EGP 1,200.00", net: "EGP 91,300.00", period: "1 May - 31 May 2026", status: "Paid" },
  { id: "PRL-002", name: "Dr. Radwa Seif", role: "Physiotherapist Specialist", base: "EGP 65,000.00", bonus: "EGP 8,000.00", deductions: "EGP 950.00", net: "EGP 72,050.00", period: "1 May - 31 May 2026", status: "Paid" },
  { id: "PRL-003", name: "Dr. Sara El Gamel", role: "Laser Treatment Expert", base: "EGP 70,000.00", bonus: "EGP 15,000.00", deductions: "EGP 1,100.00", net: "EGP 83,900.00", period: "1 May - 31 May 2026", status: "Paid" },
  { id: "PRL-004", name: "Mariam Salem", role: "Head Clinic Nurse", base: "EGP 22,000.00", bonus: "EGP 2,000.00", deductions: "EGP 300.00", net: "EGP 23,700.00", period: "1 May - 31 May 2026", status: "Paid" },
  { id: "PRL-005", name: "Youssef Fadel", role: "Front Desk Receptionist", base: "EGP 14,000.00", bonus: "EGP 1,200.00", deductions: "EGP 200.00", net: "EGP 15,000.00", period: "1 May - 31 May 2026", status: "Processing" },
  { id: "PRL-006", name: "Hoda Aly", role: "Clinic Admin Assistant", base: "EGP 16,000.00", bonus: "EGP 1,500.00", deductions: "EGP 250.00", net: "EGP 17,250.00", period: "1 May - 31 May 2026", status: "Processing" },
];

const PERMISSION_STRUCTURE = [
  {
    category: "Bookings Management",
    prefix: "bookings",
    items: [
      { key: "bookings.view_calendar", label: "View Calendar" },
      { key: "bookings.view_list", label: "View Bookings List" },
      { key: "bookings.create", label: "Create Bookings" },
      { key: "bookings.edit", label: "Edit/Reschedule Bookings" },
      { key: "bookings.approve_reject", label: "Approve/Reject Requests" },
      { key: "bookings.delete", label: "Delete/Cancel Bookings" }
    ]
  },
  {
    category: "Customer Management",
    prefix: "customers",
    items: [
      { key: "customers.view", label: "View Customer Profiles" },
      { key: "customers.create", label: "Create Patients" },
      { key: "customers.edit", label: "Edit Patients" },
      { key: "customers.delete", label: "Delete Patients" },
      { key: "customers.import", label: "Import Patients (CSV)" }
    ]
  },
  {
    category: "Provider (Doctor) Management",
    prefix: "providers",
    items: [
      { key: "providers.view", label: "View Provider Profiles" },
      { key: "providers.create", label: "Add New Providers" },
      { key: "providers.edit", label: "Edit Provider Details" },
      { key: "providers.delete", label: "Delete Providers" },
      { key: "providers.attendance", label: "Manage Provider Attendance" }
    ]
  },
  {
    category: "Services Management",
    prefix: "services",
    items: [
      { key: "services.view", label: "View Services List" },
      { key: "services.create", label: "Create Services & Categories" },
      { key: "services.edit", label: "Edit Services & Toggle Status" },
      { key: "services.delete", label: "Delete Services" }
    ]
  },
  {
    category: "Settings & System Control",
    prefix: "settings",
    items: [
      { key: "settings.sms", label: "Configure SMS Gateway" },
      { key: "settings.medical_forms", label: "Manage Medical Forms" },
      { key: "settings.roles", label: "Manage Employee Roles & Accounts" },
      { key: "settings.profile", label: "Manage Company Profile" },
      { key: "settings.service_hours", label: "Manage Service Hours" },
      { key: "settings.branches", label: "Manage Branches" },
      { key: "settings.booking_settings", label: "Manage Booking Settings" },
      { key: "settings.notification", label: "Manage Notification Settings" },
      { key: "settings.queue", label: "Manage Queue Settings" },
      { key: "settings.pages", label: "Manage Pages Settings (CMS)" }
    ]
  }
];

function parseEgyptianNationalId(id: string) {
  if (!id || id.length !== 14 || !/^\d{14}$/.test(id)) {
    return { isValid: false, reason: "National ID must be exactly 14 digits." };
  }

  const centuryDigit = parseInt(id.charAt(0));
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return { isValid: false, reason: "Invalid first digit (must start with 2 or 3)." };
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
    return { isValid: false, reason: "Invalid birth date encoded in ID." };
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

  return {
    isValid: true,
    birthDate: birthDate.toLocaleDateString("en-US", { dateStyle: "long" }),
    governorate,
    gender
  };
}

export default function AdminPage() {
  const { showConfirm } = useAlertConfirm();
  const { isRTL } = useLanguage();
  // Auth state
  const [session, setSession] = useState<any>(null);
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
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const hasPermission = useCallback((permKey: string): boolean => {
    if (adminRole === 'superadmin') return true;
    if (!adminPermissions) return false;
    if (adminPermissions.includes(permKey)) return true;
    
    // Backward compatibility mappings
    if (["customers.create", "customers.edit", "customers.import"].includes(permKey)) {
      if (adminPermissions.includes("customers.create_edit") || adminPermissions.includes("Customers")) return true;
    }
    if (permKey === "customers.delete") {
      if (adminPermissions.includes("customers.delete") || adminPermissions.includes("Customers")) return true;
    }
    if (["providers.create", "providers.edit"].includes(permKey)) {
      if (adminPermissions.includes("providers.create_edit") || adminPermissions.includes("Providers")) return true;
    }
    if (permKey === "providers.delete") {
      if (adminPermissions.includes("providers.delete") || adminPermissions.includes("Providers")) return true;
    }
    if (["services.create", "services.edit", "services.delete"].includes(permKey)) {
      if (adminPermissions.includes("services.create_edit_delete") || adminPermissions.includes("Services")) return true;
    }

    const parentScreenMap: Record<string, string> = {
      "bookings": "Bookings",
      "customers": "Customers",
      "providers": "Providers",
      "services": "Services",
      "settings": "Settings"
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
      if (item.label === 'HR' && (adminRole === 'admin' || adminRole === 'HR')) return true;
      if (adminPermissions.includes(item.label)) return true;
      
      const parentScreenMap: Record<string, string> = {
        "Bookings": "bookings",
        "Customers": "customers",
        "Providers": "providers",
        "Services": "services",
        "Employees": "employees",
        "Settings": "settings"
      };
      const prefix = parentScreenMap[item.label];
      if (prefix && adminPermissions.some(p => p.startsWith(prefix + "."))) return true;
      
      return false;
    });
  }, [adminRole, adminPermissions]);

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
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState("");
  const [roleCreateError, setRoleCreateError] = useState("");
  const [roleCreateSuccess, setRoleCreateSuccess] = useState("");
  const [employeeCreateError, setEmployeeCreateError] = useState("");
  const [employeeCreateSuccess, setEmployeeCreateSuccess] = useState("");

  const [newEmployeePhone, setNewEmployeePhone] = useState("");
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState("Reception");
  const [newEmployeeShift, setNewEmployeeShift] = useState("Day");
  const [newEmployeeSalary, setNewEmployeeSalary] = useState("0");
  const [newEmployeeNationalId, setNewEmployeeNationalId] = useState("");
  const [newEmployeeNationalIdFront, setNewEmployeeNationalIdFront] = useState("");
  const [newEmployeeNationalIdBack, setNewEmployeeNationalIdBack] = useState("");
  const [newEmployeeAddress, setNewEmployeeAddress] = useState("");
  const [newEmployeeBranchId, setNewEmployeeBranchId] = useState("");
  const [newEmployeeContract, setNewEmployeeContract] = useState("");
  const [newEmployeeContractName, setNewEmployeeContractName] = useState("");
  const [employeeFilterDepartment, setEmployeeFilterDepartment] = useState("All");
  const [employeeFilterShift, setEmployeeFilterShift] = useState("All");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
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

  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState("2026-07");
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
  const [isEditingService, setIsEditingService] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
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
  const [doctorName, setDoctorName] = useState<string>("Dr. Sara El Gamel");
  const [slot, setSlot] = useState<string>("12:00");
  const [activeNav, setActiveNav] = useState("Bookings");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providerTab, setProviderTab] = useState<"Providers" | "Attendance">("Providers");
  const [branch, setBranch] = useState<string>(""); // branch id; empty = all branches
  const [lang, setLang] = useState<"EN" | "AR">("EN");
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

  // Customer Add/Edit Form states
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormError, setCustomerFormError] = useState("");
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Checkout & Payment states
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null);
  const [checkoutAmountPaid, setCheckoutAmountPaid] = useState<string>("");
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(false);
  const [depositChangeToWallet, setDepositChangeToWallet] = useState<boolean>(true);
  const [savingCheckout, setSavingCheckout] = useState<boolean>(false);
  const [invoiceBooking, setInvoiceBooking] = useState<any>(null);

  const [custName, setCustName] = useState("");
  const [custMobile, setCustMobile] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custGender, setCustGender] = useState<"Male" | "Female" | "">("");
  const [custActive, setCustActive] = useState(true);
  const [custSpent, setCustSpent] = useState("0");
  const [custOutstanding, setCustOutstanding] = useState("0");
  const [custWallet, setCustWallet] = useState("0");
  const [custArea, setCustArea] = useState("");
  const [custLocationName, setCustLocationName] = useState("");
  const [custStreet, setCustStreet] = useState("");
  const [custBuilding, setCustBuilding] = useState("");
  const [custFloor, setCustFloor] = useState("");
  const [custNote, setCustNote] = useState("");

  // New Customer Profile fields
  const [custAge, setCustAge] = useState("");
  const [custNationalId, setCustNationalId] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custReferral, setCustReferral] = useState("");
  const [custOccupation, setCustOccupation] = useState("");

  // Customer Profile details drawer state
  const [viewingCustomerProfile, setViewingCustomerProfile] = useState<Customer | null>(null);
  const [couponSearch, setCouponSearch] = useState("");
  const [couponDate, setCouponDate] = useState("");
  const [couponStatus, setCouponStatus] = useState("All");
  const [serviceTab, setServiceTab] = useState<"Services" | "Sort Services" | "Package Offers">("Services");
  const [serviceSearch, setServiceSearch] = useState("");
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
  const [serviceUnitType, setServiceUnitType] = useState("Session");
  const [serviceDescEn, setServiceDescEn] = useState("");
  const [serviceDescAr, setServiceDescAr] = useState("");
  const [serviceSortOrder, setServiceSortOrder] = useState(0);
  const [serviceIsShared, setServiceIsShared] = useState(false);
  const [serviceEnableReminder, setServiceEnableReminder] = useState(true);
  const [serviceImageUrl, setServiceImageUrl] = useState("");
  const [serviceBranchPricing, setServiceBranchPricing] = useState<Array<{ name: string; price: number; visible: boolean; status: boolean; isDefault?: boolean }>>([
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
    setServiceUnitType(svc.unit ? (svc.unit.charAt(0).toUpperCase() + svc.unit.slice(1)) : "Session");
    setServiceDescEn(svc.descriptionEn || "");
    setServiceDescAr(svc.descriptionAr || "");
    setServiceSortOrder(svc.sortOrder ?? 0);
    setServiceIsShared(svc.isShared ?? false);
    setServiceEnableReminder(svc.enableReminder ?? true);
    setServiceImageUrl(svc.img || "");
    
    if (svc.branchPricing && svc.branchPricing.length > 0) {
      setServiceBranchPricing(svc.branchPricing);
    } else {
      const toggles = serviceToggles[svc.id] ?? { visible: true, active: true };
      setServiceBranchPricing([
        { name: "Zayed", price: svc.price ?? 0, visible: toggles.visible, status: toggles.active, isDefault: true }
      ]);
    }
    
    setShowAddServiceModal(true);
  };

  const handleReorderServices = (draggedId: number, targetId: number) => {
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
    saveDynamicServices(sortedAllServices);
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
  function removeCategory(catKey: string) {
    const updatedCats = localCategories.filter(c => c.key !== catKey);
    setLocalCategories(updatedCats);
    saveDynamicCategories(updatedCats);

    const updatedSvcs = localServices.filter(s => s.cat !== catKey);
    setLocalServices(updatedSvcs);
    saveDynamicServices(updatedSvcs);

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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("All"); // All, approved, pending, rejected
  const [typeFilter, setTypeFilter] = useState<string>("All");     // All, in_person, online
  const [docFilter, setDocFilter] = useState<string>("All");       // All, Dr...

  // Form states for manual booking creation
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientDate, setNewPatientDate] = useState("");
  const [newPatientTimeSlot, setNewPatientTimeSlot] = useState("12:00");
  const [newPatientService, setNewPatientService] = useState<number>(1);
  const [newPatientSessionType, setNewPatientSessionType] = useState("in_person");
  const [newPatientDoctor, setNewPatientDoctor] = useState("Dr. Sara El Gamel");
  const [newPatientNotes, setNewPatientNotes] = useState("");
  const [newPatientStatus, setNewPatientStatus] = useState("approved");
  const [newPatientBranch, setNewPatientBranch] = useState("");
  const [approveUnavailableSlots, setApproveUnavailableSlots] = useState<string[]>([]);
  const [manualUnavailableSlots, setManualUnavailableSlots] = useState<string[]>([]);
  const filteredReservations = useMemo(() => {
    return allReservations.filter((r) => {
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      const matchType = typeFilter === "All" || r.sessionType === typeFilter;
      const matchDoc = docFilter === "All" || (r.doctorName || "Dr. Sara El Gamel") === docFilter;
      return matchStatus && matchType && matchDoc;
    });
  }, [allReservations, statusFilter, typeFilter, docFilter]);

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

  // Synchronize dynamic bookings into notifications list
  useEffect(() => {
    if (!allReservations || allReservations.length === 0) return;

    const latestReservations = [...allReservations]
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

    setNotifications([
      {
        id: "system-1",
        title: "Clinic System Active",
        message: "Twilio SMS integration and Supabase auth are fully operational.",
        time: "Active",
        read: false,
        type: "system"
      },
      ...generatedNotifications
    ]);
  }, [allReservations, localServices]);

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
          setAdminPermissions(authData.permissions || []);
          setAdminEmail(authData.email || "");
          setAdminEmployeeId(authData.employeeId || "");
          setAdminDbId(authData.id || "");
        } else {
          console.warn("Unregistered employee session. Logging out.");
          await supabase.auth.signOut();
          setAdminRole(null);
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
        supabase.auth.signOut().then(() => {
          alert("Your session has expired due to 1 hour of inactivity. Please log in again.");
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

  useEffect(() => {
    if (adminRole === 'superadmin') return;
    if (adminPermissions.length > 0) {
      let isPermitted = false;
      if (activeNav === 'Logout' || activeNav === 'Profile') {
        isPermitted = true;
      } else {
        const settingsSubsections: Record<string, string> = {
          "Clinic Profile": "settings.profile",
          "Service Hours": "settings.service_hours",
          "Branches": "settings.branches",
          "Booking Settings": "settings.booking_settings",
          "Notification Settings": "settings.notification",
          "Queue Settings": "settings.queue",
          "Pages Settings": "settings.pages",
          "Role Management": "settings.roles"
        };
        if (settingsSubsections[activeNav]) {
          isPermitted = hasPermission(settingsSubsections[activeNav]);
        } else {
          const parentScreenMap: Record<string, string> = {
            "Bookings": "bookings",
            "Customers": "customers",
            "Providers": "providers",
            "Services": "services",
            "Settings": "settings"
          };
          const prefix = parentScreenMap[activeNav];
          if (prefix) {
            isPermitted = adminPermissions.includes(activeNav) || adminPermissions.some(p => p.startsWith(prefix + "."));
          } else {
            isPermitted = adminPermissions.includes(activeNav);
          }
        }
      }

      if (!isPermitted && permittedSidebarItems.length > 0) {
        const firstPermitted = permittedSidebarItems.find(item => item.label !== 'Logout');
        if (firstPermitted) {
          setActiveNav(firstPermitted.label);
        }
      }
    }
  }, [adminPermissions, adminRole, activeNav, permittedSidebarItems, hasPermission]);

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

    if (activeNav === "Providers") {
      const hasView = hasPermission("providers.view");
      const hasAttendance = hasPermission("providers.attendance");
      if (hasAttendance && !hasView && providerTab === "Providers") {
        setProviderTab("Attendance");
      } else if (hasView && !hasAttendance && providerTab === "Attendance") {
        setProviderTab("Providers");
      }
    }
  }, [activeNav, adminRole, adminPermissions, hasPermission, calendarView, providerTab]);

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
    if (setupPassword.length < 6) {
      setSetupError("Password must be at least 6 characters.");
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
    if (activeNav === "Profile" || ((activeNav === "Role Management" || activeNav === "Employees") && adminRole === "superadmin")) {
      fetchRolesAndEmployees();
    }
  }, [activeNav, adminRole]);

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
    } else if (adminEmail.toLowerCase() === "superadmin@revera.com") {
      setProfileName("System Owner");
    }
  }, [adminEmail, employeesList, adminRole]);

  async function fetchRolesAndEmployees() {
    console.log("RBAC - fetchRolesAndEmployees called!");
    setLoadingRolesAndEmployees(true);
    try {
      const [roles, emps] = await Promise.all([
        cachedFetch('/api/roles', 10000),
        cachedFetch('/api/employees', 10000)
      ]);
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

  const fetchHrData = useCallback(async () => {
    await Promise.all([
      fetchHrPayroll(),
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

  // Geolocation Check-In on login resolution
  useEffect(() => {
    console.log("Attendance Location Check-In triggered for user:", {
      email: adminEmail,
      role: adminRole,
      dbId: adminDbId
    });

    if (!adminEmail || !session?.access_token || !adminRole || !adminDbId) {
      console.log("Skipping check-in: missing auth data.");
      return;
    }
    
    // Superadmin and Admin do not have attendance tracking and are exempt
    if (adminRole === 'superadmin' || adminRole === 'admin') {
      console.log("Skipping check-in: Admin/Superadmin bypass.");
      return;
    }

    if (typeof window !== "undefined" && (!navigator || !navigator.geolocation)) {
      console.warn("Geolocation not supported by browser/context.");
      setLocationWarningMsg("Geolocation is not supported by your browser or connection context (requires HTTPS / localhost). Access is restricted until location verification can be performed.");
      setLocationWarningOpen(true);
      return;
    }

    // FOR TESTING: Location check runs every time the page/session is loaded.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("GPS coordinates received:", latitude, longitude);
        try {
          const res = await fetch('/api/hr/attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ employeeId: adminDbId, latitude, longitude })
          });

          if (res.ok) {
            console.log("Attendance daily check-in logged successfully.");
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn("Check-in API rejected request:", errData);
            if (errData.error === 'not_in_location') {
              setLocationWarningMsg(
                `Your current location does not match the required check-in area for your assigned branch.\n\nYou are currently ${errData.distance || 'unknown'} meters away from the branch. Access is restricted while outside the 800-meter radius.`
              );
              setLocationWarningOpen(true);
            } else if (errData.error === 'no_branch') {
              setLocationWarningMsg("Your account has no branch assigned. Please contact the administrator.");
              setLocationWarningOpen(true);
            } else if (errData.error === 'no_location_configured') {
              setLocationWarningMsg(errData.message || "No GPS coordinates configured for your assigned branch. Please contact your administrator to configure branch coordinates.");
              setLocationWarningOpen(true);
            } else {
              setLocationWarningMsg(
                errData.message || errData.error || "An unexpected error occurred during attendance verification."
              );
              setLocationWarningOpen(true);
            }
          }
        } catch (err) {
          console.error("Daily checkin API error:", err);
        }
      },
      (geoErr) => {
        console.warn("Geolocation permission denied or failed:", geoErr);
        setLocationWarningMsg("Location access was denied or failed. Attendance check-in requires GPS access to verify your work location. Please enable location in your browser settings and refresh the page.");
        setLocationWarningOpen(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [adminEmail, session, adminRole, adminDbId]);

  // 30-minute Presence Monitor for standard staff
  useEffect(() => {
    if (!session || !adminRole) return;
    // Only for standard employees (not superadmin, admin, or HR)
    if (adminRole === 'superadmin' || adminRole === 'admin' || adminRole === 'HR') return;

    const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
    if (!profileEmployee) return;

    const isTestMode = typeof window !== "undefined" && window.location.search.includes("test_presence=true");
    const intervalMs = isTestMode ? 15000 : 30 * 60 * 1000;

    const interval = setInterval(() => {
      setPresenceCountdown(10);
      setPresenceModalOpen(true);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [session, adminRole, adminEmail, employeesList]);

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
      const checkRes = await fetch(`/api/customers?email=${encodeURIComponent(emailToSign)}`);
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

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setRoleCreateError("");
    setRoleCreateSuccess("");

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, permissions: newRolePermissions })
      });

      if (res.ok) {
        setNewRoleName("");
        setNewRolePermissions([]);
        setRoleCreateSuccess("Role saved successfully!");
        fetchRolesAndEmployees();
        setTimeout(() => setRoleCreateSuccess(""), 3000);
      } else {
        const data = await res.json();
        setRoleCreateError(data.error || "Failed to create role.");
      }
    } catch (err: any) {
      setRoleCreateError(err.message || "Network error.");
    }
  }

  async function handleDeleteRole(name: string) {
    if (!(await showConfirm(`Are you sure you want to delete the role '${name}'? This will disconnect employee accounts assigned to this role.`))) return;
    try {
      const res = await fetch(`/api/roles?name=${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRolesAndEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete role.");
      }
    } catch (err: any) {
      alert("Error deleting role: " + err.message);
    }
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim() || !newEmployeeRole) return;
    if (!emailRegex.test(newEmployeeEmail.trim())) {
      setEmployeeCreateError("Please enter a valid email address.");
      return;
    }
    setEmployeeCreateError("");
    setEmployeeCreateSuccess("");

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmployeeEmail.trim().toLowerCase(),
          name: newEmployeeName.trim(),
          roleName: newEmployeeRole,
        })
      });

      if (res.ok) {
        setNewEmployeeEmail("");
        setNewEmployeeName("");
        setNewEmployeeRole("");
        setEmployeeCreateSuccess(`Invitation sent to ${newEmployeeEmail.trim()}! They will receive an email to set their password.`);
        clearFetchCache();
        fetchRolesAndEmployees();
        setTimeout(() => setEmployeeCreateSuccess(""), 6000);
      } else {
        const data = await res.json();
        setEmployeeCreateError(data.error || "Failed to send invitation.");
      }
    } catch (err: any) {
      setEmployeeCreateError(err.message || "Network error.");
    }
  }

  async function handleDeleteEmployee(id: string) {
    if (!(await showConfirm("Are you sure you want to delete this employee account? They will lose access to the admin panel immediately."))) return;
    try {
      const res = await fetch(`/api/employees?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
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
        headers: { 'Content-Type': 'application/json' },
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

  async function handleUpdateEmployeeRole(id: string, newRole: string) {
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, roleName: newRole }),
      });
      if (res.ok) {
        fetchRolesAndEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update employee role.");
      }
    } catch (err: any) {
      alert("Error updating employee role: " + err.message);
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
    const svcs = getDynamicServices();
    const cats = getDynamicCategories();
    setLocalServices(svcs);
    setLocalCategories(cats);
    
    // Set all categories expanded by default
    const exp: Record<string, boolean> = {};
    cats.forEach(c => { exp[c.key] = true; });
    setExpandedCategories(exp);

    const storedToggles = getServiceToggles();
    const defaults = Object.fromEntries(svcs.map((s) => [s.id, { visible: true, active: true }]));
    setServiceToggles({ ...defaults, ...storedToggles });
  }, []);
  // BRANCHES is now derived from the real branches state loaded from Supabase

  const hasAccessToActiveNav = useMemo(() => {
    console.log("RBAC Access Check - activeNav:", activeNav, "| adminRole:", adminRole, "| permissions:", adminPermissions);
    if (!adminRole) return false;
    if (adminRole === 'superadmin') return true;
    if (activeNav === 'Logout' || activeNav === 'Profile') return true;
    
    const settingsSubsections: Record<string, string> = {
      "Clinic Profile": "settings.profile",
      "Service Hours": "settings.service_hours",
      "Branches": "settings.branches",
      "Booking Settings": "settings.booking_settings",
      "Notification Settings": "settings.notification",
      "Queue Settings": "settings.queue",
      "Pages Settings": "settings.pages",
      "Role Management": "settings.roles"
    };
    
    if (settingsSubsections[activeNav]) {
      const perm = settingsSubsections[activeNav];
      return hasPermission(perm);
    }
    
    const parentScreenMap: Record<string, string> = {
      "Bookings": "bookings",
      "Customers": "customers",
      "Providers": "providers",
      "Services": "services",
      "Settings": "settings"
    };
    
    const prefix = parentScreenMap[activeNav];
    if (prefix) {
      return adminPermissions.includes(activeNav) || adminPermissions.some(p => p.startsWith(prefix + "."));
    }
    
    return false;
  }, [adminRole, adminPermissions, activeNav, hasPermission]);

  const [prescriptionsExpanded, setPrescriptionsExpanded] = useState(false);
  const [prescriptionsSearch, setPrescriptionsSearch] = useState("");
  const [medicinesSearch, setMedicinesSearch] = useState("");
  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [medicinePage, setMedicinePage] = useState(1);
  const PRESCRIPTION_PAGE_SIZE = 5;
  const MEDICINE_PAGE_SIZE = 5;

  const [medicineToggles, setMedicineToggles] = useState<Record<string, { visible: boolean; active: boolean }>>(
    () => Object.fromEntries(MOCK_MEDICINES.map((m) => [m.id, { visible: true, active: true }]))
  );

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

  const filteredPrescriptions = useMemo(() => {
    if (!prescriptionsSearch.trim()) return MOCK_PRESCRIPTIONS;
    const q = prescriptionsSearch.toLowerCase();
    return MOCK_PRESCRIPTIONS.filter(
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.patientEmail.toLowerCase().includes(q) ||
        p.doctorName.toLowerCase().includes(q) ||
        p.medicines.some((m) => m.toLowerCase().includes(q))
    );
  }, [prescriptionsSearch]);

  const totalPrescriptionPages = Math.ceil(filteredPrescriptions.length / PRESCRIPTION_PAGE_SIZE);
  const pagedPrescriptions = filteredPrescriptions.slice(
    (prescriptionPage - 1) * PRESCRIPTION_PAGE_SIZE,
    prescriptionPage * PRESCRIPTION_PAGE_SIZE
  );

  const filteredMedicines = useMemo(() => {
    if (!medicinesSearch.trim()) return MOCK_MEDICINES;
    const q = medicinesSearch.toLowerCase();
    return MOCK_MEDICINES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [medicinesSearch]);

  const totalMedicinePages = Math.ceil(filteredMedicines.length / MEDICINE_PAGE_SIZE);
  const pagedMedicines = filteredMedicines.slice(
    (medicinePage - 1) * MEDICINE_PAGE_SIZE,
    medicinePage * MEDICINE_PAGE_SIZE
  );

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

  function toggleMedicine(id: string, field: "visible" | "active") {
    setMedicineToggles((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: !prev[id][field] },
    }));
  }

  const [eCommerceExpanded, setECommerceExpanded] = useState(false);
  const [financesExpanded, setFinancesExpanded] = useState(false);
  const [expenseCategorySearch, setExpenseCategorySearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [payrollSearch, setPayrollSearch] = useState("");
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [smsExpanded, setSMSExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [pagesSettingsTab, setPagesSettingsTab] = useState<"Home" | "About Us" | "Services">("Home");
  const [homeHeroSlides, setHomeHeroSlides] = useState<any[]>([
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
      description: "Discover comprehensive dermatology, cosmetic surgery, laser treatments, and dental services tailored to your unique needs. With over 15 years of professional expertise, we're here to guide you toward lasting beauty and wellness.",
      bookBtn: "Book Appointment",
      rating: "4.5",
      reviewCount: "(1000+ review)",
      image: "/images/hero/slide-2.jpg"
    },
    {
      welcome: "Welcome to Revera Clinics",
      heading: "Your Beauty & Health Journey Starts Here!",
      description: "Specialized clinics under full medical supervision offering services in dermatology, cosmetic surgery, laser treatments, and dental care for all ages.",
      bookBtn: "Book Appointment",
      rating: "4.5",
      reviewCount: "(1000+ review)",
      image: "/images/hero/slide-3.jpg"
    }
  ]);
  const [homeHeroSlidesAr, setHomeHeroSlidesAr] = useState<any[]>([
    {
      welcome: "مرحباً بكم في عيادات كريستال روز",
      heading: "حوّل جمالك بشكل طبيعي!",
      description: "خدمات متخصصة في طب الجلدية والجراحة التجميلية مع رعاية شخصية مصممة لمساعدتك على تحقيق أهدافك في الجمال والصحة من خلال تقنيات طبية متقدمة.",
      bookBtn: "احجز موعدًا",
      rating: "4.5",
      reviewCount: "(1000+ تقييم)",
      image: "/images/hero/slide-1.jpg"
    },
    {
      welcome: "مرحباً بكم في عيادات كريستال روز",
      heading: "رعاية طبية متقدمة يمكنك الوثوق بها!",
      description: "اكتشف خدمات شاملة في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان المصممة لاحتياجاتك الفريدة. مع أكثر من 15 عامًا من الخبرة المهنية، نحن هنا لإرشادك نحو الجمال الدائم والعافية.",
      bookBtn: "احجز موعدًا",
      rating: "4.5",
      reviewCount: "(1000+ تقييم)",
      image: "/images/hero/slide-2.jpg"
    },
    {
      welcome: "مرحباً بكم في عيادات كريستال روز",
      heading: "رحلتك نحو الجمال والصحة تبدأ هنا!",
      description: "عيادات متخصصة تحت إشراف طبي كامل تقدم خدمات في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان لجميع الأعمار.",
      bookBtn: "احجز موعدًا",
      rating: "4.5",
      reviewCount: "(1000+ تقييم)",
      image: "/images/hero/slide-3.jpg"
    }
  ]);
  const [providers, setProviders] = useState<any[]>(PROVIDERS);

  const isDoctorAvailableAdmin = useCallback((
    doctor: any,
    branchId: string | null,
    dateStr: string | null,
    timeSlotStr: string | null,
    serviceId: number | null
  ): boolean => {
    if (!dateStr || !timeSlotStr || !serviceId) return true;

    if (branchId && doctor.branchId && doctor.branchId !== branchId) {
      return false;
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
    const durationNew = targetService ? getDurationInMinutes(targetService.duration) : 30;
    const endNew = startNew + durationNew;

    if (doctor.workingDaysHours) {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const weekdayName = weekdays[dateObj.getDay()];
        const dayConfig = doctor.workingDaysHours[weekdayName];
        if (!dayConfig || !dayConfig.isOpen) {
          return false;
        }
        const [sh, sm] = dayConfig.start.split(":").map(Number);
        const [eh, em] = dayConfig.end.split(":").map(Number);
        const shiftStart = sh * 60 + sm;
        const shiftEnd = eh * 60 + em;

        if (startNew < shiftStart || endNew > shiftEnd) {
          return false;
        }
      }
    }

    const hasOverlap = allReservations.some((res) => {
      if (res.doctorName && res.doctorName === doctor.name && res.status !== "rejected") {
        if (res.date === dateStr && res.timeSlot) {
          const startRes = timeToMinutes(res.timeSlot);
          const resService = localServices.find((s) => s.id === res.serviceId);
          const durationRes = resService ? getDurationInMinutes(resService.duration) : 30;
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

  const availableDoctorsNewPatient = useMemo(() => {
    return providers.filter(p => isDoctorAvailableAdmin(p, newPatientBranch, newPatientDate, newPatientTimeSlot, newPatientService));
  }, [providers, newPatientBranch, newPatientDate, newPatientTimeSlot, newPatientService, isDoctorAvailableAdmin]);

  useEffect(() => {
    if (availableDoctorsNewPatient.length > 0) {
      if (!availableDoctorsNewPatient.some(d => d.name === newPatientDoctor)) {
        setNewPatientDoctor(availableDoctorsNewPatient[0].name);
      }
    } else {
      setNewPatientDoctor("");
    }
  }, [availableDoctorsNewPatient, newPatientDoctor]);

  const availableDoctorsApprove = useMemo(() => {
    if (!selected) return [];
    return providers.filter(p => isDoctorAvailableAdmin(p, selected.branchId ?? null, selected.date, slot, selected.serviceId));
  }, [providers, selected, slot, isDoctorAvailableAdmin]);

  useEffect(() => {
    if (selected && availableDoctorsApprove.length > 0) {
      if (!availableDoctorsApprove.some(d => d.name === doctorName)) {
        setDoctorName(availableDoctorsApprove[0].name);
      }
    } else if (selected) {
      setDoctorName("");
    }
  }, [availableDoctorsApprove, doctorName, selected]);


  // Custom provider modal states
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerModalMode, setProviderModalMode] = useState<"add" | "edit">("add");
  const [providerEditingId, setProviderEditingId] = useState<string | null>(null);
  const [providerFormName, setProviderFormName] = useState("");
  const [providerFormRating, setProviderFormRating] = useState(5);
  const [providerFormMore, setProviderFormMore] = useState(0);
  const [providerFormSelectedServices, setProviderFormSelectedServices] = useState<string[]>([]);
  const [providerFormImage, setProviderFormImage] = useState("");
  const [providerFormPhone, setProviderFormPhone] = useState("");
  const [providerFormGender, setProviderFormGender] = useState<"Male" | "Female" | "">("");
  const [providerFormAge, setProviderFormAge] = useState<string>("");
  const [providerFormSpecialty, setProviderFormSpecialty] = useState("");
  const [providerFormNationalId, setProviderFormNationalId] = useState("");
  const [providerFormBranchId, setProviderFormBranchId] = useState("");
  const [providerFormStartDate, setProviderFormStartDate] = useState("");
  const [providerFormWorkingDaysHours, setProviderFormWorkingDaysHours] = useState<Record<string, { isOpen: boolean; start: string; end: string }>>({
    Sunday: { isOpen: false, start: "10:00", end: "20:00" },
    Monday: { isOpen: false, start: "10:00", end: "20:00" },
    Tuesday: { isOpen: false, start: "10:00", end: "20:00" },
    Wednesday: { isOpen: false, start: "10:00", end: "20:00" },
    Thursday: { isOpen: false, start: "10:00", end: "20:00" },
    Friday: { isOpen: false, start: "10:00", end: "20:00" },
    Saturday: { isOpen: false, start: "10:00", end: "20:00" }
  });
  const [savingProvider, setSavingProvider] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingProviderAttendance, setLoadingProviderAttendance] = useState(false);
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);

  const [showProviderFilterPanel, setShowProviderFilterPanel] = useState(false);
  const [providerFilterBranchId, setProviderFilterBranchId] = useState("All");
  const [providerFilterSpecialty, setProviderFilterSpecialty] = useState("All");
  const [providerFilterGender, setProviderFilterGender] = useState("All");
  const [providerSearchQuery, setProviderSearchQuery] = useState("");

  const [loadingPageSettings, setLoadingPageSettings] = useState(false);
  const [savingPageSettings, setSavingPageSettings] = useState(false);
  // ── Branches state ──
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchModal, setBranchModal] = useState<{ open: boolean; mode: "add" | "edit"; branch: Partial<Branch> }>({
    open: false, mode: "add", branch: {}
  });
  const [savingBranch, setSavingBranch] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [selectedBranchForHoursId, setSelectedBranchForHoursId] = useState<string>("");
  const [savingBranchHours, setSavingBranchHours] = useState(false);
  const [serviceHours, setServiceHours] = useState<Array<{ day: string; dayAr: string; isOpen: boolean; openTime: string; closeTime: string }>>([
    { day: "Sunday", dayAr: "الأحد", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Monday", dayAr: "الإثنين", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Tuesday", dayAr: "الثلاثاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Wednesday", dayAr: "الأربعاء", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Thursday", dayAr: "الخميس", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Friday", dayAr: "الجمعة", isOpen: false, openTime: "09:00", closeTime: "20:00" },
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

  const [reportsCustomerSearch, setReportsCustomerSearch] = useState("");
  const [smsTemplateSearch, setSmsTemplateSearch] = useState("");
  const [smsLogSearch, setSmsLogSearch] = useState("");
  const [settingsUserSearch, setSettingsUserSearch] = useState("");

  // ── Clinic Profile Settings State ──
  const [clinicName, setClinicName] = useState("Revera Clinics");
  const [clinicNameAr, setClinicNameAr] = useState("ريفيرا كلينيك");
  const [clinicLocation, setClinicLocation] = useState("Sheikh Zayed City, Giza");
  const [clinicLocationAr, setClinicLocationAr] = useState("مدينة الشيخ زايد، الجيزة");
  const [clinicEmail, setClinicEmail] = useState("info@reveraclinics.com");
  const [clinicPhone, setClinicPhone] = useState("+20 2 3796 2200");
  const [clinicWhatsapp, setClinicWhatsapp] = useState("+201035595691");
  const [savingClinicProfile, setSavingClinicProfile] = useState(false);

  const [bookingMinAdvance, setBookingMinAdvance] = useState(2);
  const [bookingMaxAdvance, setBookingMaxAdvance] = useState(30);
  const [bookingCancelWindow, setBookingCancelWindow] = useState(4);
  const [bookingMaxPerSlot, setBookingMaxPerSlot] = useState(3);
  const [bookingInstantApproval, setBookingInstantApproval] = useState(false);
  const [bookingShowDoctorNotes, setBookingShowDoctorNotes] = useState(true);
  const [bookingDepositPercentage, setBookingDepositPercentage] = useState(20);
  const [savingBookingSettings, setSavingBookingSettings] = useState(false);

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
  const [eCommerceSearch, setECommerceSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [posCart, setPosCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [productPage, setProductPage] = useState(1);
  const PRODUCT_PAGE_SIZE = 5;

  const filteredProducts = useMemo(() => {
    if (!eCommerceSearch.trim()) return MOCK_PRODUCTS;
    const q = eCommerceSearch.toLowerCase();
    return MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [eCommerceSearch]);

  const totalProductPages = Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE);
  const pagedProducts = filteredProducts.slice(
    (productPage - 1) * PRODUCT_PAGE_SIZE,
    productPage * PRODUCT_PAGE_SIZE
  );

  const [productToggles, setProductToggles] = useState<Record<string, { visible: boolean; active: boolean }>>(
    () => Object.fromEntries(MOCK_PRODUCTS.map((p) => [p.id, { visible: true, active: true }]))
  );

  function toggleProduct(id: string, field: "visible" | "active") {
    setProductToggles((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: !prev[id][field] },
    }));
  }

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
      if (newPatientBranch && doc.branchId && doc.branchId !== newPatientBranch) return;
      
      // Check service
      if (doc.services && doc.services.length > 0) {
        if (!doc.services.includes(targetService.en)) return;
      }

      // Check working days & hours
      if (doc.workingDaysHours) {
        const dayConfig = doc.workingDaysHours[weekdayName];
        if (dayConfig && dayConfig.isOpen) {
          const [sh, sm] = dayConfig.start.split(":").map(Number);
          const [eh, em] = dayConfig.end.split(":").map(Number);
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;
          if (startMins < minStart) minStart = startMins;
          if (endMins > maxEnd) maxEnd = endMins;
          found = true;
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
  }, [providers, newPatientBranch, newPatientService, localServices, serviceHours, branches]);

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
      if (selectedReq.branchId && doc.branchId && doc.branchId !== selectedReq.branchId) return;
      
      // Check service
      if (doc.services && doc.services.length > 0) {
        if (!doc.services.includes(targetService.en)) return;
      }

      // Check working days & hours
      if (doc.workingDaysHours) {
        const dayConfig = doc.workingDaysHours[weekdayName];
        if (dayConfig && dayConfig.isOpen) {
          const [sh, sm] = dayConfig.start.split(":").map(Number);
          const [eh, em] = dayConfig.end.split(":").map(Number);
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;
          if (startMins < minStart) minStart = startMins;
          if (endMins > maxEnd) maxEnd = endMins;
          found = true;
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


  // Derive unique customers from database
  const customers = useMemo<Customer[]>(() => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const list = Array.isArray(dbCustomers) ? dbCustomers : [];

    return list.map((c) => {
      // Find if this customer has a booking in the last 2 weeks
      const customerReservations = allReservations.filter((r) => 
        (r.phone && (r.phone === c.mobile || r.phone === c.phone)) ||
        (r.customerId && r.customerId === c.id)
      );

      const hasRecentBooking = customerReservations.some((r) => {
        if (!r.date) return false;
        const bookingDate = new Date(String(r.date).slice(0, 10) + 'T00:00:00');
        return bookingDate >= twoWeeksAgo;
      });

      // Determine active status:
      // If explicitly set to inactive in DB, then it's inactive.
      // Otherwise, active only if they have a booking in the last 2 weeks OR if they registered in the last 2 weeks.
      const regDateStr = c.registration_date || c.created_at || now.toISOString();
      const regDate = new Date(regDateStr);
      const registeredRecently = regDate >= twoWeeksAgo;
      const isActive = c.active !== false && (hasRecentBooking || registeredRecently);

      return {
        ...c,
        id: c.id,
        email: c.email || "",
        name: c.name,
        phone: c.mobile || "",
        createdAt: regDateStr,
        bookings: c.number_of_bookings || 0,
        spent: Number(c.spent_amount || 0),
        outstanding: Number(c.outstanding || 0),
        wallet: Number(c.wallet_balance || 0),
        active: isActive,
      };
    });
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
      { label: "New customers", value: String(newCustomersCount), accent: "bg-[#C4AE7C]/10", icon: Users },
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
    fetchCustomers();
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

  // Re-fetch bookings whenever branch selection changes and poll every 2 seconds for new requests
  useEffect(() => {
    if (!branch) return; // wait until branches are loaded

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const poll = async () => {
      try {
        // Clear specific endpoints cache entries to force fresh server response
        clearFetchCache(`/api/reservations?status=pending&branchId=${branch}`);
        clearFetchCache(`/api/reservations?branchId=${branch}`);
        
        await Promise.all([
          fetchRequests() || Promise.resolve(),
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
          // Schedule next poll in 2 seconds after the current fetches complete
          timerId = setTimeout(poll, 2000);
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

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

  function fetchProviders() {
    cachedFetch("/api/providers", 10000)
      .then((data) => {
        if (Array.isArray(data)) {
          setProviders(data);
        }
      })
      .catch((err) => console.error("fetchProviders error:", err));
  }

  async function fetchAttendance(dateStr: string) {
    setLoadingProviderAttendance(true);
    try {
      const res = await fetch(`/api/provider-attendance?date=${dateStr}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data);
      } else {
        console.error("Failed to fetch attendance");
      }
    } catch (err) {
      console.error("fetchAttendance error:", err);
    } finally {
      setLoadingProviderAttendance(false);
    }
  }

  async function handleToggleAttendance(providerId: string, status: "Present" | "Absent" | "On Leave") {
    setSavingAttendanceId(providerId);
    try {
      const existing = attendanceRecords.find(r => r.provider_id === providerId);
      const payload = {
        providerId,
        date: attendanceDate,
        status,
        checkIn: status === "Present" ? "09:00" : null,
        checkOut: status === "Present" ? "17:00" : null,
        notes: existing?.notes || ""
      };

      const res = await fetch("/api/provider-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchAttendance(attendanceDate);
      } else {
        alert("Failed to save attendance record.");
      }
    } catch (err) {
      console.error("handleToggleAttendance error:", err);
      alert("Error saving attendance.");
    } finally {
      setSavingAttendanceId(null);
    }
  }

  useEffect(() => {
    if (providerTab === "Attendance") {
      fetchAttendance(attendanceDate);
    }
  }, [providerTab, attendanceDate, fetchAttendance]);

  function openAddProviderModal() {
    setProviderModalMode("add");
    setProviderEditingId(null);
    setProviderFormName("");
    setProviderFormRating(5);
    setProviderFormMore(0);
    setProviderFormSelectedServices([]);
    setProviderFormImage("");
    setProviderFormPhone("");
    setProviderFormGender("");
    setProviderFormAge("");
    setProviderFormSpecialty("");
    setProviderFormNationalId("");
    setProviderFormBranchId(branches.length > 0 ? branches[0].id : "");
    setProviderFormStartDate("");
    setProviderFormWorkingDaysHours({
      Sunday: { isOpen: false, start: "09:00", end: "20:00" },
      Monday: { isOpen: false, start: "09:00", end: "20:00" },
      Tuesday: { isOpen: false, start: "09:00", end: "20:00" },
      Wednesday: { isOpen: false, start: "09:00", end: "20:00" },
      Thursday: { isOpen: false, start: "09:00", end: "20:00" },
      Friday: { isOpen: false, start: "09:00", end: "20:00" },
      Saturday: { isOpen: false, start: "09:00", end: "20:00" }
    });
    setShowProviderModal(true);
  }

  function openEditProviderModal(provider: any) {
    setProviderModalMode("edit");
    setProviderEditingId(provider.id);
    setProviderFormName(provider.name);
    setProviderFormRating(provider.rating || 5);
    setProviderFormMore(provider.more || 0);
    setProviderFormSelectedServices(provider.services || []);
    setProviderFormImage(provider.image || "");
    setProviderFormPhone(provider.phone || "");
    setProviderFormGender(provider.gender || "");
    setProviderFormAge(provider.age ? String(provider.age) : "");
    setProviderFormSpecialty(provider.specialty || "");
    setProviderFormNationalId(provider.nationalId || "");
    setProviderFormBranchId(provider.branchId || "");
    setProviderFormStartDate(provider.startDate || "");
    setProviderFormWorkingDaysHours(provider.workingDaysHours || {
      Sunday: { isOpen: false, start: "09:00", end: "20:00" },
      Monday: { isOpen: false, start: "09:00", end: "20:00" },
      Tuesday: { isOpen: false, start: "09:00", end: "20:00" },
      Wednesday: { isOpen: false, start: "09:00", end: "20:00" },
      Thursday: { isOpen: false, start: "09:00", end: "20:00" },
      Friday: { isOpen: false, start: "09:00", end: "20:00" },
      Saturday: { isOpen: false, start: "09:00", end: "20:00" }
    });
    setShowProviderModal(true);
  }

  function handleSaveProvider() {
    if (!providerFormName.trim()) {
      alert("Provider Name is required.");
      return;
    }

    setSavingProvider(true);

    const payload = {
      name: providerFormName.trim(),
      services: providerFormSelectedServices,
      rating: Number(providerFormRating),
      more: Math.max(0, providerFormSelectedServices.length - 2),
      image: providerFormImage || null,
      phone: providerFormPhone || null,
      gender: providerFormGender || null,
      age: providerFormAge ? Number(providerFormAge) : null,
      specialty: providerFormSpecialty || null,
      nationalId: providerFormNationalId || null,
      workingDaysHours: providerFormWorkingDaysHours,
      branchId: providerFormBranchId || null,
      startDate: providerFormStartDate || null
    };

    const isEdit = providerModalMode === "edit";
    const url = isEdit ? `/api/providers?id=${providerEditingId}` : "/api/providers";
    const method = isEdit ? "PATCH" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          fetchProviders();
          setShowProviderModal(false);
          alert(isEdit ? "Provider updated successfully!" : "Provider added successfully!");
        } else {
          alert(data.error || "Failed to save provider.");
        }
      })
      .catch((err) => {
        console.error("handleSaveProvider error:", err);
        alert("Error saving provider.");
      })
      .finally(() => {
        setSavingProvider(false);
      });
  }

  async function handleDeleteProvider(id: string) {
    if (!id) return;
    if (await showConfirm("Are you sure you want to delete this provider?")) {
      fetch(`/api/providers?id=${id}`, {
        method: "DELETE"
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            fetchProviders();
            alert("Provider deleted successfully!");
          } else {
            alert("Failed to delete provider.");
          }
        })
        .catch((err) => {
          console.error("handleDeleteProvider error:", err);
          alert("Error deleting provider.");
        });
    }
  }

  function fetchPageSettings() {
    setLoadingPageSettings(true);
    cachedFetch("/api/page-settings", 15000)
      .then((data) => {
        if (data) {
          setHomeHeroSlides(data.hero?.slides || []);
          setHomeHeroSlidesAr(data.hero?.slides_ar || []);
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
            setBookingDepositPercentage(data.booking.depositPercentage ?? 20);
          }

          if (data.footer && data.footer.serviceHours) {
            setServiceHours(data.footer.serviceHours);
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
        headers: { "Content-Type": "application/json" },
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
    if (profilePassword.length < 6) {
      setProfilePasswordError("Password must be at least 6 characters.");
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

  // ── Settings Panel Handlers ──
  async function handleSaveClinicProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingClinicProfile(true);
    try {
      await fetch("/api/page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic: { name: clinicName, name_ar: clinicNameAr, location: clinicLocation, location_ar: clinicLocationAr, email: clinicEmail, phone: clinicPhone, whatsapp: clinicWhatsapp }
        }),
      });
    } catch (err) {
      console.error("handleSaveClinicProfile error:", err);
    } finally {
      setSavingClinicProfile(false);
    }
  }

  async function handleSaveBookingSettings() {
    setSavingBookingSettings(true);
    try {
      await fetch("/api/page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking: {
            minAdvance: bookingMinAdvance,
            maxAdvance: bookingMaxAdvance,
            cancelWindow: bookingCancelWindow,
            maxPerSlot: bookingMaxPerSlot,
            instantApproval: bookingInstantApproval,
            showDoctorNotes: bookingShowDoctorNotes,
            depositPercentage: bookingDepositPercentage
          }
        }),
      });
    } catch (err) {
      console.error("handleSaveBookingSettings error:", err);
    } finally {
      setSavingBookingSettings(false);
    }
  }

  async function handleSaveNotificationSettings() {
    setSavingNotificationSettings(true);
    try {
      await fetch("/api/page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: { smsOtp: notifSmsOtp, whatsapp: notifWhatsApp, email: notifEmailConfirm, smsTemplate: notifSmsTemplate, smsTemplateAr: notifSmsTemplateAr, reminderHours: notifReminderHours, staffEmail: notifStaffEmail }
        }),
      });
    } catch (err) {
      console.error("handleSaveNotificationSettings error:", err);
    } finally {
      setSavingNotificationSettings(false);
    }
  }

  async function handleSaveQueueSettings() {
    setSavingQueueSettings(true);
    try {
      await fetch("/api/page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue: { virtualRoom: queueVirtualRoom, showOnScreens: queueShowOnScreens, autoCheckIn: queueAutoCheckIn, alertThreshold: queueAlertThreshold, avgSessionDuration: queueAvgSessionDuration }
        }),
      });
    } catch (err) {
      console.error("handleSaveQueueSettings error:", err);
    } finally {
      setSavingQueueSettings(false);
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
      }
    };

    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBranchForHoursId,
          service_hours: serviceHours
        })
      });
      if (res.ok) {
        const updatedBranch = await res.json();
        setBranches(prev => prev.map(b => b.id === updatedBranch.id ? updatedBranch : b));
        alert("Branch service hours saved successfully!");
      } else {
        alert("Failed to save branch service hours.");
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

  function fetchRequests() {
    setLoading(true);
    const branchParam = branch ? `&branchId=${branch}` : "";
    return cachedFetch(`/api/reservations?status=pending${branchParam}`, 2000)
      .then((data) => {
        if (Array.isArray(data)) {
          setRequests(data);
        } else {
          console.error("fetchRequests: expected array, got", data);
          setRequests([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof TypeError || String(err).includes("Failed to fetch")) {
          console.warn("fetchRequests: Network connection lost (Failed to fetch)");
        } else {
          console.error("fetchRequests error:", err);
        }
        setRequests([]);
        setLoading(false);
      });
  }

  function fetchScheduleReservations() {
    const dateStr = [
      scheduleDate.getFullYear(),
      String(scheduleDate.getMonth() + 1).padStart(2, '0'),
      String(scheduleDate.getDate()).padStart(2, '0'),
    ].join('-');
    fetch(`/api/reservations?date=${dateStr}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setScheduleReservations(data);
        else setScheduleReservations([]);
      })
      .catch(() => setScheduleReservations([]));
  }

  function fetchCustomers() {
    setLoadingCustomers(true);
    cachedFetch("/api/customers", 4000)
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
  }

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
    setCustName("");
    setCustMobile("");
    setCustEmail("");
    setCustGender("");
    setCustActive(true);
    setCustSpent("0");
    setCustOutstanding("0");
    setCustWallet("0");
    setCustArea("");
    setCustLocationName("");
    setCustStreet("");
    setCustBuilding("");
    setCustFloor("");
    setCustNote("");
    setCustAge("");
    setCustNationalId("");
    setCustAddress("");
    setCustReferral("");
    setCustOccupation("");
    setCustomerFormError("");
    setSelectedCustomerForEdit(null);
    setShowCustomerFormModal(true);
  }

  function handleOpenEditCustomer(c: Customer) {
    setCustName(c.name || "");
    setCustMobile(c.mobile || c.phone || "");
    setCustEmail(c.email || "");
    setCustGender((c.gender as any) || "");
    setCustActive(c.active !== undefined ? c.active : true);
    setCustSpent(String(c.spent_amount !== undefined ? c.spent_amount : c.spent || 0));
    setCustOutstanding(String(c.outstanding || 0));
    setCustWallet(String(c.wallet_balance || c.wallet || 0));
    setCustArea(c.area || "");
    setCustLocationName(c.location_name || "");
    setCustStreet(c.street_name || "");
    setCustBuilding(c.building_no || "");
    setCustFloor(c.floor_no || "");
    setCustNote(c.note || "");
    setCustAge(c.age !== undefined && c.age !== null ? String(c.age) : "");
    setCustNationalId(c.national_id || "");
    setCustAddress(c.address || "");
    setCustReferral(c.referral || "");
    setCustOccupation(c.occupation || "");
    setCustomerFormError("");
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
          headers: { "Content-Type": "application/json" },
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

  function handleSaveCustomer() {
    if (!custName.trim()) {
      setCustomerFormError("Customer name is required.");
      return;
    }
    if (!custMobile.trim()) {
      setCustomerFormError("Mobile number is required.");
      return;
    }

    // Validate Egyptian mobile number format
    let cleanedMobile = custMobile.trim();
    if (cleanedMobile.startsWith("+20")) {
      cleanedMobile = "0" + cleanedMobile.slice(3);
    } else if (cleanedMobile.startsWith("0020")) {
      cleanedMobile = "0" + cleanedMobile.slice(4);
    }
    if (!/^01[0125]\d{8}$/.test(cleanedMobile)) {
      setCustomerFormError("Please enter a valid Egyptian mobile number (11 digits, starting with 010, 011, 012, or 015).");
      return;
    }

    setSavingCustomer(true);
    setCustomerFormError("");

    const payload = {
      id: selectedCustomerForEdit?.id || undefined,
      name: custName.trim(),
      mobile: cleanedMobile,
      email: custEmail.trim() || null,
      gender: custGender || null,
      active: custActive,
      spent_amount: parseFloat(custSpent) || 0,
      outstanding: parseFloat(custOutstanding) || 0,
      wallet_balance: parseFloat(custWallet) || 0,
      area: custArea.trim() || null,
      location_name: custLocationName.trim() || null,
      street_name: custStreet.trim() || null,
      building_no: custBuilding.trim() || null,
      floor_no: custFloor.trim() || null,
      note: custNote.trim() || null,
      // new demographic fields
      age: custAge ? parseInt(custAge) : null,
      national_id: custNationalId.trim() || null,
      address: custAddress.trim() || null,
      referral: custReferral.trim() || null,
      occupation: custOccupation.trim() || null,
    };

    fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to save customer");
        }
        return data;
      })
      .then(() => {
        fetchCustomers();
        setShowCustomerFormModal(false);
      })
      .catch((err) => {
        console.error("handleSaveCustomer error:", err);
        setCustomerFormError(err.message || "An error occurred while saving the customer.");
      })
      .finally(() => {
        setSavingCustomer(false);
      });
  }

  function handleDeleteCustomer(id: string) {
    setDeletingCustomer(true);
    fetch(`/api/customers?id=${id}`, {
      method: "DELETE",
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

  function fetchAllReservations() {
    const branchParam = branch ? `?branchId=${branch}` : "";
    return cachedFetch(`/api/reservations${branchParam}`, 2000)
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
    const targetDuration = getDurationInMinutes(svc?.duration);
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

  async function openApprove(r: Req) {
    setLoadingApproveId(r.id);
    try {
      const branchParam = r.branchId ? `&branchId=${r.branchId}` : "";
      const data = await fetch(`/api/availability?date=${r.date}&serviceId=${r.serviceId}${branchParam}`).then((res) => res.json());
      const { start, end } = getDayOperatingHoursApprove(r);
      const unavailable = data && Array.isArray(data.unavailableSlots) ? data.unavailableSlots : [];
      setApproveUnavailableSlots(unavailable);
      const filteredSlots = SLOTS.filter((s) => {
        const norm = normaliseTo24hSlot(s) ?? "";
        return norm >= start && norm < end;
      });
      const first = filteredSlots.find((s) => !unavailable.includes(s)) || filteredSlots[0] || SLOTS[0];
      setSlot(first);
      setDoctorName("Dr. Sara El Gamel");
      setSelected(r);
    } catch (err) {
      console.error("openApprove error:", err);
    } finally {
      setLoadingApproveId(null);
    }
  }

  async function approve() {
    if (!selected) return;
    const res = await fetch(
      "/api/reservations?id=" + encodeURIComponent(selected.id),
      {
        method: "PATCH",
        body: JSON.stringify({ action: "approve", timeSlot: slot, doctorName }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const json = await res.json();
    if (!res.ok) alert(json.error || "Failed");
    setSelected(null);
    clearFetchCache();
    fetchRequests();
    fetchAllReservations();
  }

  async function handleManualPhoneChange(val: string) {
    setNewPatientPhone(val);
    
    // Clean and validate Egyptian mobile number
    let cleaned = val.replace(/[^\d]/g, "");
    if (cleaned.startsWith("201") && cleaned.length === 12) {
      cleaned = "0" + cleaned.slice(2);
    } else if (cleaned.startsWith("1") && cleaned.length === 10) {
      cleaned = "0" + cleaned;
    }
    
    if (/^01[0-9]{9}$/.test(cleaned)) {
      try {
        const res = await fetch(`/api/customers?mobile=${cleaned}`);
        if (res.ok) {
          const customer = await res.json();
          if (customer) {
            if (customer.name) setNewPatientName(customer.name);
            if (customer.email) setNewPatientEmail(customer.email);
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

    const payload = {
      serviceId: Number(newPatientService),
      date: newPatientDate,
      requestedTime: newPatientTimeSlot,
      name: newPatientName,
      email: newPatientEmail,
      phone: newPatientPhone,
      notes: newPatientNotes,
      sessionType: newPatientSessionType,
      status: newPatientStatus,
      timeSlot: newPatientStatus === 'approved' ? newPatientTimeSlot : null,
      doctorName: newPatientStatus === 'approved' ? newPatientDoctor : null,
      branchId: newPatientBranch || null,
      isManual: true,
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            timeSlot: newPatientTimeSlot,
            doctorName: newPatientDoctor,
          }),
        });
      } else if (newPatientStatus === 'rejected') {
        await fetch(`/api/reservations?id=${created.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
          }),
        });
      }

      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
      setNewPatientDate("");
      setNewPatientTimeSlot("12:00");
      setNewPatientService(1);
      setNewPatientSessionType("in_person");
      setNewPatientDoctor("Dr. Sara El Gamel");
      setNewPatientNotes("");
      setNewPatientStatus("approved");

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
        body: JSON.stringify({ status: viewingBooking.status, notes: newNotes }),
        headers: { "Content-Type": "application/json" },
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
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print/download the invoice.");
      return;
    }

    const serviceRows = servicesList.map(s => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #F2EFE9; text-align: left; color: #1F251A; font-weight: 600;">${s.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #F2EFE9; text-align: center; color: #5A6A51;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #F2EFE9; text-align: right; color: #1F251A;">EGP ${s.price.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #F2EFE9; text-align: right; color: #1F251A; font-weight: bold;">EGP ${s.price.toLocaleString()}</td>
      </tr>
    `).join("");

    const invoiceNo = `REV-INV-${booking.id.slice(0, 8).toUpperCase()}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNo} - Revera Clinics</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Sora:wght@300;400;600;700&display=swap');
            body {
              font-family: 'Sora', sans-serif;
              margin: 40px;
              color: #1F251A;
              background-color: #fff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #414E36;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .logo-area h1 {
              font-family: 'Marcellus', serif;
              color: #414E36;
              margin: 0;
              font-size: 28px;
              letter-spacing: 0.1em;
            }
            .logo-area p {
              margin: 4px 0 0 0;
              font-size: 12px;
              color: #5A6A51;
            }
            .invoice-title-area {
              text-align: right;
            }
            .invoice-title-area h2 {
              margin: 0;
              color: #C4AE7C;
              font-size: 32px;
              font-family: 'Marcellus', serif;
              letter-spacing: 0.05em;
            }
            .invoice-title-area p {
              margin: 6px 0 0 0;
              font-size: 13px;
              color: #5A6A51;
            }
            .billing-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              font-size: 14px;
            }
            .billed-to, .booking-details {
              width: 48%;
            }
            .billing-info h3 {
              color: #414E36;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 12px;
              border-bottom: 1px solid rgba(65, 78, 54, 0.1);
              padding-bottom: 6px;
            }
            .billing-info p {
              margin: 6px 0;
              line-height: 1.4;
            }
            .table-container {
              margin-bottom: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            th {
              background-color: #EDF1EC;
              color: #414E36;
              font-weight: 600;
              padding: 12px;
              text-align: left;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.05em;
            }
            .summary-table {
              width: 320px;
              margin-left: auto;
              font-size: 14px;
            }
            .summary-table td {
              padding: 8px 12px;
            }
            .summary-table tr.total-row {
              font-weight: bold;
              font-size: 16px;
              color: #414E36;
              border-top: 2px solid #414E36;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              border-top: 1px solid #F2EFE9;
              padding-top: 20px;
              font-size: 12px;
              color: #5A6A51;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <h1>REVERA CLINICS</h1>
              <p>Sheikh Zayed / New Cairo Branches</p>
              <p>Phone: (+20) 01035595691</p>
              <p>Email: inquiries@reveraclinics.com</p>
            </div>
            <div class="invoice-title-area">
              <h2>INVOICE</h2>
              <p><strong>Invoice No:</strong> ${invoiceNo}</p>
              <p><strong>Date:</strong> ${booking.date}</p>
            </div>
          </div>

          <div class="billing-info">
            <div class="billed-to">
              <h3>Billed To</h3>
              <p><strong>Patient Name:</strong> ${booking.name}</p>
              <p><strong>Phone:</strong> ${booking.phone}</p>
              <p><strong>Email:</strong> ${booking.email || "—"}</p>
            </div>
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Date:</strong> ${booking.date}</p>
              <p><strong>Time Slot:</strong> ${booking.timeSlot || "—"}</p>
              <p><strong>Doctor:</strong> ${booking.doctorName || "—"}</p>
              <p><strong>Branch:</strong> ${branchName}</p>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Service Rendered</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 120px;">Unit Price</th>
                  <th style="text-align: right; width: 120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${serviceRows}
              </tbody>
            </table>
          </div>

          <table class="summary-table">
            <tr>
              <td style="color: #5A6A51;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">EGP ${totalCost.toLocaleString()}</td>
            </tr>
            ${walletUsed > 0 ? `
            <tr>
              <td style="color: #5A6A51;">Paid from Wallet:</td>
              <td style="text-align: right; font-weight: 600; color: #414E36;">- EGP ${walletUsed.toLocaleString()}</td>
            </tr>
            ` : ""}
            <tr class="total-row">
              <td>Amount Paid:</td>
              <td style="text-align: right;">EGP ${booking.amountPaid.toLocaleString()}</td>
            </tr>
            ${booking.amountLeft > 0 ? `
            <tr style="color: #DC2626; font-weight: 600;">
              <td>Outstanding Due:</td>
              <td style="text-align: right;">EGP ${booking.amountLeft.toLocaleString()}</td>
            </tr>
            ` : ""}
          </table>

          <div class="footer">
            <p>Thank you for choosing Revera Clinics!</p>
            <p style="font-size: 10px; margin-top: 6px; color: #A3A3A3;">Generated automatically on ${new Date().toLocaleDateString()}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const calendarDays = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2EFE9] text-[#414E36]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C4AE7C] border-t-transparent"></div>
          <p className="text-sm font-semibold tracking-wider">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  if (!session || !adminRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2EFE9] px-4">
        <div className="w-full max-w-md rounded-[32px] bg-[#FBFBF9] p-8 shadow-[0_20px_60px_rgba(31,37,26,0.15)] animate-fadeIn">
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
              className="w-full rounded-2xl bg-[#414E36] py-3.5 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-60 disabled:cursor-not-allowed"
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

  return (
    <div className="min-h-screen bg-[#F2EFE9] text-[#1F251A]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] h-screen flex-col bg-[#414E36] px-6 py-8 text-[#FBFBF9] shadow-[0_0_70px_rgba(0,0,0,0.08)] transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md p-2">
                <Image
                  src="/images/main_logo.png"
                  alt="Revera Clinics"
                  fill
                  style={{ objectFit: "contain", padding: "4px" }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#FBFBF9]/60 leading-none mb-1">
                  Revera Clinics
                </p>
                <h1 className="text-xl font-semibold leading-tight">Admin</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 text-[#FBFBF9]/80 hover:text-[#FBFBF9] transition text-xl font-bold"
              title="Close sidebar"
            >
              ×
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {permittedSidebarItems.map((item) => {
              if (item.label === "Settings") {
                const Icon = item.icon;
                const active = [
                  "Profile",
                  "Service Hours",
                  "Branches",
                  "Users",
                  "Booking Settings",
                  "Notification Settings",
                  "Queue Settings",
                  "Pages Settings",
                  "Role Management"
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsExpanded(!settingsExpanded);
                      }}
                      className={`group flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-[#FBFBF9] text-[#414E36] shadow-lg"
                          : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                            active ? "bg-[#C4AE7C]/20 text-[#414E36]" : "bg-[#FBFBF9]/10 text-[#FBFBF9] group-hover:bg-[#C4AE7C]/15"
                          }`}
                        >
                          <Icon size={18} />
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-current transition-transform duration-200 ${
                          settingsExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {settingsExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        {[
                          { label: "Profile", icon: User, perm: null },
                          { label: "Clinic Profile", icon: Store, perm: "settings.profile" },
                          { label: "Service Hours", icon: Clock, perm: "settings.service_hours" },
                          { label: "Branches", icon: MapIcon, perm: "settings.branches" },
                          { label: "Rooms", icon: DoorOpen, perm: "settings.rooms" },
                          { label: "Booking Settings", icon: CalendarDays, perm: "settings.booking_settings" },
                          { label: "Notification Settings", icon: Bell, perm: "settings.notification" },
                          { label: "Queue Settings", icon: ListOrdered, perm: "settings.queue" },
                          { label: "Pages Settings", icon: FileText, perm: "settings.pages" },
                          { label: "Role Management", icon: Shield, perm: "settings.roles" }
                        ].filter(sub => {
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
                              className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                                subActive
                                  ? "bg-[#FBFBF9]/10 text-[#FBFBF9] border-l-[3px] border-[#C4AE7C] pl-3 rounded-l-none"
                                  : "text-[#FBFBF9]/70 hover:bg-[#FBFBF9]/5 hover:text-[#FBFBF9]"
                              }`}
                            >
                              <SubIcon size={14} className={subActive ? "text-[#C4AE7C]" : "text-[#FBFBF9]/60"} />
                              <span>{sub.label}</span>
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
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={async () => {
                    if (item.label === "Logout") {
                      if (supabase) {
                        await supabase.auth.signOut();
                      }
                    } else {
                      setActiveNav(item.label);
                    }
                  }}
                  className={`group flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-[#FBFBF9] text-[#414E36] shadow-lg"
                      : "text-[#FBFBF9]/80 hover:bg-[#FBFBF9]/10 hover:text-[#FBFBF9]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                        active ? "bg-[#C4AE7C]/20 text-[#414E36]" : "bg-[#FBFBF9]/10 text-[#FBFBF9] group-hover:bg-[#C4AE7C]/15"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.submenu ? (
                    <ChevronRight size={18} className="text-[#FBFBF9]/60" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex flex-col px-4 md:px-8 py-0 min-w-0">
          {/* Top Navigation Bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#414E36]/10 bg-[#F2EFE9]/90 px-2 py-3 backdrop-blur-md gap-3">
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
            </div>

            {/* Right: new entry, notifications, user profile */}
            <div className="flex items-center gap-3">
              {/* Quick Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQuickActionMenu(prev => !prev);
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
                    setShowNotificationMenu(prev => !prev);
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
          {activeNav === "Providers" && (
            <section className="space-y-6">
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h1 className="text-4xl font-semibold text-[#1F251A]">Providers</h1>

                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setShowProviderFilterPanel(prev => !prev)}
                      className={`inline-flex items-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                        showProviderFilterPanel || providerFilterBranchId !== "All" || providerFilterSpecialty !== "All" || providerFilterGender !== "All" || providerSearchQuery.trim()
                          ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                          : "border-[#E6E9EB] bg-white text-[#414E36] hover:border-[#C4AE7C]/40 hover:bg-[#FBFBF9]"
                      }`}
                    >
                      <Filter size={16} /> Filter
                      {(providerFilterBranchId !== "All" || providerFilterSpecialty !== "All" || providerFilterGender !== "All" || providerSearchQuery.trim()) && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#414E36] text-[10px] font-bold text-white">!</span>
                      )}
                    </button>

                    {hasPermission("providers.create") && (
                      <button
                        onClick={openAddProviderModal}
                        className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                      >
                        <Plus size={16} /> Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Dynamic Filters Drawer */}
                {showProviderFilterPanel && (
                  <div className="mb-6 grid grid-cols-1 gap-4 rounded-[24px] border border-[#E6E9EB] bg-[#F7F7F9] p-5 md:grid-cols-4 items-end shadow-sm">
                    {/* Search Input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Search Doctor</label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                        <input
                          type="text"
                          value={providerSearchQuery}
                          onChange={(e) => setProviderSearchQuery(e.target.value)}
                          placeholder="Search name, specialty..."
                          className="w-full rounded-2xl border border-[#E6E9EB] bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-1 focus:ring-[#C4AE7C]"
                        />
                      </div>
                    </div>

                    {/* Branch Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Branch</label>
                      <select
                        value={providerFilterBranchId}
                        onChange={(e) => setProviderFilterBranchId(e.target.value)}
                        className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                      >
                        <option value="All">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name_en}</option>
                        ))}
                      </select>
                    </div>

                    {/* Specialty Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Specialty</label>
                      <select
                        value={providerFilterSpecialty}
                        onChange={(e) => setProviderFilterSpecialty(e.target.value)}
                        className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                      >
                        <option value="All">All Specialties</option>
                        {uniqueSpecialties.map((spec) => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Gender and Clear Options */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Gender</label>
                        <select
                          value={providerFilterGender}
                          onChange={(e) => setProviderFilterGender(e.target.value)}
                          className="w-full rounded-2xl border border-[#E6E9EB] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                        >
                          <option value="All">All</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setProviderFilterBranchId("All");
                          setProviderFilterSpecialty("All");
                          setProviderFilterGender("All");
                          setProviderSearchQuery("");
                        }}
                        className="h-[42px] w-full rounded-2xl border border-red-200 bg-red-50/50 text-xs font-bold text-red-600 hover:bg-red-100/70 transition"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                  <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                    <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-0 border-b border-[#E6E9EB] bg-[#F7F7F9] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                      <span>Name</span>
                      <span>Bookings</span>
                      <span>Services</span>
                      <span>Rating</span>
                    </div>
                    <div className="divide-y divide-[#E6E9EB]">
                      {filteredProviders.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 italic">No doctors/providers matching filters.</div>
                      ) : (
                        filteredProviders.map((provider) => (
                          <div key={provider.id || provider.name} className="grid grid-cols-[2fr_1fr_2fr_1fr] items-center gap-0 px-6 py-5 text-sm text-[#414E36]">
                            <span className="font-semibold text-[#1F251A]">{provider.name}</span>
                            <span>{provider.bookings}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {provider.services.slice(0, 2).map((service: string) => (
                                <span key={service} className="rounded-full border border-[#E6E9EB] bg-[#F2EFE9] px-3 py-1 text-[11px] font-medium text-[#414E36]">
                                  {service}
                                </span>
                              ))}
                              {provider.services.length > 2 && (
                                <span
                                  className="rounded-full bg-[#EDE4C8] px-3 py-1 text-[11px] font-semibold text-[#414E36] cursor-help"
                                  title={provider.services.slice(2).join(", ")}
                                >
                                  +{provider.services.length - 2} More
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-2 text-[#5A6A51]">
                                <Star size={16} className="text-[#C4AE7C]" />
                                {provider.rating}
                              </span>
                              <div className="flex items-center gap-2">
                                {provider.id && hasPermission("providers.delete") && (
                                  <button
                                    onClick={() => handleDeleteProvider(provider.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                                    title="Delete Provider"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                                {hasPermission("providers.edit") && (
                                  <button
                                    onClick={() => openEditProviderModal(provider)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#E6E9EB] bg-[#F7F7F9] text-[#414E36] transition hover:bg-[#EDF1EC]"
                                    title="Edit Provider"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

              </div>
            </section>
          )}

          {/* ── SERVICES VIEW ── */}
          {activeNav === "Services" && (
             <div>
               {/* Header */}
               <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Services</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#f5f4f0]">
                    <Filter size={14} /> Filter
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/30 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#414E36]/5">
                    <Upload size={14} /> Import
                  </button>
                  <button
                    onClick={() => setShowAddCategoryModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-4 py-2 text-sm font-semibold text-[#414E36] shadow-sm transition hover:bg-[#b59e6c]"
                  >
                    <Plus size={14} /> Add Category
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-5 flex items-center gap-1 border-b border-[#414E36]/10">
                {(["Services", "Sort Services", "Package Offers"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setServiceTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      serviceTab === tab
                        ? "border-[#414E36] text-[#414E36]"
                        : "border-transparent text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="mb-5 flex items-center gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                  <input
                    value={serviceSearch}
                    onChange={(e) => { setServiceSearch(e.target.value); }}
                    placeholder="Search services…"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  />
                </div>
              </div>

              {/* Category Accordions */}
              <div className="flex flex-col gap-4">
                {localCategories.map((cat) => {
                  const catServices = (groupedServices[cat.key] ?? []).filter((svc) => (serviceToggles[svc.id]?.visible ?? true));
                  const isExpanded = expandedCategories[cat.key] ?? true;
                  const hasMatch = catServices.length > 0;
                  if (serviceSearch.trim() && !hasMatch) return null;

                  return (
                    <div
                      key={cat.key}
                      draggable={!!catDraggable[cat.key]}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", cat.key);
                        setDraggedCatKey(cat.key);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverCatKey(cat.key);
                      }}
                      onDragEnd={() => {
                        setDraggedCatKey(null);
                        setDragOverCatKey(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCatKey !== null && draggedCatKey !== cat.key) {
                          handleReorderCategories(draggedCatKey, cat.key);
                        }
                        setDraggedCatKey(null);
                        setDragOverCatKey(null);
                      }}
                      className={`overflow-hidden rounded-2xl border border-[#414E36]/10 bg-white shadow-sm transition-all ${
                        draggedCatKey === cat.key ? "opacity-30 bg-[#F2EFE9]" : ""
                      } ${
                        dragOverCatKey === cat.key ? "border-t-2 border-t-[#C4AE7C]" : ""
                      }`}
                    >
                      {/* Category header row */}
                      <div
                        onClick={() => toggleCategoryExpand(cat.key)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#F9F9F7]"
                      >
                        <div className="flex items-center gap-3">
                          {/* Category Drag Handle */}
                          <div
                            onMouseEnter={() => setCatDraggable(prev => ({ ...prev, [cat.key]: true }))}
                            onMouseLeave={() => setCatDraggable(prev => ({ ...prev, [cat.key]: false }))}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-grab active:cursor-grabbing inline-flex h-7 w-7 items-center justify-center rounded border border-[#414E36]/10 bg-white text-[#5A6A51]/60 hover:bg-[#F2EFE9] hover:text-[#414E36] transition"
                            title="Drag to reorder category"
                          >
                            <GripVertical size={14} />
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF1EC]">
                            <Layers size={16} className="text-[#414E36]" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-[#1F251A]">{cat.en}</p>
                          </div>
                          <span className="ml-1 inline-flex items-center rounded-full bg-[#414E36]/8 px-2.5 py-0.5 text-xs font-semibold text-[#414E36]">
                            {catServices.length} service{catServices.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCategoryTarget(cat);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddServiceTargetCategory(cat.key);
                              setServiceCategory(cat.key);
                              setServiceNameEn("");
                              setServiceNameAr("");
                              setServiceDuration("1:00 Hours");
                              setServiceUnitType("Session");
                              setServiceDescEn("");
                              setServiceDescAr("");
                              setServiceSortOrder(0);
                              setServiceIsShared(false);
                              setServiceEnableReminder(true);
                              setServiceImageUrl("");
                              setServiceBranchPricing([{ name: "Zayed", price: 0, visible: true, status: true, isDefault: true }]);
                              setEditingService(null);
                              setShowAddServiceModal(true);
                            }}
                            className={`${hasPermission("services.create") ? "inline-flex" : "hidden"} items-center gap-1.5 rounded-lg border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#414E36] transition hover:bg-[#EDF1EC]`}
                          >
                            <Plus size={12} /> Add Service
                          </button>
                          <span className="text-[#5A6A51] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                            <ChevronDown size={18} />
                          </span>
                        </div>
                      </div>

                      {/* Services sub-table */}
                      {isExpanded && (
                        <div className="border-t border-[#414E36]/8">
                          {catServices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF1EC]">
                                <Layers size={20} className="text-[#5A6A51]" />
                              </div>
                              <p className="text-sm font-medium text-[#1F251A]">No services yet</p>
                              <p className="text-xs text-[#5A6A51]">Click &ldquo;Add Service&rdquo; to add one to this category.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[860px] text-sm">
                                <thead>
                                  <tr className="bg-[#F9F9F7]">
                                    <th className="w-10 px-3 py-2.5"></th>
                                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">ID</th>
                                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Name</th>
                                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Created At</th>
                                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Branch Price</th>
                                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Branches</th>
                                    <th className="px-5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Sort Order</th>
                                    <th className="px-5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                                    <th className="px-3 py-2.5"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#414E36]/6">
                                  {catServices.map((svc) => {
                                    const toggles = serviceToggles[svc.id] ?? { visible: true, active: true };
                                    const isInactive = !toggles.active;
                                    const rowFaded = isInactive;
                                    return (
                                      <tr
                                        key={svc.id}
                                        draggable={!!rowDraggable[svc.id]}
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData("text/plain", svc.id.toString());
                                          setDraggedServiceId(svc.id);
                                        }}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          setDragOverServiceId(svc.id);
                                        }}
                                        onDragEnd={() => {
                                          setDraggedServiceId(null);
                                          setDragOverServiceId(null);
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          if (draggedServiceId !== null && draggedServiceId !== svc.id) {
                                            handleReorderServices(draggedServiceId, svc.id);
                                          }
                                          setDraggedServiceId(null);
                                          setDragOverServiceId(null);
                                        }}
                                        className={`transition ${
                                          draggedServiceId === svc.id ? "opacity-30 bg-[#F2EFE9]" : ""
                                        } ${
                                          dragOverServiceId === svc.id ? "border-t-2 border-t-[#C4AE7C]" : ""
                                        } ${
                                          rowFaded ? "opacity-50 bg-[#F9F9F7]" : "hover:bg-[#F9F9F7]"
                                        }`}
                                      >
                                        {/* Drag Handle */}
                                        <td className="px-3 py-3 text-center">
                                          <div
                                            onMouseEnter={() => setRowDraggable(prev => ({ ...prev, [svc.id]: true }))}
                                            onMouseLeave={() => setRowDraggable(prev => ({ ...prev, [svc.id]: false }))}
                                            className="cursor-grab active:cursor-grabbing inline-flex h-7 w-7 items-center justify-center rounded border border-[#414E36]/10 bg-white text-[#5A6A51]/60 hover:bg-[#F2EFE9] hover:text-[#414E36] transition"
                                            title="Drag to reorder"
                                          >
                                            <GripVertical size={14} />
                                          </div>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-xs text-[#5A6A51]">{svc.id}</td>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-2">
                                            <p className={`font-semibold ${ rowFaded ? "line-through text-[#5A6A51]" : "text-[#1F251A]" }`}>{svc.en}</p>
                                            {isInactive && (
                                              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500">Inactive</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-5 py-3 text-[#5A6A51]">
                                          {svc.createdAt ? (
                                            <>
                                              <span className="block text-sm font-medium text-[#1F251A]">
                                                {svc.createdAt.split(" ").slice(0, 2).join(" ")}
                                              </span>
                                              <span className="text-xs">
                                                {svc.createdAt.split(" ").slice(2).join(" ")}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="block text-sm font-medium text-[#1F251A]">30 Apr</span>
                                              <span className="text-xs">2:01 pm</span>
                                            </>
                                          )}
                                        </td>
                                        <td className="px-5 py-3">
                                          <span className="font-medium text-[#C4AE7C]">EGP {svc.price ?? 0}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#5A6A51] max-w-[200px] truncate">
                                          {svc.branchPricing && svc.branchPricing.length > 0 ? (
                                            svc.branchPricing.map((bp) => (
                                              <div key={bp.name} className="flex items-center gap-1.5 mb-0.5 text-[11px]">
                                                <span className="font-medium text-[#1F251A]">{bp.name}:</span>
                                                <span className="text-[#C4AE7C]">EGP {bp.price}</span>
                                                {bp.isDefault && <span className="text-[8px] bg-[#414E36]/10 text-[#414E36] px-1 rounded font-bold">Def</span>}
                                              </div>
                                            ))
                                          ) : (
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                              <span className="font-medium text-[#1F251A]">Zayed:</span>
                                              <span className="text-[#C4AE7C]">EGP {svc.price ?? 0}</span>
                                              <span className="text-[8px] bg-[#414E36]/10 text-[#414E36] px-1 rounded font-bold">Def</span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                          <span className="font-medium text-[#1F251A]">{svc.sortOrder ?? 0}</span>
                                        </td>
                                        {/* Status toggle */}
                                        <td className="px-5 py-3 text-center">
                                          <div className="flex flex-col items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (hasPermission("services.edit")) {
                                                  toggleService(svc.id, "active");
                                                }
                                              }}
                                              className={`relative h-6 w-11 rounded-full focus:outline-none transition-colors duration-300 ${!hasPermission("services.edit") ? "opacity-60 cursor-not-allowed" : ""}`}
                                              style={{ 
                                                backgroundColor: toggles.active ? "#C4AE7C" : "#d1d5db"
                                              }}
                                              disabled={!hasPermission("services.edit")}
                                            >
                                              <span
                                                className="absolute top-[4px] h-4 w-4 rounded-full bg-white shadow-md"
                                                style={{ 
                                                  left: toggles.active ? "24px" : "4px",
                                                  transition: "left 300ms cubic-bezier(0.4, 0, 0.2, 1)"
                                                }}
                                              />
                                            </button>
                                            <span className={`text-[10px] font-semibold ${ toggles.active ? "text-[#C4AE7C]" : "text-gray-400" }`}>
                                              {toggles.active ? "Active" : "Inactive"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          {hasPermission("services.edit") && (
                                            <button
                                              type="button"
                                              onClick={() => handleEditService(svc)}
                                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                                              title="Edit Service"
                                            >
                                              <Pencil size={12} />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#414E36]/8 bg-white px-4 py-3 text-sm text-[#5A6A51] shadow-sm">
                <span>{filteredServices.length} total services across {localCategories.length} categories</span>
                <button
                  onClick={() => setExpandedCategories(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))}
                  className="text-xs font-medium text-[#414E36] underline-offset-2 hover:underline"
                >
                  Expand All
                </button>
              </div>

              {/* ── DELETE CATEGORY CONFIRMATION MODAL ── */}
              {deleteCategoryTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#414E36]/10 animate-fadeIn">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-[#1F251A]">Delete Category?</h3>
                    </div>
                    
                    <p className="text-sm text-[#5A6A51] leading-relaxed mb-6">
                      Are you sure you want to delete the category <span className="font-semibold text-[#1F251A]">&ldquo;{deleteCategoryTarget.en}&rdquo;</span>? All services inside this category will also be deleted. This action cannot be undone.
                    </p>

                    <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/8 pt-4">
                      <button
                        onClick={() => setDeleteCategoryTarget(null)}
                        className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          removeCategory(deleteCategoryTarget.key);
                          setDeleteCategoryTarget(null);
                        }}
                        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* ── DELETE SERVICE CONFIRMATION MODAL ── */}
              {deleteServiceTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#414E36]/10 animate-fadeIn">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <Trash2 size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-[#1F251A]">Delete Service?</h3>
                    </div>
                    
                    <p className="text-sm text-[#5A6A51] leading-relaxed mb-6">
                      Are you sure you want to delete the service <span className="font-semibold text-[#1F251A]">&ldquo;{deleteServiceTarget.en}&rdquo;</span>? This action cannot be undone.
                    </p>

                    <div className="flex items-center justify-end gap-3 border-t border-[#414E36]/8 pt-4">
                      <button
                        onClick={() => {
                          setDeleteServiceTarget(null);
                          setShowAddServiceModal(true);
                        }}
                        className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const updated = localServices.filter(s => s.id !== deleteServiceTarget.id);
                          setLocalServices(updated);
                          saveDynamicServices(updated);
                          setDeleteServiceTarget(null);
                        }}
                        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* ── ADD CATEGORY MODAL ── */}
              {showAddCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#1F251A]">Add New Category</h3>
                        <p className="text-sm text-[#5A6A51]">Create a new service category for the clinic.</p>
                      </div>
                      <button
                        onClick={() => setShowAddCategoryModal(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] hover:bg-[#F9F9F7]"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Category Name (English)</label>
                        <input
                          value={newCategoryNameEn}
                          onChange={(e) => setNewCategoryNameEn(e.target.value)}
                          placeholder="e.g. Dermatology & Aesthetic"
                          className="w-full rounded-lg border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-end gap-3">
                      <button
                        onClick={() => setShowAddCategoryModal(false)}
                        className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#F9F9F7]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!newCategoryNameEn.trim()) return;
                          const key = newCategoryNameEn.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                          const updated = [...localCategories, { key, en: newCategoryNameEn.trim(), ar: "" }];
                          setLocalCategories(updated);
                          saveDynamicCategories(updated);
                          setExpandedCategories(prev => ({ ...prev, [key]: true }));
                          setNewCategoryNameEn("");
                          setShowAddCategoryModal(false);
                        }}
                        className="rounded-lg bg-[#414E36] px-5 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                      >
                        Create Category
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── REDESIGNED ADD/EDIT SERVICE MODAL ── */}
              {showAddServiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto">
                  <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8 border border-[#414E36]/10 animate-fadeIn flex flex-col max-h-[90vh]">
                    
                    {/* Modal Header */}
                    <div className="flex items-center justify-between border-b border-[#414E36]/10 px-6 py-4">
                      <h3 className="text-lg font-bold text-[#1F251A]">
                        {editingService ? "Edit Service" : "Add Service"}
                      </h3>
                      <div className="flex items-center gap-3">
                        {editingService && hasPermission("services.delete") && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteServiceTarget(editingService);
                              setShowAddServiceModal(false);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                            title="Delete Service"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAddServiceModal(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#FBFBF9]"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {/* Modal Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* Service Image Section */}
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-sm font-semibold text-[#5A6A51] mb-2">Service Image</span>
                        <label className="relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#414E36]/20 bg-[#FBFBF9] transition hover:bg-[#F2EFE9] overflow-hidden group">
                          {serviceImageUrl ? (
                            <>
                              <img src={serviceImageUrl} alt="Service preview" className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-white font-medium text-center px-1">Change Image</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-[#5A6A51]/60">
                              <svg className="mb-1 h-8 w-8 text-[#5A6A51]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1000, 1000, 0.75);
                                  setServiceImageUrl(compressed);
                                } catch (err) {
                                  console.error("Failed to compress service image, using original:", err);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setServiceImageUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </label>
                        <span className="text-[11px] text-[#5A6A51]/75 mt-2">Click to upload or change the image</span>
                      </div>

                      {/* 2-Column fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Service Category */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                            Service Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={serviceCategory}
                            onChange={(e) => setServiceCategory(e.target.value)}
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                          >
                            <option value="" disabled>Select Category</option>
                            {localCategories.map(cat => (
                              <option key={cat.key} value={cat.key}>{cat.en}</option>
                            ))}
                          </select>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                            Duration <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={serviceDuration}
                            onChange={(e) => setServiceDuration(e.target.value)}
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                          >
                            <option value="0:15 Hours">0:15 Hours</option>
                            <option value="0:30 Hours">0:30 Hours</option>
                            <option value="0:45 Hours">0:45 Hours</option>
                            <option value="1:00 Hours">1:00 Hours</option>
                            <option value="1:30 Hours">1:30 Hours</option>
                            <option value="2:00 Hours">2:00 Hours</option>
                            <option value="2:30 Hours">2:30 Hours</option>
                            <option value="3:00 Hours">3:00 Hours</option>
                          </select>
                        </div>

                        {/* Unit Type */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                            Unit Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={serviceUnitType}
                            onChange={(e) => setServiceUnitType(e.target.value)}
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                          >
                            <option value="Session">Session</option>
                            <option value="Hour">Hour</option>
                            <option value="Treatment">Treatment</option>
                            <option value="Package">Package</option>
                          </select>
                        </div>

                        {/* Service Name EN */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                            Service Name (EN) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={serviceNameEn}
                            onChange={(e) => setServiceNameEn(e.target.value)}
                            placeholder="Physio: Full Transformation (15)"
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                          />
                        </div>

                        {/* Service Name AR */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">
                            Service Name (AR) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={serviceNameAr}
                            onChange={(e) => setServiceNameAr(e.target.value)}
                            placeholder="علاج طبيعي: باقة التحول (15 جلسة)"
                            dir="rtl"
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                          />
                        </div>

                        {/* English Description */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">English Description</label>
                          <textarea
                            value={serviceDescEn}
                            onChange={(e) => setServiceDescEn(e.target.value)}
                            rows={3}
                            placeholder="Enter English description..."
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium resize-none"
                          />
                        </div>

                        {/* Arabic Description */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">Arabic Description</label>
                          <textarea
                            value={serviceDescAr}
                            onChange={(e) => setServiceDescAr(e.target.value)}
                            rows={3}
                            placeholder="أدخل الوصف باللغة العربية..."
                            dir="rtl"
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium resize-none"
                          />
                        </div>

                        {/* Sort Order */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-[#5A6A51]">Sort Order</label>
                          <input
                            type="number"
                            value={serviceSortOrder}
                            onChange={(e) => setServiceSortOrder(Number(e.target.value) || 0)}
                            className="w-full rounded-lg border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 text-[#1F251A] font-medium"
                          />
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="space-y-4 pt-2">
                        {/* Is Shared Toggle */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#1F251A]">Is Shared</span>
                            <span className="text-xs text-[#5A6A51] mt-0.5">Service that can be booked by multiple clients at the same time</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setServiceIsShared(!serviceIsShared)}
                            className="relative h-6 w-11 flex-shrink-0 rounded-full focus:outline-none transition-colors duration-300"
                            style={{ backgroundColor: serviceIsShared ? "#414E36" : "#E2E8F0" }}
                          >
                            <span
                              className="absolute top-[4px] h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300"
                              style={{ left: serviceIsShared ? "24px" : "4px" }}
                            />
                          </button>
                        </div>

                        {/* Enable Booking Reminder Toggle */}
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm font-semibold text-[#1F251A]">Enable Booking Reminder</span>
                          <button
                            type="button"
                            onClick={() => setServiceEnableReminder(!serviceEnableReminder)}
                            className="relative h-6 w-11 flex-shrink-0 rounded-full focus:outline-none transition-colors duration-300"
                            style={{ backgroundColor: serviceEnableReminder ? "#414E36" : "#E2E8F0" }}
                          >
                            <span
                              className="absolute top-[4px] h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300"
                              style={{ left: serviceEnableReminder ? "24px" : "4px" }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Branch Pricing Header */}
                      <div className="border-t border-[#414E36]/10 pt-4">
                        <h4 className="text-sm font-bold text-[#1F251A]">Branch Pricing</h4>
                        <p className="text-xs text-[#5A6A51] mt-0.5">Configure pricing for different branch locations</p>
                      </div>

                      {/* Branch Cards */}
                      <div className="space-y-3">
                        {serviceBranchPricing.map((bp, index) => (
                          <div key={index} className="rounded-xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 relative">
                            
                            {/* Zayed default badge or Delete Branch button */}
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Branch</span>
                                {bp.isDefault ? (
                                  <span className="rounded bg-[#414E36] px-1.5 py-0.5 text-[9px] font-bold text-[#FBFBF9]">Default</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = serviceBranchPricing.filter((_, i) => i !== index);
                                      setServiceBranchPricing(updated);
                                    }}
                                    className="text-[10px] text-red-500 font-semibold hover:underline"
                                  >
                                    Delete Branch
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Branch name input/select */}
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-[#5A6A51]">Branch Name</label>
                                {bp.isDefault ? (
                                  <select
                                    value={bp.name}
                                    onChange={(e) => {
                                      const updated = [...serviceBranchPricing];
                                      updated[index].name = e.target.value;
                                      setServiceBranchPricing(updated);
                                    }}
                                    className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#C4AE7C] text-[#1F251A]"
                                  >
                                    <option value="Zayed">Zayed</option>
                                    <option value="Zamalek">Zamalek</option>
                                    <option value="Maadi">Maadi</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={bp.name}
                                    onChange={(e) => {
                                      const updated = [...serviceBranchPricing];
                                      updated[index].name = e.target.value;
                                      setServiceBranchPricing(updated);
                                    }}
                                    placeholder="Branch Name"
                                    className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#C4AE7C] text-[#1F251A]"
                                  />
                                )}
                              </div>

                              {/* Price input */}
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-[#5A6A51]">Price</label>
                                <div className="relative flex rounded-lg border border-[#414E36]/15 bg-white overflow-hidden text-xs">
                                  <span className="bg-[#F2EFE9] border-r border-[#414E36]/15 px-2.5 py-2 text-[#5A6A51] font-semibold">EGP</span>
                                  <input
                                    type="number"
                                    value={bp.price}
                                    onChange={(e) => {
                                      const updated = [...serviceBranchPricing];
                                      updated[index].price = Number(e.target.value) || 0;
                                      setServiceBranchPricing(updated);
                                    }}
                                    placeholder="0"
                                    className="w-full px-3 py-2 outline-none text-[#1F251A] font-medium"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Toggles inside branch card */}
                            <div className="flex items-center gap-6 mt-4">
                              {/* Visible Toggle */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-[#5A6A51]">Visible</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...serviceBranchPricing];
                                    updated[index].visible = !updated[index].visible;
                                    setServiceBranchPricing(updated);
                                  }}
                                  className="relative h-5 w-9 rounded-full focus:outline-none transition-colors duration-300"
                                  style={{ backgroundColor: bp.visible ? "#414E36" : "#E2E8F0" }}
                                >
                                  <span
                                    className="absolute top-[2px] h-4.5 w-4.5 rounded-full bg-white shadow-md transition-all duration-300"
                                    style={{ left: bp.visible ? "18px" : "2px" }}
                                  />
                                </button>
                              </div>

                              {/* Status Toggle */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-[#5A6A51]">Status</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...serviceBranchPricing];
                                    updated[index].status = !updated[index].status;
                                    setServiceBranchPricing(updated);
                                  }}
                                  className="relative h-5 w-9 rounded-full focus:outline-none transition-colors duration-300"
                                  style={{ backgroundColor: bp.status ? "#414E36" : "#E2E8F0" }}
                                >
                                  <span
                                    className="absolute top-[2px] h-4.5 w-4.5 rounded-full bg-white shadow-md transition-all duration-300"
                                    style={{ left: bp.status ? "18px" : "2px" }}
                                  />
                                </button>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>

                      {/* Add Branch Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setServiceBranchPricing([
                            ...serviceBranchPricing,
                            { name: "New Branch", price: 0, visible: true, status: true, isDefault: false }
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4AE7C] hover:text-[#b59e6c] mt-2 transition"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C4AE7C]/10 text-[#C4AE7C]">+</span> Add Branch
                      </button>

                    </div>
                    
                    {/* Modal Footer */}
                    <div className="border-t border-[#414E36]/10 px-6 py-4 flex items-center justify-end gap-3 bg-[#FBFBF9] rounded-b-2xl">
                      <button
                        type="button"
                        onClick={() => setShowAddServiceModal(false)}
                        className="rounded-lg border border-[#414E36]/15 px-5 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!serviceNameEn.trim()) return;
                          
                          if (editingService) {
                            // Edit mode
                            const updatedServices = localServices.map(s => {
                              if (s.id === editingService.id) {
                                return {
                                  ...s,
                                  en: serviceNameEn.trim(),
                                  ar: serviceNameAr.trim(),
                                  cat: serviceCategory,
                                  unit: serviceUnitType.toLowerCase(),
                                  price: serviceBranchPricing.find(b => b.isDefault)?.price ?? 0,
                                  duration: serviceDuration,
                                  descriptionEn: serviceDescEn.trim(),
                                  descriptionAr: serviceDescAr.trim(),
                                  sortOrder: serviceSortOrder,
                                  isShared: serviceIsShared,
                                  enableReminder: serviceEnableReminder,
                                  img: serviceImageUrl,
                                  branchPricing: serviceBranchPricing,
                                };
                              }
                              return s;
                            });
                            
                            setLocalServices(updatedServices);
                            saveDynamicServices(updatedServices);

                            const defaultBranch = serviceBranchPricing.find(b => b.isDefault);
                            if (defaultBranch) {
                              setServiceToggle(editingService.id, "active", defaultBranch.status);
                              setServiceToggle(editingService.id, "visible", defaultBranch.visible);
                              setServiceToggles(prev => ({
                                ...prev,
                                [editingService.id]: { visible: defaultBranch.visible, active: defaultBranch.status }
                              }));
                            }
                          } else {
                            // Add mode
                            const newId = Math.max(0, ...localServices.map(s => s.id)) + 1;
                            const newService = {
                              id: newId,
                              en: serviceNameEn.trim(),
                              ar: serviceNameAr.trim(),
                              cat: serviceCategory,
                              unit: serviceUnitType.toLowerCase(),
                              price: serviceBranchPricing.find(b => b.isDefault)?.price ?? 0,
                              duration: serviceDuration,
                              descriptionEn: serviceDescEn.trim(),
                              descriptionAr: serviceDescAr.trim(),
                              sortOrder: serviceSortOrder,
                              isShared: serviceIsShared,
                              enableReminder: serviceEnableReminder,
                              img: serviceImageUrl,
                              branchPricing: serviceBranchPricing,
                              createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }),
                            };

                            const updatedServices = [...localServices, newService];
                            setLocalServices(updatedServices);
                            saveDynamicServices(updatedServices);

                            const defaultBranch = serviceBranchPricing.find(b => b.isDefault);
                            const isDefaultActive = defaultBranch ? defaultBranch.status : true;
                            const isDefaultVisible = defaultBranch ? defaultBranch.visible : true;
                            setServiceToggle(newId, "active", isDefaultActive);
                            setServiceToggle(newId, "visible", isDefaultVisible);
                            setServiceToggles(prev => ({
                              ...prev,
                              [newId]: { visible: isDefaultVisible, active: isDefaultActive }
                            }));
                            setExpandedCategories(prev => ({ ...prev, [serviceCategory]: true }));
                          }
                          
                          setShowAddServiceModal(false);
                        }}
                        className="rounded-lg bg-[#414E36] px-6 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                      >
                        Save
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ALL PRESCRIPTIONS VIEW ── */}
          {activeNav === "All Prescriptions" && (
            <div>
              {/* Page header */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Prescriptions</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#f5f4f0]">
                    <Filter size={14} /> Filter
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-4 py-2 text-sm font-medium text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26]">
                    <Download size={14} /> Export
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/30 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#414E36]/5">
                    <Upload size={14} /> Import
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-4 py-2 text-sm font-semibold text-[#414E36] shadow-sm transition hover:bg-[#b59e6c]">
                    <Plus size={14} /> Add Prescription
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                  <input
                    value={prescriptionsSearch}
                    onChange={(e) => { setPrescriptionsSearch(e.target.value); setPrescriptionPage(1); }}
                    placeholder="Search prescriptions…"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Prescription ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Patient</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Doctor</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Date</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Medicines</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {pagedPrescriptions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-[#5A6A51]">
                          No prescriptions found.
                        </td>
                      </tr>
                    )}
                    {pagedPrescriptions.map((pr) => (
                      <tr key={pr.id} className="transition hover:bg-[#F9F9F7]">
                        <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{pr.id}</td>
                        <td className="px-5 py-4">
                          <span className="block font-semibold text-[#1F251A]">{pr.patientName}</span>
                          <span className="text-xs text-[#5A6A51]">{pr.patientEmail}</span>
                        </td>
                        <td className="px-5 py-4 text-[#1F251A] font-medium">{pr.doctorName}</td>
                        <td className="px-5 py-4 text-[#5A6A51]">
                          <span className="block font-medium text-[#1F251A]">{pr.date}</span>
                          <span className="text-xs">{pr.time}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {pr.medicines.map((m) => (
                              <span key={m} className="rounded-full border border-[#414E36]/10 bg-[#EDF1EC] px-2.5 py-0.5 text-xs font-medium text-[#414E36]">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                            pr.status === "Active"
                              ? "bg-[#EDF1EC] text-[#414E36]"
                              : "bg-[#EDE4C8] text-[#414E36]"
                          }`}>
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                            <Info size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#5A6A51]">
                <span>Showing {(prescriptionPage - 1) * PRESCRIPTION_PAGE_SIZE + 1}–{Math.min(prescriptionPage * PRESCRIPTION_PAGE_SIZE, filteredPrescriptions.length)} of {filteredPrescriptions.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrescriptionPage((p) => Math.max(1, p - 1))}
                    disabled={prescriptionPage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  {Array.from({ length: totalPrescriptionPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrescriptionPage(p)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                        p === prescriptionPage
                          ? "bg-[#414E36] text-[#FBFBF9]"
                          : "border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f5f4f0]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPrescriptionPage((p) => Math.min(totalPrescriptionPages, p + 1))}
                    disabled={prescriptionPage === totalPrescriptionPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MEDICINE LIBRARY VIEW ── */}
          {activeNav === "Medicine Library" && (
            <div>
              {/* Page header */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Medicine Library</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#f5f4f0]">
                    <Filter size={14} /> Filter
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-4 py-2 text-sm font-medium text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26]">
                    <Download size={14} /> Export
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/30 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#414E36]/5">
                    <Upload size={14} /> Import
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-4 py-2 text-sm font-semibold text-[#414E36] shadow-sm transition hover:bg-[#b59e6c]">
                    <Plus size={14} /> Add Medicine
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                  <input
                    value={medicinesSearch}
                    onChange={(e) => { setMedicinesSearch(e.target.value); setMedicinePage(1); }}
                    placeholder="Search medicine library…"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Medicine ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Name</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Category</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Dosage Form</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Price</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Stock Status</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Visible</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {pagedMedicines.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-[#5A6A51]">
                          No medicines found.
                        </td>
                      </tr>
                    )}
                    {pagedMedicines.map((m) => {
                      const toggles = medicineToggles[m.id] ?? { visible: true, active: true };
                      return (
                        <tr key={m.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{m.id}</td>
                          <td className="px-5 py-4">
                            <span className="block font-semibold text-[#1F251A]">{m.name}</span>
                            <span className="text-xs text-[#5A6A51]">{m.description}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-block rounded-full bg-[#EDF1EC] px-2.5 py-1 text-xs font-medium text-[#414E36]">
                              {m.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#1F251A] font-medium">{m.dosageForm}</td>
                          <td className="px-5 py-4 text-[#C4AE7C] font-semibold">{m.price}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              m.stock === "In Stock"
                                ? "bg-green-100 text-green-800"
                                : m.stock === "Low Stock"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {m.stock}
                            </span>
                          </td>
                          {/* Visible toggle */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => toggleMedicine(m.id, "visible")}
                              className="relative h-5 w-9 rounded-full focus:outline-none transition-colors duration-200"
                              style={{ 
                                backgroundColor: toggles.visible ? "#414E36" : "#d1d5db"
                              }}
                            >
                              <span
                                className="absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow"
                                style={{ 
                                  left: toggles.visible ? "19px" : "3px",
                                  transition: "left 200ms cubic-bezier(0.4, 0, 0.2, 1)"
                                }}
                              />
                            </button>
                          </td>
                          {/* Status toggle */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => toggleMedicine(m.id, "active")}
                              className="relative h-5 w-9 rounded-full focus:outline-none transition-colors duration-200"
                              style={{ 
                                backgroundColor: toggles.active ? "#C4AE7C" : "#d1d5db"
                              }}
                            >
                              <span
                                className="absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow"
                                style={{ 
                                  left: toggles.active ? "19px" : "3px",
                                  transition: "left 200ms cubic-bezier(0.4, 0, 0.2, 1)"
                                }}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#5A6A51]">
                <span>Showing {(medicinePage - 1) * MEDICINE_PAGE_SIZE + 1}–{Math.min(medicinePage * MEDICINE_PAGE_SIZE, filteredMedicines.length)} of {filteredMedicines.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMedicinePage((p) => Math.max(1, p - 1))}
                    disabled={medicinePage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  {Array.from({ length: totalMedicinePages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setMedicinePage(p)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                        p === medicinePage
                          ? "bg-[#414E36] text-[#FBFBF9]"
                          : "border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f5f4f0]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setMedicinePage((p) => Math.min(totalMedicinePages, p + 1))}
                    disabled={medicinePage === totalMedicinePages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS VIEW ── */}
          {activeNav === "Products" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Products</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-5 py-2.5 text-sm font-semibold text-[#414E36] shadow transition hover:bg-[#b59e6c]">
                  <Plus size={16} /> Add Product
                </button>
              </div>

              {/* Filters row */}
              <div className="mb-6 grid gap-4 sm:grid-cols-4 bg-white p-4 rounded-2xl border border-[#414E36]/10 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Search</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                    <input
                      value={eCommerceSearch}
                      onChange={(e) => { setECommerceSearch(e.target.value); setProductPage(1); }}
                      placeholder="Search by product name"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Category</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-3 text-sm outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    <option>Skincare</option>
                    <option>Serums</option>
                    <option>Sun Protection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Stock Status</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-3 text-sm outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    <option>In Stock</option>
                    <option>Low Stock</option>
                    <option>Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Status</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-3 text-sm outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Image</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Arabic Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">English Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Category</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Price</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Price with Tax</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Quantity</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Minimum Quantity</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {pagedProducts.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-5 py-8 text-center text-[#5A6A51] font-semibold">No data available!</td>
                      </tr>
                    )}
                    {pagedProducts.map((p) => {
                      const taxMultiplier = 1.14; // 14% tax
                      const numericPrice = parseFloat(p.price.replace(/[^\d.]/g, ""));
                      const priceWithTax = isNaN(numericPrice) ? p.price : `EGP ${(numericPrice * taxMultiplier).toFixed(2)}`;
                      const isOutOfStock = p.stock === 0;

                      return (
                        <tr key={p.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-4 py-3.5 font-mono text-xs text-[#5A6A51]">{p.id}</td>
                          <td className="px-4 py-3.5">
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-[#F2EFE9] border border-[#414E36]/10 flex items-center justify-center text-[#414E36]">
                              <ShoppingBag size={18} />
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-[#1F251A]" dir="rtl">{
                            p.name.includes("Cream") ? "كريم ترطيب الوجه" :
                            p.name.includes("Sunscreen") ? "واقي شمس 50+" :
                            p.name.includes("Serum") ? "سيروم ريتينول" : "جل منظف لطيف"
                          }</td>
                          <td className="px-4 py-3.5 font-medium text-[#1F251A]">{p.name}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block rounded-full bg-[#EDF1EC] px-2.5 py-1 text-xs font-medium text-[#414E36]">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-[#1F251A]">{p.price}</td>
                          <td className="px-4 py-3.5 font-semibold text-[#C4AE7C]">{priceWithTax}</td>
                          <td className="px-4 py-3.5 text-center text-[#1F251A] font-medium">{p.stock}</td>
                          <td className="px-4 py-3.5 text-center text-[#5A6A51]">5</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isOutOfStock
                                ? "bg-red-100 text-red-800"
                                : p.status === "Low Stock"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}>
                              {isOutOfStock ? "Out of Stock" : p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#5A6A51]">
                <span>Showing {(productPage - 1) * PRODUCT_PAGE_SIZE + 1}–{Math.min(productPage * PRODUCT_PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  {Array.from({ length: totalProductPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProductPage(p)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                        p === productPage
                          ? "bg-[#414E36] text-[#FBFBF9]"
                          : "border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f5f4f0]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    disabled={productPage === totalProductPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCT CATEGORIES VIEW ── */}
          {activeNav === "Product Categories" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Product Categories</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-5 py-2.5 text-sm font-semibold text-[#414E36] shadow transition hover:bg-[#b59e6c]">
                  <Plus size={16} /> Add Category
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Arabic Title</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">English Title</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Color</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Created At</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_PRODUCT_CATEGORIES.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[#5A6A51] font-semibold">No data available</td>
                      </tr>
                    ) : (
                      MOCK_PRODUCT_CATEGORIES.map((cat, idx) => {
                        const colors = ["#C4AE7C", "#414E36", "#3B82F6", "#EC4899"];
                        const arabicTitles = ["العناية بالبشرة", "الحماية من الشمس", "السيروم", "العناية بالشعر"];
                        return (
                          <tr key={cat.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{cat.id}</td>
                            <td className="px-5 py-4 font-semibold text-[#1F251A]" dir="rtl">{arabicTitles[idx] || "تصنيف عام"}</td>
                            <td className="px-5 py-4 font-semibold text-[#1F251A]">{cat.name}</td>
                            <td className="px-5 py-4">
                              <span
                                className="inline-block w-4 h-4 rounded-full border border-black/10 shadow-sm"
                                style={{ backgroundColor: colors[idx % colors.length] }}
                              />
                            </td>
                            <td className="px-5 py-4 text-[#5A6A51] font-medium">10 Jun 2026</td>
                            <td className="px-5 py-4 text-center">
                              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                                <Info size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUPPLIERS VIEW ── */}
          {activeNav === "Suppliers" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Suppliers</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-5 py-2.5 text-sm font-semibold text-[#414E36] shadow transition hover:bg-[#b59e6c]">
                  <Plus size={16} /> Add Supplier
                </button>
              </div>

              {/* Filters row */}
              <div className="mb-6 grid gap-4 sm:grid-cols-4 bg-white p-4 rounded-2xl border border-[#414E36]/10 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Search</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                    <input
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder="Search by name or email"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">City</label>
                  <input
                    placeholder="Filter by city"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-3 text-sm outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Country</label>
                  <input
                    placeholder="Filter by country"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-3 text-sm outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Status</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-3 text-sm outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Email</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Phone</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">City</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Country</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Contact Person</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Total Purchases Value</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Outstanding Balance</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_SUPPLIERS.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-8 text-center text-[#5A6A51] font-semibold">No data available!</td>
                      </tr>
                    ) : (
                      MOCK_SUPPLIERS.map((sup) => (
                        <tr key={sup.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-4 py-3.5 font-mono text-xs text-[#5A6A51]">{sup.id}</td>
                          <td className="px-4 py-3.5 font-semibold text-[#1F251A]">{sup.name}</td>
                          <td className="px-4 py-3.5 text-[#5A6A51]">{sup.email}</td>
                          <td className="px-4 py-3.5 text-[#5A6A51] font-mono">{sup.phone}</td>
                          <td className="px-4 py-3.5 text-[#1F251A]">{sup.city}</td>
                          <td className="px-4 py-3.5 text-[#1F251A]">{sup.country}</td>
                          <td className="px-4 py-3.5 text-[#5A6A51]">{sup.contact}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              sup.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {sup.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-[#1F251A]">{sup.totalPurchasesValue || "EGP 0.00"}</td>
                          <td className="px-4 py-3.5 font-semibold text-[#C4AE7C]">{sup.outstandingBalance || "EGP 0.00"}</td>
                          <td className="px-4 py-3.5 text-center">
                            <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                              <Info size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PURCHASES VIEW ── */}
          {activeNav === "Purchases" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Purchases</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-5 py-2.5 text-sm font-semibold text-[#414E36] shadow transition hover:bg-[#b59e6c]">
                  <Plus size={16} /> Add Purchase
                </button>
              </div>

              {/* Filters row */}
              <div className="mb-6 grid gap-4 sm:grid-cols-6 bg-white p-4 rounded-2xl border border-[#414E36]/10 shadow-sm text-xs">
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Search</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                    <input
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      placeholder="Search by purchase number"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-8 pr-3 text-xs outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Supplier</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-2 text-xs outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    {MOCK_SUPPLIERS.map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Date From</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-1.5 px-2 text-xs outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Date To</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-1.5 px-2 text-xs outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Payment Status</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-2 text-xs outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    <option>Paid</option>
                    <option>Partial</option>
                    <option>Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5A6A51] uppercase mb-1">Status</label>
                  <select className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 px-2 text-xs outline-none transition focus:border-[#C4AE7C] cursor-pointer">
                    <option>All</option>
                    <option>Delivered</option>
                    <option>Pending</option>
                    <option>Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Purchase Number</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Supplier</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Invoice Number</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Purchase Date</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Total Amount</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Paid Amount</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Remaining Amount</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Payment Status</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Items</th>
                      <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_PURCHASES.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-8 text-center text-[#5A6A51] font-semibold">No data available!</td>
                      </tr>
                    ) : (
                      MOCK_PURCHASES.map((p) => {
                        const isPaid = p.status === "Delivered";
                        return (
                          <tr key={p.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-3 py-3.5 font-mono text-xs text-[#5A6A51]">{p.id}</td>
                            <td className="px-3 py-3.5 font-semibold text-[#1F251A]">{p.supplier}</td>
                            <td className="px-3 py-3.5 font-mono text-xs text-[#5A6A51]">INV-{p.id.split("-")[1] || "9812"}</td>
                            <td className="px-3 py-3.5 text-[#5A6A51] font-medium">{p.date}</td>
                            <td className="px-3 py-3.5 font-semibold text-[#1F251A]">{p.total}</td>
                            <td className="px-3 py-3.5 text-[#5A6A51]">{isPaid ? p.total : "EGP 0.00"}</td>
                            <td className="px-3 py-3.5 font-semibold text-[#C4AE7C]">{isPaid ? "EGP 0.00" : p.total}</td>
                            <td className="px-3 py-3.5">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {isPaid ? "Paid" : "Pending"}
                              </span>
                            </td>
                            <td className="px-3 py-3.5">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                p.status === "Delivered" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center font-medium text-[#1F251A]">{p.itemsCount}</td>
                            <td className="px-3 py-3.5 text-center">
                              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                                <Info size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BATCH MANAGEMENT VIEW ── */}
          {activeNav === "Batch Management" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Batch Management</h2>
              </div>

              {/* 4 Report Cards Row */}
              <div className="grid gap-4 sm:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-xl text-white">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-blue-900">Sales Report</h4>
                    <p className="text-xs text-blue-700/80">Batch sales overview</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-green-600 rounded-xl text-white">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-green-900">Profit Analysis</h4>
                    <p className="text-xs text-green-700/80">Analyze batch profits</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-xl text-white">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">Expiry Alerts</h4>
                    <p className="text-xs text-amber-700/80">Expiring stock alerts</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-purple-500 rounded-xl text-white">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-purple-900">FIFO Tracking</h4>
                    <p className="text-xs text-purple-700/80">FIFO inventory flow</p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Batch Number</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Supplier</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Quantity</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Purchase Price</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Selling Price</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Profit Margin</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Expiry Date</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_BATCHES.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-[#5A6A51] font-semibold">No data available!</td>
                      </tr>
                    ) : (
                      MOCK_BATCHES.map((b) => {
                        const numericSell = parseFloat(b.sellingPrice.replace(/[^\d.]/g, ""));
                        const numericBuy = parseFloat(b.purchasePrice.replace(/[^\d.]/g, ""));
                        const profit = numericSell - numericBuy;
                        const profitMarginStr = `EGP ${profit.toFixed(2)} (${((profit / numericBuy) * 100).toFixed(1)}%)`;

                        return (
                          <tr key={b.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{b.batchCode}</td>
                            <td className="px-5 py-4 font-semibold text-[#1F251A]">{b.supplier || "DermaCare Pharma"}</td>
                            <td className="px-5 py-4 text-center font-medium text-[#1F251A]">{b.quantity}</td>
                            <td className="px-5 py-4 text-[#5A6A51] font-medium">{b.purchasePrice}</td>
                            <td className="px-5 py-4 text-[#1F251A] font-semibold">{b.sellingPrice}</td>
                            <td className="px-5 py-4 font-semibold text-[#C4AE7C]">{profitMarginStr}</td>
                            <td className="px-5 py-4 text-[#5A6A51] font-medium">{b.expiryDate}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                b.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {b.status}
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
          )}

          {/* ── POINT OF SALE VIEW ── */}
          {activeNav === "Point of Sale" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Point of Sale (POS)</h2>
                <p className="text-sm text-[#5A6A51] mt-1">Select products to add to checkout and register new client sales.</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                {/* Product Catalog */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                    <h3 className="text-sm uppercase tracking-wider text-[#5A6A51] font-bold mb-4">Product Catalog</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {MOCK_PRODUCTS.map((prod) => (
                        <div key={prod.id} className="rounded-xl border border-[#414E36]/10 p-4 bg-[#FBFBF9] flex flex-col justify-between transition hover:border-[#C4AE7C]/40">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#5A6A51] bg-[#EDF1EC] px-2 py-0.5 rounded-md">{prod.category}</span>
                            <h4 className="font-semibold text-sm text-[#1F251A] mt-2">{prod.name}</h4>
                            <p className="text-[#C4AE7C] font-semibold text-xs mt-1">{prod.price}</p>
                          </div>
                          <button
                            onClick={() => {
                              setPosCart((prev) => {
                                const exist = prev.find((item) => item.id === prod.id);
                                if (exist) {
                                  return prev.map((item) => item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
                                }
                                return [...prev, { id: prod.id, name: prod.name, price: parseFloat(prod.price.replace(/[^\d.]/g, "")), quantity: 1 }];
                              });
                            }}
                            className="mt-4 w-full rounded-lg bg-[#414E36] py-1.5 text-center text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                          >
                            + Add to Cart
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Checkout Summary */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[400px]">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3 mb-4">
                        <h3 className="text-sm uppercase tracking-wider text-[#5A6A51] font-bold">Shopping Cart</h3>
                        <button
                          onClick={() => setPosCart([])}
                          className="text-xs text-[#5A6A51] hover:text-red-600 transition"
                        >
                          Clear Cart
                        </button>
                      </div>

                      {posCart.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[#5A6A51]">
                          Your shopping cart is empty.<br />Click items on the left to start checkout.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#414E36]/10 max-h-[260px] overflow-y-auto pr-1">
                          {posCart.map((item) => (
                            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                              <div>
                                <h4 className="font-semibold text-xs text-[#1F251A]">{item.name}</h4>
                                <p className="text-[10px] text-[#5A6A51]">EGP {item.price.toFixed(2)} each</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setPosCart((prev) => prev.map((x) => x.id === item.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x));
                                  }}
                                  className="h-6 w-6 rounded-md bg-[#EDF1EC] text-xs font-bold text-[#414E36] flex items-center justify-center hover:bg-[#414E36]/10"
                                >
                                  -
                                </button>
                                <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => {
                                    setPosCart((prev) => prev.map((x) => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x));
                                  }}
                                  className="h-6 w-6 rounded-md bg-[#EDF1EC] text-xs font-bold text-[#414E36] flex items-center justify-center hover:bg-[#414E36]/10"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => setPosCart((prev) => prev.filter((x) => x.id !== item.id))}
                                  className="text-[10px] text-red-500 ml-2 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[#414E36]/10 pt-4 mt-6">
                      <div className="flex justify-between text-xs text-[#5A6A51] mb-2">
                        <span>Subtotal</span>
                        <span>EGP {posCart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#5A6A51] mb-3">
                        <span>Tax (14%)</span>
                        <span>EGP {(posCart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.14).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#1F251A] border-t border-dashed border-[#414E36]/10 pt-3 mb-6">
                        <span>Total Amount</span>
                        <span className="text-[#C4AE7C]">EGP {(posCart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.14).toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => {
                          if (posCart.length === 0) return;
                          alert("Sale completed! Receipt printed and order logged in POS Orders.");
                          setPosCart([]);
                        }}
                        disabled={posCart.length === 0}
                        className="w-full rounded-xl bg-[#C4AE7C] py-3 text-center text-sm font-semibold text-[#414E36] shadow transition hover:bg-[#b59e6c] disabled:opacity-40"
                      >
                        Complete Payment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── POS ORDERS VIEW ── */}
          {activeNav === "POS Orders" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">POS Orders</h2>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#f5f4f0]">
                    <Filter size={14} /> Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Order ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Customer Name</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Date</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Items</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Total Amount</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Payment</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_POS_ORDERS.map((o) => (
                      <tr key={o.id} className="transition hover:bg-[#F9F9F7]">
                        <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{o.id}</td>
                        <td className="px-5 py-4 font-semibold text-[#1F251A]">{o.customerName}</td>
                        <td className="px-5 py-4 text-[#5A6A51]">
                          <span className="block font-medium text-[#1F251A]">{o.date}</span>
                          <span className="text-xs">{o.time}</span>
                        </td>
                        <td className="px-5 py-4 text-center font-medium">{o.itemsCount}</td>
                        <td className="px-5 py-4 font-semibold text-[#C4AE7C]">{o.total}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-block rounded-md bg-[#EDF1EC] px-2 py-0.5 text-xs font-semibold text-[#414E36]">{o.paymentMethod}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                            <Info size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INSIGHTS VIEW ── */}
          {activeNav === "Insights" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Insights</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Review provider performance, customer growth, and service trends at a glance.
                  </p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Filter size={16} /> Filter
                </button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Top Providers</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[#1F251A]">Provider performance</h3>
                    </div>
                    <span className="rounded-full bg-[#F7F7F9] px-3 py-2 text-xs font-semibold text-[#5A6A51]">
                      Last 30 days
                    </span>
                  </div>
                  <div className="flex items-end gap-4 pt-8">
                    <div className="flex-1 space-y-3">
                      <div className="h-8 w-full rounded-full bg-[#F2EFE9]"></div>
                      <div className="h-16 w-full rounded-full bg-[#F2EFE9]"></div>
                      <div className="h-28 w-full rounded-full bg-[#F2EFE9]"></div>
                      <div className="h-20 w-full rounded-full bg-[#F2EFE9]"></div>
                    </div>
                    <div className="flex h-64 items-end gap-4">
                      <div className="flex-1 rounded-t-[18px] bg-[#7C5CBF]" style={{ minHeight: '80px' }} />
                      <div className="flex-1 rounded-t-[18px] bg-[#7C5CBF]" style={{ minHeight: '100px' }} />
                      <div className="flex-1 rounded-t-[18px] bg-[#7C5CBF]" style={{ minHeight: '170px' }} />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-4 text-sm text-[#5A6A51]">
                    <div className="rounded-3xl bg-[#F7F7F9] p-4">
                      <p className="font-semibold text-[#1F251A]">Dr. Sara El Gamel</p>
                      <p className="mt-2">Top bookings</p>
                    </div>
                    <div className="rounded-3xl bg-[#F7F7F9] p-4">
                      <p className="font-semibold text-[#1F251A]">54%</p>
                      <p className="mt-2">Repeat patients</p>
                    </div>
                    <div className="rounded-3xl bg-[#F7F7F9] p-4">
                      <p className="font-semibold text-[#1F251A]">+12%</p>
                      <p className="mt-2">Growth rate</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Customers</p>
                    </div>
                    <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center rounded-full border-8 border-[#10B981]/70 bg-transparent">
                      <div className="absolute inset-10 rounded-full border-8 border-[#7C5CBF]/80" />
                      <div className="absolute inset-20 rounded-full bg-[#FBFBF9] shadow-inner"></div>
                      <div className="relative text-center">
                        <p className="text-4xl font-semibold text-[#1F251A]">22</p>
                        <p className="text-sm text-[#5A6A51]">Total Customers</p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3">
                      <div className="inline-flex items-center justify-between rounded-3xl bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#047857]">
                        <span>95.45% New</span>
                        <span className="h-3 w-3 rounded-full bg-[#10B981]" />
                      </div>
                      <div className="inline-flex items-center justify-between rounded-3xl bg-[#F5F3FF] px-4 py-3 text-sm font-semibold text-[#5B21B6]">
                        <span>4.55% Existing</span>
                        <span className="h-3 w-3 rounded-full bg-[#7C5CBF]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Insights summary</p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-3xl bg-[#F7F7F9] px-4 py-4">
                        <p className="text-sm font-semibold text-[#1F251A]">Most engaged service</p>
                        <p className="mt-2 text-sm text-[#5A6A51]">Tattoo Removal (Medium)</p>
                      </div>
                      <div className="rounded-3xl bg-[#F7F7F9] px-4 py-4">
                        <p className="text-sm font-semibold text-[#1F251A]">Highest revenue day</p>
                        <p className="mt-2 text-sm text-[#5A6A51]">Friday, June 7</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SALES DASHBOARD VIEW ── */}
          {activeNav === "Sales Dashboard" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Sales Dashboard</h2>
                <p className="text-sm text-[#5A6A51] mt-1">E-Commerce sales analysis, revenue insights, and performance indicators.</p>
              </div>
                <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">E-Commerce Revenue</p>
                  <p className="text-2xl font-bold text-[#1F251A] mt-2">EGP 113,200.00</p>
                  <span className="text-[10px] text-green-600 font-bold">↑ +14.8% vs last month</span>
                </div>
                <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Completed Transactions</p>
                  <p className="text-2xl font-bold text-[#1F251A] mt-2">124 Sales</p>
                  <span className="text-[10px] text-green-600 font-bold">↑ +8.5% vs last month</span>
                </div>
                <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Average Order Value</p>
                  <p className="text-2xl font-bold text-[#1F251A] mt-2">EGP 912.00</p>
                  <span className="text-[10px] text-green-600 font-bold">↑ +5.7% vs last month</span>
                </div>

              {/* Progress visualizers */}
              <div className="rounded-2xl border border-[#414E36]/10 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#5A6A51] mb-5">Category Performance</h3>
                <div className="space-y-4">
                  {[
                    { category: "Skincare Products", percent: 55, amount: "EGP 62,260.00" },
                    { category: "Serums & Treatments", percent: 30, amount: "EGP 33,960.00" },
                    { category: "Sun Protection", percent: 15, amount: "EGP 16,980.00" },
                  ].map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#1F251A]">{item.category}</span>
                        <span className="text-[#C4AE7C]">{item.amount} ({item.percent}%)</span>
                      </div>
                      <div className="w-full bg-[#EDF1EC] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#414E36] h-full rounded-full" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── REFUNDS VIEW ── */}
          {activeNav === "Refunds" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Returns & Refunds</h2>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-medium text-[#414E36] shadow-sm transition hover:bg-[#f5f4f0]">
                    <Filter size={14} /> Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Refund ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Order ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Customer</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Return Date</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Refund Amount</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Reason</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_REFUNDS.map((r) => (
                      <tr key={r.id} className="transition hover:bg-[#F9F9F7]">
                        <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{r.id}</td>
                        <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{r.orderId}</td>
                        <td className="px-5 py-4 font-semibold text-[#1F251A]">{r.customerName}</td>
                        <td className="px-5 py-4 text-[#5A6A51]">{r.date}</td>
                        <td className="px-5 py-4 font-semibold text-[#C4AE7C]">{r.amount}</td>
                        <td className="px-5 py-4 text-[#5A6A51] text-xs">{r.reason}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            r.status === "Processed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                            <Info size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SHIPPING METHODS VIEW ── */}
          {activeNav === "Shipping Methods" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Shipping Methods</h2>
                <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-4 py-2 text-sm font-semibold text-[#414E36] shadow-sm transition hover:bg-[#b59e6c]">
                  <Plus size={14} /> Add Shipping Method
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Method Name</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Rate</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Delivery Time</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {MOCK_SHIPPING.map((s) => (
                      <tr key={s.id} className="transition hover:bg-[#F9F9F7]">
                        <td className="px-5 py-4 font-mono font-semibold text-[#5A6A51]">{s.id}</td>
                        <td className="px-5 py-4 font-semibold text-[#1F251A]">{s.name}</td>
                        <td className="px-5 py-4 text-[#C4AE7C] font-semibold">{s.rate}</td>
                        <td className="px-5 py-4 text-[#5A6A51] font-medium">{s.time}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]">
                            <Info size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TARGET BONUSES VIEW ── */}
          {activeNav === "Target Bonuses" && (
            <section className="space-y-6">
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h1 className="text-4xl font-semibold text-[#1F251A]">Target Bonuses</h1>
                    <p className="mt-2 text-sm text-[#5A6A51]">
                      Track and manage bonus programs across your clinic teams.
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    <Plus size={16} /> Add Target Bonus
                  </button>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <div className="grid grid-cols-[1.1fr_1.4fr_1.1fr_1.2fr_1.2fr_1.2fr_1.2fr_1fr_0.8fr] gap-0 border-b border-[#E6E9EB] bg-[#F7F7F9] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                    <span>ID</span>
                    <span>Title</span>
                    <span>Type</span>
                    <span>Target Value</span>
                    <span>Bonus Amount</span>
                    <span>Start Date</span>
                    <span>End Date</span>
                    <span>Employees Count</span>
                    <span>Actions</span>
                  </div>
                  <div className="min-h-[280px] px-6 py-16 text-center text-sm text-[#5A6A51]">
                    No data available!
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── COUPONS VIEW ── */}
          {activeNav === "Coupons" && (
            <section className="space-y-6">
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h1 className="text-4xl font-semibold text-[#1F251A]">Coupons</h1>
                    <p className="mt-2 text-sm text-[#5A6A51]">
                      Manage active coupons, expiration, and status all in one place.
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    <Plus size={16} /> Add Coupon
                  </button>
                </div>

                <div className="mb-6 rounded-[32px] border border-[#E6E9EB] bg-white p-6">
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr_0.9fr]">
                    <label className="space-y-2">
                      <span className="block text-sm font-semibold text-[#414E36]">Search</span>
                      <input
                        value={couponSearch}
                        onChange={(e) => setCouponSearch(e.target.value)}
                        placeholder="Search by code..."
                        className="w-full rounded-2xl border border-[#D6D7DA] bg-[#F7F7F9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#414E36]/60 focus:ring-2 focus:ring-[#414E36]/10"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="block text-sm font-semibold text-[#414E36]">Date</span>
                      <input
                        value={couponDate}
                        onChange={(e) => setCouponDate(e.target.value)}
                        type="date"
                        className="w-full rounded-2xl border border-[#D6D7DA] bg-[#F7F7F9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#414E36]/60 focus:ring-2 focus:ring-[#414E36]/10"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="block text-sm font-semibold text-[#414E36]">Status</span>
                      <select
                        value={couponStatus}
                        onChange={(e) => setCouponStatus(e.target.value)}
                        className="w-full rounded-2xl border border-[#D6D7DA] bg-[#F7F7F9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#414E36]/60 focus:ring-2 focus:ring-[#414E36]/10"
                      >
                        <option>All</option>
                        <option>Active</option>
                        <option>Expired</option>
                        <option>Draft</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <div className="grid grid-cols-[0.6fr_1.6fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr] gap-0 border-b border-[#E6E9EB] bg-[#F7F7F9] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                    <span>ID</span>
                    <span>Coupon Code</span>
                    <span>Type</span>
                    <span>Amount</span>
                    <span>Usage</span>
                    <span>Start Date</span>
                    <span>End Date</span>
                    <span>Current Status</span>
                    <span>Actions</span>
                  </div>
                  <div className="min-h-[280px] px-6 py-16 text-center text-sm text-[#5A6A51]">
                    No data available!
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── CUSTOMERS VIEW ── */}
          {activeNav === "Customers" && (
            <div>
              {/* Page header and premium controls panel */}
              <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#1F251A]">Patients Directory</h2>
                    <p className="text-xs text-[#5A6A51]">Manage demographic profiles and clinical histories</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowCustomerFilterPanel(prev => !prev)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        showCustomerFilterPanel || customerFilterGender !== "All" || customerFilterStatus !== "All" || customerFilterReferral !== "All"
                          ? "border-[#C4AE7C] bg-[#EDE4C8] text-[#414E36]"
                          : "border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#FBFBF9]"
                      }`}
                    >
                      <Filter size={14} /> Filter
                      {(customerFilterGender !== "All" || customerFilterStatus !== "All" || customerFilterReferral !== "All") && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#414E36] text-[9px] font-bold text-white">!</span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowExportCustomersModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#FBFBF9]"
                    >
                      <Download size={14} /> Export
                    </button>
                    
                    {hasPermission("customers.import") && (
                      <button
                        onClick={() => setShowImportCustomersModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#414E36]/15 bg-white px-4 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#FBFBF9]"
                      >
                        <Upload size={14} /> Import
                      </button>
                    )}
                    
                    {hasPermission("customers.create") && (
                      <button
                        onClick={handleOpenAddCustomer}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#414E36] px-5 py-2 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                      >
                        <Plus size={14} /> Add Patient
                      </button>
                    )}
                  </div>
                </div>

                {/* Unified Search and Quick Info Bar */}
                <div className="flex flex-wrap items-center gap-3 border-t border-[#414E36]/5 pt-4">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51] z-10 pointer-events-none" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, phone, national ID..."
                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:bg-white focus:ring-2 focus:ring-[#C4AE7C]/15"
                    />
                  </div>
                  <div className="text-xs text-[#5A6A51] ml-auto">
                    Total Patients: <span className="font-bold text-[#1F251A]">{filteredCustomers.length}</span>
                  </div>
                </div>
              </div>

              {/* Toggleable Customer Filters Drawer */}
              {showCustomerFilterPanel && (
                <div className="mb-6 grid grid-cols-1 gap-4 rounded-3xl border border-[#414E36]/10 bg-[#F9F9F7] p-5 md:grid-cols-4 items-end shadow-sm animate-fadeIn">
                  {/* Gender Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Gender</label>
                    <select
                      value={customerFilterGender}
                      onChange={(e) => setCustomerFilterGender(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Status</label>
                    <select
                      value={customerFilterStatus}
                      onChange={(e) => setCustomerFilterStatus(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active Only</option>
                      <option value="Inactive">Inactive Only</option>
                    </select>
                  </div>

                  {/* Referral Source Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51]">Referral Source</label>
                    <select
                      value={customerFilterReferral}
                      onChange={(e) => setCustomerFilterReferral(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#C4AE7C]"
                    >
                      <option value="All">All Referrals</option>
                      <option value="Google">Google Search</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Friend">Friend / Family</option>
                      <option value="Doctor Referral">Doctor Referral</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Clear Button */}
                  <div>
                    <button
                      onClick={() => {
                        setCustomerFilterGender("All");
                        setCustomerFilterStatus("All");
                        setCustomerFilterReferral("All");
                        setCustomerSearch("");
                      }}
                      className="h-[42px] w-full rounded-2xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Customer</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Phone</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Email</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Created At</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Bookings</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[#5A6A51]">
                          No customers found.
                        </td>
                      </tr>
                    )}
                    {filteredCustomers.map((c) => {
                      const dt = new Date(c.createdAt);
                      const dateStr = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
                      const uniqueKey = c.id || c.email || c.phone;
                      const displayPhone = c.mobile || c.phone || "—";
                      const displayEmail = c.email || "—";
                      return (
                        <tr key={uniqueKey} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-5 py-4 font-semibold text-[#1F251A]">{c.name}</td>
                          <td className="px-5 py-4 text-[#1F251A]">{displayPhone}</td>
                          <td className="px-5 py-4 text-[#5A6A51]">{displayEmail}</td>
                          <td className="px-5 py-4 text-[#5A6A51]">
                            <span className="block font-medium text-[#1F251A]">{dateStr}</span>
                            <span className="text-xs">{timeStr}</span>
                          </td>
                          <td className="px-5 py-4 text-center text-[#1F251A]">{c.bookings}</td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingCustomerProfile(c)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                                title="View Customer Profile & Booking History"
                              >
                                <Info size={14} />
                              </button>
                              {hasPermission("customers.edit") && (
                                <button
                                  onClick={() => handleOpenEditCustomer(c)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                                  title="Edit Customer"
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                              {hasPermission("customers.delete") && (
                                <button
                                  onClick={() => setDeleteCustomerTarget(c)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                                  title="Delete Customer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ── REPORTS VIEWS ── */}
          {activeNav === "Transaction Reports" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Transaction Reports</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Generate and export detailed financial reports of all clinic activities.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Download size={16} /> Export Gross Report
                </button>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { title: "Revenue Statement", desc: "Detailed summary of all patient bookings, POS sales, and service packages.", period: "Monthly / Quarterly" },
                  { title: "Expense Statement", desc: "Logs of all payroll payouts, inventory procurement, and operational costs.", period: "Monthly / Annual" },
                  { title: "Tax & Vat Summary", desc: "Official compliance report summarizing VAT tax collections and deductibles.", period: "Annual" },
                ].map((rep, idx) => (
                  <div key={idx} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
                    <div>
                      <h3 className="text-lg font-bold text-[#1F251A]">{rep.title}</h3>
                      <p className="mt-2 text-xs text-[#5A6A51] leading-relaxed">{rep.desc}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#F2EFE9] pt-4">
                      <span className="text-[10px] uppercase tracking-wider bg-[#EDF1EC] text-[#414E36] px-2.5 py-1 rounded-md font-semibold">{rep.period}</span>
                      <button className="text-xs font-bold text-[#C4AE7C] hover:underline flex items-center gap-1">
                        <Download size={12} /> Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "Customer Transaction History" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Customer Transaction History</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Trace the historical payments and booking expenditures of specific patients.</p>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search patient ledgers by name or email..."
                      value={reportsCustomerSearch}
                      onChange={(e) => setReportsCustomerSearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Customer</th>
                        <th className="px-6 py-4 text-left">Email / Phone</th>
                        <th className="px-6 py-4 text-center">Bookings Count</th>
                        <th className="px-6 py-4 text-right">Total Spent</th>
                        <th className="px-6 py-4 text-right">Outstanding Bal</th>
                        <th className="px-6 py-4 text-right">Wallet Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {filteredCustomers.filter(c => 
                        c.name.toLowerCase().includes(reportsCustomerSearch.toLowerCase()) ||
                        c.email.toLowerCase().includes(reportsCustomerSearch.toLowerCase())
                      ).map((cust) => (
                        <tr key={cust.email} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{cust.name}</td>
                          <td className="px-6 py-5 text-xs text-[#5A6A51]">
                            <span className="block font-semibold">{cust.email}</span>
                            <span className="block mt-0.5">{cust.phone}</span>
                          </td>
                          <td className="px-6 py-5 text-center font-medium">{cust.bookings}</td>
                          <td className="px-6 py-5 text-right font-bold text-green-600">EGP {cust.spent}</td>
                          <td className="px-6 py-5 text-right font-semibold text-red-600">EGP {cust.outstanding}</td>
                          <td className="px-6 py-5 text-right font-semibold text-[#C4AE7C]">EGP {cust.wallet}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Provider Performance Reports" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Provider Performance</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Analytical summary of practitioner engagements, booking success, and revenue generated.</p>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Provider Name</th>
                        <th className="px-6 py-4 text-center">Assigned Bookings</th>
                        <th className="px-6 py-4 text-center">Success Rate</th>
                        <th className="px-6 py-4 text-right">Est Revenue Generated</th>
                        <th className="px-6 py-4 text-center">Patient Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { name: "Dr. Ahmed Medhat", bookings: 12, rate: "91.6%", rev: "EGP 42,500.00", rating: "4.9/5" },
                        { name: "Dr. Radwa Seif", bookings: 8, rate: "100%", rev: "EGP 28,400.00", rating: "4.8/5" },
                        { name: "Dr. Sara El Gamel", bookings: 15, rate: "93.3%", rev: "EGP 56,100.00", rating: "5.0/5" },
                      ].map((prov, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{prov.name}</td>
                          <td className="px-6 py-5 text-center font-medium">{prov.bookings}</td>
                          <td className="px-6 py-5 text-center font-semibold text-green-600">{prov.rate}</td>
                          <td className="px-6 py-5 text-right font-bold text-[#414E36]">{prov.rev}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                              <Star size={14} className="fill-amber-500" /> {prov.rating}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Provider Performance Date Range Reports" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Date-Range Performance</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Assess practitioner performance filters dynamically across custom timelines.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" defaultValue="2026-06-01" className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none" />
                  <span className="text-sm font-semibold text-[#5A6A51]">to</span>
                  <input type="date" defaultValue="2026-06-30" className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="min-h-[220px] flex items-center justify-center text-sm text-[#5A6A51] font-medium">
                  Select a date range to load custom filter metrics.
                </div>
              </div>
            </div>
          )}

          {activeNav === "Service Performance Reports" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Service Performance</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Track which services are booked the most and generate the highest return.</p>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Service Name</th>
                        <th className="px-6 py-4 text-left">Category</th>
                        <th className="px-6 py-4 text-center">Total Bookings</th>
                        <th className="px-6 py-4 text-right">Revenue Share</th>
                        <th className="px-6 py-4 text-center">Trend Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { name: "Tattoo Removal (Medium)", cat: "Laser Treatments", bookings: 45, rev: "EGP 90,000.00", trend: "High Demand" },
                        { name: "Hydrating Facial Treatment", cat: "Skincare", bookings: 38, rev: "EGP 17,100.00", trend: "Stable" },
                        { name: "Physiotherapy Standard Session", cat: "Physio & Rehabilitation", bookings: 24, rev: "EGP 14,400.00", trend: "Growing" },
                      ].map((srv, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{srv.name}</td>
                          <td className="px-6 py-5 text-[#5A6A51]">{srv.cat}</td>
                          <td className="px-6 py-5 text-center font-medium">{srv.bookings}</td>
                          <td className="px-6 py-5 text-right font-bold text-[#414E36]">{srv.rev}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              {srv.trend}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY VIEWS ── */}
          {activeNav === "Procurement" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Procurement Log</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Monitor inventory purchase orders and supplier status logs.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> New PO Order
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Purchase ID</th>
                        <th className="px-6 py-4 text-left">Supplier</th>
                        <th className="px-6 py-4 text-left">Date Ordered</th>
                        <th className="px-6 py-4 text-center">Items Ordered</th>
                        <th className="px-6 py-4 text-right">Total Cost</th>
                        <th className="px-6 py-4 text-center">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {MOCK_PURCHASES.map((p) => {
                        const isDelivered = p.status === "Delivered";
                        return (
                          <tr key={p.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{p.id}</td>
                            <td className="px-6 py-5 font-semibold text-[#1F251A]">{p.supplier}</td>
                            <td className="px-6 py-5 text-[#5A6A51]">{p.date}</td>
                            <td className="px-6 py-5 text-center font-medium">{p.itemsCount} pcs</td>
                            <td className="px-6 py-5 text-right font-bold text-[#414E36]">{p.total}</td>
                            <td className="px-6 py-5 text-center">
                              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                isDelivered ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Adjustments" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Stock Adjustments</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Log and record manual changes to stock levels due to damages, discrepancies, or audits.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> New Adjustment
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Log ID</th>
                        <th className="px-6 py-4 text-left">Product Name</th>
                        <th className="px-6 py-4 text-center">Old Qty</th>
                        <th className="px-6 py-4 text-center">Adjustment</th>
                        <th className="px-6 py-4 text-center">New Qty</th>
                        <th className="px-6 py-4 text-left">Reason</th>
                        <th className="px-6 py-4 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { id: "ADJ-001", name: "Sunscreen SPF 50+", oldVal: 15, adj: -3, newVal: 12, reason: "Damaged / Expired packaging", date: "10 Jun 2026" },
                        { id: "ADJ-002", name: "Hydrating Facial Cream", oldVal: 20, adj: 4, newVal: 24, reason: "Stock count audit adjustment", date: "09 Jun 2026" },
                      ].map((adj) => (
                        <tr key={adj.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{adj.id}</td>
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{adj.name}</td>
                          <td className="px-6 py-5 text-center font-medium text-[#5A6A51]">{adj.oldVal}</td>
                          <td className={`px-6 py-5 text-center font-bold ${adj.adj < 0 ? "text-red-500" : "text-green-600"}`}>
                            {adj.adj > 0 ? `+${adj.adj}` : adj.adj}
                          </td>
                          <td className="px-6 py-5 text-center font-bold text-[#1F251A]">{adj.newVal}</td>
                          <td className="px-6 py-5 text-xs text-[#5A6A51]">{adj.reason}</td>
                          <td className="px-6 py-5 text-[#5A6A51]">{adj.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SMS MANAGEMENT VIEWS ── */}
          {activeNav === "SMS Templates" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">SMS Templates</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Pre-defined templates for patient booking confirmations, updates, and promotions.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> New Template
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={smsTemplateSearch}
                      onChange={(e) => setSmsTemplateSearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    { title: "Booking Confirmation", type: "Transactional", body: "Hello {patient_name}, your booking for {service_name} at Revera Zayed on {date} at {time} has been confirmed. Thank you!" },
                    { title: "24-Hour Reminder", type: "Reminder", body: "Dear {patient_name}, this is a reminder for your session tomorrow at {time}. To reschedule, reply or call us." },
                    { title: "Summer Laser Promo", type: "Marketing", body: "Get glowing this summer! Book any laser package this week and get 20% off. Call Revera Zayed today." },
                  ].filter(t => t.title.toLowerCase().includes(smsTemplateSearch.toLowerCase())).map((tpl, idx) => (
                    <div key={idx} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-[#1F251A]">{tpl.title}</h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EDF1EC] text-[#414E36] px-2.5 py-0.5 rounded-full">{tpl.type}</span>
                        </div>
                        <p className="text-xs text-[#5A6A51] bg-[#F7F7F9] p-3 rounded-2xl font-mono leading-relaxed">{tpl.body}</p>
                      </div>
                      <div className="mt-4 flex items-center gap-3 justify-end border-t border-[#F2EFE9] pt-4">
                        <button className="text-xs font-bold text-[#5A6A51] hover:underline">Edit</button>
                        <button className="text-xs font-bold text-red-600 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === "End User Groups" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">End User Groups</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Organize patient lists into focused segments for targeted messaging campaigns.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> Create Group
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] grid gap-6 md:grid-cols-3">
                {[
                  { title: "All Active Patients", size: "34 Patients", desc: "Includes all patients with at least one confirmed booking in the past 6 months." },
                  { title: "VIP Laser Customers", size: "12 Patients", desc: "Patients who have spent over EGP 15,000 on Laser Treatments." },
                  { title: "Inactive (3+ Months)", size: "8 Patients", desc: "Patients who registered but haven't booked a session in 90 days." },
                ].map((g, idx) => (
                  <div key={idx} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[180px]">
                    <div>
                      <h3 className="font-bold text-[#1F251A]">{g.title}</h3>
                      <p className="text-[11px] font-bold text-[#C4AE7C] mt-1">{g.size}</p>
                      <p className="text-xs text-[#5A6A51] mt-3 leading-relaxed">{g.desc}</p>
                    </div>
                    <button className="mt-4 text-xs font-bold text-[#414E36] hover:underline text-left">View Members →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "SMS Automation" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">SMS Automation</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Automate messages to trigger immediately based on patient booking activities.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> New Rule
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Trigger Event</th>
                        <th className="px-6 py-4 text-left">Assigned Template</th>
                        <th className="px-6 py-4 text-center">Delay / Schedule</th>
                        <th className="px-6 py-4 text-center">Total Sent</th>
                        <th className="px-6 py-4 text-center">Rule Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { trigger: "Booking Created", tpl: "Booking Confirmation", schedule: "Immediate", sent: 124, status: "Active" },
                        { trigger: "24h Before Session", tpl: "24-Hour Reminder", schedule: "1 day before", sent: 98, status: "Active" },
                        { trigger: "3 Days Post-Care", tpl: "Post-care Checkin", schedule: "3 days after", sent: 54, status: "Inactive" },
                      ].map((rule, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{rule.trigger}</td>
                          <td className="px-6 py-5 text-[#5A6A51] font-medium">{rule.tpl}</td>
                          <td className="px-6 py-5 text-center text-[#5A6A51]">{rule.schedule}</td>
                          <td className="px-6 py-5 text-center font-semibold">{rule.sent} msgs</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              rule.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
                            }`}>
                              {rule.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Marketing Campaigns" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Marketing Campaigns</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Blast promotional SMS messages to specific patient groups and track results.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> New Blast Campaign
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Campaign Name</th>
                        <th className="px-6 py-4 text-left">Target Group</th>
                        <th className="px-6 py-4 text-center">Delivered</th>
                        <th className="px-6 py-4 text-center">Failed</th>
                        <th className="px-6 py-4 text-left">Sent Date</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { name: "Eid Laser Promotion", target: "VIP Laser Customers", delivered: 12, failed: 0, date: "15 May 2026", status: "Sent" },
                        { name: "Summer Solstice Skincare", target: "All Active Patients", delivered: 34, failed: 0, date: "10 Jun 2026", status: "Sent" },
                        { name: "Re-engagement Blast", target: "Inactive (3+ Months)", delivered: 0, failed: 0, date: "Scheduled", status: "Pending" },
                      ].map((cam, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{cam.name}</td>
                          <td className="px-6 py-5 text-[#5A6A51] font-medium">{cam.target}</td>
                          <td className="px-6 py-5 text-center text-green-600 font-bold">{cam.delivered}</td>
                          <td className="px-6 py-5 text-center text-red-500 font-bold">{cam.failed}</td>
                          <td className="px-6 py-5 text-[#5A6A51]">{cam.date}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              cam.status === "Sent" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {cam.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Instant SMS" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Instant SMS Composer</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Directly compose and dispatch a single SMS message to a specific patient.</p>
              </div>
              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-xl">
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Recipient Patient</label>
                    <select className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none">
                      {filteredCustomers.map(c => (
                        <option key={c.email}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Message Body</label>
                    <textarea
                      placeholder="Type your message here..."
                      rows={5}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-[#5A6A51]">
                      <span>0 / 160 characters</span>
                      <span>1 SMS part</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-3xl bg-[#414E36] py-3.5 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] flex items-center justify-center gap-2"
                  >
                    <Megaphone size={16} /> Dispatch SMS
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeNav === "SMS Logs" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">SMS History Logs</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Audit logs of all dispatched messages and their delivery statuses.</p>
                </div>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search logs by phone or message..."
                      value={smsLogSearch}
                      onChange={(e) => setSmsLogSearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Phone Number</th>
                        <th className="px-6 py-4 text-left">Message Content Preview</th>
                        <th className="px-6 py-4 text-left">Timestamp</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { phone: "+20 100 123 4567", body: "Hello Nour Salim, your booking for Laser Hair Removal is confirmed.", date: "10 Jun 2026, 6:30 pm", status: "Delivered" },
                        { phone: "+20 122 987 6543", body: "Hi Kareem Soliman, remember your appointment tomorrow at 2:15 pm.", date: "08 Jun 2026, 2:15 pm", status: "Delivered" },
                        { phone: "+20 110 555 4321", body: "Get glowing! Eid discount offers inside. Book now.", date: "15 May 2026, 10:00 am", status: "Failed" },
                      ].filter(l => 
                        l.phone.includes(smsLogSearch) || 
                        l.body.toLowerCase().includes(smsLogSearch.toLowerCase())
                      ).map((log, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-mono text-sm font-semibold text-[#1F251A]">{log.phone}</td>
                          <td className="px-6 py-5 text-xs text-[#5A6A51] max-w-[400px] truncate" title={log.body}>{log.body}</td>
                          <td className="px-6 py-5 text-xs text-[#5A6A51]">{log.date}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              log.status === "Delivered" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Follow-up" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Post-Care Follow-up</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Track automatically scheduled post-treatment checkins and feedback messages.</p>
                </div>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Patient</th>
                        <th className="px-6 py-4 text-left">Treatment Done</th>
                        <th className="px-6 py-4 text-left">Follow-up Event</th>
                        <th className="px-6 py-4 text-left">Scheduled Dispatch</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { name: "Nour Salim", treatment: "Tattoo Removal (Medium)", msg: "Day 3 check-in request", time: "13 Jun 2026", status: "Scheduled" },
                        { name: "Kareem Soliman", treatment: "Physiotherapy Session", msg: "Feedback rating collection", time: "11 Jun 2026", status: "Sent" },
                      ].map((item, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{item.name}</td>
                          <td className="px-6 py-5 text-[#5A6A51] font-medium">{item.treatment}</td>
                          <td className="px-6 py-5 text-xs text-[#5A6A51]">{item.msg}</td>
                          <td className="px-6 py-5 text-xs text-[#5A6A51]">{item.time}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === "Sent" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
              {pagesSettingsTab === "Home" && (() => {
                const slidesList = pageSettingsLangTab === "en" ? homeHeroSlides : homeHeroSlidesAr;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                      <div>
                        <h3 className="text-2xl font-bold text-[#1F251A]">Hero Slider Editor</h3>
                        <p className="text-sm text-[#5A6A51] mt-1">Manage slides, headings, descriptions, and background images.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleAddSlide}
                          className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
                        >
                          <Plus size={16} /> Add New Slide
                        </button>
                        <button
                          disabled={savingPageSettings}
                          onClick={() => savePageSettings({ hero: { slides: homeHeroSlides, slides_ar: homeHeroSlidesAr } })}
                          className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                        >
                          {savingPageSettings ? "Saving..." : "Save All Changes"}
                        </button>
                      </div>
                    </div>

                    {/* Language Tab Switcher */}
                    <div className="flex border-b border-[#F2EFE9] bg-white px-8 pt-4 rounded-t-[40px] shadow-[0_10px_30px_rgba(47,61,41,0.02)]">
                      <button
                        onClick={() => setPageSettingsLangTab("en")}
                        className={`pb-4 px-6 text-sm font-bold transition-all duration-200 border-b-2 ${
                          pageSettingsLangTab === "en" ? "border-[#414E36] text-[#414E36]" : "border-transparent text-[#5A6A51]/70 hover:text-[#414E36]"
                        }`}
                      >
                        English Version
                      </button>
                      <button
                        onClick={() => setPageSettingsLangTab("ar")}
                        className={`pb-4 px-6 text-sm font-bold transition-all duration-200 border-b-2 ${
                          pageSettingsLangTab === "ar" ? "border-[#414E36] text-[#414E36]" : "border-transparent text-[#5A6A51]/70 hover:text-[#414E36]"
                        }`}
                      >
                        Arabic Version (العربية)
                      </button>
                    </div>

                    {loadingPageSettings ? (
                      <div className="rounded-b-[40px] bg-white p-12 shadow-[0_30px_80px_rgba(47,61,41,0.07)] flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#414E36] border-t-transparent" />
                      </div>
                    ) : (
                      <div className="rounded-b-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-8">
                        {slidesList.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-sm text-[#5A6A51]">No slides found. Click "Add New Slide" to start.</p>
                          </div>
                        ) : (
                          slidesList.map((slide: any, index: number) => (
                            <div key={index} className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-6 space-y-6 relative group">
                              
                              {/* Slide header & order controls */}
                              <div className="flex items-center justify-between border-b border-[#414E36]/8 pb-4">
                                <h4 className="font-bold text-[#414E36] text-lg">Slide #{index + 1}</h4>
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={index === 0}
                                    onClick={() => handleMoveSlide(index, "up")}
                                    className="p-2 rounded-full border border-[#414E36]/15 hover:bg-[#F2EFE9] text-[#414E36] disabled:opacity-30 disabled:hover:bg-transparent transition"
                                    title="Move Up"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    disabled={index === slidesList.length - 1}
                                    onClick={() => handleMoveSlide(index, "down")}
                                    className="p-2 rounded-full border border-[#414E36]/15 hover:bg-[#F2EFE9] text-[#414E36] disabled:opacity-30 disabled:hover:bg-transparent transition"
                                    title="Move Down"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlide(index)}
                                    className="ml-2 inline-flex items-center gap-1 rounded-2xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </div>

                              {/* Two column: Image and Texts */}
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Left column: Image picker */}
                                <div className="lg:col-span-1 space-y-4">
                                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Slide Background Image</label>
                                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-gray-100 border border-dashed border-[#414E36]/20 flex flex-col items-center justify-center group/img">
                                    {slide.image ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={slide.image} alt="Preview" className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                          <span className="text-xs text-white font-medium">Click to change</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center p-4">
                                        <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                                        <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const compressed = await compressImage(file, 1920, 1080, 0.75);
                                            handleUpdateField(index, "image", compressed);
                                          } catch (err) {
                                            console.error("Failed to compress hero image, using original:", err);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              handleUpdateField(index, "image", reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#5A6A51]/80 mb-1.5">Or enter Image URL/Path</label>
                                    <input
                                      type="text"
                                      value={slide.image || ""}
                                      onChange={(e) => handleUpdateField(index, "image", e.target.value)}
                                      placeholder="/images/hero/slide-1.jpg"
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Right column: Slide texts fields */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">Welcome Badge Text</label>
                                    <input
                                      type="text"
                                      value={slide.welcome || ""}
                                      onChange={(e) => handleUpdateField(index, "welcome", e.target.value)}
                                      placeholder="e.g. Welcome to Revera Clinics"
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">Heading Title</label>
                                    <input
                                      type="text"
                                      value={slide.heading || ""}
                                      onChange={(e) => handleUpdateField(index, "heading", e.target.value)}
                                      placeholder="e.g. Transform Your Beauty Naturally!"
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">Slide Description</label>
                                    <textarea
                                      value={slide.description || ""}
                                      onChange={(e) => handleUpdateField(index, "description", e.target.value)}
                                      placeholder="Enter slide paragraph content..."
                                      rows={3}
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] resize-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">CTA Button Text</label>
                                    <input
                                      type="text"
                                      value={slide.bookBtn || ""}
                                      onChange={(e) => handleUpdateField(index, "bookBtn", e.target.value)}
                                      placeholder="e.g. Book Appointment"
                                      className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">Rating</label>
                                      <input
                                        type="text"
                                        value={slide.rating || ""}
                                        onChange={(e) => handleUpdateField(index, "rating", e.target.value)}
                                        placeholder="4.5"
                                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">Review Count</label>
                                      <input
                                        type="text"
                                        value={slide.reviewCount || ""}
                                        onChange={(e) => handleUpdateField(index, "reviewCount", e.target.value)}
                                        placeholder="(1000+ review)"
                                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                                      />
                                    </div>
                                  </div>

                                </div>

                              </div>

                            </div>
                          ))
                        )}

                        {/* Bottom action buttons */}
                        {slidesList.length > 0 && (
                          <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
                            <button
                              onClick={handleAddSlide}
                              className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
                            >
                              <Plus size={16} /> Add New Slide
                            </button>
                            <button
                              disabled={savingPageSettings}
                              onClick={() => savePageSettings({ hero: { slides: homeHeroSlides, slides_ar: homeHeroSlidesAr } })}
                              className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                            >
                              {savingPageSettings ? "Saving..." : "Save All Changes"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Before / After Results Editor */}
                    <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#F2EFE9]">
                        <div>
                          <h3 className="text-2xl font-bold text-[#1F251A]">Before / After Results</h3>
                          <p className="text-sm text-[#5A6A51] mt-1">Manage the before-and-after photo catalog shown on the homepage.</p>
                        </div>
                        <button
                          onClick={() => {
                            const newPair = {
                              id: Date.now(),
                              before: "/images/before-after/1-before.jpeg",
                              after: "/images/before-after/1-after.jpeg"
                            };
                            setBeforeAfterPairs([...beforeAfterPairs, newPair]);
                          }}
                          className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-transparent px-5 py-2.5 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
                        >
                          <Plus size={16} /> Add Result Pair
                        </button>
                      </div>

                      {beforeAfterPairs.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-[#5A6A51]">No before/after pairs found. Click "Add Result Pair" to start.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {beforeAfterPairs.map((pair, index) => (
                            <div key={pair.id || index} className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-6 space-y-4 relative group">
                              <div className="flex items-center justify-between border-b border-[#414E36]/8 pb-2">
                                <h4 className="font-bold text-[#414E36] text-sm">Result Case #{index + 1}</h4>
                                <button
                                  onClick={async () => {
                                    if (await showConfirm("Are you sure you want to delete this result case?")) {
                                      const updated = beforeAfterPairs.filter((_, i) => i !== index);
                                      setBeforeAfterPairs(updated);
                                      savePageSettings({ results: { pairs: updated } });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Before Photo Column */}
                                <div className="space-y-2">
                                  <span className="block text-[11px] font-bold text-[#5A6A51] uppercase tracking-wide">Before</span>
                                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group/img">
                                    {pair.before ? (
                                      <>
                                        <Image
                                          src={pair.before}
                                          alt="Before Case"
                                          fill
                                          className="object-cover"
                                          unoptimized
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-white text-[10px] font-semibold px-2 py-1 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center p-2">
                                        <Upload className="mx-auto h-6 w-6 text-[#5A6A51]/60 mb-1" />
                                        <span className="text-[10px] text-[#5A6A51]/60 font-medium">Upload File</span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const compressed = await compressImage(file, 1000, 1000, 0.75);
                                            const updated = [...beforeAfterPairs];
                                            updated[index] = { ...updated[index], before: compressed };
                                            setBeforeAfterPairs(updated);
                                          } catch (err) {
                                            console.error("Failed to compress before image, using original:", err);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              const updated = [...beforeAfterPairs];
                                              updated[index] = { ...updated[index], before: reader.result as string };
                                              setBeforeAfterPairs(updated);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={pair.before || ""}
                                    onChange={(e) => {
                                      const updated = [...beforeAfterPairs];
                                      updated[index] = { ...updated[index], before: e.target.value };
                                      setBeforeAfterPairs(updated);
                                    }}
                                    placeholder="Image URL"
                                    className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-[11px] text-[#1F251A] outline-none"
                                  />
                                </div>

                                {/* After Photo Column */}
                                <div className="space-y-2">
                                  <span className="block text-[11px] font-bold text-[#5A6A51] uppercase tracking-wide">After</span>
                                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group/img">
                                    {pair.after ? (
                                      <>
                                        <Image
                                          src={pair.after}
                                          alt="After Case"
                                          fill
                                          className="object-cover"
                                          unoptimized
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-white text-[10px] font-semibold px-2 py-1 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center p-2">
                                        <Upload className="mx-auto h-6 w-6 text-[#5A6A51]/60 mb-1" />
                                        <span className="text-[10px] text-[#5A6A51]/60 font-medium">Upload File</span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const compressed = await compressImage(file, 1000, 1000, 0.75);
                                            const updated = [...beforeAfterPairs];
                                            updated[index] = { ...updated[index], after: compressed };
                                            setBeforeAfterPairs(updated);
                                          } catch (err) {
                                            console.error("Failed to compress after image, using original:", err);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              const updated = [...beforeAfterPairs];
                                              updated[index] = { ...updated[index], after: reader.result as string };
                                              setBeforeAfterPairs(updated);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={pair.after || ""}
                                    onChange={(e) => {
                                      const updated = [...beforeAfterPairs];
                                      updated[index] = { ...updated[index], after: e.target.value };
                                      setBeforeAfterPairs(updated);
                                    }}
                                    placeholder="Image URL"
                                    className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-[11px] text-[#1F251A] outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
                        <button
                          disabled={savingPageSettings}
                          onClick={() => savePageSettings()}
                          className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                        >
                          {savingPageSettings ? "Saving..." : "Save All Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}


              {/* About Us Page */}
              {pagesSettingsTab === "About Us" && (
                <div className="space-y-8">
                  <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-[#1F251A]">About Section Photos</h3>
                    <p className="text-sm text-[#5A6A51] mt-1">Upload or edit the three main images displayed in the homepage About section.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    {/* Image 1: Left Doctor Portrait */}
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 1: Doctor Portrait (Foreground)</label>
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                        {aboutImage1 || "/images/doctor/portrait-about.jpg" ? (
                          <>
                            <Image
                              src={aboutImage1 || "/images/doctor/portrait-about.jpg"}
                              alt="Foreground Portrait"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                            <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 1000, 1000, 0.75);
                                setAboutImage1(compressed);
                              } catch (err) {
                                console.error("Failed to compress portrait 1, using original:", err);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAboutImage1(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                        <input
                          type="text"
                          value={aboutImage1}
                          onChange={(e) => setAboutImage1(e.target.value)}
                          placeholder="/images/doctor/portrait-about.jpg"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>

                    {/* Image 2: Right Doctor Portrait */}
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 2: Doctor Portrait (Background)</label>
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                        {aboutImage2 || "/images/doctor/portrait-main.jpg" ? (
                          <>
                            <Image
                              src={aboutImage2 || "/images/doctor/portrait-main.jpg"}
                              alt="Background Portrait"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                            <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 1000, 1000, 0.75);
                                setAboutImage2(compressed);
                              } catch (err) {
                                console.error("Failed to compress portrait 2, using original:", err);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAboutImage2(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                        <input
                          type="text"
                          value={aboutImage2}
                          onChange={(e) => setAboutImage2(e.target.value)}
                          placeholder="/images/doctor/portrait-main.jpg"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>

                    {/* Image 3: Clinic Interior */}
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 3: Clinic Interior</label>
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                        {aboutImage3 || "/images/clinic/interior.jpg" ? (
                          <>
                            <Image
                              src={aboutImage3 || "/images/clinic/interior.jpg"}
                              alt="Clinic Interior"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                            <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 1000, 1000, 0.75);
                                setAboutImage3(compressed);
                              } catch (err) {
                                console.error("Failed to compress clinic interior, using original:", err);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAboutImage3(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                        <input
                          type="text"
                          value={aboutImage3}
                          onChange={(e) => setAboutImage3(e.target.value)}
                          placeholder="/images/clinic/interior.jpg"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
                      <button
                        disabled={savingPageSettings}
                        onClick={() => savePageSettings()}
                        className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] duration-150 cursor-pointer"
                      >
                        {savingPageSettings ? "Saving..." : "Save All Changes"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#1F251A]">What We Do</h3>
                      <p className="text-sm text-[#5A6A51] mt-1">Upload or edit the photos and modify checklist items shown in the "What We Do" section on the About Us page.</p>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* What We Do Photo 1: Left Before/After Collage */}
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">What We Do: Photo 1 (Left Collage)</label>
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                        {whatWeDoImage1 || "/images/clinic/interior.jpg" ? (
                          <>
                            <Image
                              src={whatWeDoImage1 || "/images/clinic/interior.jpg"}
                              alt="What We Do Left Image"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                            <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 1000, 1000, 0.75);
                                setWhatWeDoImage1(compressed);
                              } catch (err) {
                                console.error("Failed to compress what we do 1, using original:", err);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setWhatWeDoImage1(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                        <input
                          type="text"
                          value={whatWeDoImage1}
                          onChange={(e) => setWhatWeDoImage1(e.target.value)}
                          placeholder="/images/clinic/interior.jpg"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>

                    {/* What We Do Photo 2: Right Circular Image */}
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">What We Do: Photo 2 (Right Treatment)</label>
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                        {whatWeDoImage2 || "/images/clinic/video-thumbnail.jpg" ? (
                          <>
                            <Image
                              src={whatWeDoImage2 || "/images/clinic/video-thumbnail.jpg"}
                              alt="What We Do Right Image"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                            <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 1000, 1000, 0.75);
                                setWhatWeDoImage2(compressed);
                              } catch (err) {
                                console.error("Failed to compress what we do 2, using original:", err);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setWhatWeDoImage2(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                        <input
                          type="text"
                          value={whatWeDoImage2}
                          onChange={(e) => setWhatWeDoImage2(e.target.value)}
                          placeholder="/images/clinic/video-thumbnail.jpg"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-[#F2EFE9] my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* English Checklist */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#1F251A]">English Checklist Items</h4>
                        <button
                          type="button"
                          onClick={() => setWhatWeDoList([...whatWeDoList, ""])}
                          className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>
                      {whatWeDoList.map((item, index) => (
                        <div key={index} className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="block text-xs font-semibold text-[#5A6A51]">Item {index + 1}</label>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newList = [...whatWeDoList];
                                newList[index] = e.target.value;
                                setWhatWeDoList(newList);
                              }}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                              placeholder={`Checklist Item ${index + 1}`}
                            />
                          </div>
                          {whatWeDoList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newList = whatWeDoList.filter((_, i) => i !== index);
                                setWhatWeDoList(newList);
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition duration-155 cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Arabic Checklist */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setWhatWeDoListAr([...whatWeDoListAr, ""])}
                          className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          + إضافة عنصر
                        </button>
                        <h4 className="text-sm font-semibold text-[#1F251A] text-right">عناصر القائمة باللغة العربية</h4>
                      </div>
                      {whatWeDoListAr.map((item, index) => (
                        <div key={index} className="flex items-end gap-2" dir="rtl">
                          <div className="flex-1 space-y-1">
                            <label className="block text-xs font-semibold text-[#5A6A51] text-right">العنصر {index + 1}</label>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newList = [...whatWeDoListAr];
                                newList[index] = e.target.value;
                                setWhatWeDoListAr(newList);
                              }}
                              className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                              placeholder={`عنصر القائمة ${index + 1}`}
                            />
                          </div>
                          {whatWeDoListAr.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newList = whatWeDoListAr.filter((_, i) => i !== index);
                                setWhatWeDoListAr(newList);
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition duration-155 cursor-pointer"
                              title="حذف العنصر"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
                    <button
                      disabled={savingPageSettings}
                      onClick={() => savePageSettings()}
                      className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                    >
                      {savingPageSettings ? "Saving..." : "Save All Changes"}
                    </button>
                  </div>

                  {/* Frequently Asked Questions Section */}
                  <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#1F251A]">Frequently Asked Questions</h3>
                      <p className="text-sm text-[#5A6A51] mt-1">Configure the images, tag, heading, and list of questions & answers for the FAQ accordion on the About Us page.</p>
                    </div>

                    {/* FAQ Photos Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#F2EFE9]">
                      {/* Photo 1: Left Consultation (Main) */}
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 1: Consultation (Main Left)</label>
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                          {faqImage1 || "/images/doctor/portrait-main.jpg" ? (
                            <>
                              <Image
                                src={faqImage1 || "/images/doctor/portrait-main.jpg"}
                                alt="Main FAQ Image"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                              <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1000, 1000, 0.75);
                                  setFaqImage1(compressed);
                                } catch (err) {
                                  console.error("Failed to compress FAQ Image 1, using original:", err);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFaqImage1(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                          <input
                            type="text"
                            value={faqImage1}
                            onChange={(e) => setFaqImage1(e.target.value)}
                            placeholder="/images/doctor/portrait-main.jpg"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                      </div>

                      {/* Photo 2: Right Portrait (Secondary Overlay) */}
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 2: Portrait (Secondary Right)</label>
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                          {faqImage2 || "/images/doctor/portrait-faq.jpg" ? (
                            <>
                              <Image
                                src={faqImage2 || "/images/doctor/portrait-faq.jpg"}
                                alt="Secondary FAQ Image"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                              <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1000, 1000, 0.75);
                                  setFaqImage2(compressed);
                                } catch (err) {
                                  console.error("Failed to compress FAQ Image 2, using original:", err);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFaqImage2(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                          <input
                            type="text"
                            value={faqImage2}
                            onChange={(e) => setFaqImage2(e.target.value)}
                            placeholder="/images/doctor/portrait-faq.jpg"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* FAQ Text Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#F2EFE9]">
                      {/* English General */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#1F251A]">English Content Info</h4>
                        
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">FAQ Tagline</label>
                          <input
                            type="text"
                            value={faqTag}
                            onChange={(e) => setFaqTag(e.target.value)}
                            placeholder="Frequently Asked Questions"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">FAQ Heading</label>
                          <input
                            type="text"
                            value={faqHeading}
                            onChange={(e) => setFaqHeading(e.target.value)}
                            placeholder="Questions? We have answers."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                      </div>

                      {/* Arabic General */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#1F251A] text-right">المعلومات باللغة العربية</h4>
                        
                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان الجانبي</label>
                          <input
                            type="text"
                            value={faqTagAr}
                            onChange={(e) => setFaqTagAr(e.target.value)}
                            placeholder="أسئلة شائعة"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                          />
                        </div>

                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان الرئيسي</label>
                          <input
                            type="text"
                            value={faqHeadingAr}
                            onChange={(e) => setFaqHeadingAr(e.target.value)}
                            placeholder="أسئلة؟ لدينا إجابات."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                          />
                        </div>
                      </div>
                    </div>

                    {/* FAQ Items Accordion list editors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#F2EFE9]">
                      {/* English FAQ Items */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-[#1F251A]">English FAQ Items</h4>
                          <button
                            type="button"
                            onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                            className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            + Add FAQ Item
                          </button>
                        </div>

                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                          {faqs.map((faq, index) => (
                            <div key={index} className="p-4 rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] space-y-3 relative group">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-[#5A6A51]">FAQ Item #{index + 1}</span>
                                {faqs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase">Question</label>
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) => {
                                    const newFaqs = [...faqs];
                                    newFaqs[index].question = e.target.value;
                                    setFaqs(newFaqs);
                                  }}
                                  placeholder="Enter Question..."
                                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase">Answer</label>
                                <textarea
                                  rows={3}
                                  value={faq.answer}
                                  onChange={(e) => {
                                    const newFaqs = [...faqs];
                                    newFaqs[index].answer = e.target.value;
                                    setFaqs(newFaqs);
                                  }}
                                  placeholder="Enter Answer..."
                                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Arabic FAQ Items */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setFaqsAr([...faqsAr, { question: "", answer: "" }])}
                            className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            + إضافة سؤال
                          </button>
                          <h4 className="text-sm font-semibold text-[#1F251A] text-right">أسئلة وأجوبة باللغة العربية</h4>
                        </div>

                        <div className="space-y-6 max-h-[500px] overflow-y-auto pl-2" dir="rtl">
                          {faqsAr.map((faq, index) => (
                            <div key={index} className="p-4 rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] space-y-3 relative group text-right">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-[#5A6A51]">سؤال وجواب #{index + 1}</span>
                                {faqsAr.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setFaqsAr(faqsAr.filter((_, i) => i !== index))}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase text-right">السؤال</label>
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) => {
                                    const newFaqs = [...faqsAr];
                                    newFaqs[index].question = e.target.value;
                                    setFaqsAr(newFaqs);
                                  }}
                                  placeholder="اكتب السؤال هنا..."
                                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase text-right">الإجابة</label>
                                <textarea
                                  rows={3}
                                  value={faq.answer}
                                  onChange={(e) => {
                                    const newFaqs = [...faqsAr];
                                    newFaqs[index].answer = e.target.value;
                                    setFaqsAr(newFaqs);
                                  }}
                                  placeholder="اكتب الإجابة هنا..."
                                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none text-right"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
                      <button
                        disabled={savingPageSettings}
                        onClick={() => savePageSettings()}
                        className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                      >
                        {savingPageSettings ? "Saving..." : "Save All Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Services Page */}
              {pagesSettingsTab === "Services" && (
                <div className="space-y-8">
                  {/* How It Works Section */}
                  <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#1F251A]">How It Works Section</h3>
                      <p className="text-sm text-[#5A6A51] mt-1">Configure the main heading and description for the step-by-step process section.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* English Settings */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#1F251A]">English Content</h4>
                        
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Heading</label>
                          <input
                            type="text"
                            value={howItWorksHeading}
                            onChange={(e) => setHowItWorksHeading(e.target.value)}
                            placeholder="Simple steps to beauty transformations"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Description</label>
                          <textarea
                            rows={5}
                            value={howItWorksDescription}
                            onChange={(e) => setHowItWorksDescription(e.target.value)}
                            placeholder="Discover a seamless process designed to enhance your beauty and health through personalized consultations..."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Arabic Settings */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#1F251A] text-right">المحتوى باللغة العربية</h4>
                        
                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان</label>
                          <input
                            type="text"
                            value={howItWorksHeadingAr}
                            onChange={(e) => setHowItWorksHeadingAr(e.target.value)}
                            placeholder="خطوات بسيطة لتحولات الجمال"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                          />
                        </div>

                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">الوصف</label>
                          <textarea
                            rows={5}
                            value={howItWorksDescriptionAr}
                            onChange={(e) => setHowItWorksDescriptionAr(e.target.value)}
                            placeholder="اكتشف عملية سلسة مصممة لتعزيز جمالك وصحتك..."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed text-right"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[#F2EFE9]">
                      <button
                        disabled={savingPageSettings}
                        onClick={() => savePageSettings()}
                        className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                      >
                        {savingPageSettings ? "Saving..." : "Save All Changes"}
                      </button>
                    </div>
                  </div>

                  {/* Why Choose Us Section */}
                  <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#1F251A]">Why Choose Us Section</h3>
                      <p className="text-sm text-[#5A6A51] mt-1">Configure the images and content for the clinic differentiation section.</p>
                    </div>

                    {/* Photos grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* Photo 1: Left Treatment (Background) */}
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 1: Left Treatment (Background)</label>
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                          {wcuImage1 || "/images/clinic/treatment.jpg" ? (
                            <>
                              <Image
                                src={wcuImage1 || "/images/clinic/treatment.jpg"}
                                alt="Treatment Image"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                              <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1000, 1000, 0.75);
                                  setWcuImage1(compressed);
                                } catch (err) {
                                  console.error("Failed to compress WCU Image 1, using original:", err);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setWcuImage1(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                          <input
                            type="text"
                            value={wcuImage1}
                            onChange={(e) => setWcuImage1(e.target.value)}
                            placeholder="/images/clinic/treatment.jpg"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                      </div>

                      {/* Photo 2: Right Doctor (Foreground Overlay) */}
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 2: Right Doctor (Foreground Overlay)</label>
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                          {wcuImage2 || "/images/clinic/room.jpg" ? (
                            <>
                              <Image
                                src={wcuImage2 || "/images/clinic/room.jpg"}
                                alt="Room Image"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                              <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1000, 1000, 0.75);
                                  setWcuImage2(compressed);
                                } catch (err) {
                                  console.error("Failed to compress WCU Image 2, using original:", err);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setWcuImage2(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
                          <input
                            type="text"
                            value={wcuImage2}
                            onChange={(e) => setWcuImage2(e.target.value)}
                            placeholder="/images/clinic/room.jpg"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* English Settings */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#1F251A]">English Content</h4>
                        
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Heading</label>
                          <input
                            type="text"
                            value={wcuHeading}
                            onChange={(e) => setWcuHeading(e.target.value)}
                            placeholder="Where medical expertise meets a luxury experience"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Experience Vertical Label</label>
                          <input
                            type="text"
                            value={wcuYearsLabel}
                            onChange={(e) => setWcuYearsLabel(e.target.value)}
                            placeholder="15+ years excellence"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Quote</label>
                          <input
                            type="text"
                            value={wcuQuote}
                            onChange={(e) => setWcuQuote(e.target.value)}
                            placeholder="We don't treat conditions — we transform confidence..."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>


                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Description</label>
                          <textarea
                            rows={5}
                            value={wcuDescription}
                            onChange={(e) => setWcuDescription(e.target.value)}
                            placeholder="At Revera, every detail is intentional..."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Arabic Settings */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#1F251A] text-right">المحتوى باللغة العربية</h4>
                        
                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان</label>
                          <input
                            type="text"
                            value={wcuHeadingAr}
                            onChange={(e) => setWcuHeadingAr(e.target.value)}
                            placeholder="حيث تلتقي الخبرة الطبية بتجربة فاخرة"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                          />
                        </div>

                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">عبارة التميز (رأسية)</label>
                          <input
                            type="text"
                            value={wcuYearsLabelAr}
                            onChange={(e) => setWcuYearsLabelAr(e.target.value)}
                            placeholder="١٥+ عاماً من التميز"
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                          />
                        </div>

                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">اقتباس الثقة</label>
                          <input
                            type="text"
                            value={wcuQuoteAr}
                            onChange={(e) => setWcuQuoteAr(e.target.value)}
                            placeholder="نحن لا نعالج فقط — بل نُحوّل الثقة..."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                          />
                        </div>


                        <div className="space-y-2" dir="rtl">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">الوصف</label>
                          <textarea
                            rows={5}
                            value={wcuDescriptionAr}
                            onChange={(e) => setWcuDescriptionAr(e.target.value)}
                            placeholder="في ريفيرا، كل تفصيل مقصود..."
                            className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed text-right"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[#F2EFE9]">
                      <button
                        disabled={savingPageSettings}
                        onClick={() => savePageSettings()}
                        className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                      >
                        {savingPageSettings ? "Saving..." : "Save All Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS VIEWS ── */}
          {activeNav === "Profile" && (() => {
            const isSuperadminBypass = adminEmail?.toLowerCase() === "superadmin@revera.com";
            const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
            
            // Check Egyptian ID check details
            let idCheckPassed = false;
            let birthDate = "";
            let gender = "";
            let governorate = "";
            
            if (profileNatId && profileNatId.length === 14) {
              const parsed = parseEgyptianNationalId(profileNatId) as any;
              if (parsed.isValid) {
                idCheckPassed = true;
                birthDate = parsed.birthDate;
                gender = parsed.gender;
                governorate = parsed.governorate;
              }
            }

            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Personal Profile</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Manage your personal employee profile details and security credentials.</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Left Section: Personal & Account details */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Account Overview Card */}
                    <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.05)] border border-[#414E36]/5 flex flex-col md:flex-row gap-6 items-center">
                      <div className="h-24 w-24 rounded-full bg-[#414E36] text-white flex items-center justify-center font-bold text-3xl shadow-inner uppercase shrink-0">
                        {profileName ? profileName.slice(0, 2) : "EM"}
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                          <h3 className="text-2xl font-bold text-[#1F251A]">{profileName || "Employee Account"}</h3>
                          <span className="rounded-full bg-[#EDE4C8] px-3 py-1 text-xs font-semibold text-[#414E36] border border-[#C4AE7C]/30 capitalize animate-pulse">
                            {isSuperadminBypass ? "superadmin" : profileEmployee?.role_name || "Employee"}
                          </span>
                        </div>
                        <p className="text-sm text-[#5A6A51] flex items-center justify-center md:justify-start gap-1.5">
                          <CircleUser size={14} className="text-[#C4AE7C]" />
                          <span>{adminEmail || "No Email linked"}</span>
                        </p>
                        {!isSuperadminBypass && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 pt-4 border-t border-gray-100 text-xs">
                            <div>
                              <span className="text-[#8A9A81] block font-semibold uppercase tracking-wider text-[9px] mb-0.5">Department</span>
                              <span className="font-semibold text-[#1F251A]">{profileEmployee?.department || "Reception"}</span>
                            </div>
                            <div>
                              <span className="text-[#8A9A81] block font-semibold uppercase tracking-wider text-[9px] mb-0.5">Shift</span>
                              <span className="font-semibold text-[#1F251A]">{profileEmployee?.shift || "Day"}</span>
                            </div>
                            <div>
                              <span className="text-[#8A9A81] block font-semibold uppercase tracking-wider text-[9px] mb-0.5">Salary</span>
                              <span className="font-semibold text-[#1F251A]">{profileEmployee?.salary ? `${Number(profileEmployee.salary).toLocaleString()} EGP` : "—"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Edit Profile Form */}
                    {!isSuperadminBypass && (
                      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.05)] border border-[#414E36]/5">
                        <h4 className="text-lg font-bold text-[#1F251A] mb-4">Edit Personal Information</h4>
                        <form onSubmit={handleSavePersonalProfile} className="space-y-6">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-2">Full Name *</label>
                              <input
                                type="text"
                                required
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-2">Phone Number</label>
                              <input
                                type="text"
                                value={profilePhone}
                                onChange={(e) => setProfilePhone(e.target.value)}
                                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-2">Home Address</label>
                              <input
                                type="text"
                                value={profileAddress}
                                onChange={(e) => setProfileAddress(e.target.value)}
                                className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                              />
                            </div>
                          </div>

                          {profileUpdateError && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
                              {profileUpdateError}
                            </div>
                          )}
                          {profileUpdateSuccess && (
                            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 font-medium">
                              {profileUpdateSuccess}
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={updatingProfile}
                              className="rounded-3xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                            >
                              {updatingProfile ? "Saving..." : "Save Personal Details"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Security & Documents */}
                  <div className="space-y-6">
                    
                    {/* Security Card */}
                    <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.05)] border border-[#414E36]/5">
                      <h4 className="text-lg font-bold text-[#1F251A] mb-4">Security Settings</h4>
                      <p className="text-xs text-[#5A6A51] mb-5">Change your login credentials securely below.</p>
                      <form onSubmit={handleSavePersonalPassword} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-2">New Password</label>
                          <input
                            type="password"
                            required
                            value={profilePassword}
                            onChange={(e) => setProfilePassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36] transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            required
                            value={profileConfirmPassword}
                            onChange={(e) => setProfileConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-xs text-[#1F251A] outline-none focus:border-[#414E36] transition"
                          />
                        </div>

                        {profilePasswordError && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
                            {profilePasswordError}
                          </div>
                        )}
                        {profilePasswordSuccess && (
                          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 font-medium">
                            {profilePasswordSuccess}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={profilePasswordSaving}
                          className="w-full rounded-3xl bg-[#414E36] px-6 py-2.5 text-xs font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                        >
                          {profilePasswordSaving ? "Updating..." : "Update Password"}
                        </button>
                      </form>
                    </div>

                    {/* Verified Documents Card (Only for regular employees, not superadmin bypass) */}
                    {!isSuperadminBypass && (
                      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.05)] border border-[#414E36]/5 space-y-5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="text-[#C4AE7C]" size={20} />
                          <h4 className="text-lg font-bold text-[#1F251A]">Identity Documents</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-2">National ID (14 digits)</label>
                            <input
                              type="text"
                              value={profileNatId}
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 14);
                                setProfileNatId(digitsOnly);
                              }}
                              placeholder="14-digit Egyptian National ID"
                              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-xs font-mono text-[#1F251A] outline-none focus:border-[#414E36] transition"
                            />
                          </div>

                          {idCheckPassed && (
                            <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 space-y-2 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-green-700">
                                <ShieldCheck size={14} />
                                <span>Egyptian ID Check Passed</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[#414E36]">
                                <div>
                                  <span className="opacity-80 block text-[10px]">Birth Date</span>
                                  <span className="font-semibold">{birthDate}</span>
                                </div>
                                <div>
                                  <span className="opacity-80 block text-[10px]">Gender</span>
                                  <span className="font-semibold">{gender}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="opacity-80 block text-[10px]">Governorate</span>
                                  <span className="font-semibold">{governorate}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4 pt-2">
                            <div>
                              <span className="block text-[11px] font-semibold text-[#5A6A51] mb-2">ID Card - Front Side</span>
                              <div className="flex flex-col gap-3">
                                <input
                                  type="file"
                                  id="profile-nat-front"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleProfileImageUpload(e.target.files[0], 'front');
                                  }}
                                />
                                <label
                                  htmlFor="profile-nat-front"
                                  className="cursor-pointer rounded-xl border border-dashed border-[#414E36]/20 bg-[#FBFBF9] hover:bg-[#EDE4C8]/10 px-4 py-2.5 text-center text-xs font-semibold text-[#414E36] transition block"
                                >
                                  Upload Front Photo
                                </label>
                                {profileNatIdFront && (
                                  <div className="relative border border-[#414E36]/10 rounded-xl overflow-hidden bg-gray-50 h-28 flex items-center justify-center">
                                    <img src={profileNatIdFront} alt="ID Front Preview" className="h-full object-contain" />
                                    <button
                                      type="button"
                                      onClick={() => setProfileNatIdFront("")}
                                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition"
                                    >
                                      <Plus size={12} className="rotate-45" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="block text-[11px] font-semibold text-[#5A6A51] mb-2">ID Card - Back Side</span>
                              <div className="flex flex-col gap-3">
                                <input
                                  type="file"
                                  id="profile-nat-back"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleProfileImageUpload(e.target.files[0], 'back');
                                  }}
                                />
                                <label
                                  htmlFor="profile-nat-back"
                                  className="cursor-pointer rounded-xl border border-dashed border-[#414E36]/20 bg-[#FBFBF9] hover:bg-[#EDE4C8]/10 px-4 py-2.5 text-center text-xs font-semibold text-[#414E36] transition block"
                                >
                                  Upload Back Photo
                                </label>
                                {profileNatIdBack && (
                                  <div className="relative border border-[#414E36]/10 rounded-xl overflow-hidden bg-gray-50 h-28 flex items-center justify-center">
                                    <img src={profileNatIdBack} alt="ID Back Preview" className="h-full object-contain" />
                                    <button
                                      type="button"
                                      onClick={() => setProfileNatIdBack("")}
                                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition"
                                    >
                                      <Plus size={12} className="rotate-45" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {activeNav === "Clinic Profile" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Clinic Profile Settings</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Configure the core identity, contact details, and localization of your clinic.</p>
                </div>
                <button
                  form="clinic-profile-form"
                  type="submit"
                  disabled={savingClinicProfile}
                  className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
                >
                  {savingClinicProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl">
                <form id="clinic-profile-form" className="space-y-6" onSubmit={handleSaveClinicProfile}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Clinic Brand Name (EN)</label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2 text-right">اسم العلامة التجارية (AR)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={clinicNameAr}
                        onChange={(e) => setClinicNameAr(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Primary Location (EN)</label>
                      <input
                        type="text"
                        value={clinicLocation}
                        onChange={(e) => setClinicLocation(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2 text-right">الموقع الرئيسي (AR)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={clinicLocationAr}
                        onChange={(e) => setClinicLocationAr(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Inquiries Email</label>
                      <input
                        type="email"
                        value={clinicEmail}
                        onChange={(e) => setClinicEmail(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Inquiries Phone</label>
                      <input
                        type="text"
                        value={clinicPhone}
                        onChange={(e) => setClinicPhone(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">WhatsApp Number</label>
                      <input
                        type="text"
                        value={clinicWhatsapp}
                        onChange={(e) => setClinicWhatsapp(e.target.value)}
                        className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                      />
                      <span className="text-[11px] text-[#8A9A81] mt-1 block">Used for the WhatsApp floating chat button visible on all public pages.</span>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeNav === "Service Hours" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Weekly Service Hours</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Configure operating schedules for Zayed and other active branches.</p>
                  
                  {/* Branch selector select dropdown */}
                  <div className="mt-4 flex items-center gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Active Branch:</label>
                    <select
                      value={selectedBranchForHoursId}
                      onChange={(e) => setSelectedBranchForHoursId(e.target.value)}
                      className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-xs text-[#1F251A] outline-none transition focus:border-[#C4AE7C] font-semibold"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name_en} ({b.name_ar})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleSaveBranchServiceHours()}
                  disabled={savingBranchHours || !selectedBranchForHoursId}
                  className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
                >
                  {savingBranchHours ? "Saving..." : "Save Changes"}
                </button>
              </div>
              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-4">
                {serviceHours.map((sh, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-[#F2EFE9] pb-3 last:border-b-0 last:pb-0">
                    <span className="font-semibold text-[#1F251A] w-28">{sh.day}</span>
                    <div className="flex items-center gap-4 flex-1 justify-end">
                      <label className="flex items-center gap-2 cursor-pointer mr-2">
                        <input
                          type="checkbox"
                          checked={sh.isOpen}
                          onChange={(e) => {
                            const newHours = [...serviceHours];
                            newHours[idx].isOpen = e.target.checked;
                            setServiceHours(newHours);
                          }}
                          className="accent-[#414E36] w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm text-[#5A6A51]">{sh.isOpen ? "Open" : "Closed"}</span>
                      </label>
                      {sh.isOpen && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={sh.openTime}
                            onChange={(e) => {
                              const newHours = [...serviceHours];
                              newHours[idx].openTime = e.target.value;
                              setServiceHours(newHours);
                            }}
                            className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-sm outline-none w-28"
                          />
                          <span className="text-sm text-[#5A6A51]">to</span>
                          <input
                            type="time"
                            value={sh.closeTime}
                            onChange={(e) => {
                              const newHours = [...serviceHours];
                              newHours[idx].closeTime = e.target.value;
                              setServiceHours(newHours);
                            }}
                            className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-sm outline-none w-28"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "Branches" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Branches</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Add, edit, or toggle availability of clinic physical locations.</p>
                </div>
                <button
                  onClick={() => setBranchModal({ open: true, mode: "add", branch: { status: "active", sort_order: branches.length } })}
                  className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                >
                  <Plus size={16} /> Add Branch
                </button>
              </div>

              {loadingBranches ? (
                <div className="text-center py-16 text-[#5A6A51]">Loading branches…</div>
              ) : branches.length === 0 ? (
                <div className="text-center py-16 text-[#5A6A51]">
                  <MapIcon size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No branches yet. Add your first branch.</p>
                </div>
              ) : (
                <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] grid gap-6 md:grid-cols-2">
                  {branches.map((br) => (
                    <div key={br.id} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[180px]">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-[#1F251A] text-base">{br.name_en}</h3>
                          <span className={`shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            br.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                          }`}>{br.status === "active" ? "Active" : "Inactive"}</span>
                        </div>
                        <p className="text-xs text-[#5A6A51] mt-1">{br.name_ar}</p>
                        <p className="text-xs text-[#5A6A51] mt-2 leading-relaxed">{br.address_en}</p>
                        {br.phone && <p className="text-xs text-[#5A6A51] mt-1">{br.phone}</p>}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[#F2EFE9] pt-4 gap-2">
                        <button
                          onClick={async () => {
                            const newStatus = br.status === "active" ? "inactive" : "active";
                            await fetch("/api/branches", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ ...br, status: newStatus }),
                            });
                            setBranches(prev => prev.map(b => b.id === br.id ? { ...b, status: newStatus } : b));
                          }}
                          className="text-xs font-semibold text-[#5A6A51] hover:text-[#414E36] border border-[#E6E9EB] rounded-full px-3 py-1 transition"
                        >
                          {br.status === "active" ? "Set Inactive" : "Set Active"}
                        </button>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setBranchModal({ open: true, mode: "edit", branch: { ...br } })}
                            className="text-xs font-bold text-[#414E36] hover:underline"
                          >Edit</button>
                          <button
                            onClick={async () => {
                              if (!(await showConfirm(`Delete "${br.name_en}"?`))) return;
                              setDeletingBranchId(br.id);
                              await fetch(`/api/branches?id=${br.id}`, { method: "DELETE" });
                              setBranches(prev => prev.filter(b => b.id !== br.id));
                              setDeletingBranchId(null);
                            }}
                            className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50"
                            disabled={deletingBranchId === br.id}
                          >{deletingBranchId === br.id ? "Deleting…" : "Delete"}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Branch Add/Edit Modal */}
              {branchModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-semibold text-[#1F251A]">
                        {branchModal.mode === "add" ? "Add Branch" : "Edit Branch"}
                      </h3>
                      <button onClick={() => setBranchModal({ open: false, mode: "add", branch: {} })} className="p-2 rounded-full hover:bg-[#F2EFE9]">
                        <X size={18} />
                      </button>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSavingBranch(true);
                        try {
                          const res = await fetch("/api/branches", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(branchModal.branch),
                          });
                          const saved = await res.json();
                          if (branchModal.mode === "edit") {
                            setBranches(prev => prev.map(b => b.id === saved.id ? saved : b));
                          } else {
                            setBranches(prev => [...prev, saved]);
                          }
                          setBranchModal({ open: false, mode: "add", branch: {} });
                        } finally {
                          setSavingBranch(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      {([
                        { field: "name_en", label: "Branch Name (English)", placeholder: "e.g. New Cairo Branch", required: true },
                        { field: "name_ar", label: "Branch Name (Arabic)", placeholder: "مثال: فرع القاهرة الجديدة", required: true, dir: "rtl" },
                        { field: "address_en", label: "Address (English)", placeholder: "e.g. 5th Settlement, New Cairo", required: true },
                        { field: "address_ar", label: "Address (Arabic)", placeholder: "مثال: التجمع الخامس، القاهرة الجديدة", required: true, dir: "rtl" },
                        { field: "phone", label: "Phone Number", placeholder: "e.g. +201035595691" },
                        { field: "maps_embed", label: "Google Maps Embed URL", placeholder: "https://www.google.com/maps/embed?pb=…" },
                        { field: "maps_link", label: "Google Maps Link", placeholder: "https://maps.app.goo.gl/…" },
                      ] as Array<{ field: keyof Branch; label: string; placeholder: string; required?: boolean; dir?: string }>).map(({ field, label, placeholder, required, dir }) => (
                        <div key={field}>
                          <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#5A6A51] mb-1.5">{label}</label>
                          <input
                            type="text"
                            required={required}
                            dir={dir}
                            placeholder={placeholder}
                            value={(branchModal.branch[field] as string) ?? ""}
                            onChange={(e) => setBranchModal(prev => ({ ...prev, branch: { ...prev.branch, [field]: e.target.value } }))}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#5A6A51] mb-1.5">Status</label>
                        <select
                          value={branchModal.branch.status ?? "active"}
                          onChange={(e) => setBranchModal(prev => ({ ...prev, branch: { ...prev.branch, status: e.target.value as "active" | "inactive" } }))}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={savingBranch}
                        className="w-full rounded-3xl bg-[#414E36] py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 mt-2"
                      >
                        {savingBranch ? "Saving…" : branchModal.mode === "add" ? "Add Branch" : "Save Changes"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeNav === "Rooms" && (
            <RoomsManagerView
              branches={branches}
              services={localServices}
              selectedBranchId={branch}
            />
          )}
          {activeNav === "Booking Settings" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Booking Settings</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Configure appointment rules, advance booking limits, and slot management.</p>
                </div>
                <button
                  onClick={handleSaveBookingSettings}
                  disabled={savingBookingSettings}
                  className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
                >
                  {savingBookingSettings ? "Saving..." : "Save Booking Settings"}
                </button>
              </div>

              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Min Advance Booking (Hours)</label>
                    <select
                      value={bookingMinAdvance}
                      onChange={(e) => setBookingMinAdvance(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    >
                      {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>{h} {h === 1 ? "Hour" : "Hours"}</option>)}
                    </select>
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Minimum time before appointment that bookings are allowed.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Max Advance Booking (Days)</label>
                    <select
                      value={bookingMaxAdvance}
                      onChange={(e) => setBookingMaxAdvance(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    >
                      {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} Days</option>)}
                    </select>
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">How far in advance patients can schedule.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Cancellation Window (Hours)</label>
                    <select
                      value={bookingCancelWindow}
                      onChange={(e) => setBookingCancelWindow(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    >
                      {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>{h} {h === 1 ? "Hour" : "Hours"} Before</option>)}
                    </select>
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">How early a patient must cancel to avoid a penalty.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Max Bookings Per Slot</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={bookingMaxPerSlot}
                      onChange={(e) => setBookingMaxPerSlot(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    />
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Maximum concurrent appointments per time slot.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Reservation Deposit (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={bookingDepositPercentage}
                      onChange={(e) => setBookingDepositPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    />
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Percentage of service price to secure a booking. Set to 0 to disable.</span>
                  </div>
                </div>

                <div className="border-t border-[#F2EFE9] pt-6 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingInstantApproval}
                      onChange={(e) => setBookingInstantApproval(e.target.checked)}
                      className="accent-[#414E36] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">Instant Approval</span>
                      <span className="text-xs text-[#5A6A51]">Automatically approve bookings without manual admin review.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingShowDoctorNotes}
                      onChange={(e) => setBookingShowDoctorNotes(e.target.checked)}
                      className="accent-[#414E36] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">Show Doctor Notes to Patient</span>
                      <span className="text-xs text-[#5A6A51]">Display post-visit notes from the provider in the patient portal.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Notification Settings" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Notification Settings</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Manage SMS, WhatsApp, email confirmations, and reminder scheduling.</p>
                </div>
                <button
                  onClick={handleSaveNotificationSettings}
                  disabled={savingNotificationSettings}
                  className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
                >
                  {savingNotificationSettings ? "Saving..." : "Save Notification Settings"}
                </button>
              </div>

              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={notifSmsOtp} onChange={(e) => setNotifSmsOtp(e.target.checked)} className="accent-[#414E36] w-4 h-4 cursor-pointer" />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">SMS OTP Verification</span>
                      <span className="text-xs text-[#5A6A51]">Send one-time passwords to patients during login and booking.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={notifWhatsApp} onChange={(e) => setNotifWhatsApp(e.target.checked)} className="accent-[#414E36] w-4 h-4 cursor-pointer" />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">WhatsApp Confirmations</span>
                      <span className="text-xs text-[#5A6A51]">Send appointment confirmations and reminders via WhatsApp.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={notifEmailConfirm} onChange={(e) => setNotifEmailConfirm(e.target.checked)} className="accent-[#414E36] w-4 h-4 cursor-pointer" />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">Email Confirmations</span>
                      <span className="text-xs text-[#5A6A51]">Send email confirmations in addition to SMS (requires SMTP config).</span>
                    </div>
                  </label>
                </div>

                <div className="border-t border-[#F2EFE9] pt-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">SMS Confirmation Template (EN)</label>
                    <textarea
                      value={notifSmsTemplate}
                      onChange={(e) => setNotifSmsTemplate(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition font-mono"
                    />
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Supports variables: <code>{`{name}`}</code>, <code>{`{service}`}</code>, <code>{`{date}`}</code>, <code>{`{time}`}</code>.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2 text-right">قالب رسالة التأكيد النصية (AR)</label>
                    <textarea
                      value={notifSmsTemplateAr}
                      onChange={(e) => setNotifSmsTemplateAr(e.target.value)}
                      rows={3}
                      dir="rtl"
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition font-mono text-right"
                    />
                    <span className="text-[11px] text-[#8A9A81] mt-1 block text-right">يدعم الحقول المتغيرة: <code>{`{name}`}</code>، <code>{`{service}`}</code>، <code>{`{date}`}</code>، <code>{`{time}`}</code>.</span>
                  </div>
                </div>

                <div className="border-t border-[#F2EFE9] pt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Reminder Timing (Hours Before)</label>
                    <select
                      value={notifReminderHours}
                      onChange={(e) => setNotifReminderHours(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition font-semibold"
                    >
                      <option value={2}>2 Hours Before</option>
                      <option value={6}>6 Hours Before</option>
                      <option value={12}>12 Hours Before</option>
                      <option value={24}>24 Hours Before (1 Day)</option>
                      <option value={48}>48 Hours Before (2 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Staff Summary Daily Email</label>
                    <input
                      type="email"
                      value={notifStaffEmail}
                      onChange={(e) => setNotifStaffEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    />
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Sends a daily summary of appointments to this address.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Queue Settings" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Queue &amp; Waiting Room Settings</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Configure lobby display screens, check-in thresholds and session calculations.</p>
                </div>
                <button
                  onClick={handleSaveQueueSettings}
                  disabled={savingQueueSettings}
                  className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
                >
                  {savingQueueSettings ? "Saving..." : "Save Queue Settings"}
                </button>
              </div>

              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={queueVirtualRoom}
                      onChange={(e) => setQueueVirtualRoom(e.target.checked)}
                      className="accent-[#414E36] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">Enable Virtual Waiting Room Tracker</span>
                      <span className="text-xs text-[#5A6A51]">Allows checked-in patients to track live queue position via mobile.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={queueShowOnScreens}
                      onChange={(e) => setQueueShowOnScreens(e.target.checked)}
                      className="accent-[#414E36] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">Display Queue on Lobby TV Screens</span>
                      <span className="text-xs text-[#5A6A51]">Show queue statuses on public dashboard screens inside clinic lobbies.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={queueAutoCheckIn}
                      onChange={(e) => setQueueAutoCheckIn(e.target.checked)}
                      className="accent-[#414E36] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#1F251A] block">Auto Check-In on Arrival</span>
                      <span className="text-xs text-[#5A6A51]">Use geofencing or terminal scan to auto register presence on patient arrival.</span>
                    </div>
                  </label>
                </div>

                <div className="border-t border-[#F2EFE9] pt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Queue Alert SMS Threshold</label>
                    <select
                      value={queueAlertThreshold}
                      onChange={(e) => setQueueAlertThreshold(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    >
                      <option value={1}>1 Patient Ahead</option>
                      <option value={2}>2 Patients Ahead</option>
                      <option value={3}>3 Patients Ahead</option>
                      <option value={4}>4 Patients Ahead</option>
                      <option value={5}>5 Patients Ahead</option>
                    </select>
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Trigger SMS warning alert to patient before their turn.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Average Session Duration (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={queueAvgSessionDuration}
                      onChange={(e) => setQueueAvgSessionDuration(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
                    />
                    <span className="text-[11px] text-[#8A9A81] mt-1 block">Used for calculating estimated waiting room delays.</span>
                  </div>
                </div>
              </div>
            </div>
          )}


          {activeNav === "Manage Areas" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Service Areas</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Configure serving geographic regions or clinic service sectors.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> Add Sector
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Sector ID</th>
                        <th className="px-6 py-4 text-left">Sector Name</th>
                        <th className="px-6 py-4 text-left">Assigned Department</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { id: "SEC-01", name: "Sheikh Zayed & Oct 6th", dept: "Dermatology & Lasers", status: "Active" },
                        { id: "SEC-02", name: "New Cairo & Rehab", dept: "Physiotherapy & Rehab", status: "Active" },
                      ].map((sec) => (
                        <tr key={sec.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{sec.id}</td>
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{sec.name}</td>
                          <td className="px-6 py-5 text-[#5A6A51]">{sec.dept}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">{sec.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Role Management" && adminRole === "superadmin" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Role & Credentials Management</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Define system roles, set view permissions, and provision employee credentials.</p>
              </div>

              {/* Grid for Roles and Employee Accounts */}
              <div className="grid gap-8 lg:grid-cols-1">
                {/* 1. Manage Roles Card */}
                <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                  <h3 className="text-xl font-bold text-[#1F251A] mb-4">Define System Roles</h3>
                  
                  {/* Create Role Form */}
                  <form onSubmit={handleCreateRole} className="mb-6 space-y-4 rounded-3xl border border-[#414E36]/10 bg-white p-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Role Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. receptionist"
                          value={newRoleName}
                          onChange={(e) => {
                            setNewRoleName(e.target.value);
                            if (roleCreateError) setRoleCreateError("");
                          }}
                          className="w-full max-w-md rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-3">Permissions & Access Control</label>
                        <div className="grid gap-4 md:grid-cols-2 max-h-[400px] overflow-y-auto rounded-3xl border border-[#414E36]/10 p-5 bg-[#FBFBF9]">
                          {PERMISSION_STRUCTURE.map((group) => {
                            const allChecked = group.items.every(item => newRolePermissions.includes(item.key));
                            const someChecked = group.items.some(item => newRolePermissions.includes(item.key)) && !allChecked;

                            return (
                              <div key={group.category} className="rounded-2xl border border-[#414E36]/10 bg-white p-4 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between border-b border-[#414E36]/5 pb-2 mb-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-[#1F251A] cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={allChecked}
                                        ref={(el) => {
                                          if (el) el.indeterminate = someChecked;
                                        }}
                                        onChange={(e) => {
                                          const keys = group.items.map(item => item.key);
                                          if (e.target.checked) {
                                            setNewRolePermissions(prev => [...new Set([...prev, ...keys])]);
                                          } else {
                                            setNewRolePermissions(prev => prev.filter(p => !keys.includes(p)));
                                          }
                                        }}
                                        className="h-4 w-4 accent-[#414E36] rounded"
                                      />
                                      {group.category}
                                    </label>
                                    <span className="text-[10px] font-bold text-[#414E36] bg-[#414E36]/5 px-2 py-0.5 rounded-full">
                                      {group.items.filter(item => newRolePermissions.includes(item.key)).length} / {group.items.length}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {group.items.map((item) => (
                                      <label key={item.key} className="flex items-center gap-2.5 text-xs font-semibold text-[#414E36] cursor-pointer select-none hover:text-[#1F251A] transition">
                                        <input
                                          type="checkbox"
                                          checked={newRolePermissions.includes(item.key)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setNewRolePermissions(prev => [...prev, item.key]);
                                            } else {
                                              setNewRolePermissions(prev => prev.filter(p => p !== item.key));
                                            }
                                          }}
                                          className="h-4 w-4 accent-[#414E36] rounded"
                                        />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {roleCreateError && <p className="text-xs text-red-600 font-medium">⚠️ {roleCreateError}</p>}
                    {roleCreateSuccess && <p className="text-xs text-green-700 font-medium">✅ {roleCreateSuccess}</p>}

                    <button
                      type="submit"
                      className="rounded-2xl bg-[#414E36] px-5 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                    >
                      Save Role
                    </button>
                  </form>

                  {/* Roles Table */}
                  <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                          <th className="px-6 py-4 text-left">Role Name</th>
                          <th className="px-6 py-4 text-left">Allowed Modules</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                        {loadingRolesAndEmployees ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-5 text-center text-xs text-gray-400">Loading roles...</td>
                          </tr>
                        ) : rolesList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-5 text-center text-xs text-gray-400">No roles configured.</td>
                          </tr>
                        ) : rolesList.map((r) => (
                          <tr key={r.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-4 font-bold text-[#1F251A] capitalize">{r.name}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-[#5A6A51]">
                              <div className="flex flex-wrap gap-1.5">
                                {r.permissions.map((p: string) => (
                                  <span key={p} className="rounded-full bg-[#EDF1EC] px-2.5 py-0.5 text-[#414E36] border border-[#414E36]/10">{p}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {r.name !== 'superadmin' ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(r.name)}
                                  className="text-red-600 hover:text-red-800 transition"
                                  title="Delete Role"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : <span className="text-xs text-gray-400 font-semibold italic">System Locked</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Manage Employees / Credentials Provisioning */}
                <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                  <h3 className="text-xl font-bold text-[#1F251A] mb-4">Provision Employee Credentials</h3>
                  
                  {/* Create Employee Form — OAuth Invite Flow */}
                  <form onSubmit={handleCreateEmployee} className="mb-6 space-y-4 rounded-3xl border border-[#414E36]/10 bg-white p-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sara El Gamel"
                          value={newEmployeeName}
                          onChange={(e) => {
                            setNewEmployeeName(e.target.value);
                            if (employeeCreateError) setEmployeeCreateError("");
                          }}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Work Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. sara@gmail.com"
                          value={newEmployeeEmail}
                          onChange={(e) => {
                            setNewEmployeeEmail(e.target.value);
                            if (employeeCreateError) setEmployeeCreateError("");
                          }}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Assign Role</label>
                        <select
                          required
                          value={newEmployeeRole}
                          onChange={(e) => {
                            setNewEmployeeRole(e.target.value);
                            if (employeeCreateError) setEmployeeCreateError("");
                          }}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                        >
                          <option value="">Select Role...</option>
                          {rolesList.map(r => (
                            <option key={r.id} value={r.name} className="capitalize">{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Invite info banner */}
                    <div className="flex items-start gap-2.5 rounded-2xl bg-[#EDF5E8] border border-[#414E36]/15 px-4 py-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0 text-[#414E36]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <p className="text-xs text-[#414E36] font-medium leading-relaxed">
                        An official <strong>invitation email</strong> will be sent to the employee&apos;s address. They will set their own password via the link — no password is stored by the admin.
                      </p>
                    </div>

                    {employeeCreateError && <p className="text-xs text-red-600 font-medium">⚠️ {employeeCreateError}</p>}
                    {employeeCreateSuccess && <p className="text-xs text-green-700 font-medium">✅ {employeeCreateSuccess}</p>}

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      Send Invitation
                    </button>
                  </form>

                  {/* Employees Table */}
                  <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                          <th className="px-6 py-4 text-left">Full Name</th>
                          <th className="px-6 py-4 text-left">Assigned Role</th>
                          <th className="px-6 py-4 text-left">Login Email</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>

                      </thead>
                      <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                        {loadingRolesAndEmployees ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-5 text-center text-xs text-gray-400">Loading accounts...</td>
                          </tr>
                        ) : employeesList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-5 text-center text-xs text-gray-400">No employee accounts provisioned yet. Use the form above to send an invitation.</td>
                          </tr>
                        ) : employeesList.map((emp) => (
                          <tr key={emp.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-4 font-semibold text-[#1F251A]">{emp.name || emp.employee_id || '—'}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-[#414E36]">
                              {adminRole === "superadmin" && emp.employee_id !== "superadmin" ? (
                                <select
                                  value={emp.role_name}
                                  onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                                  className="rounded-lg border border-[#E6E9EB] bg-[#FBFBF9] px-2 py-1 text-xs font-semibold text-[#414E36] focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] outline-none"
                                >
                                  {rolesList.map((r) => (
                                    <option key={r.id} value={r.name}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="capitalize">{emp.role_name}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-[#5A6A51]">{emp.email}</td>
                            <td className="px-6 py-4 text-center">
                              {emp.email_confirmed_at ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">✓ Active</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">⏳ Invite Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {emp.employee_id !== 'superadmin' ? (
                                <div className="flex items-center justify-center gap-2">
                                  {!emp.email_confirmed_at && (
                                    <button
                                      type="button"
                                      onClick={() => handleResendInvitation(emp.id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                                      title="Resend Invitation Email"
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9z"/></svg>
                                      Resend
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEmployee(emp.id)}
                                    className="text-red-600 hover:text-red-800 transition"
                                    title="Revoke Access"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ) : <span className="text-xs text-gray-400 font-semibold italic">System Owner</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== EMPLOYEES SECTION ===================== */}
          {activeNav === "Employees" && adminRole === "superadmin" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Staff &amp; Employees</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Manage all staff accounts, departments, shifts, salaries, and system roles.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployee(null);
                    setNewEmployeeName("");
                    setNewEmployeeEmail("");
                    setNewEmployeeRole("");
                    setNewEmployeePhone("");
                    setNewEmployeeDepartment("Reception");
                    setNewEmployeeShift("Day");
                    setNewEmployeeSalary("0");
                    setNewEmployeeNationalId("");
                    setNewEmployeeNationalIdFront("");
                    setNewEmployeeNationalIdBack("");
                    setNewEmployeeAddress("");
                    setNewEmployeeBranchId("");
                    setNewEmployeeContract("");
                    setNewEmployeeContractName("");
                    setIsEditingEmployeeModalOpen(true);
                  }}
                  className="rounded-2xl bg-[#414E36] px-5 py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-2 shadow-md shrink-0"
                >
                  <Plus size={16} />
                  Add Employee
                </button>
              </div>

              {/* Filters & Search */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-white p-5 rounded-3xl border border-[#414E36]/10 shadow-sm">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Search size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, phone, email..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] pl-10 pr-4 py-2.5 text-xs font-semibold text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <select
                  value={employeeFilterDepartment}
                  onChange={(e) => setEmployeeFilterDepartment(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  <option value="Medical">Medical</option>
                  <option value="Reception">Reception</option>
                  <option value="Nursing">Nursing</option>
                  <option value="Administration">Administration</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={employeeFilterShift}
                  onChange={(e) => setEmployeeFilterShift(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-xs font-semibold text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="All">All Shifts</option>
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
                <div className="flex items-center justify-end text-xs font-semibold text-[#5A6A51] px-2">
                  {loadingRolesAndEmployees ? "Loading..." : `${employeesList.length} Total Employees`}
                </div>
              </div>

              {/* Table */}
              <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Employee Info</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">Shift</th>
                        <th className="px-6 py-4">Salary</th>

                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#414E36]/5">
                      {loadingRolesAndEmployees ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                            Loading employees...
                          </td>
                        </tr>
                      ) : (() => {
                        const filtered = employeesList.filter((emp: any) => {
                          if (employeeFilterDepartment !== "All" && emp.department !== employeeFilterDepartment) return false;
                          if (employeeFilterShift !== "All" && emp.shift !== employeeFilterShift) return false;
                          if (employeeSearchQuery.trim()) {
                            const q = employeeSearchQuery.toLowerCase();
                            if (
                              !emp.name?.toLowerCase().includes(q) &&
                              !emp.email?.toLowerCase().includes(q) &&
                              !emp.phone?.toLowerCase().includes(q) &&
                              !emp.employee_id?.toLowerCase().includes(q)
                            ) return false;
                          }
                          return true;
                        });
                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                                No employees match your filters.
                              </td>
                            </tr>
                          );
                        }
                        return filtered.map((emp: any) => {
                          const isSuperadmin = emp.employee_id === "superadmin";
                          const shortId = emp.employee_id?.includes("@")
                            ? emp.employee_id.split("@")[0]
                            : emp.id?.slice(0, 8);
                          return (
                            <tr key={emp.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-mono font-bold text-[#5A6A51]">{shortId}</td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-[#1F251A] text-sm">{emp.name || <span className="italic text-gray-400">No name</span>}</div>
                                <div className="text-xs text-[#5A6A51]">{emp.email}</div>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">{emp.phone || "—"}</td>
                              <td className="px-6 py-4">
                                <span className="inline-block rounded-xl bg-[#C4AE7C]/15 px-3 py-1 text-xs font-semibold text-[#8B7544]">
                                  {emp.department || "Reception"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-semibold text-[#414E36]">
                                  {branches.find(b => b.id === emp.branch_id)?.name_en || "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold ${emp.shift === "Night" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
                                  {emp.shift || "Day"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-[#1F251A]">
                                {Number(emp.salary || 0).toLocaleString()} EGP
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${emp.email_confirmed_at ? "bg-green-50 text-green-700 border-green-200/50" : "bg-amber-50 text-amber-700 border-amber-200/50"}`}>
                                  {emp.email_confirmed_at ? "Active" : "Invited"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setViewingEmployee(emp)}
                                    className="text-[#5A6A51] hover:text-[#414E36] transition"
                                    title="View Info"
                                  >
                                    <Info size={16} />
                                  </button>
                                  {!isSuperadmin && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingEmployee(emp);
                                          setNewEmployeeName(emp.name || "");
                                          setNewEmployeeEmail(emp.email || "");
                                          setNewEmployeeRole(emp.role_name || "");
                                          setNewEmployeePhone(emp.phone || "");
                                          setNewEmployeeDepartment(emp.department || "Reception");
                                          setNewEmployeeShift(emp.shift || "Day");
                                          setNewEmployeeSalary(String(emp.salary || 0));
                                          setNewEmployeeNationalId(emp.national_id || "");
                                          setNewEmployeeNationalIdFront(emp.national_id_front || "");
                                          setNewEmployeeNationalIdBack(emp.national_id_back || "");
                                          setNewEmployeeAddress(emp.address || "");
                                          setNewEmployeeBranchId(emp.branch_id || "");
                                          setNewEmployeeContract(emp.contract_file || "");
                                          setNewEmployeeContractName(emp.contract_file_name || "");
                                          setIsEditingEmployeeModalOpen(true);
                                        }}
                                        className="text-[#C4AE7C] hover:text-[#a38f61] transition"
                                        title="Edit Employee"
                                      >
                                        <Pencil size={15} />
                                      </button>
                                      {!emp.email_confirmed_at && (
                                        <button
                                          type="button"
                                          onClick={() => handleResendInvitation(emp.id)}
                                          className="text-xs font-semibold text-amber-600 hover:underline transition"
                                          title="Resend invitation email"
                                        >
                                          Resend
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEmployee(emp.id)}
                                        className="text-red-500 hover:text-red-700 transition"
                                        title="Revoke access"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add / Edit Employee Modal */}
              {isEditingEmployeeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-lg rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.15)] border border-[#414E36]/10 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setIsEditingEmployeeModalOpen(false)}
                      className="absolute right-6 top-6 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-bold text-lg"
                    >
                      &times;
                    </button>
                    <h3 className="text-2xl font-bold text-[#1F251A] mb-1">
                      {editingEmployee ? "Edit Employee" : "Add New Employee"}
                    </h3>
                    <p className="text-xs text-[#5A6A51] mb-6">
                      {editingEmployee
                        ? "Update shift, department, salary, and role details."
                        : "Fill in the details below to invite a new staff member."}
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newEmployeeName.trim() || !newEmployeeRole) {
                          alert("Name and System Role are required.");
                          return;
                        }
                        try {
                          if (editingEmployee) {
                            const res = await fetch("/api/employees", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: editingEmployee.id,
                                name: newEmployeeName.trim(),
                                roleName: newEmployeeRole,
                                phone: newEmployeePhone.trim(),
                                department: newEmployeeDepartment,
                                shift: newEmployeeShift,
                                salary: Number(newEmployeeSalary),
                                nationalId: newEmployeeNationalId.trim() || null,
                                nationalIdFront: newEmployeeNationalIdFront || null,
                                nationalIdBack: newEmployeeNationalIdBack || null,
                                address: newEmployeeAddress.trim() || null,
                                branchId: newEmployeeBranchId || null,
                                contractFile: newEmployeeContract || null,
                                contractFileName: newEmployeeContractName || null,
                              }),
                            });
                            if (res.ok) {
                              setIsEditingEmployeeModalOpen(false);
                              clearFetchCache();
                              fetchRolesAndEmployees();
                            } else {
                              const d = await res.json();
                              alert(d.error || "Failed to update employee.");
                            }
                          } else {
                            if (!newEmployeeEmail.trim()) {
                              alert("Email is required.");
                              return;
                            }
                            const res = await fetch("/api/employees", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: newEmployeeEmail.trim().toLowerCase(),
                                name: newEmployeeName.trim(),
                                roleName: newEmployeeRole,
                                phone: newEmployeePhone.trim(),
                                department: newEmployeeDepartment,
                                shift: newEmployeeShift,
                                salary: Number(newEmployeeSalary),
                                nationalId: newEmployeeNationalId.trim() || null,
                                nationalIdFront: newEmployeeNationalIdFront || null,
                                nationalIdBack: newEmployeeNationalIdBack || null,
                                address: newEmployeeAddress.trim() || null,
                                branchId: newEmployeeBranchId || null,
                                contractFile: newEmployeeContract || null,
                                contractFileName: newEmployeeContractName || null,
                              }),
                            });
                            if (res.ok) {
                              setIsEditingEmployeeModalOpen(false);
                              clearFetchCache();
                              fetchRolesAndEmployees();
                            } else {
                              const d = await res.json();
                              alert(d.error || "Failed to invite employee.");
                            }
                          }
                        } catch (err: any) {
                          alert(err.message || "An error occurred.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Mohamed Ali"
                            value={newEmployeeName}
                            onChange={(e) => setNewEmployeeName(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Email Address {editingEmployee ? "" : "*"}</label>
                          <input
                            type="email"
                            required={!editingEmployee}
                            disabled={!!editingEmployee}
                            placeholder="staff@revera.com"
                            value={newEmployeeEmail}
                            onChange={(e) => setNewEmployeeEmail(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Phone Number</label>
                          <input
                            type="text"
                            placeholder="01012345678"
                            value={newEmployeePhone}
                            onChange={(e) => setNewEmployeePhone(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">System Role *</label>
                          <select
                            required
                            value={newEmployeeRole}
                            onChange={(e) => setNewEmployeeRole(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                          >
                            <option value="" disabled>Select Role</option>
                            {rolesList.map((role: any) => (
                              <option key={role.name} value={role.name}>{role.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Assigned Branch *</label>
                          <select
                            required
                            value={newEmployeeBranchId}
                            onChange={(e) => setNewEmployeeBranchId(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                          >
                            <option value="" disabled>Select Branch</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name_en}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Department</label>
                          <select
                            value={newEmployeeDepartment}
                            onChange={(e) => setNewEmployeeDepartment(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                          >
                            <option value="Medical">Medical</option>
                            <option value="Reception">Reception</option>
                            <option value="Nursing">Nursing</option>
                            <option value="Administration">Administration</option>
                            <option value="Finance">Finance</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Shift</label>
                          <select
                            value={newEmployeeShift}
                            onChange={(e) => setNewEmployeeShift(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none focus:border-[#C4AE7C] cursor-pointer"
                          >
                            <option value="Day">Day</option>
                            <option value="Night">Night</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Salary (EGP)</label>
                          <input
                            type="number"
                            min="0"
                            value={newEmployeeSalary}
                            onChange={(e) => setNewEmployeeSalary(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                          />
                        </div>
                      </div>

                      {/* --- NEW EMPLOYEE PROFILE FIELDS (National ID, Photo Uploads, Address) --- */}
                      <div className="border-t border-[#414E36]/10 pt-4 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">National ID (14 Digits)</label>
                            <input
                              type="text"
                              maxLength={14}
                              placeholder="e.g. 29503152101234"
                              value={newEmployeeNationalId}
                              onChange={(e) => {
                                // only numbers
                                const val = e.target.value.replace(/\D/g, "");
                                setNewEmployeeNationalId(val);
                              }}
                              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">Home Address</label>
                            <input
                              type="text"
                              placeholder="e.g. 15 El-Ghad St, Pyramids, Giza"
                              value={newEmployeeAddress}
                              onChange={(e) => setNewEmployeeAddress(e.target.value)}
                              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                            />
                          </div>
                        </div>

                        {/* Interactive Egyptian National ID Check */}
                        {newEmployeeNationalId.trim() && (() => {
                          const check = parseEgyptianNationalId(newEmployeeNationalId.trim());
                          if (check.isValid) {
                            return (
                              <div className="rounded-2xl bg-green-50/50 border border-green-200/50 p-3.5 space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-green-800">
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">✓</span>
                                  Egyptian National ID Check Passed
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-green-700 font-medium">
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Birth Date</span>
                                    {check.birthDate}
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Gender</span>
                                    {check.gender}
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Governorate</span>
                                    {check.governorate}
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="rounded-2xl bg-amber-50/50 border border-amber-200/50 p-3.5 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">!</span>
                                ID Check: {check.reason}
                              </div>
                            );
                          }
                        })()}

                        {/* Front / Back ID Photo Uploads */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* ID Front */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">National ID - Front Side</label>
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#414E36]/20 bg-[#FBFBF9] p-4 text-center">
                              {newEmployeeNationalIdFront ? (
                                <div className="relative w-full group">
                                  <img
                                    src={newEmployeeNationalIdFront}
                                    alt="ID Front"
                                    className="h-28 w-full object-cover rounded-xl border border-[#414E36]/10"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setNewEmployeeNationalIdFront("")}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 transition rounded-full h-6 w-6 flex items-center justify-center shadow font-bold text-xs"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer py-4 w-full">
                                  <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                                  <span className="text-[11px] font-semibold text-[#414E36]">Upload Front Side</span>
                                  <span className="text-[9px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const compressed = await compressImage(file, 1200, 1200, 0.8);
                                          setNewEmployeeNationalIdFront(compressed);
                                        } catch (err) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setNewEmployeeNationalIdFront(reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>

                          {/* ID Back */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-1.5">National ID - Back Side</label>
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#414E36]/20 bg-[#FBFBF9] p-4 text-center">
                              {newEmployeeNationalIdBack ? (
                                <div className="relative w-full group">
                                  <img
                                    src={newEmployeeNationalIdBack}
                                    alt="ID Back"
                                    className="h-28 w-full object-cover rounded-xl border border-[#414E36]/10"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setNewEmployeeNationalIdBack("")}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 transition rounded-full h-6 w-6 flex items-center justify-center shadow font-bold text-xs"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer py-4 w-full">
                                  <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                                  <span className="text-[11px] font-semibold text-[#414E36]">Upload Back Side</span>
                                  <span className="text-[9px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const compressed = await compressImage(file, 1200, 1200, 0.8);
                                          setNewEmployeeNationalIdBack(compressed);
                                        } catch (err) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setNewEmployeeNationalIdBack(reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Employment Contract Upload */}
                      <div className="border border-[#414E36]/10 rounded-2xl bg-[#F7F7F5] p-4">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2">Employment Contract</label>
                        <div className="rounded-2xl border border-dashed border-[#414E36]/20 bg-white overflow-hidden">
                          {newEmployeeContract ? (
                            <div className="flex items-center justify-between gap-2 p-3 bg-[#EDF1EC] rounded-2xl">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-5 w-5 text-[#5A6A51] shrink-0" />
                                <span className="text-xs font-semibold text-[#414E36] truncate">{newEmployeeContractName || "Contract File"}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setNewEmployeeContract(""); setNewEmployeeContractName(""); }}
                                className="bg-red-500 text-white hover:bg-red-600 transition rounded-full h-5 w-5 shrink-0 flex items-center justify-center font-bold text-xs"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center cursor-pointer py-5 w-full">
                              <Upload className="h-6 w-6 text-[#5A6A51]/50 mb-1.5" />
                              <span className="text-[11px] font-semibold text-[#414E36]">Upload Contract (PDF, Word, or Image)</span>
                              <span className="text-[9px] text-gray-400 mt-0.5">PDF, DOCX, PNG, JPEG – up to 10MB</span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setNewEmployeeContract(reader.result as string);
                                      setNewEmployeeContractName(file.name);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingEmployeeModalOpen(false)}
                          className="rounded-2xl border border-[#414E36]/15 px-5 py-2.5 text-sm font-semibold text-[#414E36] hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-2xl bg-[#414E36] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2e3a26] transition shadow-md"
                        >
                          {editingEmployee ? "Save Changes" : "Send Invitation"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* View Employee Details — Slide-Over Drawer */}
              {viewingEmployee && (
                <div
                  className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300"
                  onClick={() => setViewingEmployee(null)}
                >
                  <div
                    className="w-full max-w-2xl bg-[#FBFBF9] h-full shadow-2xl flex flex-col animate-slideOver overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10 text-lg font-bold">
                          {viewingEmployee.name ? viewingEmployee.name.charAt(0).toUpperCase() : "E"}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#1F251A]">{viewingEmployee.name || "No name"}</h3>
                          <p className="text-xs text-[#5A6A51]">Employee Profile &amp; Staff Details</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingEmployee(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36]"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                      {/* Profile Details Card */}
                      <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-[#C4AE7C]">Staff Profile</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEmployee(viewingEmployee);
                              setNewEmployeeName(viewingEmployee.name || "");
                              setNewEmployeeEmail(viewingEmployee.email || "");
                              setNewEmployeeRole(viewingEmployee.role_name || "");
                              setNewEmployeePhone(viewingEmployee.phone || "");
                              setNewEmployeeDepartment(viewingEmployee.department || "Reception");
                              setNewEmployeeShift(viewingEmployee.shift || "Day");
                              setNewEmployeeSalary(String(viewingEmployee.salary || 0));
                              setNewEmployeeNationalId(viewingEmployee.national_id || "");
                              setNewEmployeeNationalIdFront(viewingEmployee.national_id_front || "");
                              setNewEmployeeNationalIdBack(viewingEmployee.national_id_back || "");
                              setNewEmployeeAddress(viewingEmployee.address || "");
                              setNewEmployeeContract(viewingEmployee.contract_file || "");
                              setNewEmployeeContractName(viewingEmployee.contract_file_name || "");
                              setViewingEmployee(null);
                              setIsEditingEmployeeModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#414E36]/15 bg-[#EDF1EC]/40 px-3 py-1.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]"
                          >
                            <Pencil size={12} /> Edit Profile
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Employee ID</span>
                            <span className="font-semibold text-[#1F251A] font-mono text-xs">{viewingEmployee.employee_id || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Email Address</span>
                            <span className="font-semibold text-[#1F251A] break-all">{viewingEmployee.email || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Phone Number</span>
                            <span className="font-semibold text-[#1F251A]">{viewingEmployee.phone || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">System Role</span>
                            <span className="inline-block rounded-xl bg-[#414E36]/10 px-3 py-1 text-xs font-semibold text-[#414E36]">
                              {viewingEmployee.role_name || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Department</span>
                            <span className="inline-block rounded-xl bg-[#C4AE7C]/15 px-3 py-1 text-xs font-semibold text-[#8B7544]">
                              {viewingEmployee.department || "Reception"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Shift</span>
                            <span className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold ${viewingEmployee.shift === "Night" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
                              {viewingEmployee.shift || "Day"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Monthly Salary</span>
                            <span className="font-bold text-[#1F251A]">{Number(viewingEmployee.salary || 0).toLocaleString()} EGP</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Account Status</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${viewingEmployee.email_confirmed_at ? "text-green-700" : "text-amber-700"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${viewingEmployee.email_confirmed_at ? "bg-green-600" : "bg-amber-500"}`} />
                              {viewingEmployee.email_confirmed_at ? "Active" : "Pending Invitation"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">National ID</span>
                            <span className="font-semibold text-[#1F251A] font-mono text-xs">{viewingEmployee.national_id || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Added On</span>
                            <span className="font-semibold text-[#1F251A]">
                              {viewingEmployee.created_at
                                ? new Date(viewingEmployee.created_at).toLocaleDateString("en-US", { dateStyle: "long" })
                                : "—"}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Home Address</span>
                            <span className="font-semibold text-[#1F251A] block bg-[#F9F9F7] px-3 py-2 rounded-lg border border-[#414E36]/5">
                              {viewingEmployee.address || "—"}
                            </span>
                          </div>

                          {/* ID Check Info Card */}
                          {viewingEmployee.national_id && (() => {
                            const check = parseEgyptianNationalId(viewingEmployee.national_id);
                            if (check.isValid) {
                              return (
                                <div className="col-span-2 rounded-xl bg-green-50/50 border border-green-200/50 p-4 space-y-2 text-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-green-800">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">✓</span>
                                    Verified Egyptian National ID Check
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 text-green-700 font-medium">
                                    <div>
                                      <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Birth Date</span>
                                      {check.birthDate}
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Gender</span>
                                      {check.gender}
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase tracking-wider text-green-600/75">Governorate</span>
                                      {check.governorate}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Front / Back ID Photo Previews */}
                          {(viewingEmployee.national_id_front || viewingEmployee.national_id_back) && (
                            <div className="col-span-2 space-y-2 border-t border-[#414E36]/10 pt-3">
                              <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider">ID Document Photos</span>
                              <div className="grid grid-cols-2 gap-4">
                                {viewingEmployee.national_id_front && (
                                  <div className="space-y-1">
                                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider text-center">Front Side</span>
                                    <a
                                      href={viewingEmployee.national_id_front}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block relative rounded-xl overflow-hidden border border-[#414E36]/15 hover:opacity-90 transition group cursor-zoom-in"
                                      title="Click to view full size"
                                    >
                                      <img
                                        src={viewingEmployee.national_id_front}
                                        alt="ID Front"
                                        className="h-28 w-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                                        View Full Size
                                      </div>
                                    </a>
                                  </div>
                                )}
                                {viewingEmployee.national_id_back && (
                                  <div className="space-y-1">
                                    <span className="block text-[10px] font-bold text-[#5A6A51] uppercase tracking-wider text-center">Back Side</span>
                                    <a
                                      href={viewingEmployee.national_id_back}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block relative rounded-xl overflow-hidden border border-[#414E36]/15 hover:opacity-90 transition group cursor-zoom-in"
                                      title="Click to view full size"
                                    >
                                      <img
                                        src={viewingEmployee.national_id_back}
                                        alt="ID Back"
                                        className="h-28 w-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                                        View Full Size
                                      </div>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Employment Contract */}
                          {viewingEmployee.contract_file && (
                            <div className="mt-4 pt-4 border-t border-[#414E36]/10">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2">Employment Contract</p>
                              <a
                                href={viewingEmployee.contract_file}
                                download={viewingEmployee.contract_file_name || "contract"}
                                className="inline-flex items-center gap-2 rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC] px-4 py-2.5 text-xs font-semibold text-[#414E36] hover:bg-[#d9e0d3] transition"
                              >
                                <FileText className="h-4 w-4 text-[#5A6A51]" />
                                {viewingEmployee.contract_file_name || "Download Contract"}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions Card */}
                      <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#C4AE7C] border-b border-[#414E36]/10 pb-3">Quick Actions</h4>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEmployee(viewingEmployee);
                              setNewEmployeeName(viewingEmployee.name || "");
                              setNewEmployeeEmail(viewingEmployee.email || "");
                              setNewEmployeeRole(viewingEmployee.role_name || "");
                              setNewEmployeePhone(viewingEmployee.phone || "");
                              setNewEmployeeDepartment(viewingEmployee.department || "Reception");
                              setNewEmployeeShift(viewingEmployee.shift || "Day");
                              setNewEmployeeSalary(String(viewingEmployee.salary || 0));
                              setNewEmployeeNationalId(viewingEmployee.national_id || "");
                              setNewEmployeeNationalIdFront(viewingEmployee.national_id_front || "");
                              setNewEmployeeNationalIdBack(viewingEmployee.national_id_back || "");
                              setNewEmployeeAddress(viewingEmployee.address || "");
                              setNewEmployeeContract(viewingEmployee.contract_file || "");
                              setNewEmployeeContractName(viewingEmployee.contract_file_name || "");
                              setViewingEmployee(null);
                              setIsEditingEmployeeModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#414E36]/15 bg-[#EDF1EC] px-4 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#d9e0d3] transition"
                          >
                            <Pencil size={13} /> Edit Employee
                          </button>
                          {!viewingEmployee.email_confirmed_at && (
                            <button
                              type="button"
                              onClick={() => {
                                handleResendInvitation(viewingEmployee.id);
                                setViewingEmployee(null);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                            >
                              Resend Invitation
                            </button>
                          )}
                          {viewingEmployee.employee_id !== "superadmin" && (
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteEmployee(viewingEmployee.id);
                                setViewingEmployee(null);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                            >
                              <Trash2 size={13} /> Revoke Access
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ============================================================= */}

          {activeNav === "SMS Configuration" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">SMS Provider Setup</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Configure your automated messaging API gateway endpoints.</p>
              </div>
              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-xl">
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">SMS API Gateway Provider</label>
                    <select className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none">
                      <option>Twilio SMS Service</option>
                      <option>Infobip SMS Platform</option>
                      <option>Vodafone Egypt Business Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Registered Sender ID</label>
                    <input type="text" defaultValue="REVERACLIN" className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">API Secret Credentials Key</label>
                    <input type="password" defaultValue="••••••••••••••••••••" className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none" />
                  </div>
                  <button type="submit" className="w-full rounded-3xl bg-[#414E36] py-3.5 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    Apply API Settings
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeNav === "Medical Forms" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Medical Form Templates</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Configure intake checklists, questionnaires, and treatment consent forms.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> New Template
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] grid gap-6 md:grid-cols-2">
                {[
                  { title: "General Patient Intake Form", desc: "Patient registration details, medical background checkin, allergy list." },
                  { title: "Laser Treatment Consent Form", desc: "Informed consent detailing potential risks, side effects, and pre/post care instructions." },
                  { title: "Physiotherapy Intake Assessment", desc: "Diagnostic checklist assessing physical pain logs, injuries, and target treatment goals." },
                ].map((form, idx) => (
                  <div key={idx} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div>
                      <h3 className="font-bold text-[#1F251A]">{form.title}</h3>
                      <p className="text-xs text-[#5A6A51] mt-2 leading-relaxed">{form.desc}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-end border-t border-[#F2EFE9] pt-4 gap-3">
                      <button className="text-xs font-bold text-[#5A6A51] hover:underline">Edit Form</button>
                      <button className="text-xs font-bold text-[#C4AE7C] hover:underline">Preview</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── EXPENSE CATEGORIES VIEW ── */}
          {activeNav === "Expense Categories" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Expense Categories</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Manage and allocate budgets across different clinic expense categories.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:border-[#414E36]/30">
                    <Filter size={16} /> Filter
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    <Plus size={16} /> Add Category
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Categories</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-[#1F251A]">{MOCK_EXPENSE_CATEGORIES.length}</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <Layers size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Allocated Budget</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 800,000</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <DollarSign size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Spent This Month</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 702,600</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <DollarSign size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Remaining Budget</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-green-600">EGP 97,400</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                      <DollarSign size={18} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter and Table */}
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={expenseCategorySearch}
                      onChange={(e) => setExpenseCategorySearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Category ID</th>
                        <th className="px-6 py-4 text-left">Category Name</th>
                        <th className="px-6 py-4 text-left">Description</th>
                        <th className="px-6 py-4 text-right">Budget</th>
                        <th className="px-6 py-4 text-right">Spent</th>
                        <th className="px-6 py-4 text-right">Remaining</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {MOCK_EXPENSE_CATEGORIES.filter(c => 
                        c.name.toLowerCase().includes(expenseCategorySearch.toLowerCase()) ||
                        c.description.toLowerCase().includes(expenseCategorySearch.toLowerCase())
                      ).map((cat) => {
                        const isOver = cat.status === "Over Budget";
                        const isNear = cat.status === "Near Limit";
                        return (
                          <tr key={cat.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{cat.id}</td>
                            <td className="px-6 py-5 font-semibold text-[#1F251A]">{cat.name}</td>
                            <td className="px-6 py-5 text-xs text-[#5A6A51] max-w-[250px] truncate" title={cat.description}>{cat.description}</td>
                            <td className="px-6 py-5 text-right font-medium">{cat.budget}</td>
                            <td className="px-6 py-5 text-right font-medium text-[#414E36]">{cat.spent}</td>
                            <td className={`px-6 py-5 text-right font-semibold ${isOver ? "text-red-600" : "text-green-600"}`}>{cat.remaining}</td>
                            <td className="px-6 py-5 text-center">
                              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                isOver ? "bg-red-50 text-red-700" : isNear ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                              }`}>
                                {cat.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS VIEW ── */}
          {activeNav === "Transactions" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Transactions Log</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Track all inbound revenues and outbound expenditures.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:border-[#414E36]/30">
                    <Download size={16} /> Export CSV
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    <Plus size={16} /> Add Transaction
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Transactions</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-[#1F251A]">{MOCK_FINANCE_TRANSACTIONS.length}</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <Receipt size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Inflow (+)</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-green-600">+EGP 5,520</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Outflow (-)</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-red-600">-EGP 180,200</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <TrendingUp size={18} className="rotate-180" />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Net Flow</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-red-600">-EGP 174,680</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <DollarSign size={18} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Transaction ID</th>
                        <th className="px-6 py-4 text-left">Description</th>
                        <th className="px-6 py-4 text-left">Category</th>
                        <th className="px-6 py-4 text-center">Type</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-left">Date</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {MOCK_FINANCE_TRANSACTIONS.filter(t => 
                        t.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                        t.category.toLowerCase().includes(transactionSearch.toLowerCase())
                      ).map((tx) => {
                        const isCredit = tx.type === "Credit";
                        return (
                          <tr key={tx.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{tx.id}</td>
                            <td className="px-6 py-5 font-semibold text-[#1F251A]">{tx.description}</td>
                            <td className="px-6 py-5 text-[#5A6A51]">{tx.category}</td>
                            <td className="px-6 py-5 text-center">
                              <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                                isCredit ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className={`px-6 py-5 text-right font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                              {isCredit ? "+" : "-"}{tx.amount}
                            </td>
                            <td className="px-6 py-5 text-[#5A6A51]">{tx.date}</td>
                            <td className="px-6 py-5 text-center">
                              <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── EXPENSES VIEW ── */}
          {activeNav === "Expenses" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Clinic Expenses</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Track and review operational and procurement expenditures.
                  </p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> Add Expense
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Expenses</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 188,700</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <DollarSign size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">This Month (June)</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 188,700</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <CalendarDays size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Approved Items</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-[#1F251A]">5</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Pending Approval</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-[#5A6A51]">0</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                      <Info size={18} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search expenses by payee or category..."
                      value={expenseSearchQuery}
                      onChange={(e) => setExpenseSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Expense ID</th>
                        <th className="px-6 py-4 text-left">Payee / Merchant</th>
                        <th className="px-6 py-4 text-left">Category</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Payment Method</th>
                        <th className="px-6 py-4 text-left">Date</th>
                        <th className="px-6 py-4 text-left">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {MOCK_EXPENSES.filter(e => 
                        e.payee.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                        e.category.toLowerCase().includes(expenseSearchQuery.toLowerCase())
                      ).map((exp) => (
                        <tr key={exp.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{exp.id}</td>
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{exp.payee}</td>
                          <td className="px-6 py-5 text-[#5A6A51]">{exp.category}</td>
                          <td className="px-6 py-5 text-right font-semibold text-red-600">{exp.amount}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-block rounded-md bg-[#EDF1EC] px-2 py-0.5 text-xs font-semibold text-[#414E36]">
                              {exp.method}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-[#5A6A51]">{exp.date}</td>
                          <td className="px-6 py-5 font-medium text-[#1F251A]">{exp.approver}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PAYROLL VIEW ── */}
          {activeNav === "Payroll" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Payroll</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Manage employee salaries, bonuses, deductions, and payouts.
                  </p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> Run Payroll
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Monthly Payroll</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 303,200</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <DollarSign size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Employees</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-[#1F251A]">{MOCK_PAYROLL.length}</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <Users size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Paid Staff</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-green-600">4</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Processing</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-3xl font-semibold text-amber-600">2</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Info size={18} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search employees by name or role..."
                      value={payrollSearch}
                      onChange={(e) => setPayrollSearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Employee ID</th>
                        <th className="px-6 py-4 text-left">Employee Name</th>
                        <th className="px-6 py-4 text-left">Role</th>
                        <th className="px-6 py-4 text-right">Base Salary</th>
                        <th className="px-6 py-4 text-right">Bonuses</th>
                        <th className="px-6 py-4 text-right">Deductions</th>
                        <th className="px-6 py-4 text-right">Net Payout</th>
                        <th className="px-6 py-4 text-left">Pay Period</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {MOCK_PAYROLL.filter(p => 
                        p.name.toLowerCase().includes(payrollSearch.toLowerCase()) ||
                        p.role.toLowerCase().includes(payrollSearch.toLowerCase())
                      ).map((emp) => {
                        const isPaid = emp.status === "Paid";
                        return (
                          <tr key={emp.id} className="transition hover:bg-[#F9F9F7]">
                            <td className="px-6 py-5 font-mono text-xs font-semibold text-[#5A6A51]">{emp.id}</td>
                            <td className="px-6 py-5 font-semibold text-[#1F251A]">{emp.name}</td>
                            <td className="px-6 py-5 text-[#5A6A51]">{emp.role}</td>
                            <td className="px-6 py-5 text-right font-medium">{emp.base}</td>
                            <td className="px-6 py-5 text-right font-medium text-green-600">+{emp.bonus}</td>
                            <td className="px-6 py-5 text-right font-medium text-red-500">-{emp.deductions}</td>
                            <td className="px-6 py-5 text-right font-bold text-[#1F251A]">{emp.net}</td>
                            <td className="px-6 py-5 text-xs text-[#5A6A51]">{emp.period}</td>
                            <td className="px-6 py-5 text-center">
                              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                isPaid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {emp.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── FINANCES DASHBOARD VIEW ── */}
          {activeNav === "Finances Dashboard" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Finances Dashboard</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">
                    Overview of clinic revenues, operational costs, margins, and expense breakdown.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white border border-[#E6E9EB] px-4 py-2.5 text-xs font-semibold text-[#5A6A51]">
                    Date Range: June 2026
                  </span>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Revenue</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 434,300</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-green-600 font-bold">↑ +18.4% vs last month</p>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Total Expenses</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 188,700</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <TrendingUp size={18} className="rotate-180" />
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-red-500 font-bold">↓ -4.2% vs last month</p>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Net Profit</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">EGP 245,600</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                      <CircleDollarSign size={18} />
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-green-600 font-bold">↑ +38.1% vs last month</p>
                </div>
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Operating Margin</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1F251A]">56.5%</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <BarChart3 size={18} />
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-green-600 font-bold">↑ +8.2% in margin</p>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                {/* SVG Revenue vs Expense Chart */}
                <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Financial Performance</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[#1F251A]">Revenue vs Expenses</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-green-600">
                        <span className="h-3 w-3 rounded-full bg-green-500" /> Revenue
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-red-500">
                        <span className="h-3 w-3 rounded-full bg-red-500" /> Expenses
                      </span>
                    </div>
                  </div>

                  {/* SVG Chart Drawing */}
                  <div className="relative h-64 w-full pt-4">
                    <svg className="h-full w-full" viewBox="0 0 500 220" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#F2EFE9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="70" x2="480" y2="70" stroke="#F2EFE9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="120" x2="480" y2="120" stroke="#F2EFE9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="170" x2="480" y2="170" stroke="#F2EFE9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="200" x2="480" y2="200" stroke="#E6E9EB" strokeWidth="1.5" />

                      {/* Y-Axis Labels */}
                      <text x="5" y="24" className="fill-[#5A6A51] text-[10px] font-semibold">500k</text>
                      <text x="5" y="74" className="fill-[#5A6A51] text-[10px] font-semibold">300k</text>
                      <text x="5" y="124" className="fill-[#5A6A51] text-[10px] font-semibold">150k</text>
                      <text x="5" y="174" className="fill-[#5A6A51] text-[10px] font-semibold">50k</text>
                      <text x="15" y="204" className="fill-[#5A6A51] text-[10px] font-semibold">0</text>

                      {/* March Bars */}
                      {/* Revenue Bar */}
                      <rect x="80" y="60" width="22" height="140" rx="4" className="fill-green-500 transition-all duration-300 hover:opacity-80" />
                      {/* Expense Bar */}
                      <rect x="106" y="125" width="22" height="75" rx="4" className="fill-red-500 transition-all duration-300 hover:opacity-80" />
                      <text x="88" y="218" className="fill-[#5A6A51] text-[10px] font-semibold">Mar 26</text>

                      {/* April Bars */}
                      <rect x="180" y="50" width="22" height="150" rx="4" className="fill-green-500 transition-all duration-300 hover:opacity-80" />
                      <rect x="206" y="130" width="22" height="70" rx="4" className="fill-red-500 transition-all duration-300 hover:opacity-80" />
                      <text x="188" y="218" className="fill-[#5A6A51] text-[10px] font-semibold">Apr 26</text>

                      {/* May Bars */}
                      <rect x="280" y="30" width="22" height="170" rx="4" className="fill-green-500 transition-all duration-300 hover:opacity-80" />
                      <rect x="306" y="120" width="22" height="80" rx="4" className="fill-red-500 transition-all duration-300 hover:opacity-80" />
                      <text x="288" y="218" className="fill-[#5A6A51] text-[10px] font-semibold">May 26</text>

                      {/* June Bars */}
                      <rect x="380" y="26" width="22" height="174" rx="4" className="fill-green-500 transition-all duration-300 hover:opacity-80" />
                      <rect x="406" y="124" width="22" height="76" rx="4" className="fill-red-500 transition-all duration-300 hover:opacity-80" />
                      <text x="388" y="218" className="fill-[#5A6A51] text-[10px] font-semibold">Jun 26</text>
                    </svg>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Expense Breakdown */}
                  <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Budget Usage by Category</p>
                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#1F251A] mb-1">
                          <span>Staff Salaries</span>
                          <span>96.2% (EGP 385K / 400K)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#F2EFE9] overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full" style={{ width: '96.2%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#1F251A] mb-1">
                          <span>Medical Supplies</span>
                          <span>83.0% (EGP 124.5K / 150K)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#F2EFE9] overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full" style={{ width: '83%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#1F251A] mb-1">
                          <span>Marketing & Ads</span>
                          <span>98.6% (EGP 78.9K / 80K)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#F2EFE9] overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '98.6%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#1F251A] mb-1">
                          <span>Utilities & Rent</span>
                          <span>104.1% (EGP 125K / 120K)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#F2EFE9] overflow-hidden">
                          <div className="h-full bg-red-600 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions List */}
                  <div className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">Recent Activity</p>
                    <div className="mt-4 divide-y divide-[#F2EFE9]">
                      {MOCK_FINANCE_TRANSACTIONS.slice(0, 4).map((tx) => {
                        const isCredit = tx.type === "Credit";
                        return (
                          <div key={tx.id} className="py-3 flex items-center justify-between text-sm">
                            <div>
                              <p className="font-semibold text-[#1F251A]">{tx.description}</p>
                              <p className="text-xs text-[#5A6A51] mt-0.5">{tx.date} • {tx.category}</p>
                            </div>
                            <span className={`font-semibold ${isCredit ? "text-green-600" : "text-red-500"}`}>
                              {isCredit ? "+" : "-"}{tx.amount.replace("EGP ", "")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── HUMAN RESOURCES (HR) VIEW ── */}
          {activeNav === "HR" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Human Resources</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Manage workforce payroll, leaves, and performance evaluations.</p>
                </div>
              </div>

              {/* Sub-navigation Tabs */}
              <div className="flex border-b border-[#414E36]/10 gap-6">
                {(["overview", "payroll", "leaves", "performance", "attendance"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setHrActiveSubTab(tab)}
                    className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 -mb-[2px] ${
                      hrActiveSubTab === tab
                        ? "border-[#414E36] text-[#414E36]"
                        : "border-transparent text-[#5A6A51] hover:text-[#414E36]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Overview Sub-tab */}
              {hrActiveSubTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Active Employees</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-3xl font-semibold text-[#1F251A]">{employeesList.length}</span>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                          <Users size={18} />
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Approved Leaves (This Month)</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-3xl font-semibold text-[#1F251A]">
                          {leavesList.filter(l => l.status === "Approved").length}
                        </span>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                          <CalendarDays size={18} />
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Total Payroll Run ({selectedPayrollMonth})</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-3xl font-semibold text-[#1F251A]">
                          EGP {payrollList
                            .filter(p => p.month === selectedPayrollMonth)
                            .reduce((sum, p) => sum + Number(p.net_salary || 0), 0)
                            .toLocaleString()}
                        </span>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4AE7C]/10 text-[#414E36]">
                          <DollarSign size={18} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Employees Directory Card */}
                  <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
                    <div className="p-6 border-b border-[#414E36]/10 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#1F251A]">Workforce Directory</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                            <th className="px-6 py-4">Employee Info</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">System Role</th>
                            <th className="px-6 py-4">Branch</th>
                            <th className="px-6 py-4">Base Salary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#414E36]/5">
                          {employeesList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                                No active employees found.
                              </td>
                            </tr>
                          ) : (
                            employeesList.map((emp: any) => (
                              <tr key={emp.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-[#1F251A]">{emp.name}</div>
                                  <div className="text-xs text-[#5A6A51]">{emp.email}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">{emp.department || "—"}</td>
                                <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">{emp.role_name || "—"}</td>
                                <td className="px-6 py-4 text-xs text-[#5A6A51]">
                                  {branches.find(b => b.id === emp.branch_id)?.name_en || "—"}
                                </td>
                                <td className="px-6 py-4 text-xs font-mono font-bold text-[#1F251A]">
                                  EGP {Number(emp.salary || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Payroll Sub-tab */}
              {hrActiveSubTab === "payroll" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl border border-[#414E36]/10 bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-bold text-[#1F251A]">Select Payroll Month:</label>
                      <select
                        value={selectedPayrollMonth}
                        onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                        className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-sm text-[#414E36] outline-none"
                      >
                        <option value="2026-05">May 2026</option>
                        <option value="2026-06">June 2026</option>
                        <option value="2026-07">July 2026</option>
                        <option value="2026-08">August 2026</option>
                      </select>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/hr/payroll', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({ month: selectedPayrollMonth })
                          });
                          if (res.ok) {
                            alert("Payroll ran successfully!");
                            fetchHrPayroll();
                          } else {
                            const err = await res.json();
                            alert(err.error || "Failed to run payroll");
                          }
                        } catch (err) {
                          alert("Failed to connect to API.");
                        }
                      }}
                      className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-2"
                    >
                      <Plus size={16} /> Run Payroll Sheet
                    </button>
                  </div>

                  <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Month</th>
                            <th className="px-6 py-4">Basic Salary</th>
                            <th className="px-6 py-4">Bonuses</th>
                            <th className="px-6 py-4">Deductions</th>
                            <th className="px-6 py-4">Net Salary</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#414E36]/5">
                          {payrollList.filter(p => p.month === selectedPayrollMonth).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                                No payroll run exists for {selectedPayrollMonth}. Click "Run Payroll Sheet" to calculate.
                              </td>
                            </tr>
                          ) : (
                            payrollList
                              .filter(p => p.month === selectedPayrollMonth)
                              .map((pay: any) => (
                                <tr key={pay.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-[#1F251A]">{pay.employee_accounts?.name || "—"}</div>
                                    <div className="text-xs text-[#5A6A51]">{pay.employee_accounts?.email || "—"}</div>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">{pay.month}</td>
                                  <td className="px-6 py-4 text-xs font-mono text-[#1F251A]">
                                    EGP {Number(pay.basic_salary).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-[#1F251A]">
                                    <input
                                      type="number"
                                      value={pay.bonuses}
                                      disabled={pay.status === "Paid"}
                                      onChange={async (e) => {
                                        const val = Number(e.target.value);
                                        setPayrollList(prev => prev.map(p => p.id === pay.id ? { ...p, bonuses: val, net_salary: p.basic_salary + val - p.deductions } : p));
                                        await fetch('/api/hr/payroll', {
                                          method: 'PATCH',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${session?.access_token}`
                                          },
                                          body: JSON.stringify({ id: pay.id, bonuses: val })
                                        });
                                      }}
                                      className="w-20 rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-2 py-1 text-xs outline-none focus:border-[#C4AE7C] disabled:opacity-50"
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-[#1F251A]">
                                    <input
                                      type="number"
                                      value={pay.deductions}
                                      disabled={pay.status === "Paid"}
                                      onChange={async (e) => {
                                        const val = Number(e.target.value);
                                        setPayrollList(prev => prev.map(p => p.id === pay.id ? { ...p, deductions: val, net_salary: p.basic_salary + p.bonuses - val } : p));
                                        await fetch('/api/hr/payroll', {
                                          method: 'PATCH',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${session?.access_token}`
                                          },
                                          body: JSON.stringify({ id: pay.id, deductions: val })
                                        });
                                      }}
                                      className="w-20 rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-2 py-1 text-xs outline-none focus:border-[#C4AE7C] disabled:opacity-50"
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono font-bold text-[#1F251A]">
                                    EGP {Number(pay.net_salary).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${
                                      pay.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                      {pay.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {pay.status !== "Paid" && (
                                      <button
                                        onClick={async () => {
                                          if (!confirm("Are you sure you want to mark this employee payroll as PAID?")) return;
                                          try {
                                            const res = await fetch('/api/hr/payroll', {
                                              method: 'PATCH',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${session?.access_token}`
                                              },
                                              body: JSON.stringify({ id: pay.id, status: 'Paid' })
                                            });
                                            if (res.ok) {
                                              fetchHrPayroll();
                                            }
                                          } catch (e) {
                                            alert("Failed to pay payroll.");
                                          }
                                        }}
                                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                                      >
                                        Mark Paid
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaves Sub-tab */}
              {hrActiveSubTab === "leaves" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Leave Request List */}
                  <div className="lg:col-span-2 rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
                    <div className="p-6 border-b border-[#414E36]/10 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#1F251A]">Leave Requests</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Dates</th>
                            <th className="px-6 py-4">Days</th>
                            <th className="px-6 py-4">Reason</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#414E36]/5">
                          {leavesList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">
                                No leave requests submitted yet.
                              </td>
                            </tr>
                          ) : (
                            leavesList.map((leave: any) => (
                              <tr key={leave.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-[#1F251A]">{leave.employee_accounts?.name || "—"}</div>
                                  <div className="text-xs text-[#5A6A51]">{leave.employee_accounts?.role_name || "—"}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold text-[#1F251A]">{leave.leave_type}</td>
                                <td className="px-6 py-4 text-xs text-[#1F251A]">
                                  {leave.start_date} to {leave.end_date}
                                </td>
                                <td className="px-6 py-4 text-xs font-mono font-bold text-[#1F251A]">{leave.days_count}</td>
                                <td className="px-6 py-4 text-xs text-[#5A6A51] max-w-[150px] truncate" title={leave.reason}>{leave.reason || "—"}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${
                                    leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    leave.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {leave.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                                  {leave.status === "Pending" && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                                          await fetch('/api/hr/leaves', {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({ id: leave.id, status: 'Approved', approvedBy: profileEmployee?.id || null })
                                          });
                                          fetchHrLeaves();
                                        }}
                                        className="rounded-xl bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                                          await fetch('/api/hr/leaves', {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({ id: leave.id, status: 'Rejected', approvedBy: profileEmployee?.id || null })
                                          });
                                          fetchHrLeaves();
                                        }}
                                        className="rounded-xl bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700 transition"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submit Leave Request */}
                  <div className="rounded-[32px] bg-white border border-[#414E36]/10 p-6 shadow-sm h-fit">
                    <h3 className="text-lg font-bold text-[#1F251A] mb-4">Request Leave</h3>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newLeaveEmployeeId || !newLeaveStartDate || !newLeaveEndDate) {
                          alert("All fields are required.");
                          return;
                        }
                        try {
                          const res = await fetch('/api/hr/leaves', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({
                              employeeId: newLeaveEmployeeId,
                              leaveType: newLeaveType,
                              startDate: newLeaveStartDate,
                              endDate: newLeaveEndDate,
                              reason: newLeaveReason
                            })
                          });
                          if (res.ok) {
                            setNewLeaveStartDate("");
                            setNewLeaveEndDate("");
                            setNewLeaveReason("");
                            fetchHrLeaves();
                            alert("Leave request submitted successfully!");
                          } else {
                            const err = await res.json();
                            alert(err.error || "Failed to submit request.");
                          }
                        } catch (err) {
                          alert("Failed to submit request.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Employee</label>
                        <select
                          value={newLeaveEmployeeId}
                          onChange={(e) => setNewLeaveEmployeeId(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                          required
                        >
                          <option value="">Select Employee</option>
                          {employeesList.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Type</label>
                        <select
                          value={newLeaveType}
                          onChange={(e) => setNewLeaveType(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                        >
                          <option value="Sick">Sick Leave</option>
                          <option value="Annual">Annual Leave</option>
                          <option value="Casual">Casual Leave</option>
                          <option value="Unpaid">Unpaid Leave</option>
                        </select>
                      </div>

                      <div className="grid gap-4 grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Start Date</label>
                          <input
                            type="date"
                            value={newLeaveStartDate}
                            onChange={(e) => setNewLeaveStartDate(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">End Date</label>
                          <input
                            type="date"
                            value={newLeaveEndDate}
                            onChange={(e) => setNewLeaveEndDate(e.target.value)}
                            className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Reason</label>
                        <textarea
                          placeholder="Why is leave needed?"
                          value={newLeaveReason}
                          onChange={(e) => setNewLeaveReason(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none h-20 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                      >
                        Submit Leave Request
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Performance Reviews Sub-tab */}
              {hrActiveSubTab === "performance" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Reviews Timeline List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-[#1F251A] mb-2">Performance Logs</h3>
                    {performanceReviews.length === 0 ? (
                      <div className="rounded-[32px] border border-[#414E36]/10 bg-white p-12 text-center text-sm text-[#5A6A51]">
                        No performance reviews submitted yet.
                      </div>
                    ) : (
                      performanceReviews.map((rev: any) => (
                        <div key={rev.id} className="rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-sm relative hover:border-[#414E36]/30 transition-all">
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this review?")) return;
                              await fetch(`/api/hr/performance?id=${rev.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${session?.access_token}` }
                              });
                              fetchHrPerformance();
                            }}
                            className="absolute top-6 right-6 text-rose-600 hover:text-rose-700 transition"
                            title="Delete Review"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-[#C4AE7C]/15 text-[#414E36] flex items-center justify-center font-bold text-sm shrink-0">
                              {rev.employee_accounts?.name?.slice(0, 2).toUpperCase() || "??"}
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-[#1F251A]">{rev.employee_accounts?.name || "—"}</h4>
                              <p className="text-xs text-[#5A6A51]">Role: {rev.employee_accounts?.role_name || "—"}</p>
                              <div className="flex items-center gap-1.5 py-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    className={i < rev.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}
                                  />
                                ))}
                                <span className="text-xs text-[#5A6A51] ml-1 font-semibold">{rev.review_date}</span>
                              </div>
                              <div className="mt-3 text-sm text-[#1F251A] bg-[#FBFBF9] p-3 rounded-2xl border border-[#414E36]/5">
                                <p className="font-semibold text-xs text-[#5A6A51] mb-1">Evaluator Notes:</p>
                                <p className="leading-relaxed">{rev.comments || "No comments written."}</p>
                              </div>
                              {rev.goals && (
                                <div className="mt-2 text-sm text-[#1F251A] bg-[#C4AE7C]/5 p-3 rounded-2xl border border-[#C4AE7C]/10">
                                  <p className="font-semibold text-xs text-[#8B7544] mb-1">Target Goals:</p>
                                  <p className="leading-relaxed">{rev.goals}</p>
                                </div>
                              )}
                              <p className="text-[10px] text-[#5A6A51] mt-3">Evaluated by: {rev.reviewer?.name || "System"}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Create Review Form */}
                  <div className="rounded-[32px] bg-white border border-[#414E36]/10 p-6 shadow-sm h-fit">
                    <h3 className="text-lg font-bold text-[#1F251A] mb-4">Add Performance Review</h3>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newReviewEmployeeId) {
                          alert("Please select employee.");
                          return;
                        }
                        const profileEmployee = employeesList.find(emp => emp.email?.toLowerCase() === adminEmail?.toLowerCase());
                        try {
                          const res = await fetch('/api/hr/performance', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({
                              employeeId: newReviewEmployeeId,
                              reviewerId: profileEmployee?.id || newReviewEmployeeId,
                              rating: newReviewRating,
                              comments: newReviewComments,
                              goals: newReviewGoals
                            })
                          });
                          if (res.ok) {
                            setNewReviewComments("");
                            setNewReviewGoals("");
                            fetchHrPerformance();
                            alert("Review created successfully!");
                          } else {
                            const err = await res.json();
                            alert(err.error || "Failed to create review.");
                          }
                        } catch (err) {
                          alert("Failed to submit review.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Employee Under Review</label>
                        <select
                          value={newReviewEmployeeId}
                          onChange={(e) => setNewReviewEmployeeId(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                          required
                        >
                          <option value="">Select Employee</option>
                          {employeesList.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Rating (1 to 5 Stars)</label>
                        <select
                          value={newReviewRating}
                          onChange={(e) => setNewReviewRating(Number(e.target.value))}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#414E36] outline-none"
                        >
                          <option value={5}>5 Stars (Excellent)</option>
                          <option value={4}>4 Stars (Good)</option>
                          <option value={3}>3 Stars (Satisfactory)</option>
                          <option value={2}>2 Stars (Needs Improvement)</option>
                          <option value={1}>1 Star (Poor)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Comments</label>
                        <textarea
                          placeholder="Review comments and feedback..."
                          value={newReviewComments}
                          onChange={(e) => setNewReviewComments(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none h-24 resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#5A6A51] mb-1.5">Goals &amp; Next Steps</label>
                        <textarea
                          placeholder="What goals should they work towards next?"
                          value={newReviewGoals}
                          onChange={(e) => setNewReviewGoals(e.target.value)}
                          className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm text-[#1F251A] outline-none h-20 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                      >
                        Submit Performance Review
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Attendance Sub-tab */}
              {hrActiveSubTab === "attendance" && (
                <div className="space-y-6">
                  <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-[0_20px_60px_rgba(47,61,41,0.06)] overflow-hidden">
                    <div className="p-6 border-b border-[#414E36]/10">
                      <h3 className="text-lg font-bold text-[#1F251A]">Daily Attendance Log</h3>
                      <p className="mt-1 text-xs text-[#5A6A51]">Attendance is recorded automatically on first login each day via GPS proximity check.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Check-in Time</th>
                            <th className="px-6 py-4">Location (GPS)</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#414E36]/5">
                          {loadingAttendance ? (
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-sm text-[#5A6A51]">Loading attendance records…</td></tr>
                          ) : attendanceList.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-sm text-[#5A6A51] font-medium">No attendance records found. Records appear after employees log in each day.</td></tr>
                          ) : (
                            attendanceList.map((rec: any) => (
                              <tr key={rec.id} className="hover:bg-[#EDF1EC]/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-[#1F251A]">{rec.employee_accounts?.name || "—"}</div>
                                  <div className="text-xs text-[#5A6A51]">{rec.employee_accounts?.role_name || "—"}</div>
                                </td>
                                <td className="px-6 py-4 text-xs text-[#1F251A]">{rec.date}</td>
                                <td className="px-6 py-4 text-xs font-mono text-[#1F251A]">
                                  {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                                </td>
                                <td className="px-6 py-4 text-xs text-[#5A6A51]">
                                  {rec.latitude && rec.longitude
                                    ? `${Number(rec.latitude).toFixed(4)}, ${Number(rec.longitude).toFixed(4)}`
                                    : "—"}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-bold ${
                                    rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    rec.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {rec.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Missing Alerts Log */}
                  <div className="rounded-[32px] bg-white border border-[#414E36]/10 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#414E36]/10">
                      <h3 className="text-lg font-bold text-[#1F251A]">Inactivity Alerts</h3>
                      <p className="mt-1 text-xs text-[#5A6A51]">Logged when an employee did not confirm presence within 10 seconds of the 30-minute activity check.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[#EDF1EC] text-[10px] font-bold uppercase tracking-widest text-[#414E36] border-b border-[#414E36]/10">
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Alert Time</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#414E36]/5">
                          {activeMissingAlerts.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-[#5A6A51] font-medium">No active inactivity alerts at this time.</td></tr>
                          ) : (
                            activeMissingAlerts.map((a: any) => (
                              <tr key={a.id} className="hover:bg-rose-50/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-[#1F251A]">{a.employee_accounts?.name || "—"}</div>
                                  <div className="text-xs text-[#5A6A51]">{a.employee_accounts?.role_name || "—"}</div>
                                </td>
                                <td className="px-6 py-4 text-xs text-[#1F251A]">{new Date(a.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <span className="inline-block rounded-xl px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                    Unresolved
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={async () => {
                                      const res = await fetch('/api/hr/alerts', {
                                        method: 'PATCH',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${session?.access_token}`
                                        },
                                        body: JSON.stringify({ id: a.id, resolved: true })
                                      });
                                      if (res.ok) fetchHrAlerts();
                                    }}
                                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                                  >
                                    Resolve
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
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

          {/* ── BOOKINGS VIEW ── */}
          {activeNav === "Bookings" && (
          <>
          <header className="mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                Admin Dashboard
              </p>
              <h2 className="mt-3 text-4xl font-semibold text-[#1F251A]">
                Bookings overview
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5A6A51]">
                Manage reservations, monitor requests, and keep the clinic schedule aligned in one place.
              </p>
            </div>
          </header>

          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* ── CALENDAR VIEW SWITCHER ── */}
            <div className="flex items-center gap-1 p-1 w-fit rounded-full border border-[#414E36]/12 bg-white shadow-sm">
              {(["Calendar", "List", "Schedule"] as const).filter(view => {
                if (view === "Calendar" || view === "Schedule") return hasPermission("bookings.view_calendar");
                if (view === "List") return hasPermission("bookings.view_list");
                return true;
              }).map((view) => (
                <button
                  key={view}
                  onClick={() => setCalendarView(view)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    calendarView === view
                      ? "bg-[#414E36] text-[#FBFBF9] shadow-sm"
                      : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowFilterModal(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#414E36]/15 bg-white text-[#414E36] transition hover:bg-[#f7f6f2] shadow-sm"
                title="Filter Bookings"
              >
                <Filter size={18} />
              </button>
              <button
                onClick={handleExportBookingsCSV}
                className="inline-flex items-center gap-2 rounded-full bg-[#C4AE7C] px-5 py-2.5 text-sm font-semibold text-[#414E36] transition hover:bg-[#b59e6c] w-fit shadow-sm"
              >
                <Download size={16} /> Export
              </button>
              {hasPermission("bookings.create") && (
                <button
                  onClick={() => setShowAddBookingModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] w-fit shadow-sm"
                >
                  <Plus size={18} /> New booking
                </button>
              )}
            </div>
          </div>

          {calendarView === "Calendar" && (
          <section className="mb-8 flex flex-col gap-6">
            {/* ── Dashboard summary row ── */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              {/* Today's bookings stat */}
              <div
                onClick={() => { setCalendarMonth(new Date()); setShowTodayBookingsModal(true); }}
                className="rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] cursor-pointer hover:shadow-[0_30px_80px_rgba(47,61,41,0.12)] transition"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]/80">Today's bookings</p>
                <p className="mt-3 text-4xl font-bold text-[#1F251A]">{todaysBookingsCount}</p>
                <p className="mt-1 text-sm text-[#5A6A51]">Click to view today's schedule</p>
              </div>
              {/* Pending requests stat */}
              <div
                onClick={() => document.getElementById("pending-approvals-section")?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] cursor-pointer hover:shadow-[0_30px_80px_rgba(47,61,41,0.12)] transition"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]/80">Pending requests</p>
                <p className="mt-3 text-4xl font-bold text-[#C4AE7C]">{requests.length}</p>
                <p className="mt-1 text-sm text-[#5A6A51]">{requests.length === 0 ? "No pending requests" : "Awaiting approval"}</p>
              </div>
              {/* Coming appointments stat */}
              <div
                className="rounded-[32px] bg-[#E8EDDF]/80 p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]/80">Coming appointments</p>
                <p className="mt-3 text-4xl font-bold text-[#1F251A]">{comingAppointmentsCount}</p>
                <p className="mt-1 text-sm text-[#5A6A51]">Upcoming approved bookings</p>
              </div>
            </div>

            {/* ── Calendar grid ── */}
            <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                    Booking panel
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                    {currentMonthLabel} {currentYear} calendar
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
                  >
                    <ArrowLeft size={16} /> Prev
                  </button>
                  <button
                    onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 rounded-[32px] bg-[#EDF1EC] p-5">
                <div className="grid grid-cols-7 gap-3 text-center text-sm font-semibold text-[#5A6A51]">
                  {calendarDays.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-3 text-sm text-[#414E36]">
                  {(() => {
                    const totalCells = daysInMonth + startWeekday <= 35 ? 35 : 42;
                    return Array.from({ length: totalCells }).map((_, index) => {
                      const day = index - startWeekday + 1;
                      const isCurrentMonthDay = day > 0 && day <= daysInMonth;

                      if (!isCurrentMonthDay) {
                        return <div key={index} className="min-h-[84px]" />;
                      }

                      const dateKey = `${currentYear}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const bookingCount = bookingCountsByDay.get(dateKey) ?? 0;

                      return (
                        <div
                          key={index}
                          onClick={() => {
                            if (bookingCount > 0) {
                              const bookingsForDay = filteredReservations.filter(
                                (r) => String(r.date).slice(0, 10) === dateKey && ['approved', 'confirmed', 'started', 'completed'].includes(r.status)
                              );
                              if (bookingsForDay.length === 1) {
                                setViewingBooking(bookingsForDay[0]);
                              } else if (bookingsForDay.length > 1) {
                                setDayBookingsSelector({
                                  open: true,
                                  date: dateKey,
                                  bookings: bookingsForDay
                                });
                              }
                            }
                          }}
                          className={`min-h-[84px] rounded-3xl border border-transparent px-3 py-3 text-left transition ${
                            bookingCount > 0
                              ? "bg-[#C4AE7C] text-[#414E36] shadow-[0_15px_45px_rgba(196,174,124,0.18)] cursor-pointer"
                              : "hover:border-[#C4AE7C]/15 hover:bg-[#fff]"
                          }`}
                        >
                          <span className="block text-sm font-semibold">
                            {day}
                          </span>
                          {bookingCount > 0 && (
                            <span className="mt-4 inline-flex rounded-full bg-[#414E36] px-2.5 py-1 text-[11px] font-semibold text-[#FBFBF9]">
                              {bookingCount} booking{bookingCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </section>
          )}

          {/* ── LIST VIEW ── */}
          {calendarView === "List" && (
          <section className="mb-8 rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">Booking panel</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">All bookings — list</h3>
              </div>
              <span className="rounded-full bg-[#EDF1EC] px-4 py-2 text-sm font-semibold text-[#5A6A51]">
                {filteredReservations.filter(r => ['approved', 'confirmed', 'started', 'completed'].includes(r.status)).length} active
              </span>
            </div>
            {filteredReservations.length === 0 ? (
              <p className="rounded-3xl border border-[#414E36]/10 bg-[#EDF1EC] p-6 text-[#5A6A51]">No bookings match the current filters.</p>
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-[#414E36]/08">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#EDF1EC]">
                      {["Reference ID","Services","Providers","Customer","Status","Address","Payment","Date","Discount","Total","Paid"].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-[#5A6A51]/80 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/06">
                    {filteredReservations
                      .slice()
                      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                      .map((r) => {
                        const dateStr = r.date ? String(r.date).slice(0, 10) : null;
                        const dateObj = dateStr ? new Date(dateStr + 'T00:00:00') : null;
                        const dateLabel = dateObj
                          ? dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
                          : '—';
                        const timeLabel = r.timeSlot || r.requestedTime || null;
                        const refId = `#${r.id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
                        const statusClass = getStatusBadgeClass(r.status);
                        return (
                          <tr key={r.id} className="group transition-colors hover:bg-[#EDF1EC]/40">
                            <td className="px-4 py-4 font-mono font-bold text-[#1F251A] whitespace-nowrap">{refId}</td>
                            <td className="px-4 py-4 font-medium text-[#1F251A] whitespace-nowrap">{r.sessionType || 'Consultation'}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#414E36]/10 text-[10px] font-bold text-[#414E36]">
                                  {(r.doctorName || 'Dr. Sara El Gamel').split(' ').pop()?.charAt(0) ?? 'D'}
                                </span>
                                <span className="text-[#5A6A51]">{r.doctorName || 'Dr. Sara El Gamel'}</span>
                                <span className="rounded-full bg-[#C4AE7C]/20 px-2 py-0.5 text-[10px] font-semibold text-[#7a6a3a]">0</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="rounded-full bg-[#EDF1EC] px-3 py-1 text-xs font-semibold text-[#414E36]">{r.name}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-4 text-[#5A6A51] whitespace-nowrap">
                              {branches.find(b => b.id === r.branchId)?.name_en || "Default/All"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-[#5A6A51]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                                Unpaid
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="font-medium text-[#1F251A]">{dateLabel}</p>
                              {timeLabel && <p className="mt-0.5 text-[10px] text-[#5A6A51]/70">{timeLabel}</p>}
                            </td>
                            <td className="px-4 py-4 text-[#5A6A51]">0</td>
                            <td className="px-4 py-4 font-semibold text-[#1F251A] whitespace-nowrap">—</td>
                            <td className="px-4 py-4 whitespace-nowrap text-[#5A6A51]">0</td>
                            <td className="px-4 py-4">
                              <button className="flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#414E36]/40 hover:text-[#414E36]">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center gap-6 rounded-b-[24px] border-t border-[#414E36]/08 bg-[#EDF1EC]/60 px-5 py-3 text-xs font-semibold text-[#5A6A51]">
                  <span>Total Duration: <span className="text-[#1F251A]">{filteredReservations.length}.00</span></span>
                  <span>Actual Duration: <span className="text-[#1F251A]">0.00</span></span>
                </div>
              </div>
            )}
          </section>
          )}

          {/* ── SCHEDULE VIEW ── */}
          {calendarView === "Schedule" && (() => {
            // Build 15-min slots 09:00 → 20:00 in 24h ("HH:MM") format for matching
            const RAW_SLOTS: string[] = [];
            for (let h = 9; h <= 20; h++) {
              for (const m of [0, 15, 30, 45]) {
                if (h === 20 && m > 0) break;
                RAW_SLOTS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
              }
            }

            // Convert 24h "HH:MM" → display label "H:MM AM/PM"
            const toLabel = (raw: string) => {
              const [hh, mm] = raw.split(':').map(Number);
              const ampm = hh < 12 ? 'AM' : 'PM';
              const h12 = hh % 12 === 0 ? 12 : hh % 12;
              return `${h12}:${String(mm).padStart(2,'0')} ${ampm}`;
            };

            // Normalise any time string to nearest 15-min 24h "HH:MM" slot
            const normaliseSlot = (raw: string | null | undefined): string | null => {
              if (!raw) return null;
              const cleaned = raw.trim();
              // Already "HH:MM" 24h
              const match24 = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
              if (!match24) return null;
              let hh = parseInt(match24[1]);
              const mm = parseInt(match24[2]);
              const ampm = match24[3]?.toUpperCase();
              if (ampm === 'PM' && hh !== 12) hh += 12;
              if (ampm === 'AM' && hh === 12) hh = 0;
              // Round to nearest 15 min
              const totalMins = hh * 60 + mm;
              const rounded = Math.round(totalMins / 15) * 15;
              const rh = Math.floor(rounded / 60);
              const rm = rounded % 60;
              return `${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')}`;
            };

            const scheduleDateStr = [
              scheduleDate.getFullYear(),
              String(scheduleDate.getMonth() + 1).padStart(2, '0'),
              String(scheduleDate.getDate()).padStart(2, '0'),
            ].join('-');
            const scheduleDateLabel = scheduleDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

            // Collect doctor names from actual bookings for this day (status: approved or pending with a time)
            const bookingDoctorNames = Array.from(
              new Set(
                scheduleReservations
                  .filter(r => r.timeSlot || r.requestedTime)
                  .map(r => r.doctorName)
                  .filter(Boolean) as string[]
              )
            );

            // Merge: DB providers + any doctor names found in actual bookings (deduped)
            const providerNames = providers.length > 0
              ? providers.map((p: any) => p.name as string)
              : ["Dr. Sara El Gamel", "Dr. Radwa Seif", "Dr. Ahmed Medhat"];

            const DOCTORS = Array.from(new Set([...providerNames, ...bookingDoctorNames]));

            // Default doctor for bookings with no doctorName
            const defaultDoctor = providerNames[0] ?? '';

            const visibleDoctors = scheduleProviderFilter === 'All'
              ? DOCTORS
              : DOCTORS.filter(d => d === scheduleProviderFilter);

            // All bookings for the day that have a usable time (approved with timeSlot, or pending with requestedTime)
            const dayBookings = scheduleReservations.filter(r => {
              const hasTime = r.timeSlot || r.requestedTime;
              if (!hasTime) return false;
              if (scheduleProviderFilter !== 'All' && (r.doctorName || defaultDoctor) !== scheduleProviderFilter) return false;
              if (scheduleServiceFilter !== 'All') {
                const svc = localServices.find(s => s.id === r.serviceId);
                if (!svc || svc.en !== scheduleServiceFilter) return false;
              }
              return true;
            });

            // bookingMap[slotKey][doctorName] = Req[]
            const bookingMap: Record<string, Record<string, Req[]>> = {};
            dayBookings.forEach(r => {
              const doc = r.doctorName || defaultDoctor;
              // Use confirmed timeSlot for approved, requestedTime for pending
              const slotKey = normaliseSlot(r.timeSlot || r.requestedTime) ?? '09:00';
              if (!bookingMap[slotKey]) bookingMap[slotKey] = {};
              if (!bookingMap[slotKey][doc]) bookingMap[slotKey][doc] = [];
              bookingMap[slotKey][doc].push(r);
            });

            const serviceNames = Array.from(new Set(localServices.map(s => s.en))).sort();

            const statusDot: Record<string, string> = {
              approved:  'bg-[#414E36]',
              pending:   'bg-[#C4AE7C]',
              rejected:  'bg-red-400',
              cancelled: 'bg-red-400',
              canceled:  'bg-red-400',
            };

            return (
            <section className="mb-8 rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
              {/* ── top bar ── */}
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <select
                  value={scheduleProviderFilter}
                  onChange={e => setScheduleProviderFilter(e.target.value)}
                  className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm font-medium text-[#414E36] outline-none transition hover:border-[#414E36]/30"
                >
                  <option value="All">Select Provider</option>
                  {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={scheduleServiceFilter}
                  onChange={e => setScheduleServiceFilter(e.target.value)}
                  className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2.5 text-sm font-medium text-[#414E36] outline-none transition hover:border-[#414E36]/30"
                >
                  <option value="All">Select Service</option>
                  {serviceNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScheduleDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#414E36]/15 text-[#414E36] transition hover:bg-[#EDF1EC]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div className="flex items-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-sm font-semibold text-[#1F251A]">
                    <span>{scheduleDateLabel}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <button onClick={() => setScheduleDate(new Date())} className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]">Today</button>
                  <button
                    onClick={() => setScheduleDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#414E36]/15 text-[#414E36] transition hover:bg-[#EDF1EC]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <button className="flex items-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-sm font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Waiting List
                  </button>
                </div>
              </div>

              {/* ── schedule table ── */}
              <div className="overflow-auto rounded-[24px] border border-[#414E36]/08" style={{ maxHeight: '600px' }}>
                <table className="w-full border-collapse" style={{ minWidth: `${72 + visibleDoctors.length * 220}px` }}>
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="w-[72px] border-b border-r border-[#414E36]/08 bg-[#EDF1EC] px-3 py-3" />
                      {visibleDoctors.map(doc => (
                        <th key={doc} className="border-b border-l border-[#414E36]/08 bg-[#EDF1EC] px-4 py-3 text-center">
                          <span className="inline-block rounded-full bg-[#414E36]/10 px-4 py-1.5 text-sm font-semibold text-[#414E36]">{doc}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Track which (slotIndex, doctor) cells are consumed by a rowspan
                      const blocked = new Set<string>();
                      return RAW_SLOTS.map((raw, si) => {
                        const label = toLabel(raw);
                        // Only show label on the hour (minutes === "00")
                        const showLabel = raw.endsWith(':00');
                        return (
                          <tr key={raw}>
                            {/* time label */}
                            <td
                              className={`w-[72px] border-r border-[#414E36]/08 px-3 text-right align-top ${si > 0 ? 'border-t border-[#414E36]/06' : ''}`}
                              style={{ height: 36 }}
                            >
                              <span className={showLabel ? 'text-[11px] font-semibold text-[#5A6A51]/80' : 'text-[9px] font-medium text-[#5A6A51]/40'}>
                                {label}
                              </span>
                            </td>
                            {/* doctor cells */}
                            {visibleDoctors.map(doc => {
                              const cellKey = `${si}-${doc}`;
                              // Skip — this cell is consumed by an earlier rowspan
                              if (blocked.has(cellKey)) return null;

                              const cells = bookingMap[raw]?.[doc] ?? [];
                              const hasBooking = cells.length > 0;

                              if (hasBooking) {
                                // Block the next 3 slots (= remaining 45 min of the 1-hour session)
                                for (let offset = 1; offset <= 3; offset++) {
                                  if (si + offset < RAW_SLOTS.length) {
                                    blocked.add(`${si + offset}-${doc}`);
                                  }
                                }
                                return (
                                  <td
                                    key={doc}
                                    rowSpan={4}
                                    className={`border-l border-[#414E36]/08 p-1.5 align-top ${si > 0 ? 'border-t border-[#414E36]/06' : ''}`}
                                    style={{ height: 36 * 4 }}
                                  >
                                    {cells.map(b => {
                                      const svc = localServices.find(s => s.id === b.serviceId);
                                      const svcName = svc ? svc.en : b.sessionType || 'Consultation';
                                      return (
                                        <div
                                          key={b.id}
                                          title={`${b.name} — ${svcName} (${b.status})`}
                                          className="flex h-full flex-col justify-center gap-1 rounded-2xl bg-[#414E36]/10 px-3 py-2 ring-1 ring-[#414E36]/20"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot[b.status?.toLowerCase()] ?? 'bg-[#5A6A51]'}`} />
                                            <p className="truncate text-xs font-semibold text-[#1F251A]">{b.name}</p>
                                          </div>
                                          <p className="truncate pl-3.5 text-[10px] text-[#5A6A51]">{svcName}</p>
                                          <p className="truncate pl-3.5 text-[10px] text-[#5A6A51]/60 capitalize">{b.status}</p>
                                        </div>
                                      );
                                    })}
                                  </td>
                                );
                              }

                              // Empty cell
                              return (
                                <td
                                  key={doc}
                                  className={`border-l border-[#414E36]/08 ${si > 0 ? 'border-t border-[#414E36]/06' : ''}`}
                                  style={{ height: 36 }}
                                />
                              );
                            })}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
            );
          })()}


          <section id="pending-approvals-section" className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                  Reservation requests
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                  Pending approvals
                </h4>
              </div>

            </div>

            {loading && <p>Loading requests…</p>}
            {!loading && requests.length === 0 && (
              <p className="rounded-3xl border border-[#414E36]/10 bg-[#EDF1EC] p-6 text-[#5A6A51]">
                No pending reservation requests at the moment.
              </p>
            )}

            <div className="space-y-4">
              {requests.map((req) => {
                const service = localServices.find(s => s.id === req.serviceId);
                return (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-[#414E36]/10 bg-[#F7F7F3] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[#1F251A]">
                          {req.name}
                        </p>
                        <p className="text-sm font-semibold text-[#414E36] mt-0.5">
                          Service: {service ? service.en : `Service #${req.serviceId}`}
                        </p>
                        <p className="mt-1 text-xs text-[#5A6A51]">
                          {req.email} • {req.phone} • <span className="font-semibold text-[#414E36]">{branches.find(b => b.id === req.branchId)?.name_en || "Default/All"}</span>
                        </p>
                      </div>
                      <span className="rounded-full bg-[#C4AE7C]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#414E36]">
                        {req.status}
                      </span>
                    </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-[#FBFBF9] p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-[#5A6A51]/80">
                        Appointment
                      </p>
                      <p className="mt-2 text-sm text-[#414E36]">
                        {req.date}
                        {req.requestedTime ? ` • requested ${req.requestedTime}` : ""}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-[#FBFBF9] p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-[#5A6A51]/80">
                        Notes
                      </p>
                      <p className="mt-2 text-sm text-[#414E36]">
                        {req.notes || "No notes provided."}
                      </p>
                    </div>
                  </div>
                  {hasPermission("bookings.approve_reject") && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={loadingApproveId === req.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openApprove(req);
                        }}
                        className="rounded-3xl bg-[#414E36] px-4 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-60 flex items-center gap-2"
                      >
                        {loadingApproveId === req.id ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            Loading...
                          </>
                        ) : (
                          "Approve"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fetch(
                            "/api/reservations?id=" + encodeURIComponent(req.id),
                            {
                              method: "PATCH",
                              body: JSON.stringify({ action: "reject" }),
                              headers: { "Content-Type": "application/json" },
                            }
                          );
                          fetchRequests();
                          fetchAllReservations();
                        }}
                        className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </section>
          </>
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
              Appoint on {selected.date}. Choose the available time slot below.
            </p>
            <label className="mb-2 block text-sm font-semibold text-[#414E36]">
              Time slot
            </label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="mb-4 w-full rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C]"
            >
              {(() => {
                const { start, end } = getDayOperatingHoursApprove(selected);
                const filteredSlots = SLOTS.filter((s) => {
                  const norm = normaliseTo24hSlot(s) ?? "";
                  return norm >= start && norm < end;
                });
                return filteredSlots.map((s) => {
                  const isUnavailable = approveUnavailableSlots.includes(s);
                  return (
                    <option key={s} value={s} disabled={isUnavailable}>
                      {s} {isUnavailable ? "(Unavailable)" : ""}
                    </option>
                  );
                });
              })()}
            </select>

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
                className="rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
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
            price: s?.price ?? prices[id] ?? 500
          };
        });

        const serviceNames = bookingServices.map(bs => bs.name).join(", ");
        const cost = bookingServices.reduce((sum, bs) => sum + bs.price, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4">
            <div className="w-full max-w-5xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              {/* Header */}
              <div className="mb-6 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">
                    Booking Details
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-[#1F251A]">
                      Reference Id: #{viewingBooking.id}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      viewingBooking.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : viewingBooking.status === 'rejected' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {viewingBooking.status}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      viewingBooking.isManual 
                        ? 'bg-gray-100 text-gray-700 border border-gray-200' 
                        : 'bg-[#C4AE7C]/20 text-[#414E36]'
                    }`}>
                      {viewingBooking.isManual ? "Manual Booking" : "Website Booking"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewingBooking(null);
                    setIsEditingService(false);
                  }}
                  className="rounded-full bg-[#F2EFE9] p-2 text-[#414E36] transition hover:bg-[#e4e0d6]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Grid content */}
              <div className="grid gap-6 md:grid-cols-[1.8fr_1fr]">
                
                {/* Left Column */}
                <div className="space-y-6">
                  
                  {/* Service & Date & Session Type */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">SERVICE</p>
                      <p className="mt-1 text-base font-semibold text-[#1F251A]">{serviceNames}</p>
                    </div>
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">BOOKING DATE</p>
                      <p className="mt-1 text-base font-semibold text-[#1F251A]">
                        {viewingBooking.date} {viewingBooking.timeSlot ? ` @ ${viewingBooking.timeSlot}` : viewingBooking.requestedTime ? ` @ ${viewingBooking.requestedTime}` : ""}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 flex flex-col justify-between">
                       <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-1">SESSION TYPE</p>
                       <select
                         value={viewingBooking.sessionType || "in_person"}
                         disabled={!hasPermission("bookings.edit")}
                         onChange={async (e) => {
                           const newType = e.target.value;
                           await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                             method: "PATCH",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ sessionType: newType })
                           });
                           setViewingBooking(prev => prev ? { ...prev, sessionType: newType } : null);
                           fetchAllReservations();
                         }}
                         className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2 py-1 text-sm font-semibold text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                       >
                         <option value="in_person">In Person / في العيادة</option>
                         <option value="online">Online / أونلاين</option>
                       </select>
                     </div>
                  </div>

                  {/* Price Details */}
                  <div className="rounded-2xl border-2 border-dashed border-[#414E36]/20 bg-[#FBFBF9] p-5">
                    <p className="text-sm font-bold text-[#1F251A] mb-4">Price Details</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-[#5A6A51]">
                        <span>Base Price</span>
                        <span>-</span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#1F251A]">
                        <span>Service Cost</span>
                        <span>{cost} EGP</span>
                      </div>
                      <div className="border-t border-[#414E36]/10 pt-2 flex justify-between font-bold text-[#1F251A] text-base">
                        <span>Total Price</span>
                        <span>{cost} EGP</span>
                      </div>
                    </div>
                  </div>

                  {/* Services & Adjustments */}
                  <div className="flex flex-col gap-3 border-b border-[#414E36]/10 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">SERVICES</p>
                      </div>
                      {!isEditingService && (
                        <button
                          onClick={() => setIsEditingService(true)}
                          disabled={!hasPermission("bookings.edit")}
                          className="rounded-2xl border border-[#414E36]/15 px-3 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Service
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {bookingServices.map((bs, index) => (
                        <div key={`${bs.id}-${index}`} className="flex items-center gap-2 bg-[#EDF1EC] rounded-xl px-3 py-1.5 text-sm font-semibold text-[#1F251A] shadow-sm">
                          <span>{bs.name}</span>
                          <span className="text-xs font-medium text-[#5A6A51]">({bs.price} EGP)</span>
                          {bookingServices.length > 1 && hasPermission("bookings.edit") && (
                            <button
                              onClick={async () => {
                                const updatedIds = selectedServiceIds.filter((_, i) => i !== index);
                                try {
                                  const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ serviceIds: updatedIds }),
                                  });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setViewingBooking(updated);
                                    fetchAllReservations();
                                  } else {
                                    const err = await res.json();
                                    alert(err.error || "Failed to remove service");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("Error removing service");
                                }
                              }}
                              className="text-red-600 hover:text-red-800 ml-1 font-bold text-lg leading-none"
                              title="Remove service"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {isEditingService && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <select
                          value=""
                          onChange={async (e) => {
                            const newServiceId = Number(e.target.value);
                            if (!newServiceId) return;
                            const updatedServiceIds = [...selectedServiceIds, newServiceId];
                            try {
                              const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ serviceIds: updatedServiceIds }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setViewingBooking(updated);
                                fetchAllReservations();
                                setIsEditingService(false);
                              } else {
                                const err = await res.json();
                                alert(err.error || "Failed to add service");
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Error adding service");
                            }
                          }}
                          className="rounded-xl border border-[#414E36]/15 bg-white px-3 py-1.5 text-sm text-[#1F251A] outline-none font-semibold focus:border-[#C4AE7C]"
                        >
                          <option value="" disabled>Select a service to add</option>
                          {localServices
                            .filter(svc => !selectedServiceIds.includes(svc.id))
                            .map((svc) => (
                              <option key={svc.id} value={svc.id}>
                                {svc.en}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => setIsEditingService(false)}
                          className="text-xs font-semibold text-[#5A6A51] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/*
                   * Dev Notes:
                   * - Implementation: Will require an 'adjustments' table or a JSON column in reservations to store reasons and positive/negative values.
                   *   The frontend will show a form modal allowing reception/finance staff to add credits/debits.
                   * - Technical Caveat / Gap: Requires strict role permission audit checks (e.g. only 'finance' or 'superadmin' roles can apply adjustments).
                   *   All changes must write an audit trail log in a ledger table.
                   * - Last Updated: July 5, 2026 2:45 PM
                   * - Milestone: Postponed / Phase 2
                   * - Module: Bookings / Billing
                   * - Parent Feature: Billing System
                   * - Place: Booking Details drawer / Extra Adjustment Section
                   * - End Dev: Pending DB Schema
                   * - Priority: Medium
                   * - Started Dev: July 5, 2026 2:00 PM
                   * - Status: Locked
                   * - Sub-Features: Empty
                   * - User Role: Finance Manager / Superadmin
                   * - What: Allows adding positive or negative financial adjustments to the base price of a booking.
                   * - Where: Located inside the booking details drawer under 'Extra Adjustment'.
                   * - Why: Handles manual discounts, on-the-fly custom service adjustments, or refunds without altering core service pricing.
                   */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">EXTRA ADJUSTMENT</p>
                      <p className="text-sm text-[#1F251A] mt-1 font-semibold">0.00 EGP</p>
                    </div>
                    <button
                      disabled={true}
                      className="rounded-2xl border border-[#414E36]/15 px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 cursor-not-allowed opacity-50 flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      Adjustment
                    </button>
                  </div>



                  {/* Products */}
                  {/*
                   * Dev Notes:
                   * - Implementation: Needs a 'products' table for catalog inventory and a 'reservation_products' junction table.
                   *   The frontend should use an inventory picker modal showing live stock count.
                   * - Technical Caveat / Gap: Inventory sync is critical. Real-time depletion check on checkout prevents overselling.
                   * - Last Updated: July 5, 2026 2:45 PM
                   * - Milestone: Postponed / Phase 2
                   * - Module: Inventory / Products
                   * - Parent Feature: Products System
                   * - Place: Booking Details drawer / Products Section
                   * - End Dev: Pending DB Schema
                   * - Priority: Medium
                   * - Started Dev: July 5, 2026 2:00 PM
                   * - Status: Locked
                   * - Sub-Features: Live Inventory Picker, Stock Reconciliation
                   * - User Role: Pharmacist / Receptionist
                   * - What: Allows prescribing/linking retail skincare or medical products to a patient's booking invoice.
                   * - Where: Located inside the booking details drawer under 'Products'.
                   * - Why: Consolidates clinical services and related products into a single final invoice for the patient.
                   */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">PRODUCTS</p>
                      <p className="text-sm text-[#5A6A51] mt-1">No products added</p>
                    </div>
                    <button
                      disabled={true}
                      className="rounded-2xl border border-[#414E36]/15 px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 cursor-not-allowed opacity-50 flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      See Products
                    </button>
                  </div>

                  {/* Prescriptions */}
                  {/*
                   * Dev Notes:
                   * - Implementation: Requires a 'prescriptions' table with foreign keys to doctor, patient, and reservation, plus a 'prescription_items' table.
                   *   The frontend should present a clean autocomplete selector for medicines, dosage rules, and duration.
                   * - Technical Caveat / Gap: Needs integration with a drugs database API or static dictionary, and validation for active substance overlaps.
                   * - Last Updated: July 5, 2026 2:45 PM
                   * - Milestone: Postponed / Phase 2
                   * - Module: Medical / Clinical
                   * - Parent Feature: E-Prescriptions System
                   * - Place: Booking Details drawer / Prescriptions Section
                   * - End Dev: Pending DB Schema
                   * - Priority: High
                   * - Started Dev: July 5, 2026 2:00 PM
                   * - Status: Locked
                   * - Sub-Features: Autocomplete Drug Search, PDF Exporter
                   * - User Role: Doctor / Clinician
                   * - What: Digital prescription builder for writing treatment plans and medical prescriptions.
                   * - Where: Located inside the booking details drawer under 'Prescriptions'.
                   * - Why: Digitizes clinical workflows and allows patient records to keep a history of prescribed items.
                   */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-[#1F251A]">Prescriptions</p>
                      <button
                        disabled={true}
                        className="rounded-2xl bg-[#414E36]/50 px-3 py-1 text-xs font-semibold text-[#FBFBF9]/80 cursor-not-allowed flex items-center gap-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        + Add Prescription
                      </button>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center text-[#5A6A51]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-60">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <p className="text-xs font-semibold">no prescriptions yet</p>
                      <button
                        disabled={true}
                        className="mt-2 text-xs font-bold text-gray-400 cursor-not-allowed flex items-center gap-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        + Create First Prescription
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                    {isEditingNotes ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#1F251A]">Edit Notes</p>
                        </div>
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Enter notes about this booking..."
                          className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] p-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition min-h-[100px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsEditingNotes(false)}
                            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              await saveNotes(notesDraft);
                              setViewingBooking(prev => prev ? { ...prev, notes: notesDraft } : null);
                              setIsEditingNotes(false);
                            }}
                            className="rounded-xl bg-[#414E36] px-3 py-1.5 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-bold text-[#1F251A]">Notes</p>
                          {hasPermission("bookings.edit") && (
                            <button
                              onClick={() => {
                                setNotesDraft(viewingBooking.notes || "");
                                setIsEditingNotes(true);
                              }}
                              className="rounded-2xl bg-[#414E36] px-3 py-1 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                            >
                              {viewingBooking.notes ? "Edit Note" : "+ Add Note"}
                            </button>
                          )}
                        </div>
                        {viewingBooking.notes ? (
                          <div className="rounded-xl bg-[#F7F7F3] p-4 text-sm text-[#414E36]">
                            {viewingBooking.notes}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center text-[#5A6A51]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-60">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <p className="text-xs font-semibold">no notes yet</p>
                            {hasPermission("bookings.edit") && (
                              <button
                                onClick={() => {
                                  setNotesDraft("");
                                  setIsEditingNotes(true);
                                }}
                                className="mt-2 text-xs font-bold text-[#414E36] hover:underline"
                              >
                                Add your first note about this customer
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-6">

                  {/* Workflow Action Flow Section */}
                  {viewingBooking.status === 'pending_deposit' && (
                    <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-900">Pending Deposit</p>
                      </div>
                      <p className="text-xs text-purple-700 leading-relaxed">
                        This website booking requires a reservation deposit. The patient has not yet paid the deposit online. You can manually register the payment if they paid via cash/bank transfer.
                      </p>
                      {(() => {
                        const svc = localServices.find(s => s.id === viewingBooking.serviceId);
                        const svcPrice = (svc && svc.price !== undefined) ? svc.price : 0;
                        const depVal = Math.round(svcPrice * (bookingDepositPercentage / 100));
                        return (
                          <div className="rounded-xl bg-white p-3 text-xs space-y-1 text-purple-900 font-semibold border border-purple-200">
                            <div className="flex justify-between">
                              <span>Service Price:</span>
                              <span>EGP {svcPrice}</span>
                            </div>
                            <div className="flex justify-between text-purple-700">
                              <span>Deposit Amount ({bookingDepositPercentage}%):</span>
                              <span>EGP {depVal}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        onClick={async () => {
                          const svc = localServices.find(s => s.id === viewingBooking.serviceId);
                          const svcPrice = (svc && svc.price !== undefined) ? svc.price : 0;
                          const depVal = Math.round(svcPrice * (bookingDepositPercentage / 100));
                          const remaining = svcPrice - depVal;

                          if (await showConfirm(`Mark deposit of EGP ${depVal} as paid? This will move the booking to Pending.`)) {
                            const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                status: 'pending',
                                amountPaid: depVal,
                                amountLeft: remaining
                              }),
                            });
                            if (res.ok) {
                              setViewingBooking(null);
                              fetchRequests();
                              fetchAllReservations();
                            }
                          }
                        }}
                        className="w-full rounded-2xl bg-purple-700 py-2.5 text-xs font-bold text-white hover:bg-purple-800 transition flex items-center justify-center gap-1.5"
                      >
                        Mark Deposit as Paid
                      </button>
                    </div>
                  )}

                  {viewingBooking.status === 'pending' && hasPermission("bookings.approve_reject") && (
                    <div className="rounded-2xl border-2 border-[#C4AE7C]/30 bg-[#EDF1EC] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1F251A] mb-2">Workflow Actions</p>
                      <p className="text-xs text-[#5A6A51] mb-4">This booking is pending approval. Assign a doctor and confirm details.</p>
                      <div className="flex gap-3">
                        <button
                          disabled={loadingApproveId === viewingBooking.id}
                          onClick={async () => {
                            await openApprove(viewingBooking);
                            setViewingBooking(null);
                          }}
                          className="flex-1 rounded-2xl bg-[#414E36] py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          {loadingApproveId === viewingBooking.id ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                              Loading...
                            </>
                          ) : (
                            "Approve"
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            if (await showConfirm("Are you sure you want to reject this request?")) {
                              await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'reject' }),
                              });
                              setViewingBooking(null);
                              fetchRequests();
                              fetchAllReservations();
                            }
                          }}
                          className="flex-1 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#f7f6f2] transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp confirmation step for website bookings in 'approved' status */}
                  {viewingBooking.status === 'approved' && !viewingBooking.isManual && (
                    (() => {
                      // Clean phone: if it starts with 0, prepend 2. If it doesn't have 20 prefix, add it.
                      let whatsappPhone = viewingBooking.phone.trim().replace(/\s+/g, '');
                      if (whatsappPhone.startsWith('0')) {
                        whatsappPhone = '2' + whatsappPhone;
                      } else if (!whatsappPhone.startsWith('2') && whatsappPhone.length === 10) {
                        whatsappPhone = '2' + whatsappPhone;
                      }
                      if (!whatsappPhone.startsWith('+') && !whatsappPhone.startsWith('2') && whatsappPhone.length === 11) {
                        whatsappPhone = '2' + whatsappPhone.slice(1);
                      }

                      const branch = branches.find(b => b.id === viewingBooking.branchId);
                      const branchNameForMsg = branch ? (isRTL ? branch.name_ar : branch.name_en) : "Revera Clinics";
                      const timeSlotForMsg = viewingBooking.timeSlot || viewingBooking.requestedTime || "scheduled time";

                      const textMessage = `Hello ${viewingBooking.name}! This is Revera Clinics. We are pleased to confirm your booking for ${serviceNames} on ${viewingBooking.date} at ${timeSlotForMsg} at our ${branchNameForMsg} branch. Looking forward to seeing you!`;

                      const whatsappLink = `https://api.whatsapp.com/send/?phone=${whatsappPhone}&text=${encodeURIComponent(textMessage)}&type=phone_number&app_absent=0`;

                      return (
                        <div className="rounded-2xl border border-[#C4AE7C]/40 bg-[#FBFBF9] p-5 space-y-4 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-[#25D366] animate-pulse"></span>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1F251A]">WhatsApp Confirmation</p>
                          </div>
                          <p className="text-xs text-[#5A6A51] leading-relaxed">
                            This is a website booking. Please send the booking details confirmation message to the patient on WhatsApp, then mark it as Confirmed.
                          </p>
                          <div className="flex flex-col gap-2">
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full rounded-2xl bg-[#25D366] hover:bg-[#20ba56] text-white py-2.5 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.794-4.382 9.797-9.77.001-2.61-1.01-5.063-2.85-6.907-1.838-1.842-4.284-2.858-6.892-2.858-5.406 0-9.798 4.382-9.802 9.77-.001 1.5.395 2.964 1.15 4.3l-.986 3.6 3.689-.968.389.232zm12.534-7.143c-.303-.151-1.792-.883-2.07-.984-.277-.101-.48-.151-.68.151-.2.302-.777.984-.952 1.185-.175.201-.35.226-.653.076-1.517-.759-2.661-1.286-3.715-3.102-.28-.48.28-.446.802-1.49.088-.176.044-.328-.022-.48-.066-.151-.577-1.39-.79-1.897-.208-.5-.436-.433-.598-.441-.155-.008-.332-.01-.508-.01-.176 0-.464.066-.707.328-.242.261-.927.905-.927 2.203 0 1.298.944 2.548 1.076 2.724.131.176 1.859 2.839 4.502 3.98.629.271 1.12.433 1.503.554.632.201 1.208.173 1.663.105.507-.076 1.792-.733 2.048-1.439.256-.707.256-1.314.18-1.44-.076-.127-.278-.201-.58-.352z"/>
                              </svg>
                              Confirm on WhatsApp
                            </a>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'confirmed' })
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
                              className="w-full rounded-2xl bg-[#414E36] hover:bg-[#2e3a26] text-white py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                            >
                              Mark as Confirmed
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {((viewingBooking.status === 'confirmed') || (viewingBooking.status === 'approved' && viewingBooking.isManual)) && hasPermission("bookings.edit") && (
                    <div className="rounded-2xl border border-[#C4AE7C]/30 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1F251A] mb-2">Session Flow</p>
                      <p className="text-xs text-[#5A6A51] mb-4">The customer is ready to begin their clinical session.</p>
                      <div className="flex gap-3">
                        {viewingBooking.status === 'approved' && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'confirmed' })
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
                            className="flex-1 rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#f7f6f2] transition"
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'started' })
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
                          className="flex-1 rounded-2xl bg-[#414E36] py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center justify-center gap-1.5"
                        >
                          Start Session
                        </button>
                      </div>
                    </div>
                  )}

                  {viewingBooking.status === 'started' && hasPermission("bookings.edit") && (
                    <div className="rounded-2xl border-2 border-dashed border-[#C4AE7C]/30 bg-[#EDF1EC] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1F251A] mb-2">Session Flow</p>
                      <p className="text-xs text-[#5A6A51] mb-4">The session is currently active. End session to settle invoice.</p>
                      <button
                        onClick={() => {
                          setCheckoutBooking(viewingBooking);
                        }}
                        className="w-full rounded-2xl bg-[#C4AE7C] py-2.5 text-xs font-bold text-[#414E36] hover:bg-[#b59e6c] transition flex items-center justify-center gap-1.5 shadow-md"
                      >
                        End Session & Pay
                      </button>
                    </div>
                  )}

                  {/* Customer Information */}
                  {(() => {
                    const customerRecord = dbCustomers.find(c => c.id === viewingBooking.customerId || c.phone === viewingBooking.phone);
                    const walletBalance = customerRecord ? Number(customerRecord.wallet || customerRecord.wallet_balance || 0) : 0;
                    const spentAmount = customerRecord ? Number(customerRecord.spent || customerRecord.spent_amount || 0) : 0;
                    const outstandingAmount = customerRecord ? Number(customerRecord.outstanding || 0) : 0;

                    return (
                      <div className="overflow-hidden rounded-2xl border border-[#414E36]/10 bg-white">
                        <div className="bg-[#414E36] px-5 py-4 text-[#FBFBF9]">
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C4AE7C]/90">Customer Information</p>
                          <h4 className="mt-1 text-lg font-bold text-[#FBFBF9]">{viewingBooking.name}</h4>
                        </div>
                        <div className="p-5 space-y-4 text-sm text-[#414E36]">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Email</p>
                              <p className="mt-0.5 break-all font-semibold">{viewingBooking.email || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Phone</p>
                              <p className="mt-0.5 font-semibold">{viewingBooking.phone}</p>
                            </div>
                          </div>

                          <div className="border-t border-[#414E36]/10 pt-4 grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Wallet Balance</p>
                              <p className="mt-0.5 font-bold text-[#C4AE7C]">EGP {walletBalance.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Total Spent</p>
                              <p className="mt-0.5 font-bold text-green-600">EGP {spentAmount.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Outstanding</p>
                              <p className="mt-0.5 font-bold text-red-600">EGP {outstandingAmount.toFixed(0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Provider */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5A6A51] mb-3">Provider</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-[#C4AE7C]/20 flex items-center justify-center text-[#414E36] font-bold">
                        {(viewingBooking.doctorName || "Dr. Sara El Gamel").split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[#C4AE7C]">
                          {"★".repeat(5)}
                          <span className="text-xs text-[#5A6A51] ml-1">(5.0)</span>
                        </div>
                      </div>
                    </div>
                    <select
                      value={viewingBooking.doctorName || "Dr. Sara El Gamel"}
                      disabled={!hasPermission("bookings.edit")}
                      onChange={async (e) => {
                        const newDoc = e.target.value;
                        await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ doctorName: newDoc })
                        });
                        setViewingBooking(prev => prev ? { ...prev, doctorName: newDoc } : null);
                        fetchAllReservations();
                      }}
                      className="w-full rounded-xl border border-[#414E36]/10 bg-[#FBFBF9] px-3 py-2 text-sm font-semibold text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {providers.map((p) => (
                        <option key={p.id || p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assigned Room or Compatible Rooms */}
                  {viewingBooking.roomId ? (
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5A6A51] mb-3">Assigned Room</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#414E36]/10 flex items-center justify-center text-[#414E36]">
                          <DoorOpen size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-[#1F251A]">
                            {(() => {
                              const r = rooms.find(rm => rm.id === viewingBooking.roomId);
                              return r ? r.name : "Loading...";
                            })()}
                          </p>
                          <p className="text-xs text-[#5A6A51] capitalize">
                            {(() => {
                              const r = rooms.find(rm => rm.id === viewingBooking.roomId);
                              return r ? `${r.type} Room` : "";
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5A6A51] mb-3">Compatible Rooms</p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const compatibleList = rooms.filter(rm => viewingBooking.rooms?.includes(rm.id));
                          if (compatibleList.length === 0) {
                            return <p className="text-xs text-[#5A6A51] italic">No compatible clinical rooms configured for this service.</p>;
                          }
                          return compatibleList.map(rm => (
                            <span 
                              key={rm.id} 
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#414E36]/10 bg-[#EDF1EC] px-3 py-1 text-xs font-semibold text-[#414E36]"
                            >
                              <DoorOpen size={12} />
                              {rm.name}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Service Status */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5A6A51] mb-2">Service status</p>
                    <p className="text-[#5A6A51] italic font-semibold">No reviews</p>
                  </div>

                  {/* Invoice */}
                  {viewingBooking.status === 'completed' && (
                    <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-[#5A6A51]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F251A]">Booking Invoice</p>
                          <p className="text-xs text-[#5A6A51] mt-0.5">Generate and download invoice for this booking.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setInvoiceBooking(viewingBooking)}
                        className="mt-4 w-full rounded-2xl bg-[#414E36] py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                      >
                        Download Invoice
                      </button>
                    </div>
                  )}



                  {/* Cancel Booking Section */}
                  {hasPermission("bookings.delete") && 
                   viewingBooking.status !== 'started' && 
                   viewingBooking.status !== 'completed' && 
                   viewingBooking.status !== 'cancelled' && 
                   viewingBooking.status !== 'rejected' && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-800 mb-3">Cancel Booking</p>
                      <button
                        onClick={async () => {
                          if (await showConfirm("Are you sure you want to cancel this booking?")) {
                            const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "reject" }),
                            });
                            if (res.ok) {
                              setViewingBooking(null);
                              fetchRequests();
                              fetchAllReservations();
                              alert("Booking canceled successfully!");
                            } else {
                              alert("Failed to cancel booking.");
                            }
                          }
                        }}
                        className="w-full rounded-2xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>
        );
      })()}

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
                                  headers: { 'Content-Type': 'application/json' },
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
                  {['All', 'approved', 'pending', 'rejected', 'pending_deposit'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-2xl border px-3 py-2.5 text-xs font-bold transition ${
                        statusFilter === st
                          ? 'border-[#414E36] bg-[#414E36] text-[#FBFBF9]'
                          : 'border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f7f6f2]'
                      }`}
                    >
                      {st === 'approved' ? 'Approved' : st === 'pending' ? 'Pending' : st === 'rejected' ? 'Rejected' : st === 'pending_deposit' ? 'Pending Deposit' : 'All'}
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
              {/* 1. Phone Number at top */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="Enter phone (e.g. 01012345678)"
                  value={newPatientPhone}
                  onChange={(e) => handleManualPhoneChange(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>

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
                    <option value="in_person">In Person / في العيادة</option>
                    <option value="online">Online / أونلاين</option>
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
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4 shrink-0">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">
                  {providerModalMode === "edit" ? "Edit Doctor / Provider" : "Add Doctor / Provider"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                  {providerModalMode === "edit" ? "Modify Provider Details" : "Create New Provider"}
                </h3>
              </div>
              <button
                onClick={() => setShowProviderModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              
              {/* Row 1: Name & Specialty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Doctor's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Jane Doe"
                    value={providerFormName}
                    onChange={(e) => setProviderFormName(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Dermatologist"
                    value={providerFormSpecialty}
                    onChange={(e) => setProviderFormSpecialty(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              {/* Row 2: Phone & National ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 01012345678"
                    value={providerFormPhone}
                    onChange={(e) => setProviderFormPhone(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">National ID</label>
                  <input
                    type="text"
                    placeholder="14-digit National ID"
                    value={providerFormNationalId}
                    onChange={(e) => setProviderFormNationalId(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              {/* Row 3: Gender & Age */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Gender</label>
                  <select
                    value={providerFormGender}
                    onChange={(e) => setProviderFormGender(e.target.value as "Male" | "Female" | "")}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 35"
                    value={providerFormAge}
                    onChange={(e) => setProviderFormAge(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              {/* Row 4: Branch & Start Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Branch</label>
                  <select
                    value={providerFormBranchId}
                    onChange={(e) => setProviderFormBranchId(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  >
                    <option value="">Default/All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_en} ({b.name_ar})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={providerFormStartDate}
                    onChange={(e) => setProviderFormStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              {/* Row 5: Rating & Provider Image URL/Base64 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    placeholder="e.g. 5"
                    value={providerFormRating}
                    onChange={(e) => setProviderFormRating(Number(e.target.value))}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Doctor's Image URL or Base64</label>
                  <input
                    type="text"
                    placeholder="e.g. /images/doctors/dr-doe.jpg"
                    value={providerFormImage}
                    onChange={(e) => setProviderFormImage(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              {/* Services Offered */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Select Services Offered</label>
                <div className="max-h-[22vh] overflow-y-auto rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-2">
                  {allServicesList.map((svc) => {
                    const isChecked = providerFormSelectedServices.includes(svc.en);
                    return (
                      <label key={svc.id} className="flex items-center gap-3 cursor-pointer select-none py-1 hover:bg-gray-50 rounded px-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProviderFormSelectedServices([...providerFormSelectedServices, svc.en]);
                            } else {
                              setProviderFormSelectedServices(providerFormSelectedServices.filter(s => s !== svc.en));
                            }
                          }}
                          className="h-4.5 w-4.5 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                        />
                        <div className="text-sm text-[#1F251A]">
                          <span className="font-medium">{svc.en}</span>
                          {svc.ar && <span className="text-gray-400 text-xs ml-1.5">({svc.ar})</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Working Schedule */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2.5">Weekly Working Days & Hours</label>
                <div className="rounded-2xl border border-[#414E36]/10 bg-white p-4 space-y-3">
                  {Object.keys(providerFormWorkingDaysHours).map((day) => {
                    const sched = providerFormWorkingDaysHours[day];
                    return (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#414E36]/5 pb-2.5 last:border-0 last:pb-0">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sched.isOpen}
                            onChange={(e) => {
                              setProviderFormWorkingDaysHours({
                                ...providerFormWorkingDaysHours,
                                [day]: { ...sched, isOpen: e.target.checked }
                              });
                            }}
                            className="h-4 w-4 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                          />
                          <span className="text-xs font-bold text-[#414E36] w-24">{day}</span>
                        </label>

                        {sched.isOpen ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={sched.start}
                              onChange={(e) => {
                                setProviderFormWorkingDaysHours({
                                  ...providerFormWorkingDaysHours,
                                  [day]: { ...sched, start: e.target.value }
                                });
                              }}
                              className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-xs outline-none focus:border-[#C4AE7C]"
                            />
                            <span className="text-xs text-[#5A6A51]">to</span>
                            <input
                              type="time"
                              value={sched.end}
                              onChange={(e) => {
                                setProviderFormWorkingDaysHours({
                                  ...providerFormWorkingDaysHours,
                                  [day]: { ...sched, end: e.target.value }
                                });
                              }}
                              className="rounded-lg border border-[#414E36]/15 px-2 py-1 text-xs outline-none focus:border-[#C4AE7C]"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Off / Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="border-t border-[#414E36]/10 pt-4 mt-4 flex gap-3 shrink-0">
              <button
                onClick={handleSaveProvider}
                disabled={savingProvider}
                className="flex-1 rounded-3xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] disabled:opacity-50 text-center"
              >
                {savingProvider ? "Saving..." : providerModalMode === "edit" ? "Save Changes" : "Add Provider"}
              </button>
              <button
                onClick={() => setShowProviderModal(false)}
                className="flex-1 rounded-3xl border border-[#414E36]/20 bg-[#fff] py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] text-center"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
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
                  <p className="text-xs text-[#5A6A51] mt-0.5">Total Customers</p>
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

      {/* ── ADD/EDIT CUSTOMER MODAL ── */}
      {showCustomerFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCustomerFormModal(false); }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#FBFBF9] shadow-2xl border border-[#414E36]/10 overflow-hidden my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#414E36]/10 bg-[#F9F9F7]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1EC] text-[#414E36]">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1F251A]">
                    {selectedCustomerForEdit ? "Edit Customer Details" : "Add New Customer"}
                  </h3>
                  <p className="text-xs text-[#5A6A51]">
                    {selectedCustomerForEdit ? `Editing profile of ${custName}` : "Create a new customer profile in Supabase"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerFormModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5 custom-scrollbar">
              {customerFormError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {customerFormError}
                </div>
              )}

              {/* Personal Information section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C] mb-3">Patient Profile Details</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Mohamed Aly"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
                      placeholder="e.g. 01012345678"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="e.g. mohamed@example.com"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Age</label>
                    <input
                      type="number"
                      value={custAge}
                      onChange={(e) => setCustAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Gender</label>
                    <select
                      value={custGender}
                      onChange={(e) => setCustGender(e.target.value as any)}
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male / ذكر</option>
                      <option value="Female">Female / أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">National ID</label>
                    <input
                      type="text"
                      value={custNationalId}
                      onChange={(e) => setCustNationalId(e.target.value)}
                      placeholder="Enter 14-digit National ID"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Referral Source</label>
                    <input
                      type="text"
                      value={custReferral}
                      onChange={(e) => setCustReferral(e.target.value)}
                      placeholder="e.g. Facebook page, Friend"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Occupation</label>
                    <input
                      type="text"
                      value={custOccupation}
                      onChange={(e) => setCustOccupation(e.target.value)}
                      placeholder="e.g. Engineer, Doctor"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-[#414E36]/10" />

              {/* Address details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C] mb-3">Address & Location Details</h4>
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Address</label>
                  <input
                    type="text"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="e.g. Tagamoa, Street 90, Building 14"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              <hr className="border-[#414E36]/10" />

              {/* Financial balances */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C] mb-3">Financial Ledgers</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Wallet Balance (EGP)</label>
                    <input
                      type="number"
                      min="0"
                      value={custWallet}
                      onChange={(e) => setCustWallet(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Total Spent (EGP)</label>
                    <input
                      type="number"
                      min="0"
                      value={custSpent}
                      onChange={(e) => setCustSpent(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Outstanding Balance (EGP)</label>
                    <input
                      type="number"
                      min="0"
                      value={custOutstanding}
                      onChange={(e) => setCustOutstanding(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-[#414E36]/10" />

              {/* Status and Notes section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#C4AE7C] mb-3">Profile Status & Notes</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={custActive}
                        onChange={(e) => setCustActive(e.target.checked)}
                        className="h-4 w-4 rounded border-[#414E36]/15 text-[#414E36] focus:ring-[#C4AE7C] cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-[#1F251A]">Active Profile</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6A51] mb-1">Internal Notes (Optional)</label>
                    <textarea
                      value={custNote}
                      onChange={(e) => setCustNote(e.target.value)}
                      placeholder="Add patient history, clinic preferences, or other notes..."
                      rows={3}
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-3 py-2 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#414E36]/10 bg-[#F9F9F7]">
              <div>
                {selectedCustomerForEdit && (
                  <button
                    type="button"
                    onClick={() => setDeleteCustomerTarget(selectedCustomerForEdit)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 size={14} />
                    Delete Customer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerFormModal(false)}
                  className="rounded-lg border border-[#414E36]/15 px-4 py-2 text-sm font-medium text-[#414E36] transition hover:bg-[#EDF1EC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  disabled={savingCustomer}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#414E36] px-5 py-2.5 text-sm font-semibold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
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

      {/* ── CUSTOMER PROFILE & BOOKING HISTORY DRAWER ── */}
      {viewingCustomerProfile && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setViewingCustomerProfile(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FBFBF9] h-full shadow-2xl flex flex-col animate-slideOver overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#414E36]/10 bg-[#F9F9F7]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF1EC] text-[#414E36] border border-[#414E36]/10">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1F251A]">{viewingCustomerProfile.name}</h3>
                  <p className="text-xs text-[#5A6A51]">Patient Profile & Clinic Engagement History</p>
                </div>
              </div>
              <button
                onClick={() => setViewingCustomerProfile(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:bg-[#EDF1EC] hover:text-[#414E36]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Profile Details Cards */}
              <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#C4AE7C]">Personal Profile</h4>
                  {hasPermission("customers.edit") && (
                    <button
                      onClick={() => {
                        handleOpenEditCustomer(viewingCustomerProfile);
                        setViewingCustomerProfile(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#414E36]/15 bg-[#EDF1EC]/40 px-3 py-1.5 text-xs font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]"
                    >
                      <Pencil size={12} /> Edit Profile
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Phone Number</span>
                    <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.mobile || viewingCustomerProfile.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Email Address</span>
                    <span className="font-semibold text-[#1F251A] break-all">{viewingCustomerProfile.email || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Age</span>
                    <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.age || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Gender</span>
                    <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.gender || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">National ID</span>
                    <span className="font-semibold text-[#1F251A] font-mono">{viewingCustomerProfile.national_id || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Referral Source</span>
                    <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.referral || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Occupation</span>
                    <span className="font-semibold text-[#1F251A]">{viewingCustomerProfile.occupation || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Profile Status</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                      viewingCustomerProfile.active !== false ? "text-green-700" : "text-gray-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${viewingCustomerProfile.active !== false ? "bg-green-600" : "bg-gray-400"}`} />
                      {viewingCustomerProfile.active !== false ? "Active Patient" : "Inactive"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Address</span>
                    <span className="font-semibold text-[#1F251A] block bg-[#F9F9F7] px-3 py-2 rounded-lg border border-[#414E36]/5">
                      {viewingCustomerProfile.address || [
                        viewingCustomerProfile.building_no,
                        viewingCustomerProfile.street_name,
                        viewingCustomerProfile.floor_no,
                        viewingCustomerProfile.area,
                        viewingCustomerProfile.location_name
                      ].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  {viewingCustomerProfile.note && (
                    <div className="col-span-2">
                      <span className="block text-xs font-bold text-[#5A6A51] uppercase tracking-wider mb-0.5">Notes & Observations</span>
                      <p className="text-xs text-[#5A6A51] bg-amber-50/40 border border-amber-200/50 rounded-xl p-3 leading-relaxed">
                        {viewingCustomerProfile.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking History Card */}
              <div className="bg-white rounded-2xl border border-[#414E36]/10 p-5 space-y-4">
                <div className="border-b border-[#414E36]/10 pb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#C4AE7C]">Booking History</h4>
                  <span className="text-xs font-semibold bg-[#EDF1EC] text-[#414E36] px-2.5 py-1 rounded-md">
                    Total: {
                      allReservations.filter(
                        (r) =>
                          r.phone === (viewingCustomerProfile.mobile || viewingCustomerProfile.phone) ||
                          r.customerId === viewingCustomerProfile.id
                      ).length
                    }
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#E6E9EB]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] font-bold text-[#5A6A51] uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3 text-left">Date / Slot</th>
                        <th className="px-4 py-3 text-left">Service</th>
                        <th className="px-4 py-3 text-left">Provider</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Left</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {(() => {
                        const history = allReservations.filter(
                          (r) =>
                            r.phone === (viewingCustomerProfile.mobile || viewingCustomerProfile.phone) ||
                            r.customerId === viewingCustomerProfile.id
                        );
                        if (history.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-gray-400 italic">
                                No booking history records found for this patient.
                              </td>
                            </tr>
                          );
                        }
                        return history.map((res) => {
                          const resDt = new Date(res.date);
                          const formattedDate = resDt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                          const serv = localServices.find(s => s.id === res.serviceId)?.en || `Service #${res.serviceId}`;
                          const statusClass = getStatusBadgeClass(res.status);

                          const pricesMap: Record<number, number> = {
                            1: 400, 2: 500, 3: 450, 4: 600, 5: 800, 6: 700, 7: 1500,
                            11: 600, 12: 500, 13: 800, 14: 1200, 15: 1500, 16: 1000, 17: 400,
                            21: 300, 22: 350, 23: 300,
                            31: 400, 32: 350, 33: 400, 34: 500
                          };
                          const serviceCost = localServices.find(s => s.id === res.serviceId)?.price ?? pricesMap[res.serviceId] ?? 500;
                          const spent = res.amountPaid ?? 0;
                          const left = res.amountLeft !== undefined && res.amountLeft !== null ? res.amountLeft : Math.max(0, serviceCost - spent);

                          return (
                            <tr key={res.id} className="hover:bg-[#F9F9F7]">
                              <td className="px-4 py-3">
                                <span className="block font-semibold text-[#1F251A]">{formattedDate}</span>
                                <span className="text-[10px] text-[#5A6A51]">{res.timeSlot || res.requestedTime || "—"}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#1F251A]">{serv}</td>
                              <td className="px-4 py-3">{res.doctorName || "—"}</td>
                              <td className="px-4 py-3 text-right font-medium text-green-700">{spent} EGP</td>
                              <td className="px-4 py-3 text-right font-medium text-red-600">{left} EGP</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
                                  {res.status}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-[#414E36]/10 bg-[#F9F9F7]">
              <button
                type="button"
                onClick={() => setViewingCustomerProfile(null)}
                className="rounded-lg border border-[#414E36]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#414E36] transition hover:bg-[#EDF1EC]"
              >
                Close Profile
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
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-[#414E36]/15 bg-[#F9F9F7] px-4 py-3 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                      disabled={setupLoading}
                      autoFocus
                    />
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

      {/* ── PAYMENT SETTLEMENT MODAL ── */}
      {checkoutBooking && (
        (() => {
          // 1. Calculate service cost
          const svcIds = Array.isArray(checkoutBooking.serviceIds) ? checkoutBooking.serviceIds : [checkoutBooking.serviceId];
          const bookingServicesList = svcIds.map((id: number) => {
            const s = localServices.find(srv => srv.id === id);
            return {
              name: s?.en || `Service #${id}`,
              price: s?.price ?? 500
            };
          });
          const totalCost = bookingServicesList.reduce((sum: number, s: any) => sum + s.price, 0);

          // 2. Fetch customer details
          const customerRecord = dbCustomers.find(c => c.id === checkoutBooking.customerId || c.phone === checkoutBooking.phone);
          const walletBalance = customerRecord ? Number(customerRecord.wallet || customerRecord.wallet_balance || 0) : 0;

          // 3. Math calculation
          const walletDeduction = useWalletBalance ? Math.min(walletBalance, totalCost) : 0;
          const netDue = Math.max(0, totalCost - walletDeduction);
          
          const amountPaidNum = parseFloat(checkoutAmountPaid) || 0;
          const diff = amountPaidNum - netDue;

          const changeAmount = diff > 0 ? diff : 0;
          const remainingAmount = diff < 0 ? -diff : 0;

          const handleConfirmCheckout = async () => {
            setSavingCheckout(true);
            try {
              const res = await fetch(`/api/reservations?id=${checkoutBooking.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "completed",
                  amountPaid: amountPaidNum,
                  amountLeft: remainingAmount,
                  walletWithdrawal: walletDeduction,
                  walletDeposit: changeAmount > 0 && depositChangeToWallet ? changeAmount : 0
                })
              });
              if (res.ok) {
                setCheckoutBooking(null);
                setCheckoutAmountPaid("");
                setUseWalletBalance(false);
                setDepositChangeToWallet(true);
                // Refresh list and details
                fetchAllReservations();
                fetchCustomers();
                // Close the viewing booking drawer if open
                setViewingBooking(null);
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-3xl bg-[#FBFBF9] p-6 shadow-2xl border border-[#414E36]/10">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C4AE7C]">Invoice Checkout</p>
                    <h3 className="text-xl font-bold text-[#1F251A] mt-1">Payment Settlement</h3>
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutBooking(null);
                      setCheckoutAmountPaid("");
                      setUseWalletBalance(false);
                      setDepositChangeToWallet(true);
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
                  <div className="rounded-2xl border border-[#414E36]/10 bg-[#EDF1EC]/30 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51] mb-1">Services List / الخدمات</p>
                    {bookingServicesList.map((svc: any, idx: number) => (
                      <div key={idx} className="flex justify-between font-medium">
                        <span className="text-[#1F251A]">{svc.name}</span>
                        <span>{svc.price} EGP</span>
                      </div>
                    ))}
                    <div className="border-t border-[#414E36]/10 pt-2 flex justify-between font-bold text-[#1F251A] text-base">
                      <span>Total Cost / الإجمالي</span>
                      <span>{totalCost} EGP</span>
                    </div>
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
                        Net Due / المطلوب
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
                        Amount Paid / المدفوع
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
                          Put change in customer's wallet / حفظ الباقي في المحفظة
                        </span>
                      </label>
                    </div>
                  )}

                  {remainingAmount > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex justify-between font-bold text-red-800 text-sm">
                      <span>Outstanding Balance / المتبقي دين</span>
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
                      setDepositChangeToWallet(true);
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
          // 1. Calculate service cost
          const svcIds = Array.isArray(invoiceBooking.serviceIds) ? invoiceBooking.serviceIds : [invoiceBooking.serviceId];
          const bookingServicesList = svcIds.map((id: number) => {
            const s = localServices.find(srv => srv.id === id);
            return {
              name: s?.en || `Service #${id}`,
              nameAr: s?.ar || `خدمة #${id}`,
              price: s?.price ?? 500
            };
          });
          const totalCost = bookingServicesList.reduce((sum: number, s: any) => sum + s.price, 0);
          
          // 2. Fetch customer and branch details
          const walletUsed = Math.max(0, totalCost - (invoiceBooking.amountPaid ?? 0) - (invoiceBooking.amountLeft ?? 0));
          const branch = branches.find(b => b.id === invoiceBooking.branchId);
          const branchName = branch ? (isRTL ? branch.name_ar : branch.name_en) : "Revera Zayed Clinic";
          const invoiceNo = `REV-INV-${invoiceBooking.id.slice(0, 8).toUpperCase()}`;

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-3xl rounded-[32px] bg-white p-8 shadow-2xl border border-[#414E36]/10 my-8">
                
                {/* Header Actions */}
                <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4 mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C4AE7C]">Invoice Preview</span>
                    <h3 className="text-lg font-bold text-[#1F251A] mt-0.5 font-sans">Booking Invoice Details</h3>
                  </div>
                  <button
                    onClick={() => setInvoiceBooking(null)}
                    className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Printable Invoice Container */}
                <div className="border border-gray-100 rounded-3xl p-6 sm:p-8 bg-[#FBFBF9]/30">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#414E36]/20">
                    <div>
                      <h1 className="text-xl font-bold tracking-wider text-[#414E36]" style={{ fontFamily: "Marcellus, serif" }}>REVERA CLINICS</h1>
                      <p className="text-xs text-[#5A6A51] mt-1 font-semibold">Sheikh Zayed / New Cairo</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Phone: (+20) 01035595691</p>
                      <p className="text-[11px] text-gray-400">Email: inquiries@reveraclinics.com</p>
                    </div>
                    <div className="sm:text-right">
                      <h2 className="text-2xl font-bold tracking-wide text-[#C4AE7C]" style={{ fontFamily: "Marcellus, serif" }}>INVOICE</h2>
                      <p className="text-xs text-[#1F251A] mt-1.5 font-bold">No: {invoiceNo}</p>
                      <p className="text-[11px] text-[#5A6A51] mt-0.5">Date: {invoiceBooking.date}</p>
                    </div>
                  </div>

                  {/* Customer / Billing Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs leading-relaxed">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2 border-b pb-1">Billed To</p>
                      <p className="font-bold text-[#1F251A] text-sm">{invoiceBooking.name}</p>
                      <p className="text-[#5A6A51] mt-1"><strong>Phone:</strong> {invoiceBooking.phone}</p>
                      <p className="text-[#5A6A51]"><strong>Email:</strong> {invoiceBooking.email || "—"}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A51] mb-2 border-b pb-1">Booking Details</p>
                      <p className="text-[#5A6A51]"><strong>Doctor:</strong> {invoiceBooking.doctorName || "—"}</p>
                      <p className="text-[#5A6A51] mt-0.5"><strong>Time Slot:</strong> {invoiceBooking.timeSlot || "—"}</p>
                      <p className="text-[#5A6A51] mt-0.5"><strong>Branch:</strong> {branchName}</p>
                    </div>
                  </div>

                  {/* Table of Services */}
                  <div className="overflow-x-auto my-6 border border-gray-100 rounded-2xl bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#EDF1EC] text-[#414E36] font-bold border-b border-gray-100">
                          <th className="p-3 text-left">Service Rendered</th>
                          <th className="p-3 text-center w-16">Qty</th>
                          <th className="p-3 text-right w-24">Unit Price</th>
                          <th className="p-3 text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bookingServicesList.map((s: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3 font-semibold text-[#1F251A]">{s.name}</td>
                            <td className="p-3 text-center text-gray-500">1</td>
                            <td className="p-3 text-right text-gray-600">EGP {s.price.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-[#1F251A]">EGP {s.price.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing Summary */}
                  <div className="flex justify-end text-xs my-6">
                    <div className="w-64 space-y-2.5">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-[#1F251A]">EGP {totalCost.toLocaleString()}</span>
                      </div>
                      {walletUsed > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Paid from Wallet:</span>
                          <span className="font-bold">- EGP {walletUsed.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#414E36] pt-2 text-sm font-bold text-[#414E36]">
                        <span>Amount Paid:</span>
                        <span>EGP {invoiceBooking.amountPaid.toLocaleString()}</span>
                      </div>
                      {invoiceBooking.amountLeft > 0 && (
                        <div className="flex justify-between font-bold text-red-600">
                          <span>Outstanding Due:</span>
                          <span>EGP {invoiceBooking.amountLeft.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thank you */}
                  <div className="text-center text-[10px] text-gray-400 mt-6 pt-4 border-t border-dashed border-gray-200">
                    <p>Thank you for choosing Revera Clinics!</p>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setInvoiceBooking(null)}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handlePrintInvoice(invoiceBooking, bookingServicesList, totalCost, walletUsed, branchName)}
                    className="rounded-xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition flex items-center gap-1.5 shadow-md"
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

    </div>
  );
}
