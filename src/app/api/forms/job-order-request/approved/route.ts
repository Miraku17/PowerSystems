import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Per spec: fill-up forms may only be filed against JOs whose status is
    // 'In-Progress'. Filter the autocomplete here so users never see
    // Pending / Close / Cancelled JOs in the dropdown. (The server also
    // re-validates on each form submit — see lib/jo-status.ts.)
    // Returns the columns Fill-Up forms need to auto-populate after the user
    // picks a JO — including equipment_model / equipment_number / engine_model
    // / esn so service-report forms can pre-fill those fields automatically
    // (spec note 14: "Equipment and Engine serial numbers from JO requests
    // should automatically appear on Fillup forms").
    let query = supabase
      .from("job_order_request_form")
      .select(
        "id, shop_field_jo_number, full_customer_name, address, location_of_unit, equipment_model, equipment_number, engine_model, esn",
      )
      .is("deleted_at", null)
      .eq("status", "In-Progress")
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
