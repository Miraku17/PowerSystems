import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

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

    const validTypes = ["generated", "status", "wip", "cancelled", "engine"];
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
      return records.filter((r: any) => creatorAddressMap.get(r.created_by) === userData.address);
    }

    // Build query
    let query = supabase
      .from("job_order_request_form")
      .select("*")
      .is("deleted_at", null);

    let csv = "";
    let filename = "";

    if (reportType === "generated") {
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

    } else if (reportType === "status") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required for this report type" },
          { status: 400 }
        );
      }
      query = query
        .gte("date_job_completed_closed", startDate)
        .lte("date_job_completed_closed", endDate)
        .eq("status", "Close");
      query = query.order("date_prepared", { ascending: true });

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

      const headers = [
        "J.O. NO.",
        "DATE OPEN",
        "DATE CLOSED",
        "CUSTOMER",
        "JOB DESCRIPTION",
        "ENGINE/EQP MT MODEL",
        "SERIAL NUMBER",
        "PARTS",
        "LABOR",
        "OTHERS",
        "TOTAL",
        "COST ABSORBED BY",
      ];
      const rows = data.map((r: any) => [
        r.shop_field_jo_number || "",
        formatDate(r.date_prepared),
        formatDate(r.date_job_completed_closed),
        r.full_customer_name || "",
        [r.complaints, r.work_to_be_done].filter(Boolean).join(" - "),
        [r.engine_model, r.equipment_model].filter(Boolean).join(" / "),
        r.esn || "",
        formatCost(r.parts_cost),
        formatCost(r.labor_cost),
        formatCost(r.other_cost),
        formatCost(r.total_cost),
        r.charges_absorbed_by || "",
      ]);
      csv = buildCsv(headers, rows);
      filename = `job_order_status_${startDate}_to_${endDate}.csv`;

    } else if (reportType === "wip") {
      if (!endDate) {
        return NextResponse.json(
          { success: false, message: "endDate is required for this report type" },
          { status: 400 }
        );
      }
      query = query
        .eq("status", "In-Progress")
        .or(`date_prepared.lte.${endDate},date_prepared.is.null`);
      query = query.order("date_prepared", { ascending: true });

      const { data: rawData, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      const data = await applyBranchFilter(rawData || []);

      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No in-progress job orders found as of the selected date" },
          { status: 404 }
        );
      }

      const headers = [
        "J.O NO",
        "DATE OPEN",
        "CUSTOMER",
        "JOB DESCRIPTION",
        "ENG/EQPMT MODEL",
        "SERIAL NO.",
        "AMOUNT (TOTAL)",
      ];
      const rows = data.map((r: any) => [
        r.shop_field_jo_number || "",
        formatDate(r.date_prepared),
        r.full_customer_name || "",
        [r.complaints, r.work_to_be_done].filter(Boolean).join(" - "),
        [r.engine_model, r.equipment_model].filter(Boolean).join(" / "),
        r.esn || "",
        formatCost(r.total_cost),
      ]);
      csv = buildCsv(headers, rows);
      filename = `work_in_process_as_of_${endDate}.csv`;

    } else if (reportType === "cancelled") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "startDate and endDate are required for this report type" },
          { status: 400 }
        );
      }
      query = query
        .gte("date_prepared", startDate)
        .lte("date_prepared", endDate)
        .eq("status", "Cancelled");
      query = query.order("date_prepared", { ascending: true });

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

      const headers = [
        "J.O NO",
        "DATE OPEN",
        "CUSTOMER",
        "REASON FOR CANCELLATION",
      ];
      const rows = data.map((r: any) => [
        r.shop_field_jo_number || "",
        formatDate(r.date_prepared),
        r.full_customer_name || "",
        r.remarks || "",
      ]);
      csv = buildCsv(headers, rows);
      filename = `cancelled_job_orders_${startDate}_to_${endDate}.csv`;

    } else if (reportType === "engine") {
      if (!engineModel && !serialNumber) {
        return NextResponse.json(
          { success: false, message: "At least one of engineModel or serialNumber is required" },
          { status: 400 }
        );
      }

      let engineQuery = supabase
        .from("job_order_request_form")
        .select("*")
        .is("deleted_at", null);

      if (engineModel) {
        engineQuery = engineQuery.ilike("engine_model", `%${engineModel}%`);
      }
      if (serialNumber) {
        engineQuery = engineQuery.ilike("esn", `%${serialNumber}%`);
      }
      engineQuery = engineQuery.order("date_prepared", { ascending: true });

      const { data: rawData, error } = await engineQuery;
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      const data = await applyBranchFilter(rawData || []);

      if (data.length === 0) {
        return NextResponse.json(
          { success: false, message: "No job orders found for the specified engine model or serial number" },
          { status: 404 }
        );
      }

      // Header metadata from first record
      const first = data[0];
      const headerRows = [
        `ENGINE MODEL,${escapeCsvField(first.engine_model || "")},EQUIPMENT MODEL,${escapeCsvField(first.equipment_model || "")}`,
        `ENGINE SERIAL NUMBER,${escapeCsvField(first.esn || "")},EQPMT. SERIAL NUMBER,${escapeCsvField(first.equipment_number || "")}`,
        "",
      ];

      const tableHeaders = ["DATE", "FAILURE DESCRIPTION", "J.O NUMBER", "PARTS USED", "PERFORMED BY"];
      const tableRows = data.map((r: any) => [
        formatDate(r.date_prepared),
        [r.complaints, r.work_to_be_done].filter(Boolean).join(" - "),
        r.shop_field_jo_number || "",
        r.particulars || "",
        r.technicians_involved || "",
      ]);

      const tableHeaderLine = tableHeaders.map(escapeCsvField).join(",");
      const tableDataLines = tableRows.map((row: string[]) => row.map(escapeCsvField).join(","));
      csv = [...headerRows, tableHeaderLine, ...tableDataLines].join("\n");

      const modelPart = engineModel ? engineModel.replace(/\s+/g, "_") : "";
      const snPart = serialNumber ? serialNumber.replace(/\s+/g, "_") : "";
      const parts = [modelPart, snPart].filter(Boolean).join("_");
      filename = `engine_report_${parts}.csv`;
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
