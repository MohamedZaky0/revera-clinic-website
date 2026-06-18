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
