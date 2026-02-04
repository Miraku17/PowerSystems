import { NextResponse } from 'next/response';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeFilename } from "@/lib/utils";

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

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const serviceSupabase = supabase;
    const formData = await request.formData();

    const jobOrderId = formData.get('job_order_id') as string;
    const attachmentsToDelete = JSON.parse(formData.get('attachments_to_delete') as string || '[]');
    const existingAttachments = JSON.parse(formData.get('existing_attachments') as string || '[]');
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentDescriptions = formData.getAll('attachment_descriptions') as string[];

    // 1. Delete attachments marked for deletion
    if (attachmentsToDelete.length > 0) {
      for (const attachmentId of attachmentsToDelete) {
        // Fetch attachment to get file URL
        const { data: attachment } = await supabase
          .from('job_order_attachments')
          .select('file_url')
          .eq('id', attachmentId)
          .single();

        if (attachment) {
          // Delete file from storage
          const filePath = getFilePathFromUrl(attachment.file_url);
          if (filePath) {
            try {
              await serviceSupabase.storage
                .from('service-reports')
                .remove([filePath]);
              console.log(`Deleted file from storage: ${filePath}`);
            } catch (error) {
              console.error(`Error deleting file ${filePath}:`, error);
            }
          }

          // Delete record from database
          await supabase
            .from('job_order_attachments')
            .delete()
            .eq('id', attachmentId);
        }
      }
    }

    // 2. Update descriptions for existing attachments
    for (const attachment of existingAttachments) {
      await supabase
        .from('job_order_attachments')
        .update({ description: attachment.description })
        .eq('id', attachment.id);
    }

    // 3. Upload and save new attachments
    if (attachmentFiles.length > 0) {
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const description = attachmentDescriptions[i] || '';

        if (file && file.size > 0) {
          // Upload to service-reports/job-order bucket
          const filename = `job-order/${Date.now()}-${sanitizeFilename(file.name)}`;

          const { error: uploadError } = await serviceSupabase.storage
            .from('service-reports')
            .upload(filename, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            continue;
          }

          const { data: publicUrlData } = serviceSupabase.storage
            .from('service-reports')
            .getPublicUrl(filename);

          const fileUrl = publicUrlData.publicUrl;

          // Insert into job_order_attachments table
          const { error: attachmentError } = await supabase
            .from('job_order_attachments')
            .insert([
              {
                job_order_id: jobOrderId,
                file_url: fileUrl,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                description: description,
              },
            ]);

          if (attachmentError) {
            console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
          }
        }
      }
    }

    return NextResponse.json({ message: 'Attachments updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
