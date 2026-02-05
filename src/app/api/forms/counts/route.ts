import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

// Map form types to their database table names
const formTypeTables: Record<string, string> = {
  "job-order-request": "job_order_request_form",
  "daily-time-sheet": "daily_time_sheet",
  "deutz-service": "deutz_service_report",
  "deutz-commissioning": "deutz_commissioning_report",
  "submersible-pump-commissioning": "submersible_pump_commissioning_report",
  "submersible-pump-service": "submersible_pump_service_report",
  "submersible-pump-teardown": "submersible_pump_teardown_report",
  "electric-surface-pump-commissioning": "electric_surface_pump_commissioning_report",
  "electric-surface-pump-service": "electric_surface_pump_service_report",
  "engine-surface-pump-service": "engine_surface_pump_service_report",
  "engine-surface-pump-commissioning": "engine_surface_pump_commissioning_report",
  "engine-teardown": "engine_teardown_reports",
  "electric-surface-pump-teardown": "electric_surface_pump_teardown_report",
  "engine-inspection-receiving": "engine_inspection_receiving_report",
  "components-teardown-measuring": "components_teardown_measuring_report",
};

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const counts: Record<string, number> = {};

    // Fetch count for each form type
    await Promise.all(
      Object.entries(formTypeTables).map(async ([formType, tableName]) => {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select("*", { count: "exact", head: true })
            .is("deleted_at", null);

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
