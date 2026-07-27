"use client";

import React, { useMemo } from "react";
import { Clock, Check } from "lucide-react";

interface MaterialTimePickerProps {
  selectedTime: string | null; // e.g. "09:00 AM" or "02:30 PM"
  onSelectTime: (time: string) => void;
  availableSlots?: string[]; // array of available 12h time strings e.g. ["09:00 AM", "09:15 AM", ...]
  takenSlots?: string[]; // 24h slots e.g. ["09:00", "09:15"]
  isRTL?: boolean;
}

function normaliseTo24hSlot(timeStr: string): string {
  const parts = timeStr.trim().split(" ");
  if (parts.length < 2) return timeStr;
  const [hhStr, mmStr] = parts[0].split(":");
  let hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  const ampm = parts[1].toUpperCase();
  if (ampm === "PM" && hh < 12) hh += 12;
  if (ampm === "AM" && hh === 12) hh = 0;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function MaterialTimePicker({
  selectedTime,
  onSelectTime,
  availableSlots = [],
  takenSlots = [],
  isRTL = false,
}: MaterialTimePickerProps) {
  // Group slots into Morning, Afternoon, Evening
  const groupedSlots = useMemo(() => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];

    availableSlots.forEach((slot) => {
      const slot24 = normaliseTo24hSlot(slot);
      const [hhStr] = slot24.split(":");
      const hh = parseInt(hhStr, 10);

      if (hh < 12) {
        morning.push(slot);
      } else if (hh < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  return (
    <div
      className="w-full max-w-md rounded-[28px] p-5 shadow-xs transition-all"
      style={{
        backgroundColor: "#EDF1EC", // Revera secondary brand background
        border: "1px solid rgba(65, 78, 54, 0.18)",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header Label */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#414E36]" />
          <h4 className="text-sm font-bold" style={{ color: "#414E36" }}>
            {isRTL ? "اختر الوقت" : "Select time"}
          </h4>
        </div>
        {selectedTime && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#414E36] text-white flex items-center gap-1">
            <Check size={12} />
            {selectedTime}
          </span>
        )}
      </div>

      {/* Available Slots Grid */}
      {availableSlots.length > 0 ? (
        <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {/* Morning Slots */}
          {groupedSlots.morning.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">
                {isRTL ? "الصباح (قبل الظهر)" : "Morning"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {groupedSlots.morning.map((slot) => {
                  const isSelected = selectedTime === slot;
                  const slot24 = normaliseTo24hSlot(slot);
                  const isTaken = takenSlots.includes(slot24);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isTaken}
                      onClick={() => !isTaken && onSelectTime(slot)}
                      className={`rounded-xl py-2.5 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#414E36] text-white shadow-sm scale-[1.02]"
                          : isTaken
                          ? "bg-gray-200/60 text-gray-400 opacity-40 cursor-not-allowed"
                          : "bg-white text-[#414E36] border border-[#414E36]/20 hover:border-[#414E36] hover:bg-[#414E36]/10"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Afternoon Slots */}
          {groupedSlots.afternoon.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">
                {isRTL ? "الظهيرة (بعد الظهر)" : "Afternoon"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {groupedSlots.afternoon.map((slot) => {
                  const isSelected = selectedTime === slot;
                  const slot24 = normaliseTo24hSlot(slot);
                  const isTaken = takenSlots.includes(slot24);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isTaken}
                      onClick={() => !isTaken && onSelectTime(slot)}
                      className={`rounded-xl py-2.5 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#414E36] text-white shadow-sm scale-[1.02]"
                          : isTaken
                          ? "bg-gray-200/60 text-gray-400 opacity-40 cursor-not-allowed"
                          : "bg-white text-[#414E36] border border-[#414E36]/20 hover:border-[#414E36] hover:bg-[#414E36]/10"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evening Slots */}
          {groupedSlots.evening.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#5A6A51] uppercase tracking-wider mb-2">
                {isRTL ? "المساء" : "Evening"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {groupedSlots.evening.map((slot) => {
                  const isSelected = selectedTime === slot;
                  const slot24 = normaliseTo24hSlot(slot);
                  const isTaken = takenSlots.includes(slot24);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isTaken}
                      onClick={() => !isTaken && onSelectTime(slot)}
                      className={`rounded-xl py-2.5 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#414E36] text-white shadow-sm scale-[1.02]"
                          : isTaken
                          ? "bg-gray-200/60 text-gray-400 opacity-40 cursor-not-allowed"
                          : "bg-white text-[#414E36] border border-[#414E36]/20 hover:border-[#414E36] hover:bg-[#414E36]/10"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center bg-white/60 rounded-2xl border border-[#414E36]/10">
          <p className="text-xs text-[#5A6A51] font-medium">
            {isRTL
              ? "اختر تاريخاً أولاً لرؤية المواعيد المتاحة"
              : "Select a date to view available time slots"}
          </p>
        </div>
      )}
    </div>
  );
}
