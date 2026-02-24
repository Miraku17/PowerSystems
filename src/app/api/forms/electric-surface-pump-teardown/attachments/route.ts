import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";

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

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('report_id');

    if (!reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('electric_surface_pump_teardown_attachments')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const serviceSupabase = supabase;
    const body = await request.json();

    const reportId = body.report_id;
    const attachmentsToDelete = body.attachments_to_delete || [];
    const existingAttachments = body.existing_attachments || [];
    const uploadedAttachments = body.uploaded_attachments || { motor_components: [], wet_end: [] };

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    // 1. Delete attachments marked for deletion
    if (attachmentsToDelete.length > 0) {
      for (const attachmentId of attachmentsToDelete) {
        // Fetch attachment to get file URL
        const { data: attachment } = await supabase
          .from('electric_surface_pump_teardown_attachments')
          .select('file_url')
          .eq('id', attachmentId)
          .single();

        if (attachment) {

          // Delete record from database
          await supabase
            .from('electric_surface_pump_teardown_attachments')
            .delete()
            .eq('id', attachmentId);
        }
      }
    }

    // 2. Update titles for existing attachments
    for (const attachment of existingAttachments) {
      await supabase
        .from('electric_surface_pump_teardown_attachments')
        .update({ file_name: attachment.file_name })
        .eq('id', attachment.id);
    }

    // 3. Insert new attachments (already uploaded to storage)
    // Motor components
    for (const attachment of uploadedAttachments.motor_components || []) {
      await supabase
        .from('electric_surface_pump_teardown_attachments')
        .insert([{
          report_id: reportId,
          file_url: attachment.url,
          file_name: attachment.title || attachment.fileName,
          file_type: attachment.fileType,
          file_size: attachment.fileSize,
          attachment_category: 'motor_components',
        }]);
    }

    // Wet end
    for (const attachment of uploadedAttachments.wet_end || []) {
      await supabase
        .from('electric_surface_pump_teardown_attachments')
        .insert([{
          report_id: reportId,
          file_url: attachment.url,
          file_name: attachment.title || attachment.fileName,
          file_type: attachment.fileType,
          file_size: attachment.fileSize,
          attachment_category: 'wet_end',
        }]);
    }

    return NextResponse.json({ message: 'Attachments updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
