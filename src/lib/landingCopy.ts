// Arabic-only campaign copy for the Google Ads laser landing pages (/laser-tagamoa,
// /laser-tagamoa/dark-skin, /laser-men-tagamoa). It lives here rather than in translations.ts
// because those pages are single-language ad copy, not part of the bilingual site dictionary
// (the Translation type requires en/ar parity). Client-specific values come from CLIENT.
import { CLIENT } from "@/config/client";

export type LandingVariant = "women" | "women-dark" | "men";

export type QA = { q: string; a: string };

export interface LandingCopy {
  variant: LandingVariant;
  path: string;
  audience: "women" | "men";
  docTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  sub: string;
  heroCta: string;
  heroCallLabel: string;
  heroImage: { src: string; alt: string };
  headerCallLabel: string;
  stickyLabel: string;
  problemsTitle: string;
  problemsSub: string;
  problems: QA[];
  deviceCtaLabel: string;
  darkSkin: { ctaLabel: string } | null;
  darkSkinFirst: boolean;
  processLine: string;
  conversation: { title: [string, string]; body: string; quote: string; cta: string; image: { src: string; alt: string } };
  faq: QA[];
  finalTitle: [string, string];
  finalBody: string;
  finalCta: string;
  finalCallLabel: string;
  msg: { header: string; hero: string; device: string; dark: string; final: string };
}

const N = CLIENT.nameShort;
const DEVICE = CLIENT.laserDevice;
const hi = `مرحبًا ${N}،`;

const sessions: QA = {
  q: "كام جلسة محتاج؟",
  a: "غالبًا من 8 لـ10 جلسات حسب المنطقة ونوع الشعر والهرمونات. بنقولك المتوقع في التقييم.",
};
const guarantee: QA = {
  q: "هل النتيجة مضمونة؟",
  a: "مفيش حد يقدر يضمن نتيجة واحدة للجميع. بنشرح المتوقع بواقعية ونتابع التقدم معاك.",
};
const pain: QA = {
  q: "هل بيوجع؟",
  a: "الإحساس بيختلف من شخص لآخر، وبنظبط الإعدادات حسب الحالة والراحة.",
};
const where: QA = {
  q: "فين العيادة ومواعيدكم إيه؟",
  a: `فرع التجمع الخامس — ${CLIENT.addressAr}. اتصل أو ابعت لنا على WhatsApp للتفاصيل والمواعيد.`,
};

