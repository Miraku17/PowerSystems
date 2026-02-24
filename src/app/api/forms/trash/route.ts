import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// Map of form type slug → { table, displayName }
const FORM_TABLE_MAP: Record<string, { table: string; name: string }> = {
  "job-order-request": { table: "job_order_request_form", name: "Job Order Request" },
  "daily-time-sheet": { table: "daily_time_sheet", name: "Daily Time Sheet" },
  "deutz-commissioning": { table: "deutz_commissioning_report", name: "Deutz Commissioning Report" },
  "deutz-service": { table: "deutz_service_report", name: "Deutz Service Report" },
  "engine-inspection-receiving": { table: "engine_inspection_receiving_report", name: "Engine Inspection / Receiving Report" },
  "submersible-pump-commissioning": { table: "submersible_pump_commissioning_report", name: "Submersible Pump Commissioning Report" },
  "submersible-pump-service": { table: "submersible_pump_service_report", name: "Submersible Pump Service Report" },
  "submersible-pump-teardown": { table: "submersible_pump_teardown_report", name: "Submersible Pump Teardown Report" },
  "electric-surface-pump-commissioning": { table: "electric_surface_pump_commissioning_report", name: "Electric Surface Pump Commissioning Report" },
  "electric-surface-pump-service": { table: "electric_surface_pump_service_report", name: "Electric Surface Pump Service Report" },
  "electric-surface-pump-teardown": { table: "electric_surface_pump_teardown_report", name: "Electric Surface Pump Teardown Report" },
  "engine-surface-pump-commissioning": { table: "engine_surface_pump_commissioning_report", name: "Engine Surface Pump Commissioning Report" },
  "engine-surface-pump-service": { table: "engine_surface_pump_service_report", name: "Engine Surface Pump Service Report" },
  "engine-teardown": { table: "engine_teardown_reports", name: "Engine Teardown Report" },
  "components-teardown-measuring": { table: "components_teardown_measuring_report", name: "Components Teardown Measuring Report" },
};

// Helper: pick the best job order field from a raw record
function extractJobOrder(record: Record<string, any>): string {
  return (
    record.shop_field_jo_number ||
    record.jo_number ||
    record.job_order_no ||
    record.job_number ||
    record.job_order ||
    "N/A"
  );
}

// Helper: pick the best customer field from a raw record
function extractCustomer(record: Record<string, any>): string {
  return (
    record.full_customer_name ||
    record.customer_name ||
    record.customer ||
    "N/A"
  );
}

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Only users with form_records:restore permission can view trash
    const canRestore = await hasPermission(supabase, user.id, "form_records", "restore");
    if (!canRestore) {
      return NextResponse.json(
        { error: "You do not have permission to view deleted records" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const formTypeFilter = searchParams.get("formType"); // optional filter

    const formTypesToQuery = formTypeFilter && FORM_TABLE_MAP[formTypeFilter]
      ? [formTypeFilter]
      : Object.keys(FORM_TABLE_MAP);

    // Fetch deleted records from each table in parallel
    const results = await Promise.all(
      formTypesToQuery.map(async (formType) => {
        const { table, name } = FORM_TABLE_MAP[formType];
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false });

        if (error) {
          console.error(`Error fetching deleted records from ${table}:`, error);
          return [];
        }

        return (data || []).map((record: Record<string, any>) => ({
          id: record.id,
          formType,
          formName: name,
          jobOrder: extractJobOrder(record),
          customer: extractCustomer(record),
          createdAt: record.created_at,
          deletedAt: record.deleted_at,
          deletedByUserId: record.deleted_by,
          createdByUserId: record.created_by,
        }));
      })
    );

    // Flatten all results and sort by deletedAt descending
    const allDeleted = results
      .flat()
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    // Fetch user names for deleted_by references
    const userIds = [...new Set(allDeleted.map((r) => r.deletedByUserId).filter(Boolean))];
    let userMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, firstname, lastname, username")
        .in("id", userIds);

      if (users) {
        users.forEach((u: any) => {
          userMap[u.id] =
            u.firstname && u.lastname
              ? `${u.firstname} ${u.lastname}`
              : u.username || u.id;
        });
      }
    }

    const enriched = allDeleted.map((r) => ({
      ...r,
      deletedByName: r.deletedByUserId ? (userMap[r.deletedByUserId] || r.deletedByUserId) : "Unknown",
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching trash:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
