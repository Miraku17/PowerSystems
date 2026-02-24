import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

const FORM_TABLE_MAP: Record<string, string> = {
  "job-order-request": "job_order_request_form",
  "daily-time-sheet": "daily_time_sheet",
  "deutz-commissioning": "deutz_commissioning_report",
  "deutz-service": "deutz_service_report",
  "engine-inspection-receiving": "engine_inspection_receiving_report",
  "submersible-pump-commissioning": "submersible_pump_commissioning_report",
  "submersible-pump-service": "submersible_pump_service_report",
  "submersible-pump-teardown": "submersible_pump_teardown_report",
  "electric-surface-pump-commissioning": "electric_surface_pump_commissioning_report",
  "electric-surface-pump-service": "electric_surface_pump_service_report",
  "electric-surface-pump-teardown": "electric_surface_pump_teardown_report",
  "engine-surface-pump-commissioning": "engine_surface_pump_commissioning_report",
  "engine-surface-pump-service": "engine_surface_pump_service_report",
  "engine-teardown": "engine_teardown_reports",
  "components-teardown-measuring": "components_teardown_measuring_report",
};

// PATCH /api/forms/restore
// Body: { formType: string, id: string }
export const PATCH = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Check restore permission
    const canRestore = await hasPermission(supabase, user.id, "form_records", "restore");
    if (!canRestore) {
      return NextResponse.json(
        { error: "You do not have permission to restore deleted records" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { formType, id } = body;

    if (!formType || !id) {
      return NextResponse.json(
        { error: "formType and id are required" },
        { status: 400 }
      );
    }

    const tableName = FORM_TABLE_MAP[formType];
    if (!tableName) {
      return NextResponse.json(
        { error: `Unknown form type: ${formType}` },
        { status: 400 }
      );
    }

    // Fetch the record to confirm it is actually soft-deleted
    const { data: record, error: fetchError } = await supabase
      .from(tableName)
      .select("id, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!record.deleted_at) {
      return NextResponse.json(
        { error: "Record is not deleted" },
        { status: 400 }
      );
    }

    // Restore: clear deleted_at and deleted_by
    const { data, error } = await supabase
      .from(tableName)
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error restoring record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit_logs
    await supabase.from("audit_logs").insert({
      table_name: tableName,
      record_id: id,
      action: "RESTORE",
      old_data: record,
      new_data: data && data[0] ? data[0] : null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: "Record restored successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing restore:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
