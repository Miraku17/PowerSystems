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

    // Fetch the DTS record
    const { data: dtsRecord, error: dtsError } = await supabase
      .from("daily_time_sheet")
      .select("*, requester:users!daily_time_sheet_created_by_fkey(id, address)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (dtsError || !dtsRecord) {
      return NextResponse.json(
        { success: false, message: "Daily Time Sheet not found" },
        { status: 404 }
      );
    }

    const currentStatus = dtsRecord.approval_status;

    // Determine which level the DTS is currently at
    const currentLevel = currentStatus === "pending_level_1"
      ? 1
      : currentStatus === "pending_level_2"
      ? 2
      : null;

    if (!currentLevel) {
      return NextResponse.json(
        { success: false, message: "This Daily Time Sheet is not pending approval" },
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

    // For Admin 2 (level 1), check address match
    if (filterByAddress) {
      const requesterAddress = dtsRecord.requester?.address;
      if (!requesterAddress || requesterAddress !== userAddress) {
        return NextResponse.json(
          { success: false, message: "You can only approve Daily Time Sheets from your branch" },
          { status: 403 }
        );
      }
    }

    // Build the update
    const now = new Date().toISOString();
    const updateData: any = {};

    if (action === "reject") {
      updateData.approval_status = "rejected";
      updateData[`level_${currentLevel}_approved_by`] = user.id;
      updateData[`level_${currentLevel}_approved_at`] = now;
      if (notes) updateData[`level_${currentLevel}_notes`] = notes;
    } else {
      // Approve: advance to next level or mark as approved
      updateData[`level_${currentLevel}_approved_by`] = user.id;
      updateData[`level_${currentLevel}_approved_at`] = now;
      if (notes) updateData[`level_${currentLevel}_notes`] = notes;

      if (currentLevel === 2) {
        updateData.approval_status = "approved";
      } else {
        updateData.approval_status = `pending_level_${currentLevel + 1}`;
      }
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from("daily_time_sheet")
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
      table_name: "daily_time_sheet",
      record_id: id,
      action: action === "approve" ? "APPROVE" : "REJECT",
      old_data: { approval_status: currentStatus },
      new_data: updateData,
      performed_by: user.id,
      performed_at: now,
    });

    const actionLabel = action === "approve" ? "approved" : "rejected";
    return NextResponse.json({
      success: true,
      message: `Daily Time Sheet ${actionLabel} successfully`,
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
