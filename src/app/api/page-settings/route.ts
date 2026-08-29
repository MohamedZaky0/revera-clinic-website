import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireAdministratorAccess, requireStaffAccess } from '@/lib/access';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const JSON_FILE_PATH = path.join(process.cwd(), 'data', 'page_settings.json');

const DEFAULT_SETTINGS = {
  home: {
    hero: {
      slides: [
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
          description: "Discover comprehensive dermatology, cosmetic surgery, laser treatments, and physical therapy services tailored to your unique needs. With over 15 years of professional expertise, we're here to guide you toward lasting beauty and wellness.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
          image: "/images/hero/slide-2.jpg"
        },
        {
          welcome: "Welcome to Revera Clinics",
          heading: "Your Beauty & Health Journey Starts Here!",
          description: "Specialized clinics under full medical supervision offering services in dermatology, cosmetic surgery, laser treatments, and physical therapy care for all ages.",
          bookBtn: "Book Appointment",
          rating: "4.5",
          reviewCount: "(1000+ review)",
          image: "/images/hero/slide-3.jpg"
        }
      ],
      slides_ar: [
        {
          welcome: "مرحباً بكم في عيادات ريفيرا",
          heading: "حوّل جمالك بشكل طبيعي!",
          description: "خدمات متخصصة في طب الجلدية والجراحة التجميلية مع رعاية شخصية مصممة لمساعدتك على تحقيق أهدافك في الجمال والصحة من خلال تقنيات طبية متقدمة.",
          bookBtn: "احجز موعدًا",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
          image: "/images/hero/slide-1.jpg"
        },
        {
          welcome: "مرحباً بكم في عيادات ريفيرا",
          heading: "رعاية طبية متقدمة يمكنك الوثوق بها!",
          description: "اكتشف خدمات شاملة في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان المصممة لاحتياجاتك الفريدة. مع أكثر من 15 عامًا من الخبرة المهنية، نحن هنا لإرشادك نحو الجمال الدائم والعافية.",
          bookBtn: "احجز موعدًا",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
          image: "/images/hero/slide-2.jpg"
        },
        {
          welcome: "مرحباً بكم في عيادات ريفيرا",
          heading: "رحلتك نحو الجمال والصحة تبدأ هنا!",
          description: "عيادات متخصصة تحت إشراف طبي كامل تقدم خدمات في طب الجلدية والجراحة التجميلية وعلاجات الليزر وطب الأسنان لجميع الأعمار.",
          bookBtn: "احجز موعدًا",
          rating: "4.5",
          reviewCount: "(1000+ تقييم)",
          image: "/images/hero/slide-3.jpg"
        }
      ]
    },
    booking: {
      minAdvance: 2,
      maxAdvance: 30,
      cancelWindow: 2,
      maxPerSlot: 1,
      instantApproval: false,
      showDoctorNotes: false,
      depositPercentage: 20
    }
  }
};

// RISK-067: this route is intentionally unauthenticated — the public booking site (BookingModal,
// LanguageContext) reads it without a session. `deposit.*` is legitimately public (patients need
// the InstaPay/wallet destination to pay their deposit). `notifications.staffEmail` and
// `departments` are internal-only and have no public reader — strip them before responding.
function stripInternalFields(value: any) {
  if (!value || typeof value !== 'object') return value;
  const { notifications, departments, ...rest } = value;
  if (notifications && typeof notifications === 'object') {
    const { staffEmail, ...restNotifications } = notifications;
    return { ...rest, notifications: restNotifications };
  }
  return rest;
}

export async function GET(req?: Request) {
  // Authenticated staff (the admin panel) get the full blob — Department Management reads
  // `departments` from this same response. Anyone else (the public booking site) gets the
  // internal-only fields stripped.
  const staffAccess = req ? await requireStaffAccess(req) : { error: 'No request', status: 401 as const };
  const isStaff = 'access' in staffAccess;
  const filter = isStaff ? (v: any) => v : stripInternalFields;

  try {
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'home')
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json(filter(data.value));
    } else if (!data) {
      // Seed default row in Supabase
      const { error: insertError } = await supabaseServer
        .from('page_settings')
        .insert({ key: 'home', value: DEFAULT_SETTINGS.home });

      if (!insertError) {
        return NextResponse.json(filter(DEFAULT_SETTINGS.home));
      } else {
        console.warn("Failed to seed default settings to Supabase, falling back to JSON:", insertError);
      }
    } else {
      console.warn("Supabase load error, falling back to JSON:", error);
    }
  } catch (dbErr) {
    console.error("Database settings load error, falling back to JSON:", dbErr);
  }

  // Fallback to local JSON file
  try {
    if (!fs.existsSync(JSON_FILE_PATH)) {
      fs.mkdirSync(path.dirname(JSON_FILE_PATH), { recursive: true });
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS.home, null, 2));
      return NextResponse.json(filter(DEFAULT_SETTINGS.home));
    }
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    return NextResponse.json(filter(JSON.parse(fileContent)));
  } catch (err) {
    console.error("JSON fallback load error:", err);
    return NextResponse.json(filter(DEFAULT_SETTINGS.home));
  }
}

function deepMergeSettings(existing: any, incoming: any): any {
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    return incoming;
  }
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return incoming;
  }

  const result: Record<string, any> = { ...existing };
  for (const key of Object.keys(incoming)) {
    const incVal = incoming[key];
    const exVal = existing[key];

    if (
      incVal &&
      typeof incVal === 'object' &&
      !Array.isArray(incVal) &&
      exVal &&
      typeof exVal === 'object' &&
      !Array.isArray(exVal)
    ) {
      result[key] = deepMergeSettings(exVal, incVal);
    } else {
      result[key] = incVal;
    }
  }
  return result;
}

export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  try {
    // Fetch existing settings to deep-merge them
    const { data: existing } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'home')
      .maybeSingle();

    const mergedValue = deepMergeSettings(existing?.value || {}, body);

    // Save to Supabase
    const { error } = await supabaseServer
      .from('page_settings')
      .upsert({ key: 'home', value: mergedValue, updated_at: new Date().toISOString() });

    if (!error) {
      return NextResponse.json({ success: true });
    } else {
      console.warn("Supabase save error, falling back to JSON file save:", error);
    }
  } catch (dbErr) {
    console.error("Database settings save error, falling back to JSON:", dbErr);
  }

  // Fallback save to JSON
  try {
    let existingLocal = {};
    if (fs.existsSync(JSON_FILE_PATH)) {
      try {
        existingLocal = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
      } catch (e) {}
    }
    const mergedLocal = deepMergeSettings(existingLocal, body);
    fs.mkdirSync(path.dirname(JSON_FILE_PATH), { recursive: true });
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(mergedLocal, null, 2));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("JSON fallback save error:", err);
    return NextResponse.json({ error: 'Server error saving settings' }, { status: 500 });
  }
}
