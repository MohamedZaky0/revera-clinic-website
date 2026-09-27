"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Phone,
  User,
  Layers,
  Package as PackageIcon,
  ShoppingBag,
  Receipt,
  CreditCard,
  Info,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Clock,
  Sparkles,
  Stethoscope,
  Wallet,
  FileText,
  Coins,
  X,
  Check,
  Search,
  Zap
} from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";
import { getAuthHeaders } from "@/lib/authHeaders";

interface ServiceItem {
  id: string | number;
  en?: string;
  ar?: string;
  name?: string;
  title?: string;
  price?: number;
}

interface ProviderItem {
  id: string | number;
  name: string;
  specialty?: string;
}

interface CustomerItem {
  id?: string | number;
  name?: string;
  mobile?: string;
  phone?: string;
  outstanding?: number;
  wallet_balance?: number;
}

interface PackageServiceItem {
  id?: string;
  serviceId: number;
  serviceName?: string;
  serviceNameAr?: string;
  qty: number;
}

interface PackageItem {
  id: string | number;
  name: string;
  nameAr?: string | null;
  price?: number;
  packageType?: 'services' | 'pulses';
  package_type?: 'services' | 'pulses';
  totalPulses?: number;
  total_pulses?: number;
  items?: PackageServiceItem[];
}

interface ProductItem {
  id: string | number;
  name: string;
  arabic_name?: string;
  selling_price?: number;
  price?: number;
}

interface AdminAddPreviousBookingViewProps {
  onClose: () => void;
  onBookingCreated?: () => void;
  onBookingUpdated?: () => void;
  editingBooking?: any;
  initialBooking?: any;
  initialCustomer?: CustomerItem | any;
  initialPatientPhone?: string;
  initialPatientName?: string;
  services?: any[];
  providers?: any[];
  customers?: any[];
  packages?: any[];
  products?: any[];
  branches?: any[];
  activeBranchId?: string;
  lang?: "en" | "ar";
  t?: any;
}

function cleanPhone(raw: string): string {
  let p = raw.trim();
  if (p.startsWith("+20")) {
    p = "0" + p.slice(3);
  } else if (p.startsWith("0020")) {
    p = "0" + p.slice(4);
  } else if (p.startsWith("20") && p.length === 12) {
    p = "0" + p.slice(2);
  }
  return p;
}

function isValidPhone(raw: string): boolean {
  if (!raw) return false;
  const p = cleanPhone(raw);
  // Egyptian mobile format: 010, 011, 012, 015 followed by 8 digits
  if (/^01[0125]\d{8}$/.test(p)) return true;
  // Generic international format (8-15 digits)
  if (/^\+?\d{8,15}$/.test(raw.trim())) return true;
  return false;
}

