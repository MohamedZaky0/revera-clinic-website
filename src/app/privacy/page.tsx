import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { CLIENT } from "@/config/client";
import { landingFontClass } from "@/components/landing/fonts";
import { LandingLogo } from "@/components/landing/LandingLogo";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  metadataBase: new URL(CLIENT.siteUrl),
  title: `سياسة الخصوصية | ${CLIENT.name}`,
  description: `كيف تتعامل ${CLIENT.name} مع البيانات التي تشاركها معنا عند التواصل عبر WhatsApp أو الهاتف.`,
  alternates: { canonical: "/privacy" },
};

const waHref = `https://wa.me/${CLIENT.whatsappNumber}?text=${encodeURIComponent(`مرحبًا ${CLIENT.nameShort}، عندي سؤال عن الخصوصية`)}`;

export default function PrivacyPage() {
  return (
    <main className={`lp-privacy ${landingFontClass}`} dir="rtl" lang="ar">
      <div className="lp-privacy-wrap">
        <Link className="lp-privacy-back" href="/laser-tagamoa"><ArrowRight size={17} aria-hidden="true" /> العودة إلى صفحة الليزر</Link>
        <LandingLogo />
        <span className="lp-kicker">سياسة الخصوصية</span>
        <h1>خصوصيتك مهمة عندنا.</h1>
        <p>نستخدم البيانات التي تشاركها معنا بإرادتك فقط للرد على استفسارك وتنسيق التواصل مع {CLIENT.name}. لا نطلب بيانات حساسة من خلال هذه الصفحة.</p>
        <h2>ما الذي يتم جمعه؟</h2>
        <p>عند التواصل عبر WhatsApp أو الهاتف، قد نرى اسمك ورقم الهاتف ومحتوى الرسالة التي ترسلها. نستخدم هذه المعلومات للرد على أسئلتك ومساعدتك في معرفة الخطوة المناسبة.</p>
        <h2>ملفات الارتباط والقياس</h2>
        <p>قد نستخدم أدوات قياس زيارات وتحويلات إعلانية لتحسين أداء الصفحة وفهم ضغطات WhatsApp والاتصال. لا نبيع بياناتك ولا نستخدمها خارج الغرض المرتبط بالتواصل مع العيادة.</p>
        <h2>تواصل معنا</h2>
        <p>لو عندك أي سؤال عن الخصوصية، تواصل معنا مباشرة عبر WhatsApp.</p>
        <a className="lp-wa" href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> تواصل على WhatsApp</a>
        <small>آخر تحديث: سبتمبر 2026</small>
      </div>
    </main>
  );
}
