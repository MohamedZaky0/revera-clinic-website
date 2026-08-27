import { supabase } from "@/lib/supabaseClient";

export const parseBookingNotes = (rawNotes: string) => {
  if (!rawNotes) {
    return {
      cleanDoctorNote: "",
      instaPayLog: "",
      productsLog: "",
      invoiceLog: "",
      extraLogs: [] as string[],
    };
  }

  let notesText = rawNotes;
  let instaPayLog = "";
  let productsLog = "";
  let invoiceLog = "";
  const extraLogs: string[] = [];

  // 1. Extract InstaPay Info log
  const instaMatch = notesText.match(/\[InstaPay Sent From:[^\]]+\]/i);
  if (instaMatch) {
    instaPayLog = instaMatch[0];
    notesText = notesText.replace(instaMatch[0], "");
  }

  // 2. Extract Products Used log
  const prodMatch = notesText.match(/\[Products Used During Session\]:[\s\S]*?(?=\n\[|\n$|$)/i);
  if (prodMatch) {
    productsLog = prodMatch[0];
    notesText = notesText.replace(prodMatch[0], "");
  }

  // 3. Extract Invoice Total log
  const invMatch = notesText.match(/\[Invoice Total Updated\]:[^\n]+/i);
  if (invMatch) {
    invoiceLog = invMatch[0];
    notesText = notesText.replace(invMatch[0], "");
  }

  // 4. Extract Extra Device Pulses log
  const pulseMatch = notesText.match(/\[Extra Device Pulses\]:[^\n]+/i);
  if (pulseMatch) {
    extraLogs.push(pulseMatch[0]);
    notesText = notesText.replace(pulseMatch[0], "");
  }

  const cleanDoctorNote = notesText.trim();
  return { cleanDoctorNote, instaPayLog, productsLog, invoiceLog, extraLogs };
};

// Single source of truth for the doctor active/inactive status color — three screens
// (AdminDoctorsView, DoctorProfileDetailsView, ProviderFormFields) previously each hardcoded
// their own className strings and had drifted (green vs emerald).
export const getDoctorStatusBadgeClass = (active: boolean) =>
  active
    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
    : "bg-red-50 text-red-700 border-red-200/60";

export const getDoctorStatusDotClass = (active: boolean) =>
  active ? "bg-emerald-500" : "bg-red-500";

export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};
