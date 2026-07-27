"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Keyboard, Clock } from "lucide-react";

interface MaterialTimePickerProps {
  selectedTime: string | null; // e.g. "07:00 AM" or "02:30 PM"
  onSelectTime: (time: string) => void;
  availableSlots?: string[]; // array of available 12h time strings e.g. ["09:00 AM", "09:15 AM", ...]
  takenSlots?: string[]; // 24h slots e.g. ["09:00", "09:15"]
  isRTL?: boolean;
}

function parseTime12h(timeStr: string | null): { hour: number; minute: number; ampm: "AM" | "PM" } {
  if (!timeStr) return { hour: 7, minute: 0, ampm: "AM" };
  const parts = timeStr.trim().split(" ");
  const ampm = parts[1]?.toUpperCase() === "PM" ? "PM" : "AM";
  const [hhStr, mmStr] = (parts[0] || "07:00").split(":");
  let hour = parseInt(hhStr, 10) || 7;
  const minute = parseInt(mmStr, 10) || 0;
  if (hour > 12) hour = hour % 12;
  if (hour === 0) hour = 12;
  return { hour, minute, ampm };
}

function format12h(hour: number, minute: number, ampm: "AM" | "PM"): string {
  const hh = String(hour === 0 ? 12 : hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
}

export function MaterialTimePicker({
  selectedTime,
  onSelectTime,
  availableSlots = [],
  takenSlots = [],
  isRTL = false,
}: MaterialTimePickerProps) {
  const initial = useMemo(() => parseTime12h(selectedTime), [selectedTime]);

  const [hour, setHour] = useState<number>(initial.hour);
  const [minute, setMinute] = useState<number>(initial.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(initial.ampm);
  const [clockMode, setClockMode] = useState<"hours" | "minutes">("hours");
  const [inputMode, setInputMode] = useState<"clock" | "slots">("clock");

  const dialRef = useRef<HTMLDivElement>(null);

  // Sync internal state when selectedTime prop updates externally
  useEffect(() => {
    const p = parseTime12h(selectedTime);
    setHour(p.hour);
    setMinute(p.minute);
    setAmpm(p.ampm);
  }, [selectedTime]);

  const updateTime = (h: number, m: number, period: "AM" | "PM") => {
    const formatted = format12h(h, m, period);
    onSelectTime(formatted);
  };

  const handleHourSelect = (h: number) => {
    setHour(h);
    updateTime(h, minute, ampm);
    // Auto switch to minutes mode after selecting hour
    setClockMode("minutes");
  };

  const handleMinuteSelect = (m: number) => {
    setMinute(m);
    updateTime(hour, m, ampm);
  };

  const handleAmpmToggle = (period: "AM" | "PM") => {
    setAmpm(period);
    updateTime(hour, minute, period);
  };

  // Math for clock hand pointer angle
  const hourAngle = useMemo(() => {
    return (hour % 12) * 30; // 360 / 12 = 30 deg
  }, [hour]);

  const minuteAngle = useMemo(() => {
    return minute * 6; // 360 / 60 = 6 deg
  }, [minute]);

  const activeAngle = clockMode === "hours" ? hourAngle : minuteAngle;

  // Handle dial mouse/touch clicks
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees clockwise from 12 o'clock (0 deg)
    let deg = (Math.atan2(dy, dx) * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;

    if (clockMode === "hours") {
      let selectedH = Math.round(deg / 30);
      if (selectedH === 0) selectedH = 12;
      handleHourSelect(selectedH);
    } else {
      let selectedM = Math.round(deg / 6);
      if (selectedM === 60) selectedM = 0;
      // Round to nearest 5 or 15 mins for clinic usability
      const roundedM = Math.round(selectedM / 15) * 15 % 60;
      handleMinuteSelect(roundedM);
    }
  };

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div
      className="w-full max-w-sm rounded-[28px] p-5 shadow-sm transition-all"
      style={{
        backgroundColor: "#F3EFF7", // Soft MD3 container background
        border: "1px solid rgba(65, 78, 54, 0.12)",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header Label */}
      <p className="text-xs font-medium tracking-wide text-gray-600 mb-3">
        {isRTL ? "اختر الوقت" : "Select time"}
      </p>

      {/* Digital Display Header (HH : MM + AM/PM) */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2" dir="ltr">
          {/* Hour Box */}
          <button
            type="button"
            onClick={() => setClockMode("hours")}
            className={`flex h-16 w-20 items-center justify-center rounded-2xl text-3xl font-normal transition-all ${
              clockMode === "hours"
                ? "bg-[#D0BCFF]/40 text-[#1D192B] ring-2 ring-[#414E36] font-semibold"
                : "bg-white/80 text-gray-900 border border-gray-200"
            }`}
          >
            {String(hour).padStart(2, "0")}
          </button>

          {/* Separator */}
          <span className="text-3xl font-light text-gray-800 animate-pulse">:</span>

          {/* Minute Box */}
          <button
            type="button"
            onClick={() => setClockMode("minutes")}
            className={`flex h-16 w-20 items-center justify-center rounded-2xl text-3xl font-normal transition-all ${
              clockMode === "minutes"
                ? "bg-[#D0BCFF]/40 text-[#1D192B] ring-2 ring-[#414E36] font-semibold"
                : "bg-white/80 text-gray-900 border border-gray-200"
            }`}
          >
            {String(minute).padStart(2, "0")}
          </button>
        </div>

        {/* AM / PM Stack Toggle Pill */}
        <div className="flex flex-col rounded-xl border border-gray-300 bg-white/70 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => handleAmpmToggle("AM")}
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              ampm === "AM"
                ? "bg-[#E8DEF8] text-[#1D192B]"
                : "text-gray-600 hover:bg-black/5"
            }`}
          >
            AM
          </button>
          <div className="h-px bg-gray-200" />
          <button
            type="button"
            onClick={() => handleAmpmToggle("PM")}
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              ampm === "PM"
                ? "bg-[#E8DEF8] text-[#1D192B]"
                : "text-gray-600 hover:bg-black/5"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Main Body: Radial Clock vs Slots Grid */}
      {inputMode === "clock" ? (
        /* Radial Analog Clock Dial */
        <div className="flex flex-col items-center justify-center py-2">
          <div
            ref={dialRef}
            onClick={handleDialClick}
            className="relative h-56 w-56 rounded-full bg-[#E6E1E5]/70 flex items-center justify-center cursor-pointer select-none touch-none shadow-inner"
          >
            {/* Center Pivot Point */}
            <div className="absolute h-3 w-3 rounded-full bg-[#414E36] z-20 shadow-xs" />

            {/* Pointer Hand Vector Line */}
            <div
              className="absolute top-1/2 left-1/2 w-0.5 bg-[#414E36] origin-top transition-all duration-150 z-10"
              style={{
                height: "80px",
                transform: `rotate(${activeAngle - 180}deg) translateX(-50%)`,
              }}
            />

            {/* Radial Numbers */}
            {(clockMode === "hours" ? hoursList : minutesList).map((val) => {
              // Calculate positioning around 220px dial
              const angleDeg = clockMode === "hours" ? (val % 12) * 30 : val * 6;
              const angleRad = (angleDeg - 90) * (Math.PI / 180);
              const radius = 86; // px radius from center
              const x = radius * Math.cos(angleRad);
              const y = radius * Math.sin(angleRad);

              const isSelected =
                clockMode === "hours"
                  ? hour === (val === 0 ? 12 : val)
                  : minute === val;

              return (
                <button
                  key={val}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (clockMode === "hours") {
                      handleHourSelect(val === 0 ? 12 : val);
                    } else {
                      handleMinuteSelect(val);
                    }
                  }}
                  className={`absolute h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all z-20 ${
                    isSelected
                      ? "bg-[#414E36] text-white font-bold scale-110 shadow-xs"
                      : "text-gray-800 hover:bg-black/10 font-medium"
                  }`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  {clockMode === "hours" ? val : String(val).padStart(2, "0")}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Available Slots Quick Grid View */
        <div className="py-2">
          <p className="text-[11px] font-semibold text-gray-600 mb-2">
            {isRTL ? "المواعيد المتاحة:" : "Available Time Slots:"}
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto custom-scrollbar p-1">
            {availableSlots.length > 0 ? (
              availableSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onSelectTime(slot)}
                    className={`rounded-xl py-2 px-1 text-center text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#414E36] text-white shadow-xs"
                        : "bg-white text-[#414E36] border border-gray-300 hover:border-[#414E36]"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })
            ) : (
              <p className="col-span-3 text-center text-xs text-gray-500 py-6">
                {isRTL ? "اختر تاريخاً أولاً لرؤية المواعيد" : "Select a date to view slots"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mode Switcher Button Footer (Keyboard Icon on bottom left) */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-300/60">
        <button
          type="button"
          onClick={() => setInputMode((prev) => (prev === "clock" ? "slots" : "clock"))}
          className="p-2 rounded-full text-[#414E36] hover:bg-black/5 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title={inputMode === "clock" ? (isRTL ? "عرض المواعيد المتاحة" : "Switch to Available Slots") : (isRTL ? "عرض الساعة" : "Switch to Clock Dial")}
        >
          {inputMode === "clock" ? <Keyboard size={18} /> : <Clock size={18} />}
          <span className="text-[11px]">
            {inputMode === "clock"
              ? (isRTL ? "قائمة المواعيد" : "Slots Grid")
              : (isRTL ? "ساعة دائرية" : "Clock Dial")}
          </span>
        </button>

        <div className="text-[11px] font-semibold text-[#414E36]">
          {selectedTime || (isRTL ? "لم يتم تحديد وقت" : "No time selected")}
        </div>
      </div>
    </div>
  );
}
