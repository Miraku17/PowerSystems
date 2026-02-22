import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

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

    // Get or create leave credits for current user
    let { data, error } = await supabase
      .from("leave_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // No record found - create one with defaults
      const { data: newData, error: insertError } = await supabase
        .from("leave_credits")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { success: false, message: insertError.message },
          { status: 500 }
        );
      }
      data = newData;
    } else if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching leave credits:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