const women: LandingCopy = {
  variant: "women",
  path: "/laser-tagamoa",
  audience: "women",
  docTitle: `ليزر إزالة الشعر في التجمع الخامس | ${CLIENT.name}`,
  metaDescription:
    `ليزر إزالة الشعر في التجمع الخامس بجهاز ${DEVICE} المناسب لجميع أنواع البشرة. تقييم لبشرتك ونوع شعرك، وخطة واضحة من أول زيارة — من غير ضغط للحجز.`,
  eyebrow: "عيادة ليزر في التجمع الخامس",
  h1: `ليزر إزالة الشعر في التجمع الخامس — بجهاز ${DEVICE} المناسب لكل أنواع البشرة`,
  sub: "بنقيّم بشرتك ونوع الشعر الأول، وبعدها إعدادات مظبوطة لحالتك، مع دكتورة متخصصة وخطة واضحة من أول زيارة.",
  heroCta: "اعرفي لو الليزر مناسب لبشرتك",
  heroCallLabel: "أو اتصلي بينا",
  heroImage: { src: "/images/landing/hero-women.webp", alt: "سيدة في مساحة عيادة هادئة" },
  headerCallLabel: "اتصلي بينا",
  stickyLabel: "اسألي على WhatsApp",
  problemsTitle: "ليه ناس كتير بتقول الليزر ما نفعش معاها؟",
  problemsSub: "دي أكتر شكاوى بنسمعها من عميلات جربوا قبل كده — وده اللي بنوضحه بشكل مختلف:",
  problems: [
    { q: "حروق وألم", a: "اختبار بقعة وإعدادات محسوبة حسب بشرتك قبل أي جلسة كاملة." },
    { q: "جهاز مجهول", a: `بنقولك اسم الجهاز صراحةً: ${DEVICE}، ومناسب لجميع أنواع البشرة.` },
    { q: "كورس كامل ومافيش نتيجة", a: "خطة مكتوبة بعدد الجلسات المتوقع ومتابعة للتقدم." },
    { q: "بشرتك ماينفعش معاها", a: "التقييم هو اللي يحدد الموجة والإعدادات المناسبة، مش تخمين سريع." },
  ],
  deviceCtaLabel: "اسألي عن جهازك",
  darkSkin: { ctaLabel: "اسألي هل بشرتي مناسبة" },
  darkSkinFirst: false,
  processLine: "مفيش ضغط للحجز. القرار بعد ما تفهمي.",
  conversation: {
    title: ["السؤال اللي في بالك", "له مكان هنا."],
    body: "لو اتخدعتي قبل كده أو خايفة تكرري تجربة مش مريحة، مش محتاجة تصدقي وعد. محتاجة حد يسمعك ويشرح لك.",
    quote: "«أنا مش بدوّر على الأرخص، أنا بدوّر على اللي هيشتغل.»",
    cta: "ابدئي محادثتك على WhatsApp",
    image: { src: "/images/landing/consultation.webp", alt: "استشارة بين طبيبة ومراجعة داخل العيادة" },
  },
  faq: [
    {
      q: "هل الليزر مناسب للبشرة السمراء؟",
      a: `أيوه. جهاز ${DEVICE} مناسب لجميع أنواع البشرة، وبنحدد الإعدادات المناسبة لبشرتك في التقييم قبل الجلسة الأولى.`,
    },
    pain,
    { ...sessions, q: "كام جلسة محتاجة؟" },
    { ...guarantee, q: "هل النتيجة مضمونة من أول جلسة؟" },
    {
      q: "هل أقدر أعرف نوع الجهاز والإعدادات؟",
      a: `طبعًا. بنستخدم جهاز ${DEVICE}، ومناسب لجميع أنواع البشرة. والإعدادات بتتحدد لحالتك في التقييم قبل الجلسة.`,
    },
    {
      q: "هل ينفع لو شعري فاتح أو أبيض؟",
      a: "الليزر بيشتغل على صبغة الشعر، فالشعر الأبيض أو الأشقر الفاتح جدًا غالبًا مش بيستجيب. بنقولك ده بصراحة في التقييم قبل ما تدفعي أي حاجة.",
    },
    {
      q: "هل الاستشارة مجانية؟",
      a: "اسألي الفريق عن العرض الحالي وشروطه قبل تحديد الموعد.",
    },
    { ...where, a: `فرع التجمع الخامس — ${CLIENT.addressAr}. اتصلي أو ابعتي لنا على WhatsApp للتفاصيل والمواعيد.` },
  ],
  finalTitle: ["مش لازم تقرري دلوقتي.", "بس اسألي."],
  finalBody: "ابعتي رسالتك وهنرد عليكي بوضوح، من غير ضغط.",
  finalCta: "ابدئي محادثتك على WhatsApp",
  finalCallLabel: "اتصلي بينا",
  msg: {
    header: `${hi} عايزة أعرف لو الليزر مناسب لبشرتي. [LP-W-HERO]`,
    hero: `${hi} عايزة أعرف لو الليزر مناسب لبشرتي. [LP-W-HERO]`,
    device: `${hi} عايزة أسأل عن جهاز الليزر المناسب لبشرتي. [LP-W-DEVICE]`,
    dark: `${hi} بشرتي سمراء وعايزة أعرف لو الليزر مناسب. [LP-W-DARK]`,
    final: `${hi} عايزة أبدأ وأعرف تفاصيل تقييم الليزر. [LP-W-FINAL]`,
  },
};

const womenDark: LandingCopy = {
  ...women,
  variant: "women-dark",
  path: "/laser-tagamoa/dark-skin",
  docTitle: `ليزر للبشرة السمراء في التجمع الخامس | ${CLIENT.name}`,
  metaDescription:
    `ليزر إزالة الشعر للبشرة السمراء والقمحية في التجمع الخامس بجهاز ${DEVICE} المناسب لجميع أنواع البشرة. اختبار بقعة وإعدادات محسوبة قبل أي جلسة كاملة.`,
  h1: `ليزر للبشرة السمراء في التجمع الخامس — بجهاز ${DEVICE} المناسب لكل الدرجات`,
  heroCta: "اعرفي لو بشرتك مناسبة للليزر",
  darkSkinFirst: true,
  msg: { ...women.msg, hero: women.msg.dark, header: women.msg.dark },
};

