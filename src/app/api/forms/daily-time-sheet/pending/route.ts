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
      // Regular users see all their own DTS records
      query = query.eq("created_by", user.id);
    } else if (approvalLevel === 0) {
      // Super Admin sees all
    } else if (approvalLevel === 1) {
      // Admin 2: records they need to act on OR have already acted on (level 1)
      query = query.or("approval_status.eq.pending_level_1,level_1_approved_by.not.is.null");
    } else if (approvalLevel === 2) {
      // Admin 1: records they need to act on OR have already acted on (level 2)
      query = query.or("approval_status.eq.pending_level_2,level_2_approved_by.not.is.null");
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

    // Collect all unique approver IDs to resolve names in one query
    const approverIds = new Set<string>();
    filteredData.forEach((r: any) => {
      if (r.level_1_approved_by) approverIds.add(r.level_1_approved_by);
      if (r.level_2_approved_by) approverIds.add(r.level_2_approved_by);
    });

    let approverNames: Record<string, string> = {};
    if (approverIds.size > 0) {
      const { data: approvers } = await supabase
        .from("users")
        .select("id, firstname, lastname")
        .in("id", Array.from(approverIds));
      if (approvers) {
        approverNames = Object.fromEntries(
          approvers.map((u: any) => [u.id, `${u.firstname} ${u.lastname}`])
        );
      }
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
      level_1_approved_by_name: approverNames[record.level_1_approved_by] || null,
      level_1_approved_at: record.level_1_approved_at,
      level_1_notes: record.level_1_notes,
      level_2_approved_by: record.level_2_approved_by,
      level_2_approved_by_name: approverNames[record.level_2_approved_by] || null,
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
