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

    // First, fetch the record to get signature URLs
    const { data: record, error: fetchError } = await supabase
      .from("deutz_service_report")
      .select("attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Delete signature files from storage
    const serviceSupabase = getServiceSupabase();
    await Promise.all([
      deleteSignature(serviceSupabase, record.attending_technician_signature),
      deleteSignature(serviceSupabase, record.noted_by_signature),
      deleteSignature(serviceSupabase, record.approved_by_signature),
      deleteSignature(serviceSupabase, record.acknowledged_by_signature),
    ]);

    // Now delete the database record
    const { data, error } = await supabase
      .from("deutz_service_report")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
