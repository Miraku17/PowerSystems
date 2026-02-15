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
  if (!url) return;
  const filePath = getFilePathFromUrl(url);
  if (!filePath) return;

  try {
    const { error } = await serviceSupabase.storage
      .from('signatures')
      .remove([filePath]);

    if (error) {
      console.error(`Error deleting signature ${filePath}:`, error);
    }
  } catch (e) {
    console.error(`Exception deleting signature ${filePath}:`, e);
  }
};

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

    // Fetch the record to get signature URLs and check state
    const { data: record, error: fetchError } = await supabase
      .from("electric_surface_pump_teardown_report")
      .select("teardowned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching record:", fetchError);
      return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
    }

    if (record.deleted_at) {
      return NextResponse.json({ error: "Record is already deleted" }, { status: 400 });
    }

    const canDelete = await hasPermission(supabase, user.id, "form_records", "delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "You do not have permission to delete records" },
        { status: 403 }
      );
    }

    // Fetch all attachments for this report
    const { data: attachments, error: attachmentsError } = await supabase
      .from("electric_surface_pump_teardown_attachments")
      .select("file_url")
      .eq("report_id", id);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }

    // Delete attachment images from storage
    if (attachments && attachments.length > 0) {
      await Promise.all(attachments.map(async (attachment) => {
        const filePath = getFilePathFromUrl(attachment.file_url);
        if (!filePath) return;
        try {
          const { error } = await supabase.storage.from('service-reports').remove([filePath]);
          if (error) console.error(`Error deleting attachment ${filePath}:`, error);
        } catch (e) {
          console.error(`Exception deleting attachment ${filePath}:`, e);
        }
      }));
    }

    // Delete attachment records from database
    const { error: deleteAttachmentsError } = await supabase
      .from("electric_surface_pump_teardown_attachments")
      .delete()
      .eq("report_id", id);

    if (deleteAttachmentsError) {
      console.error("Error deleting attachment records:", deleteAttachmentsError);
    }

    // Delete signatures from storage
    await Promise.all([
      deleteSignature(supabase, record.teardowned_by_signature),
      deleteSignature(supabase, record.checked_approved_by_signature),
      deleteSignature(supabase, record.noted_by_signature),
      deleteSignature(supabase, record.acknowledged_by_signature),
    ]);

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
      old_data: record,
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
