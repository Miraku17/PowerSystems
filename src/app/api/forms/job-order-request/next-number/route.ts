import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Try the RPC function first (reads sequence without consuming)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_next_jo_number");

    if (!rpcError && rpcData != null) {
      const joNumber = `JO-${String(rpcData).padStart(4, "0")}`;
      return NextResponse.json({ success: true, data: joNumber });
    }

    // Fallback: read the sequence's current value directly
    // The sequence name for a SERIAL column is: {table}_{column}_seq
    const { data: seqData, error: seqError } = await supabase
      .rpc("get_sequence_last_value", {
        seq_name: "job_order_request_form_jo_number_seq",
      });

    if (!seqError && seqData != null) {
      // last_value is the last value returned by the sequence
      // next insert will use last_value + 1
      const nextNumber = Number(seqData) + 1;
      const joNumber = `JO-${String(nextNumber).padStart(4, "0")}`;
      return NextResponse.json({ success: true, data: joNumber });
    }

    // Final fallback: query max jo_number from all rows (including soft-deleted)
    // to stay in sync with the sequence
    const { data: maxData, error: maxError } = await supabase
      .from("job_order_request_form")
      .select("jo_number")
      .order("jo_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = maxError || !maxData ? 1 : (maxData.jo_number || 0) + 1;
    const joNumber = `JO-${String(nextNumber).padStart(4, "0")}`;
    return NextResponse.json({ success: true, data: joNumber });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
