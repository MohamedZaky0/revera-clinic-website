"use client";

import React from "react";
import {
  Calendar,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  CheckCircle2,
  Play,
  UserCheck,
  Info
} from "lucide-react";

interface DoctorScheduleTabProps {
  selectedDateStr: string;
  setSelectedDateStr: (date: string) => void;
  todayStr: string;
  yesterdayStr: string;
  tomorrowStr: string;
  lang: "en" | "ar";
  setLang: (lang: "en" | "ar") => void;
  scheduleViewMode: "calendar" | "list";
  setScheduleViewMode: (mode: "calendar" | "list") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  calendarMonth: Date;
  handlePrevCalendarMonth: () => void;
  handleTodayCalendarMonth: () => void;
  handleNextCalendarMonth: () => void;
  calendarDaysList: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[];
  reservationsByDate: Record<string, any[]>;
  stats: { total: number; completed: number; inProgress: number; upcoming: number };
  filteredSchedule: any[];
  handleOpenScheduleModal: (booking: any) => void;
  t: any;
}

export default function DoctorScheduleTab({
  selectedDateStr,
  setSelectedDateStr,
  todayStr,
  yesterdayStr,
  tomorrowStr,
  lang,
  setLang,
  scheduleViewMode,
  setScheduleViewMode,
  searchQuery,
  setSearchQuery,
  calendarMonth,
  handlePrevCalendarMonth,
  handleTodayCalendarMonth,
  handleNextCalendarMonth,
  calendarDaysList,
  reservationsByDate,
  stats,
  filteredSchedule,
  handleOpenScheduleModal,
  t
}: DoctorScheduleTabProps) {
  return (
    <div className="space-y-6 w-full">
      {/* Header Title & View Toggle Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F251A]">
            {selectedDateStr === todayStr
              ? t.todayAppointmentsTitle
              : selectedDateStr === yesterdayStr
              ? t.yesterdayAppointmentsTitle
              : selectedDateStr === tomorrowStr
              ? t.tomorrowAppointmentsTitle
              : `${t.customDateAppointmentsTitle} ${selectedDateStr}`}
          </h2>
          <p className="text-xs text-[#5A6A51] mt-1">
            {t.scheduleSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* VIEW MODE TOGGLE SWITCHER */}
          <div className="flex items-center rounded-2xl bg-white p-1 border border-[#414E36]/15 shadow-sm">
            <button
              type="button"
              onClick={() => setScheduleViewMode("calendar")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                scheduleViewMode === "calendar"
                  ? "bg-[#414E36] text-white shadow-sm"
                  : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F4F5F1]"
              }`}
            >
              <Calendar size={14} />
              <span>{t.calendarViewBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                scheduleViewMode === "list"
                  ? "bg-[#414E36] text-white shadow-sm"
                  : "text-[#5A6A51] hover:text-[#414E36] hover:bg-[#F4F5F1]"
              }`}
            >
              <List size={14} />
              <span>{t.queueListViewBtn}</span>
            </button>
          </div>

          {/* Patient Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-[#5A6A51]" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-2xl border border-[#414E36]/15 bg-white pl-9 pr-4 py-2 text-xs text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36] w-56"
            />
          </div>
        </div>
      </div>

      {/* Quick Dynamic Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        <div className="rounded-3xl border border-[#414E36]/10 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5A6A51]">
            {scheduleViewMode === "calendar" ? `${t.totalScheduledCard} (${calendarMonth.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" })})` : t.totalScheduledCard}
          </span>
          <div className="mt-2 text-3xl font-extrabold text-[#1F251A]">{stats.total} {t.patientsUnit}</div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {scheduleViewMode === "calendar" ? `${t.completedCard} (${calendarMonth.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" })})` : t.completedCard}
          </span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-800">{stats.completed} {t.sessionsUnit}</div>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            {scheduleViewMode === "calendar" ? `${t.inTreatmentCard} (${calendarMonth.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" })})` : t.inTreatmentCard}
          </span>
          <div className="mt-2 text-3xl font-extrabold text-amber-800">{stats.inProgress} {t.activeUnit}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {scheduleViewMode === "calendar" ? `${t.upcomingQueueCard} (${calendarMonth.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" })})` : t.upcomingQueueCard}
          </span>
          <div className="mt-2 text-3xl font-extrabold text-slate-700">{stats.upcoming} {t.waitingUnit}</div>
        </div>
      </div>

      {/* DUAL VIEW CONTAINER */}
      {scheduleViewMode === "calendar" ? (
        /* VIEW 1: INTERACTIVE CALENDAR VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          {/* Left Column: Interactive Month Grid Picker & Navigator */}
          <div className="lg:col-span-5 rounded-[32px] border border-[#414E36]/10 bg-white p-6 shadow-[0_20px_50px_rgba(47,61,41,0.05)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#414E36]/10">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#414E36]" />
                <h3 className="text-base font-extrabold text-[#1F251A]">
                  {calendarMonth.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" })}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevCalendarMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} className="rtl:rotate-180 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={handleTodayCalendarMonth}
                  className="px-3 py-1 text-xs font-bold rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                  title={t.todayBtn}
                >
                  {t.todayBtn}
                </button>
                <button
                  type="button"
                  onClick={handleNextCalendarMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                  title="Next Month"
                >
                  <ChevronRight size={16} className="rtl:rotate-180 transition-transform" />
                </button>
              </div>
            </div>

            {/* Weekday Header Labels */}
            <div className="grid grid-cols-7 text-center text-[11px] font-extrabold uppercase tracking-wider text-[#5A6A51]/70">
              <div>{t.weekdaySun}</div>
              <div>{t.weekdayMon}</div>
              <div>{t.weekdayTue}</div>
              <div>{t.weekdayWed}</div>
              <div>{t.weekdayThu}</div>
              <div>{t.weekdayFri}</div>
              <div>{t.weekdaySat}</div>
            </div>

            {/* Days Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {calendarDaysList.map((dayItem, idx) => {
                const isSelected = dayItem.dateStr === selectedDateStr;
                const isToday = dayItem.dateStr === todayStr;
                const dayBookings = reservationsByDate[dayItem.dateStr] || [];
                const hasBookings = dayBookings.length > 0;

                const hasCompleted = dayBookings.some((b) => b.status === "completed" || b.status === "done");
                const hasInProgress = dayBookings.some((b) => b.status === "started" || b.status === "in-progress");
                const hasArrived = dayBookings.some((b) => b.status === "arrived");

                return (
                  <button
                    key={`${dayItem.dateStr}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDateStr(dayItem.dateStr)}
                    className={`relative flex flex-col items-center justify-between p-2 min-h-[56px] rounded-2xl transition-all duration-200 text-xs font-bold ${
                      isSelected
                        ? "bg-[#414E36] text-white shadow-md shadow-[#414E36]/25 scale-105 z-10 ring-2 ring-[#414E36]"
                        : dayItem.isCurrentMonth
                        ? isToday
                          ? "bg-[#414E36]/10 text-[#414E36] ring-2 ring-[#414E36]/30 hover:bg-[#414E36]/15"
                          : "bg-[#FBFBF9] text-[#1F251A] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                        : "bg-transparent text-slate-300 hover:text-slate-500"
                    }`}
                  >
                    <div className="flex w-full justify-between items-center">
                      <span className={`text-xs ${isSelected ? "font-extrabold text-white" : isToday ? "font-black text-[#414E36]" : ""}`}>
                        {dayItem.dayNum}
                      </span>

                      {hasBookings && (
                        <span
                          className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${
                            isSelected
                              ? "bg-white text-[#414E36]"
                              : "bg-[#414E36] text-white"
                          }`}
                        >
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Status Indicator Dots */}
                    {hasBookings && (
                      <div className="flex items-center gap-1 mt-1">
                        {hasCompleted && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`} />}
                        {hasInProgress && <span className={`h-1.5 w-1.5 rounded-full animate-ping ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} />}
                        {hasArrived && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-blue-300" : "bg-blue-500"}`} />}
                        {!hasCompleted && !hasInProgress && !hasArrived && (
                          <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-[#414E36]/40"}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend Footer */}
            <div className="flex flex-wrap items-center justify-around pt-3 border-t border-[#414E36]/10 text-[10px] text-[#5A6A51] font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t.completedStatus}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{t.inSessionStatus}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>{t.arrivedStatus}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#414E36]/40" />
                <span>{t.upcomingQueueCard}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Selected Date Agenda */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between rounded-3xl bg-white p-4 px-6 border border-[#414E36]/10 shadow-sm">
              <div>
                <h3 className="text-sm font-extrabold text-[#1F251A] flex items-center gap-2">
                  <Clock size={16} className="text-[#414E36]" />
                  {t.dayTimelineHeader} {selectedDateStr}
                </h3>
                <p className="text-[11px] text-[#5A6A51] mt-0.5">
                  {filteredSchedule.length} {t.patientAppointmentsScheduled}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDateStr(todayStr)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[#414E36]/15 bg-[#FBFBF9] text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
              >
                {t.jumpToTodayBtn}
              </button>
            </div>

            {/* Appointments List for Selected Date */}
            {filteredSchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-[#414E36]/20 bg-white p-12 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FBFBF9] text-[#414E36]/40 mb-3 shadow-inner">
                  <CalendarDays size={32} />
                </div>
                <h4 className="text-base font-bold text-[#1F251A]">{t.noAppointmentsFor} {selectedDateStr}</h4>
                <p className="text-xs text-[#5A6A51] max-w-sm mt-1">
                  {t.noAppointmentsDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchedule.map((item, idx) => {
                  const isCompleted = item.status === "completed" || item.status === "done";
                  const isInSession = item.status === "started" || item.status === "in-progress";
                  const isArrived = item.status === "arrived";

                  return (
                    <div
                      key={item.id || idx}
                      className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border p-5 transition-all duration-300 shadow-sm ${
                        isInSession
                          ? "border-amber-300 bg-amber-50/40 ring-2 ring-amber-400/30"
                          : isCompleted
                          ? "border-emerald-200 bg-emerald-50/30"
                          : "border-[#414E36]/10 bg-white hover:border-[#414E36]/30 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center min-w-[75px] rounded-2xl bg-[#F4F5F1] p-2.5 text-center border border-[#414E36]/10 group-hover:border-[#414E36]/30 transition">
                          <Clock size={14} className="text-[#414E36] mb-0.5" />
                          <span className="text-xs font-black text-[#414E36]">
                            {item.time || item.time_slot || item.timeSlot || "09:00 AM"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-[#1F251A]">
                              {item.name || item.customer_name || "Patient"}
                            </h4>

                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 size={11} /> {t.completedStatus}
                              </span>
                            )}
                            {isInSession && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                                <Play size={11} /> {t.inSessionStatus}
                              </span>
                            )}
                            {isArrived && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                                <UserCheck size={11} /> {t.arrivedStatus}
                              </span>
                            )}
                            {!isCompleted && !isInSession && !isArrived && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                                {item.status || "Scheduled"}
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-[#5A6A51] flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#414E36]">{item.service || item.service_name || "Clinical Session"}</span>
                            <span>•</span>
                            <span>{item.room || item.room_name || "Treatment Room"}</span>
                          </p>

                          {item.phone && (
                            <p className="text-[11px] font-mono text-[#5A6A51]">
                              Phone: {item.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        {(item.price || item.total_price || item.amount) && (
                          <span className="text-xs font-extrabold text-[#414E36] bg-[#414E36]/10 px-3 py-1.5 rounded-xl">
                            {item.price || item.total_price || item.amount} EGP
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/20 bg-white px-3.5 py-2 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                        >
                          <Info size={14} /> {t.detailsBtn}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: QUEUE LIST TABLE VIEW */
        <div className="space-y-4 w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-[#414E36]/10 shadow-sm w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDateStr(yesterdayStr)}
                className={`px-4 py-2 text-xs font-bold rounded-2xl transition ${
                  selectedDateStr === yesterdayStr
                    ? "bg-[#414E36] text-white shadow-sm"
                    : "bg-[#F4F5F1] text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                }`}
              >
                {t.yesterdayBtn} ({yesterdayStr})
              </button>

              <button
                type="button"
                onClick={() => setSelectedDateStr(todayStr)}
                className={`px-4 py-2 text-xs font-bold rounded-2xl transition ${
                  selectedDateStr === todayStr
                    ? "bg-[#414E36] text-white shadow-sm"
                    : "bg-[#F4F5F1] text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                }`}
              >
                {t.todayBtn} ({todayStr})
              </button>

              <button
                type="button"
                onClick={() => setSelectedDateStr(tomorrowStr)}
                className={`px-4 py-2 text-xs font-bold rounded-2xl transition ${
                  selectedDateStr === tomorrowStr
                    ? "bg-[#414E36] text-white shadow-sm"
                    : "bg-[#F4F5F1] text-[#5A6A51] hover:bg-[#414E36]/10 hover:text-[#414E36]"
                }`}
              >
                {t.tomorrowBtn} ({tomorrowStr})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5A6A51]">{t.jumpToDateLabel}</span>
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-3.5 py-1.5 text-xs font-bold text-[#414E36] outline-none focus:border-[#414E36]"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-[#414E36]/10 bg-white shadow-[0_20px_50px_rgba(47,61,41,0.05)] w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#414E36]/10 bg-[#FBFBF9] text-xs uppercase tracking-wider text-[#5A6A51]">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t.timeSlotHeader}</th>
                    <th className="px-6 py-4 font-bold">{t.patientNameHeader}</th>
                    <th className="px-6 py-4 font-bold">{t.requestedServiceHeader}</th>
                    <th className="px-6 py-4 font-bold">{t.roomLocationHeader}</th>
                    <th className="px-6 py-4 font-bold text-center">{t.statusHeader}</th>
                    <th className="px-6 py-4 font-bold text-right">{t.actionHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#414E36]/05 text-[#1F251A]">
                  {filteredSchedule.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#5A6A51]">
                        <div className="flex flex-col items-center gap-2">
                          <CalendarDays size={32} className="text-[#414E36]/30" />
                          <p className="font-bold text-sm text-[#1F251A]">{t.noAppointmentsTableTitle} {selectedDateStr}</p>
                          <p className="text-xs text-[#5A6A51]">
                            {t.noAppointmentsTableDesc}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSchedule.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#FBFBF9]/80 transition">
                        <td className="px-6 py-4 font-bold text-[#414E36]">
                          {item.time || item.time_slot || item.timeSlot || "09:00 AM"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-[#1F251A]">
                            {item.name || item.customer_name || "Patient"}
                          </div>
                          {item.phone && <div className="text-[10px] text-[#5A6A51] font-mono">{item.phone}</div>}
                        </td>
                        <td className="px-6 py-4 font-medium text-[#5A6A51]">
                          {item.service || item.service_name || "Consultation"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#414E36]">
                          {item.room || item.room_name || "Treatment Room"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {(item.status === "completed" || item.status === "done") && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          )}
                          {(item.status === "started" || item.status === "in-progress") && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 animate-pulse">
                              <Play size={12} /> In Session
                            </span>
                          )}
                          {item.status === "arrived" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
                              <UserCheck size={12} /> Arrived
                            </span>
                          )}
                          {["pending", "approved", "confirmed"].includes(item.status) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 capitalize">
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenScheduleModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#414E36]/20 bg-white px-3.5 py-1.5 text-xs font-bold text-[#414E36] hover:bg-[#414E36] hover:text-white transition shadow-sm"
                          >
                            <Info size={14} /> Info
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
