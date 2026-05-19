import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";
import { sameBranch } from "@/lib/address";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatCost(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "";
  return num.toFixed(2);
}

// Shared 17-column layout for the four JO-status reports (A-D in spec #14).
// Mirrors the client's reference "Service Job Order" CSV. Machining /
// Calibration and Running Hours have no source column on
// job_order_request_form today — left blank in the output. They can be
// backfilled once those fields exist on the JO record.
const JO_REPORT_HEADERS: string[] = [
  "Job Order",
  "Charges Absorbed By",
  "Date Opened",
  "Date Closed",
  "Customer",
  "Equipment",
  "Engine / Serial No.",
  "Work Description",
  "Quotation No.",
  "Labor Charge",
  "Parts",
  "Machining / Calibration",
  "Other Expenses",
  "Total (VAT Inclusive)",
  "Running Hours",
  "Remarks",
  "Attending Technician",
];

function buildJoReportRow(r: any): string[] {
  return [
    r.shop_field_jo_number || "",
    r.charges_absorbed_by || "",
    formatDate(r.date_prepared),
    formatDate(r.date_job_completed_closed),
    r.full_customer_name || "",
    r.equipment_model || "",
    [r.engine_model, r.esn].filter(Boolean).join(" / "),
    [r.complaints, r.work_to_be_done].filter(Boolean).join(" - "),
    r.qtn_ref || "",
    formatCost(r.labor_cost),
    formatCost(r.parts_cost),
    "", // Machining / Calibration — no JO column today.
    formatCost(r.other_cost),
    formatCost(r.total_cost),
    "", // Running Hours — only lives on deutz_service_report.
    r.remarks || "",
    r.technicians_involved || "",
  ];
}

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check
    const allowed = await hasPermission(supabase, user.id, "reports", "access");
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to access reports" },
        { status: 403 }
      );
    }

    // Get user data for branch filtering
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("address, position_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Check if user has branch-scoped reports permission
    let filterByBranch = false;
    if (userData.position_id) {
      const { data: permScope } = await supabase
        .from("position_permissions")
        .select("scope, permissions!inner(module, action)")
        .eq("position_id", userData.position_id)
        .eq("permissions.module", "reports")
        .eq("permissions.action", "access")
        .maybeSingle();

      if (permScope?.scope === "branch") {
        filterByBranch = true;
      }
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const statusParam = searchParams.get("status"); // comma-separated
    const engineModel = searchParams.get("engineModel");
    const serialNumber = searchParams.get("serialNumber");

    if (!reportType) {
      return NextResponse.json(
        { success: false, message: "reportType is required" },
        { status: 400 }
      );
    }

    // Report-type contract (per the new spec, item 14):
    //   pending-jo        → job_order_request_form WHERE status='Pending'
    //   work-in-progress  → job_order_request_form WHERE status='In-Progress'
    //   cancelled-jo      → job_order_request_form WHERE status='Cancelled'
    //   closed-jo         → job_order_request_form WHERE status='Close'
    //   engine            → deutz_service_report (optionally filtered by
    //                       engine_model / engine_serial_no / date range)
    //
    // Legacy aliases (still accepted so older bookmarks / clients keep
    // working): generated → pending-jo, status → closed-jo, wip →
    // work-in-progress, cancelled → cancelled-jo. The `manhour` report is
    // retained as-is — the spec changed JO reports only.
    const validTypes = [
      "pending-jo",
      "work-in-progress",
      "cancelled-jo",
      "closed-jo",
      "engine",
      "manhour",
      // legacy aliases
      "generated",
      "status",
      "wip",
      "cancelled",
    ];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { success: false, message: `Invalid reportType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Helper: filter records by branch (creator's address must match user's address)
    async function applyBranchFilter(records: any[]): Promise<any[]> {
      if (!filterByBranch || !userData?.address || records.length === 0) return records;

      const creatorIds = [...new Set(records.map((r: any) => r.created_by).filter(Boolean))];
      if (creatorIds.length === 0) return records;

      const { data: creators } = await supabase
        .from("users")
        .select("id, address")
        .in("id", creatorIds);

      const creatorAddressMap = new Map((creators || []).map((u: any) => [u.id, u.address]));
      return records.filter((r: any) => sameBranch(creatorAddressMap.get(r.created_by), userData.address));
    }

    // Build query
    let query = supabase
      .from("job_order_request_form")
      .select("*")
      .is("deleted_at", null);

    let csv = "";
    let filename = "";

    // ---------------------------------------------------------------
    // Pending Job Orders — JO with status='Pending'
    // ---------------------------------------------------------------
    if (reportType === "pending-jo") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required" },
          { status: 400 }
        );
      }
      query = query
        .gte("date_prepared", startDate)
        .lte("date_prepared", endDate)
        .eq("status", "Pending")
        .order("date_prepared", { ascending: true });

      const { data: rawData, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      const data = await applyBranchFilter(rawData || []);
      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No pending job orders found for the selected date range" },
          { status: 404 }
        );
      }

      csv = buildCsv(JO_REPORT_HEADERS, data.map(buildJoReportRow));
      filename = `pending_job_orders_${startDate}_to_${endDate}.csv`;

    // ---------------------------------------------------------------
    // Work In Progress — JO with status='In-Progress'
    // ---------------------------------------------------------------
    } else if (reportType === "work-in-progress" || reportType === "wip") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required" },
          { status: 400 }
        );
      }
      query = query
        .gte("date_prepared", startDate)
        .lte("date_prepared", endDate)
        .eq("status", "In-Progress")
        .order("date_prepared", { ascending: true });

      const { data: rawData, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      const data = await applyBranchFilter(rawData || []);
      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No in-progress job orders found for the selected date range" },
          { status: 404 }
        );
      }

      csv = buildCsv(JO_REPORT_HEADERS, data.map(buildJoReportRow));
      filename = `work_in_progress_${startDate}_to_${endDate}.csv`;

    // ---------------------------------------------------------------
    // Cancelled Job Orders — JO with status='Cancelled'
    // ---------------------------------------------------------------
    } else if (reportType === "cancelled-jo" || reportType === "cancelled") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required" },
          { status: 400 }
        );
      }
      query = query
        .gte("date_prepared", startDate)
        .lte("date_prepared", endDate)
        .eq("status", "Cancelled")
        .order("date_prepared", { ascending: true });

      const { data: rawData, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      const data = await applyBranchFilter(rawData || []);
      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No cancelled job orders found for the selected date range" },
          { status: 404 }
        );
      }

      csv = buildCsv(JO_REPORT_HEADERS, data.map(buildJoReportRow));
      filename = `cancelled_job_orders_${startDate}_to_${endDate}.csv`;

    // ---------------------------------------------------------------
    // Closed Job Orders — JO with status='Close' (with cost breakdown)
    // ---------------------------------------------------------------
    } else if (reportType === "closed-jo" || reportType === "status") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required" },
          { status: 400 }
        );
      }
      query = query
        .gte("date_job_completed_closed", startDate)
        .lte("date_job_completed_closed", endDate)
        .eq("status", "Close")
        .order("date_prepared", { ascending: true });

      const { data: rawData, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      const data = await applyBranchFilter(rawData || []);
      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No closed job orders found for the selected date range" },
          { status: 404 }
        );
      }

      csv = buildCsv(JO_REPORT_HEADERS, data.map(buildJoReportRow));
      filename = `closed_job_orders_${startDate}_to_${endDate}.csv`;

    // ---------------------------------------------------------------
    // Legacy alias: "generated" → behave like the old all-status report
    // (kept so existing bookmarks keep working).
    // ---------------------------------------------------------------
    } else if (reportType === "generated") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required for this report type" },
          { status: 400 }
        );
      }
      query = query.gte("date_prepared", startDate).lte("date_prepared", endDate);
      if (statusParam) {
        const statuses = statusParam.split(",").map((s) => s.trim());
        query = query.in("status", statuses);
      }
      query = query.order("date_prepared", { ascending: true });

      const { data: rawData, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      const data = await applyBranchFilter(rawData || []);

      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No job orders found for the selected date range and status" },
          { status: 404 }
        );
      }

      const headers = [
        "J.O. NO.",
        "DATE OPEN",
        "CUSTOMER",
        "JOB DESCRIPTION",
        "ENGINE/EQPMT MODEL",
        "SERIAL NUMBER",
      ];
      const rows = data.map((r: any) => [
        r.shop_field_jo_number || "",
        formatDate(r.date_prepared),
        r.full_customer_name || "",
        [r.complaints, r.work_to_be_done].filter(Boolean).join(" - "),
        [r.engine_model, r.equipment_model].filter(Boolean).join(" / "),
        r.esn || "",
      ]);
      csv = buildCsv(headers, rows);
      filename = `job_orders_generated_${startDate}_to_${endDate}.csv`;

    // ---------------------------------------------------------------
    // Engine Report — pulled from deutz_service_report, not from
    // job_order_request_form. Spec-listed columns: JO number, Customer,
    // Equipment/Model, Engine/Serial Number, Running Hours, Findings,
    // Recommendation.
    //
    // Filters (all optional, at least one must be supplied by the page):
    //   engineModel    → ilike on deutz_service_report.engine_model
    //   serialNumber   → ilike on engine_serial_no OR equipment_serial_no
    //   startDate/end  → report_date range
    // ---------------------------------------------------------------
    } else if (reportType === "engine") {
      if (!engineModel && !serialNumber && !(startDate && endDate)) {
        return NextResponse.json(
          { success: false, message: "Provide an engine model, serial number, or date range" },
          { status: 400 }
        );
      }

      let engineQuery = supabase
        .from("deutz_service_report")
        .select(
          "job_order, customer_name, equipment_model, engine_model, engine_serial_no, equipment_serial_no, running_hours, findings, recommendations, report_date, created_by",
        )
        .is("deleted_at", null);

      if (engineModel) {
        engineQuery = engineQuery.ilike("engine_model", `%${engineModel}%`);
      }
      if (serialNumber) {
        engineQuery = engineQuery.or(
          `engine_serial_no.ilike.%${serialNumber}%,equipment_serial_no.ilike.%${serialNumber}%`,
        );
      }
      if (startDate) engineQuery = engineQuery.gte("report_date", startDate);
      if (endDate) engineQuery = engineQuery.lte("report_date", endDate);
      engineQuery = engineQuery.order("report_date", { ascending: true });

      const { data: rawData, error } = await engineQuery;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      const data = await applyBranchFilter(rawData || []);

      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No service reports found for the selected filters" },
          { status: 404 }
        );
      }

      const headers = [
        "JO NUMBER",
        "CUSTOMER",
        "EQUIPMENT / MODEL",
        "ENGINE / SERIAL NUMBER",
        "RUNNING HOURS",
        "FINDINGS",
        "RECOMMENDATION",
      ];
      const rows = data.map((r: any) => [
        r.job_order || "",
        r.customer_name || "",
        r.equipment_model || "",
        [r.engine_model, r.engine_serial_no].filter(Boolean).join(" / "),
        r.running_hours || "",
        r.findings || "",
        r.recommendations || "",
      ]);
      csv = buildCsv(headers, rows);

      const modelPart = engineModel ? engineModel.replace(/\s+/g, "_") : "";
      const snPart = serialNumber ? serialNumber.replace(/\s+/g, "_") : "";
      const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : "";
      const tag = [modelPart, snPart, dateRange].filter(Boolean).join("_") || "all";
      filename = `engine_report_${tag}.csv`;

    } else if (reportType === "manhour") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required for this report type" },
          { status: 400 }
        );
      }

      // Calculate business days (Mon-Fri) in date range
      function countBusinessDays(start: string, end: string): number {
        let count = 0;
        const current = new Date(start + "T00:00:00");
        const last = new Date(end + "T00:00:00");
        while (current <= last) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) count++;
          current.setDate(current.getDate() + 1);
        }
        return count;
      }

      const businessDays = countBusinessDays(startDate, endDate);

      // Fetch DTS entries in date range
      const { data: dtsEntries, error: dtsError } = await supabase
        .from("daily_time_sheet_entries")
        .select("entry_date, total_hours, travel_time_hours, travel_distance_km, travel_time_from, travel_time_to, travel_time_depart, travel_time_arrived, travel_distance_from, travel_distance_to, travel_departure_odo, travel_arrival_odo, daily_time_sheet!inner(created_by, deleted_at)")
        .gte("entry_date", startDate)
        .lte("entry_date", endDate)
        .is("daily_time_sheet.deleted_at", null);

      if (dtsError) {
        return NextResponse.json({ success: false, message: dtsError.message }, { status: 500 });
      }

      // Group work manhours and travel hours by user
      const userWorkHours = new Map<string, number>();
      const userTravelHours = new Map<string, number>();
      const userTravelDistanceKm = new Map<string, number>();
      for (const entry of dtsEntries || []) {
        const dts = entry.daily_time_sheet as any;
        const userId = dts?.created_by;
        if (!userId) continue;
        const workHrs = typeof entry.total_hours === "string" ? parseFloat(entry.total_hours) : (entry.total_hours || 0);
        const travelHrs = typeof entry.travel_time_hours === "string" ? parseFloat(entry.travel_time_hours as string) : ((entry.travel_time_hours as number) || 0);
        const distKm = typeof entry.travel_distance_km === "string" ? parseFloat(entry.travel_distance_km as string) : ((entry.travel_distance_km as number) || 0);
        userWorkHours.set(userId, (userWorkHours.get(userId) || 0) + workHrs);
        userTravelHours.set(userId, (userTravelHours.get(userId) || 0) + travelHrs);
        userTravelDistanceKm.set(userId, (userTravelDistanceKm.get(userId) || 0) + distKm);
      }

      // Collect all user IDs that have any DTS data
      const allUserIds = new Set([...userWorkHours.keys(), ...userTravelHours.keys(), ...userTravelDistanceKm.keys()]);
      if (allUserIds.size === 0) {
        return NextResponse.json(
          { success: false, message: "No DTS entries found for the selected date range" },
          { status: 404 }
        );
      }

      // Fetch approved leave requests overlapping the date range
      const { data: leaveRequests, error: leaveError } = await supabase
        .from("leave_requests")
        .select("user_id, start_date, end_date, total_days")
        .eq("status", "approved")
        .lte("start_date", endDate)
        .gte("end_date", startDate);

      if (leaveError) {
        return NextResponse.json({ success: false, message: leaveError.message }, { status: 500 });
      }

      // Calculate leave days per user (only business days within the filter range)
      const userLeaveDays = new Map<string, number>();
      for (const leave of leaveRequests || []) {
        const leaveStart = leave.start_date > startDate ? leave.start_date : startDate;
        const leaveEnd = leave.end_date < endDate ? leave.end_date : endDate;
        const leaveBizDays = countBusinessDays(leaveStart, leaveEnd);
        if (leaveBizDays > 0) {
          userLeaveDays.set(leave.user_id, (userLeaveDays.get(leave.user_id) || 0) + leaveBizDays);
        }
      }

      // Fetch user names
      const userIds = [...allUserIds];
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, firstname, lastname")
        .in("id", userIds);

      if (usersError) {
        return NextResponse.json({ success: false, message: usersError.message }, { status: 500 });
      }

      const userNameMap = new Map((users || []).map((u: any) => [u.id, `${u.firstname || ""} ${u.lastname || ""}`.trim()]));

      // Build CSV rows matching the Monthly Utilization format
      // Utilization % = (Travel Hours + Work Manhours) / Available Manhours × 100
      // Unaccounted = Available Manhours - (Travel + Work Manhours + Leave)
      const headers = ["Technician", "Available Manhours", "Travel Hours", "Travel Distance (KM)", "Work Manhour (Reg + OT)", "Utilization %", "Leave", "Unaccounted"];
      const rows: string[][] = [];
      for (const userId of userIds) {
        const name = userNameMap.get(userId) || "Unknown";
        const leaveDays = userLeaveDays.get(userId) || 0;
        const leaveHours = leaveDays * 8;
        const availableManhours = (businessDays * 8) - leaveHours;
        const workManhours = userWorkHours.get(userId) || 0;
        const travelHours = userTravelHours.get(userId) || 0;
        const travelDistanceKm = userTravelDistanceKm.get(userId) || 0;
        const utilization = availableManhours > 0 ? ((travelHours + workManhours) / availableManhours) * 100 : 0;
        const unaccounted = availableManhours - (travelHours + workManhours + leaveHours);

        rows.push([
          name,
          String(availableManhours),
          travelHours.toFixed(2),
          travelDistanceKm.toFixed(2),
          workManhours.toFixed(2),
          Math.round(utilization) + "%",
          String(leaveHours),
          unaccounted.toFixed(2),
        ]);
      }

      // Sort by technician name
      rows.sort((a, b) => a[0].localeCompare(b[0]));

      csv = buildCsv(headers, rows);
      filename = `manhour_utilization_${startDate}_to_${endDate}.csv`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
