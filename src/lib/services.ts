export function getDurationInMinutes(duration: string | null | undefined): number {
  if (!duration) return 30; // default to 30 mins
  const cleaned = duration.toLowerCase().trim();
  
  // Format: "1:30 Hours" or "0:30 Hours" or "1:00 Hours"
  const matchHours = cleaned.match(/(\d+):(\d+)\s*hour/);
  if (matchHours) {
    const hrs = parseInt(matchHours[1], 10);
    const mins = parseInt(matchHours[2], 10);
    return hrs * 60 + mins;
  }
  
  // Format: "30 mins" or "15 mins"
  const matchMins = cleaned.match(/(\d+)\s*min/);
  if (matchMins) {
    return parseInt(matchMins[1], 10);
  }

  // Format: "1 hour"
  const matchOneHour = cleaned.match(/(\d+)\s*hour/);
  if (matchOneHour) {
    return parseInt(matchOneHour[1], 10) * 60;
  }
  
  // Format: "1:30"
  const matchHHMM = cleaned.match(/^(\d+):(\d+)$/);
  if (matchHHMM) {
    const hrs = parseInt(matchHHMM[1], 10);
    const mins = parseInt(matchHHMM[2], 10);
    return hrs * 60 + mins;
  }

  return 30; // default fallback
}

export const ALL_15MIN_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 9; h <= 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

