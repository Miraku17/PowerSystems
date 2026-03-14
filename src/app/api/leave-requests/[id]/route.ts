import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission, getPermissionScope } from "@/lib/permissions";

// PATCH: Change leave request status (conditional, approved, rejected, or revoke back to pending)
export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Permission check: leave_approval.edit (base requirement for any action)
    if (!(await hasPermission(supabase, user.id, "leave_approval", "edit"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to manage leave requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, rejection_reason } = body;

    if (!status || !["conditional", "approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be 'conditional', 'approved', 'rejected', or 'pending' (revoke)" },
        { status: 400 }
      );
    }

    // "approved" requires leave_approval_full.edit permission
    if (status === "approved") {
      const canFullApprove = await hasPermission(supabase, user.id, "leave_approval_full", "edit");
      if (!canFullApprove) {
        return NextResponse.json(
          { success: false, message: "You do not have permission to fully approve leave requests. You can set it to conditional instead." },
          { status: 403 }
        );
      }
    }

    // Get the leave request (include requester address for branch check)
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*, user:users!leave_requests_user_id_fkey(id, address)")
      .eq("id", id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { success: false, message: "Leave request not found" },
        { status: 404 }
      );
    }

    // Branch scope check
    const editScope = await getPermissionScope(supabase, user.id, "leave_approval", "edit");
    if (editScope === "branch") {
      const { data: currentUserData } = await supabase
        .from("users")
        .select("address")
        .eq("id", user.id)
        .single();

      const requesterAddress = (leaveRequest.user as any)?.address;
      if (!currentUserData?.address || requesterAddress !== currentUserData.address) {
        return NextResponse.json(
          { success: false, message: "You can only manage leave requests from your branch" },
          { status: 403 }
        );
      }
    }

    // Validate status transitions
    const currentStatus = leaveRequest.status;

    // Revoke: any non-pending status can be revoked back to pending
    if (status === "pending") {
      if (currentStatus === "pending") {
        return NextResponse.json(
          { success: false, message: "This leave request is already pending" },
          { status: 400 }
        );
      }

      // If revoking from "approved" or "conditional", restore credits
      if (currentStatus === "approved" || currentStatus === "conditional") {
        const leaveType = leaveRequest.leave_type;
        if (leaveType === "VL" || leaveType === "SL") {
          const { data: credits } = await supabase
            .from("leave_credits")
            .select("used_credits")
            .eq("user_id", leaveRequest.user_id)
            .eq("leave_type", leaveType)
            .single();

          if (credits) {
            const restoredUsed = Math.max(0, (credits.used_credits || 0) - leaveRequest.total_days);
            const { error: creditError } = await supabase
              .from("leave_credits")
              .update({
                used_credits: restoredUsed,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", leaveRequest.user_id)
              .eq("leave_type", leaveType);

            if (creditError) {
              console.error("Error restoring leave credits:", creditError);
              return NextResponse.json(
                { success: false, message: "Failed to restore leave credits" },
                { status: 500 }
              );
            }
          }
        }
      }

      // Reset to pending
      const { data, error } = await supabase
        .from("leave_requests")
        .update({
          status: "pending",
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, user:users!leave_requests_user_id_fkey(id, firstname, lastname, email), approver:users!leave_requests_approved_by_fkey(id, firstname, lastname)")
        .single();

      if (error) {
        console.error("Error revoking leave request:", error);
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    // For conditional/approved/rejected: only pending or conditional can be moved forward
    if (currentStatus !== "pending" && currentStatus !== "conditional") {
      return NextResponse.json(
        { success: false, message: `Cannot change status from '${currentStatus}' to '${status}'. Revoke first to set back to pending.` },
        { status: 400 }
      );
    }

    // Deduct credits for conditional or approved (but not if already deducted from conditional)
    const needsDeduction = (status === "conditional" || status === "approved") && currentStatus === "pending";
    if (needsDeduction) {
      const leaveType = leaveRequest.leave_type;

      // LWOP and EL don't consume credits
      if (leaveType === "VL" || leaveType === "SL") {
        const { data: credits } = await supabase
          .from("leave_credits")
          .select("total_credits, used_credits")
          .eq("user_id", leaveRequest.user_id)
          .eq("leave_type", leaveType)
          .single();

        const remaining = (credits?.total_credits || 0) - (credits?.used_credits || 0);
        if (remaining < leaveRequest.total_days) {
          return NextResponse.json(
            { success: false, message: `Insufficient ${leaveType} credits. User has ${remaining} day(s) remaining but needs ${leaveRequest.total_days}.` },
            { status: 400 }
          );
        }

        // Deduct credits
        const { error: creditError } = await supabase
          .from("leave_credits")
          .update({
            used_credits: (credits?.used_credits || 0) + leaveRequest.total_days,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", leaveRequest.user_id)
          .eq("leave_type", leaveType);

        if (creditError) {
          console.error("Error deducting leave credits:", creditError);
          return NextResponse.json(
            { success: false, message: "Failed to deduct leave credits" },
            { status: 500 }
          );
        }
      }
    }

    // Update leave request status
    const updateData: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === "rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", id)
      .select("*, user:users!leave_requests_user_id_fkey(id, firstname, lastname, email), approver:users!leave_requests_approved_by_fkey(id, firstname, lastname)")
      .single();

    if (error) {
      console.error("Error updating leave request:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error updating leave request:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
