"use client";

import { Info } from "lucide-react";
import { adminTranslations } from "@/components/admin/translations";

interface ActiveInfoFeature {
  title: string;
  description: string;
}

interface NotificationSettingsViewProps {
  notifSmsOtp: boolean;
  setNotifSmsOtp: (v: boolean) => void;
  notifWhatsApp: boolean;
  setNotifWhatsApp: (v: boolean) => void;
  notifEmailConfirm: boolean;
  setNotifEmailConfirm: (v: boolean) => void;
  notifSmsTemplate: string;
  setNotifSmsTemplate: (v: string) => void;
  notifSmsTemplateAr: string;
  setNotifSmsTemplateAr: (v: string) => void;
  notifReminderHours: number;
  setNotifReminderHours: (v: number) => void;
  notifStaffEmail: string;
  setNotifStaffEmail: (v: string) => void;
  handleSaveNotificationSettings: () => Promise<void>;
  savingNotificationSettings: boolean;
  setActiveInfoFeature: (f: ActiveInfoFeature) => void;
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["settingsScreens"]["notificationSettings"];
}

export default function NotificationSettingsView({
  notifSmsOtp,
  setNotifSmsOtp,
  notifWhatsApp,
  setNotifWhatsApp,
  notifEmailConfirm,
  setNotifEmailConfirm,
  notifSmsTemplate,
  setNotifSmsTemplate,
  notifSmsTemplateAr,
  setNotifSmsTemplateAr,
  notifReminderHours,
  setNotifReminderHours,
  notifStaffEmail,
  setNotifStaffEmail,
  handleSaveNotificationSettings,
  savingNotificationSettings,
  setActiveInfoFeature,
  lang,
  t,
}: NotificationSettingsViewProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSaveNotificationSettings}
          disabled={savingNotificationSettings}
          className="rounded-3xl bg-[#414E36] px-6 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 shadow-md"
        >
          {savingNotificationSettings ? t.savingBtn : t.saveBtn}
        </button>
      </div>

      <div className="rounded-[40px] bg-white p-8 shadow-[0_30px_80px_rgba(47,61,41,0.07)] max-w-2xl space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={notifSmsOtp} onChange={(e) => setNotifSmsOtp(e.target.checked)} className="accent-[#414E36] w-4 h-4 cursor-pointer" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1F251A]">{t.smsOtp}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoFeature({
                      title: t.smsOtp,
                      description: "When enabled, the system sends a One-Time Password (OTP) via SMS to verify the patient's phone number during login and checkout. This ensures patient profiles are tied to active numbers, preventing spam bookings and database clutter."
                    });
                  }}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <span className="text-xs text-[#5A6A51]">{t.smsOtpHint}</span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={notifWhatsApp} onChange={(e) => setNotifWhatsApp(e.target.checked)} className="accent-[#414E36] w-4 h-4 cursor-pointer" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1F251A]">{t.whatsapp}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoFeature({
                      title: t.whatsapp,
                      description: "When enabled, the system automatically sends booking confirmation messages, reschedule alerts, and timing reminders directly to the patient's WhatsApp number, which has a higher open rate than traditional SMS."
                    });
                  }}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <span className="text-xs text-[#5A6A51]">{t.whatsappHint}</span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={notifEmailConfirm} onChange={(e) => setNotifEmailConfirm(e.target.checked)} className="accent-[#414E36] w-4 h-4 cursor-pointer" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1F251A]">{t.emailConfirm}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoFeature({
                      title: t.emailConfirm,
                      description: "When enabled, the system sends booking receipts and confirmation details to the patient's email address (requires configuring a valid SMTP mail server in the clinic backend)."
                    });
                  }}
                  className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                  title={t.clickForInfo}
                >
                  <Info size={13} />
                </button>
              </div>
              <span className="text-xs text-[#5A6A51]">{t.emailConfirmHint}</span>
            </div>
          </label>
        </div>

        <div className="border-t border-[#F2EFE9] pt-6 space-y-5">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.smsTemplateEn}</label>
              <button
                type="button"
                onClick={() => setActiveInfoFeature({
                  title: t.smsTemplateEn,
                  description: "Configure the English message sent to patients when their booking is approved. You can use dynamic variables like {name} for patient name, {service} for service name, {date} for appointment date, and {time} for slot time."
                })}
                className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                title={t.clickForInfo}
              >
                <Info size={13} />
              </button>
            </div>
            <textarea
              value={notifSmsTemplate}
              onChange={(e) => setNotifSmsTemplate(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition font-mono"
            />
            <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.smsTemplateEnHint} <code>{`{name}`}</code>, <code>{`{service}`}</code>, <code>{`{date}`}</code>, <code>{`{time}`}</code>.</span>
          </div>

          <div>
            <div className="flex items-center justify-end gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setActiveInfoFeature({
                  title: t.smsTemplateAr,
                  description: "قم بتهيئة نص الرسالة باللغة العربية التي تُرسل للمرضى عند تأكيد الحجز. يدعم الحقول المتغيرة مثل {name} لاسم المريض، و {service} لاسم الخدمة، و {date} لتاريخ الموعد، و {time} لوقت الموعد."
                })}
                className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                title={t.clickForInfo}
              >
                <Info size={13} />
              </button>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51] text-right">{t.smsTemplateAr}</label>
            </div>
            <textarea
              value={notifSmsTemplateAr}
              onChange={(e) => setNotifSmsTemplateAr(e.target.value)}
              rows={3}
              dir="rtl"
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition font-mono text-right"
            />
            <span className="text-[11px] text-[#8A9A81] mt-1 block text-right">{t.smsTemplateArHint} <code>{`{name}`}</code>، <code>{`{service}`}</code>، <code>{`{date}`}</code>، <code>{`{time}`}</code>.</span>
          </div>
        </div>

        <div className="border-t border-[#F2EFE9] pt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.reminderTiming}</label>
              <button
                type="button"
                onClick={() => setActiveInfoFeature({
                  title: t.reminderTiming,
                  description: "Set how many hours before the appointment the system should send a reminder notification (via SMS or WhatsApp) to the patient. This dramatically reduces no-show rates."
                })}
                className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                title={t.clickForInfo}
              >
                <Info size={13} />
              </button>
            </div>
            <select
              value={notifReminderHours}
              onChange={(e) => setNotifReminderHours(Number(e.target.value))}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition font-semibold"
            >
              <option value={2}>{t.hoursBefore_2}</option>
              <option value={6}>{t.hoursBefore_6}</option>
              <option value={12}>{t.hoursBefore_12}</option>
              <option value={24}>{t.hoursBefore_24}</option>
              <option value={48}>{t.hoursBefore_48}</option>
            </select>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#5A6A51]">{t.staffEmail}</label>
              <button
                type="button"
                onClick={() => setActiveInfoFeature({
                  title: t.staffEmail,
                  description: "Enter the email address where the clinic should receive a consolidated daily summary of all appointments scheduled for the upcoming day. Perfect for clinic directors or administration leads."
                })}
                className="text-[#5A6A51]/60 hover:text-[#414E36] transition-colors p-0.5 rounded-full hover:bg-[#EDF1EC] flex"
                title={t.clickForInfo}
              >
                <Info size={13} />
              </button>
            </div>
            <input
              type="email"
              value={notifStaffEmail}
              onChange={(e) => setNotifStaffEmail(e.target.value)}
              className="w-full rounded-2xl border border-[#414E36]/15 bg-[#FBFBF9] px-4 py-3 text-sm text-[#1F251A] outline-none focus:border-[#414E36] transition"
            />
            <span className="text-[11px] text-[#8A9A81] mt-1 block">{t.staffEmailHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
