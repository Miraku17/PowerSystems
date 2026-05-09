import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { getReadScopeFilter } from "@/lib/permissions";

// Map form types to their database table names (and optional report_kind filter)
type FormTypeFilter = { table: string; kindFilter?: 'teardown' | 'buildup' };

const formTypeTables: Record<string, FormTypeFilter> = {
  "job-order-request": { table: "job_order_request_form" },
  "daily-time-sheet": { table: "daily_time_sheet" },
  "deutz-service": { table: "deutz_service_report" },
  "deutz-commissioning": { table: "deutz_commissioning_report" },
  "submersible-pump-commissioning": { table: "submersible_pump_commissioning_report" },
  "submersible-pump-service": { table: "submersible_pump_service_report" },
  "submersible-pump-teardown": { table: "submersible_pump_teardown_report" },
  "electric-surface-pump-commissioning": { table: "electric_surface_pump_commissioning_report" },
  "electric-surface-pump-service": { table: "electric_surface_pump_service_report" },
  "engine-surface-pump-service": { table: "engine_surface_pump_service_report" },
  "engine-surface-pump-commissioning": { table: "engine_surface_pump_commissioning_report" },
  "engine-teardown": { table: "engine_teardown_reports" },
  "electric-surface-pump-teardown": { table: "electric_surface_pump_teardown_report" },
  "engine-inspection-receiving": { table: "engine_inspection_receiving_report" },
  "components-teardown-measuring": { table: "components_teardown_measuring_report", kindFilter: "teardown" },
  "components-buildup-report": { table: "components_teardown_measuring_report", kindFilter: "buildup" },
};

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const allowedUserIds = await getReadScopeFilter(supabase, user.id);

    // No read permission → all counts are 0
    if (allowedUserIds !== null && allowedUserIds.length === 0) {
      const counts: Record<string, number> = {};
      for (const formType of Object.keys(formTypeTables)) {
        counts[formType] = 0;
      }
      return NextResponse.json({ counts });
    }

    const counts: Record<string, number> = {};

    // Fetch count for each form type
    await Promise.all(
      Object.entries(formTypeTables).map(async ([formType, { table: tableName, kindFilter }]) => {
        try {
          let query = supabase
            .from(tableName)
            .select("*", { count: "exact", head: true })
            .is("deleted_at", null);

          if (allowedUserIds !== null) {
            query = query.in("created_by", allowedUserIds);
          }

          if (kindFilter) {
            query = query.eq("report_kind", kindFilter);
          }

          const { count, error } = await query;

          if (error) {
            console.error(`Error fetching count for ${formType}:`, error);
            counts[formType] = 0;
          } else {
            counts[formType] = count || 0;
          }
        } catch (err) {
          console.error(`Error processing ${formType}:`, err);
          counts[formType] = 0;
        }
      })
    );

    return NextResponse.json({ counts });
  } catch (error: any) {
    console.error("Error fetching form counts:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch form counts" },
      { status: 500 }
    );
  }
});
