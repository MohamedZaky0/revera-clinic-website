import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get("employeeId");
    const emailParam = searchParams.get("email");

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Resolve Receptionist Employee Account from DB
    let employeeQuery = supabase.from("employee_accounts").select("*");
    if (employeeIdParam) {
      employeeQuery = employeeQuery.eq("id", employeeIdParam);
    } else if (emailParam) {
      employeeQuery = employeeQuery.ilike("email", emailParam);
    } else {
      employeeQuery = employeeQuery.ilike("department", "Reception");
    }

    const { data: employeeData } = await employeeQuery.limit(1);
    const emp = Array.isArray(employeeData) && employeeData.length > 0 ? employeeData[0] : null;

    const receptionistName = emp?.name || emp?.email || "Receptionist";
    const receptionistRole = emp?.role_name || emp?.department || "Receptionist";
    const empId = emp?.id || null;
    const shiftSchedule = emp?.shift || "09:00 AM – 05:00 PM";
    const targetAmount = emp?.required_target_amount !== null && emp?.required_target_amount !== undefined
      ? Number(emp.required_target_amount)
      : 0;

    // 2. Fetch Real Shift & Attendance Data from DB
    let attendanceRecord: any = null;
    if (empId) {
      const { data: att } = await supabase
        .from("hr_attendance")
        .select("*")
        .eq("employee_id", empId)
        .eq("date", todayStr)
        .maybeSingle();
      attendanceRecord = att;
    }

    let actualStartingTime = "--:--";
    let elapsedTime = "0h 0m";
    let elapsedSeconds = 0;
    let shiftStatus: "not_started" | "started" | "ended" = "not_started";

    if (attendanceRecord?.check_in_time) {
      const checkInDate = new Date(attendanceRecord.check_in_time);
      actualStartingTime = checkInDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });

      const endDate = attendanceRecord.check_out_time
        ? new Date(attendanceRecord.check_out_time)
        : new Date();

      elapsedSeconds = Math.max(0, Math.floor((endDate.getTime() - checkInDate.getTime()) / 1000));
      const hours = Math.floor(elapsedSeconds / 3600);
      const mins = Math.floor((elapsedSeconds % 3600) / 60);
      elapsedTime = `${hours}h ${mins}m`;

      if (attendanceRecord.check_out_time) {
        shiftStatus = "ended";
      } else {
        shiftStatus = "started";
      }
    }

    // 3. Compute Real Target & Monthly Performance from DB
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

    let monthlyAchieved = 0;
    let monthResQuery = supabase
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

    // 4. Fetch Real Services for title resolution
    const { data: servicesData } = await supabase
      .from("services")
      .select("id, en, name, ar, title");

    const servicesMap = new Map<string, string>();
    if (Array.isArray(servicesData)) {
      servicesData.forEach((s: any) => {
        const title = s.en || s.name || s.title || s.ar || `Service #${s.id}`;
        servicesMap.set(String(s.id), title);
      });
    }

    // 5. Fetch Real Today's Bookings from DB
    const { data: reservationsToday } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", todayStr)
      .order("created_at", { ascending: true });

    const realTodayBookings = Array.isArray(reservationsToday) ? reservationsToday : [];

    const todayBookingsCount = realTodayBookings.length;
    const pendingApprovalCount = realTodayBookings.filter(
      (r: any) => String(r.status || "").toLowerCase() === "pending" || String(r.status || "").toLowerCase() === "pending_approval"
    ).length;

    const formattedBookings = realTodayBookings.map((r: any) => {
      let resolvedServiceTitle = r.notes || "General Service";
      if (r.service_id && servicesMap.has(String(r.service_id))) {
        resolvedServiceTitle = servicesMap.get(String(r.service_id))!;
      } else if (Array.isArray(r.service_ids) && r.service_ids.length > 0) {
        const titles = r.service_ids
          .map((id: any) => servicesMap.get(String(id)))
          .filter(Boolean);
        if (titles.length > 0) resolvedServiceTitle = titles.join(", ");
      }

      return {
        id: r.id,
        time: r.time_slot || r.requested_time || "--:--",
        patientName: r.name || r.patient_name || "Patient",
        doctorName: r.doctor_name || "Unassigned",
        service: resolvedServiceTitle,
        status: r.status || "confirmed"
      };
    });

    return NextResponse.json({
      success: true,
      receptionist: {
        id: empId,
        name: receptionistName,
        role: receptionistRole,
        shiftSchedule
      },
      shift: {
        scheduleHours: "8 Hours",
        shiftFromTo: shiftSchedule,
        actualStartingTime,
        elapsedTime,
        elapsedSeconds,
        status: shiftStatus,
        checkInTime: attendanceRecord?.check_in_time || null,
        checkOutTime: attendanceRecord?.check_out_time || null
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
      }
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
  try {
    const body = await req.json();
    const { action, employeeId, email } = body;

    if (!action || (action !== "start_shift" && action !== "end_shift")) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'start_shift' or 'end_shift'." },
        { status: 400 }
      );
    }

    // Resolve employee account
    let empId = employeeId;
    if (!empId) {
      let query = supabase.from("employee_accounts").select("id");
      if (email) query = query.ilike("email", email);
      else query = query.ilike("department", "Reception");
      const { data } = await query.limit(1);
      if (Array.isArray(data) && data.length > 0) empId = data[0].id;
    }

    if (!empId) {
      return NextResponse.json(
        { success: false, error: "Employee account not found." },
        { status: 404 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    if (action === "start_shift") {
      const { data, error } = await supabase
        .from("hr_attendance")
        .upsert(
          {
            employee_id: empId,
            date: todayStr,
            check_in_time: nowIso,
            check_out_time: null,
            status: "Present"
          },
          { onConflict: "employee_id,date" }
        )
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, action: "start_shift", attendance: data });
    } else {
      const { data, error } = await supabase
        .from("hr_attendance")
        .update({ check_out_time: nowIso })
        .eq("employee_id", empId)
        .eq("date", todayStr)
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
