import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireStaffAccess } from "@/lib/access";
import { getDistanceInMeters, resolveBranchCoordinates } from "@/lib/geo";

const ALLOWED_ROLES = ["receptionist", "hr", "admin", "superadmin"];

/**
 * Reception/HR self-service data: staff must be authenticated, and restricted to the roles that
 * actually work this screen (a doctor token, for instance, must not be able to clock reception
 * staff in/out or read their targets). See RISK-059.
 */
async function requireReceptionAccess(req: Request) {
  const result = await requireStaffAccess(req);
  if ("error" in result) return result;
  if (!ALLOWED_ROLES.includes(result.access.role)) {
    return { error: "Forbidden: Reception or HR access required.", status: 403 as const };
  }
  return result;
}

function formatRelativeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "Recently";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "Recently";
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 0) return "Just now";
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `${mins} min ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  }
  if (diffSec < 172800) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET(req: Request) {
  const auth = await requireReceptionAccess(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get("employeeId");
    const emailParam = searchParams.get("email");

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Resolve Receptionist Employee Account from DB
    let employeeQuery = supabaseServer.from("employee_accounts").select("*");
    if (employeeIdParam) {
      employeeQuery = employeeQuery.eq("id", employeeIdParam);
    } else if (emailParam) {
      employeeQuery = employeeQuery.ilike("email", emailParam);
    } else {
      employeeQuery = employeeQuery.ilike("department", "Reception");
    }

    const { data: employeeData } = await employeeQuery.limit(1);
    const emp = Array.isArray(employeeData) && employeeData.length > 0 ? employeeData[0] : null;

    const receptionistName = emp?.name || emp?.email || "Employee";
    const receptionistRole = emp?.role_name || emp?.department || "Receptionist";
    const empId = emp?.id || null;
    const shiftSchedule = emp?.shift || "—";
    const targetAmount = emp?.required_target_amount !== null && emp?.required_target_amount !== undefined
      ? Number(emp.required_target_amount)
      : 0;

    // 2. Fetch Real Shift & Attendance Data from DB
    let attendanceRecord: any = null;
    if (empId) {
      const { data: att } = await supabaseServer
        .from("hr_attendance")
        .select("*")
        .eq("employee_id", empId)
        .eq("date", todayStr)
        .maybeSingle();
      attendanceRecord = att;
    }

    interface ShiftInterval {
      start: string;
      end?: string | null;
    }

    let intervals: ShiftInterval[] = [];
    if (attendanceRecord?.notes) {
      try {
        const parsed = JSON.parse(attendanceRecord.notes);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.start) {
          intervals = parsed;
        } else if (parsed && Array.isArray(parsed.intervals) && parsed.intervals.length > 0) {
          intervals = parsed.intervals;
        }
      } catch {
        // Plain text notes, ignore JSON parsing
      }
    }

    if (intervals.length === 0 && attendanceRecord?.check_in_time) {
      intervals = [{
        start: attendanceRecord.check_in_time,
        end: attendanceRecord.check_out_time || null
      }];
    }

    let actualStartingTime = "--:--";
    let elapsedTime = "00h 00m";
    let elapsedSeconds = 0;
    let pastSessionsSeconds = 0;
    let currentSessionStart: string | null = null;
    let shiftStatus: "not_started" | "started" | "ended" = "not_started";

    if (attendanceRecord?.check_in_time) {
      // Earliest check-in of the day
      const earliestStart = intervals[0]?.start || attendanceRecord.check_in_time;
      const checkInDate = new Date(earliestStart);
      if (!isNaN(checkInDate.getTime())) {
        actualStartingTime = checkInDate.toLocaleTimeString("en-US", {
          timeZone: "Africa/Cairo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      }

      const isOpen = !attendanceRecord.check_out_time;
      const now = Date.now();

      intervals.forEach((interval) => {
        const sMs = new Date(interval.start).getTime();
        if (isNaN(sMs)) return;

        if (interval.end) {
          const eMs = new Date(interval.end).getTime();
          if (!isNaN(eMs) && eMs >= sMs) {
            const sec = Math.floor((eMs - sMs) / 1000);
            pastSessionsSeconds += sec;
            elapsedSeconds += sec;
          }
        } else if (isOpen) {
          currentSessionStart = interval.start;
          if (now >= sMs) {
            const currentLiveSec = Math.floor((now - sMs) / 1000);
            elapsedSeconds += currentLiveSec;
          }
        }
      });

      const hours = Math.floor(elapsedSeconds / 3600);
      const mins = Math.floor((elapsedSeconds % 3600) / 60);
      const paddedHours = hours.toString().padStart(2, "0");
      const paddedMins = mins.toString().padStart(2, "0");
      elapsedTime = `${paddedHours}h ${paddedMins}m`;

      if (attendanceRecord.check_out_time) {
        shiftStatus = "ended";
      } else {
        shiftStatus = "started";
      }
    }

    // 3. Resolve Branch Information
    let branchNameEn = "New Cairo Branch";
    let branchNameAr = "فرع التجمع الخامس";
    let branchId = emp?.branch_id || null;

    const { data: branchRows } = await supabaseServer
      .from("branches")
      .select("id, name_en, name_ar")
      .limit(10);
    
    if (Array.isArray(branchRows) && branchRows.length > 0) {
      if (branchId) {
        const matchingBranch = branchRows.find((b: any) => b.id === branchId);
        if (matchingBranch) {
          branchNameEn = matchingBranch.name_en || branchNameEn;
          branchNameAr = matchingBranch.name_ar || branchNameAr;
        }
      } else {
        branchNameEn = branchRows[0].name_en || branchNameEn;
        branchNameAr = branchRows[0].name_ar || branchNameAr;
      }
    }

    // 3.5 Compute Real Target & Monthly Performance from DB
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

    let monthlyAchieved = 0;
    let monthResQuery = supabaseServer
      .from("reservations")
      .select("amount_paid, status")
      .gte("date", startOfMonthStr);

    if (empId) {
      monthResQuery = monthResQuery.eq("created_by_employee_id", empId);
    }

    const { data: monthBookings } = await monthResQuery;
    if (Array.isArray(monthBookings) && monthBookings.length > 0) {
      monthlyAchieved = monthBookings.reduce((acc: number, curr: any) => {
        const status = String(curr.status || "").toLowerCase();
        if (status !== "cancelled" && status !== "rejected") {
          return acc + (Number(curr.amount_paid) || 0);
        }
        return acc;
      }, 0);
    }

    const progressPct = targetAmount > 0
      ? Math.min(100, Math.max(0, Math.round((monthlyAchieved / targetAmount) * 100)))
      : (monthlyAchieved > 0 ? 100 : 0);
    const remainingTarget = Math.max(0, targetAmount - monthlyAchieved);

    // 4. Fetch Real Providers (Doctors) for Details & Avatars
    const { data: providersData } = await supabaseServer
      .from("providers")
      .select("id, name, specialty, image");

    const providersMap = new Map<string, any>();
    if (Array.isArray(providersData)) {
      providersData.forEach((p: any) => {
        if (p.id) providersMap.set(String(p.id), p);
        if (p.name) providersMap.set(String(p.name).toLowerCase().trim(), p);
      });
    }

    // 5. Fetch Real Services for title & pricing resolution
    const { data: servicesData } = await supabaseServer
      .from("services")
      .select("id, en, name, ar, title, price");

    const servicesMap = new Map<string, any>();
    if (Array.isArray(servicesData)) {
      servicesData.forEach((s: any) => {
        servicesMap.set(String(s.id), s);
      });
    }

    // 6. Fetch Real Today's Bookings from DB
    const { data: reservationsToday } = await supabaseServer
      .from("reservations")
      .select("*")
      .eq("date", todayStr)
      .order("time_slot", { ascending: true });

    const realTodayBookings = Array.isArray(reservationsToday) ? reservationsToday : [];

    // Helper for formatting time (e.g. 10:00 AM)
    const formatTimeSlot = (timeStr?: string): string => {
      if (!timeStr) return "09:00 AM";
      const trimmed = String(timeStr).trim();
      if (!trimmed) return "09:00 AM";
      if (trimmed.toLowerCase().includes("am") || trimmed.toLowerCase().includes("pm")) {
        return trimmed;
      }
      const startPart = trimmed.split("-")[0].trim();
      const parts = startPart.split(":");
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1].slice(0, 2);
        if (!isNaN(hours)) {
          const period = hours >= 12 ? "PM" : "AM";
          hours = hours % 12 || 12;
          const formattedHours = String(hours).padStart(2, "0");
          return `${formattedHours}:${minutes} ${period}`;
        }
      }
      return trimmed;
    };

    // Calculate Expected Payments from Today's active bookings
    let expectedPaymentsTotal = 0;

    const formattedBookings = realTodayBookings.map((r: any) => {
      let resolvedServiceTitle = r.notes || "General Consultation";
      let basePrice = 0;

      if (r.service_id && servicesMap.has(String(r.service_id))) {
        const s = servicesMap.get(String(r.service_id));
        resolvedServiceTitle = s.en || s.name || s.title || s.ar || `Service #${s.id}`;
        basePrice = Number(s.price || 0);
      } else if (Array.isArray(r.service_ids) && r.service_ids.length > 0) {
        const titles: string[] = [];
        r.service_ids.forEach((id: any) => {
          const s = servicesMap.get(String(id));
          if (s) {
            titles.push(s.en || s.name || s.title || s.ar || `Service #${s.id}`);
            basePrice += Number(s.price || 0);
          }
        });
        if (titles.length > 0) resolvedServiceTitle = titles.join(", ");
      }

      // Doctor details resolution
      let docName = r.doctor_name || "Dr. Unassigned";
      let docSpecialty = "Specialist";
      let docImage: string | null = null;

      const targetProvId = r.provider_id ? String(r.provider_id) : null;
      if (targetProvId && providersMap.has(targetProvId)) {
        const p = providersMap.get(targetProvId);
        docName = p.name || docName;
        docSpecialty = p.specialty || docSpecialty;
        docImage = p.image || null;
      } else if (r.doctor_name && providersMap.has(String(r.doctor_name).toLowerCase().trim())) {
        const p = providersMap.get(String(r.doctor_name).toLowerCase().trim());
        docSpecialty = p.specialty || docSpecialty;
        docImage = p.image || null;
      }

      // Financials for this booking
      const amountPaid = Number(r.amount_paid || 0);
      const amountLeft = r.amount_left !== null && r.amount_left !== undefined ? Number(r.amount_left) : null;
      const effectiveTotal = amountLeft !== null ? (amountPaid + amountLeft) : (basePrice > 0 ? basePrice : amountPaid);

      const statusLower = String(r.status || "confirmed").toLowerCase();
      if (statusLower !== "cancelled" && statusLower !== "rejected") {
        expectedPaymentsTotal += effectiveTotal;
      }

      // Payment Status Badge
      let paymentStatus = "Unpaid";
      if (amountPaid > 0) {
        if (amountLeft === 0 || (amountLeft === null && amountPaid >= basePrice && basePrice > 0)) {
          paymentStatus = "Paid";
        } else if (amountLeft && amountLeft > 0) {
          paymentStatus = "Partial";
        } else {
          paymentStatus = "Paid";
        }
      } else {
        paymentStatus = "Unpaid";
      }

      return {
        id: r.id,
        time: formatTimeSlot(r.time_slot || r.requested_time),
        patientName: r.name || r.patient_name || "Patient",
        patientPhone: r.phone || "—",
        doctorName: docName,
        doctorSpecialty: docSpecialty,
        doctorImage: docImage,
        service: resolvedServiceTitle,
        status: r.status || "confirmed",
        paymentStatus,
        amountPaid,
        amountLeft,
        totalPrice: effectiveTotal,
        raw: r
      };
    });

    // Overview KPIs
    const todayBookingsCount = realTodayBookings.length;
    const pendingApprovalCount = realTodayBookings.filter(
      (r: any) => String(r.status || "").toLowerCase() === "pending" || String(r.status || "").toLowerCase() === "pending_approval"
    ).length;

    // Upcoming confirmations (scheduled in upcoming window or not checked in)
    const upcomingConfirmationsCount = realTodayBookings.filter((r: any) => {
      const st = String(r.status || "").toLowerCase();
      return st === "confirmed" || st === "approved";
    }).length;

    // Performance KPIs (End of Day)
    const completedBookingsCount = realTodayBookings.filter(
      (r: any) => String(r.status || "").toLowerCase() === "completed"
    ).length;
    const cancelledBookingsCount = realTodayBookings.filter(
      (r: any) => String(r.status || "").toLowerCase() === "cancelled" || String(r.status || "").toLowerCase() === "rejected"
    ).length;
    const noShowsCount = realTodayBookings.filter(
      (r: any) => String(r.status || "").toLowerCase() === "no_show"
    ).length;

    // Incomplete / Pending Bookings remaining for today
    const pendingItemsCount = realTodayBookings.filter((r: any) => {
      const st = String(r.status || "").toLowerCase();
      return st !== "completed" && st !== "cancelled" && st !== "rejected" && st !== "no_show";
    }).length;

    // 7. Aggregate Payments Received Today from Real Database Transactions & Payments
    let cashPayments = 0;
    let visaPayments = 0;
    let instapayPayments = 0;
    let walletPayments = 0;

    const startOfTodayIso = `${todayStr}T00:00:00.000Z`;
    const endOfTodayIso = `${todayStr}T23:59:59.999Z`;

    // A) Query transactions table
    const { data: todayTxns } = await supabaseServer
      .from("transactions")
      .select("amount, payment_method, type, status")
      .gte("occurred_at", startOfTodayIso)
      .lte("occurred_at", endOfTodayIso)
      .eq("status", "completed");

    if (Array.isArray(todayTxns) && todayTxns.length > 0) {
      todayTxns.forEach((tx: any) => {
        const amt = Math.max(0, Number(tx.amount || 0));
        const method = String(tx.payment_method || "").toLowerCase();
        if (method === "cash") {
          cashPayments += amt;
        } else if (method === "card" || method === "visa" || method === "credit_card") {
          visaPayments += amt;
        } else if (method === "instapay") {
          instapayPayments += amt;
        } else if (method === "wallet") {
          walletPayments += amt;
        } else {
          cashPayments += amt;
        }
      });
    }

    // B) Query payments table for receipts today
    const { data: todayReceipts } = await supabaseServer
      .from("payments")
      .select("amount, method")
      .gte("received_at", startOfTodayIso)
      .lte("received_at", endOfTodayIso);

    if (Array.isArray(todayReceipts) && todayReceipts.length > 0) {
      // If transactions didn't already capture payments, add distinct payments
      if (!todayTxns || todayTxns.length === 0) {
        todayReceipts.forEach((p: any) => {
          const amt = Math.max(0, Number(p.amount || 0));
          const method = String(p.method || "").toLowerCase();
          if (method === "cash") {
            cashPayments += amt;
          } else if (method === "card" || method === "visa") {
            visaPayments += amt;
          } else if (method === "instapay") {
            instapayPayments += amt;
          } else if (method === "wallet") {
            walletPayments += amt;
          } else {
            cashPayments += amt;
          }
        });
      }
    }

    // C) If no transactions/payments recorded yet, check today's completed reservations amount_paid
    if (cashPayments === 0 && visaPayments === 0 && instapayPayments === 0 && walletPayments === 0) {
      realTodayBookings.forEach((r: any) => {
        const amt = Number(r.amount_paid || 0);
        if (amt > 0) {
          cashPayments += amt;
        }
      });
    }

    const totalPaymentsReceived = cashPayments + visaPayments + instapayPayments + walletPayments;

    // 8. Shift timings and total working hours calculation
    let actualEndingTime = "—";
    if (attendanceRecord?.check_out_time) {
      const checkOutDate = new Date(attendanceRecord.check_out_time);
      if (!isNaN(checkOutDate.getTime())) {
        actualEndingTime = checkOutDate.toLocaleTimeString("en-US", {
          timeZone: "Africa/Cairo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      }
    }

    let totalWorkingHoursFormatted = "0h 0m";
    if (attendanceRecord?.work_hours !== null && attendanceRecord?.work_hours !== undefined) {
      const totalSec = Math.round(Number(attendanceRecord.work_hours) * 3600);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      totalWorkingHoursFormatted = `${h}h ${m}m`;
    } else if (elapsedSeconds > 0) {
      const h = Math.floor(elapsedSeconds / 3600);
      const m = Math.floor((elapsedSeconds % 3600) / 60);
      totalWorkingHoursFormatted = `${h}h ${m}m`;
    }

    // 9. Fetch Real Inventory Products and Equipment Devices for Live Notifications & Alerts
    const notifications: any[] = [];

    try {
      const { data: productsData } = await supabaseServer
        .from("inventory_products")
        .select("id, name, stock_quantity, min_stock_level, expiry_date, unit, updated_at")
        .is("deleted_at", null);

      const products = Array.isArray(productsData) ? productsData : [];
      
      // Check real low stock & expired items
      products.forEach((p: any) => {
        const stock = Number(p.stock_quantity ?? 0);
        const minStock = Number(p.min_stock_level ?? 5);
        if (stock <= minStock) {
          notifications.push({
            id: `alert-low-${p.id}`,
            type: "low_stock",
            title: "Low Stock",
            message: `${p.name} – Only ${stock} ${p.unit || "units"} remaining`,
            time: formatRelativeTime(p.updated_at),
            severity: "danger",
            status: "active",
            targetTab: "Inventory",
            createdAt: p.updated_at || new Date().toISOString()
          });
        }

        if (p.expiry_date) {
          const expDate = new Date(p.expiry_date);
          if (!isNaN(expDate.getTime()) && expDate.getTime() <= Date.now()) {
            const formattedExp = expDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            notifications.push({
              id: `alert-exp-${p.id}`,
              type: "expired_item",
              title: "Expired Item",
              message: `${p.name} expired on ${formattedExp}`,
              time: formatRelativeTime(p.expiry_date || p.updated_at),
              severity: "danger",
              status: "active",
              targetTab: "Inventory",
              createdAt: p.updated_at || new Date().toISOString()
            });
          }
        }
      });

      // Query devices from page_settings
      const { data: devSettings } = await supabaseServer
        .from("page_settings")
        .select("value")
        .eq("key", "inventory_devices")
        .maybeSingle();

      const devices = Array.isArray(devSettings?.value?.devices) ? devSettings.value.devices : [];
      const devHistory = Array.isArray(devSettings?.value?.history) ? devSettings.value.history : [];

      devices.forEach((d: any) => {
        const current = Number(d.current_pulse_count || 0);
        const warn = Number(d.warning_threshold_1 || 80000);
        const maint = Number(d.maintenance_threshold_2 || 100000);

        if (current >= maint || d.status === "Maintenance Overdue") {
          notifications.push({
            id: `alert-maint-overdue-${d.id}`,
            type: "maintenance_overdue",
            title: "Maintenance Overdue",
            message: `${d.name} maintenance is overdue (${current.toLocaleString()} pulses)`,
            time: formatRelativeTime(d.updated_at || d.last_maintenance_date),
            severity: "danger",
            status: "active",
            targetTab: "Inventory",
            createdAt: d.updated_at || new Date().toISOString()
          });
        } else if (current >= warn || d.status === "Maintenance Due" || d.status === "Warning") {
          notifications.push({
            id: `alert-maint-${d.id}`,
            type: "maintenance_due",
            title: "Maintenance Due",
            message: `${d.name} requires maintenance`,
            time: formatRelativeTime(d.updated_at || d.last_maintenance_date),
            severity: "warning",
            status: "active",
            targetTab: "Inventory",
            createdAt: d.updated_at || new Date().toISOString()
          });
        }
      });

      // Recent completed maintenance (strictly from real records)
      devHistory.slice(0, 3).forEach((h: any) => {
        if (h.device_name || h.reason) {
          notifications.push({
            id: `alert-maint-done-${h.id}`,
            type: "maintenance_completed",
            title: "Maintenance Completed",
            message: `${h.device_name || "Equipment"} maintenance completed${h.reason ? ` (${h.reason})` : ""}`,
            time: formatRelativeTime(h.reset_date || h.created_at),
            severity: "success",
            status: "resolved",
            targetTab: "Inventory",
            createdAt: h.created_at || h.reset_date || new Date().toISOString()
          });
        }
      });
    } catch (e) {
      console.warn("Failed to aggregate dynamic alerts:", e);
    }

    // Load GPS shift verification setting
    const { data: pageSettingsRow } = await supabaseServer
      .from("page_settings")
      .select("value")
      .eq("key", "home")
      .maybeSingle();
    const pageSettings = pageSettingsRow?.value || {};
    const gpsShiftEnabled = pageSettings?.inactivity?.enableGpsShift ?? pageSettings?.booking?.enableGpsShift ?? pageSettings?.shift?.gpsShiftEnabled ?? true;

    return NextResponse.json({
      success: true,
      receptionist: {
        id: empId,
        name: receptionistName,
        role: receptionistRole,
        shiftSchedule,
        branchId,
        branchNameEn,
        branchNameAr
      },
      shift: {
        scheduleHours: "8 Hours",
        shiftFromTo: shiftSchedule,
        scheduledStart: "09:00 AM",
        scheduledEnd: "06:00 PM",
        actualStartingTime,
        actualEndingTime,
        elapsedTime,
        elapsedSeconds,
        totalWorkingHours: totalWorkingHoursFormatted,
        pastSessionsSeconds,
        currentSessionStart,
        status: shiftStatus,
        checkInTime: attendanceRecord?.check_in_time || null,
        checkOutTime: attendanceRecord?.check_out_time || null,
        gpsShiftEnabled,
        intervalsCount: intervals.length
      },
      overview: {
        todayBookingsCount,
        pendingApprovalCount,
        upcomingConfirmationsCount,
        expectedPayments: expectedPaymentsTotal
      },
      performance: {
        completedCount: completedBookingsCount,
        cancelledCount: cancelledBookingsCount,
        noShowsCount
      },
      payments: {
        cash: cashPayments,
        visa: visaPayments,
        instapay: instapayPayments,
        wallet: walletPayments,
        totalPayments: totalPaymentsReceived
      },
      pendingItems: {
        pendingBookingsCount: pendingItemsCount,
        pendingApprovalCount
      },
      target: {
        targetAmount,
        achievedAmount: monthlyAchieved,
        progressPercentage: progressPct,
        remainingAmount: remainingTarget
      },
      bookings: {
        todayCount: todayBookingsCount,
        pendingCount: pendingApprovalCount,
        list: formattedBookings
      },
      notifications
    });
  } catch (error: any) {
    console.error("Reception Dashboard API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch reception dashboard data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireReceptionAccess(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { action, employeeId, latitude, longitude, accuracy } = body;

    if (!action || (action !== "start_shift" && action !== "end_shift")) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'start_shift' or 'end_shift'." },
        { status: 400 }
      );
    }

    const role = auth.access.role;
    let empId: string | null = auth.access.employee.id;
    if (role !== "receptionist" && employeeId) {
      empId = employeeId;
    }

    if (!empId) {
      return NextResponse.json(
        { success: false, error: "Employee account not found." },
        { status: 404 }
      );
    }

    // Fetch employee details to check role and branch assignment
    const { data: employeeRecord } = await supabaseServer
      .from("employee_accounts")
      .select("id, branch_id, role_name")
      .eq("id", empId)
      .maybeSingle();

    const isSuperadmin = (employeeRecord?.role_name || role || "").toLowerCase() === "superadmin";

    const todayStr = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    if (action === "start_shift") {
      const { data: existing, error: fetchError } = await supabaseServer
        .from("hr_attendance")
        .select("*")
        .eq("employee_id", empId)
        .eq("date", todayStr)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If already started and currently open:
      if (existing?.check_in_time && !existing.check_out_time) {
        return NextResponse.json({ success: true, action: "start_shift", attendance: existing });
      }

      // Check if GPS shift verification is enabled in page_settings
      const { data: psRow } = await supabaseServer
        .from("page_settings")
        .select("value")
        .eq("key", "home")
        .maybeSingle();
      const psVal = psRow?.value || {};
      const gpsShiftEnabled = psVal?.inactivity?.enableGpsShift ?? psVal?.booking?.enableGpsShift ?? psVal?.shift?.gpsShiftEnabled ?? true;

      let parsedLat: number | null = null;
      let parsedLng: number | null = null;

      // When GPS shift check is enabled and not superadmin without branch:
      if (gpsShiftEnabled && (!isSuperadmin || employeeRecord?.branch_id)) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          return NextResponse.json(
            { success: false, error: "location_permission_denied", message: "Location permission is required to start your shift." },
            { status: 400 }
          );
        }

        parsedLat = Number(latitude);
        parsedLng = Number(longitude);

        if (
          !Number.isFinite(parsedLat) ||
          !Number.isFinite(parsedLng) ||
          parsedLat < -90 ||
          parsedLat > 90 ||
          parsedLng < -180 ||
          parsedLng > 180
        ) {
          return NextResponse.json(
            { success: false, error: "invalid_coordinates", message: "Location permission is required to start your shift." },
            { status: 400 }
          );
        }

        // Fetch clinic branch(es) to check distance
        let branchesQuery = supabaseServer.from("branches").select("id, name_en, name_ar, latitude, longitude, maps_embed, maps_link");
        if (employeeRecord?.branch_id) {
          branchesQuery = branchesQuery.eq("id", employeeRecord.branch_id);
        }

        const { data: branchRows } = await branchesQuery;
        const validBranches = Array.isArray(branchRows) && branchRows.length > 0 ? branchRows : [];

        // Also fetch all active branches for fallback proximity check
        const { data: allBranches } = await supabaseServer
          .from("branches")
          .select("id, name_en, name_ar, latitude, longitude, maps_embed, maps_link");
        const candidateBranches = validBranches.length > 0 ? validBranches : (Array.isArray(allBranches) ? allBranches : []);
        const fallbackCheckBranches = Array.isArray(allBranches) && allBranches.length > 0 ? allBranches : candidateBranches;

        let isInsideLocation = false;
        let minimumDistance = Infinity;

        // Check primary candidate branches first
        for (const branch of candidateBranches) {
          const coords = await resolveBranchCoordinates(branch);
          if (coords) {
            const dist = getDistanceInMeters(parsedLat, parsedLng, coords.latitude, coords.longitude);
            if (dist < minimumDistance) minimumDistance = dist;
            if (dist <= 1000) { // 1000m tolerance for urban & building GPS drift
              isInsideLocation = true;
              break;
            }
          }
        }

        // If not in primary candidate branch, check across all active clinic branches
        if (!isInsideLocation && fallbackCheckBranches.length > 0) {
          for (const branch of fallbackCheckBranches) {
            const coords = await resolveBranchCoordinates(branch);
            if (coords) {
              const dist = getDistanceInMeters(parsedLat, parsedLng, coords.latitude, coords.longitude);
              if (dist < minimumDistance) minimumDistance = dist;
              if (dist <= 1000) {
                isInsideLocation = true;
                break;
              }
            }
          }
        }

        // If clinic branches exist and employee is outside allowed working location:
        if (candidateBranches.length > 0 && !isInsideLocation) {
          return NextResponse.json(
            {
              success: false,
              error: "out_of_location",
              message: "You must be in a working location to start your shift."
            },
            { status: 400 }
          );
        }
      } else if (!gpsShiftEnabled) {
        // When GPS check is disabled in settings, parse coordinates if supplied, but do not block
        if (latitude !== undefined && longitude !== undefined && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
          parsedLat = Number(latitude);
          parsedLng = Number(longitude);
        }
      }

      let intervals: { start: string; end?: string | null }[] = [];

      // If restarting / opening another shift today
      if (existing) {
        if (existing.notes) {
          try {
            const parsed = JSON.parse(existing.notes);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.start) {
              intervals = parsed;
            } else if (parsed && Array.isArray(parsed.intervals)) {
              intervals = parsed.intervals;
            }
          } catch {}
        }
        if (intervals.length === 0 && existing.check_in_time) {
          intervals = [{
            start: existing.check_in_time,
            end: existing.check_out_time || null
          }];
        }
        // If last interval was open, close it at nowIso before appending
        if (intervals.length > 0 && !intervals[intervals.length - 1].end) {
          intervals[intervals.length - 1].end = nowIso;
        }
        intervals.push({ start: nowIso, end: null });

        const { data, error } = await supabaseServer
          .from("hr_attendance")
          .update({
            check_out_time: null,
            notes: JSON.stringify(intervals),
            latitude: parsedLat ?? existing.latitude,
            longitude: parsedLng ?? existing.longitude,
            status: "Present"
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, action: "start_shift", attendance: data });
      }

      // First shift of the day
      intervals = [{ start: nowIso, end: null }];

      const { data, error } = await supabaseServer
        .from("hr_attendance")
        .upsert(
          {
            employee_id: empId,
            date: todayStr,
            check_in_time: nowIso,
            check_out_time: null,
            notes: JSON.stringify(intervals),
            latitude: parsedLat,
            longitude: parsedLng,
            status: "Present",
            work_hours: 0
          },
          { onConflict: "employee_id,date" }
        )
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, action: "start_shift", attendance: data });
    } else {
      const { data: existing, error: fetchError } = await supabaseServer
        .from("hr_attendance")
        .select("*")
        .eq("employee_id", empId)
        .eq("date", todayStr)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing?.check_in_time) {
        return NextResponse.json(
          { success: false, error: "No open shift found for today. Start a shift before ending it." },
          { status: 404 }
        );
      }
      if (existing.check_out_time) {
        return NextResponse.json({ success: true, action: "end_shift", attendance: existing });
      }

      let intervals: { start: string; end?: string | null }[] = [];
      if (existing.notes) {
        try {
          const parsed = JSON.parse(existing.notes);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.start) {
            intervals = parsed;
          } else if (parsed && Array.isArray(parsed.intervals)) {
            intervals = parsed.intervals;
          }
        } catch {}
      }

      if (intervals.length === 0) {
        intervals = [{ start: existing.check_in_time, end: nowIso }];
      } else {
        let foundOpen = false;
        for (let idx = intervals.length - 1; idx >= 0; idx--) {
          if (!intervals[idx].end) {
            intervals[idx].end = nowIso;
            foundOpen = true;
            break;
          }
        }
        if (!foundOpen) {
          intervals.push({ start: existing.check_in_time, end: nowIso });
        }
      }

      // Calculate total work hours across all intervals
      let totalSecondsWorked = 0;
      intervals.forEach((inv) => {
        if (inv.start && inv.end) {
          const s = new Date(inv.start).getTime();
          const e = new Date(inv.end).getTime();
          if (!isNaN(s) && !isNaN(e) && e >= s) {
            totalSecondsWorked += Math.floor((e - s) / 1000);
          }
        }
      });
      const totalWorkHours = Number((totalSecondsWorked / 3600).toFixed(2));

      const { data, error } = await supabaseServer
        .from("hr_attendance")
        .update({
          check_out_time: nowIso,
          notes: JSON.stringify(intervals),
          work_hours: totalWorkHours
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, action: "end_shift", attendance: data });
    }
  } catch (error: any) {
    console.error("Reception Shift Action Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process shift action" },
      { status: 500 }
    );
  }
}
