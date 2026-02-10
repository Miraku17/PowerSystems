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

    // Determine which approval level this user can act on
    // Level 1: Admin 2 (same branch), Level 2: Admin 1
    let approvalLevel: number | null = null;
    let filterByAddress = false;
    let isRequester = false;

    switch (positionName) {
      case "Admin 2":
        approvalLevel = 1;
        filterByAddress = true;
        break;
      case "Admin 1":
        approvalLevel = 2;
        break;
      case "Super Admin":
        approvalLevel = 0; // special: all levels
        break;
      default:
        // Regular user / Super User: show only their own DTS records (view-only)
        isRequester = true;
        break;
    }

    // Build query for pending DTS records
    let query = supabase
      .from("daily_time_sheet")
      .select("*, requester:users!daily_time_sheet_created_by_fkey(id, firstname, lastname, address)")
      .is("deleted_at", null);

    if (isRequester) {
      // Regular users see their own DTS that are not yet fully approved
      query = query
        .eq("created_by", user.id)
        .in("approval_status", [
          "pending_level_1",
          "pending_level_2",
          "rejected",
        ]);
    } else if (approvalLevel === 0) {
      // Super Admin sees all non-approved/non-rejected
      query = query.in("approval_status", [
        "pending_level_1",
        "pending_level_2",
      ]);
    } else {
      query = query.eq("approval_status", `pending_level_${approvalLevel}`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching pending DTS records:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Filter by address for Admin 2 (level 1)
    let filteredData = data || [];
    if (filterByAddress && userAddress) {
      filteredData = filteredData.filter((dts: any) => {
        const requesterAddress = dts.requester?.address;
        return requesterAddress && requesterAddress === userAddress;
      });
    }

    // Map to frontend format
    const records = filteredData.map((record: any) => ({
      id: record.id,
      job_number: record.job_number,
      customer: record.customer,
      date: record.date,
      created_at: record.created_at,
      approval_status: record.approval_status,
      requester_name: record.requester
        ? `${record.requester.firstname} ${record.requester.lastname}`
        : "Unknown",
      requester_address: record.requester?.address || "",
      level_1_approved_by: record.level_1_approved_by,
      level_1_approved_at: record.level_1_approved_at,
      level_1_notes: record.level_1_notes,
      level_2_approved_by: record.level_2_approved_by,
      level_2_approved_at: record.level_2_approved_at,
      level_2_notes: record.level_2_notes,
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: { approvalLevel, positionName, isRequester },
    });
  } catch (error: any) {
    console.error("API error fetching pending DTS records:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
