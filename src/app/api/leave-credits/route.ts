import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// Admin: list all users with leave credits
export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check: leave_credits.access
    if (!(await hasPermission(supabase, user.id, "leave_credits", "access"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to manage leave credits" },
        { status: 403 }
      );
    }

    // Get all users with their leave credits
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, firstname, lastname, email, position:positions(id, name)")
      .order("lastname", { ascending: true });

    if (usersError) {
      return NextResponse.json(
        { success: false, message: usersError.message },
        { status: 500 }
      );
    }

    const { data: credits, error: creditsError } = await supabase
      .from("leave_credits")
      .select("*");

    if (creditsError) {
      return NextResponse.json(
        { success: false, message: creditsError.message },
        { status: 500 }
      );
    }

    // Merge users with their credits
    const creditsMap = new Map(credits?.map((c: any) => [c.user_id, c]) || []);
    const data = users?.map((u: any) => ({
      user: u,
      credits: creditsMap.get(u.id) || {
        user_id: u.id,
        total_credits: 0,
        used_credits: 0,
      },
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching leave credits:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// Admin: update a user's total credits
export const PATCH = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check: leave_credits.write
    if (!(await hasPermission(supabase, user.id, "leave_credits", "write"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to modify leave credits" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, total_credits } = body;

    if (!user_id || total_credits === undefined || total_credits < 0) {
      return NextResponse.json(
        { success: false, message: "Valid user_id and total_credits are required" },
        { status: 400 }
      );
    }

    // Upsert leave credits
    const { data, error } = await supabase
      .from("leave_credits")
      .upsert(
        {
          user_id,
          total_credits,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error updating leave credits:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