export function normaliseTo24hSlot(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  
  const totalMins = hh * 60 + mm;
  const rounded = Math.round(totalMins / 15) * 15;
  const rh = Math.floor(rounded / 60);
  const rm = rounded % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

export type Category = string;

export interface ServiceItem {
  id: number;
  en: string;
  ar: string;
  img: string;
  cat: Category;
  unit: string;
  price?: number;
  createdAt?: string;
  sortOrder?: number;
  duration?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  isShared?: boolean;
  enableReminder?: boolean;
  branchPricing?: Array<{
    name: string;
    price: number;
    visible: boolean;
    status: boolean;
    isDefault?: boolean;
    promotion?: {
      enabled: boolean;
      type: "percentage" | "fixed";
      value: number;
      startDate?: string;
      endDate?: string;
    };
  }>;
}

export const SERVICES: ServiceItem[] = [
  { id: 1, en: "Skin Dermatology Clinics", ar: "عيادات الجلدية", img: "/images/services/dermatology-service/dermatology.jpeg", cat: "dermatology", unit: "session" },
  { id: 2, en: "Skin Care Treatments", ar: "تجميل البشرة", img: "/images/services/dermatology-service/skincare-treatment.jpg", cat: "dermatology", unit: "session" },
  { id: 3, en: "Skin Care Sessions", ar: "جلسات العناية بالبشرة", img: "/images/services/dermatology-service/skincare-session.webp", cat: "dermatology", unit: "session" },
  { id: 4, en: "Hair & Scalp Treatment", ar: "علاج الشعر والتساقط", img: "/images/services/dermatology-service/hair-scalp-treatment.jpg", cat: "dermatology", unit: "session" },
  { id: 5, en: "Laser Hair Removal", ar: "إزالة الشعر بالليزر (رجالي ونسائي)", img: "/images/services/dermatology-service/laser-hair-removal.jpg", cat: "dermatology", unit: "session" },
  { id: 6, en: "Therapeutic Laser", ar: "الليزر العلاجي", img: "/images/services/dermatology-service/therapeutic-laser.jpg", cat: "dermatology", unit: "session" },
  { id: 7, en: "Aesthetic Injections (Botox/Filler/Plasma)", ar: "حقن تجميلية (بوتوكس / فيلر / بلازما)", img: "/images/services/dermatology-service/aesthetic-injections.jpg", cat: "dermatology", unit: "session" },
  { id: 11, en: "Gynecology Clinics", ar: "النساء والتوليد", img: "/images/services/gyna-service/gyna.jpg", cat: "gynecology", unit: "session" },
  { id: 12, en: "Pregnancy Follow-Up", ar: "متابعة الحمل", img: "/images/services/gyna-service/pregnancy-followup.webp", cat: "gynecology", unit: "session" },
  { id: 13, en: "Infertility & Fertility Treatment", ar: "علاج العقم وتأخر الإنجاب", img: "/images/services/gyna-service/infertility.avif", cat: "gynecology", unit: "session" },
  { id: 14, en: "Women's Aesthetic Treatments", ar: "التجميل النسائي", img: "/images/services/gyna-service/women-aethetic-treatment.webp", cat: "gynecology", unit: "session" },
  { id: 15, en: "Laser Vaginal Rejuvenation", ar: "ليزر تجديد المهبل", img: "/images/services/gyna-service/laser-vaginal-rejuvenation.jpg", cat: "gynecology", unit: "session" },
  { id: 16, en: "Vaginal Tightening", ar: "شد المهبل (Tightening)", img: "/images/services/gyna-service/vaginal-tightening.jpg", cat: "gynecology", unit: "session" },
  { id: 17, en: "Marital & Family Counseling", ar: "الاستشارات الزوجية والأسرية", img: "/images/services/gyna-service/consultation.jpg", cat: "gynecology", unit: "session" },
  { id: 21, en: "Physical Therapy", ar: "العلاج الطبيعي", img: "/images/services/physicaltherapy_service/physical-therapy.jpg", cat: "physiotherapy", unit: "session" },
  { id: 22, en: "Rehabilitation", ar: "إعادة التأهيل", img: "/images/services/physicaltherapy_service/rehab.jpg", cat: "physiotherapy", unit: "session" },
  { id: 23, en: "Posture & Motion Improvement", ar: "تحسين القوام والحركة", img: "/images/services/physicaltherapy_service/posture.webp", cat: "physiotherapy", unit: "session" },
  { id: 31, en: "Osteopathy", ar: "تقويم العظام", img: "/images/services/nutrition_service/osteopathy.jpg", cat: "osteopathy", unit: "session" },
  { id: 32, en: "Therapeutic Nutrition", ar: "التغذية العلاجية", img: "/images/services/nutrition_service/therapeutic-diet.png", cat: "osteopathy", unit: "session" },
  { id: 33, en: "Weight Loss Programs", ar: "برامج إنقاص الوزن", img: "/images/services/nutrition_service/weight-loss.jpg", cat: "osteopathy", unit: "session" },
  { id: 34, en: "Body Contouring & Shaping", ar: "تنسيق القوام", img: "/images/services/nutrition_service/body-contouring.jpg", cat: "osteopathy", unit: "session" },
];

export const CATEGORY_LABELS: Record<Category, { en: string; ar: string }> = {
  dermatology: { en: "Dermatology & Aesthetic", ar: "الجلدية والتجميل" },
  gynecology: { en: "Gynecology", ar: "النساء والتوليد" },
  physiotherapy: { en: "Physical Therapy", ar: "العلاج الطبيعي" },
  osteopathy: { en: "Osteopathy & Nutrition", ar: "تقويم العظام والتغذية" },
};

export function getEffectiveServicePrice(
  service: { price?: number; branchPricing?: any[] | null } | null | undefined,
  branchNameOrId?: string | number | null,
  branchesList?: Array<{ id: number | string; name?: string; name_en?: string; name_ar?: string }> | null
): number {
  if (!service) return 0;

  let targetBranchName: string | null = null;
  if (branchNameOrId !== undefined && branchNameOrId !== null) {
    if (typeof branchNameOrId === "string" && isNaN(Number(branchNameOrId))) {
      targetBranchName = branchNameOrId;
    } else if (branchesList && branchesList.length > 0) {
      const bId = Number(branchNameOrId);
      const bObj = branchesList.find((b) => Number(b.id) === bId);
      if (bObj) {
        targetBranchName = bObj.name || bObj.name_en || bObj.name_ar || null;
      }
    }
  }

  let bpItem: any = null;
  if (targetBranchName && service.branchPricing && Array.isArray(service.branchPricing)) {
    bpItem = service.branchPricing.find(
      (bp) => bp && bp.name && bp.name.toLowerCase() === targetBranchName!.toLowerCase()
    );
  }

  // Fallback to default branch pricing
  if (!bpItem && service.branchPricing && Array.isArray(service.branchPricing)) {
    bpItem = service.branchPricing.find((bp) => bp && bp.isDefault);
  }

  const basePrice = bpItem ? Number(bpItem.price) : Number(service.price ?? 0);

  // Apply promotion if enabled
  if (bpItem && bpItem.promotion && bpItem.promotion.enabled) {
    const promo = bpItem.promotion;

    // Compare date strings using Egypt local time
    const now = new Date();
    const egyptTimeStr = now.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
    const todayStr = egyptTimeStr.slice(0, 10); // YYYY-MM-DD

    let isDateActive = true;
    if (promo.startDate && todayStr < promo.startDate) {
      isDateActive = false;
    }
    if (promo.endDate && todayStr > promo.endDate) {
      isDateActive = false;
    }

    if (isDateActive) {
      let finalPrice = basePrice;
      const val = Number(promo.value) || 0;
      if (promo.type === "percentage") {
        finalPrice = basePrice * (1 - val / 100);
      } else if (promo.type === "fixed") {
        finalPrice = basePrice - val;
      }
      return Math.max(0, Math.round(finalPrice));
    }
  }

  return basePrice;
}
