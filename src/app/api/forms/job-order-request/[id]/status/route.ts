import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

const VALID_STATUSES = ["In-Progress", "Pending", "Close", "Cancelled"];

// PATCH: Set status on a job order request (requires approvals/edit permission)
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check permission: user must have approvals/edit permission
    const canEdit = await hasPermission(supabase, user.id, "approvals", "edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to change status" },
        { status: 403 }
      );
    }

    // Fetch the job order request record
    const { data: joRecord, error: joError } = await supabase
      .from("job_order_request_form")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (joError || !joRecord) {
      return NextResponse.json(
        { success: false, message: "Job order request not found" },
        { status: 404 }
      );
    }

    // Branch scoping: check if user's scope is "branch" and filter accordingly
    const { data: userData } = await supabase
      .from("users")
      .select("address, position_id")
      .eq("id", user.id)
      .single();

    if (userData?.position_id) {
      const { data: permScope } = await supabase
        .from("position_permissions")
        .select("scope, permissions!inner(module, action)")
        .eq("position_id", userData.position_id)
        .eq("permissions.module", "approvals")
        .eq("permissions.action", "edit")
        .maybeSingle();

      if (permScope?.scope === "branch") {
        // Fetch the creator's address separately
        const { data: creatorData } = await supabase
          .from("users")
          .select("address")
          .eq("id", joRecord.created_by)
          .single();

        const creatorAddress = creatorData?.address;
        if (!creatorAddress || creatorAddress !== userData.address) {
          return NextResponse.json(
            { success: false, message: "You can only update records from your branch" },
            { status: 403 }
          );
        }
      }
    }

    const oldStatus = joRecord.status;
    const now = new Date().toISOString();

    const { data: updatedRecord, error: updateError } = await supabase
      .from("job_order_request_form")
      .update({ status, updated_at: now })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating JO request status:", updateError);
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      table_name: "job_order_request_form",
      record_id: id,
      action: "STATUS_CHANGE",
      old_data: { status: oldStatus },
      new_data: { status },
      performed_by: user.id,
      performed_at: now,
    });

    // Phase 3 cascade: when the JO is moved to 'Close', every filled-up
    // service report that references this JO's shop_field_jo_number (or
    // its UUID for daily_time_sheet) flips to status='Close' too. The
    // status column was added to every form table by
    // add_status_to_form_tables_and_cascade.sql.
    let cascadeUpdates = 0;
    if (status === "Close") {
      const cascadeTargets: Array<{ table: string; column: string; value: string }> = [
        { table: "components_teardown_measuring_report",     column: "job_order_no",          value: joRecord.shop_field_jo_number },
        { table: "deutz_commissioning_report",               column: "job_order_no",          value: joRecord.shop_field_jo_number },
        { table: "deutz_service_report",                     column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "electric_surface_pump_commissioning_report", column: "job_order",           value: joRecord.shop_field_jo_number },
        { table: "electric_surface_pump_service_report",     column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "electric_surface_pump_teardown_report",    column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "engine_inspection_receiving_report",       column: "jo_number",             value: joRecord.shop_field_jo_number },
        { table: "engine_surface_pump_commissioning_report", column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "engine_surface_pump_service_report",       column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "engine_teardown_reports",                  column: "job_number",            value: joRecord.shop_field_jo_number },
        { table: "submersible_pump_commissioning_report",    column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "submersible_pump_service_report",          column: "job_order",             value: joRecord.shop_field_jo_number },
        { table: "submersible_pump_teardown_report",         column: "job_order",             value: joRecord.shop_field_jo_number },
        // Note: daily_time_sheet is intentionally NOT in the cascade list.
        // Its `status` column was pre-existing and tracks the DTS approval
        // workflow (Pending → Approved → Conditional / Rejected), which is
        // separate from the JO close lifecycle. Overwriting that here would
        // corrupt the leave-approval state.
      ];

      for (const target of cascadeTargets) {
        if (!target.value) continue;
        const { data: cascaded, error: cascadeErr } = await supabase
          .from(target.table)
          .update({ status: "Close", updated_at: now })
          .eq(target.column, target.value)
          .select("id");
        if (cascadeErr) {
          // Don't fail the whole status change — log + continue. The JO is
          // still closed; admins can manually retry the cascade if needed.
          console.error(`Cascade close failed for ${target.table}:`, cascadeErr);
        } else if (cascaded) {
          cascadeUpdates += cascaded.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}${
        status === "Close" && cascadeUpdates > 0
          ? ` (${cascadeUpdates} linked form${cascadeUpdates === 1 ? "" : "s"} also closed)`
          : ""
      }`,
      data: updatedRecord,
      cascadeUpdates,
    });
  } catch (error: any) {
    console.error("Error updating JO request status:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
