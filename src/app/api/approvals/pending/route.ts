import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

// Map report_table names to human-readable form type labels
const TABLE_LABELS: Record<string, string> = {
  deutz_commissioning_report: "Deutz Commissioning",
  deutz_service_report: "Deutz Service",
  submersible_pump_service_report: "Submersible Pump Service",
  submersible_pump_commissioning_report: "Submersible Pump Commissioning",
  submersible_pump_teardown_report: "Submersible Pump Teardown",
  engine_surface_pump_service_report: "Engine Surface Pump Service",
  engine_surface_pump_commissioning_report: "Engine Surface Pump Commissioning",
  electric_surface_pump_service_report: "Electric Surface Pump Service",
  electric_surface_pump_commissioning_report: "Electric Surface Pump Commissioning",
  electric_surface_pump_teardown_report: "Electric Surface Pump Teardown",
  engine_inspection_receiving_report: "Engine Inspection / Receiving",
  engine_teardown_report: "Engine Teardown",
  components_teardown_measuring_report: "Components Teardown Measuring",
};

// Map report_table names to the API-friendly form type slug
const TABLE_TO_FORM_TYPE: Record<string, string> = {
  deutz_commissioning_report: "deutz-commissioning",
  deutz_service_report: "deutz-service",
  submersible_pump_service_report: "submersible-pump-service",
  submersible_pump_commissioning_report: "submersible-pump-commissioning",
  submersible_pump_teardown_report: "submersible-pump-teardown",
  engine_surface_pump_service_report: "engine-surface-pump-service",
  engine_surface_pump_commissioning_report: "engine-surface-pump-commissioning",
  electric_surface_pump_service_report: "electric-surface-pump-service",
  electric_surface_pump_commissioning_report: "electric-surface-pump-commissioning",
  electric_surface_pump_teardown_report: "electric-surface-pump-teardown",
  engine_inspection_receiving_report: "engine-inspection-receiving",
  engine_teardown_report: "engine-teardown",
  components_teardown_measuring_report: "components-teardown-measuring",
};

// Service report tables (exclude JO Request and DTS which have their own flows)
const SERVICE_REPORT_TABLES = Object.keys(TABLE_LABELS);

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Get current user's position name and address
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("address, position:positions(name)")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const positionName = (userData.position as any)?.name;
    const userAddress = userData.address;

    // Determine which approval level this user can act on
    let approvalLevel: number | null = null;
    let filterByAddress = false;
    let isRequester = false;

    switch (positionName) {
      case "Admin 2":
        approvalLevel = 1;
        filterByAddress = true;
        break;
      case "Admin 1":
        approvalLevel = 2;
        break;
      case "Super Admin":
        approvalLevel = 0; // special: all levels
        break;
      default:
        // Regular user / Super User: show only their own submissions (view-only)
        isRequester = true;
        break;
    }

    // Build query for pending approvals (only service report tables)
    let query = supabase
      .from("approvals")
      .select("*, requester:users!approvals_requested_by_fkey(id, firstname, lastname, address)")
      .in("report_table", SERVICE_REPORT_TABLES);

    if (isRequester) {
      // Regular users see all their own service report approvals
      query = query.eq("requested_by", user.id);
    } else if (approvalLevel === 0) {
      // Super Admin sees all
    } else if (approvalLevel === 1) {
      // Admin 2: records they need to act on OR have already acted on (level 1)
      query = query.or("level1_status.eq.pending,level1_status.eq.completed");
    } else if (approvalLevel === 2) {
      // Admin 1: records they need to act on OR have already acted on (level 2)
      query = query.or("level2_status.eq.pending,level2_status.eq.completed").eq("level1_status", "completed");
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching pending approvals:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    let filteredData = data || [];

    // Filter by address for Admin 2 (level 1)
    if (filterByAddress && userAddress) {
      filteredData = filteredData.filter((approval: any) => {
        const requesterAddress = approval.requester?.address;
        return requesterAddress && requesterAddress === userAddress;
      });
    }

    // No longer filtering out rejected records — show full history

    // Collect all unique approver IDs to resolve names in one query
    const approverIds = new Set<string>();
    filteredData.forEach((r: any) => {
      if (r.level1_approved_by) approverIds.add(r.level1_approved_by);
      if (r.level2_approved_by) approverIds.add(r.level2_approved_by);
    });

    let approverNames: Record<string, string> = {};
    if (approverIds.size > 0) {
      const { data: approvers } = await supabase
        .from("users")
        .select("id, firstname, lastname")
        .in("id", Array.from(approverIds));
      if (approvers) {
        approverNames = Object.fromEntries(
          approvers.map((u: any) => [u.id, `${u.firstname} ${u.lastname}`])
        );
      }
    }

    // Now fetch form details for each approval to get JO number, customer, date
    // Column names vary across tables, so select all possible variants
    const enrichedRecords = await Promise.all(
      filteredData.map(async (approval: any) => {
        let formDetails: any = {};
        try {
          const { data: formRecord } = await supabase
            .from(approval.report_table)
            .select("*")
            .eq("id", approval.report_id)
            .single();
          formDetails = formRecord || {};
        } catch {
          // Form record may have been deleted
        }

        // Resolve job order number (different columns across tables)
        const jobOrderNo =
          formDetails.job_order_no ||
          formDetails.job_order ||
          formDetails.job_number ||
          "";

        // Resolve customer name (different columns across tables)
        const customerName =
          formDetails.customer_name ||
          formDetails.customer ||
          "";

        return {
          id: approval.id,
          report_table: approval.report_table,
          report_id: approval.report_id,
          form_type: TABLE_TO_FORM_TYPE[approval.report_table] || approval.report_table,
          form_type_label: TABLE_LABELS[approval.report_table] || approval.report_table,
          job_order_no: jobOrderNo,
          customer_name: customerName,
          date_created: formDetails.created_at || approval.created_at,
          status: approval.status,
          level1_status: approval.level1_status,
          level1_remarks: approval.level1_remarks,
          level1_approved_by_name: approverNames[approval.level1_approved_by] || null,
          level2_status: approval.level2_status,
          level2_remarks: approval.level2_remarks,
          level2_approved_by_name: approverNames[approval.level2_approved_by] || null,
          requested_by: approval.requested_by,
          requester_name: approval.requester
            ? `${approval.requester.firstname} ${approval.requester.lastname}`
            : "Unknown",
          requester_address: approval.requester?.address || "",
          is_rejected:
            approval.level1_remarks?.startsWith("REJECTED:") ||
            approval.level2_remarks?.startsWith("REJECTED:"),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedRecords,
      meta: { approvalLevel, positionName, isRequester },
    });
  } catch (error: any) {
    console.error("API error fetching pending approvals:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
