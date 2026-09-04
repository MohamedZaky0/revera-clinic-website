"use client";

import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/image";

interface AboutUsPageSettingsViewProps {
  // About Photos
  aboutImage1: string;
  setAboutImage1: (v: string) => void;
  aboutImage2: string;
  setAboutImage2: (v: string) => void;
  aboutImage3: string;
  setAboutImage3: (v: string) => void;

  // What We Do
  whatWeDoImage1: string;
  setWhatWeDoImage1: (v: string) => void;
  whatWeDoImage2: string;
  setWhatWeDoImage2: (v: string) => void;
  whatWeDoList: string[];
  setWhatWeDoList: (v: string[]) => void;
  whatWeDoListAr: string[];
  setWhatWeDoListAr: (v: string[]) => void;

  // FAQ
  faqImage1: string;
  setFaqImage1: (v: string) => void;
  faqImage2: string;
  setFaqImage2: (v: string) => void;
  faqTag: string;
  setFaqTag: (v: string) => void;
  faqHeading: string;
  setFaqHeading: (v: string) => void;
  faqTagAr: string;
  setFaqTagAr: (v: string) => void;
  faqHeadingAr: string;
  setFaqHeadingAr: (v: string) => void;
  faqs: { question: string; answer: string }[];
  setFaqs: (v: { question: string; answer: string }[]) => void;
  faqsAr: { question: string; answer: string }[];
  setFaqsAr: (v: { question: string; answer: string }[]) => void;

  // Translate handlers
  translatingField: string | null;
  handleAutoTranslate: (
    text: string,
    from: "en" | "ar",
    to: "en" | "ar",
    setter: (val: any) => void,
    fieldKey: string,
  ) => Promise<void>;
  handleTranslateChecklistItem: (
    index: number,
    text: string,
    from: "en" | "ar",
    to: "en" | "ar",
  ) => Promise<void>;
  handleTranslateFaqItem: (
    index: number,
    field: "question" | "answer",
    text: string,
    from: "en" | "ar",
    to: "en" | "ar",
  ) => Promise<void>;

  // Saving
  savingPageSettings: boolean;
  savePageSettings: (overrideData?: any) => Promise<void>;
}