export const AdminAddPreviousBookingView: React.FC<AdminAddPreviousBookingViewProps> = ({
  onClose,
  onBookingCreated,
  onBookingUpdated,
  editingBooking,
  initialBooking,
  initialCustomer,
  initialPatientPhone,
  initialPatientName,
  services = [],
  providers = [],
  customers = [],
  packages = [],
  products = [],
  branches = [],
  activeBranchId,
  lang = "en",
  t,
}) => {
  const tr = t || adminTranslations[lang].bookings.adminAddPreviousBooking;

  const targetBooking = editingBooking || initialBooking;
  const isEditMode = Boolean(targetBooking && targetBooking.id);

  const initPhone = initialPatientPhone || initialCustomer?.mobile || initialCustomer?.phone || "";
  const initName = initialPatientName || initialCustomer?.name || "";

  // Row 1 State: Patient Phone *, Patient Name *, Doctor (Optional)
  const [patientPhone, setPatientPhone] = useState(initPhone);
  const [patientName, setPatientName] = useState(initName);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  useEffect(() => {
    if (!targetBooking) {
      const nextPhone = initialPatientPhone || initialCustomer?.mobile || initialCustomer?.phone;
      const nextName = initialPatientName || initialCustomer?.name;
      if (nextPhone) setPatientPhone(nextPhone);
      if (nextName) setPatientName(nextName);
    }
  }, [initialCustomer, initialPatientPhone, initialPatientName, targetBooking]);

  // Row 2 State: Date *, Service (Optional), Package (Optional), Products (Optional)
  const [bookingDate, setBookingDate] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Package Breakdown State (Laser pulses or service sessions)
  const [packagePulsesUsed, setPackagePulsesUsed] = useState<number | string>(0);
  const [packagePulsesRemaining, setPackagePulsesRemaining] = useState<number | string>(0);
  const [packageServicesUsage, setPackageServicesUsage] = useState<
    Record<string | number, { qtyTotal: number; qtyUsed: number; qtyRemaining: number; serviceName?: string }>
  >({});

  // Row 3 State: Invoice Value, Actual Spent, Payment Method
  const [invoiceValue, setInvoiceValue] = useState<string>("");
  const [actualSpent, setActualSpent] = useState<string>("");
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [hasManuallyEditedSpent, setHasManuallyEditedSpent] = useState(false);

  // Row 4 State: Notes (Optional)
  const [notes, setNotes] = useState("");

  // Packages & Products Catalog State (auto-fetch if not passed as props)
  const [pkgList, setPkgList] = useState<PackageItem[]>(packages);
  const [prodList, setProdList] = useState<ProductItem[]>(products);

  // Patient's Existing Packages State
  const [patientExistingPackages, setPatientExistingPackages] = useState<any[]>([]);
  const [loadingExistingPackages, setLoadingExistingPackages] = useState(false);
  const [selectedCustomerPackageId, setSelectedCustomerPackageId] = useState<string>("");

  const initializedTargetBookingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (packages && packages.length > 0) {
      setPkgList(packages);
    } else {
      fetch("/api/packages")
        .then(res => (res.ok ? res.json() : []))
        .then((data: any) => {
          if (Array.isArray(data)) setPkgList(data);
        })
        .catch(() => {});
    }
  }, [packages]);

  useEffect(() => {
    if (products && products.length > 0) {
      setProdList(products);
    } else {
      fetch("/api/inventory/products")
        .then(res => (res.ok ? res.json() : null))
        .then((data: any) => {
          if (data && Array.isArray(data.products)) setProdList(data.products);
          else if (Array.isArray(data)) setProdList(data);
        })
        .catch(() => {});
    }
  }, [products]);

  // UI & Feedback State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    name?: string;
    date?: string;
    general?: string;
  }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live match patient against customers array
  const matchedCustomer = useMemo(() => {
    if (patientPhone && patientPhone.trim().length >= 8) {
      const cleanInput = cleanPhone(patientPhone);
      const found = customers.find(c => {
        const cMobile = cleanPhone(c.mobile || c.phone || "");
        return cMobile && cMobile === cleanInput;
      });
      if (found) return found;
    }
    if (initialCustomer && initialCustomer.name && (initialCustomer.mobile || initialCustomer.phone)) {
      return initialCustomer;
    }
    return null;
  }, [patientPhone, customers, initialCustomer]);

  // Reactive fetch for patient's existing packages
  useEffect(() => {
    const cleanP = cleanPhone(patientPhone);
    const targetCustId = matchedCustomer?.id;
    if ((!cleanP || cleanP.length < 8) && !targetCustId) {
      setPatientExistingPackages([]);
      return;
    }

    let isMounted = true;
    setLoadingExistingPackages(true);

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const param = targetCustId
          ? `customerId=${encodeURIComponent(String(targetCustId))}`
          : `mobile=${encodeURIComponent(cleanP)}`;
        const res = await fetch(`/api/customers/packages?${param}`, { headers });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.packages)) {
            setPatientExistingPackages(data.packages);
          } else {
            setPatientExistingPackages([]);
          }
        }
      } catch (err) {
        console.error("Error fetching patient existing packages:", err);
      } finally {
        if (isMounted) setLoadingExistingPackages(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [patientPhone, matchedCustomer?.id]);

  // Handle phone change & auto-populate name if patient matched
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientPhone(val);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }

    if (val.trim().length >= 8) {
      const cleanVal = cleanPhone(val);
      const match = customers.find(c => {
        const cMobile = cleanPhone(c.mobile || c.phone || "");
        return cMobile && cMobile === cleanVal;
      });
      if (match && match.name && !patientName) {
        setPatientName(match.name);
      }
    }
  };

  // Helper to extract service name cleanly
  const getServiceName = (s: ServiceItem) => {
    if (lang === "ar" && s.ar) return s.ar;
    return s.en || s.name || s.title || `Service #${s.id}`;
  };

  // Filter services dynamically by typed query
  const filteredServices = useMemo(() => {
    const q = serviceSearchQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      const nameEn = (s.en || s.name || s.title || "").toLowerCase();
      const nameAr = (s.ar || "").toLowerCase();
      return nameEn.includes(q) || nameAr.includes(q);
    });
  }, [services, serviceSearchQuery]);

  // Click outside to close service dropdown & sync display text
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
        setIsServiceDropdownOpen(false);
        if (selectedServiceId) {
          const found = services.find((s) => String(s.id) === String(selectedServiceId));
          if (found) {
            setServiceSearchQuery(getServiceName(found));
          }
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedServiceId, services, lang]);

  // Helper to extract package name cleanly
  const getPackageName = (p: PackageItem | any) => {
    if (lang === "ar" && (p.nameAr || p.packageNameAr)) return p.nameAr || p.packageNameAr;
    return p.name || p.packageName || `Package #${p.id || p.packageId}`;
  };

  // Helper to extract product name cleanly
  const getProductName = (pr: ProductItem) => {
    if (lang === "ar" && pr.arabic_name) return pr.arabic_name;
    return pr.name || `Product #${pr.id}`;
  };

  // Selected existing customer package object (if linked)
  const selectedExistingPkgObj = useMemo(() => {
    if (!selectedCustomerPackageId) return null;
    return patientExistingPackages.find((cp) => String(cp.id) === String(selectedCustomerPackageId)) || null;
  }, [selectedCustomerPackageId, patientExistingPackages]);

  // Selected package helper & metadata (supports both catalog package and existing customer package)
  const selectedPackageObj = useMemo(() => {
    if (selectedExistingPkgObj) {
      return {
        id: selectedExistingPkgObj.packageId || selectedExistingPkgObj.id,
        name: selectedExistingPkgObj.packageName || selectedExistingPkgObj.name,
        nameAr: selectedExistingPkgObj.packageNameAr || selectedExistingPkgObj.nameAr,
        price: 0,
        packageType: selectedExistingPkgObj.packageType,
        totalPulses: selectedExistingPkgObj.totalPulses ?? selectedExistingPkgObj.includedPulses,
        items: selectedExistingPkgObj.items,
        isExistingCustomerPackage: true,
        existingRecord: selectedExistingPkgObj
      };
    }
    if (!selectedPackageId) return null;
    return pkgList.find((p) => String(p.id) === String(selectedPackageId)) || null;
  }, [selectedCustomerPackageId, selectedExistingPkgObj, selectedPackageId, pkgList]);

  const isPulsePackage = useMemo(() => {
    if (!selectedPackageObj) return false;
    return (
      selectedPackageObj.packageType === "pulses" ||
      (selectedPackageObj as any).package_type === "pulses" ||
      (selectedPackageObj.totalPulses != null && selectedPackageObj.totalPulses > 0) ||
      (Number((selectedPackageObj as any).total_pulses) > 0)
    );
  }, [selectedPackageObj]);

  const packageTotalPulses = useMemo(() => {
    if (!selectedPackageObj) return 0;
    return Number(selectedPackageObj.totalPulses ?? (selectedPackageObj as any).total_pulses ?? 0);
  }, [selectedPackageObj]);

  // Pre-fill state when editing an existing historical booking
  useEffect(() => {
    if (!targetBooking) {
      initializedTargetBookingIdRef.current = null;
      return;
    }

    const currentBookingId = String(targetBooking.id || targetBooking._id || 'initial');
    if (initializedTargetBookingIdRef.current === currentBookingId) {
      // Already initialized this booking. Only resolve missing package/product/service display if catalogs loaded later.
      if (!selectedPackageId && pkgList.length > 0) {
        const rawNotes = String(targetBooking.notes || targetBooking.reception_notes || "");
        const pkgMatch = rawNotes.match(/Package:\s*([^\.\n]+)/i);
        if (pkgMatch) {
          const matchedPkgName = pkgMatch[1].trim();
          const foundPkg = pkgList.find((p) => p.name === matchedPkgName || p.nameAr === matchedPkgName);
          if (foundPkg) {
            setSelectedPackageId(String(foundPkg.id));
          }
        }
      }
      if (!selectedProductId && prodList.length > 0) {
        const rawNotes = String(targetBooking.notes || targetBooking.reception_notes || "");
        const prodMatch = rawNotes.match(/Product:\s*([^\.\n]+)/i);
        if (prodMatch) {
          const matchedProdName = prodMatch[1].trim();
          const foundProd = prodList.find((pr) => pr.name === matchedProdName || pr.arabic_name === matchedProdName);
          if (foundProd) {
            setSelectedProductId(String(foundProd.id));
          }
        }
      }
      return;
    }

    initializedTargetBookingIdRef.current = currentBookingId;

    const rawNotes = String(targetBooking.notes || targetBooking.reception_notes || "");
    const cleanNotes = rawNotes
      .replace(/\[Historical Booking\]\s*Added manually for historical records\./gi, "")
      .replace(/Service:\s*[^\.\n]+\./gi, "")
      .replace(/Package:\s*[^\.\n]+\./gi, "")
      .replace(/\[Package Usage\]:\s*[^\.\n]+(?:\.|$)/gi, "")
      .replace(/Product:\s*[^\.\n]+\./gi, "")
      .replace(/\[Invoice Total\]:\s*\d+(?:\.\d+)?\s*EGP\./gi, "")
      .replace(/Actual Spent:\s*\d+(?:\.\d+)?\s*EGP\./gi, "")
      .replace(/Payment Method:\s*[^\.\n]+\./gi, "")
      .trim();

    const invTotalMatch = rawNotes.match(/\[Invoice Total\]:\s*(\d+(?:\.\d+)?)/i);
    const spentMatch = rawNotes.match(/Actual Spent:\s*(\d+(?:\.\d+)?)/i);
    const payMethodMatch = rawNotes.match(/Payment Method:\s*([^\.\n]+)/i);

    const sId = String(targetBooking.service_id || targetBooking.serviceId || (targetBooking.serviceIds && targetBooking.serviceIds[0]) || "");
    const dId = String(targetBooking.provider_id || targetBooking.doctorId || targetBooking.doctor_id || "");
    const pPhone = targetBooking.phone || targetBooking.customer_phone || targetBooking.patientPhone || "";
    const pName = targetBooking.name || targetBooking.customer_name || targetBooking.patientName || "";
    const bDate = (targetBooking.date || "").slice(0, 10);
    const invVal = targetBooking.price != null
      ? String(targetBooking.price)
      : (invTotalMatch ? invTotalMatch[1] : (targetBooking.amount_paid != null ? String(Number(targetBooking.amount_paid) + Number(targetBooking.amount_left || 0)) : ""));
    const actSpent = targetBooking.amount_paid != null
      ? String(targetBooking.amount_paid)
      : (spentMatch ? spentMatch[1] : (targetBooking.amountPaid != null ? String(targetBooking.amountPaid) : ""));
    const payType = targetBooking.payment_type || targetBooking.payment_method || (payMethodMatch ? payMethodMatch[1].trim() : "");

    if (pPhone) setPatientPhone(pPhone);
    if (pName) setPatientName(pName);
    if (bDate) setBookingDate(bDate);
    if (dId) setSelectedDoctorId(dId);
    if (sId) setSelectedServiceId(sId);
    if (invVal) setInvoiceValue(invVal);
    if (actSpent) setActualSpent(actSpent);
    if (payType) setSelectedPaymentType(payType);
    if (cleanNotes) setNotes(cleanNotes);

    if (sId && services.length > 0) {
      const foundSvc = services.find((s) => String(s.id) === sId);
      if (foundSvc) {
        setServiceSearchQuery(getServiceName(foundSvc));
      }
    }

    // Package extraction in edit mode
    const pkgMatch = rawNotes.match(/Package:\s*([^\.\n]+)/i);
    const rawPkgId = targetBooking.package_id || targetBooking.packageId;
    if (rawPkgId) {
      setSelectedPackageId(String(rawPkgId));
    } else if (pkgMatch && pkgList.length > 0) {
      const matchedPkgName = pkgMatch[1].trim();
      const foundPkg = pkgList.find((p) => p.name === matchedPkgName || p.nameAr === matchedPkgName);
      if (foundPkg) {
        setSelectedPackageId(String(foundPkg.id));
      }
    }

    // Product extraction in edit mode
    const prodMatch = rawNotes.match(/Product:\s*([^\.\n]+)/i);
    const rawProdId = targetBooking.product_id || targetBooking.productId;
    if (rawProdId) {
      setSelectedProductId(String(rawProdId));
    } else if (prodMatch && prodList.length > 0) {
      const matchedProdName = prodMatch[1].trim();
      const foundProd = prodList.find((pr) => pr.name === matchedProdName || pr.arabic_name === matchedProdName);
      if (foundProd) {
        setSelectedProductId(String(foundProd.id));
      }
    }

    // Parse Package Usage note breakdown
    const pulseUsageMatch = rawNotes.match(/\[Package Usage\]:\s*([\d,]+)\s*\/\s*([\d,]+)\s*pulses used(?:\s*\(([\d,]+)\s*pulses remaining\))?/i);
    if (pulseUsageMatch) {
      const u = parseInt(pulseUsageMatch[1].replace(/,/g, ""), 10) || 0;
      const r = pulseUsageMatch[3] ? parseInt(pulseUsageMatch[3].replace(/,/g, ""), 10) : 0;
      setPackagePulsesUsed(u);
      setPackagePulsesRemaining(r);
    }
  }, [targetBooking, services, pkgList, prodList, lang]);

  // Recalculate invoice value when Service, Package, or Product changes
  const recalculateInvoice = (nextSrvId: string, nextPkgId: string, nextProdId: string, isExistingCustomerPkg = Boolean(selectedCustomerPackageId)) => {
    const srv = services.find(s => String(s.id) === String(nextSrvId));
    const pkg = isExistingCustomerPkg ? null : pkgList.find(p => String(p.id) === String(nextPkgId));
    const prod = prodList.find(pr => String(pr.id) === String(nextProdId));

    const srvPrice = Number(srv?.price || 0);
    const pkgPrice = Number(pkg?.price || 0);
    const prodPrice = Number(prod?.selling_price ?? prod?.price ?? 0);

    const total = srvPrice + pkgPrice + prodPrice;
    const totalStr = total > 0 ? String(total) : "";

    setInvoiceValue(totalStr);
    if (!hasManuallyEditedSpent) {
      setActualSpent(totalStr);
    }
  };

  // Handle package selection change (handles "existing:ID", "catalog:ID", or plain ID)
  const handlePackageChange = (val: string) => {
    if (!val) {
      setSelectedCustomerPackageId("");
      setSelectedPackageId("");
      setPackagePulsesUsed(0);
      setPackagePulsesRemaining(0);
      setPackageServicesUsage({});
      recalculateInvoice(selectedServiceId, "", selectedProductId, false);
      return;
    }

    if (val.startsWith("existing:")) {
      const cpId = val.replace("existing:", "");
      const cp = patientExistingPackages.find((p) => String(p.id) === String(cpId));
      if (!cp) return;

      setSelectedCustomerPackageId(cpId);
      setSelectedPackageId(String(cp.packageId || cp.id));

      const isPulse =
        cp.packageType === "pulses" ||
        cp.package_type === "pulses" ||
        Number(cp.totalPulses || cp.includedPulses || 0) > 0;

      if (isPulse) {
        const total = Number(cp.totalPulses ?? cp.includedPulses ?? 0);
        const used = Number(cp.usedPulses ?? 0);
        const rem = Number(cp.pulsesRemaining ?? cp.remainingPulses ?? Math.max(0, total - used));
        setPackagePulsesUsed(used);
        setPackagePulsesRemaining(rem);
      } else {
        const items = cp.items || [];
        const newUsage: Record<string | number, { qtyTotal: number; qtyUsed: number; qtyRemaining: number; serviceName?: string }> = {};
        items.forEach((item: any) => {
          const key = item.serviceId || item.id || 0;
          const svcName = lang === "ar" && item.serviceNameAr ? item.serviceNameAr : (item.serviceName || `Service #${item.serviceId}`);
          newUsage[key] = {
            qtyTotal: Number(item.qtyTotal ?? item.qty_total ?? item.qty ?? 0),
            qtyUsed: Number(item.qtyUsed ?? item.qty_used ?? 0),
            qtyRemaining: Number(item.qtyRemaining ?? item.qty_remaining ?? Math.max(0, Number(item.qtyTotal || 0) - Number(item.qtyUsed || 0))),
            serviceName: svcName,
          };
        });
        setPackageServicesUsage(newUsage);
      }

      // Existing package already paid in earlier transaction -> default 0 invoice increment
      recalculateInvoice(selectedServiceId, String(cp.packageId || cp.id), selectedProductId, true);
    } else {
      const pId = val.replace("catalog:", "");
      const pkg = pkgList.find((p) => String(p.id) === String(pId));
      setSelectedCustomerPackageId("");
      setSelectedPackageId(pId);

      if (!pkg) return;

      const isPulse =
        pkg.packageType === "pulses" ||
        pkg.package_type === "pulses" ||
        (pkg.totalPulses != null && pkg.totalPulses > 0) ||
        (pkg.total_pulses != null && pkg.total_pulses > 0);

      if (isPulse) {
        const total = Number(pkg.totalPulses ?? pkg.total_pulses ?? 0);
        setPackagePulsesUsed(0);
        setPackagePulsesRemaining(total);
      } else {
        const items = pkg.items || [];
        const newUsage: Record<string | number, { qtyTotal: number; qtyUsed: number; qtyRemaining: number; serviceName?: string }> = {};
        items.forEach((item) => {
          const key = item.serviceId || item.id || 0;
          const svcName = lang === "ar" && item.serviceNameAr ? item.serviceNameAr : (item.serviceName || `Service #${item.serviceId}`);
          newUsage[key] = {
            qtyTotal: item.qty,
            qtyUsed: 0,
            qtyRemaining: item.qty,
            serviceName: svcName,
          };
        });
        setPackageServicesUsage(newUsage);
      }

      recalculateInvoice(selectedServiceId, pId, selectedProductId, false);
    }
  };

  // Pulses input handlers (flexible for typing, deleting, and auto-balancing)
  const handlePulsesUsedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setPackagePulsesUsed("");
      setPackagePulsesRemaining(packageTotalPulses);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setPackagePulsesUsed("");
      return;
    }
    const val = Math.max(0, parsed);
    const total = packageTotalPulses;
    const boundedUsed = total > 0 ? Math.min(total, val) : val;
    setPackagePulsesUsed(raw.startsWith("0") && raw.length > 1 && !raw.startsWith("0.") ? String(boundedUsed) : raw);
    setPackagePulsesRemaining(total > 0 ? Math.max(0, total - boundedUsed) : 0);
  };

  const handlePulsesRemainingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setPackagePulsesRemaining("");
      setPackagePulsesUsed(packageTotalPulses);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setPackagePulsesRemaining("");
      return;
    }
    const val = Math.max(0, parsed);
    const total = packageTotalPulses;
    const boundedRem = total > 0 ? Math.min(total, val) : val;
    setPackagePulsesRemaining(raw.startsWith("0") && raw.length > 1 && !raw.startsWith("0.") ? String(boundedRem) : raw);
    setPackagePulsesUsed(total > 0 ? Math.max(0, total - boundedRem) : 0);
  };

  const handlePulsesUsedBlur = () => {
    if (packagePulsesUsed === "" || isNaN(Number(packagePulsesUsed))) {
      setPackagePulsesUsed(0);
      setPackagePulsesRemaining(packageTotalPulses);
    } else {
      const num = Math.max(0, Number(packagePulsesUsed));
      const bounded = packageTotalPulses > 0 ? Math.min(packageTotalPulses, num) : num;
      setPackagePulsesUsed(bounded);
      setPackagePulsesRemaining(packageTotalPulses > 0 ? Math.max(0, packageTotalPulses - bounded) : 0);
    }
  };

  const handlePulsesRemainingBlur = () => {
    if (packagePulsesRemaining === "" || isNaN(Number(packagePulsesRemaining))) {
      setPackagePulsesRemaining(0);
      setPackagePulsesUsed(packageTotalPulses);
    } else {
      const num = Math.max(0, Number(packagePulsesRemaining));
      const bounded = packageTotalPulses > 0 ? Math.min(packageTotalPulses, num) : num;
      setPackagePulsesRemaining(bounded);
      setPackagePulsesUsed(packageTotalPulses > 0 ? Math.max(0, packageTotalPulses - bounded) : 0);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: typeof errors = {};

    // Validate Phone (Required)
    const trimmedPhone = patientPhone.trim();
    if (!trimmedPhone) {
      newErrors.phone = tr.requiredField;
    } else if (!isValidPhone(trimmedPhone)) {
      newErrors.phone = tr.invalidPhone;
    }

    // Validate Name (Required)
    const trimmedName = patientName.trim();
    if (!trimmedName) {
      newErrors.name = tr.requiredField;
    }

    // Validate Date (Required)
    if (!bookingDate) {
      newErrors.date = tr.requiredField;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    setSuccessMsg(null);

    try {
      const selectedDoc = providers.find(p => String(p.id) === String(selectedDoctorId));
      const selectedSrv = services.find(s => String(s.id) === String(selectedServiceId));
      const selectedPkg = pkgList.find(p => String(p.id) === String(selectedPackageId));
      const selectedProd = prodList.find(pr => String(pr.id) === String(selectedProductId));

      const parsedInvoiceVal = invoiceValue !== "" ? parseFloat(invoiceValue) : 0;
      const parsedSpentVal = actualSpent !== "" ? parseFloat(actualSpent) : 0;

      const numUsed = Number(packagePulsesUsed) || 0;
      const numRemaining = Number(packagePulsesRemaining) || 0;

      const payload: Record<string, any> = {
        patientPhone: trimmedPhone,
        patientName: trimmedName,
        date: bookingDate,
        doctorId: selectedDoctorId || null,
        doctorName: selectedDoc?.name || null,
        serviceId: selectedServiceId ? Number(selectedServiceId) : null,
        serviceName: selectedSrv ? getServiceName(selectedSrv) : null,
        packageId: selectedPackageId || null,
        packageName: selectedPackageObj ? getPackageName(selectedPackageObj) : null,
        customerPackageId: selectedCustomerPackageId || null,
        existingCustomerPackageId: selectedCustomerPackageId || null,
        productId: selectedProductId || null,
        productName: selectedProd ? getProductName(selectedProd) : null,
        packagePulsesTotal: isPulsePackage ? packageTotalPulses : null,
        packagePulsesUsed: isPulsePackage ? numUsed : null,
        packagePulsesRemaining: isPulsePackage ? numRemaining : null,
        packageItemsUsage: (!isPulsePackage && selectedPackageObj?.items && selectedPackageObj.items.length > 0)
          ? selectedPackageObj.items.map((it: any) => {
              const key = it.serviceId || it.id || 0;
              const usage = packageServicesUsage[key] || { qtyTotal: it.qty, qtyUsed: 0, qtyRemaining: it.qty };
              return {
                serviceId: it.serviceId,
                serviceName: usage.serviceName || (lang === "ar" && it.serviceNameAr ? it.serviceNameAr : it.serviceName),
                qtyTotal: usage.qtyTotal,
                qtyUsed: usage.qtyUsed,
                qtyRemaining: usage.qtyRemaining,
              };
            })
          : null,
        invoiceValue: isNaN(parsedInvoiceVal) ? 0 : parsedInvoiceVal,
        actualSpent: isNaN(parsedSpentVal) ? 0 : parsedSpentVal,
        paymentType: selectedPaymentType || null,
        notes: notes.trim() || null,
        branchId: activeBranchId || null
      };

      if (isEditMode) {
        payload.id = targetBooking.id;
      }

      // POST / PATCH /api/reservations/previous is staff-gated
      const res = await fetch("/api/reservations/previous", {
        method: isEditMode ? "PATCH" : "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field === "patientPhone") {
          setErrors({ phone: data.error || tr.invalidPhone });
        } else {
          setErrors({ general: data.error || tr.errorMessage });
        }
        setSaving(false);
        return;
      }

      setSuccessMsg(isEditMode ? (tr.updateSuccessMessage || "Previous booking updated successfully!") : tr.successMessage);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("revera-booking-change"));
        window.dispatchEvent(new CustomEvent("revera-prescription-change"));
      }
      setTimeout(() => {
        if (isEditMode && onBookingUpdated) {
          onBookingUpdated();
        } else if (onBookingCreated) {
          onBookingCreated();
        } else {
          onClose();
        }
      }, 750);
    } catch (err: any) {
      console.error("Error saving previous booking:", err);
      setErrors({ general: tr.errorMessage });
      setSaving(false);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="w-full max-w-5xl mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* ── BACK BUTTON ── */}
      <div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#414E36] hover:text-[#283221] transition cursor-pointer"
        >
          <ArrowLeft size={14} className={lang === "ar" ? "rotate-180" : ""} />
          <span>{tr.backToBookings || "BACK TO ONBOARDING"}</span>
        </button>
      </div>

      {/* ── HEADER WITH ICON ── */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8EFE5] text-[#344E41] shadow-2xs">
          <CalendarIcon size={28} className="text-[#384E34]" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            {isEditMode ? (tr.editTitle || "Edit Previous Booking") : tr.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6A51] mt-0.5 font-medium">
            {isEditMode ? (tr.editSubtitle || "Update historical booking details and financial records.") : tr.subtitle}
          </p>
        </div>
      </div>

      {/* ── SUCCESS BANNER ── */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── GENERAL ERROR BANNER ── */}
      {errors.general && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-semibold text-rose-800 shadow-xs">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* ── FORM CARD ── */}
      <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200/80 bg-white p-4 sm:p-8 shadow-xs space-y-6">
        
        {/* ── ROW 1: 3 FIELDS (PATIENT PHONE *, PATIENT NAME *, DOCTOR OPTIONAL) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FIELD 1: PATIENT PHONE (REQUIRED) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="patientPhone" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1">
                {tr.patientPhoneLabel} <span className="text-red-500">*</span>
              </label>
              {matchedCustomer && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 size={12} /> {tr.existingPatientFound} {matchedCustomer.name}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Phone size={17} />
              </div>
              <input
                id="patientPhone"
                type="tel"
                value={patientPhone}
                onChange={handlePhoneChange}
                placeholder={tr.patientPhonePlaceholder}
                title={tr.patientPhoneTooltip}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
                  errors.phone
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-gray-200 focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errors.phone}
              </p>
            ) : (
              <p className="text-[11px] text-[#6B7280] font-normal leading-normal">
                {tr.patientPhoneHelp}
              </p>
            )}
          </div>

          {/* FIELD 2: PATIENT NAME (REQUIRED) */}
          <div className="space-y-1.5">
            <label htmlFor="patientName" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1">
              {tr.patientNameLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <User size={17} />
              </div>
              <input
                id="patientName"
                type="text"
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder={tr.patientNamePlaceholder}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
                  errors.name
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-gray-200 focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errors.name}
              </p>
            )}
          </div>

          {/* FIELD 3: DOCTOR (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="doctorSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.doctorOptional || tr.doctorLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Stethoscope size={17} />
              </div>
              <select
                id="doctorSelect"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectDoctorPlaceholder}</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.specialty ? `— ${p.specialty}` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        {/* ── PATIENT'S EXISTING PACKAGES DISCOVERY BANNER ── */}
        {patientExistingPackages.length > 0 && (
          <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 via-[#F4F9F2] to-white p-4.5 shadow-2xs space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-2">
                    {tr.patientExistingPackagesTitle || "Patient's Existing Packages"}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {patientExistingPackages.length} {lang === "ar" ? "باقات مسجلة" : "found"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    {tr.patientExistingPackagesSubtitle || "This patient already has packages in the system. Select one to record session consumption against it, or select a catalog package."}
                  </p>
                </div>
              </div>
              {loadingExistingPackages && (
                <Loader2 size={15} className="animate-spin text-emerald-600" />
              )}
            </div>

            {/* List of existing packages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {patientExistingPackages.map((cp: any) => {
                const isSelected = selectedCustomerPackageId === String(cp.id);
                const isPulses = cp.packageType === "pulses" || cp.package_type === "pulses" || Number(cp.totalPulses || cp.includedPulses || 0) > 0;
                const total = isPulses
                  ? Number(cp.totalPulses ?? cp.includedPulses ?? 0)
                  : (cp.items || []).reduce((sum: number, it: any) => sum + Number(it.qtyTotal ?? it.qty_total ?? it.qty ?? 0), 0);
                const used = isPulses
                  ? Number(cp.usedPulses ?? 0)
                  : (cp.items || []).reduce((sum: number, it: any) => sum + Number(it.qtyUsed ?? it.qty_used ?? 0), 0);
                const rem = isPulses
                  ? Number(cp.pulsesRemaining ?? cp.remainingPulses ?? Math.max(0, total - used))
                  : (cp.items || []).reduce((sum: number, it: any) => sum + Number(it.qtyRemaining ?? it.qty_remaining ?? Math.max(0, Number(it.qtyTotal || 0) - Number(it.qtyUsed || 0))), 0);

                const isFullyUsed = cp.status === "fully_used" || rem <= 0;

                return (
                  <div
                    key={cp.id}
                    className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition ${
                      isSelected
                        ? "bg-[#E8EFE5] border-[#414E36] ring-2 ring-[#414E36]/20 shadow-xs"
                        : "bg-white border-gray-200/90 hover:border-emerald-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {lang === "ar" && (cp.packageNameAr || cp.nameAr) ? (cp.packageNameAr || cp.nameAr) : (cp.packageName || cp.name || `Package #${cp.id}`)}
                        </span>
                        {isFullyUsed ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                            {tr.noRemainingQuota || "Fully Consumed"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            {lang === "ar" ? "نشطة" : "Active"}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-600 font-medium">
                        {isPulses ? (
                          <span>
                            {used.toLocaleString()} / {total.toLocaleString()} {lang === "ar" ? "نبضة مستهلكة" : "pulses used"} (
                            <strong className={rem > 0 ? "text-emerald-700 font-bold" : "text-gray-500 font-bold"}>
                              {rem.toLocaleString()} {lang === "ar" ? "متبقية" : "left"}
                            </strong>)
                          </span>
                        ) : (
                          <span>
                            {used} / {total} {lang === "ar" ? "جلسة مستهلكة" : "sessions used"} (
                            <strong className={rem > 0 ? "text-emerald-700 font-bold" : "text-gray-500 font-bold"}>
                              {rem} {lang === "ar" ? "متبقية" : "left"}
                            </strong>)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePackageChange(isSelected ? "" : `existing:${cp.id}`)}
                      className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-[#414E36] text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} /> {lang === "ar" ? "محددة للاستهلاك" : "Selected"}
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} /> {tr.useThisPackageBtn || "Use This Package"}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ROW 2: 4 FIELDS (DATE *, SERVICE, PACKAGE, PRODUCTS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* FIELD 4: DATE (REQUIRED) */}
          <div className="space-y-1.5">
            <label htmlFor="bookingDate" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1">
              {tr.dateLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <CalendarIcon size={17} />
              </div>
              <input
                id="bookingDate"
                type="date"
                value={bookingDate}
                onChange={(e) => {
                  setBookingDate(e.target.value);
                  if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                }}
                title={tr.dateTooltip}
                placeholder={tr.datePlaceholder}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] cursor-pointer ${
                  errors.date
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-gray-200 focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
                }`}
              />
            </div>
            {errors.date && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle size={13} /> {errors.date}
              </p>
            )}
          </div>

          {/* FIELD 5: SERVICE (OPTIONAL) - Searchable autocomplete input */}
          <div className="space-y-1.5 relative" ref={serviceDropdownRef}>
            <label htmlFor="serviceSearchInput" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.serviceOptional || tr.serviceLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Layers size={17} />
              </div>
              <input
                id="serviceSearchInput"
                type="text"
                autoComplete="off"
                value={serviceSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setServiceSearchQuery(val);
                  setIsServiceDropdownOpen(true);
                  if (!val) {
                    setSelectedServiceId("");
                    recalculateInvoice("", selectedPackageId, selectedProductId);
                  }
                }}
                onFocus={() => setIsServiceDropdownOpen(true)}
                placeholder={tr.searchServicePlaceholder || tr.selectServicePlaceholder || "Search service..."}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
              />
              {serviceSearchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceId("");
                    setServiceSearchQuery("");
                    setIsServiceDropdownOpen(false);
                    recalculateInvoice("", selectedPackageId, selectedProductId);
                  }}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#9CA3AF] hover:text-[#414E36] transition cursor-pointer z-10"
                  title="Clear service"
                >
                  <X size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsServiceDropdownOpen((prev) => !prev)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] hover:text-[#414E36] transition cursor-pointer z-10"
                >
                  <ChevronDown size={17} className={`transition-transform duration-200 ${isServiceDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* Dropdown Results */}
              {isServiceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50 py-1 divide-y divide-gray-50">
                  {filteredServices.length > 0 ? (
                    filteredServices.map((s) => {
                      const isSelected = String(selectedServiceId) === String(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedServiceId(String(s.id));
                            setServiceSearchQuery(getServiceName(s));
                            setIsServiceDropdownOpen(false);
                            recalculateInvoice(String(s.id), selectedPackageId, selectedProductId);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm text-start font-medium transition cursor-pointer ${
                            isSelected
                              ? "bg-[#E8EFE5] text-[#344E41] font-bold"
                              : "text-[#111827] hover:bg-[#F4F7F2] hover:text-[#344E41]"
                          }`}
                        >
                          <span className="truncate">{getServiceName(s)}</span>
                          {isSelected && (
                            <Check size={16} className="text-[#414E36] shrink-0 ml-2 rtl:ml-0 rtl:mr-2" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3 text-xs sm:text-sm text-center text-gray-500 font-medium">
                      {tr.noServicesFound || "No services found"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FIELD 6: PACKAGE (OPTIONAL) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="packageSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
                {tr.packageOptional || tr.packageLabel}
              </label>
              {selectedCustomerPackageId && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  {tr.linkedExistingPackageBadge || "Linked to Existing Package"}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <PackageIcon size={17} />
              </div>
              <select
                id="packageSelect"
                value={selectedCustomerPackageId ? `existing:${selectedCustomerPackageId}` : (selectedPackageId ? `catalog:${selectedPackageId}` : "")}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectPackagePlaceholder}</option>
                
                {patientExistingPackages.length > 0 && (
                  <optgroup label={`📌 ${tr.patientExistingPackagesGroup || "Patient's Existing Packages"}`}>
                    {patientExistingPackages.map((cp: any) => {
                      const isPulses = cp.packageType === "pulses" || cp.package_type === "pulses" || Number(cp.totalPulses || cp.includedPulses || 0) > 0;
                      const total = isPulses ? Number(cp.totalPulses ?? cp.includedPulses ?? 0) : (cp.items || []).reduce((sum: number, it: any) => sum + Number(it.qtyTotal || it.qty || 0), 0);
                      const used = isPulses ? Number(cp.usedPulses ?? 0) : (cp.items || []).reduce((sum: number, it: any) => sum + Number(it.qtyUsed || 0), 0);
                      const rem = isPulses ? Number(cp.pulsesRemaining ?? (total - used)) : (total - used);
                      const name = lang === "ar" && (cp.packageNameAr || cp.nameAr) ? (cp.packageNameAr || cp.nameAr) : (cp.packageName || cp.name || `Package #${cp.id}`);
                      return (
                        <option key={`existing-${cp.id}`} value={`existing:${cp.id}`}>
                          ⭐ [Existing] {name} ({rem.toLocaleString()} {isPulses ? (lang === "ar" ? "نبضة متبقية" : "pulses left") : (lang === "ar" ? "جلسات متبقية" : "sessions left")})
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                <optgroup label={`🏷️ ${tr.catalogPackagesGroup || "Catalog Packages (New Purchase)"}`}>
                  {pkgList.map((p) => (
                    <option key={`catalog-${p.id}`} value={`catalog:${p.id}`}>
                      {getPackageName(p)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>

          {/* FIELD 7: PRODUCTS (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="productSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.productsOptional || tr.productsLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <ShoppingBag size={17} />
              </div>
              <select
                id="productSelect"
                value={selectedProductId}
                onChange={(e) => {
                  const prId = e.target.value;
                  setSelectedProductId(prId);
                  recalculateInvoice(selectedServiceId, selectedPackageId, prId);
                }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectProductPlaceholder}</option>
                {prodList.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {getProductName(pr)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        {/* ── PACKAGE USAGE BREAKDOWN CARD (WHEN PACKAGE IS SELECTED) ── */}
        {selectedPackageObj && (() => {
          const numUsedPulses = Number(packagePulsesUsed) || 0;
          const numRemPulses = Number(packagePulsesRemaining) || 0;

          return (
            <div className="rounded-2xl border border-[#414E36]/20 bg-gradient-to-br from-[#F4F7F2] via-white to-[#EBF3E7] p-5 shadow-sm space-y-4 animate-fadeIn transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#414E36]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#414E36] text-white shadow-sm">
                    {isPulsePackage ? <Zap size={18} className="text-amber-300" /> : <PackageIcon size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-[#1F2937] flex items-center gap-2">
                      {tr.packageUsageTitle || "Package Quota & Sessions Breakdown"}
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#414E36]/10 text-[#414E36]">
                        {getPackageName(selectedPackageObj)}
                      </span>
                    </h4>
                    <p className="text-xs text-[#5A6A51] mt-0.5">
                      {tr.packageUsageSubtitle || "Specify sessions or pulses previously consumed from this package and what remains active."}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                  {isPulsePackage ? (
                    numRemPulses <= 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <CheckCircle2 size={13} /> {tr.fullyUsedBadge || "Fully Consumed (0 Left)"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles size={13} className="text-emerald-600" /> {tr.activeRemainingBadge || "Active Quota Left"}
                      </span>
                    )
                  ) : (
                    Object.values(packageServicesUsage).length > 0 &&
                    Object.values(packageServicesUsage).every((it) => it.qtyRemaining <= 0) ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <CheckCircle2 size={13} /> {tr.fullyUsedBadge || "Fully Consumed (0 Left)"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles size={13} className="text-emerald-600" /> {tr.activeRemainingBadge || "Active Quota Left"}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* BREAKDOWN TYPE 1: PULSES PACKAGE */}
              {isPulsePackage ? (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total Pulses */}
                    <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
                      <span className="text-xs font-medium text-gray-500">{tr.pulsesTotalLabel || "Total Pulses Quota"}</span>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-xl font-bold text-[#111827]">{packageTotalPulses.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 font-medium">{lang === "ar" ? "نبضة" : "pulses"}</span>
                      </div>
                    </div>

                    {/* Pulses Used (Input) */}
                    <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-xs space-y-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/10 transition">
                      <label htmlFor="pulsesUsedInput" className="text-xs font-bold text-amber-900 block">
                        {tr.pulsesUsedLabel || "Pulses Used"}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="pulsesUsedInput"
                          type="number"
                          min="0"
                          max={packageTotalPulses || undefined}
                          value={packagePulsesUsed}
                          onChange={handlePulsesUsedChange}
                          onBlur={handlePulsesUsedBlur}
                          className="w-full text-base font-bold text-amber-950 bg-amber-50/50 border border-amber-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Pulses Remaining (Input) */}
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition">
                      <label htmlFor="pulsesRemainingInput" className="text-xs font-bold text-emerald-900 block">
                        {tr.pulsesRemainingLabel || "Pulses Left (Remaining)"}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="pulsesRemainingInput"
                          type="number"
                          min="0"
                          max={packageTotalPulses || undefined}
                          value={packagePulsesRemaining}
                          onChange={handlePulsesRemainingChange}
                          onBlur={handlePulsesRemainingBlur}
                          className="w-full text-base font-bold text-emerald-950 bg-emerald-50/50 border border-emerald-200 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pulses Presets & Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-gray-500 font-medium mr-1 rtl:mr-0 rtl:ml-1">
                          {lang === "ar" ? "تحديد سريع:" : "Quick presets:"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPackagePulsesUsed(0);
                            setPackagePulsesRemaining(packageTotalPulses);
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            numUsedPulses === 0
                              ? "bg-[#414E36] text-white border-[#414E36]"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {tr.noneUsedBtn || "0 Used (Full)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const u = Math.round(packageTotalPulses * 0.25);
                            setPackagePulsesUsed(u);
                            setPackagePulsesRemaining(packageTotalPulses - u);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const u = Math.round(packageTotalPulses * 0.5);
                            setPackagePulsesUsed(u);
                            setPackagePulsesRemaining(packageTotalPulses - u);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const u = Math.round(packageTotalPulses * 0.75);
                            setPackagePulsesUsed(u);
                            setPackagePulsesRemaining(packageTotalPulses - u);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          75%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPackagePulsesUsed(packageTotalPulses);
                            setPackagePulsesRemaining(0);
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            numUsedPulses === packageTotalPulses && packageTotalPulses > 0
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {tr.allUsedBtn || "All Used"}
                        </button>
                      </div>

                      <div className="text-xs font-medium text-gray-500">
                        {packageTotalPulses > 0 ? (
                          <span>
                            {Math.round((numUsedPulses / packageTotalPulses) * 100)}% {lang === "ar" ? "مستهلك" : "used"} · {Math.round((numRemPulses / packageTotalPulses) * 100)}% {lang === "ar" ? "متبقي" : "remaining"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {packageTotalPulses > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex">
                        <div
                          className="bg-amber-500 h-2.5 transition-all duration-300"
                          style={{ width: `${Math.min(100, (numUsedPulses / packageTotalPulses) * 100)}%` }}
                          title={`Used: ${numUsedPulses}`}
                        />
                        <div
                          className="bg-emerald-500 h-2.5 transition-all duration-300"
                          style={{ width: `${Math.min(100, (numRemPulses / packageTotalPulses) * 100)}%` }}
                          title={`Remaining: ${numRemPulses}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              /* BREAKDOWN TYPE 2: SERVICES-BASED PACKAGE */
              <div className="space-y-3 pt-1">
                {selectedPackageObj.items && selectedPackageObj.items.length > 0 ? (
                  <div className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-xs">
                    {selectedPackageObj.items.map((item: any) => {
                      const key = item.serviceId || item.id || 0;
                      const usage = packageServicesUsage[key] || {
                        qtyTotal: item.qty,
                        qtyUsed: 0,
                        qtyRemaining: item.qty,
                        serviceName: lang === "ar" && item.serviceNameAr ? item.serviceNameAr : (item.serviceName || `Service #${item.serviceId}`),
                      };

                      return (
                        <div key={key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-[#111827] block">
                              {usage.serviceName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-700">
                                {usage.qtyTotal} {tr.sessionsTotalLabel || "Total Sessions"}
                              </span>
                              {usage.qtyRemaining <= 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 font-semibold text-amber-800">
                                  {tr.fullyUsedBadge || "0 Left"}
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 font-semibold text-emerald-800">
                                  {usage.qtyRemaining} {lang === "ar" ? "متبقية" : "left"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Steppers & Inputs */}
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Used Input */}
                            <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200 rounded-lg p-1">
                              <span className="text-xs font-bold text-amber-900 px-1.5">
                                {tr.sessionsUsedLabel || "Used"}:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextUsed = Math.max(0, usage.qtyUsed - 1);
                                  setPackageServicesUsage((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...usage,
                                      qtyUsed: nextUsed,
                                      qtyRemaining: usage.qtyTotal - nextUsed,
                                    },
                                  }));
                                }}
                                className="w-6 h-6 rounded bg-white text-amber-900 font-bold hover:bg-amber-100 transition flex items-center justify-center text-xs shadow-xs cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-sm font-bold text-amber-950">
                                {usage.qtyUsed}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextUsed = Math.min(usage.qtyTotal, usage.qtyUsed + 1);
                                  setPackageServicesUsage((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...usage,
                                      qtyUsed: nextUsed,
                                      qtyRemaining: usage.qtyTotal - nextUsed,
                                    },
                                  }));
                                }}
                                className="w-6 h-6 rounded bg-white text-amber-900 font-bold hover:bg-amber-100 transition flex items-center justify-center text-xs shadow-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Remaining Indicator */}
                            <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200 rounded-lg p-1">
                              <span className="text-xs font-bold text-emerald-900 px-1.5">
                                {tr.sessionsRemainingLabel || "Left"}:
                              </span>
                              <span className="w-6 text-center text-sm font-bold text-emerald-950">
                                {usage.qtyRemaining}
                              </span>
                            </div>

                            {/* Quick Toggle Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPackageServicesUsage((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...usage,
                                      qtyUsed: 0,
                                      qtyRemaining: usage.qtyTotal,
                                    },
                                  }));
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                              >
                                {tr.noneUsedBtn || "0 Used"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPackageServicesUsage((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...usage,
                                      qtyUsed: usage.qtyTotal,
                                      qtyRemaining: 0,
                                    },
                                  }));
                                }}
                                className="px-2 py-1 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                              >
                                {tr.allUsedBtn || "All Used"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs text-gray-500 font-medium text-center">
                    {lang === "ar" ? "باقة بدون بنود خدمات مسبقة." : "Package has no preset service items configured."}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

        {/* ── ROW 3: 3 FIELDS (INVOICE VALUE, ACTUAL SPENT, PAYMENT METHOD) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FIELD 8: INVOICE VALUE (EDITABLE, AUTO-CALCULATED) */}
          <div className="space-y-1.5">
            <label htmlFor="invoiceValue" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.invoiceValueLabel || "Invoice Value (EGP)"}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Receipt size={17} />
              </div>
              <input
                id="invoiceValue"
                type="number"
                min="0"
                step="any"
                value={invoiceValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setInvoiceValue(val);
                  if (!hasManuallyEditedSpent) {
                    setActualSpent(val);
                  }
                }}
                placeholder={tr.invoiceValuePlaceholder || "0.00"}
                title={tr.invoiceValueTooltip}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
              />
            </div>
          </div>

          {/* FIELD 9: ACTUAL SPENT (AMOUNT PAID) */}
          <div className="space-y-1.5">
            <label htmlFor="actualSpent" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.actualSpentLabel || "Actual Spent (EGP)"}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <Wallet size={17} />
              </div>
              <input
                id="actualSpent"
                type="number"
                min="0"
                step="any"
                value={actualSpent}
                onChange={(e) => {
                  setActualSpent(e.target.value);
                  setHasManuallyEditedSpent(true);
                }}
                placeholder={tr.actualSpentPlaceholder || "0.00"}
                title={tr.actualSpentTooltip}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10"
              />
            </div>
          </div>

          {/* FIELD 10: PAYMENT METHOD (OPTIONAL) */}
          <div className="space-y-1.5">
            <label htmlFor="paymentTypeSelect" className="text-xs sm:text-sm font-bold text-[#111827]">
              {tr.paymentTypeOptional || tr.paymentTypeLabel}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center pl-3.5 rtl:pl-0 rtl:pr-3.5 text-[#5A6A51] z-10">
                <CreditCard size={17} />
              </div>
              <select
                id="paymentTypeSelect"
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm font-medium text-[#111827] outline-none transition focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 cursor-pointer"
              >
                <option value="">{tr.selectPaymentTypePlaceholder}</option>
                {Object.entries(tr.paymentTypes || {}).map(([key, label]: [string, any]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center pr-3.5 rtl:pr-0 rtl:pl-3.5 text-[#6B7280] z-10">
                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 4: NOTES (FULL WIDTH) ── */}
        <div className="space-y-1.5">
          <label htmlFor="bookingNotes" className="text-xs sm:text-sm font-bold text-[#111827] flex items-center gap-1.5">
            <FileText size={15} className="text-[#5A6A51]" />
            <span>{tr.notesLabel || "Notes (Optional)"}</span>
          </label>
          <div className="relative flex items-start">
            <textarea
              id="bookingNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr.notesPlaceholder || "Enter any notes or remarks regarding this historical booking..."}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#414E36] focus:ring-2 focus:ring-[#414E36]/10 resize-y"
            />
          </div>
        </div>

        {/* ── DYNAMIC FINANCIAL LEDGER IMPACT PREVIEW ── */}
        {(() => {
          const numInvoice = parseFloat(invoiceValue) || 0;
          const numSpent = parseFloat(actualSpent) || 0;
          const diff = numInvoice - numSpent;

          if (numInvoice === 0 && numSpent === 0) return null;

          return (
            <div className="rounded-2xl border border-gray-200/80 bg-[#F9FBF8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-[#374151]">
                <Coins size={16} className="text-[#414E36] shrink-0" />
                <span>{tr.ledgerImpact || "Financial Ledger Preview:"}</span>
                <span className="text-[#6B7280] font-normal">
                  (Invoice: {numInvoice.toLocaleString()} EGP | Spent: {numSpent.toLocaleString()} EGP)
                </span>
              </div>
              <div>
                {diff > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1 font-bold text-rose-700">
                    <span>+{diff.toLocaleString()} EGP</span>
                    <span className="font-medium text-[11px] text-rose-600">({tr.ledgerDebt || "Added to Outstanding Debt"})</span>
                  </span>
                ) : diff < 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-700">
                    <span>+{Math.abs(diff).toLocaleString()} EGP</span>
                    <span className="font-medium text-[11px] text-emerald-600">({tr.ledgerCredit || "Settles Debt & Credits Wallet"})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-700">
                    <CheckCircle2 size={13} />
                    <span>{tr.ledgerExact || "Fully Settled (0 EGP Debt)"}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── SAGE CALLOUT BANNER ── */}
        <div className="rounded-2xl border border-[#D5DFD1] bg-[#F3F7F1] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#384E34] text-[#384E34] font-bold">
              <Info size={16} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#1F251A]">
                {tr.bannerTitle}
              </p>
              <p className="text-[11px] sm:text-xs text-[#5A6A51] mt-0.5">
                {tr.bannerSubtitle}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 border border-[#E3ECE0] text-[#5A6A51] shrink-0">
            <CalendarIcon size={18} className="text-[#384E34]" />
            <Clock size={14} className="text-[#6B7280]" />
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#374151] shadow-2xs hover:bg-gray-50 transition cursor-pointer disabled:opacity-60"
          >
            {tr.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2D3F2A] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1E2D1C] active:scale-98 transition cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isEditMode ? (tr.updatingBtn || "Updating...") : tr.savingBtn}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEditMode ? (tr.updateBookingBtn || "Update Booking") : tr.submitBtn}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddPreviousBookingView;


