import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    // Fetch report with attachments
    const { data, error } = await supabase
      .from("electric_surface_pump_teardown_report")
      .select(`
        *,
        electric_surface_pump_teardown_attachments(*)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Supabase error fetching electric surface pump teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching electric surface pump teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from("electric_surface_pump_teardown_report")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error deleting electric surface pump teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'electric_surface_pump_teardown_report',
      record_id: id,
      action: 'DELETE',
      old_data: data,
      new_data: null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Electric Surface Pump Teardown Report deleted successfully", data });
  } catch (error: any) {
    console.error("API error deleting electric surface pump teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});
