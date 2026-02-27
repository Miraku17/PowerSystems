import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission, getPermissionScope } from "@/lib/permissions";

// PATCH: Approve or reject a leave request
export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Permission check: leave_approval.edit
    if (!(await hasPermission(supabase, user.id, "leave_approval", "edit"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to approve/reject leave requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, rejection_reason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
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

    // Branch scope check: only allow approving/rejecting requests from same branch
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
          { success: false, message: "You can only approve/reject leave requests from your branch" },
          { status: 403 }
        );
      }
    }

    if (leaveRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "This leave request has already been processed" },
        { status: 400 }
      );
    }

    // If approving, check that user has enough remaining credits
    if (status === "approved") {
      const { data: credits } = await supabase
        .from("leave_credits")
        .select("total_credits, used_credits")
        .eq("user_id", leaveRequest.user_id)
        .single();

      const remaining = (credits?.total_credits || 0) - (credits?.used_credits || 0);
      if (remaining < leaveRequest.total_days) {
        return NextResponse.json(
          { success: false, message: `Insufficient leave credits. User has ${remaining} day(s) remaining but needs ${leaveRequest.total_days}.` },
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
        .eq("user_id", leaveRequest.user_id);

      if (creditError) {
        console.error("Error deducting leave credits:", creditError);
        return NextResponse.json(
          { success: false, message: "Failed to deduct leave credits" },
          { status: 500 }
        );
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
