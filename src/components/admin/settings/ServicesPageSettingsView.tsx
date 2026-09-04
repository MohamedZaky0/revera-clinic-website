"use client";

import Image from "next/image";
import { Upload } from "lucide-react";
import { compressImage } from "@/lib/image";

interface ServicesPageSettingsViewProps {
  // How It Works
  howItWorksHeading: string;
  setHowItWorksHeading: (v: string) => void;
  howItWorksDescription: string;
  setHowItWorksDescription: (v: string) => void;
  howItWorksHeadingAr: string;
  setHowItWorksHeadingAr: (v: string) => void;
  howItWorksDescriptionAr: string;
  setHowItWorksDescriptionAr: (v: string) => void;

  // Why Choose Us
  wcuYearsLabel: string;
  setWcuYearsLabel: (v: string) => void;
  wcuHeading: string;
  setWcuHeading: (v: string) => void;
  wcuDescription: string;
  setWcuDescription: (v: string) => void;
  wcuQuote: string;
  setWcuQuote: (v: string) => void;
  wcuYearsLabelAr: string;
  setWcuYearsLabelAr: (v: string) => void;
  wcuHeadingAr: string;
  setWcuHeadingAr: (v: string) => void;
  wcuDescriptionAr: string;
  setWcuDescriptionAr: (v: string) => void;
  wcuQuoteAr: string;
  setWcuQuoteAr: (v: string) => void;
  wcuImage1: string;
  setWcuImage1: (v: string) => void;
  wcuImage2: string;
  setWcuImage2: (v: string) => void;

  // Shared
  translatingField: string | null;
  handleAutoTranslate: (
    text: string,
    from: "en" | "ar",
    to: "en" | "ar",
    setter: (val: any) => void,
    fieldKey: string,
  ) => Promise<void>;
  savingPageSettings: boolean;
  savePageSettings: (overrideData?: any) => Promise<void>;
}

