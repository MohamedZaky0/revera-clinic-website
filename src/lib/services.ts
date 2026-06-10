export type Category = "dermatology" | "gynecology" | "physiotherapy" | "osteopathy";

export interface ServiceItem {
  id: number;
  en: string;
  ar: string;
  img: string;
  cat: Category;
  unit: string;
}

export const SERVICES: ServiceItem[] = [
  { id: 1, en: "Skin Dermatology Clinics", ar: "عيادات الجلدية", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b14740791dd.jfif", cat: "dermatology", unit: "session" },
  { id: 2, en: "Skin Care Treatments", ar: "تجميل البشرة", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b13668aa956.jpg", cat: "dermatology", unit: "session" },
  { id: 3, en: "Skin Care Sessions", ar: "جلسات العناية بالبشرة", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b140dc917ce.jpg", cat: "dermatology", unit: "session" },
  { id: 4, en: "Hair & Scalp Treatment", ar: "علاج الشعر والتساقط", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b145bf8a5d8.jpg", cat: "dermatology", unit: "session" },
  { id: 5, en: "Laser Hair Removal", ar: "إزالة الشعر بالليزر (رجالي ونسائي)", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b15909e6605.jpg", cat: "dermatology", unit: "session" },
  { id: 6, en: "Therapeutic Laser", ar: "الليزر العلاجي", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1672cb2d0a.jpeg", cat: "dermatology", unit: "session" },
  { id: 7, en: "Aesthetic Injections (Botox/Filler/Plasma)", ar: "حقن تجميلية (بوتوكس / فيلر / بلازما)", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b147c7d1149.jpg", cat: "dermatology", unit: "session" },
  { id: 11, en: "Gynecology Clinics", ar: "النساء والتوليد", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b167b6acadc.jpg", cat: "gynecology", unit: "session" },
  { id: 12, en: "Pregnancy Follow-Up", ar: "متابعة الحمل", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1699d40d92.jpg", cat: "gynecology", unit: "session" },
  { id: 13, en: "Infertility & Fertility Treatment", ar: "علاج العقم وتأخر الإنجاب", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b164f794a42.jpg", cat: "gynecology", unit: "session" },
  { id: 14, en: "Women’s Aesthetic Treatments", ar: "التجميل النسائي", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b158ea64e65.jpg", cat: "gynecology", unit: "session" },
  { id: 15, en: "Laser Vaginal Rejuvenation", ar: "ليزر تجديد المهبل", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b140dc917ce.jpg", cat: "gynecology", unit: "session" },
  { id: 16, en: "Vaginal Tightening", ar: "شد المهبل (Tightening)", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b145bf8a5d8.jpg", cat: "gynecology", unit: "session" },
  { id: 17, en: "Marital & Family Counseling", ar: "الاستشارات الزوجية والأسرية", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1672cb2d0a.jpeg", cat: "gynecology", unit: "session" },
  { id: 21, en: "Physical Therapy", ar: "العلاج الطبيعي", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b158ea64e65.jpg", cat: "physiotherapy", unit: "session" },
  { id: 22, en: "Rehabilitation", ar: "إعادة التأهيل", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b167b6acadc.jpg", cat: "physiotherapy", unit: "session" },
  { id: 23, en: "Posture & Motion Improvement", ar: "تحسين القوام والحركة", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b1699d40d92.jpg", cat: "physiotherapy", unit: "session" },
  { id: 31, en: "Osteopathy", ar: "تقويم العظام", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b14740791dd.jfif", cat: "osteopathy", unit: "session" },
  { id: 32, en: "Therapeutic Nutrition", ar: "التغذية العلاجية", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b148b6a5d8.jpg", cat: "osteopathy", unit: "session" },
  { id: 33, en: "Weight Loss Programs", ar: "برامج إنقاص الوزن", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b140dc917ce.jpg", cat: "osteopathy", unit: "session" },
  { id: 34, en: "Body Contouring & Shaping", ar: "تنسيق القوام", img: "https://octopii-prod-space.ams3.cdn.digitaloceanspaces.com/uploads/services/69b145bf8a5d8.jpg", cat: "osteopathy", unit: "session" },
];

export const CATEGORY_LABELS: Record<Category, { en: string; ar: string }> = {
  dermatology: { en: "Dermatology & Aesthetic", ar: "الجلدية والتجميل" },
  gynecology: { en: "Gynecology", ar: "النساء والتوليد" },
  physiotherapy: { en: "Physical Therapy", ar: "العلاج الطبيعي" },
  osteopathy: { en: "Osteopathy & Nutrition", ar: "تقويم العظام والتغذية" },
};
