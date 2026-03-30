import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    let query = supabase
      .from("job_order_request_form")
      .select("id, shop_field_jo_number, full_customer_name, address")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(
        `shop_field_jo_number.ilike.%${search}%,full_customer_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching job orders:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("API error fetching job orders:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
