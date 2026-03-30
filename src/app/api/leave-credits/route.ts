import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";
import { CREDIT_LEAVE_TYPES } from "@/types";

// Admin: list all users with leave credits (per category)
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

    // Group credits by user_id
    const creditsMap = new Map<string, Record<string, { total_credits: number; used_credits: number }>>();
    for (const c of credits || []) {
      if (!creditsMap.has(c.user_id)) {
        creditsMap.set(c.user_id, {});
      }
      creditsMap.get(c.user_id)![c.leave_type] = {
        total_credits: Number(c.total_credits),
        used_credits: Number(c.used_credits),
      };
    }

    const defaultCredits = { total_credits: 0, used_credits: 0 };
    const data = users?.map((u: any) => {
      const userCredits: Record<string, { total_credits: number; used_credits: number }> = {};
      for (const type of CREDIT_LEAVE_TYPES) {
        userCredits[type] = creditsMap.get(u.id)?.[type] || { ...defaultCredits };
      }
      return { user: u, credits: userCredits };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching leave credits:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// Admin: update a user's total credits for a specific leave type
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
    const { user_id, leave_type, total_credits } = body;

    if (!user_id || !leave_type || total_credits === undefined || total_credits < 0) {
      return NextResponse.json(
        { success: false, message: "Valid user_id, leave_type, and total_credits are required" },
        { status: 400 }
      );
    }

    if (!CREDIT_LEAVE_TYPES.includes(leave_type)) {
      return NextResponse.json(
        { success: false, message: `leave_type must be one of: ${CREDIT_LEAVE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Upsert leave credits
    const { data, error } = await supabase
      .from("leave_credits")
      .upsert(
        {
          user_id,
          leave_type,
          total_credits,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,leave_type" }
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
