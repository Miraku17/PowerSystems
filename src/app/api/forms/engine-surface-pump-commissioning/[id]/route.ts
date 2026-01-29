import { getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { isUserAdmin } from "@/lib/permissions";

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) return NextResponse.json({ error: "Record ID is required" }, { status: 400 });

    const serviceSupabase = supabase;

    const { data: record, error: fetchError } = await supabase
      .from("engine_surface_pump_commissioning_report")
      .select("commissioned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (record.deleted_at) return NextResponse.json({ error: "Record is already deleted" }, { status: 400 });

    const adminCheck = await isUserAdmin(serviceSupabase, user.id);
    if (!adminCheck) return NextResponse.json({ error: "Only administrators can delete records" }, { status: 403 });

    const { data, error } = await serviceSupabase
      .from("engine_surface_pump_commissioning_report")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await serviceSupabase.from('audit_logs').insert({
      table_name: 'engine_surface_pump_commissioning_report',
      record_id: id,
      action: 'DELETE',
      old_data: record,
      new_data: data && data[0] ? data[0] : null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Report deleted successfully", data }, { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
