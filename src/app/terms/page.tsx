"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  ShieldCheck, 
  Lock, 
  Phone, 
  Mail, 
  Globe, 
  ChevronDown,
  ArrowLeft
} from "lucide-react";

export default function TermsPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");

  const isAr = lang === "ar";

  const content = {
    en: {
      brand: "REVERA CLINIC",
      title: "Terms & Conditions",
      subtitle: "Please read these terms carefully before using our services.",
      lastUpdated: "Last updated: July 17, 2025",
      trustNotice: "Your trust is important to us. We are committed to protecting your information and providing a safe and professional experience.",
      rights: "© 2025 Revera Clinic. All rights reserved.",
      secure: "Secure & Encrypted",
      contactPhone: "0100 123 4567",
      contactEmail: "support@reveraclinic.com",
      contactWeb: "www.reveraclinic.com",
      sections: [
        {
          num: 1,
          title: "Acceptance of Terms",
          text: "By using Revera Clinic's website or services, you agree to be bound by these Terms & Conditions and all applicable laws and regulations."
        },
        {
          num: 2,
          title: "Use of Services",
          text: "You agree to use our services only for lawful purposes and in accordance with our policies. You must provide accurate and complete information when booking or registering."
        },
        {
          num: 3,
          title: "Appointments & Bookings",
          text: "All appointments are subject to availability and confirmation. Please arrive on time. Late arrivals may result in shortened or rescheduled appointments."
        },
        {
          num: 4,
          title: "Cancellations & Rescheduling",
          text: "You can cancel or reschedule your appointment through our website or by contacting us. Please review our ",
          linkText: "cancellation policy",
          postText: " for more details."
        },
        {
          num: 5,
          title: "Payments & Refunds",
          text: "Certain services may require advance payment. Refund eligibility depends on our ",
          linkText: "refund policy",
          postText: ". We accept payments through the methods displayed at checkout."
        },
        {
          num: 6,
          title: "User Responsibilities",
          text: "You are responsible for maintaining the confidentiality of your information and account details. You agree not to misuse our services or attempt unauthorized access."
        },
        {
          num: 7,
          title: "Limitation of Liability",
          text: "Revera Clinic is not liable for any indirect or incidental damages resulting from the use of our services. Our total liability shall not exceed the amount paid for the service."
        },
        {
          num: 8,
          title: "Changes to Terms",
          text: "We may update these Terms & Conditions from time to time. Continued use of our services after changes means you accept the updated terms."
        },
        {
          num: 9,
          title: "Contact Us",
          text: "If you have any questions about these Terms & Conditions, please contact us:"
        }
      ]
    },
    ar: {
      brand: "عيادة ريفيرا",
      title: "الشروط والأحكام",
      subtitle: "يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا.",
      lastUpdated: "آخر تحديث: 17 يوليو 2025",
      trustNotice: "ثقتكم تهمنا كثيراً. نحن ملتزمون بحماية معلوماتكم وتقديم تجربة آمنة واحترافية.",
      rights: "© 2025 عيادة ريفيرا. جميع الحقوق محفوظة.",
      secure: "آمن ومشفّر",
      contactPhone: "0100 123 4567",
      contactEmail: "support@reveraclinic.com",
      contactWeb: "www.reveraclinic.com",
      sections: [
        {
          num: 1,
          title: "قبول الشروط",
          text: "باستخدامك لموقع أو خدمات عيادة ريفيرا، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها."
        },
        {
          num: 2,
          title: "استخدام الخدمات",
          text: "تتوافق على استخدام خدماتنا فقط لأغراض قانونية ووفقاً لسياساتنا. يجب عليك تقديم معلومات دقيقة وكاملة عند الحجز أو التسجيل."
        },
        {
          num: 3,
          title: "المواعيد والحجوزات",
          text: "جميع المواعيد تخضع للتوافر والتأكيد. يرجى الحضور في الموعد المحدد. قد يؤدي التأخير إلى تقصير مدة الجلسة أو إعادة جدولتها."
        },
        {
          num: 4,
          title: "الإلغاء وإعادة الجدولة",
          text: "يمكنك إلغاء أو إعادة جدولة موعدك من خلال موقعنا أو بالاتصال بنا. يرجى مراجعة ",
          linkText: "سياسة الإلغاء",
          postText: " الخاصة بنا للمزيد من التفاصيل."
        },
        {
          num: 5,
          title: "المدفوعات واسترداد الأموال",
          text: "قد تتطلب بعض الخدمات الدفع المسبق. تعتمد أهليّة الاسترداد على ",
          linkText: "سياسة الاسترداد",
          postText: " الخاصة بنا. نقبل الدفع عبر الطرق الموضحة عند الدفع."
        },
        {
          num: 6,
          title: "مسؤوليات المستخدم",
          text: "أنت مسؤول عن الحفاظ على سرية معلوماتك وبيانات حسابك. وتتعهد بعدم إساءة استخدام خدماتنا أو محاولة الوصول غير المصرح به."
        },
        {
          num: 7,
          title: "تحديد المسؤولية",
          text: "عيادة ريفيرا غير مسؤولة عن أي أضرار غير مباشرة أو عرضية ناتجة عن استخدام خدماتنا. لا تتجاوز مسؤوليتنا الإجمالية المبلغ المدفوع مقابل الخدمة."
        },
        {
          num: 8,
          title: "التغييرات في الشروط",
          text: "قد نقوم بتحديث هذه الشروط والأحكام من وقت لآخر. استمرارك في استخدام خدماتنا بعد التغييرات يعني قبولك للشروط المحدثة."
        },
        {
          num: 9,
          title: "اتصل بنا",
          text: "إذا كانت لديك أي أسئلة حول هذه الشروط والأحكام، يرجى الاتصال بنا:"
        }
      ]
    }
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#1F251A] py-8 px-4 sm:px-8 font-sans" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-4xl rounded-3xl bg-[#FAFCFA] p-6 sm:p-10 shadow-xl border border-[#414E36]/15">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-6 mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E2EBE2] text-[#385438] group-hover:scale-105 transition">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17 8C8 10 59 16.17 3.82 21.34L5.71 22L7.58 20.35C12.7 15.5 17 8 17 8Z"/>
                <path d="M12 3C6.5 3 2 7.5 2 13C2 15.5 3 17.8 4.6 19.5L12 12L19.4 19.5C21 17.8 22 15.5 22 13C22 7.5 17.5 3 12 3Z"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-wider text-[#2D522D] uppercase">{t.brand}</span>
          </Link>

          {/* Language Switcher */}
          <div className="flex items-center gap-2">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{t.title}</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 font-normal">{t.subtitle}</p>
            <p className="mt-1 text-[11px] text-gray-400 font-medium">{t.lastUpdated}</p>
          </div>
        </div>

        {/* Main Terms Container Card */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {t.sections.map((section) => (
            <div key={section.num} className="flex items-start gap-4 pb-5 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E2EBE2] text-[#2D522D] font-bold text-xs sm:text-sm">
                {section.num}
              </div>
              <div className="space-y-1.5 pt-0.5">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">{section.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                  {section.text}
                  {section.linkText && (
                    <span className="text-[#2D522D] font-semibold underline underline-offset-2 cursor-pointer hover:opacity-80 mx-1">
                      {section.linkText}
                    </span>
                  )}
                  {section.postText && section.postText}
                </p>

                {/* Contact Us Sub-info inside Section 9 */}
                {section.num === 9 && (
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#2D522D] pt-2">
                    <a href={`tel:${t.contactPhone}`} className="flex items-center gap-1.5 hover:underline bg-[#F2F7F2] px-3 py-1.5 rounded-full border border-[#D5E3D5]">
                      <Phone size={13} />
                      <span>{t.contactPhone}</span>
                    </a>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <a href={`mailto:${t.contactEmail}`} className="flex items-center gap-1.5 hover:underline bg-[#F2F7F2] px-3 py-1.5 rounded-full border border-[#D5E3D5]">
                      <Mail size={13} />
                      <span>{t.contactEmail}</span>
                    </a>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <a href={`https://${t.contactWeb}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline bg-[#F2F7F2] px-3 py-1.5 rounded-full border border-[#D5E3D5]">
                      <Globe size={13} />
                      <span>{t.contactWeb}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Banner */}
        <div className="mt-6 flex items-center gap-3.5 rounded-2xl border border-[#D0E2D0] bg-[#EEF5EE] p-4 text-xs sm:text-sm text-[#2D522D]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DBE8DB]">
            <ShieldCheck size={20} className="text-[#2D522D]" />
          </div>
          <p className="font-medium leading-relaxed">{t.trustNotice}</p>
        </div>

        {/* Bottom Footer */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 pt-4 border-t border-gray-200/60 font-medium">
          <p>{t.rights}</p>
          <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
            <Lock size={14} className="text-[#2D522D]" />
            <span>{t.secure}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
