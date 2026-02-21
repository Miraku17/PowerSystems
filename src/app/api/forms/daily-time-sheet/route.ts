import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeFilename } from "@/lib/utils";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("daily_time_sheet")
      .select("*, daily_time_sheet_entries(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching daily time sheets:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_number,
      data: { ...record, status: record.status || "Pending" },
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      companyForm: {
        id: "daily-time-sheet",
        name: "Daily Time Sheet",
        formType: "daily-time-sheet",
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching daily time sheets:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

const uploadSignature = async (serviceSupabase: any, base64Data: string, fileName: string) => {
  if (!base64Data) return '';
  if (base64Data.startsWith('http')) return base64Data;
  if (!base64Data.startsWith('data:image')) return '';

  try {
    const base64Image = base64Data.split(';base64,').pop();
    if (!base64Image) return '';

    const buffer = Buffer.from(base64Image, 'base64');

    const { data, error } = await serviceSupabase.storage
      .from('signatures')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${fileName}:`, error);
      return '';
    }

    const { data: { publicUrl } } = serviceSupabase.storage
      .from('signatures')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (e) {
    console.error(`Exception uploading ${fileName}:`, e);
    return '';
  }
};

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const serviceSupabase = supabase;

    const getString = (key: string) => formData.get(key) as string || '';

    // Extract all fields
    const job_number = getString('job_number');
    const date = getString('date');
    const customer = getString('customer');
    const address = getString('address');
    const total_manhours = getString('total_manhours');
    const grand_total_manhours = getString('grand_total_manhours');
    const performed_by_name = getString('performed_by_name');
    const approved_by_name = getString('approved_by_name');
    const total_srt = getString('total_srt');
    const actual_manhour = getString('actual_manhour');
    const performance = getString('performance');
    const service_office_note = getString('service_office_note');
    const checked_by = getString('checked_by');
    const service_coordinator = getString('service_coordinator');
    const approved_by_service = getString('approved_by_service');
    const service_manager = getString('service_manager');
    const job_order_request_id = getString('job_order_request_id');
    const status = getString('status') || 'Pending';
    const entriesJson = getString('entries');

    // Signatures
    const rawPerformedBySignature = getString('performed_by_signature');
    const rawApprovedBySignature = getString('approved_by_signature');

    // Handle Attachment Uploads
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Process Signatures
    const timestamp = Date.now();
    const performed_by_signature = await uploadSignature(
      serviceSupabase,
      rawPerformedBySignature,
      `daily-time-sheet/performed-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature,
      `daily-time-sheet/approved-by-${timestamp}.png`
    );

    // Insert main record
    const { data, error } = await supabase
      .from("daily_time_sheet")
      .insert([
        {
          job_number,
          job_order_request_id: job_order_request_id || null,
          date: date || null,
          customer,
          address,
          total_manhours: total_manhours ? parseFloat(total_manhours) : null,
          grand_total_manhours: grand_total_manhours ? parseFloat(grand_total_manhours) : null,
          performed_by_name,
          performed_by_signature,
          approved_by_name,
          approved_by_signature,
          total_srt: total_srt ? parseFloat(total_srt) : null,
          actual_manhour: actual_manhour ? parseFloat(actual_manhour) : null,
          performance: performance ? parseFloat(performance) : null,
          service_office_note,
          checked_by,
          service_coordinator,
          approved_by_service,
          service_manager,
          status,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert time entries if any
    if (data && data[0] && entriesJson) {
      try {
        const entries = JSON.parse(entriesJson);
        if (Array.isArray(entries) && entries.length > 0) {
          const entryRecords = entries.map((entry: any, index: number) => ({
            daily_time_sheet_id: data[0].id,
            entry_date: entry.entry_date || null,
            start_time: entry.start_time || null,
            stop_time: entry.stop_time || null,
            total_hours: entry.total_hours ? parseFloat(entry.total_hours) : null,
            job_description: entry.job_description || '',
            sort_order: index,
            expense_breakfast: entry.expense_breakfast ? parseFloat(entry.expense_breakfast) : 0,
            expense_lunch: entry.expense_lunch ? parseFloat(entry.expense_lunch) : 0,
            expense_dinner: entry.expense_dinner ? parseFloat(entry.expense_dinner) : 0,
            expense_transport: entry.expense_transport ? parseFloat(entry.expense_transport) : 0,
            expense_lodging: entry.expense_lodging ? parseFloat(entry.expense_lodging) : 0,
            expense_others: entry.expense_others ? parseFloat(entry.expense_others) : 0,
            expense_total: entry.expense_total ? parseFloat(entry.expense_total) : 0,
            expense_remarks: entry.expense_remarks || '',
          }));

          const { error: entriesError } = await supabase
            .from("daily_time_sheet_entries")
            .insert(entryRecords);

          if (entriesError) {
            console.error("Error inserting entries:", entriesError);
          }
        }
      } catch (e) {
        console.error("Error parsing entries JSON:", e);
      }
    }

    // Upload attachments
    if (attachmentFiles.length > 0 && data && data[0]) {
      const formId = data[0].id;

      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          const filename = `daily-time-sheet/${Date.now()}-${sanitizeFilename(file.name)}`;

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

          // Insert into attachments table
          const { error: attachmentError } = await supabase
            .from('daily_time_sheet_attachments')
            .insert([
              {
                daily_time_sheet_id: formId,
                file_url: fileUrl,
                file_name: title || file.name,
                file_type: file.type,
                file_size: file.size,
                description: title,
              },
            ]);

          if (attachmentError) {
            console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
          }
        }
      }
    }

    // Log to audit_logs
    if (data && data[0]) {
      await supabase.from('audit_logs').insert({
        table_name: 'daily_time_sheet',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { message: "Daily Time Sheet submitted successfully", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
