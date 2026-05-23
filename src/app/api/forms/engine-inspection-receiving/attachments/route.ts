import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeFilename } from "@/lib/utils";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('report_id');

    if (!reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('engine_inspection_attachments')
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

    const contentType = request.headers.get('content-type') || '';
    const isJsonFormat = contentType.includes('application/json');

    let reportId: string;
    let attachmentsToDelete: string[];
    let existingAttachments: any[];
    let uploadedNewAttachments: any[] = [];
    let attachmentFiles: File[] = [];
    let attachmentTitles: string[] = [];

    if (isJsonFormat) {
      const body = await request.json();
      reportId = body.report_id;
      attachmentsToDelete = body.attachments_to_delete || [];
      existingAttachments = body.existing_attachments || [];
      uploadedNewAttachments = body.uploaded_new_attachments || [];
    } else {
      const formData = await request.formData();
      reportId = formData.get('report_id') as string;
      attachmentsToDelete = JSON.parse(formData.get('attachments_to_delete') as string || '[]');
      existingAttachments = JSON.parse(formData.get('existing_attachments') as string || '[]');
      attachmentFiles = formData.getAll('attachment_files') as File[];
      attachmentTitles = formData.getAll('attachment_titles') as string[];
    }

    if (attachmentsToDelete.length > 0) {
      for (const attachmentId of attachmentsToDelete) {
        await supabase
          .from('engine_inspection_attachments')
          .delete()
          .eq('id', attachmentId);
      }
    }

    for (const attachment of existingAttachments) {
      await supabase
        .from('engine_inspection_attachments')
        .update({ description: attachment.description })
        .eq('id', attachment.id);
    }

    if (uploadedNewAttachments.length > 0) {
      for (const attachment of uploadedNewAttachments) {
        await supabase
          .from('engine_inspection_attachments')
          .insert([{
            report_id: reportId,
            file_url: attachment.url,
            file_name: attachment.fileName || attachment.title,
            file_type: attachment.fileType || null,
            file_size: attachment.fileSize || null,
            description: attachment.title || '',
          }]);
      }
    }

    if (attachmentFiles.length > 0) {
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';
        if (file && file.size > 0) {
          const filename = `engine-inspection-receiving/${Date.now()}-${sanitizeFilename(file.name)}`;
          const { error: uploadError } = await supabase.storage
            .from('service-reports')
            .upload(filename, file, { cacheControl: '3600', upsert: false });
          if (uploadError) { console.error(`Error uploading ${file.name}:`, uploadError); continue; }
          const { data: publicUrlData } = supabase.storage.from('service-reports').getPublicUrl(filename);
          await supabase
            .from('engine_inspection_attachments')
            .insert([{
              report_id: reportId,
              file_url: publicUrlData.publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              description: title,
            }]);
        }
      }
    }

    return NextResponse.json({ message: 'Attachments updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
