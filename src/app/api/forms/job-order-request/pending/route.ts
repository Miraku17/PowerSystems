import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Get current user's position name and address
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("address, position:positions(name)")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const positionName = (userData.position as any)?.name;
    const userAddress = userData.address;

    // Determine if user is a regular requester or admin
    const adminRoles = ["Admin 1", "Admin 2", "Super User", "Super Admin"];
    const isRequester = !adminRoles.includes(positionName);

    // Build query for JO requests
    let query = supabase
      .from("job_order_request_form")
      .select("*, requester:users!job_order_request_form_created_by_fkey(id, firstname, lastname, address)")
      .is("deleted_at", null);

    if (isRequester) {
      // Regular users see only their own JO requests
      query = query.eq("created_by", user.id);
    }
    // Admin roles see all JO requests

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching JO requests:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map to frontend format
    const records = (data || []).map((record: any) => ({
      id: record.id,
      jo_number: record.shop_field_jo_number,
      full_customer_name: record.full_customer_name,
      date_prepared: record.date_prepared,
      created_at: record.created_at,
      status: record.status,
      requester_name: record.requester
        ? `${record.requester.firstname} ${record.requester.lastname}`
        : "Unknown",
      requester_address: record.requester?.address || "",
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: { positionName, isRequester },
    });
  } catch (error: any) {
    console.error("API error fetching JO requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