const men: LandingCopy = {
  variant: "men",
  path: "/laser-men-tagamoa",
  audience: "men",
  docTitle: `ليزر رجالي في التجمع الخامس | ${CLIENT.name}`,
  metaDescription:
    `ليزر إزالة الشعر للرجال في التجمع الخامس بجهاز ${DEVICE}. تقييم واضح، إعدادات محسوبة، وخطة مفهومة من أول زيارة — من غير مبالغة ولا وعود سهلة.`,
  eyebrow: "ليزر رجالي في التجمع الخامس",
  h1: `ليزر إزالة الشعر للرجال في التجمع الخامس — بجهاز ${DEVICE} بدل الحلاقة كل يوم`,
  sub: "تقييم واضح، إعدادات محسوبة، وخطة مفهومة من أول زيارة — من غير مبالغة ولا وعود سهلة.",
  heroCta: "اعرف لو الليزر مناسب ليك",
  heroCallLabel: "أو اتصل بينا",
  heroImage: { src: "/images/landing/hero-men.webp", alt: "رجل مبتسم في مساحة عيادة هادئة" },
  headerCallLabel: "اتصل بينا",
  stickyLabel: "اسأل على WhatsApp",
  problemsTitle: "أسئلة الرجالة الحقيقية",
  problemsSub: "من غير إحراج ومن غير كلام محفوظ — دي الإجابات اللي تهمك قبل ما تبدأ.",
  problems: [
    { q: "هيوجع؟", a: "التبريد قبل كل نبضة بيخفف الإحساس، والإعدادات بتتظبط حسب منطقتك." },
    { q: "الشعر عندي تخين", a: "الشعر الغامق والتخين بيستجيب كويس للليزر عادةً، وبنحدد المتوقع في التقييم." },
    { q: "الحلاقة بتعمل التهابات", a: "الخطة المستمرة تساعد على تقليل الشعر ومشاكل الحلاقة مع الوقت." },
    { q: "هل ده للبنات بس؟", a: "لأ. الليزر للرجالة كمان، مع تقييم وخطة مناسبة." },
  ],
  deviceCtaLabel: "اسأل عن جهازك",
  darkSkin: null,
  darkSkinFirst: false,
  processLine: "مفيش ضغط للحجز. القرار بعد ما تفهم.",
  conversation: {
    title: ["السؤال اللي في بالك", "له مكان هنا."],
    body: "لو جربت قبل كده ومفيش نتيجة، أو مش متأكد الليزر يناسبك أصلًا، مش محتاج تصدق وعد. محتاج حد يسمعك ويشرح لك.",
    quote: "«أنا مش عايز وعود، أنا عايز أفهم هيحصل إيه.»",
    cta: "ابدأ محادثتك على WhatsApp",
    image: { src: "/images/landing/doctor-portrait.webp", alt: `الفريق الطبي في ${CLIENT.name}` },
  },
  faq: [
    pain,
    sessions,
    {
      q: "هل ينفع لو شعري تخين؟",
      a: "الشعر الغامق والتخين بيستجيب كويس للليزر عادةً. بنحدد المتوقع وعدد الجلسات في التقييم.",
    },
    {
      q: "هل ينفع للبشرة السمراء؟",
      a: `أيوه. جهاز ${DEVICE} مناسب لجميع أنواع البشرة، وبنحدد الإعدادات المناسبة لبشرتك في التقييم قبل الجلسة الأولى.`,
    },
    guarantee,
    where,
  ],
  finalTitle: ["مش لازم تقرر دلوقتي.", "بس اسأل."],
  finalBody: "ابعت رسالتك وهنرد عليك بوضوح، من غير ضغط.",
  finalCta: "ابدأ محادثتك على WhatsApp",
  finalCallLabel: "اتصل بينا",
  msg: {
    header: `${hi} عايز أعرف لو الليزر مناسب ليا. [LP-M-HERO]`,
    hero: `${hi} عايز أعرف لو الليزر مناسب ليا. [LP-M-HERO]`,
    device: `${hi} عايز أسأل عن جهاز الليزر المناسب ليا. [LP-M-DEVICE]`,
    dark: `${hi} عايز أعرف لو الليزر مناسب لبشرتي. [LP-M-HERO]`,
    final: `${hi} عايز أبدأ وأعرف تفاصيل الليزر للرجال. [LP-M-FINAL]`,
  },
};

export const LANDING_COPY: Record<LandingVariant, LandingCopy> = {
  women,
  "women-dark": womenDark,
  men,
};

// Real Google reviews. Verbatim quotes; keep in sync with the Maps listing.
export const LANDING_REVIEWS: { name: string; quote: string }[] = [
  { name: "Rody Crokly", quote: "مكان حلو اوي، جربت الليزر، ونتيجة الليزر كويسه جدا، والاستاف والدكاتره محترمين اوي ولطاف" },
  { name: "Turki Alnesf", quote: "افضل عياده ليزر إزاله شعر نضافه و امانه" },
  { name: "Ash Kamal", quote: "العياده مجهزه باحدث الأجهزة المناسبه لينا كبنات و التعقيم و نتايج الليزر توووحفة" },
];
