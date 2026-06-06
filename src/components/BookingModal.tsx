"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Step = 1 | 2 | 3;

function getNext30Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const TIME_SLOTS = [
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BookingModal() {
  const { t, isRTL } = useLanguage();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const days = getNext30Days();

  const resetState = useCallback(() => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes("");
    setConfirmed(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-booking", handler);
    return () => window.removeEventListener("open-booking", handler);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  function handleNext() {
    if (step === 1 && selectedDate) setStep(2);
    if (step === 2 && selectedTime) setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  }

  function handleConfirm() {
    setConfirmed(true);
  }

  const canNext =
    (step === 1 && selectedDate !== null) ||
    (step === 2 && selectedTime !== null);

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t.booking.title}
    >
      <div className="modal-box" dir={isRTL ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full mb-2"
              style={{ backgroundColor: "var(--cr-secondary)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/main_logo.png" alt="Revera" width={28} height={28} style={{ objectFit: "contain" }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--cr-primary)" }}>
              {t.booking.title}
            </h3>
            {!confirmed && (
              <p className="text-xs mt-0.5" style={{ color: "var(--cr-accent)" }}>
                {t.booking.subtitle}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label={t.booking.closeBtn}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-colors hover:bg-gray-100"
            style={{ color: "var(--cr-accent)" }}
          >
            ×
          </button>
        </div>

        {/* Success screen */}
        {confirmed ? (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--cr-secondary)" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cr-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ color: "var(--cr-primary)" }}>{t.booking.successTitle}</h3>
            <p className="text-sm" style={{ color: "var(--cr-accent)" }}>
              {t.booking.successSubtitle}
            </p>
            {selectedDate && selectedTime && (
              <div
                className="w-full rounded-xl p-4 text-sm text-left"
                style={{ backgroundColor: "var(--cr-secondary)" }}
                dir={isRTL ? "rtl" : "ltr"}
              >
                <p className="mb-1">
                  <span className="font-semibold">{t.booking.labels.date}: </span>
                  {formatDate(selectedDate)}
                </p>
                <p className="mb-0">
                  <span className="font-semibold">{t.booking.labels.time}: </span>
                  {selectedTime}
                </p>
              </div>
            )}
            <button onClick={handleClose} className="btn-primary mt-2">
              {t.booking.closeBtn}
            </button>
          </div>
        ) : (
          <>
            {/* Step progress */}
            <div className={`flex items-center justify-between mb-8 ${isRTL ? "flex-row-reverse" : ""}`}>
              {t.booking.steps.map((label, i) => {
                const stepNum = (i + 1) as Step;
                const isActive = step === stepNum;
                const isDone = step > stepNum;
                return (
                  <div key={i} className={`flex flex-1 flex-col items-center gap-1.5 ${isRTL ? "items-center" : ""}`}>
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: isActive || isDone ? "var(--cr-primary)" : "var(--cr-secondary)",
                        color: isActive || isDone ? "var(--cr-white)" : "var(--cr-accent)",
                      }}
                    >
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className="text-center text-xs leading-tight"
                      style={{ color: isActive ? "var(--cr-primary)" : "var(--cr-accent)" }}
                    >
                      {label}
                    </span>
                    {i < t.booking.steps.length - 1 && (
                      <div
                        className={`hidden sm:block h-px flex-1 absolute`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Date grid */}
            {step === 1 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.selectDate}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 max-h-64 overflow-y-auto pr-1">
                  {days.map((day, i) => {
                    const isSelected =
                      selectedDate?.toDateString() === day.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        className="flex flex-col items-center rounded-xl py-2 px-1 text-center text-xs transition-colors"
                        style={{
                          backgroundColor: isSelected ? "var(--cr-primary)" : "var(--cr-secondary)",
                          color: isSelected ? "var(--cr-white)" : "var(--cr-primary)",
                          border: isSelected ? "none" : "1.5px solid var(--cr-accent)",
                        }}
                      >
                        <span className="font-semibold">
                          {day.toLocaleDateString("en-GB", { day: "2-digit" })}
                        </span>
                        <span className="opacity-70">
                          {day.toLocaleDateString("en-GB", { month: "short" })}
                        </span>
                        <span className="opacity-60 text-[10px]">
                          {day.toLocaleDateString("en-GB", { weekday: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Time slots */}
            {step === 2 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.selectTime}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className="rounded-xl py-3 text-center text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: isSelected ? "var(--cr-primary)" : "var(--cr-secondary)",
                          color: isSelected ? "var(--cr-white)" : "var(--cr-primary)",
                          border: isSelected ? "none" : "1.5px solid var(--cr-accent)",
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div>
                <p className="mb-4 text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
                  {t.booking.confirmTitle}
                </p>

                {/* Summary */}
                <div
                  className="rounded-xl p-4 mb-5 text-sm flex flex-col gap-2"
                  style={{ backgroundColor: "var(--cr-secondary)" }}
                >
                  {selectedDate && (
                    <p className="mb-0">
                      <span className="font-semibold">{t.booking.labels.date}: </span>
                      {formatDate(selectedDate)}
                    </p>
                  )}
                  {selectedTime && (
                    <p className="mb-0">
                      <span className="font-semibold">{t.booking.labels.time}: </span>
                      {selectedTime}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <label className="block mb-1 text-xs font-semibold" style={{ color: "var(--cr-accent)" }}>
                  {t.booking.notes}
                </label>
                <textarea
                  className="cr-input resize-none mb-5"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.booking.notes}
                />

                <button
                  onClick={handleConfirm}
                  className="btn-primary w-full justify-center"
                >
                  {t.booking.confirmBtn}
                </button>
              </div>
            )}

            {/* Navigation */}
            <div
              className={`flex mt-6 gap-3 ${
                step === 1 ? "justify-end" : isRTL ? "flex-row-reverse justify-between" : "justify-between"
              }`}
            >
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="btn-outline"
                >
                  {t.booking.backBtn}
                </button>
              )}
              {step < 3 && (
                <button
                  onClick={handleNext}
                  disabled={!canNext}
                  className="btn-primary"
                  style={{ opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "not-allowed" }}
                >
                  {t.booking.nextBtn}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
