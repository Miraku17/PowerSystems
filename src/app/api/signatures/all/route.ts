import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// GET — fetch all users with their signatures (Super Admin only)
export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const canViewAll = await hasPermission(supabase, user.id, "signatures", "view_all");
    if (!canViewAll) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view all signatures" },
        { status: 403 }
      );
    }

    // Fetch users and signatures separately, then merge
    const [usersRes, signaturesRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, firstname, lastname, position:positions(name)")
        .order("firstname", { ascending: true }),
      supabase
        .from("user_signatures")
        .select("user_id, signature_url, created_at"),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (signaturesRes.error) throw signaturesRes.error;

    // Build a lookup map: user_id -> signature
    const sigMap = new Map(
      (signaturesRes.data || []).map((s: any) => [s.user_id, s])
    );

    const result = (usersRes.data || []).map((u: any) => {
      const sig = sigMap.get(u.id);
      return {
        id: u.id,
        fullName: `${u.firstname || ""} ${u.lastname || ""}`.trim(),
        position: u.position?.name || "N/A",
        signature_url: sig?.signature_url || null,
        signature_created_at: sig?.created_at || null,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching all signatures:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
