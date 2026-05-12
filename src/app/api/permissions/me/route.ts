import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Get the user's position
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("position:positions(id, is_super_admin)")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.position) {
      return NextResponse.json({ success: true, data: [], isSuperAdmin: false });
    }

    const position = (userData as any).position as { id: string; is_super_admin: boolean };
    const isSuperAdmin = position.is_super_admin === true;

    // Get all permissions for this position
    const { data: permissions, error: permError } = await supabase
      .from("position_permissions")
      .select("scope, permissions(module, action)")
      .eq("position_id", position.id);

    if (permError) throw permError;

    // Flatten into { module, action, scope } objects
    const flatPermissions = (permissions || []).map((pp: any) => ({
      module: pp.permissions.module,
      action: pp.permissions.action,
      scope: pp.scope,
    }));

    return NextResponse.json({ success: true, data: flatPermissions, isSuperAdmin });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
