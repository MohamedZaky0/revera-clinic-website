import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpLeft, Check, ChevronDown, ClipboardCheck, Clock3, ExternalLink, MapPin, MessageCircle,
  Phone, ShieldCheck, Sparkles, Star, Stethoscope, Target, ThermometerSnowflake, Waves,
} from "lucide-react";
import { CLIENT } from "@/config/client";
import { LANDING_COPY, LANDING_REVIEWS, type LandingVariant } from "@/lib/landingCopy";
import { landingFontClass } from "./fonts";
import { LandingAnalytics } from "./LandingAnalytics";
import { LandingLogo } from "./LandingLogo";
import { LandingTracker } from "./LandingTracker";
import "./landing.css";

const waHref = (text: string) => `https://wa.me/${CLIENT.whatsappNumber}?text=${encodeURIComponent(text)}`;

function Stars({ size }: { size: number }) {
  return (
    <span className="lp-stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} fill="currentColor" />)}
    </span>
  );
}

function WhatsAppCta({ placement, message, children, className = "" }: { placement: string; message: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      className={`lp-wa ${className}`}
      href={waHref(message)}
      target="_blank"
      rel="noreferrer"
      data-lp-event="whatsapp_click"
      data-lp-placement={placement}
    >
      <MessageCircle size={19} aria-hidden="true" />
      <span>{children}</span>
      <ArrowUpLeft size={17} aria-hidden="true" />
    </a>
  );
}

