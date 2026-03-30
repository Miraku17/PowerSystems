import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";
import { CREDIT_LEAVE_TYPES } from "@/types";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check: leave.access
    if (!(await hasPermission(supabase, user.id, "leave", "access"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to access leave" },
        { status: 403 }
      );
    }

    // Get leave credits for current user (per category)
    const { data: credits, error } = await supabase
      .from("leave_credits")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Build per-category response
    const defaultCredits = { total_credits: 0, used_credits: 0 };
    const result: Record<string, { total_credits: number; used_credits: number }> = {};
    for (const type of CREDIT_LEAVE_TYPES) {
      result[type] = { ...defaultCredits };
    }

    for (const c of credits || []) {
      if (CREDIT_LEAVE_TYPES.includes(c.leave_type)) {
        result[c.leave_type] = {
          total_credits: Number(c.total_credits),
          used_credits: Number(c.used_credits),
        };
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("API error fetching leave credits:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
