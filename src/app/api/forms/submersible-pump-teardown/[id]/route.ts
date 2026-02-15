import { getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
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
      .select("teardowned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
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
    const canDelete = await hasPermission(serviceSupabase, user.id, "form_records", "delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "You do not have permission to delete records" },
        { status: 403 }
      );
    }

    // Fetch all attachments for this report
    const { data: attachments, error: attachmentsError } = await supabase
      .from("submersible_pump_teardown_attachments")
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
          const { error } = await serviceSupabase.storage.from('service-reports').remove([filePath]);
          if (error) console.error(`Error deleting attachment ${filePath}:`, error);
        } catch (e) {
          console.error(`Exception deleting attachment ${filePath}:`, e);
        }
      }));
    }

    // Delete attachment records from database
    const { error: deleteAttachmentsError } = await supabase
      .from("submersible_pump_teardown_attachments")
      .delete()
      .eq("report_id", id);

    if (deleteAttachmentsError) {
      console.error("Error deleting attachment records:", deleteAttachmentsError);
    }

    // Delete signatures from storage
    await Promise.all([
      deleteSignature(serviceSupabase, record.teardowned_by_signature),
      deleteSignature(serviceSupabase, record.checked_approved_by_signature),
      deleteSignature(serviceSupabase, record.noted_by_signature),
      deleteSignature(serviceSupabase, record.acknowledged_by_signature),
    ]);

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
