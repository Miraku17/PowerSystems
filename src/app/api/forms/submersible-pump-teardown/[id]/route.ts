import { getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { isUserAdmin } from "@/lib/permissions";

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = supabase;

    // Fetch the record to check if it exists and is not already deleted
    const { data: record, error: fetchError } = await supabase
      .from("submersible_pump_teardown_report")
      .select("*, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Check if record is already soft-deleted
    if (record.deleted_at) {
      return NextResponse.json(
        { error: "Record is already deleted" },
        { status: 400 }
      );
    }

    // Permission check - only admins can delete
    const adminCheck = await isUserAdmin(serviceSupabase, user.id);
    if (!adminCheck) {
      return NextResponse.json(
        { error: "Only administrators can delete records" },
        { status: 403 }
      );
    }

    // Soft delete: Update the record with deleted_at (using serviceSupabase to bypass RLS)
    const { data, error } = await serviceSupabase
      .from("submersible_pump_teardown_report")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error soft deleting record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit_logs
    await serviceSupabase.from('audit_logs').insert({
      table_name: 'submersible_pump_teardown_report',
      record_id: id,
      action: 'DELETE',
      old_data: record,
      new_data: data && data[0] ? data[0] : null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Report deleted successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
