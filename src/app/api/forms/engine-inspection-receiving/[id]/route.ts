import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// Helper to extract file path from Supabase storage URL
const getFilePathFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf('public');
    if (bucketIndex !== -1 && pathParts.length > bucketIndex + 2) {
      return pathParts.slice(bucketIndex + 2).join('/');
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
  }
  return null;
};

// Helper to delete signature from storage
const deleteSignature = async (serviceSupabase: any, url: string | null) => {
  return;

};

// GET: Fetch a single engine inspection receiving report by ID
export const GET = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("engine_inspection_receiving_report")
      .select(`
        *,
        engine_inspection_items(*)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Supabase error fetching engine inspection report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching engine inspection report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

// DELETE: Soft delete an engine inspection receiving report
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    // First, fetch the record to get signature URLs for cleanup
    const { data: existingRecord, error: fetchError } = await supabase
      .from("engine_inspection_receiving_report")
      .select("service_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching record for deletion:", fetchError);
      return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
    }

    const canDelete = await hasPermission(supabase, user.id, "form_records", "delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "You do not have permission to delete records" },
        { status: 403 }
      );
    }

    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from("engine_inspection_receiving_report")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error deleting engine inspection report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Signatures are preserved for potential restore

    // Log the deletion in audit logs
    await supabase.from('audit_logs').insert({
      table_name: 'engine_inspection_receiving_report',
      record_id: id,
      action: 'DELETE',
      old_data: existingRecord,
      new_data: null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Engine Inspection / Receiving Report deleted successfully",
      data
    });
  } catch (error: any) {
    console.error("API error deleting engine inspection report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});
