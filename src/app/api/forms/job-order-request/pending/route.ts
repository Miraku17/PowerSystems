import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Check if user has edit permission on approvals (can manage statuses)
    const canEdit = await hasPermission(supabase, user.id, "approvals", "edit");

    // Get user address and position for branch filtering
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("address, position_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const userAddress = userData.address;
    const isRequester = !canEdit;

    // Check if user's scope is "branch" for filtering
    let filterByAddress = false;
    if (canEdit && userData.position_id) {
      const { data: permScope } = await supabase
        .from("position_permissions")
        .select("scope, permissions!inner(module, action)")
        .eq("position_id", userData.position_id)
        .eq("permissions.module", "approvals")
        .eq("permissions.action", "edit")
        .maybeSingle();

      if (permScope?.scope === "branch") {
        filterByAddress = true;
      }
    }

    // Build query for JO requests
    let query = supabase
      .from("job_order_request_form")
      .select("*")
      .is("deleted_at", null);

    if (isRequester) {
      // Regular users see only their own JO requests
      query = query.eq("created_by", user.id);
    }
    // Users with edit permission see all records (branch-scoped users filtered below)

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching JO requests:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Fetch requester info for all unique created_by users
    const creatorIds = [...new Set((data || []).map((r: any) => r.created_by).filter(Boolean))];
    const { data: creators } = creatorIds.length > 0
      ? await supabase
          .from("users")
          .select("id, firstname, lastname, address")
          .in("id", creatorIds)
      : { data: [] };

    const creatorMap = new Map((creators || []).map((u: any) => [u.id, u]));

    // Normalize DB status to match frontend STATUS_OPTIONS casing
    const STATUS_MAP: Record<string, string> = {
      "pending": "Pending",
      "in-progress": "In-Progress",
      "close": "Close",
      "cancelled": "Cancelled",
    };

    // Map to frontend format
    let records = (data || []).map((record: any) => {
      const requester = creatorMap.get(record.created_by);
      const rawStatus = (record.status || "").trim();
      return {
        id: record.id,
        jo_number: record.shop_field_jo_number,
        full_customer_name: record.full_customer_name,
        date_prepared: record.date_prepared,
        created_at: record.created_at,
        status: STATUS_MAP[rawStatus.toLowerCase()] || rawStatus,
        requester_name: requester
          ? `${requester.firstname} ${requester.lastname}`
          : "Unknown",
        requester_address: requester?.address || "",
      };
    });

    // Filter by branch address if user has branch-scoped permission
    if (filterByAddress && userAddress) {
      records = records.filter((r: any) => r.requester_address === userAddress);
    }

    return NextResponse.json({
      success: true,
      data: records,
      meta: { canEdit, isRequester },
    });
  } catch (error: any) {
    console.error("API error fetching JO requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
