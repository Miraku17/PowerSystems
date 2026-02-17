import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

const VALID_STATUSES = ["In-Progress", "Pending", "Close", "Cancelled"];

// PATCH: Directly set status on an approval record (requires approvals/edit permission)
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

    // Fetch the approval record
    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .select("*, requester:users!approvals_requested_by_fkey(id, address)")
      .eq("id", id)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json(
        { success: false, message: "Approval record not found" },
        { status: 404 }
      );
    }

    // Branch scoping: check if user's scope is "branch" and filter accordingly
    const { data: userData } = await supabase
      .from("users")
      .select("address")
      .eq("id", user.id)
      .single();

    if (userData?.address) {
      const { data: scopeData } = await supabase
        .from("users")
        .select("position_id")
        .eq("id", user.id)
        .single();

      if (scopeData?.position_id) {
        const { data: permScope } = await supabase
          .from("position_permissions")
          .select("scope, permissions!inner(module, action)")
          .eq("position_id", scopeData.position_id)
          .eq("permissions.module", "approvals")
          .eq("permissions.action", "edit")
          .maybeSingle();

        if (permScope?.scope === "branch") {
          const requesterAddress = approval.requester?.address;
          if (!requesterAddress || requesterAddress !== userData.address) {
            return NextResponse.json(
              { success: false, message: "You can only update records from your branch" },
              { status: 403 }
            );
          }
        }
      }
    }

    const oldStatus = approval.status;
    const now = new Date().toISOString();

    const { data: updatedRecord, error: updateError } = await supabase
      .from("approvals")
      .update({ status, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating approval status:", updateError);
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      table_name: "approvals",
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
    console.error("Error updating approval status:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// POST: Legacy approve/reject/complete/close actions (kept for backwards compatibility)
export const POST = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    if (!action || !["approve", "reject", "close", "complete"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'approve', 'reject', 'close', or 'complete'" },
        { status: 400 }
      );
    }

    // Get current user's position and address
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("address, firstname, lastname, position:positions(name)")
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

    // Determine which level this user can approve
    // Level 1: Admin 2 (same branch), Level 2: Admin 1
    let canApproveLevel: number | null = null;
    let filterByAddress = false;

    switch (positionName) {
      case "Admin 2":
        canApproveLevel = 1;
        filterByAddress = true;
        break;
      case "Admin 1":
        canApproveLevel = 2;
        break;
      case "Super Admin":
        canApproveLevel = 0; // can approve any level
        break;
      default:
        // Regular users can only use the "complete" action
        if (action !== "complete") {
          return NextResponse.json(
            { success: false, message: "You do not have approval permissions" },
            { status: 403 }
          );
        }
        break;
    }

    // Fetch the approval record
    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .select("*, requester:users!approvals_requested_by_fkey(id, address)")
      .eq("id", id)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json(
        { success: false, message: "Approval record not found" },
        { status: 404 }
      );
    }

    // Handle "complete" action — only the requester (creator) can mark as completed
    if (action === "complete") {
      if (approval.requested_by !== user.id) {
        return NextResponse.json(
          { success: false, message: "Only the creator of this form can mark it as completed" },
          { status: 403 }
        );
      }

      // Must be in-progress (both levels approved, not rejected)
      const l1Rejected = approval.level1_remarks?.startsWith("REJECTED:");
      const l2Rejected = approval.level2_remarks?.startsWith("REJECTED:");
      if (approval.status !== "in-progress" || l1Rejected || l2Rejected) {
        return NextResponse.json(
          { success: false, message: "Only in-progress service forms can be marked as completed" },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const { data: completedRecord, error: completeError } = await supabase
        .from("approvals")
        .update({ status: "completed" })
        .eq("id", id)
        .select()
        .single();

      if (completeError) {
        console.error("Error completing approval:", completeError);
        return NextResponse.json(
          { success: false, message: completeError.message },
          { status: 500 }
        );
      }

      await supabase.from("audit_logs").insert({
        table_name: "approvals",
        record_id: id,
        action: "COMPLETE",
        old_data: { status: approval.status },
        new_data: { status: "completed" },
        performed_by: user.id,
        performed_at: now,
      });

      return NextResponse.json({
        success: true,
        message: "Service report marked as completed",
        data: completedRecord,
      });
    }

    // Handle "close" action — Admin 2 (same branch) or Super Admin only
    if (action === "close") {
      if (positionName !== "Admin 2" && positionName !== "Super Admin") {
        return NextResponse.json(
          { success: false, message: "Only Admin 2 or Super Admin can close service forms" },
          { status: 403 }
        );
      }

      // Both levels must be approved (completed) and not rejected
      const l1Rejected = approval.level1_remarks?.startsWith("REJECTED:");
      const l2Rejected = approval.level2_remarks?.startsWith("REJECTED:");
      if (
        approval.level1_status !== "completed" ||
        approval.level2_status !== "completed" ||
        l1Rejected ||
        l2Rejected
      ) {
        return NextResponse.json(
          { success: false, message: "Both levels must be approved before closing" },
          { status: 400 }
        );
      }

      if (approval.status === "closed") {
        return NextResponse.json(
          { success: false, message: "This service form is already closed" },
          { status: 400 }
        );
      }

      // For Admin 2, check branch match
      if (positionName === "Admin 2") {
        const requesterAddress = approval.requester?.address;
        if (!requesterAddress || requesterAddress !== userAddress) {
          return NextResponse.json(
            { success: false, message: "You can only close records from your branch" },
            { status: 403 }
          );
        }
      }

      const now = new Date().toISOString();
      const { data: closedRecord, error: closeError } = await supabase
        .from("approvals")
        .update({ status: "closed" })
        .eq("id", id)
        .select()
        .single();

      if (closeError) {
        console.error("Error closing approval:", closeError);
        return NextResponse.json(
          { success: false, message: closeError.message },
          { status: 500 }
        );
      }

      await supabase.from("audit_logs").insert({
        table_name: "approvals",
        record_id: id,
        action: "CLOSE",
        old_data: { status: approval.status },
        new_data: { status: "closed" },
        performed_by: user.id,
        performed_at: now,
      });

      return NextResponse.json({
        success: true,
        message: "Service report closed successfully",
        data: closedRecord,
      });
    }

    // Determine which level needs action
    let currentLevel: number | null = null;
    if (approval.level1_status === "pending") {
      currentLevel = 1;
    } else if (approval.level1_status === "completed" && approval.level2_status === "pending") {
      currentLevel = 2;
    }

    if (!currentLevel) {
      return NextResponse.json(
        { success: false, message: "This record is not pending approval" },
        { status: 400 }
      );
    }

    // Validate that user can approve at this level
    if (canApproveLevel !== 0 && canApproveLevel !== currentLevel) {
      return NextResponse.json(
        { success: false, message: "You cannot approve at this level" },
        { status: 403 }
      );
    }

    // For Admin 2 (level 1), check address match with requester
    if (filterByAddress) {
      const requesterAddress = approval.requester?.address;
      if (!requesterAddress || requesterAddress !== userAddress) {
        return NextResponse.json(
          { success: false, message: "You can only approve records from your branch" },
          { status: 403 }
        );
      }
    }

    // Build the update
    const now = new Date().toISOString();
    const updateData: any = {};

    if (action === "reject") {
      // Set remarks to indicate rejection (constraint only allows pending/in-progress/completed)
      updateData[`level${currentLevel}_status`] = "completed";
      updateData[`level${currentLevel}_approved_by`] = user.id;
      updateData[`level${currentLevel}_remarks`] = `REJECTED: ${notes || "No reason provided"}`;
      // If rejecting at level 1, also mark level 2 as completed (to stop the flow)
      if (currentLevel === 1) {
        updateData.level2_status = "completed";
        updateData.level2_remarks = "Skipped - rejected at Level 1";
      }
    } else {
      // Approve: mark current level as completed
      updateData[`level${currentLevel}_status`] = "completed";
      updateData[`level${currentLevel}_approved_by`] = user.id;
      if (notes) updateData[`level${currentLevel}_remarks`] = notes;
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from("approvals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      table_name: "approvals",
      record_id: id,
      action: action === "approve" ? "APPROVE" : "REJECT",
      old_data: {
        level1_status: approval.level1_status,
        level2_status: approval.level2_status,
        status: approval.status,
      },
      new_data: updateData,
      performed_by: user.id,
      performed_at: now,
    });

    const actionLabel = action === "approve" ? "approved" : "rejected";
    return NextResponse.json({
      success: true,
      message: `Service report ${actionLabel} successfully`,
      data: updatedRecord,
    });
  } catch (error: any) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
