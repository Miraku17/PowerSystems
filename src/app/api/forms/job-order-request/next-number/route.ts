import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Get the current next value from the sequence without consuming it
    const { data, error } = await supabase.rpc("get_next_jo_number");

    if (error) {
      console.error("Error fetching next JO number:", error);
      // Fallback: query the max jo_number and add 1
      const { data: maxData, error: maxError } = await supabase
        .from("job_order_request_form")
        .select("jo_number")
        .order("jo_number", { ascending: false })
        .limit(1)
        .single();

      const nextNumber = maxError || !maxData ? 1 : (maxData.jo_number || 0) + 1;
      const joNumber = `JO-${String(nextNumber).padStart(4, "0")}`;
      return NextResponse.json({ success: true, data: joNumber });
    }

    const joNumber = `JO-${String(data).padStart(4, "0")}`;
    return NextResponse.json({ success: true, data: joNumber });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
