import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const { data: userData, error } = await supabase
      .from("users")
      .select("address, position:positions(name)")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      positionName: (userData.position as any)?.name || null,
      address: userData.address || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
