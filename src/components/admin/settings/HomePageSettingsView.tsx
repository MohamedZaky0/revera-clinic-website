"use client";

import Image from "next/image";
import { Plus, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { compressImage } from "@/lib/image";

interface HomePageSettingsViewProps {
  // Hero slides
  homeHeroSlides: any[];
  homeHeroSlidesAr: any[];

  // Language tab
  pageSettingsLangTab: "en" | "ar";
  setPageSettingsLangTab: (v: "en" | "ar") => void;

  // Loading / saving
  loadingPageSettings: boolean;
  savingPageSettings: boolean;
  savePageSettings: (overrideData?: any) => Promise<void>;

  // Translate
  translatingField: string | null;
  handleTranslateSlideField: (
    index: number,
    field: string,
    text: string,
    from: "en" | "ar",
    to: "en" | "ar",
  ) => Promise<void>;

  // Slide handlers
  handleAddSlide: () => void;
  handleMoveSlide: (index: number, dir: "up" | "down") => void;
  handleDeleteSlide: (index: number) => Promise<void>;
  handleUpdateField: (index: number, field: string, val: string) => void;

  // Before/After
  beforeAfterPairs: any[];
  setBeforeAfterPairs: (v: any[]) => void;

  // Confirm dialog
  showConfirm: (message: string) => Promise<boolean>;
}

export default function HomePageSettingsView({
  homeHeroSlides,
  homeHeroSlidesAr,
  pageSettingsLangTab,
  setPageSettingsLangTab,
  loadingPageSettings,
  savingPageSettings,
  savePageSettings,
  translatingField,
  handleTranslateSlideField,
  handleAddSlide,
  handleMoveSlide,
  handleDeleteSlide,
  handleUpdateField,
  beforeAfterPairs,
  setBeforeAfterPairs,
  showConfirm,
}: HomePageSettingsViewProps) {
  const slidesList = pageSettingsLangTab === "en" ? homeHeroSlides : homeHeroSlidesAr;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
        <div>
          <h3 className="text-2xl font-bold text-[#1F251A]">Hero Slider Editor</h3>
          <p className="text-sm text-[#5A6A51] mt-1">Manage slides, headings, descriptions, and background images.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddSlide}
            className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
          >
            <Plus size={16} /> Add New Slide
          </button>
          <button
            disabled={savingPageSettings}
            onClick={() => savePageSettings({ hero: { slides: homeHeroSlides, slides_ar: homeHeroSlidesAr } })}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
          >
            {savingPageSettings ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {/* Language Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#414E36]/10 shadow-xs w-fit">
        <button
          onClick={() => setPageSettingsLangTab("en")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 ${
            pageSettingsLangTab === "en" ? "bg-[#414E36] text-[#FBFBF9] shadow-xs" : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          English Version
        </button>
        <button
          onClick={() => setPageSettingsLangTab("ar")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 ${
            pageSettingsLangTab === "ar" ? "bg-[#414E36] text-[#FBFBF9] shadow-xs" : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F2EFE9]/60"
          }`}
        >
          Arabic Version (العربية)
        </button>
      </div>

      {loadingPageSettings ? (
        <div className="rounded-b-[40px] bg-white p-12 shadow-[0_30px_80px_rgba(47,61,41,0.07)] flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#414E36] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-b-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-8">
          {slidesList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#5A6A51]">No slides found. Click "Add New Slide" to start.</p>
            </div>
          ) : (
            slidesList.map((slide: any, index: number) => (
              <div key={index} className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-6 space-y-6 relative group">

                {/* Slide header & order controls */}
                <div className="flex items-center justify-between border-b border-[#414E36]/8 pb-4">
                  <h4 className="font-bold text-[#414E36] text-lg">Slide #{index + 1}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveSlide(index, "up")}
                      className="p-2 rounded-full border border-[#414E36]/15 hover:bg-[#F2EFE9] text-[#414E36] disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={index === slidesList.length - 1}
                      onClick={() => handleMoveSlide(index, "down")}
                      className="p-2 rounded-full border border-[#414E36]/15 hover:bg-[#F2EFE9] text-[#414E36] disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSlide(index)}
                      className="ml-2 inline-flex items-center gap-1 rounded-2xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Two column: Image and Texts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left column: Image picker */}
                  <div className="lg:col-span-1 space-y-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Slide Background Image</label>
                    <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-gray-100 border border-dashed border-[#414E36]/20 flex flex-col items-center justify-center group/img">
                      {slide.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={slide.image} alt="Preview" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-medium">Click to change</span>
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
                              const compressed = await compressImage(file, 1920, 1080, 0.75);
                              handleUpdateField(index, "image", compressed);
                            } catch (err) {
                              console.error("Failed to compress hero image, using original:", err);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                handleUpdateField(index, "image", reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5A6A51]/80 mb-1.5">Or enter Image URL/Path</label>
                      <input
                        type="text"
                        value={slide.image || ""}
                        onChange={(e) => handleUpdateField(index, "image", e.target.value)}
                        placeholder="/images/hero/slide-1.jpg"
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2 text-xs text-[#1F251A] outline-none"
                      />
                    </div>
                  </div>

                  {/* Right column: Slide texts fields */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Welcome Badge Text</label>
                        <button
                          type="button"
                          disabled={translatingField === `slide-${index}-welcome-${pageSettingsLangTab}`}
                          onClick={() => handleTranslateSlideField(index, "welcome", slide.welcome || "", pageSettingsLangTab, pageSettingsLangTab === "en" ? "ar" : "en")}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `slide-${index}-welcome-${pageSettingsLangTab}` ? "Translating..." : `Translate to ${pageSettingsLangTab === "en" ? "Arabic" : "English"} →`}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={slide.welcome || ""}
                        onChange={(e) => handleUpdateField(index, "welcome", e.target.value)}
                        placeholder="e.g. Welcome to Revera Clinics"
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Heading Title</label>
                        <button
                          type="button"
                          disabled={translatingField === `slide-${index}-heading-${pageSettingsLangTab}`}
                          onClick={() => handleTranslateSlideField(index, "heading", slide.heading || "", pageSettingsLangTab, pageSettingsLangTab === "en" ? "ar" : "en")}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `slide-${index}-heading-${pageSettingsLangTab}` ? "Translating..." : `Translate to ${pageSettingsLangTab === "en" ? "Arabic" : "English"} →`}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={slide.heading || ""}
                        onChange={(e) => handleUpdateField(index, "heading", e.target.value)}
                        placeholder="e.g. Transform Your Beauty Naturally!"
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Slide Description</label>
                        <button
                          type="button"
                          disabled={translatingField === `slide-${index}-description-${pageSettingsLangTab}`}
                          onClick={() => handleTranslateSlideField(index, "description", slide.description || "", pageSettingsLangTab, pageSettingsLangTab === "en" ? "ar" : "en")}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `slide-${index}-description-${pageSettingsLangTab}` ? "Translating..." : `Translate to ${pageSettingsLangTab === "en" ? "Arabic" : "English"} →`}
                        </button>
                      </div>
                      <textarea
                        value={slide.description || ""}
                        onChange={(e) => handleUpdateField(index, "description", e.target.value)}
                        placeholder="Enter slide paragraph content..."
                        rows={3}
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C] resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">CTA Button Text</label>
                        <button
                          type="button"
                          disabled={translatingField === `slide-${index}-bookBtn-${pageSettingsLangTab}`}
                          onClick={() => handleTranslateSlideField(index, "bookBtn", slide.bookBtn || "", pageSettingsLangTab, pageSettingsLangTab === "en" ? "ar" : "en")}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                        >
                          {translatingField === `slide-${index}-bookBtn-${pageSettingsLangTab}` ? "Translating..." : `Translate to ${pageSettingsLangTab === "en" ? "Arabic" : "English"} →`}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={slide.bookBtn || ""}
                        onChange={(e) => handleUpdateField(index, "bookBtn", e.target.value)}
                        placeholder="e.g. Book Appointment"
                        className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51] mb-1.5">Rating</label>
                        <input
                          type="text"
                          value={slide.rating || ""}
                          onChange={(e) => handleUpdateField(index, "rating", e.target.value)}
                          placeholder="4.5"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A51]">Review Count</label>
                          <button
                            type="button"
                            disabled={translatingField === `slide-${index}-reviewCount-${pageSettingsLangTab}`}
                            onClick={() => handleTranslateSlideField(index, "reviewCount", slide.reviewCount || "", pageSettingsLangTab, pageSettingsLangTab === "en" ? "ar" : "en")}
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-[#414E36] hover:text-[#C4AE7C] transition disabled:opacity-50"
                          >
                            {translatingField === `slide-${index}-reviewCount-${pageSettingsLangTab}` ? "Translating..." : `→`}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={slide.reviewCount || ""}
                          onChange={(e) => handleUpdateField(index, "reviewCount", e.target.value)}
                          placeholder="(1000+ review)"
                          className="w-full rounded-xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none transition focus:border-[#C4AE7C]"
                        />
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            ))
          )}

          {/* Bottom action buttons */}
          {slidesList.length > 0 && (
            <div className="flex justify-end pt-4 border-t border-[#F2EFE9] gap-3">
              <button
                onClick={handleAddSlide}
                className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-transparent px-5 py-3 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
              >
                <Plus size={16} /> Add New Slide
              </button>
              <button
                disabled={savingPageSettings}
                onClick={() => savePageSettings({ hero: { slides: homeHeroSlides, slides_ar: homeHeroSlidesAr } })}
                className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50"
              >
                {savingPageSettings ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Before / After Results Editor */}
      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#F2EFE9]">
          <div>
            <h3 className="text-2xl font-bold text-[#1F251A]">Before / After Results</h3>
            <p className="text-sm text-[#5A6A51] mt-1">Manage the before-and-after photo catalog shown on the homepage.</p>
          </div>
          <button
            onClick={() => {
              const newPair = {
                id: Date.now(),
                before: "/images/before-after/1-before.jpeg",
                after: "/images/before-after/1-after.jpeg"
              };
              setBeforeAfterPairs([...beforeAfterPairs, newPair]);
            }}
            className="inline-flex items-center gap-2 rounded-3xl border border-[#414E36]/30 bg-transparent px-5 py-2.5 text-sm font-semibold text-[#414E36] transition hover:bg-[#F2EFE9]"
          >
            <Plus size={16} /> Add Result Pair
          </button>
        </div>

        {beforeAfterPairs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#5A6A51]">No before/after pairs found. Click "Add Result Pair" to start.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {beforeAfterPairs.map((pair, index) => (
              <div key={pair.id || index} className="rounded-3xl border border-[#414E36]/10 bg-[#FBFBF9] p-6 space-y-4 relative group">
                <div className="flex items-center justify-between border-b border-[#414E36]/8 pb-2">
                  <h4 className="font-bold text-[#414E36] text-sm">Result Case #{index + 1}</h4>
                  <button
                    onClick={async () => {
                      if (await showConfirm("Are you sure you want to delete this result case?")) {
                        const updated = beforeAfterPairs.filter((_, i) => i !== index);
                        setBeforeAfterPairs(updated);
                        savePageSettings({ results: { pairs: updated } });
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Before Photo Column */}
                  <div className="space-y-2">
                    <span className="block text-[11px] font-bold text-[#5A6A51] uppercase tracking-wide">Before</span>
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group/img">
                      {pair.before ? (
                        <>
                          <Image
                            src={pair.before}
                            alt="Before Case"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-semibold px-2 py-1 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <Upload className="mx-auto h-6 w-6 text-[#5A6A51]/60 mb-1" />
                          <span className="text-[10px] text-[#5A6A51]/60 font-medium">Upload File</span>
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
                              const updated = [...beforeAfterPairs];
                              updated[index] = { ...updated[index], before: compressed };
                              setBeforeAfterPairs(updated);
                            } catch (err) {
                              console.error("Failed to compress before image, using original:", err);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const updated = [...beforeAfterPairs];
                                updated[index] = { ...updated[index], before: reader.result as string };
                                setBeforeAfterPairs(updated);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      value={pair.before || ""}
                      onChange={(e) => {
                        const updated = [...beforeAfterPairs];
                        updated[index] = { ...updated[index], before: e.target.value };
                        setBeforeAfterPairs(updated);
                      }}
                      placeholder="Image URL"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-[11px] text-[#1F251A] outline-none"
                    />
                  </div>

                  {/* After Photo Column */}
                  <div className="space-y-2">
                    <span className="block text-[11px] font-bold text-[#5A6A51] uppercase tracking-wide">After</span>
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#414E36]/10 bg-[#F2EFE9] flex items-center justify-center group/img">
                      {pair.after ? (
                        <>
                          <Image
                            src={pair.after}
                            alt="After Case"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-semibold px-2 py-1 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm cursor-pointer">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <Upload className="mx-auto h-6 w-6 text-[#5A6A51]/60 mb-1" />
                          <span className="text-[10px] text-[#5A6A51]/60 font-medium">Upload File</span>
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
                              const updated = [...beforeAfterPairs];
                              updated[index] = { ...updated[index], after: compressed };
                              setBeforeAfterPairs(updated);
                            } catch (err) {
                              console.error("Failed to compress after image, using original:", err);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const updated = [...beforeAfterPairs];
                                updated[index] = { ...updated[index], after: reader.result as string };
                                setBeforeAfterPairs(updated);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      value={pair.after || ""}
                      onChange={(e) => {
                        const updated = [...beforeAfterPairs];
                        updated[index] = { ...updated[index], after: e.target.value };
                        setBeforeAfterPairs(updated);
                      }}
                      placeholder="Image URL"
                      className="w-full rounded-lg border border-[#414E36]/15 bg-white px-2 py-1 text-[11px] text-[#1F251A] outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
  );
}
