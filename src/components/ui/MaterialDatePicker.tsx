"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Edit2 } from "lucide-react";

interface MaterialDatePickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  disabledDates?: Record<string, number>; // date string "YYYY-MM-DD" -> count (>=8 or 99 means disabled)
  isClosedDay?: (date: Date) => boolean;
  isRTL?: boolean;
}

/** Format a local Date to YYYY-MM-DD */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function MaterialDatePicker({
  selectedDate,
  onSelectDate,
  disabledDates = {},
  isClosedDay,
  isRTL = false,
}: MaterialDatePickerProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Current view month/year
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNamesEN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthNamesAR = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const weekdaysEN = ["S", "M", "T", "W", "T", "F", "S"];
  const weekdaysAR = ["أ", "إ", "ث", "أ", "خ", "ج", "س"];

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

    // Empty lead cells
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    // Month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Header display string e.g. "Mon, Aug 17"
  const formattedHeaderDate = useMemo(() => {
    const target = selectedDate || today;
    return target.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [selectedDate, today, isRTL]);

  const isPrevDisabled = useMemo(() => {
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return viewDate <= firstOfCurrentMonth;
  }, [viewDate, today]);

  return (
    <div
      className="w-full max-w-sm rounded-[28px] p-5 shadow-sm transition-all"
      style={{
        backgroundColor: "#F3EFF7", // Soft MD3 container background
        border: "1px solid rgba(65, 78, 54, 0.12)",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header Title */}
      <p className="text-xs font-medium tracking-wide text-gray-600 mb-1">
        {isRTL ? "اختر التاريخ" : "Select date"}
      </p>

      {/* Main Selected Date Display with Edit Icon */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300/60">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1F251A]">
          {formattedHeaderDate}
        </h2>
        <div className="p-1.5 rounded-full text-gray-600 hover:bg-black/5 transition cursor-pointer">
          <Edit2 size={18} />
        </div>
      </div>

      {/* Month Switcher Navigation Bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-[#1F251A]">
            {isRTL ? `${monthNamesAR[month]} ${year}` : `${monthNamesEN[month]} ${year}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-1.5 rounded-full text-gray-700 hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            aria-label="Previous month"
          >
            {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-full text-gray-700 hover:bg-black/5 transition cursor-pointer"
            aria-label="Next month"
          >
            {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-600 mb-2">
        {(isRTL ? weekdaysAR : weekdaysEN).map((day, i) => (
          <div key={i} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {calendarDays.map((item, idx) => {
          if (!item.date) {
            return <div key={idx} className="h-10 w-10" />;
          }

          const dateStr = toLocalDateStr(item.date);
          const isPast = item.date < today;
          const isClosed = isClosedDay ? isClosedDay(item.date) : false;
          const isSlotDisabled = ((disabledDates[dateStr] ?? 0) >= 8);
          const isDisabled = isPast || isClosed || isSlotDisabled;

          const isToday = item.date.toDateString() === today.toDateString();
          const isSelected = selectedDate
            ? selectedDate.toDateString() === item.date.toDateString()
            : false;

          return (
            <div key={idx} className="flex items-center justify-center h-10">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelectDate(item.date!)}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-[#414E36] text-white font-bold shadow-xs scale-105"
                    : isToday
                    ? "border-2 border-[#414E36] text-[#414E36] font-bold"
                    : isDisabled
                    ? "text-gray-400 opacity-40 cursor-not-allowed"
                    : "text-gray-800 hover:bg-[#EDF1EC] hover:text-[#414E36]"
                }`}
              >
                {item.date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
