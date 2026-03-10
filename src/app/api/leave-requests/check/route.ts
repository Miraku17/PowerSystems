import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

// GET: Check if current user has approved leave on a specific date
// Query param: date (YYYY-MM-DD)
// Returns: { hasLeave: boolean }
export const GET = withAuth(async (request, { user }) => {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return NextResponse.json({ hasLeave: false });
    }

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .lte("start_date", date)
      .gte("end_date", date)
      .limit(1);

    if (error) {
      console.error("Error checking leave:", error);
      return NextResponse.json({ hasLeave: false });
    }

    return NextResponse.json({ hasLeave: (data?.length ?? 0) > 0 });
  } catch (error) {
    console.error("Error checking leave:", error);
    return NextResponse.json({ hasLeave: false });
  }
});
