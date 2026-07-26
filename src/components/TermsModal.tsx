"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  ShieldCheck, 
  Lock, 
  Phone, 
  Mail, 
  Globe, 
  X, 
  ChevronDown
} from "lucide-react";

interface TermItem {
  id: string;
  sort_order: number;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  link_text_en?: string;
  link_text_ar?: string;
  link_url?: string;
  is_active: boolean;
}

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLang?: "en" | "ar";
}

const DEFAULT_TERMS: TermItem[] = [
  {
    id: "1",
    sort_order: 1,
    title_en: "Acceptance of Terms",
    title_ar: "قبول الشروط",
    content_en: "By using Revera Clinic's website or services, you agree to be bound by these Terms & Conditions and all applicable laws and regulations.",
    content_ar: "باستخدامك لموقع أو خدمات عيادة ريفيرا، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها.",
    is_active: true
  },
  {
    id: "2",
    sort_order: 2,
    title_en: "Use of Services",
    title_ar: "استخدام الخدمات",
    content_en: "You agree to use our services only for lawful purposes and in accordance with our policies. You must provide accurate and complete information when booking or registering.",
    content_ar: "تتوافق على استخدام خدماتنا فقط لأغراض قانونية ووفقاً لسياساتنا. يجب عليك تقديم معلومات دقيقة وكاملة عند الحجز أو التسجيل.",
    is_active: true
  },
  {
    id: "3",
    sort_order: 3,
    title_en: "Appointments & Bookings",
    title_ar: "المواعيد والحجوزات",
    content_en: "All appointments are subject to availability and confirmation. Please arrive on time. Late arrivals may result in shortened or rescheduled appointments.",
    content_ar: "جميع المواعيد تخضع للتوافر والتأكيد. يرجى الحضور في الموعد المحدد. قد يؤدي التأخير إلى تقصير مدة الجلسة أو إعادة جدولتها.",
    is_active: true
  },
  {
    id: "4",
    sort_order: 4,
    title_en: "Cancellations & Rescheduling",
    title_ar: "الإلغاء وإعادة الجدولة",
    content_en: "You can cancel or reschedule your appointment through our website or by contacting us. Please review our cancellation policy for more details.",
    content_ar: "يمكنك إلغاء أو إعادة جدولة موعدك من خلال موقعنا أو بالاتصال بنا. يرجى مراجعة سياسة الإلغاء الخاصة بنا للمزيد من التفاصيل.",
    link_text_en: "cancellation policy",
    link_text_ar: "سياسة الإلغاء",
    link_url: "/terms#cancellation",
    is_active: true
  },
  {
    id: "5",
    sort_order: 5,
    title_en: "Payments & Refunds",
    title_ar: "المدفوعات واسترداد الأموال",
    content_en: "Certain services may require advance payment. Refund eligibility depends on our refund policy. We accept payments through the methods displayed at checkout.",
    content_ar: "قد تتطلب بعض الخدمات الدفع المسبق. تعتمد أهليّة الاسترداد على سياسة الاسترداد الخاصة بنا. نقبل الدفع عبر الطرق الموضحة عند الدفع.",
    link_text_en: "refund policy",
    link_text_ar: "سياسة الاسترداد",
    link_url: "/terms#refund",
    is_active: true
  },
  {
    id: "6",
    sort_order: 6,
    title_en: "User Responsibilities",
    title_ar: "مسؤوليات المستخدم",
    content_en: "You are responsible for maintaining the confidentiality of your information and account details. You agree not to misuse our services or attempt unauthorized access.",
    content_ar: "أنت مسؤول عن الحفاظ على سرية معلوماتك وبيانات حسابك. وتتعهد بعدم إساءة استخدام خدماتنا أو محاولة الوصول غير المصرح به.",
    is_active: true
  },
  {
    id: "7",
    sort_order: 7,
    title_en: "Limitation of Liability",
    title_ar: "تحديد المسؤولية",
    content_en: "Revera Clinic is not liable for any indirect or incidental damages resulting from the use of our services. Our total liability shall not exceed the amount paid for the service.",
    content_ar: "عيادة ريفيرا غير مسؤولة عن أي أضرار غير مباشرة أو عرضية ناتجة عن استخدام خدماتنا. لا تتجاوز مسؤوليتنا الإجمالية المبلغ المدفوع مقابل الخدمة.",
    is_active: true
  },
  {
    id: "8",
    sort_order: 8,
    title_en: "Changes to Terms",
    title_ar: "التغييرات في الشروط",
    content_en: "We may update these Terms & Conditions from time to time. Continued use of our services after changes means you accept the updated terms.",
    content_ar: "قد نقوم بتحديث هذه الشروط والأحكام من وقت لآخر. استمرارك في استخدام خدماتنا بعد التغييرات يعني قبولك للشروط المحدثة.",
    is_active: true
  },
  {
    id: "9",
    sort_order: 9,
    title_en: "Contact Us",
    title_ar: "اتصل بنا",
    content_en: "If you have any questions about these Terms & Conditions, please contact us:",
    content_ar: "إذا كانت لديك أي أسئلة حول هذه الشروط والأحكام، يرجى الاتصال بنا:",
    is_active: true
  }
];

