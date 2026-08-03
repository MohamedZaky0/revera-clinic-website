"use client";

export type DoctorTab = "schedule" | "ongoing" | "patients" | "analytics" | "settings" | "profile";

export interface DoctorAccountViewProps {
  doctorDbId?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorBranch?: string;
  branches?: any[];
  initialReservations?: any[];
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

export interface DoctorPatient {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalVisits: number;
  lastVisitDate: string;
  recentServices: string[];
  bookings: any[];
}

export interface AnalyticsData {
  totalRevenue: number;
  completedCount: number;
  confirmedCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalBookings: number;
  avgSessionValue: number;
  completionRate: number;
  topServices: { name: string; count: number; revenue: number }[];
  monthlyTrend: { month: string; revenue: number; count: number }[];
}

export interface UsedProduct {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface ParsedBookingNotes {
  cleanDoctorNote: string;
  instaPayLog: string;
  productsLog: string;
  invoiceLog: string;
  extraLogs: string[];
}
