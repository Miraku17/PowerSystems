import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "read"))) {
      return NextResponse.json(
        { success: false, message: "Permission denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category || !["engine", "pump"].includes(category)) {
      return NextResponse.json(
        { success: false, message: "Valid category (engine/pump) is required" },
        { status: 400 }
      );
    }

    // Count ALL articles in category (including soft-deleted) to ensure uniqueness
    const { count, error } = await supabase
      .from("knowledge_base_articles")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const nextNumber = (count || 0) + 1;
    const prefix = category === "engine" ? "ENG" : "PMP";
    const code = `KB-${prefix}-${String(nextNumber).padStart(4, "0")}`;

    return NextResponse.json({ success: true, data: { code } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
