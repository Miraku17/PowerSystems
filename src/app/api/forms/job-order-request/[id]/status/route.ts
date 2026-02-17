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
      .select("*, creator:users!job_order_request_form_created_by_fkey(id, address)")
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
        const creatorAddress = joRecord.creator?.address;
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

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`,
      data: updatedRecord,
    });
  } catch (error: any) {
    console.error("Error updating JO request status:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
