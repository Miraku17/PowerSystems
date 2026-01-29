import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeFilename } from "@/lib/utils";

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

    const reportId = formData.get('report_id') as string;
    const attachmentsToDelete = JSON.parse(formData.get('attachments_to_delete') as string || '[]');
    const existingAttachments = JSON.parse(formData.get('existing_attachments') as string || '[]');
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    if (attachmentsToDelete.length > 0) {
      for (const attachmentId of attachmentsToDelete) {
        const { data: attachment } = await supabase
          .from('engine_surface_pump_commissioning_attachments')
          .select('file_url')
          .eq('id', attachmentId)
          .single();

        if (attachment) {
          const filePath = getFilePathFromUrl(attachment.file_url);
          if (filePath) {
            try {
              await serviceSupabase.storage.from('service-reports').remove([filePath]);
            } catch (error) {
              console.error(`Error deleting file ${filePath}:`, error);
            }
          }
          await supabase.from('engine_surface_pump_commissioning_attachments').delete().eq('id', attachmentId);
        }
      }
    }

    for (const attachment of existingAttachments) {
      await supabase.from('engine_surface_pump_commissioning_attachments').update({ file_name: attachment.file_name }).eq('id', attachment.id);
    }

    if (attachmentFiles.length > 0) {
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          const filename = `engine-surface/commissioning/${Date.now()}-${sanitizeFilename(file.name)}`;
          const { error: uploadError } = await serviceSupabase.storage.from('service-reports').upload(filename, file, { cacheControl: '3600', upsert: false });
          if (uploadError) { console.error(`Error uploading file ${file.name}:`, uploadError); continue; }

          const { data: publicUrlData } = serviceSupabase.storage.from('service-reports').getPublicUrl(filename);
          const fileUrl = publicUrlData.publicUrl;

          const { error: attachmentError } = await supabase.from('engine_surface_pump_commissioning_attachments').insert([{ report_id: reportId, file_url: fileUrl, file_name: title || file.name, file_type: file.type, file_size: file.size }]);
          if (attachmentError) console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
        }
      }
    }

    return NextResponse.json({ message: 'Attachments updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
