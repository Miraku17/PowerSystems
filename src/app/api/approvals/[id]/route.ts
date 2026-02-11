import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const POST = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'approve' or 'reject'" },
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
        return NextResponse.json(
          { success: false, message: "You do not have approval permissions" },
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
