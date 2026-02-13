import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Get the user's position_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("position_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.position_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get all permissions for this position
    const { data: permissions, error: permError } = await supabase
      .from("position_permissions")
      .select("scope, permissions(module, action)")
      .eq("position_id", userData.position_id);

    if (permError) throw permError;

    // Flatten into { module, action, scope } objects
    const flatPermissions = (permissions || []).map((pp: any) => ({
      module: pp.permissions.module,
      action: pp.permissions.action,
      scope: pp.scope,
    }));

    return NextResponse.json({ success: true, data: flatPermissions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
