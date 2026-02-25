import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

// All form tables that reference a JO number and their column names
const FORM_TABLES_WITH_JO = [
  { table: "daily_time_sheet", column: "job_number" },
  { table: "deutz_commissioning_report", column: "job_order_no" },
  { table: "deutz_service_report", column: "job_order" },
  { table: "engine_inspection_receiving_report", column: "jo_number" },
  { table: "engine_surface_pump_commissioning_report", column: "job_order" },
  { table: "engine_surface_pump_service_report", column: "job_order" },
  { table: "engine_teardown_reports", column: "job_number" },
  { table: "electric_surface_pump_commissioning_report", column: "job_order" },
  { table: "electric_surface_pump_service_report", column: "job_order" },
  { table: "electric_surface_pump_teardown_report", column: "job_order" },
  { table: "submersible_pump_commissioning_report", column: "job_order" },
  { table: "submersible_pump_service_report", column: "job_order" },
  { table: "submersible_pump_teardown_report", column: "job_order" },
  { table: "components_teardown_measuring_report", column: "job_order_no" },
];

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Fetch all approved JOs
    const { data, error } = await supabase
      .from("job_order_request_form")
      .select("id, shop_field_jo_number, full_customer_name, address")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching job orders:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Collect all JO numbers already used in any form
    const usedJONumbers = new Set<string>();

    await Promise.all(
      FORM_TABLES_WITH_JO.map(async ({ table, column }) => {
        const { data: rows } = await supabase
          .from(table)
          .select(column)
          .is("deleted_at", null);
        if (rows) {
          rows.forEach((row: any) => {
            const val = row[column];
            if (val) usedJONumbers.add(val);
          });
        }
      })
    );

    // Filter out JOs that are already used
    const availableJOs = (data || []).filter(
      (jo) => !usedJONumbers.has(jo.shop_field_jo_number)
    );

    return NextResponse.json({ success: true, data: availableJOs });
  } catch (error: any) {
    console.error("API error fetching job orders:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
