import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

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
  engine_teardown_reports: "Engine Teardown",
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
  engine_teardown_reports: "engine-teardown",
  components_teardown_measuring_report: "components-teardown-measuring",
};

// Service report tables (exclude JO Request and DTS which have their own flows)
const SERVICE_REPORT_TABLES = Object.keys(TABLE_LABELS);

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Check if user has edit permission on approvals (can manage statuses)
    const canEdit = await hasPermission(supabase, user.id, "approvals", "edit");

    // Get user address for branch filtering
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

    const userAddress = userData.address;
    const isRequester = !canEdit;

    // Check if user's scope is "branch" for filtering
    let filterByAddress = false;
    if (canEdit && userData.position_id) {
      const { data: permScope } = await supabase
        .from("position_permissions")
        .select("scope, permissions!inner(module, action)")
        .eq("position_id", userData.position_id)
        .eq("permissions.module", "approvals")
        .eq("permissions.action", "edit")
        .maybeSingle();

      if (permScope?.scope === "branch") {
        filterByAddress = true;
      }
    }

    // Build query for approvals (only service report tables)
    let query = supabase
      .from("approvals")
      .select("*, requester:users!approvals_requested_by_fkey(id, firstname, lastname, address)")
      .in("report_table", SERVICE_REPORT_TABLES);

    if (isRequester) {
      // Regular users see all their own service report approvals
      query = query.eq("requested_by", user.id);
    }
    // Users with edit permission see all records (branch-scoped users filtered below)

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

    // Fetch form details for each approval to get JO number, customer, date
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

        const jobOrderNo =
          formDetails.job_order_no ||
          formDetails.job_order ||
          formDetails.job_number ||
          formDetails.jo_number ||
          "";

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
          requested_by: approval.requested_by,
          requester_name: approval.requester
            ? `${approval.requester.firstname} ${approval.requester.lastname}`
            : "Unknown",
          requester_address: approval.requester?.address || "",
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedRecords,
      meta: { canEdit, isRequester },
    });
  } catch (error: any) {
    console.error("API error fetching pending approvals:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
