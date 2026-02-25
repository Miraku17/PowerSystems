import { NextResponse } from 'next/server';
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

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('form_id');

    if (!formId) {
      return NextResponse.json({ error: 'form_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('deutz_commission_attachments')
      .select('*')
      .eq('form_id', formId)
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

    // Detect content type to handle both JSON and FormData formats
    const contentType = request.headers.get('content-type') || '';
    const isJsonFormat = contentType.includes('application/json');

    let reportId: string;
    let attachmentsToDelete: string[];
    let existingAttachments: any[];
    let uploadedNewAttachments: any[] = [];

    // Legacy FormData fields
    let attachmentFiles: File[] = [];
    let attachmentTitles: string[] = [];

    if (isJsonFormat) {
      // New format: JSON with pre-uploaded URLs
      const body = await request.json();
      reportId = body.form_id || body.report_id;
      attachmentsToDelete = body.attachments_to_delete || [];
      existingAttachments = body.existing_attachments || [];
      uploadedNewAttachments = body.uploaded_new_attachments || [];
    } else {
      // Legacy format: FormData with files
      const formData = await request.formData();
      reportId = formData.get('form_id') as string;
      attachmentsToDelete = JSON.parse(formData.get('attachments_to_delete') as string || '[]');
      existingAttachments = JSON.parse(formData.get('existing_attachments') as string || '[]');
      attachmentFiles = formData.getAll('attachment_files') as File[];
      attachmentTitles = formData.getAll('attachment_titles') as string[];
    }

    // 1. Delete attachments marked for deletion
    if (attachmentsToDelete.length > 0) {
      for (const attachmentId of attachmentsToDelete) {
        // Fetch attachment to get file URL
        const { data: attachment } = await supabase
          .from('deutz_commission_attachments')
          .select('file_url')
          .eq('id', attachmentId)
          .single();

        if (attachment) {

          // Delete record from database
          await supabase
            .from('deutz_commission_attachments')
            .delete()
            .eq('id', attachmentId);
        }
      }
    }

    // 2. Update titles for existing attachments
    for (const attachment of existingAttachments) {
      await supabase
        .from('deutz_commission_attachments')
        .update({ file_title: attachment.file_title })
        .eq('id', attachment.id);
    }

    // 3. Save new attachments from pre-uploaded URLs (JSON format)
    if (uploadedNewAttachments.length > 0) {
      for (const attachment of uploadedNewAttachments) {
        const { error: attachmentError } = await supabase
          .from('deutz_commission_attachments')
          .insert([
            {
              form_id: reportId,
              file_url: attachment.url,
              file_title: attachment.title || attachment.fileName,
            },
          ]);

        if (attachmentError) {
          console.error(`Error inserting attachment record:`, attachmentError);
        }
      }
    }

    // 4. Legacy: Upload and save new attachments from FormData
    if (attachmentFiles.length > 0) {
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          // Upload to service-reports/deutz/commission bucket
          const filename = `deutz/commission/${Date.now()}-${sanitizeFilename(file.name)}`;

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

          // Insert into deutz_commission_attachments table
          const { error: attachmentError } = await supabase
            .from('deutz_commission_attachments')
            .insert([
              {
                form_id: reportId,
                file_url: fileUrl,
                file_title: title,
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
