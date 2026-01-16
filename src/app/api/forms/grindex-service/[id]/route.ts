import { supabase } from "@/lib/supabase";
import { getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";

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
  if (!url) return;
  const filePath = getFilePathFromUrl(url);
  if (!filePath) return;

  try {
    const { error } = await serviceSupabase.storage
      .from('signatures')
      .remove([filePath]);

    if (error) {
      console.error(`Error deleting signature ${filePath}:`, error);
    } else {
      console.log(`Successfully deleted signature: ${filePath}`);
    }
  } catch (e) {
    console.error(`Exception deleting signature ${filePath}:`, e);
  }
};

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = getServiceSupabase();

    // First, fetch the record to check if it exists and is not already deleted
    const { data: record, error: fetchError } = await supabase
      .from("grindex_service_forms")
      .select("service_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature, deleted_at, created_by")
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

    // Permission check: Get user's role
    const { data: userData, error: userError } = await serviceSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("Error fetching user role:", userError);
      return NextResponse.json({ error: "Failed to verify user permissions" }, { status: 500 });
    }

    // Check if user can delete this record (admin can delete all, users can only delete their own)
    const isAdmin = userData?.role === "admin";
    const isOwner = record.created_by === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You do not have permission to delete this record" },
        { status: 403 }
      );
    }

    // Fetch all attachments for this form
    const { data: attachments, error: attachmentsError } = await supabase
      .from("grindex_service_attachments")
      .select("file_url")
      .eq("form_id", id);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
    }

    // Delete attachment images from storage
    if (attachments && attachments.length > 0) {
      const deleteAttachmentPromises = attachments.map(async (attachment) => {
        const filePath = getFilePathFromUrl(attachment.file_url);
        if (!filePath) return;

        try {
          const { error } = await serviceSupabase.storage
            .from('service-reports')
            .remove([filePath]);

          if (error) {
            console.error(`Error deleting attachment ${filePath}:`, error);
          } else {
            console.log(`Successfully deleted attachment: ${filePath}`);
          }
        } catch (e) {
          console.error(`Exception deleting attachment ${filePath}:`, e);
        }
      });

      await Promise.all(deleteAttachmentPromises);
    }

    // Delete attachment records from database
    const { error: deleteAttachmentsError } = await supabase
      .from("grindex_service_attachments")
      .delete()
      .eq("form_id", id);

    if (deleteAttachmentsError) {
      console.error("Error deleting attachment records:", deleteAttachmentsError);
    }

    // Soft delete: Update the record with deleted_at and deleted_by instead of deleting
    const { data, error } = await supabase
      .from("grindex_service_forms")
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
      table_name: 'grindex_service_forms',
      record_id: id,
      action: 'DELETE',
      old_data: record,
      new_data: data && data[0] ? data[0] : null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Grindex Service Form deleted successfully", data },
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
