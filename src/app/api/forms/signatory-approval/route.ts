import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

const ALLOWED_TABLES = [
  "deutz_commissioning_report",
  "deutz_service_report",
  "submersible_pump_service_report",
  "submersible_pump_commissioning_report",
  "submersible_pump_teardown_report",
  "engine_surface_pump_service_report",
  "engine_surface_pump_commissioning_report",
  "electric_surface_pump_service_report",
  "electric_surface_pump_commissioning_report",
  "electric_surface_pump_teardown_report",
  "engine_inspection_receiving_report",
  "engine_teardown_reports",
  "components_teardown_measuring_report",
];

const ALLOWED_FIELDS = ["noted_by", "approved_by"] as const;

export const PATCH = withAuth(async (request, { user }) => {
  try {
    const body = await request.json();
    const { table, recordId, field, checked } = body;

    if (!table || !recordId || !field || typeof checked !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: table, recordId, field, checked" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json(
        { error: "Invalid table name" },
        { status: 400 }
      );
    }

    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: "Invalid field. Must be 'noted_by' or 'approved_by'" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Fetch the record to verify the user is the designated signatory
    const userIdColumn = `${field}_user_id`;
    const checkedColumn = `${field}_checked`;

    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select(`${userIdColumn}, ${checkedColumn}`)
      .eq("id", recordId)
      .single();

    if (fetchError) {
      console.error("Error fetching record:", fetchError);
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    // Verify the current user is the designated signatory
    if ((record as any)[userIdColumn] !== user.id) {
      return NextResponse.json(
        { error: "Only the designated signatory can toggle this approval" },
        { status: 403 }
      );
    }

    // Update the checked column
    const { error: updateError } = await supabase
      .from(table)
      .update({ [checkedColumn]: checked })
      .eq("id", recordId);

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${field}_checked updated to ${checked}`,
    });
  } catch (error) {
    console.error("Error processing signatory approval:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
