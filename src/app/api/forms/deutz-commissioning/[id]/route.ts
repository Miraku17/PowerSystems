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
    // URL format: /storage/v1/object/public/signatures/filename.png
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

    // First, fetch the record to check if it exists and is not already deleted
    const { data: record, error: fetchError } = await supabase
      .from("deutz_commissioning_report")
      .select("attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature, deleted_at, created_by")
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
      .from("deutz_commission_attachments")
      .select("file_url")
      .eq("report_id", id);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }


    // Soft delete: Update the record with deleted_at and deleted_by instead of deleting
    // Attachment records and signatures are preserved for potential restore
    const { data, error } = await supabase
      .from("deutz_commissioning_report")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error soft deleting record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'deutz_commissioning_report',
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
