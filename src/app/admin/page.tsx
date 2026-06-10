"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABELS, SERVICES } from "@/lib/services";
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
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Trophy,
  Truck,
  Undo,
  Upload,
  Users,
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
  { label: "Finances", icon: DollarSign },
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

const PROVIDERS = [
  {
    name: "Dr. Ahmed Medhat",
    bookings: 0,
    services: ["Tattoo Removal (Small)", "Tattoo Removal (Medium)"],
    more: 4,
    rating: 0,
  },
  {
    name: "Dr. Radwa Seif",
    bookings: 0,
    services: ["Physio: Basic Relief (3)", "Physio: Standard Recovery (6)"],
    more: 4,
    rating: 0,
  },
  {
    name: "Dr. Sara El Gamel",
    bookings: 1,
    services: ["Half Arm", "Full Arms"],
    more: 14,
    rating: 0,
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

export default function AdminPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [allReservations, setAllReservations] = useState<Req[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Req | null>(null);
  const [slot, setSlot] = useState<string>("12:00");
  const [activeNav, setActiveNav] = useState("Bookings");
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
  // per-service toggle state: visible & status
  const [serviceToggles, setServiceToggles] = useState<Record<number, { visible: boolean; active: boolean }>>(
    () => Object.fromEntries(SERVICES.map((s) => [s.id, { visible: true, active: true }]))
  );
  const BRANCHES = ["Zayed", "Maadi", "Heliopolis", "New Cairo"];

  const [prescriptionsExpanded, setPrescriptionsExpanded] = useState(true);
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
    if (!serviceSearch.trim()) return SERVICES;
    const q = serviceSearch.toLowerCase();
    return SERVICES.filter((s) => s.en.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q));
  }, [serviceSearch]);

  const totalServicePages = Math.ceil(filteredServices.length / SERVICE_PAGE_SIZE);
  const pagedServices = filteredServices.slice((servicePage - 1) * SERVICE_PAGE_SIZE, servicePage * SERVICE_PAGE_SIZE);

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
    setServiceToggles((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: !prev[id][field] },
    }));
  }

  function toggleMedicine(id: string, field: "visible" | "active") {
    setMedicineToggles((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: !prev[id][field] },
    }));
  }

  const [eCommerceExpanded, setECommerceExpanded] = useState(true);
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
    const map = new Map<string, Customer>();
    allReservations.forEach((r) => {
      if (!map.has(r.email)) {
        map.set(r.email, {
          email: r.email,
          name: r.name,
          phone: r.phone,
          createdAt: (r as any).createdAt ?? r.date,
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
  }, []);

  function fetchRequests() {
    setLoading(true);
    fetch("/api/reservations?status=pending")
      .then((r) => r.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function fetchAllReservations() {
    fetch("/api/reservations")
      .then((r) => r.json())
      .then((data) => setAllReservations(data))
      .catch(() => {});
  }

  async function openApprove(r: Req) {
    setSelected(r);
    const qs = `serviceId=${r.serviceId}&date=${r.date}&status=approved`;
    const taken = await fetch("/api/reservations?" + qs).then((res) => res.json());
    const takenSlots = taken.map((t: any) => t.timeSlot).filter(Boolean);
    const first = SLOTS.find((s) => !takenSlots.includes(s)) || SLOTS[0];
    setSlot(first);
  }

  async function approve() {
    if (!selected) return;
    const res = await fetch(
      "/api/reservations?id=" + encodeURIComponent(selected.id),
      {
        method: "PATCH",
        body: JSON.stringify({ action: "approve", timeSlot: slot }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const json = await res.json();
    if (!res.ok) alert(json.error || "Failed");
    setSelected(null);
    fetchRequests();
  }

  const calendarDays = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

  return (
    <div className="min-h-screen bg-[#F2EFE9] text-[#1F251A]">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside className="sticky top-0 flex h-screen flex-col bg-[#414E36] px-6 py-8 text-[#FBFBF9] shadow-[0_0_70px_rgba(0,0,0,0.08)]">
          <div className="mb-10 flex items-center gap-3">
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
                        if (activeNav !== "All Prescriptions" && activeNav !== "Medicine Library") {
                          setActiveNav("All Prescriptions");
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
                        if (!active) {
                          setActiveNav("Products");
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

        <main className="flex flex-col px-8 py-0">
          {/* Top Navigation Bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#414E36]/10 bg-[#F2EFE9]/90 px-2 py-3 backdrop-blur-md">
            {/* Left: language toggle + branch selector */}
            <div className="flex items-center gap-3">
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
                    <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
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
                    {PROVIDERS.map((provider) => (
                      <div key={provider.name} className="grid grid-cols-[2fr_1fr_2fr_1fr] items-center gap-0 px-6 py-5 text-sm text-[#414E36]">
                        <span className="font-semibold text-[#1F251A]">{provider.name}</span>
                        <span>{provider.bookings}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {provider.services.map((service) => (
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
                          <button className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#E6E9EB] bg-[#F7F7F9] text-[#414E36] transition hover:bg-[#EDF1EC]">
                            <Info size={16} />
                          </button>
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
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[#C4AE7C] px-4 py-2 text-sm font-semibold text-[#414E36] shadow-sm transition hover:bg-[#b59e6c]">
                    <Plus size={14} /> Add
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
              <div className="mb-4 flex items-center gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
                  <input
                    value={serviceSearch}
                    onChange={(e) => { setServiceSearch(e.target.value); setServicePage(1); }}
                    placeholder="Search services…"
                    className="w-full rounded-lg border border-[#414E36]/15 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C4AE7C] focus:ring-2 focus:ring-[#C4AE7C]/20"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#414E36]/10 bg-white shadow-sm">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-[#414E36]/10 bg-[#F9F9F7]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Sector</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Created At</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Branch Price</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Branches</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Sort Order</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Visible</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-[#5A6A51]">Status</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#414E36]/8">
                    {pagedServices.length === 0 && (
                      <tr><td colSpan={10} className="px-5 py-8 text-center text-[#5A6A51]">No services found.</td></tr>
                    )}
                    {pagedServices.map((svc) => {
                      const toggles = serviceToggles[svc.id] ?? { visible: true, active: true };
                      const sectorLabel = CATEGORY_LABELS[svc.cat]?.en ?? svc.cat;
                      return (
                        <tr key={svc.id} className="transition hover:bg-[#F9F9F7]">
                          <td className="px-4 py-3.5 text-[#5A6A51] font-mono text-xs">{svc.id}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block rounded-full bg-[#EDF1EC] px-2.5 py-1 text-xs font-medium text-[#414E36]">
                              {sectorLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-[#1F251A]">{svc.en}</p>
                            <p className="text-xs text-[#5A6A51]">{sectorLabel}</p>
                          </td>
                          <td className="px-4 py-3.5 text-[#5A6A51]">
                            <span className="block text-sm font-medium text-[#1F251A]">30 Apr</span>
                            <span className="text-xs">2:01 pm</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-[#C4AE7C]">EGP 0</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-[#5A6A51]">Zayed</span>
                            <span className="ml-1 text-xs font-medium text-[#C4AE7C]">[EGP 0.00]</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-medium text-[#1F251A]">0</span>
                          </td>
                          {/* Visible toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => toggleService(svc.id, "visible")}
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                              style={{ backgroundColor: toggles.visible ? "#414E36" : "#d1d5db" }}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                                style={{ transform: toggles.visible ? "translateX(18px)" : "translateX(2px)" }}
                              />
                            </button>
                          </td>
                          {/* Status toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => toggleService(svc.id, "active")}
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                              style={{ backgroundColor: toggles.active ? "#C4AE7C" : "#d1d5db" }}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                                style={{ transform: toggles.active ? "translateX(18px)" : "translateX(2px)" }}
                              />
                            </button>
                          </td>
                          <td className="px-3 py-3.5 text-center">
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
                <span>Showing {(servicePage - 1) * SERVICE_PAGE_SIZE + 1}–{Math.min(servicePage * SERVICE_PAGE_SIZE, filteredServices.length)} of {filteredServices.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setServicePage((p) => Math.max(1, p - 1))}
                    disabled={servicePage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  {Array.from({ length: totalServicePages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setServicePage(p)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                        p === servicePage
                          ? "bg-[#414E36] text-[#FBFBF9]"
                          : "border border-[#414E36]/15 bg-white text-[#414E36] hover:bg-[#f5f4f0]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setServicePage((p) => Math.min(totalServicePages, p + 1))}
                    disabled={servicePage === totalServicePages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#414E36]/15 bg-white transition hover:bg-[#f5f4f0] disabled:opacity-40"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
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
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                              style={{ backgroundColor: toggles.visible ? "#414E36" : "#d1d5db" }}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                                style={{ transform: toggles.visible ? "translateX(18px)" : "translateX(2px)" }}
                              />
                            </button>
                          </td>
                          {/* Status toggle */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => toggleMedicine(m.id, "active")}
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                              style={{ backgroundColor: toggles.active ? "#C4AE7C" : "#d1d5db" }}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                                style={{ transform: toggles.active ? "translateX(18px)" : "translateX(2px)" }}
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

          <section className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                    Booking panel
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                    June 2026 calendar
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]">
                    <ArrowLeft size={16} /> Prev
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]">
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
                  {Array.from({ length: 35 }).map((_, index) => {
                    const day = index - 2;
                    const isToday = day === 11;
                    return (
                      <div
                        key={index}
                        className={`min-h-[84px] rounded-3xl border border-transparent px-3 py-3 text-left transition ${
                          isToday
                            ? "bg-[#C4AE7C] text-[#414E36] shadow-[0_15px_45px_rgba(196,174,124,0.18)]"
                            : "hover:border-[#C4AE7C]/15 hover:bg-[#fff]"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {day > 0 && day <= 30 ? day : ""}
                        </span>
                        {isToday && (
                          <span className="mt-4 inline-flex rounded-full bg-[#414E36] px-2.5 py-1 text-[11px] font-semibold text-[#FBFBF9]">
                            5 bookings
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {overviewCards.map((card) => {
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
                    <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                      Activity feed
                    </p>
                    <h4 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                      Today’s snapshot
                    </h4>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-4 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    <Search size={18} /> Search
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-[#414E36]/10 bg-[#E8EDDF]/80 p-4">
                    <p className="text-sm text-[#5A6A51]">Completed booking</p>
                    <p className="mt-2 text-base font-semibold text-[#1F251A]">
                      Jessica updated appointment details.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-[#414E36]/10 bg-[#F7F7F5]/80 p-4">
                    <p className="text-sm text-[#5A6A51]">New request</p>
                    <p className="mt-2 text-base font-semibold text-[#1F251A]">
                      3 new reservation requests are waiting.
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
                  <button className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]">
                    View Cancellations
                  </button>
                </div>
                <div className="grid gap-4">
                  <button className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-5 py-4 text-left text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]">
                    Today • June 11, 2026
                  </button>
                  <button className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] px-5 py-4 text-left text-sm font-semibold text-[#414E36] transition hover:bg-[#f7f6f2]">
                    Filter bookings
                  </button>
                  <button className="rounded-3xl bg-[#414E36] px-5 py-4 text-left text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]">
                    Actions menu
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#5A6A51]/80">
                  Reservation requests
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-[#1F251A]">
                  Pending approvals
                </h4>
              </div>
              <button className="inline-flex items-center gap-2 rounded-3xl bg-[#C4AE7C] px-4 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#b59e6c]">
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
                      onClick={() => openApprove(req)}
                      className="rounded-3xl bg-[#414E36] px-4 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(
                          "/api/reservations?id=" + encodeURIComponent(req.id),
                          {
                            method: "PATCH",
                            body: JSON.stringify({ action: "reject" }),
                            headers: { "Content-Type": "application/json" },
                          }
                        );
                        fetchRequests();
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
              className="mb-6 w-full rounded-3xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#414E36] outline-none transition focus:border-[#C4AE7C]"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
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
    </div>
  );
}