function CallCta({ placement, children, className = "" }: { placement: string; children: React.ReactNode; className?: string }) {
  return (
    <a className={`lp-call ${className}`} href={`tel:${CLIENT.phoneTel}`} data-lp-event="call_click" data-lp-placement={placement}>
      <Phone size={18} aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}

function InstagramGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

const PROCESS = [
  { title: "استشارة وتقييم", desc: "نفهم هدفك وتاريخك ونحدد احتياجك.", Icon: Stethoscope },
  { title: "اختبار بقعة", desc: "قبل أي جلسة كاملة لما يكون مناسب.", Icon: Target },
  { title: "خطة مكتوبة", desc: "عدد الجلسات المتوقع بالتفصيل.", Icon: ClipboardCheck },
  { title: "جلسات ومتابعة", desc: "نراجع التقدم ونعدّل عند اللزوم.", Icon: Clock3 },
];

export function LaserLanding({ variant }: { variant: LandingVariant }) {
  const c = LANDING_COPY[variant];
  const isMen = c.audience === "men";
  const { score, count } = CLIENT.googleRating;

  const darkSkinSection = c.darkSkin && (
    <section className="lp-section lp-dark-skin" key="dark-skin">
      <div className="lp-wrap lp-split">
        <div className="lp-dark-visual" aria-hidden="true">
          {["I", "II", "III", "IV", "V", "VI"].map((t, i) => <span key={t} className={i >= 2 && i <= 4 ? "active" : ""}>{t}</span>)}
        </div>
        <div className="lp-split-copy">
          <span className="lp-kicker">للبشرة السمراء والقمحية</span>
          <h2>ينفع — بس<br /><em>بالموجة الصح.</em></h2>
          <p>التقييم هو أول خطوة. بنحدد نوع بشرتك ونوضح لك مدى الملاءمة قبل أول جلسة، من غير وعود مطلقة أو تخمين.</p>
          <div className="lp-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>لو عندك تجربة حروق أو رفض قبل كده، احكيلنا عنها في الرسالة.</span>
          </div>
          <WhatsAppCta placement="darkskin" message={c.msg.dark}>{c.darkSkin.ctaLabel}</WhatsAppCta>
          <small className="lp-disclaimer">الليزر لا يعمل على الشعر الأبيض أو الأشقر الفاتح جدًا، وده بنقولهولك في الاستشارة قبل ما تدفعي.</small>
        </div>
      </div>
    </section>
  );

  return (
    <div className={`lp-shell ${landingFontClass}`} dir="rtl" lang="ar">
      <LandingAnalytics />
      <LandingTracker variant={variant} />

      <div className="lp-announcement">تقييم مبدئي واضح · من غير ضغط للحجز · التفاصيل على WhatsApp</div>
      <header className="lp-header">
        <div className="lp-wrap lp-header-inner">
          <LandingLogo />
          <div className="lp-header-actions">
            <CallCta placement="header">{c.headerCallLabel}</CallCta>
            <WhatsAppCta placement="header" message={c.msg.header}>WhatsApp</WhatsAppCta>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow"><span />{c.eyebrow}</span>
              <h1>{c.h1}</h1>
              <p>{c.sub}</p>
              <div className="lp-hero-ctas">
                <WhatsAppCta placement="hero" message={c.msg.hero}>{c.heroCta}</WhatsAppCta>
                <CallCta placement="hero">{c.heroCallLabel}</CallCta>
              </div>
              <small className="lp-micro"><Check size={14} aria-hidden="true" /> القرار بعد ما {isMen ? "تفهم" : "تفهمي"} — من غير التزام</small>
              <a className="lp-rating" href={CLIENT.googleMapsUrl} target="_blank" rel="noreferrer" data-lp-event="map_click" data-lp-placement="hero">
                <Stars size={14} />
                <strong>{score} ★ على Google</strong>
                <span>· {count} تقييم</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
            <div className="lp-hero-media">
              <Image
                src="/images/landing/clinic.webp"
                alt={c.heroImageAlt}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 520px"
              />
              <div className="lp-media-note">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>وضوح قبل القرار<br /><small>{isMen ? "اسأل" : "اسألي"} عن الجهاز والخطة والمتابعة</small></span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-trust" aria-label="لماذا نحن">
          <div className="lp-wrap lp-trust-grid">
            <div><strong>{score} ★</strong><span>على Google · {count} تقييم</span></div>
            <div><ShieldCheck size={20} aria-hidden="true" /><span>تقييم قبل الجلسة</span></div>
            <div><ThermometerSnowflake size={20} aria-hidden="true" /><span>تبريد وإعدادات محسوبة</span></div>
            <div><Stethoscope size={20} aria-hidden="true" /><span>إشراف طبي متخصص</span></div>
          </div>
        </section>

        {c.darkSkinFirst && darkSkinSection}

        <section className="lp-section lp-problems">
          <div className="lp-wrap">
            <div className="lp-heading">
              <span className="lp-kicker">الأسئلة اللي بتفرق</span>
              <h2>{c.problemsTitle}</h2>
              <p>{c.problemsSub}</p>
            </div>
            <div className="lp-problem-grid">
              {c.problems.map(({ q, a }, i) => (
                <article key={q} className="lp-problem">
                  <span className="lp-problem-no">0{i + 1}</span>
                  <h3>«{q}»</h3>
                  <div><Check size={16} aria-hidden="true" /><p>{a}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-device">
          <div className="lp-wrap lp-split">
            <div className="lp-split-copy">
              <span className="lp-kicker">{isMen ? "اسأل" : "اسألي"} قبل ما {isMen ? "تحجز" : "تحجزي"}</span>
              <h2>الجهاز مهم.<br /><em>والخطة أهم.</em></h2>
              <p>مش كل جهاز ولا كل إعداد مناسب لكل بشرة. علشان كده بنشرح لك المناسب لحالتك، ونعمل تقييم قبل الجلسة بدل إجابة عامة.</p>
              <ul>
                <li><Check size={16} aria-hidden="true" /> اسم الجهاز والموديل بوضوح</li>
                <li><Check size={16} aria-hidden="true" /> إعدادات حسب بشرتك وشعرك</li>
                <li><Check size={16} aria-hidden="true" /> توقعات واقعية ومتابعة</li>
              </ul>
              <WhatsAppCta placement="device" message={c.msg.device}>{c.deviceCtaLabel}</WhatsAppCta>
            </div>
            <div className="lp-device-art" aria-hidden="true">
              <div className="lp-wave"><Waves size={46} /></div>
              <span>Technology<br /><b>×</b> Care</span>
            </div>
          </div>
        </section>

        {!c.darkSkinFirst && darkSkinSection}

        <section className="lp-section lp-process">
          <div className="lp-wrap">
            <div className="lp-heading center">
              <span className="lp-kicker">إزاي بنشتغل؟</span>
              <h2>من أول سؤال<br /><em>لحد المتابعة.</em></h2>
              <p>قرارك يفضل قرارك — وإحنا دورنا نشرح لك.</p>
            </div>
            <div className="lp-process-grid">
              {PROCESS.map(({ title, desc, Icon }, i) => (
                <div className="lp-step" key={title}>
                  <span>0{i + 1}</span>
                  <div><Icon size={21} aria-hidden="true" /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
            <p className="lp-soft-line">{c.processLine}</p>
          </div>
        </section>

        <section className="lp-section lp-character">
          <div className="lp-wrap lp-split">
            <div className="lp-character-media">
              <Image src="/images/landing/doctor-portrait.webp" alt={`الفريق الطبي في ${CLIENT.name}`} fill sizes="(max-width: 900px) 100vw, 520px" />
            </div>
            <div className="lp-split-copy">
              <span className="lp-kicker">المحادثة الصح</span>
              <h2>{c.conversation.title[0]}<br /><em>{c.conversation.title[1]}</em></h2>
              <p>{c.conversation.body}</p>
              <div className="lp-quote">{c.conversation.quote}</div>
              <WhatsAppCta placement="conversation" message={c.msg.final}>{c.conversation.cta}</WhatsAppCta>
            </div>
          </div>
        </section>

        <section className="lp-section lp-reviews">
          <div className="lp-wrap">
            <div className="lp-heading center">
              <span className="lp-kicker">مراجعات حقيقية على Google</span>
              <h2>اللي قالوه<br /><em>عننا.</em></h2>
              <div className="lp-big-rating">
                <strong>{score}</strong>
                <span><Stars size={17} />{count} تقييم على Google</span>
              </div>
            </div>
            <div className="lp-reviews-grid">
              {LANDING_REVIEWS.map(({ name, quote }) => (
                <article key={name}>
                  <span className="lp-quote-mark" aria-hidden="true">“</span>
                  <p>«{quote}»</p>
                  <footer><strong>{name}</strong><span>تقييم على Google</span></footer>
                </article>
              ))}
            </div>
            <a className="lp-outline-link" href={CLIENT.googleMapsUrl} target="_blank" rel="noreferrer" data-lp-event="map_click" data-lp-placement="reviews">
              شوف كل المراجعات <ExternalLink size={15} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="lp-section lp-faq">
          <div className="lp-wrap lp-faq-grid">
            <div className="lp-heading">
              <span className="lp-kicker">أسئلة شائعة</span>
              <h2>{isMen ? "اسأل" : "اسألي"}<br /><em>براحتك.</em></h2>
              <p>السؤال التقني مش تعقيد — ده أول خطوة في قرار واعي.</p>
            </div>
            <div className="lp-faq-list">
              {c.faq.map(({ q, a }, i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}<ChevronDown size={19} aria-hidden="true" /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap">
            <Sparkles size={24} aria-hidden="true" />
            <span className="lp-kicker">الخطوة الأولى بسيطة</span>
            <h2>{c.finalTitle[0]}<br /><em>{c.finalTitle[1]}</em></h2>
            <p>{c.finalBody}</p>
            <div className="lp-final-actions">
              <WhatsAppCta placement="final" message={c.msg.final}>{c.finalCta}</WhatsAppCta>
              <CallCta placement="final">{c.finalCallLabel}</CallCta>
            </div>
            <div className="lp-contact-line">
              <a href={CLIENT.googleMapsUrl} target="_blank" rel="noreferrer" data-lp-event="map_click" data-lp-placement="final">
                <MapPin size={15} aria-hidden="true" /> {CLIENT.addressAr}
              </a>
              <a className="lp-phone" href={`tel:${CLIENT.phoneTel}`} data-lp-event="call_click" data-lp-placement="contact_line">
                <Phone size={15} aria-hidden="true" /> <bdi dir="ltr">{CLIENT.phoneDisplay}</bdi>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div>
            <LandingLogo className="lp-logo-light" />
            <p>المعلومات للتوعية ولا تغني عن الاستشارة الطبية. النتائج تختلف من شخص لآخر.</p>
          </div>
          <div className="lp-footer-links">
            <Link href="/">الموقع الرئيسي</Link>
            <a href={CLIENT.googleMapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
            <a href={CLIENT.instagramUrl} target="_blank" rel="noreferrer"><InstagramGlyph /> Instagram</a>
            <Link href="/privacy">سياسة الخصوصية</Link>
          </div>
        </div>
        <div className="lp-wrap lp-footer-bottom">
          <span>© {new Date().getFullYear()} {CLIENT.name}</span>
          <span>Medical care, made personal.</span>
        </div>
      </footer>

      <a className="lp-sticky" href={waHref(c.msg.final)} target="_blank" rel="noreferrer" data-lp-event="whatsapp_click" data-lp-placement="sticky">
        <MessageCircle size={20} aria-hidden="true" />
        <span>{c.stickyLabel}</span>
        <ArrowUpLeft size={17} aria-hidden="true" />
      </a>
    </div>
  );
}
