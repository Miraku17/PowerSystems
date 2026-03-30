import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission, getPermissionScope } from "@/lib/permissions";
import { CREDIT_LEAVE_TYPES } from "@/types";

// GET: List leave requests
// - Users with leave.access see their own requests
// - Users with leave_approval.access (scope=all) see all requests
// - Users with leave_approval.access (scope=branch) see only their branch's requests
export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const canAccessLeave = await hasPermission(supabase, user.id, "leave", "access");
    const canAccessApproval = await hasPermission(supabase, user.id, "leave_approval", "access");

    if (!canAccessLeave && !canAccessApproval) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view leave requests" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const mineOnly = url.searchParams.get("mine") === "true";

    let query = supabase
      .from("leave_requests")
      .select("*, user:users!leave_requests_user_id_fkey(id, firstname, lastname, email, address), approver:users!leave_requests_approved_by_fkey(id, firstname, lastname)")
      .order("created_at", { ascending: false });

    // If user doesn't have approval access, or explicitly requesting own requests only
    if (!canAccessApproval || mineOnly) {
      query = query.eq("user_id", user.id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leave requests:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Apply branch filter if approval access is branch-scoped
    let result = data || [];
    if (canAccessApproval) {
      const approvalScope = await getPermissionScope(supabase, user.id, "leave_approval", "access");
      if (approvalScope === "branch") {
        const { data: currentUserData } = await supabase
          .from("users")
          .select("address")
          .eq("id", user.id)
          .single();

        if (currentUserData?.address) {
          result = result.filter(
            (req: any) => req.user?.address === currentUserData.address
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("API error fetching leave requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// POST: File a new leave request
export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check: leave.write
    if (!(await hasPermission(supabase, user.id, "leave", "write"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to file leave requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { leave_type, start_date, end_date, total_days, reason } = body;

    // Validate required fields
    if (!leave_type || !start_date || !end_date || !total_days) {
      return NextResponse.json(
        { success: false, message: "Leave type, start date, end date, and total days are required" },
        { status: 400 }
      );
    }

    // Validate leave_type
    const validTypes = ["VL", "SL", "EL", "BL", "PL", "ML", "SPL", "LWOP"];
    if (!validTypes.includes(leave_type)) {
      return NextResponse.json(
        { success: false, message: `Invalid leave type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate total_days > 0
    if (total_days <= 0) {
      return NextResponse.json(
        { success: false, message: "Total days must be greater than 0" },
        { status: 400 }
      );
    }

    // Check if user has enough credits remaining for the specific leave type
    // Only LWOP doesn't consume credits
    if (CREDIT_LEAVE_TYPES.includes(leave_type)) {
      const { data: credits } = await supabase
        .from("leave_credits")
        .select("total_credits, used_credits")
        .eq("user_id", user.id)
        .eq("leave_type", leave_type)
        .single();

      const remaining = (credits?.total_credits || 0) - (credits?.used_credits || 0);
      if (remaining < total_days) {
        return NextResponse.json(
          { success: false, message: `Insufficient ${leave_type} credits. You have ${remaining} day(s) remaining.` },
          { status: 400 }
        );
      }
    }

    // Insert leave request
    const { data, error } = await supabase
      .from("leave_requests")
      .insert({
        user_id: user.id,
        leave_type,
        start_date,
        end_date,
        total_days,
        reason: reason || null,
      })
      .select("*, user:users!leave_requests_user_id_fkey(id, firstname, lastname, email)")
      .single();

    if (error) {
      console.error("Error creating leave request:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error("API error creating leave request:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