export default function AboutUsPageSettingsView({
  aboutImage1,
  setAboutImage1,
  aboutImage2,
  setAboutImage2,
  aboutImage3,
  setAboutImage3,
  whatWeDoImage1,
  setWhatWeDoImage1,
  whatWeDoImage2,
  setWhatWeDoImage2,
  whatWeDoList,
  setWhatWeDoList,
  whatWeDoListAr,
  setWhatWeDoListAr,
  faqImage1,
  setFaqImage1,
  faqImage2,
  setFaqImage2,
  faqTag,
  setFaqTag,
  faqHeading,
  setFaqHeading,
  faqTagAr,
  setFaqTagAr,
  faqHeadingAr,
  setFaqHeadingAr,
  faqs,
  setFaqs,
  faqsAr,
  setFaqsAr,
  translatingField,
  handleAutoTranslate,
  handleTranslateChecklistItem,
  handleTranslateFaqItem,
  savingPageSettings,
  savePageSettings,
}: AboutUsPageSettingsViewProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-[#1F251A]">About Section Photos</h3>
          <p className="text-sm text-[#5A6A51] mt-1">Upload or edit the three main images displayed in the homepage About section.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {/* Image 1: Left Doctor Portrait */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 1: Doctor Portrait (Foreground)</label>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {aboutImage1 || "/images/doctor/portrait-about.jpg" ? (
                <>
                  <Image
                    src={aboutImage1 || "/images/doctor/portrait-about.jpg"}
                    alt="Foreground Portrait"
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
                      setAboutImage1(compressed);
                    } catch (err) {
                      console.error("Failed to compress portrait 1, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAboutImage1(reader.result as string);
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
                value={aboutImage1}
                onChange={(e) => setAboutImage1(e.target.value)}
                placeholder="/images/doctor/portrait-about.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* Image 2: Right Doctor Portrait */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 2: Doctor Portrait (Background)</label>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {aboutImage2 || "/images/doctor/portrait-main.jpg" ? (
                <>
                  <Image
                    src={aboutImage2 || "/images/doctor/portrait-main.jpg"}
                    alt="Background Portrait"
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
                      setAboutImage2(compressed);
                    } catch (err) {
                      console.error("Failed to compress portrait 2, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAboutImage2(reader.result as string);
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
                value={aboutImage2}
                onChange={(e) => setAboutImage2(e.target.value)}
                placeholder="/images/doctor/portrait-main.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* Image 3: Clinic Interior */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 3: Clinic Interior</label>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {aboutImage3 || "/images/clinic/interior.jpg" ? (
                <>
                  <Image
                    src={aboutImage3 || "/images/clinic/interior.jpg"}
                    alt="Clinic Interior"
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
                      setAboutImage3(compressed);
                    } catch (err) {
                      console.error("Failed to compress clinic interior, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAboutImage3(reader.result as string);
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
                value={aboutImage3}
                onChange={(e) => setAboutImage3(e.target.value)}
                placeholder="/images/clinic/interior.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
          <button
            disabled={savingPageSettings}
            onClick={() => savePageSettings()}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] duration-150 cursor-pointer"
          >
            {savingPageSettings ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-[#1F251A]">What We Do</h3>
          <p className="text-sm text-[#5A6A51] mt-1">Upload or edit the photos and modify checklist items shown in the "What We Do" section on the About Us page.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* What We Do Photo 1: Left Before/After Collage */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">What We Do: Photo 1 (Left Collage)</label>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {whatWeDoImage1 || "/images/clinic/interior.jpg" ? (
                <>
                  <Image
                    src={whatWeDoImage1 || "/images/clinic/interior.jpg"}
                    alt="What We Do Left Image"
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
                      setWhatWeDoImage1(compressed);
                    } catch (err) {
                      console.error("Failed to compress what we do 1, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setWhatWeDoImage1(reader.result as string);
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
                value={whatWeDoImage1}
                onChange={(e) => setWhatWeDoImage1(e.target.value)}
                placeholder="/images/clinic/interior.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>

          {/* What We Do Photo 2: Right Circular Image */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">What We Do: Photo 2 (Right Treatment)</label>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
              {whatWeDoImage2 || "/images/clinic/video-thumbnail.jpg" ? (
                <>
                  <Image
                    src={whatWeDoImage2 || "/images/clinic/video-thumbnail.jpg"}
                    alt="What We Do Right Image"
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
                      setWhatWeDoImage2(compressed);
                    } catch (err) {
                      console.error("Failed to compress what we do 2, using original:", err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setWhatWeDoImage2(reader.result as string);
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
                value={whatWeDoImage2}
                onChange={(e) => setWhatWeDoImage2(e.target.value)}
                placeholder="/images/clinic/video-thumbnail.jpg"
                className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
              />
            </div>
          </div>
        </div>

        <hr className="border-[#F2EFE9] my-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* English Checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#1F251A]">English Checklist Items</h4>
              <button
                type="button"
                onClick={() => setWhatWeDoList([...whatWeDoList, ""])}
                className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Add Item
              </button>
            </div>
            {whatWeDoList.map((item, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#5A6A51]">Item {index + 1}</label>
                    <button
                      type="button"
                      disabled={translatingField === `whatwedo-${index}-en`}
                      onClick={() => handleTranslateChecklistItem(index, item, "en", "ar")}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                    >
                      {translatingField === `whatwedo-${index}-en` ? "Translating..." : "Translate to Arabic →"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newList = [...whatWeDoList];
                      newList[index] = e.target.value;
                      setWhatWeDoList(newList);
                    }}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                    placeholder={`Checklist Item ${index + 1}`}
                  />
                </div>
                {whatWeDoList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newList = whatWeDoList.filter((_, i) => i !== index);
                      setWhatWeDoList(newList);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition duration-155 cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Arabic Checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWhatWeDoListAr([...whatWeDoListAr, ""])}
                className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
              >
                + إضافة عنصر
              </button>
              <h4 className="text-sm font-semibold text-[#1F251A] text-right">عناصر القائمة باللغة العربية</h4>
            </div>
            {whatWeDoListAr.map((item, index) => (
              <div key={index} className="flex items-end gap-2" dir="rtl">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between mb-1" dir="ltr">
                    <button
                      type="button"
                      disabled={translatingField === `whatwedo-${index}-ar`}
                      onClick={() => handleTranslateChecklistItem(index, item, "ar", "en")}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                    >
                      {translatingField === `whatwedo-${index}-ar` ? "Translating..." : "Translate to English →"}
                    </button>
                    <label className="block text-xs font-semibold text-[#5A6A51] text-right">العنصر {index + 1}</label>
                  </div>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newList = [...whatWeDoListAr];
                      newList[index] = e.target.value;
                      setWhatWeDoListAr(newList);
                    }}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                    placeholder={`عنصر القائمة ${index + 1}`}
                  />
                </div>
                {whatWeDoListAr.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newList = whatWeDoListAr.filter((_, i) => i !== index);
                      setWhatWeDoListAr(newList);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition duration-155 cursor-pointer"
                    title="حذف العنصر"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
          <button
            disabled={savingPageSettings}
            onClick={() => savePageSettings()}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
          >
            {savingPageSettings ? "Saving..." : "Save All Changes"}
          </button>
        </div>

        {/* Frequently Asked Questions Section */}
        <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-[#1F251A]">Frequently Asked Questions</h3>
            <p className="text-sm text-[#5A6A51] mt-1">Configure the images, tag, heading, and list of questions & answers for the FAQ accordion on the About Us page.</p>
          </div>

          {/* FAQ Photos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#F2EFE9]">
            {/* Photo 1: Left Consultation (Main) */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 1: Consultation (Main Left)</label>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                {faqImage1 || "/images/doctor/portrait-main.jpg" ? (
                  <>
                    <Image
                      src={faqImage1 || "/images/doctor/portrait-main.jpg"}
                      alt="Main FAQ Image"
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
                        setFaqImage1(compressed);
                      } catch (err) {
                        console.error("Failed to compress FAQ Image 1, using original:", err);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFaqImage1(reader.result as string);
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
                  value={faqImage1}
                  onChange={(e) => setFaqImage1(e.target.value)}
                  placeholder="/images/doctor/portrait-main.jpg"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>

            {/* Photo 2: Right Portrait (Secondary Overlay) */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Photo 2: Portrait (Secondary Right)</label>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group">
                {faqImage2 || "/images/doctor/portrait-faq.jpg" ? (
                  <>
                    <Image
                      src={faqImage2 || "/images/doctor/portrait-faq.jpg"}
                      alt="Secondary FAQ Image"
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
                        setFaqImage2(compressed);
                      } catch (err) {
                        console.error("Failed to compress FAQ Image 2, using original:", err);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFaqImage2(reader.result as string);
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
                  value={faqImage2}
                  onChange={(e) => setFaqImage2(e.target.value)}
                  placeholder="/images/doctor/portrait-faq.jpg"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>
          </div>

          {/* FAQ Text Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#F2EFE9]">
            {/* English General */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#1F251A]">English Content Info</h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">FAQ Tagline</label>
                  <button
                    type="button"
                    disabled={translatingField === "faqTag-en"}
                    onClick={() => handleAutoTranslate(faqTag, "en", "ar", setFaqTagAr, "faqTag-en")}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                  >
                    {translatingField === "faqTag-en" ? "Translating..." : "Translate to Arabic →"}
                  </button>
                </div>
                <input
                  type="text"
                  value={faqTag}
                  onChange={(e) => setFaqTag(e.target.value)}
                  placeholder="Frequently Asked Questions"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">FAQ Heading</label>
                  <button
                    type="button"
                    disabled={translatingField === "faqHeading-en"}
                    onClick={() => handleAutoTranslate(faqHeading, "en", "ar", setFaqHeadingAr, "faqHeading-en")}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                  >
                    {translatingField === "faqHeading-en" ? "Translating..." : "Translate to Arabic →"}
                  </button>
                </div>
                <input
                  type="text"
                  value={faqHeading}
                  onChange={(e) => setFaqHeading(e.target.value)}
                  placeholder="Questions? We have answers."
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
            </div>

            {/* Arabic General */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#1F251A] text-right">المعلومات باللغة العربية</h4>

              <div className="space-y-2" dir="rtl">
                <div className="flex items-center justify-between mb-1" dir="ltr">
                  <button
                    type="button"
                    disabled={translatingField === "faqTag-ar"}
                    onClick={() => handleAutoTranslate(faqTagAr, "ar", "en", setFaqTag, "faqTag-ar")}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                  >
                    {translatingField === "faqTag-ar" ? "Translating..." : "Translate to English →"}
                  </button>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان الجانبي</label>
                </div>
                <input
                  type="text"
                  value={faqTagAr}
                  onChange={(e) => setFaqTagAr(e.target.value)}
                  placeholder="أسئلة شائعة"
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                />
              </div>

              <div className="space-y-2" dir="rtl">
                <div className="flex items-center justify-between mb-1" dir="ltr">
                  <button
                    type="button"
                    disabled={translatingField === "faqHeading-ar"}
                    onClick={() => handleAutoTranslate(faqHeadingAr, "ar", "en", setFaqHeading, "faqHeading-ar")}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                  >
                    {translatingField === "faqHeading-ar" ? "Translating..." : "Translate to English →"}
                  </button>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] text-right">العنوان الرئيسي</label>
                </div>
                <input
                  type="text"
                  value={faqHeadingAr}
                  onChange={(e) => setFaqHeadingAr(e.target.value)}
                  placeholder="أسئلة؟ لدينا إجابات."
                  className="w-full rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] px-3 py-2.5 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                />
              </div>
            </div>
          </div>

          {/* FAQ Items Accordion list editors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#F2EFE9]">
            {/* English FAQ Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#1F251A]">English FAQ Items</h4>
                <button
                  type="button"
                  onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                  className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Add FAQ Item
                </button>
              </div>

              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {faqs.map((faq, index) => (
                  <div key={index} className="p-4 rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] space-y-3 relative group">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#5A6A51]">FAQ Item #{index + 1}</span>
                      {faqs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase">Question</label>
                        <button
                          type="button"
                          disabled={translatingField === `faq-${index}-question-en`}
                          onClick={() => handleTranslateFaqItem(index, "question", faq.question, "en", "ar")}
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `faq-${index}-question-en` ? "Translating..." : "Translate to Arabic →"}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const newFaqs = [...faqs];
                          newFaqs[index].question = e.target.value;
                          setFaqs(newFaqs);
                        }}
                        placeholder="Enter Question..."
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase">Answer</label>
                        <button
                          type="button"
                          disabled={translatingField === `faq-${index}-answer-en`}
                          onClick={() => handleTranslateFaqItem(index, "answer", faq.answer, "en", "ar")}
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `faq-${index}-answer-en` ? "Translating..." : "Translate to Arabic →"}
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={faq.answer}
                        onChange={(e) => {
                          const newFaqs = [...faqs];
                          newFaqs[index].answer = e.target.value;
                          setFaqs(newFaqs);
                        }}
                        placeholder="Enter Answer..."
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arabic FAQ Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFaqsAr([...faqsAr, { question: "", answer: "" }])}
                  className="text-xs font-semibold text-[#414E36] hover:text-[#2e3a26] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + إضافة سؤال
                </button>
                <h4 className="text-sm font-semibold text-[#1F251A] text-right">أسئلة وأجوبة باللغة العربية</h4>
              </div>

              <div className="space-y-6 max-h-[500px] overflow-y-auto pl-2" dir="rtl">
                {faqsAr.map((faq, index) => (
                  <div key={index} className="p-4 rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] space-y-3 relative group text-right">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#5A6A51]">سؤال وجواب #{index + 1}</span>
                      {faqsAr.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFaqsAr(faqsAr.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between mb-1" dir="ltr">
                        <button
                          type="button"
                          disabled={translatingField === `faq-${index}-question-ar`}
                          onClick={() => handleTranslateFaqItem(index, "question", faq.question, "ar", "en")}
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `faq-${index}-question-ar` ? "Translating..." : "Translate to English →"}
                        </button>
                        <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase text-right">السؤال</label>
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const newFaqs = [...faqsAr];
                          newFaqs[index].question = e.target.value;
                          setFaqsAr(newFaqs);
                        }}
                        placeholder="اكتب السؤال هنا..."
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between mb-1" dir="ltr">
                        <button
                          type="button"
                          disabled={translatingField === `faq-${index}-answer-ar`}
                          onClick={() => handleTranslateFaqItem(index, "answer", faq.answer, "ar", "en")}
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `faq-${index}-answer-ar` ? "Translating..." : "Translate to English →"}
                        </button>
                        <label className="block text-[10px] font-semibold text-[#5A6A51] uppercase text-right">الإجابة</label>
                      </div>
                      <textarea
                        rows={3}
                        value={faq.answer}
                        onChange={(e) => {
                          const newFaqs = [...faqsAr];
                          newFaqs[index].answer = e.target.value;
                          setFaqsAr(newFaqs);
                        }}
                        placeholder="اكتب الإجابة هنا..."
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none focus:border-[#C4AE7C] resize-none text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
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
    </div>
  );
}
