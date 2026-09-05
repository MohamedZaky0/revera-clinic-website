"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthModal } from "@/components/AuthModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";

/**
 * GET/POST /api/customers requires an authenticated caller (staff or the patient's own
 * Supabase Auth session — RISK-018 / FINANCE_TRACKER 0.10). This page has no live
 * onAuthStateChange listener; `getSession()` reads the session the `supabase` client already
 * persisted from AuthModal's login flow.
 */
async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  Wallet,
  DollarSign,
  TrendingUp,
  Briefcase,
  Layers,
  ArrowLeft,
  LogOut,
  Edit,
  Save,
  Clock,
  Sparkles,
  HelpCircle,
  FileText
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { isRTL } = useLanguage();

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Customer DB Profile State
  const [dbProfile, setDbProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Edit Form States
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [occupation, setOccupation] = useState("");
  const [formError, setFormError] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  // Booking history
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Static services and branches list for name mapping
  const [services, setServices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const setMobileAndPreloadData = async (sessionUser: any) => {
    if (!sessionUser?.mobile) return;
    setLoadingProfile(true);
    try {
      // 1. Fetch latest profile details from database
      const headers = await authHeaders();
      const res = await fetch(`/api/customers?mobile=${sessionUser.mobile}`, { headers });
      if (res.ok) {
        const customer = await res.json();
        if (customer) {
          setDbProfile(customer);
          setFullName(customer.name || "");
          setEmail(customer.email || "");
          setGender(customer.gender || "");
          setAddress(customer.address || "");
          setAge(customer.age ? String(customer.age) : "");
          setNationalId(customer.national_id || "");
          setOccupation(customer.occupation || "");
        }
      }

      // 2. Fetch bookings list
      setLoadingBookings(true);
      const bookingsRes = await fetch(`/api/reservations?phone=${sessionUser.mobile}`, { headers });
      if (bookingsRes.ok) {
        const list = await bookingsRes.json();
        setBookings(list || []);
      }
    } catch (err) {
      console.error("Error loading profile data:", err);
    } finally {
      setLoadingProfile(false);
      setLoadingBookings(false);
    }
  };

  // Fetch localstorage user or Supabase Auth session on mount
  useEffect(() => {
    let active = true;
    const stored = localStorage.getItem("revera_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        setFullName(u.name || "");
        setEmail(u.email || "");
        setMobileAndPreloadData(u);
        setLoadingAuth(false);
        return;
      } catch (err) {
        console.error("Failed to parse user session:", err);
      }
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (!active) return;
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            phone: session.user.phone,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || "Patient",
          };
          setUser(authUser);
          setFullName(authUser.name);
          setEmail(authUser.email || "");
          setMobileAndPreloadData(authUser);
          localStorage.setItem("revera_user", JSON.stringify(authUser));
        }
        setLoadingAuth(false);
      }).catch(() => {
        if (active) setLoadingAuth(false);
      });
    } else {
      setLoadingAuth(false);
    }

    return () => {
      active = false;
    };
  }, []);

  // Fetch reference lists (services and branches)
  useEffect(() => {
    const fetchRefData = async () => {
      try {
        const [servicesRes, branchesRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/branches")
        ]);
        if (servicesRes.ok) {
          const svcs = await servicesRes.json();
          setServices(svcs || []);
        }
        if (branchesRes.ok) {
          const brs = await branchesRes.json();
          setBranches(brs || []);
        }
      } catch (err) {
        console.error("Failed to fetch references:", err);
      }
    };
    fetchRefData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("revera_user");
    sessionStorage.removeItem("revera_profile_prompted");
    window.dispatchEvent(new CustomEvent("revera-auth-change"));
    router.push("/");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError(isRTL ? "الاسم مطلوب" : "Name is required");
      return;
    }

    setSavingForm(true);
    setFormError("");

    const payload = {
      id: dbProfile?.id || user?.id,
      name: fullName.trim(),
      mobile: dbProfile?.mobile || user?.mobile,
      email: email.trim() || null,
      gender: gender || null,
      address: address.trim() || null,
      age: age ? parseInt(age) : null,
      national_id: nationalId.trim() || null,
      occupation: occupation.trim() || null,
      // preserve active and financial values
      active: dbProfile?.active ?? true,
      spent_amount: dbProfile?.spent_amount ?? 0,
      outstanding: dbProfile?.outstanding ?? 0,
      wallet_balance: dbProfile?.wallet_balance ?? 0
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setDbProfile(updated);
        // Sync local storage user details
        const updatedUser = { ...user, name: updated.name, email: updated.email, gender: updated.gender };
        localStorage.setItem("revera_user", JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent("revera-auth-change"));
        setEditMode(false);
      } else {
        const err = await res.json();
        setFormError(err.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setFormError("Connection error. Please try again.");
    } finally {
      setSavingForm(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "approved":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "confirmed":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "started":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
      case "cancelled":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Translations object helper
  const profileT = {
    title: isRTL ? "الملف الشخصي للمريض" : "Patient Profile Dashboard",
    subtitle: isRTL ? "إدارة تفاصيل حسابك وسجل زياراتك" : "Manage your clinic account details and visit history",
    editBtn: isRTL ? "تعديل الملف" : "Edit Profile",
    saveBtn: isRTL ? "حفظ التغييرات" : "Save Changes",
    cancelBtn: isRTL ? "إلغاء" : "Cancel",
    logoutBtn: isRTL ? "تسجيل الخروج" : "Logout",
    walletBal: isRTL ? "رصيد المحفظة" : "Wallet Balance",
    totalSpent: isRTL ? "إجمالي المدفوعات" : "Total Spent",
    outstanding: isRTL ? "ديون معلقة" : "Outstanding Balance",
    nameLabel: isRTL ? "الاسم الكامل" : "Full Name",
    emailLabel: isRTL ? "البريد الإلكتروني" : "Email Address",
    mobileLabel: isRTL ? "رقم الموبايل" : "Mobile Number",
    genderLabel: isRTL ? "النوع" : "Gender",
    genderMale: isRTL ? "ذكر" : "Male",
    genderFemale: isRTL ? "أنثى" : "Female",
    addressLabel: isRTL ? "العنوان بالتفصيل" : "Full Address",
    ageLabel: isRTL ? "السن" : "Age",
    nationalIdLabel: isRTL ? "الرقم القومي" : "National ID",
    occupationLabel: isRTL ? "المهنة" : "Occupation",
    bookingsTitle: isRTL ? "سجل الحجوزات والزيارات" : "Your Visit History",
    bookingsDesc: isRTL ? "قائمة بجميع زياراتك وحجوزاتك الحالية والسابقة" : "List of all your scheduled, active, and completed clinic visits",
    emptyBookings: isRTL ? "ليس لديك أي حجوزات حتى الآن." : "You do not have any bookings yet.",
    bookNow: isRTL ? "احجز موعدك الآن" : "Book an Appointment Now",
    backHome: isRTL ? "العودة للرئيسية" : "Back to Home",
    loginRequired: isRTL ? "يتطلب تسجيل الدخول" : "Authentication Required",
    loginDesc: isRTL ? "يرجى تسجيل الدخول أو إكمال حجزك الأول لعرض تفاصيل ملفك الشخصي." : "Please log in or book your first appointment to view your profile dashboard.",
    goLogin: isRTL ? "تسجيل الدخول / العودة للرئيسية" : "Login / Return Home",
    sessionDetails: isRTL ? "تفاصيل الجلسة" : "Session Details",
    dateLabel: isRTL ? "التاريخ" : "Date",
    timeLabel: isRTL ? "الوقت" : "Time",
    doctorLabel: isRTL ? "الطبيب" : "Doctor",
    branchLabel: isRTL ? "الفرع" : "Branch",
    statusLabel: isRTL ? "الحالة" : "Status",
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#414E36]/20 border-t-[#414E36] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not Logged In Placeholder View
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FBFBF9] pt-32 pb-20 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(47,61,41,0.05)] border border-[#414E36]/10 text-center">
            <div className="mx-auto w-16 h-16 bg-[#EDF1EC] rounded-full flex items-center justify-center text-[#414E36] mb-6">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-bold text-[#1F251A]">{profileT.loginRequired}</h2>
            <p className="text-[#5A6A51] text-sm mt-3 leading-relaxed">
              {profileT.loginDesc}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-8 w-full bg-[#414E36] text-[#FBFBF9] py-3.5 rounded-2xl font-bold hover:bg-[#2e3a26] transition shadow-md"
            >
              {profileT.goLogin}
            </button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const walletVal = dbProfile ? Number(dbProfile.wallet_balance || 0) : 0;
  const spentVal = dbProfile ? Number(dbProfile.spent_amount || 0) : 0;
  const outstandingVal = dbProfile ? Number(dbProfile.outstanding || 0) : 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FBFBF9] pt-32 pb-20" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Cover Header */}
          <div className="relative rounded-[40px] overflow-hidden bg-gradient-to-br from-[#1F251A] to-[#414E36] p-8 sm:p-12 text-[#FBFBF9] shadow-xl mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#C4AE7C]/20 ring-4 ring-[#C4AE7C]/40 flex items-center justify-center text-[#C4AE7C] text-2xl font-bold">
                {fullName.charAt(0) || "U"}
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#C4AE7C] font-bold">Revera Patient Account</span>
                <h1 className="text-2xl sm:text-3xl font-bold mt-1">{fullName}</h1>
                <p className="text-xs text-[#FBFBF9]/70 mt-1 flex items-center gap-1.5">
                  <Phone size={12} /> {dbProfile?.mobile || user.mobile}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FBFBF9]/20 bg-[#FBFBF9]/10 px-5 py-3 text-sm font-semibold hover:bg-[#FBFBF9]/20 transition"
              >
                {editMode ? <ArrowLeft size={16} /> : <Edit size={16} />}
                {editMode ? profileT.cancelBtn : profileT.editBtn}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600/90 text-white px-5 py-3 text-sm font-semibold hover:bg-red-700 transition"
              >
                <LogOut size={16} />
                {profileT.logoutBtn}
              </button>
            </div>
          </div>

          {/* Financial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Wallet Balance Card */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-[#C4AE7C]/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">{profileT.walletBal}</p>
                <p className="text-2xl font-bold text-[#1F251A] mt-2">EGP {walletVal.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#C4AE7C]/10 text-[#C4AE7C] flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>

            {/* Total Spent Card */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-[#414E36]/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">{profileT.totalSpent}</p>
                <p className="text-2xl font-bold text-green-600 mt-2">EGP {spentVal.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                <DollarSign size={24} />
              </div>
            </div>

            {/* Outstanding Card */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-[#414E36]/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">{profileT.outstanding}</p>
                <p className="text-2xl font-bold text-red-600 mt-2">EGP {outstandingVal.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Profile form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[32px] p-6 shadow-[0_15px_40px_rgba(47,61,41,0.03)] border border-[#414E36]/10">
                <h3 className="text-lg font-bold text-[#1F251A] mb-4 pb-3 border-b border-[#414E36]/10 flex items-center gap-2">
                  <User size={18} className="text-[#C4AE7C]" />
                  {isRTL ? "بيانات الملف الشخصي" : "Personal Information"}
                </h3>
                
                {editMode ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {formError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        {formError}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.nameLabel}</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.emailLabel}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.genderLabel}</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">{profileT.genderMale}</option>
                        <option value="Female">{profileT.genderFemale}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.ageLabel}</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.occupationLabel}</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.nationalIdLabel}</label>
                      <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5A6A51] mb-1">{profileT.addressLabel}</label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingForm}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#414E36] py-3 text-sm font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition disabled:opacity-50"
                    >
                      <Save size={16} />
                      {savingForm ? "Saving..." : profileT.saveBtn}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.nameLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">{dbProfile?.name || user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.mobileLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">{dbProfile?.mobile || user.mobile}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.emailLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">{dbProfile?.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.genderLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">
                        {dbProfile?.gender === "Male" ? profileT.genderMale : dbProfile?.gender === "Female" ? profileT.genderFemale : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.ageLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">{dbProfile?.age || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.occupationLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">{dbProfile?.occupation || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.nationalIdLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5">{dbProfile?.national_id || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5A6A51] font-semibold">{profileT.addressLabel}</p>
                      <p className="text-sm font-bold text-[#1F251A] mt-0.5 leading-relaxed">{dbProfile?.address || "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Booking history */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_15px_40px_rgba(47,61,41,0.03)] border border-[#414E36]/10">
                <div>
                  <h2 className="text-xl font-bold text-[#1F251A]">{profileT.bookingsTitle}</h2>
                  <p className="text-sm text-[#5A6A51] mt-1">{profileT.bookingsDesc}</p>
                </div>

                <div className="mt-8 space-y-4">
                  {loadingBookings ? (
                    <div className="py-12 flex justify-center">
                      <div className="w-8 h-8 border-4 border-[#414E36]/20 border-t-[#414E36] rounded-full animate-spin"></div>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-12 rounded-3xl bg-[#F9F9F7] border border-[#414E36]/10 px-4">
                      <Calendar className="mx-auto text-[#5A6A51]/40 mb-4" size={40} />
                      <p className="text-[#5A6A51] text-sm font-medium">{profileT.emptyBookings}</p>
                      <button
                        onClick={() => router.push("/book")}
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-3 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition shadow-md"
                      >
                        {profileT.bookNow}
                      </button>
                    </div>
                  ) : (
                    bookings.map((booking) => {
                      // Map service name
                      const svcIds = Array.isArray(booking.serviceIds) ? booking.serviceIds : [booking.serviceId];
                      const serviceNames = svcIds
                        .map((id: number) => {
                          const s = services.find((srv) => srv.id === id);
                          return s ? (isRTL ? s.ar : s.en) : `Service #${id}`;
                        })
                        .join(" + ");

                      // Map branch name
                      const branch = branches.find((b) => b.id === booking.branchId);
                      const branchName = branch ? (isRTL ? branch.name_ar : branch.name_en) : "Revera Zayed Clinic";

                      return (
                        <div
                          key={booking.id}
                          className="rounded-3xl border border-[#414E36]/10 p-5 hover:border-[#C4AE7C] transition-all bg-[#FBFBF9]/30 hover:bg-white"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#414E36]/10 pb-3 mb-3">
                            <div>
                              <p className="text-xs text-[#5A6A51] font-semibold">{profileT.sessionDetails}</p>
                              <h4 className="font-bold text-[#1F251A] text-base mt-0.5">{serviceNames}</h4>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadgeClass(booking.status)}`}>
                              {isRTL ? (
                                booking.status === "pending" ? "قيد الانتظار" :
                                booking.status === "approved" ? "مقبول" :
                                booking.status === "confirmed" ? "مؤكد" :
                                booking.status === "started" ? "نشط الآن" :
                                booking.status === "completed" ? "مكتمل" :
                                booking.status === "rejected" ? "مرفوض" : "ملغي"
                              ) : (
                                booking.status.toUpperCase()
                              )}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-[#5A6A51] font-semibold flex items-center gap-1">
                                <Calendar size={12} /> {profileT.dateLabel}
                              </p>
                              <p className="font-bold text-[#1F251A] mt-1">{booking.date}</p>
                            </div>
                            <div>
                              <p className="text-[#5A6A51] font-semibold flex items-center gap-1">
                                <Clock size={12} /> {profileT.timeLabel}
                              </p>
                              <p className="font-bold text-[#1F251A] mt-1">{booking.timeSlot || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[#5A6A51] font-semibold flex items-center gap-1">
                                <User size={12} /> {profileT.doctorLabel}
                              </p>
                              <p className="font-bold text-[#1F251A] mt-1">{booking.doctorName || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[#5A6A51] font-semibold flex items-center gap-1">
                                <MapPin size={12} /> {profileT.branchLabel}
                              </p>
                              <p className="font-bold text-[#1F251A] mt-1">{branchName}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
      <SiteFooter />
      <AuthModal />
    </>
  );
}
