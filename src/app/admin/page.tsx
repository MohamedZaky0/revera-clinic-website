"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ServiceItem } from "@/lib/services";
import { 
  getServiceToggles, 
  setServiceToggle, 
  getDynamicCategories, 
  saveDynamicCategories, 
  getDynamicServices, 
  saveDynamicServices,
  LocalCategory 
} from "@/lib/serviceStore";
import {
  ArrowLeft,
  ArrowRight,
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
} from "lucide-react";

type Req = {
  id: string;
  serviceId: number;
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
};

const SLOTS = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
];

const SIDEBAR_ITEMS = [
  { label: "Bookings", icon: CalendarDays },
  { label: "Customers", icon: Users },
  { label: "Providers", icon: ShieldCheck },
  { label: "Services", icon: Layers },
  { label: "Target Bonuses", icon: Trophy },
  { label: "Prescriptions", icon: FileText },
  { label: "Coupons", icon: Ticket },
  { label: "E-Commerce", icon: ShoppingBag },
  { label: "Finances", icon: CircleDollarSign, submenu: true },
  { label: "Insights", icon: BarChart3 },
  { label: "Reports", icon: FileText, submenu: true },
  { label: "Inventory", icon: Package, submenu: true },
  { label: "SMS Management", icon: MessageSquare, submenu: true },
  { label: "Settings", icon: Settings, submenu: true },
  { label: "Logout", icon: LogOut },
];

const overviewCards = [
  { label: "Active bookings", value: "34", accent: "bg-[#C4AE7C]/10", icon: CalendarDays },
  { label: "New customers", value: "14", accent: "bg-[#C4AE7C]/10", icon: Users },
  { label: "Revenue", value: "$76K", accent: "bg-[#C4AE7C]/10", icon: DollarSign },
  { label: "Open requests", value: "9", accent: "bg-[#C4AE7C]/10", icon: FileText },
];

const DEFAULT_PROVIDERS = [
  {
    id: "seed-1",
    name: "Dr. Ahmed Medhat",
    bookings: 0,
    services: ["Tattoo Removal (Small)", "Tattoo Removal (Medium)"],
    more: 4,
    rating: 5,
  },
  {
    id: "seed-2",
    name: "Dr. Radwa Seif",
    bookings: 0,
    services: ["Physio: Basic Relief (3)", "Physio: Standard Recovery (6)"],
    more: 4,
    rating: 5,
  },
  {
    id: "seed-3",
    name: "Dr. Sara El Gamel",
    bookings: 1,
    services: ["Half Arm", "Full Arms"],
    more: 14,
    rating: 5,
  },
];

const TARGET_BONUSES = [] as const;