export default function ServicesPageSettingsView({
  howItWorksHeading,
  setHowItWorksHeading,
  howItWorksDescription,
  setHowItWorksDescription,
  howItWorksHeadingAr,
  setHowItWorksHeadingAr,
  howItWorksDescriptionAr,
  setHowItWorksDescriptionAr,
  wcuYearsLabel,
  setWcuYearsLabel,
  wcuHeading,
  setWcuHeading,
  wcuDescription,
  setWcuDescription,
  wcuQuote,
  setWcuQuote,
  wcuYearsLabelAr,
  setWcuYearsLabelAr,
  wcuHeadingAr,
  setWcuHeadingAr,
  wcuDescriptionAr,
  setWcuDescriptionAr,
  wcuQuoteAr,
  setWcuQuoteAr,
  wcuImage1,
  setWcuImage1,
  wcuImage2,
  setWcuImage2,
  translatingField,
  handleAutoTranslate,
  savingPageSettings,
  savePageSettings,
}: ServicesPageSettingsViewProps) {
  return (
    <div className="space-y-8">
      {/* How It Works Section */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-[#1F251A]">How It Works Section</h3>
          <p className="text-sm text-[#5A6A51] mt-1">Configure the main heading and description for the step-by-step process section.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* English Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#1F251A]">English Content</h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Heading</label>
                <button
                  type="button"
                  disabled={translatingField === "howItWorksHeading-en"}
                  onClick={() => handleAutoTranslate(howItWorksHeading, "en", "ar", setHowItWorksHeadingAr, "howItWorksHeading-en")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "howItWorksHeading-en" ? "Translating..." : "Translate to Arabic →"}
                </button>
              </div>
              <input
                type="text"
                value={howItWorksHeading}
                onChange={(e) => setHowItWorksHeading(e.target.value)}
                placeholder="Simple steps to beauty transformations"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Description</label>
                <button
                  type="button"
                  disabled={translatingField === "howItWorksDescription-en"}
                  onClick={() => handleAutoTranslate(howItWorksDescription, "en", "ar", setHowItWorksDescriptionAr, "howItWorksDescription-en")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "howItWorksDescription-en" ? "Translating..." : "Translate to Arabic →"}
                </button>
              </div>
              <textarea
                rows={5}
                value={howItWorksDescription}
                onChange={(e) => setHowItWorksDescription(e.target.value)}
                placeholder="Discover a seamless process designed to enhance your beauty and health through personalized consultations..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Arabic Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#1F251A] text-right">المحتوى باللغة العربية</h4>

            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between mb-1" dir="ltr">
                <button
                  type="button"
                  disabled={translatingField === "howItWorksHeading-ar"}
                  onClick={() => handleAutoTranslate(howItWorksHeadingAr, "ar", "en", setHowItWorksHeading, "howItWorksHeading-ar")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "howItWorksHeading-ar" ? "Translating..." : "Translate to English →"}
                </button>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان</label>
              </div>
              <input
                type="text"
                value={howItWorksHeadingAr}
                onChange={(e) => setHowItWorksHeadingAr(e.target.value)}
                placeholder="خطوات بسيطة لتحولات الجمال"
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
              />
            </div>

            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between mb-1" dir="ltr">
                <button
                  type="button"
                  disabled={translatingField === "howItWorksDescription-ar"}
                  onClick={() => handleAutoTranslate(howItWorksDescriptionAr, "ar", "en", setHowItWorksDescription, "howItWorksDescription-ar")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "howItWorksDescription-ar" ? "Translating..." : "Translate to English →"}
                </button>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">الوصف</label>
              </div>
              <textarea
                rows={5}
                value={howItWorksDescriptionAr}
                onChange={(e) => setHowItWorksDescriptionAr(e.target.value)}
                placeholder="اكتشف عملية سلسة مصممة لتعزيز جمالك وصحتك..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed text-right"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#F2EFE9]">
          <button
            disabled={savingPageSettings}
            onClick={() => savePageSettings()}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
          >
            {savingPageSettings ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-[#1F251A]">Why Choose Us Section</h3>
          <p className="text-sm text-[#5A6A51] mt-1">Configure the images and content for the clinic differentiation section.</p>
        </div>

        {/* Photos grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Photo 1: Left Treatment (Background) */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 1: Left Treatment (Background)</label>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {wcuImage1 || "/images/clinic/treatment.jpg" ? (
                <>
                  <Image
                    src={wcuImage1 || "/images/clinic/treatment.jpg"}
                    alt="Treatment Image"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                  <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const compressed = await compressImage(file, 1000, 1000, 0.75);
                      setWcuImage1(compressed);
                    } catch (err) {
                      console.error("Failed to compress WCU Image 1, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setWcuImage1(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
              <input
                type="text"
                value={wcuImage1}
                onChange={(e) => setWcuImage1(e.target.value)}
                placeholder="/images/clinic/treatment.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* Photo 2: Right Doctor (Foreground Overlay) */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 2: Right Doctor (Foreground Overlay)</label>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {wcuImage2 || "/images/clinic/room.jpg" ? (
                <>
                  <Image
                    src={wcuImage2 || "/images/clinic/room.jpg"}
                    alt="Room Image"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Upload className="mx-auto h-8 w-8 text-[#5A6A51]/60 mb-2" />
                  <span className="text-xs text-[#5A6A51]/60 font-medium">Select Image file</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const compressed = await compressImage(file, 1000, 1000, 0.75);
                      setWcuImage2(compressed);
                    } catch (err) {
                      console.error("Failed to compress WCU Image 2, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setWcuImage2(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5A6A51]/80 mb-1">Image URL/Path</label>
              <input
                type="text"
                value={wcuImage2}
                onChange={(e) => setWcuImage2(e.target.value)}
                placeholder="/images/clinic/room.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* English Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#1F251A]">English Content</h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Heading</label>
                <button
                  type="button"
                  disabled={translatingField === "wcuHeading-en"}
                  onClick={() => handleAutoTranslate(wcuHeading, "en", "ar", setWcuHeadingAr, "wcuHeading-en")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuHeading-en" ? "Translating..." : "Translate to Arabic →"}
                </button>
              </div>
              <input
                type="text"
                value={wcuHeading}
                onChange={(e) => setWcuHeading(e.target.value)}
                placeholder="Where medical expertise meets a luxury experience"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Experience Vertical Label</label>
                <button
                  type="button"
                  disabled={translatingField === "wcuYearsLabel-en"}
                  onClick={() => handleAutoTranslate(wcuYearsLabel, "en", "ar", setWcuYearsLabelAr, "wcuYearsLabel-en")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuYearsLabel-en" ? "Translating..." : "Translate to Arabic →"}
                </button>
              </div>
              <input
                type="text"
                value={wcuYearsLabel}
                onChange={(e) => setWcuYearsLabel(e.target.value)}
                placeholder="15+ years excellence"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Quote</label>
                <button
                  type="button"
                  disabled={translatingField === "wcuQuote-en"}
                  onClick={() => handleAutoTranslate(wcuQuote, "en", "ar", setWcuQuoteAr, "wcuQuote-en")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuQuote-en" ? "Translating..." : "Translate to Arabic →"}
                </button>
              </div>
              <input
                type="text"
                value={wcuQuote}
                onChange={(e) => setWcuQuote(e.target.value)}
                placeholder="We don't treat conditions — we transform confidence..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>


            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Description</label>
                <button
                  type="button"
                  disabled={translatingField === "wcuDescription-en"}
                  onClick={() => handleAutoTranslate(wcuDescription, "en", "ar", setWcuDescriptionAr, "wcuDescription-en")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuDescription-en" ? "Translating..." : "Translate to Arabic →"}
                </button>
              </div>
              <textarea
                rows={5}
                value={wcuDescription}
                onChange={(e) => setWcuDescription(e.target.value)}
                placeholder="At Revera, every detail is intentional..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Arabic Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#1F251A] text-right">المحتوى باللغة العربية</h4>

            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between mb-1" dir="ltr">
                <button
                  type="button"
                  disabled={translatingField === "wcuHeading-ar"}
                  onClick={() => handleAutoTranslate(wcuHeadingAr, "ar", "en", setWcuHeading, "wcuHeading-ar")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuHeading-ar" ? "Translating..." : "Translate to English →"}
                </button>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان</label>
              </div>
              <input
                type="text"
                value={wcuHeadingAr}
                onChange={(e) => setWcuHeadingAr(e.target.value)}
                placeholder="حيث تلتقي الخبرة الطبية بتجربة فاخرة"
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
              />
            </div>

            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between mb-1" dir="ltr">
                <button
                  type="button"
                  disabled={translatingField === "wcuYearsLabel-ar"}
                  onClick={() => handleAutoTranslate(wcuYearsLabelAr, "ar", "en", setWcuYearsLabel, "wcuYearsLabel-ar")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuYearsLabel-ar" ? "Translating..." : "Translate to English →"}
                </button>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">عبارة التميز (رأسية)</label>
              </div>
              <input
                type="text"
                value={wcuYearsLabelAr}
                onChange={(e) => setWcuYearsLabelAr(e.target.value)}
                placeholder="١٥+ عاماً من التميز"
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
              />
            </div>

            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between mb-1" dir="ltr">
                <button
                  type="button"
                  disabled={translatingField === "wcuQuote-ar"}
                  onClick={() => handleAutoTranslate(wcuQuoteAr, "ar", "en", setWcuQuote, "wcuQuote-ar")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuQuote-ar" ? "Translating..." : "Translate to English →"}
                </button>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">اقتباس الثقة</label>
              </div>
              <input
                type="text"
                value={wcuQuoteAr}
                onChange={(e) => setWcuQuoteAr(e.target.value)}
                placeholder="نحن لا نعالج فقط — بل نُحوّل الثقة..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
              />
            </div>


            <div className="space-y-2" dir="rtl">
              <div className="flex items-center justify-between mb-1" dir="ltr">
                <button
                  type="button"
                  disabled={translatingField === "wcuDescription-ar"}
                  onClick={() => handleAutoTranslate(wcuDescriptionAr, "ar", "en", setWcuDescription, "wcuDescription-ar")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                >
                  {translatingField === "wcuDescription-ar" ? "Translating..." : "Translate to English →"}
                </button>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">الوصف</label>
              </div>
              <textarea
                rows={5}
                value={wcuDescriptionAr}
                onChange={(e) => setWcuDescriptionAr(e.target.value)}
                placeholder="في ريفيرا، كل تفصيل مقصود..."
                className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none leading-relaxed text-right"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#F2EFE9]">
          <button
            disabled={savingPageSettings}
            onClick={() => savePageSettings()}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
          >
            {savingPageSettings ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
