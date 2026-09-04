"use client";

import React from "react";
import {
  Sparkles,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  FileSpreadsheet
} from "lucide-react";
import { AnalyticsData, DoctorPatient } from "../types";

interface DoctorAnalyticsTabProps {
  analyticsData: AnalyticsData;
  doctorPatientsList: DoctorPatient[];
  reservations: any[];
  t: any;
}

export default function DoctorAnalyticsTab({
  analyticsData,
  doctorPatientsList,
  reservations,
  t
}: DoctorAnalyticsTabProps) {
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F251A]">{t.analyticsTitle}</h2>
          <p className="text-xs text-[#5A6A51] mt-1">
            {t.analyticsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2 text-xs font-bold text-[#414E36] shadow-sm flex items-center gap-2">
            <Sparkles size={14} className="text-[#C4AE7C]" />
            <span>{t.realtimeDoctorLedger}</span>
          </span>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="rounded-3xl border border-[#414E36]/12 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5A6A51]">{t.totalRevenue}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1F251A]">
              {analyticsData.totalRevenue.toLocaleString()} <span className="text-xs font-bold text-[#5A6A51]">EGP</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <ArrowUpRight size={13} />
              <span>{t.fromCompletedSessions} ({analyticsData.completedCount})</span>
            </p>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="rounded-3xl border border-[#414E36]/12 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5A6A51]">{t.completedSessions}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#414E36]/10 text-[#414E36]">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1F251A]">{analyticsData.completedCount}</p>
            <p className="text-[11px] text-[#5A6A51] font-semibold mt-1">
              {t.completionRateLabel}: {analyticsData.completionRate}% ({analyticsData.totalBookings})
            </p>
          </div>
        </div>

        {/* Average Session Value */}
        <div className="rounded-3xl border border-[#414E36]/12 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5A6A51]">{t.avgSessionValue}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1F251A]">
              {analyticsData.avgSessionValue.toLocaleString()} <span className="text-xs font-bold text-[#5A6A51]">EGP</span>
            </p>
            <p className="text-[11px] text-[#5A6A51] font-semibold mt-1">
              {t.avgRevenuePerSession}
            </p>
          </div>
        </div>

        {/* Active Unique Patients */}
        <div className="rounded-3xl border border-[#414E36]/12 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5A6A51]">{t.uniquePatients}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Users size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1F251A]">{doctorPatientsList.length}</p>
            <p className="text-[11px] text-[#5A6A51] font-semibold mt-1">
              {t.patientsTreatedUnderCare}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Top Services & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Revenue Services */}
        <div className="lg:col-span-2 rounded-3xl border border-[#414E36]/12 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1F251A] flex items-center gap-2">
                <BarChart3 size={18} className="text-[#414E36]" /> {t.topRevenueServices}
              </h3>
              <p className="text-xs text-[#5A6A51] mt-0.5">{t.topServicesSubtitle}</p>
            </div>
          </div>

          {analyticsData.topServices.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5A6A51]">{t.noCompletedServiceData}</div>
          ) : (
            <div className="space-y-4">
              {analyticsData.topServices.slice(0, 5).map((srv, idx) => {
                const pct = analyticsData.totalRevenue > 0 ? Math.round((srv.revenue / analyticsData.totalRevenue) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F251A]">{srv.name}</span>
                      <span className="font-black text-[#414E36]">
                        {srv.revenue.toLocaleString()} EGP <span className="text-[10px] text-[#5A6A51] font-normal">({srv.count} {t.sessionsUnit})</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#F4F5F1] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#414E36] transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Session Status Distribution */}
        <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 shadow-sm space-y-5">
          <div className="border-b border-[#414E36]/10 pb-4">
            <h3 className="text-base font-bold text-[#1F251A] flex items-center gap-2">
              <Activity size={18} className="text-[#414E36]" /> {t.bookingDistribution}
            </h3>
            <p className="text-xs text-[#5A6A51] mt-0.5">{t.bookingDistributionSubtitle}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> {t.completedStatus}
              </span>
              <span className="text-sm font-black text-emerald-900">{analyticsData.completedCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/70 border border-sky-100">
              <span className="text-xs font-bold text-sky-800 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span> {t.confirmedAndStarted}
              </span>
              <span className="text-sm font-black text-sky-900">{analyticsData.confirmedCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> {t.pendingApproval}
              </span>
              <span className="text-sm font-black text-amber-900">{analyticsData.pendingCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> {t.cancelledNoShow}
              </span>
              <span className="text-sm font-black text-rose-900">{analyticsData.cancelledCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Session Ledger Table */}
      <div className="rounded-3xl border border-[#414E36]/12 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#1F251A] flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[#414E36]" /> {t.financialSessionsLedger}
            </h3>
            <p className="text-xs text-[#5A6A51] mt-0.5">{t.financialLedgerSubtitle}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1F251A]">
            <thead className="bg-[#F9F9F7] text-[10px] uppercase tracking-wider font-extrabold text-[#5A6A51] border-b border-[#414E36]/10">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">{t.dateHeader}</th>
                <th className="py-3 px-4">{t.patientNameHeader}</th>
                <th className="py-3 px-4">{t.requestedServiceHeader}</th>
                <th className="py-3 px-4">{t.paymentHeader}</th>
                <th className="py-3 px-4 rounded-r-xl text-right">{t.revenueHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#414E36]/10">
              {reservations.filter(r => r.status === "completed").length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5A6A51]">
                    {t.noCompletedSessionsRecorded}
                  </td>
                </tr>
              ) : (
                reservations.filter(r => r.status === "completed").map((r, idx) => {
                  const price = Number(r.total_price || r.amount || r.price || 0);
                  return (
                    <tr key={r.id || idx} className="hover:bg-[#F9F9F7] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#5A6A51]">{r.date || "N/A"}</td>
                      <td className="py-3 px-4 font-bold text-[#1F251A]">{r.name || r.customer_name || "Patient"}</td>
                      <td className="py-3 px-4 text-[#414E36] font-semibold">{r.service_name || r.service || "Clinical Session"}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-lg bg-[#414E36]/10 px-2 py-0.5 text-[10px] font-bold text-[#414E36]">
                          {r.payment_method || "Paid"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#1F251A]">
                        {price.toLocaleString()} EGP
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
