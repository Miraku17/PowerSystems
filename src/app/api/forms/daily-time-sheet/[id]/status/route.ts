import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

const VALID_STATUSES = ["In-Progress", "Pending", "Close", "Cancelled"];

// PATCH: Set status on a daily time sheet (requires approvals/edit permission)
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

    // Fetch the DTS record
    const { data: dtsRecord, error: dtsError } = await supabase
      .from("daily_time_sheet")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (dtsError || !dtsRecord) {
      return NextResponse.json(
        { success: false, message: "Daily time sheet not found" },
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
          .eq("id", dtsRecord.created_by)
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

    const oldStatus = dtsRecord.status;
    const now = new Date().toISOString();

    const { data: updatedRecord, error: updateError } = await supabase
      .from("daily_time_sheet")
      .update({ status, updated_at: now })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating DTS status:", updateError);
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      table_name: "daily_time_sheet",
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
    console.error("Error updating DTS status:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