export default function TermsModal({ isOpen, onClose, defaultLang = "en" }: TermsModalProps) {
  const [lang, setLang] = useState<"en" | "ar">(defaultLang);
  const [terms, setTerms] = useState<TermItem[]>(DEFAULT_TERMS);

  useEffect(() => {
    setLang(defaultLang);
  }, [defaultLang]);

  useEffect(() => {
    if (isOpen) {
      async function loadTerms() {
        try {
          const res = await fetch('/api/terms?active_only=true');
          if (res.ok) {
            const data = await res.json();
            if (data.terms && data.terms.length > 0) {
              setTerms(data.terms);
            }
          }
        } catch (e) {
          console.error('Failed to load terms in modal:', e);
        }
      }
      loadTerms();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAr = lang === "ar";
  const contactPhone = "0100 123 4567";
  const contactEmail = "support@reveraclinic.com";
  const contactWeb = "www.reveraclinic.com";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div 
        className={`relative w-full max-w-4xl rounded-3xl bg-[#FAFCFA] p-6 sm:p-10 shadow-2xl border border-[#414E36]/15 my-6 max-h-[92vh] overflow-y-auto text-[#1F251A] ${isAr ? "rtl text-right" : "ltr text-left"}`}
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-6 ${isAr ? "left-6" : "right-6"} rounded-full p-2.5 text-gray-400 hover:bg-[#E2EBE2] hover:text-[#1F251A] transition cursor-pointer`}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E2EBE2] text-[#385438]">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17 8C8 10 59 16.17 3.82 21.34L5.71 22L7.58 20.35C12.7 15.5 17 8 17 8Z"/>
                <path d="M12 3C6.5 3 2 7.5 2 13C2 15.5 3 17.8 4.6 19.5L12 12L19.4 19.5C21 17.8 22 15.5 22 13C22 7.5 17.5 3 12 3Z"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-wider text-[#2D522D] uppercase">
              {isAr ? "عيادة ريفيرا" : "REVERA CLINIC"}
            </span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2 pr-8 sm:pr-0">
            <div className="relative inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs">
              <Globe size={14} className={isAr ? "ml-1.5 text-gray-500" : "mr-1.5 text-gray-500"} />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as "en" | "ar")}
                className="bg-transparent pr-4 outline-none cursor-pointer text-xs font-medium text-gray-800 appearance-none"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Header Title Section */}
        <div className="flex items-start gap-4 mb-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2D522D] text-white shadow-md">
            <FileText size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 font-normal">
              {isAr ? "يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا." : "Please read these terms carefully before using our services."}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 font-medium">
              {isAr ? "آخر تحديث: 17 يوليو 2025" : "Last updated: July 17, 2025"}
            </p>
          </div>
        </div>

        {/* Main Terms Container Card */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {terms.map((item, idx) => {
            const num = idx + 1;
            const title = isAr ? (item.title_ar || item.title_en) : item.title_en;
            const content = isAr ? (item.content_ar || item.content_en) : item.content_en;
            const linkText = isAr ? item.link_text_ar : item.link_text_en;
            const isContactSection = title.toLowerCase().includes("contact") || title.includes("اتصل");

            return (
              <div key={item.id || idx} className="flex items-start gap-4 pb-5 border-b border-gray-100 last:border-b-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E2EBE2] text-[#2D522D] font-bold text-xs sm:text-sm">
                  {num}
                </div>
                <div className="space-y-1.5 pt-0.5 w-full">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">{title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                    {content}{" "}
                    {linkText && (
                      <a href={item.link_url || "#"} className="text-[#2D522D] font-semibold underline underline-offset-2 hover:opacity-80 mx-1">
                        {linkText}
                      </a>
                    )}
                  </p>

                  {/* Contact Us Sub-info inside Contact section */}
                  {isContactSection && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#2D522D] pt-2">
                      <a href={`tel:${contactPhone}`} className="flex items-center gap-1.5 hover:underline bg-[#F2F7F2] px-3 py-1.5 rounded-full border border-[#D5E3D5]">
                        <Phone size={13} />
                        <span>{contactPhone}</span>
                      </a>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 hover:underline bg-[#F2F7F2] px-3 py-1.5 rounded-full border border-[#D5E3D5]">
                        <Mail size={13} />
                        <span>{contactEmail}</span>
                      </a>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <a href={`https://${contactWeb}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline bg-[#F2F7F2] px-3 py-1.5 rounded-full border border-[#D5E3D5]">
                        <Globe size={13} />
                        <span>{contactWeb}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Banner */}
        <div className="mt-6 flex items-center gap-3.5 rounded-2xl border border-[#D0E2D0] bg-[#EEF5EE] p-4 text-xs sm:text-sm text-[#2D522D]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DBE8DB]">
            <ShieldCheck size={20} className="text-[#2D522D]" />
          </div>
          <p className="font-medium leading-relaxed">
            {isAr 
              ? "ثقتكم تهمنا كثيراً. نحن ملتزمون بحماية معلوماتكم وتقديم تجربة آمنة واحترافية." 
              : "Your trust is important to us. We are committed to protecting your information and providing a safe and professional experience."}
          </p>
        </div>

        {/* Bottom Footer */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 pt-4 border-t border-gray-200/60 font-medium">
          <p>{isAr ? "© 2025 عيادة ريفيرا. جميع الحقوق محفوظة." : "© 2025 Revera Clinic. All rights reserved."}</p>
          <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
            <Lock size={14} className="text-[#2D522D]" />
            <span>{isAr ? "آمن ومشفّر" : "Secure & Encrypted"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