type Customer = {
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  bookings: number;
  spent: number;
  outstanding: number;
  wallet: number;
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

export default function AdminPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [allReservations, setAllReservations] = useState<Req[]>([]);
  const [providers, setProviders] = useState<any[]>(DEFAULT_PROVIDERS);

  function fetchProviders() {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProviders(data);
        } else {
          setProviders(DEFAULT_PROVIDERS);
        }
      })
      .catch((err) => {
        console.error("fetchProviders error:", err);
        setProviders(DEFAULT_PROVIDERS);
      });
  }

  const handleAddProvider = async () => {
    const name = window.prompt("Enter new doctor's name:");
    if (!name) return;
    const servicesStr = window.prompt("Enter services (comma-separated, e.g., Laser, Dermatology):");
    const services = servicesStr ? servicesStr.split(",").map(s => s.trim()) : [];
    
    const newProvider = {
      name,
      services,
      bookings: 0,
      more: services.length > 2 ? services.length - 2 : 0,
      rating: 5,
    };

    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProvider),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setProviders(prev => [...prev, saved]);
    } catch (err) {
      alert("Failed to add provider: " + err);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/providers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setProviders(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      // Fallback local filter if seed provider has no db ID
      setProviders(prev => prev.filter(p => p.name !== name));
      console.warn("Deleted locally, DB delete failed:", err);
    }
  };
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Req | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Req | null>(null);
  const [doctorName, setDoctorName] = useState<string>("Dr. Sara El Gamel");
  const [slot, setSlot] = useState<string>("12:00");
  const [activeNav, setActiveNav] = useState("Bookings");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providerTab, setProviderTab] = useState<"Providers" | "Attendance">("Providers");
  const [branch, setBranch] = useState("Zayed");
  const [lang, setLang] = useState<"EN" | "AR">("AR");
  const [notifCount] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
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
  const [scheduleDate, setScheduleDate] = useState<Date>(() => new Date());
  const [scheduleProviderFilter, setScheduleProviderFilter] = useState<string>("All");
  const [scheduleServiceFilter, setScheduleServiceFilter] = useState<string>("All");

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
      if (!reservation.date || reservation.status !== 'approved') return;
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

    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLocalServices(data);
          localStorage.setItem("revera_dynamic_services", JSON.stringify(data));
        }
      })
      .catch((err) => console.error("Admin: fetch services failed", err));

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLocalCategories(data);
          localStorage.setItem("revera_dynamic_categories", JSON.stringify(data));
        }
      })
      .catch((err) => console.error("Admin: fetch categories failed", err));
  }, []);
  const BRANCHES = ["Zayed", "Maadi", "Heliopolis", "New Cairo"];

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
  const [reportsCustomerSearch, setReportsCustomerSearch] = useState("");
  const [smsTemplateSearch, setSmsTemplateSearch] = useState("");
  const [smsLogSearch, setSmsLogSearch] = useState("");
  const [settingsUserSearch, setSettingsUserSearch] = useState("");
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

  // Derive unique customers from all reservations
  const customers = useMemo<Customer[]>(() => {
    const map = new globalThis.Map<string, Customer>();
    allReservations.forEach((r) => {
      if (!map.has(r.email)) {
        map.set(r.email, {
          email: r.email,
          name: r.name,
          phone: r.phone,
          createdAt: r.createdAt ?? r.date,
          bookings: 0,
          spent: 0,
          outstanding: 0,
          wallet: 0,
        });
      }
      map.get(r.email)!.bookings += 1;
    });
    return Array.from(map.values());
  }, [allReservations]);

  const dynamicOverviewCards = useMemo(() => {
    const activeBookings = allReservations.filter((r) => r.status === "approved");
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
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  useEffect(() => {
    fetchRequests();
    fetchAllReservations();
    fetchProviders();
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      setSidebarOpen(false);
    });
  }, [activeNav]);

  function fetchRequests() {
    setLoading(true);
    fetch("/api/reservations?status=pending")
      .then((r) => r.json())
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
        console.error("fetchRequests error:", err);
        setRequests([]);
        setLoading(false);
      });
  }

  function fetchAllReservations() {
    fetch("/api/reservations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllReservations(data);
        } else {
          console.error("fetchAllReservations: expected array, got", data);
          setAllReservations([]);
        }
      })
      .catch((err) => {
        console.error("fetchAllReservations error:", err);
        setAllReservations([]);
      });
  }

  async function openApprove(r: Req) {
    setSelected(r);
    const qs = `serviceId=${r.serviceId}&date=${r.date}&status=approved`;
    const taken = await fetch("/api/reservations?" + qs).then((res) => res.json());
    const takenSlots = taken.map((t: Req) => t.timeSlot).filter(Boolean);
    const first = SLOTS.find((s) => !takenSlots.includes(s)) || SLOTS[0];
    setSlot(first);
    setDoctorName("Dr. Sara El Gamel");
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
    fetchRequests();
    fetchAllReservations();
  }

  async function handleCreateManualBooking() {
    if (!newPatientName || !newPatientEmail || !newPatientPhone || !newPatientDate) {
      alert("Please fill in all required fields (Name, Email, Phone, Date).");
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

  const calendarDays = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

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
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-[#C4AE7C]/15 p-3">
                <Image
                  src="/images/main_logo.png"
                  alt="Revera Clinics"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#FBFBF9]/70">
                  Revera Clinics
                </p>
                <h1 className="text-xl font-semibold">Admin</h1>
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
            {SIDEBAR_ITEMS.map((item) => {
              if (item.label === "Prescriptions") {
                const Icon = item.icon;
                const active = activeNav === "All Prescriptions" || activeNav === "Medicine Library";
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPrescriptionsExpanded(!prescriptionsExpanded);
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
                          prescriptionsExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {prescriptionsExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        <button
                          type="button"
                          onClick={() => setActiveNav("All Prescriptions")}
                          className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                            activeNav === "All Prescriptions"
                              ? "bg-[#FBFBF9]/10 text-[#FBFBF9] border-l-[3px] border-[#C4AE7C] pl-3 rounded-l-none"
                              : "text-[#FBFBF9]/70 hover:bg-[#FBFBF9]/5 hover:text-[#FBFBF9]"
                          }`}
                        >
                          <FileText size={14} className={activeNav === "All Prescriptions" ? "text-[#C4AE7C]" : "text-[#FBFBF9]/60"} />
                          <span>All Prescriptions</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNav("Medicine Library")}
                          className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                            activeNav === "Medicine Library"
                              ? "bg-[#FBFBF9]/10 text-[#FBFBF9] border-l-[3px] border-[#C4AE7C] pl-3 rounded-l-none"
                              : "text-[#FBFBF9]/70 hover:bg-[#FBFBF9]/5 hover:text-[#FBFBF9]"
                          }`}
                        >
                          <Box size={14} className={activeNav === "Medicine Library" ? "text-[#C4AE7C]" : "text-[#FBFBF9]/60"} />
                          <span>Medicine Library</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              if (item.label === "E-Commerce") {
                const Icon = item.icon;
                const active = [
                  "Products",
                  "Product Categories",
                  "Suppliers",
                  "Purchases",
                  "Batch Management",
                  "POS System",
                  "POS Orders",
                  "Sales Dashboard",
                  "Refunds",
                  "Shipping Methods",
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setECommerceExpanded(!eCommerceExpanded);
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
                          eCommerceExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {eCommerceExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        {[
                          { label: "Products", icon: ShoppingBag },
                          { label: "Product Categories", icon: Layers },
                          { label: "Suppliers", icon: Store },
                          { label: "Purchases", icon: CreditCard },
                          { label: "Batch Management", icon: Box },
                          { label: "POS System", icon: Monitor },
                          { label: "POS Orders", icon: Receipt },
                          { label: "Sales Dashboard", icon: BarChart3 },
                          { label: "Refunds", icon: Undo },
                          { label: "Shipping Methods", icon: Truck },
                        ].map((sub) => {
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

              if (item.label === "Finances") {
                const Icon = item.icon;
                const active = [
                  "Expense Categories",
                  "Transactions",
                  "Expenses",
                  "Payroll",
                  "Finances Dashboard",
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFinancesExpanded(!financesExpanded);
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
                          financesExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {financesExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        {[
                          { label: "Expense Categories", icon: Layers },
                          { label: "Transactions", icon: CircleDollarSign },
                          { label: "Expenses", icon: CircleDollarSign },
                          { label: "Payroll", icon: CircleDollarSign },
                          { label: "Dashboard", icon: Presentation, targetNav: "Finances Dashboard" },
                        ].map((sub) => {
                          const SubIcon = sub.icon;
                          const targetVal = sub.targetNav || sub.label;
                          const subActive = activeNav === targetVal;
                          return (
                            <button
                              key={sub.label}
                              type="button"
                              onClick={() => setActiveNav(targetVal)}
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

              if (item.label === "Reports") {
                const Icon = item.icon;
                const active = [
                  "Transaction Reports",
                  "Customer Transaction History",
                  "Provider Performance Reports",
                  "Provider Performance Date Range Reports",
                  "Service Performance Reports",
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setReportsExpanded(!reportsExpanded);
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
                          reportsExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {reportsExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        {[
                          { label: "Transaction Reports", icon: CircleDollarSign },
                          { label: "Customer Transaction History", icon: CircleUser },
                          { label: "Provider Performance Reports", icon: Presentation },
                          { label: "Provider Performance Date Range Reports", icon: Presentation },
                          { label: "Service Performance Reports", icon: BarChart3 },
                        ].map((sub) => {
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

              if (item.label === "Inventory") {
                const Icon = item.icon;
                const active = [
                  "Product Categories",
                  "Products",
                  "Procurement",
                  "Adjustments",
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryExpanded(!inventoryExpanded);
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
                          inventoryExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {inventoryExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        {[
                          { label: "Product Categories", icon: Layers },
                          { label: "Products", icon: Tag },
                          { label: "Procurement", icon: PlusCircle },
                          { label: "Adjustments", icon: Pencil },
                        ].map((sub) => {
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

              if (item.label === "SMS Management") {
                const Icon = item.icon;
                const active = [
                  "SMS Templates",
                  "End User Groups",
                  "SMS Automation",
                  "Marketing Campaigns",
                  "Instant SMS",
                  "SMS Logs",
                  "Follow-up",
                ].includes(activeNav);
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSMSExpanded(!smsExpanded);
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
                          smsExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {smsExpanded && (
                      <div className="mt-1 space-y-1 overflow-hidden rounded-2xl bg-black/15 py-1.5 pl-3 pr-1">
                        {[
                          { label: "SMS Templates", icon: MessageSquare },
                          { label: "End User Groups", icon: Users },
                          { label: "SMS Automation", icon: Settings },
                          { label: "Marketing Campaigns", icon: Megaphone },
                          { label: "Instant SMS", icon: Quote },
                          { label: "SMS Logs", icon: MessageSquare },
                          { label: "Follow-up", icon: Megaphone },
                        ].map((sub) => {
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

              if (item.label === "Settings") {
                const Icon = item.icon;
                const active = [
                  "Profile",
                  "Service Hours",
                  "Branches",
                  "Users",
                  "Manage Areas",
                  "Roles and permissions",
                  "SMS Configuration",
                  "Medical Forms",
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
                          { label: "Profile", icon: User },
                          { label: "Service Hours", icon: Clock },
                          { label: "Branches", icon: MapIcon },
                          { label: "Users", icon: Users },
                          { label: "Manage Areas", icon: MapIcon },
                          { label: "Roles and permissions", icon: Shield },
                          { label: "SMS Configuration", icon: MessageSquare },
                          { label: "Medical Forms", icon: ClipboardList },
                        ].map((sub) => {
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
                  onClick={() => setActiveNav(item.label)}
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
              <button
                onClick={() => setLang(lang === "AR" ? "EN" : "AR")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36] text-sm font-bold text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26]"
                title="Toggle language"
              >
                {lang === "AR" ? "ع" : "EN"}
              </button>
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="appearance-none rounded-xl border border-[#414E36]/15 bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#1F251A] shadow-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20 cursor-pointer"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
              </div>
            </div>

            {/* Right: new entry, notifications, user profile */}
            <div className="flex items-center gap-3">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36] text-[#FBFBF9] shadow-sm transition hover:bg-[#2e3a26]">
                <Plus size={18} />
              </button>
              <div className="relative">
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/8 text-[#414E36] transition hover:bg-[#414E36]/15">
                  <Bell size={18} />
                </button>
                {notifCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {notifCount}
                  </span>
                )}
              </div>
              <button className="flex items-center gap-2 rounded-xl border border-[#414E36]/10 bg-white px-3 py-1.5 text-sm font-medium text-[#1F251A] shadow-sm transition hover:bg-[#f5f4f0]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#414E36] text-white text-xs font-bold">RC</span>
                <span>Revera Clinics</span>
                <ChevronDown size={14} className="text-[#5A6A51]" />
              </button>
            </div>
          </div>

          <div className="py-8">

          {/* ── PROVIDERS VIEW ── */}
          {activeNav === "Providers" && (
            <section className="space-y-6">
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h1 className="text-4xl font-semibold text-[#1F251A]">Providers</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#5A6A51]">
                      <button
                        type="button"
                        onClick={() => setProviderTab("Providers")}
                        className={`rounded-full px-5 py-3 transition ${
                          providerTab === "Providers"
                            ? "bg-[#414E36] text-[#FBFBF9]"
                            : "bg-[#F2EFE9] text-[#5A6A51] hover:bg-[#EDF1EC]"
                        }`}
                      >
                        Providers
                      </button>
                      <button
                        type="button"
                        onClick={() => setProviderTab("Attendance")}
                        className={`rounded-full px-5 py-3 transition ${
                          providerTab === "Attendance"
                            ? "bg-[#414E36] text-[#FBFBF9]"
                            : "bg-[#F2EFE9] text-[#5A6A51] hover:bg-[#EDF1EC]"
                        }`}
                      >
                        Attendance
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button className="inline-flex items-center gap-2 rounded-3xl border border-[#E6E9EB] bg-white px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:border-[#C4AE7C]/40 hover:bg-[#FBFBF9]">
                      <Filter size={16} /> Filter
                    </button>
                    <button 
                      onClick={handleAddProvider}
                      className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-0 border-b border-[#E6E9EB] bg-[#F7F7F9] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                    <span>Name</span>
                    <span>Bookings</span>
                    <span>Services</span>
                    <span>Rating</span>
                  </div>
                  <div className="divide-y divide-[#E6E9EB]">
                    {providers.map((provider) => (
                      <div key={provider.name} className="grid grid-cols-[2fr_1fr_2fr_1fr] items-center gap-0 px-6 py-5 text-sm text-[#414E36]">
                        <span className="font-semibold text-[#1F251A]">{provider.name}</span>
                        <span>{provider.bookings}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {provider.services.map((service: string) => (
                            <span key={service} className="rounded-full border border-[#E6E9EB] bg-[#F2EFE9] px-3 py-1 text-[11px] font-medium text-[#414E36]">
                              {service}
                            </span>
                          ))}
                          <span className="rounded-full bg-[#EDE4C8] px-3 py-1 text-[11px] font-semibold text-[#414E36]">
                            +{provider.more}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 text-[#5A6A51]">
                            <Star size={16} className="text-[#C4AE7C]" />
                            {provider.rating}
                          </span>
                          <div className="flex items-center gap-2">
                            <button className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#E6E9EB] bg-[#F7F7F9] text-[#414E36] transition hover:bg-[#EDF1EC]">
                              <Info size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProvider(provider.id, provider.name)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-100 bg-[#FFF5F5] text-red-600 transition hover:bg-red-100"
                              title="Delete provider"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                      <button
                        onClick={() => toggleCategoryExpand(cat.key)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#F9F9F7]"
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#414E36]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#414E36] transition hover:bg-[#EDF1EC]"
                          >
                            <Plus size={12} /> Add Service
                          </button>
                          <span className="text-[#5A6A51] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                            <ChevronDown size={18} />
                          </span>
                        </div>
                      </button>

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
                                              onClick={() => toggleService(svc.id, "active")}
                                              className="relative h-6 w-11 rounded-full focus:outline-none transition-colors duration-300"
                                              style={{ 
                                                backgroundColor: toggles.active ? "#C4AE7C" : "#d1d5db"
                                              }}
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
                                          <button
                                            type="button"
                                            onClick={() => handleEditService(svc)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#414E36]/15 text-[#5A6A51] transition hover:border-[#C4AE7C] hover:text-[#414E36]"
                                            title="Edit Service"
                                          >
                                            <Pencil size={12} />
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
                        {editingService && (
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
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setServiceImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
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
                            <option value="0:30 Hours">0:30 Hours</option>
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
              {/* Page header */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#1F251A]">Customers</h2>
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
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Stat cards */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="min-w-[180px] rounded-2xl border border-[#414E36]/10 bg-white px-6 py-4 shadow-sm">
                  <p className="text-2xl font-bold text-[#1F251A]">0</p>
                  <p className="mt-1 text-sm text-[#5A6A51]">Remaining Amount</p>
                </div>
                <div className="min-w-[180px] rounded-2xl border border-[#414E36]/10 bg-white px-6 py-4 shadow-sm">
                  <p className="text-2xl font-bold text-[#1F251A]">0</p>
                  <p className="mt-1 text-sm text-[#5A6A51]">Total Wallet Balance</p>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers…"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Customer</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Created At</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Bookings</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Spent</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Outstanding</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Wallet</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-[#5A6A51]">
                          No customers found.
                        </td>
                      </tr>
                    )}
                    {filteredCustomers.map((c) => {
                      const dt = new Date(c.createdAt);
                      const dateStr = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
                      return (
                        <tr key={c.email} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-5 py-4 font-semibold text-[#1F251A]">{c.name}</td>
                          <td className="px-5 py-4 text-[#5A6A51]">
                            <span className="block font-medium text-[#1F251A]">{dateStr}</span>
                            <span className="text-xs">{timeStr}</span>
                          </td>
                          <td className="px-5 py-4 text-center text-[#1F251A]">{c.bookings}</td>
                          <td className="px-5 py-4 text-center text-[#1F251A]">{c.spent}</td>
                          <td className="px-5 py-4 text-center text-[#1F251A]">{c.outstanding}</td>
                          <td className="px-5 py-4 text-center text-[#1F251A]">{c.wallet}</td>
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

          {/* ── SETTINGS VIEWS ── */}
          {activeNav === "Profile" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Clinic Profile Settings</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Configure the core identity, branches, and contact settings of your clinic.</p>
              </div>
              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl">
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Clinic Brand Name</label>
                      <input type="text" defaultValue="Revera Clinics" className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Primary Branch Location</label>
                      <input type="text" defaultValue="Sheikh Zayed City, Giza" className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Inquiries Email</label>
                      <input type="email" defaultValue="info@reveraclinics.com" className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] mb-2">Inquiries Phone</label>
                      <input type="text" defaultValue="+20 2 3796 2200" className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none" />
                    </div>
                  </div>
                  <button type="submit" className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    Save Profile Changes
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeNav === "Service Hours" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Weekly Service Hours</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Configure operating schedules for Zayed and other active branches.</p>
              </div>
              <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-4">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-[#F2EFE9] pb-3 last:border-b-0 last:pb-0">
                    <span className="font-semibold text-[#1F251A] w-28">{day}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">Open</span>
                      <span className="text-xs text-[#5A6A51]">10:00 am - 8:00 pm</span>
                    </div>
                    <button className="text-xs font-bold text-[#C4AE7C] hover:underline">Edit Hours</button>
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
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> Add Branch
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)] grid gap-6 md:grid-cols-2">
                {[
                  { name: "Sheikh Zayed Branch", address: "Capital Business Park, Sheikh Zayed, Giza", status: "Active" },
                  { name: "Maadi Branch", address: "Degla Square, Street 9, Maadi, Cairo", status: "Active" },
                  { name: "Heliopolis Branch", address: "El Merghany Street, Heliopolis, Cairo", status: "Active" },
                  { name: "New Cairo Branch", address: "Fifth Settlement, Road 90, New Cairo", status: "Active" },
                ].map((br, idx) => (
                  <div key={idx} className="rounded-[32px] border border-[#E6E9EB] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div>
                      <h3 className="font-bold text-[#1F251A]">{br.name}</h3>
                      <p className="text-xs text-[#5A6A51] mt-2 leading-relaxed">{br.address}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#F2EFE9] pt-4">
                      <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">{br.status}</span>
                      <button className="text-xs font-bold text-[#414E36] hover:underline">Edit Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "Users" && (
            <div className="space-y-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-semibold text-[#1F251A]">Users</h2>
                  <p className="mt-2 text-sm text-[#5A6A51]">Manage administrative accounts, role levels, and statuses.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                  <Plus size={16} /> Invite User
                </button>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6A51]/50" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={settingsUserSearch}
                      onChange={(e) => setSettingsUserSearch(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white py-3 pl-12 pr-4 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Username</th>
                        <th className="px-6 py-4 text-left">Email Address</th>
                        <th className="px-6 py-4 text-left">Access Role</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36]">
                      {[
                        { name: "Ahmed Medhat", email: "dr.ahmed@reveraclinics.com", role: "Super Admin / Doctor", status: "Active" },
                        { name: "Mariam Salem", email: "mariam.nurse@reveraclinics.com", role: "Nurse Practitioner", status: "Active" },
                        { name: "Youssef Fadel", email: "youssef.reception@reveraclinics.com", role: "Clinic Front Desk Manager", status: "Active" },
                      ].filter(u => 
                        u.name.toLowerCase().includes(settingsUserSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(settingsUserSearch.toLowerCase())
                      ).map((user, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{user.name}</td>
                          <td className="px-6 py-5 font-mono text-xs text-[#5A6A51]">{user.email}</td>
                          <td className="px-6 py-5 text-[#5A6A51] font-semibold">{user.role}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">{user.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

          {activeNav === "Roles and permissions" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-4xl font-semibold text-[#1F251A]">Roles & Access Permissions</h2>
                <p className="mt-2 text-sm text-[#5A6A51]">Modify administrative authorization settings across system modules.</p>
              </div>
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                        <th className="px-6 py-4 text-left">Module / Feature</th>
                        <th className="px-6 py-4 text-center">Super Admin</th>
                        <th className="px-6 py-4 text-center">Doctor</th>
                        <th className="px-6 py-4 text-center">Nurse</th>
                        <th className="px-6 py-4 text-center">Receptionist</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                      {[
                        { mod: "Bookings Management", values: [true, true, true, true] },
                        { mod: "Finances & Payroll", values: [true, false, false, false] },
                        { mod: "Inventory & POS", values: [true, true, true, true] },
                        { mod: "SMS Campaigns & Setup", values: [true, false, false, false] },
                        { mod: "System Core Settings", values: [true, false, false, false] },
                      ].map((perm, idx) => (
                        <tr key={idx} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-6 py-5 font-semibold text-[#1F251A]">{perm.mod}</td>
                          {perm.values.map((v, vIdx) => (
                            <td key={vIdx} className="px-6 py-5 text-center">
                              <input type="checkbox" defaultChecked={v} disabled={vIdx === 0} className="h-4.5 w-4.5 accent-[#414E36] rounded" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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

          {/* ── BOOKINGS VIEW ── */}
          {activeNav === "Bookings" && (
          <>
          <header className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
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

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:border-[#414E36]/30">
                <Bell size={18} /> Notifications
              </button>
              <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-4 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                <Plus size={18} /> New entry
              </button>
            </div>
          </header>

          {/* ── CALENDAR VIEW SWITCHER ── */}
          <div className="mb-4 flex items-center gap-1 p-1 w-fit rounded-full border border-[#414E36]/12 bg-white shadow-sm">
            {(["Calendar", "List", "Schedule"] as const).map((view) => (
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

          {calendarView === "Calendar" && (
          <section className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
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
                  {Array.from({ length: 42 }).map((_, index) => {
                    const day = index - startWeekday + 1;
                    const isCurrentMonthDay = day > 0 && day <= daysInMonth;
                    const dateKey = isCurrentMonthDay
                      ? `${currentYear}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      : "";
                    const bookingCount = isCurrentMonthDay ? bookingCountsByDay.get(dateKey) ?? 0 : 0;
                    const today = new Date();
                    const isToday =
                      isCurrentMonthDay &&
                      today.getFullYear() === currentYear &&
                      today.getMonth() === calendarMonth.getMonth() &&
                      today.getDate() === day;

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          if (bookingCount > 0) {
                            const bookingsForDay = filteredReservations.filter(
                              (r) => String(r.date).slice(0, 10) === dateKey && r.status === 'approved'
                            );
                            if (bookingsForDay.length > 0) {
                              setViewingBooking(bookingsForDay[0]);
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
                          {isCurrentMonthDay ? day : ""}
                        </span>
                        {bookingCount > 0 && (
                          <span className="mt-4 inline-flex rounded-full bg-[#414E36] px-2.5 py-1 text-[11px] font-semibold text-[#FBFBF9]">
                            {bookingCount} booking{bookingCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {dynamicOverviewCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="min-w-[170px] rounded-3xl bg-[#F9F9F7] p-5 shadow-[0_18px_40px_rgba(47,61,41,0.05)]">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[#414E36]" style={{ backgroundColor: 'rgba(196, 174, 124, 0.12)' }}>
                        <Icon size={20} />
                      </div>
                      <p className="text-sm text-[#5A6A51]">{card.label}</p>
                      <p className="mt-3 text-3xl font-semibold text-[#1F251A]">{card.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">
                      Activity feed
                    </p>
                    <h4 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                      Today’s snapshot
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-4 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                  >
                    <Search size={18} /> Search
                  </button>
                </div>

                <div className="space-y-4">
                  {/* 1. Latest Confirmed Booking Activity */}
                  {(() => {
                    const latestApproved = allReservations.find(r => r.status === 'approved');
                    if (!latestApproved) {
                      return (
                        <div className="rounded-3xl border border-[#414E36]/10 bg-[#E8EDDF]/80 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Completed booking</p>
                          <p className="mt-2 text-base font-semibold text-[#1F251A]">
                            No completed bookings today.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div
                        onClick={() => setViewingBooking(latestApproved)}
                        className="rounded-3xl border border-[#414E36]/10 bg-[#E8EDDF]/80 p-4 cursor-pointer hover:border-[#C4AE7C]/30 transition"
                      >
                        <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">Completed booking</p>
                        <p className="mt-2 text-base font-semibold text-[#1F251A]">
                          Confirmed appointment for {latestApproved.name} with {latestApproved.doctorName || 'Dr. Sara El Gamel'}.
                        </p>
                      </div>
                    );
                  })()}

                  {/* 2. Pending Requests Summary */}
                  <div
                    onClick={() => {
                      document.getElementById("pending-approvals-section")?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="rounded-3xl border border-[#414E36]/10 bg-[#F7F7F5]/80 p-4 cursor-pointer hover:border-[#414E36]/30 transition"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">New request</p>
                    <p className="mt-2 text-base font-semibold text-[#1F251A]">
                      {requests.length === 0
                        ? "No pending reservation requests waiting."
                        : `${requests.length} new reservation request${requests.length > 1 ? "s are" : " is"} waiting.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                      Quick actions
                    </p>
                    <h4 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                      Actions & filters
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowCancellationsModal(true)}
                    className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
                  >
                    View Cancellations
                  </button>
                </div>
                <div className="grid gap-4">
                  <button
                    onClick={() => {
                      setCalendarMonth(new Date());
                      setShowTodayBookingsModal(true);
                    }}
                    className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-5 py-4 text-left text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
                  >
                    Today • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </button>
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-5 py-4 text-left text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]"
                  >
                    Filter bookings
                  </button>
                  <button
                    onClick={() => setShowActionsMenuModal(true)}
                    className="rounded-3xl bg-[#414E36] px-5 py-4 text-left text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                  >
                    Actions menu
                  </button>
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
                {filteredReservations.filter(r => r.status === 'approved').length} approved
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
                        const statusColors: Record<string, string> = {
                          approved:  'bg-[#414E36]/10 text-[#414E36]',
                          pending:   'bg-[#C4AE7C]/25 text-[#7a6a3a]',
                          rejected:  'bg-red-100 text-red-600',
                          cancelled: 'bg-red-100 text-red-500',
                          canceled:  'bg-red-100 text-red-500',
                        };
                        const statusClass = statusColors[r.status?.toLowerCase()] ?? 'bg-[#EDF1EC] text-[#5A6A51]';
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
                            <td className="px-4 py-4 text-[#5A6A51]">N/A</td>
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
            const DOCTORS = ["Dr. Sara El Gamel", "Dr. Radwa Seif", "Dr. Ahmed Medhat"];

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

            const visibleDoctors = scheduleProviderFilter === 'All'
              ? DOCTORS
              : DOCTORS.filter(d => d === scheduleProviderFilter);

            // Use ALL reservations for the day (not just filteredReservations which respects status filter)
            const dayBookings = allReservations.filter(r => {
              const rDate = r.date ? String(r.date).slice(0, 10) : null;
              if (rDate !== scheduleDateStr) return false;
              if (scheduleProviderFilter !== 'All' && (r.doctorName || 'Dr. Sara El Gamel') !== scheduleProviderFilter) return false;
              if (scheduleServiceFilter !== 'All' && (r.sessionType || '') !== scheduleServiceFilter) return false;
              return true;
            });

            // bookingMap[slotKey][doctorName] = Req[]
            const bookingMap: Record<string, Record<string, Req[]>> = {};
            dayBookings.forEach(r => {
              const doc = r.doctorName || 'Dr. Sara El Gamel';
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
                                    {cells.map(b => (
                                      <div
                                        key={b.id}
                                        title={`${b.name} — ${b.sessionType || 'Consultation'} (${b.status})`}
                                        className="flex h-full flex-col justify-center gap-1 rounded-2xl bg-[#414E36]/10 px-3 py-2 ring-1 ring-[#414E36]/20"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot[b.status?.toLowerCase()] ?? 'bg-[#5A6A51]'}`} />
                                          <p className="truncate text-xs font-semibold text-[#1F251A]">{b.name}</p>
                                        </div>
                                        <p className="truncate pl-3.5 text-[10px] text-[#5A6A51]">{b.sessionType || 'Consultation'}</p>
                                        <p className="truncate pl-3.5 text-[10px] text-[#5A6A51]/60">{b.status}</p>
                                      </div>
                                    ))}
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
              <button
                onClick={() => setShowAddBookingModal(true)}
                className="inline-flex items-center gap-2 rounded-3xl bg-[#C4AE7C] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#b59e6c]"
              >
                <Plus size={16} /> Add request
              </button>
            </div>

            {loading && <p>Loading requests…</p>}
            {!loading && requests.length === 0 && (
              <p className="rounded-3xl border border-[#414E36]/10 bg-[#EDF1EC] p-6 text-[#5A6A51]">
                No pending reservation requests at the moment.
              </p>
            )}

            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-3xl border border-[#414E36]/10 bg-[#F7F7F3] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#1F251A]">
                        {req.name}
                      </p>
                      <p className="mt-1 text-sm text-[#5A6A51]">
                        {req.email} • {req.phone}
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openApprove(req);
                      }}
                      className="rounded-3xl bg-[#414E36] px-4 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                    >
                      Approve
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
                </div>
              ))}
            </div>
          </section>
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
                <ChevronDown size={20} className="rotate-45" />
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
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-semibold text-[#414E36]">
              Assign Doctor
            </label>
            <select
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="mb-6 w-full rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C]"
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
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

      {viewingBooking && (() => {
        const service = localServices.find(s => s.id === viewingBooking.serviceId);
        const serviceName = service ? service.en : "Half Arms";
        
        // Price Details map in EGP
        const prices: Record<number, number> = {
          1: 400, 2: 500, 3: 450, 4: 600, 5: 800, 6: 700, 7: 1500,
          11: 600, 12: 500, 13: 800, 14: 1200, 15: 1500, 16: 1000, 17: 400,
          21: 300, 22: 350, 23: 300,
          31: 400, 32: 350, 33: 400, 34: 500
        };
        const cost = service?.price ?? prices[viewingBooking.serviceId] ?? 500;

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
                  </div>
                </div>
                <button
                  onClick={() => setViewingBooking(null)}
                  className="rounded-full bg-[#F2EFE9] p-2 text-[#414E36] transition hover:bg-[#e4e0d6]"
                >
                  <ChevronDown size={20} className="rotate-45" />
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
                      <p className="mt-1 text-base font-semibold text-[#1F251A]">{serviceName}</p>
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
                         className="w-full rounded-xl border border-[#414E36]/15 bg-white px-2 py-1 text-sm font-semibold text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer"
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
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">SERVICES</p>
                      <p className="text-sm text-[#1F251A] mt-1 font-semibold">{serviceName}</p>
                    </div>
                    <button className="rounded-2xl border border-[#414E36]/15 px-3 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-gray-100 transition">
                      Add Service
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">EXTRA ADJUSTMENT</p>
                      <p className="text-sm text-[#1F251A] mt-1 font-semibold">0.00 EGP</p>
                    </div>
                    <button className="rounded-2xl border border-[#414E36]/15 px-3 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-gray-100 transition">
                      Adjustment
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">AMOUNT TO PAY</p>
                      <p className="text-sm text-[#d93838] mt-1 font-bold">Remaining: {cost} EGP</p>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">PRODUCTS</p>
                      <p className="text-sm text-[#5A6A51] mt-1">No products added</p>
                    </div>
                    <button className="rounded-2xl border border-[#414E36]/15 px-3 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-gray-100 transition">
                      See Products
                    </button>
                  </div>

                  {/* Prescriptions */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-[#1F251A]">Prescriptions</p>
                      <button className="rounded-2xl bg-[#414E36] px-3 py-1 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition">
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
                      <button className="mt-2 text-xs font-bold text-[#414E36] hover:underline">
                        + Create First Prescription
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-[#1F251A]">Notes</p>
                      <button
                        onClick={async () => {
                          const note = prompt("Enter note:", viewingBooking.notes || "");
                          if (note !== null) {
                            await saveNotes(note);
                            setViewingBooking(prev => prev ? { ...prev, notes: note } : null);
                          }
                        }}
                        className="rounded-2xl bg-[#414E36] px-3 py-1 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                      >
                        {viewingBooking.notes ? "Edit Note" : "+ Add Note"}
                      </button>
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
                        <button
                          onClick={async () => {
                            const note = prompt("Enter note:");
                            if (note) {
                              await saveNotes(note);
                              setViewingBooking(prev => prev ? { ...prev, notes: note } : null);
                            }
                          }}
                          className="mt-2 text-xs font-bold text-[#414E36] hover:underline"
                        >
                          Add your first note about this customer
                        </button>
                      </div>
                    )}
                  </div>

                  {viewingBooking.status === 'pending' && (
                    <div className="rounded-2xl border-2 border-[#C4AE7C]/30 bg-[#EDF1EC] p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#1F251A]">Action Required</p>
                        <p className="text-xs text-[#5A6A51] mt-0.5">This booking is pending approval. Assign a doctor and confirm details.</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setViewingBooking(null);
                            openApprove(viewingBooking);
                          }}
                          className="rounded-3xl bg-[#414E36] px-4 py-2 text-xs font-semibold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to reject this request?")) {
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
                          className="rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-2 text-xs font-semibold text-[#414E36] hover:bg-[#f7f6f2] transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  
                  {/* Customer Information */}
                  <div className="overflow-hidden rounded-2xl border border-[#414E36]/10 bg-white">
                    <div className="bg-[#414E36] px-5 py-4 text-[#FBFBF9]">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C4AE7C]/90">Customer Information</p>
                      <h4 className="mt-1 text-lg font-bold text-[#FBFBF9]">{viewingBooking.name}</h4>
                    </div>
                    <div className="p-5 space-y-4 text-sm text-[#414E36]">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Email</p>
                        <p className="mt-0.5 break-all font-semibold">{viewingBooking.email}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#5A6A51] font-semibold">Phone</p>
                        <p className="mt-0.5 font-semibold">{viewingBooking.phone}</p>
                      </div>
                    </div>
                  </div>

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
                      className="w-full rounded-xl border border-[#414E36]/10 bg-[#FBFBF9] px-3 py-2 text-sm font-semibold text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer"
                    >
                      {providers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service Status */}
                  <div className="rounded-2xl border border-[#414E36]/10 bg-white p-5 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5A6A51] mb-2">Service status</p>
                    <p className="text-[#5A6A51] italic font-semibold">No reviews</p>
                  </div>

                  {/* Invoice */}
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
                      onClick={() => alert("Invoice downloaded successfully!")}
                      className="mt-4 w-full rounded-2xl bg-[#414E36] py-2.5 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
                    >
                      Download Invoice
                    </button>
                  </div>

                  {/* Danger Zone / Remove Booking */}
                  <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-800 mb-3">Danger Zone</p>
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to permanently delete/remove this booking?")) {
                          const res = await fetch(`/api/reservations?id=${viewingBooking.id}`, {
                            method: "DELETE",
                          });
                          if (res.ok) {
                            setViewingBooking(null);
                            fetchRequests();
                            fetchAllReservations();
                          } else {
                            alert("Failed to delete booking.");
                          }
                        }
                      }}
                      className="w-full rounded-2xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition"
                    >
                      Remove Booking
                    </button>
                  </div>

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
                <ChevronDown size={20} className="rotate-45" />
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
                <ChevronDown size={20} className="rotate-45" />
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
                r => String(r.date).slice(0, 10) === todayStr && r.status === 'approved'
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
                <ChevronDown size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'approved', 'pending', 'rejected'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-2xl border px-3 py-2.5 text-xs font-bold transition ${
                        statusFilter === st
                          ? 'border-[#414E36] bg-[#414E36] text-[#FBFBF9]'
                          : 'border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f7f6f2]'
                      }`}
                    >
                      {st === 'approved' ? 'Approved' : st === 'pending' ? 'Pending' : st === 'rejected' ? 'Rejected' : 'All'}
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
                    <option key={p.name} value={p.name}>{p.name}</option>
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
                <ChevronDown size={20} className="rotate-45" />
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
              <button
                onClick={async () => {
                  if (confirm("WARNING: This will permanently delete ALL bookings and requests. Are you sure you want to proceed?")) {
                    const poolRes = await fetch('/api/reservations?id=all', {
                      method: 'DELETE'
                    });
                    if (poolRes.ok) {
                      alert("Successfully cleared all bookings!");
                      fetchRequests();
                      fetchAllReservations();
                    } else {
                      alert("Failed to clear database.");
                    }
                    setShowActionsMenuModal(false);
                  }
                }}
                className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-700 hover:bg-red-100 transition"
              >
                Clear Database Bookings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Booking Modal */}
      {showAddBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F251A]/50 p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-[32px] bg-[#FBFBF9] p-6 shadow-[0_20px_60px_rgba(31,37,26,0.25)] max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between border-b border-[#414E36]/10 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80 font-bold">Quick actions</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">Add Manual Reservation</h3>
              </div>
              <button
                onClick={() => setShowAddBookingModal(false)}
                className="rounded-full bg-[#F2EFE9] p-2.5 text-[#414E36] transition hover:bg-[#e4e0d6]"
              >
                <ChevronDown size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
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
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Booking Date *</label>
                  <input
                    type="date"
                    required
                    value={newPatientDate}
                    onChange={(e) => setNewPatientDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Service Type</label>
                  <select
                    value={newPatientService}
                    onChange={(e) => setNewPatientService(Number(e.target.value))}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer font-semibold"
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
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer font-semibold"
                  >
                    <option value="in_person">In Person / في العيادة</option>
                    <option value="online">Online / أونلاين</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Status</label>
                  <select
                    value={newPatientStatus}
                    onChange={(e) => setNewPatientStatus(e.target.value)}
                    className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer font-semibold"
                  >
                    <option value="approved">Approved (Active Booking)</option>
                    <option value="pending">Pending (Awaiting Approval)</option>
                    <option value="rejected">Rejected (Canceled Booking)</option>
                  </select>
                </div>
                {newPatientStatus === 'approved' && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Assign Doctor</label>
                    <select
                      value={newPatientDoctor}
                      onChange={(e) => setNewPatientDoctor(e.target.value)}
                      className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer font-semibold"
                    >
                      {providers.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Time Slot / Requested Time</label>
                <select
                  value={newPatientTimeSlot}
                  onChange={(e) => setNewPatientTimeSlot(e.target.value)}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] cursor-pointer font-semibold"
                >
                  {SLOTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Notes (Optional)</label>
                <textarea
                  placeholder="Add details/notes about this appointment"
                  value={newPatientNotes}
                  onChange={(e) => setNewPatientNotes(e.target.value)}
                  className="w-full min-h-[80px] rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                />
              </div>

              <div className="border-t border-[#414E36]/10 pt-4 flex gap-3">
                <button
                  onClick={handleCreateManualBooking}
                  className="flex-1 rounded-3xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition text-center"
                >
                  Create Booking
                </button>
                <button
                  onClick={() => setShowAddBookingModal(false)}
                  className="flex-1 rounded-3xl border border-[#414E36]/20 bg-white py-3 text-sm font-bold text-[#414E36] hover:bg-[#f7f6f2] transition text-center"
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
                <ChevronDown size={20} className="rotate-45" />
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
                          if (r.status === 'approved') {
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
                            {service ? service.en : `Service #${r.serviceId}`} • {r.date} {r.timeSlot ? `@ ${r.timeSlot}` : r.requestedTime ? `@ ${r.requestedTime}` : ""}
                          </p>
                          {r.doctorName && (
                            <p className="text-xs text-[#C4AE7C] mt-0.5 font-semibold">
                              Doctor: {r.doctorName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            r.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : r.status === 'rejected' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-amber-100 text-amber-800'
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

    </div>
  );
}
