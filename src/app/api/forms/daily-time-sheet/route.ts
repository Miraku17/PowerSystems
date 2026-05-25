import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { getReadScopeFilter, hasPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";
import { getUserAddresses, getUserDisplayNames, getUserDisplayName } from "@/lib/users";
import { assertJoInProgress, assertJoInProgressById } from "@/lib/jo-status";
import { createNotifications } from "@/lib/notifications";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const canAccessDts = await hasPermission(supabase, user.id, "dts", "access");
    if (!canAccessDts) {
      return NextResponse.json(
        { error: "You do not have permission to access Daily Time Sheet" },
        { status: 403 }
      );
    }

    const allowedUserIds = await getReadScopeFilter(supabase, user.id);

    if (allowedUserIds !== null && allowedUserIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    let query = supabase
      .from("daily_time_sheet")
      .select("*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (allowedUserIds !== null) {
      query = query.in("created_by", allowedUserIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error fetching daily time sheets:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const creatorIds = [...new Set(data.map((r: any) => r.created_by).filter(Boolean))];
    const addressMap = await getUserAddresses(supabase, creatorIds as string[]);

    const updaterIds = [...new Set(data.map((r: any) => r.updated_by).filter(Boolean))];
    const nameMap = await getUserDisplayNames(supabase, [...new Set([...creatorIds, ...updaterIds])] as string[]);
    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_number,
      data: { ...record, status: record.status || "Pending" },
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      created_by_address: addressMap[record.created_by] || null,
updated_by_name: record.updated_by ? (nameMap[record.updated_by] || "") : "",
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

    const canAccessDts = await hasPermission(supabase, user.id, "dts", "access");
    if (!canAccessDts) {
      return NextResponse.json(
        { error: "You do not have permission to access Daily Time Sheet" },
        { status: 403 }
      );
    }

    // Check content type to determine if it's new format (JSON) or old format (FormData)
    const contentType = request.headers.get('content-type') || '';
    const isNewFormat = contentType.includes('application/json');

    let formData: FormData | null = null;
    let jsonBody: any = null;

    if (isNewFormat) {
      jsonBody = await request.json();
    } else {
      formData = await request.formData();
    }

    const serviceSupabase = supabase;

    const getString = (key: string) => {
      if (isNewFormat) return jsonBody[key] || '';
      return formData!.get(key) as string || '';
    };

    // Extract fields (three-signatory redesign — see 2026-05-25-daily-timesheet-redesign spec)
    const job_number              = getString('job_number');
    const date                    = getString('date');
    const customer                = getString('customer');
    const address                 = getString('address');
    const total_manhours          = getString('total_manhours');
    const grand_total_manhours    = getString('grand_total_manhours');
    const performed_by_name       = getString('performed_by_name');
    const checked_by              = getString('checked_by');
    const approved_by_service     = getString('approved_by_service');

    // Validate service office field-level permissions
    const serviceOfficeChecks = [
      { value: checked_by,          action: 'checked_by',  label: 'checked by' },
      { value: approved_by_service, action: 'approved_by', label: 'approved by' },
    ];

    for (const { value, action, label } of serviceOfficeChecks) {
      if (value) {
        const allowed = await hasPermission(supabase, user.id, 'dts_service_office', action);
        if (!allowed) {
          return NextResponse.json(
            { error: `You do not have permission to set the ${label} field` },
            { status: 403 }
          );
        }
      }
    }
    const job_order_request_id = getString('job_order_request_id');
    // Phase 2 gate: block fill-up when the JO is not In-Progress.
    // DTS references the JO by UUID (job_order_request_id), so use the
    // ID-flavoured assertion.
    {
      const gate = await assertJoInProgressById(supabase, job_order_request_id);
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });
    }
    const status = getString('status') || 'Pending';
    const entriesJson = isNewFormat ? (jsonBody.entries || '') : getString('entries');

    // Signatures (three-signatory redesign)
    const rawPerformedBySignature = getString('performed_by_signature');
    const rawCheckedBySignature   = getString('checked_by_signature');
    const rawApprovedBySignature  = getString('approved_by_service_signature');

    // Handle Attachment Uploads
    const attachmentFiles = !isNewFormat ? formData!.getAll('attachment_files') as File[] : [];
    const attachmentTitles = !isNewFormat ? formData!.getAll('attachment_titles') as string[] : [];

    // Process Signatures
    const timestamp = Date.now();
    const performed_by_signature = await uploadSignature(
      serviceSupabase, rawPerformedBySignature,
      `daily-time-sheet/performed-by-${timestamp}.png`
    );
    const checked_by_signature = await uploadSignature(
      serviceSupabase, rawCheckedBySignature,
      `daily-time-sheet/checked-by-${timestamp}.png`
    );
    const approved_by_service_signature = await uploadSignature(
      serviceSupabase, rawApprovedBySignature,
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
          performed_by_signature: performed_by_signature || null,
          checked_by,
          checked_by_signature: checked_by_signature || null,
          approved_by_service,
          approved_by_service_signature: approved_by_service_signature || null,
          status,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert time entries + expense items
    if (data && data[0] && entriesJson) {
      try {
        const entries = Array.isArray(entriesJson) ? entriesJson : JSON.parse(entriesJson);
        if (Array.isArray(entries) && entries.length > 0) {
          const entryRecords = entries.map((entry: any, index: number) => ({
            daily_time_sheet_id: data[0].id,
            entry_date:       entry.entry_date || null,
            start_time:       entry.start_time || null,
            stop_time:        entry.stop_time  || null,
            total_hours:      entry.total_hours ? parseFloat(entry.total_hours) : null,
            initial_location: entry.initial_location || '',
            final_location:   entry.final_location || '',
            is_travel:        !!entry.is_travel,
            sort_order:       entry.sort_order ?? index,
            // Legacy job_description column not used in new design — write empty
            job_description: '',
          }));

          const { data: insertedEntries, error: entriesError } = await supabase
            .from("daily_time_sheet_entries")
            .insert(entryRecords)
            .select('id, sort_order');

          if (entriesError) {
            console.error("Error inserting entries:", entriesError);
          } else if (insertedEntries) {
            // Map inserted entries back to their source by sort_order so we
            // know which expense_items belong to which new row.
            const idBySort = new Map<number, string>();
            insertedEntries.forEach((r: any) => idBySort.set(r.sort_order, r.id));

            const expenseRows: any[] = [];
            entries.forEach((entry: any, index: number) => {
              const newEntryId = idBySort.get(entry.sort_order ?? index);
              if (!newEntryId) return;
              (entry.expense_items || []).forEach((item: any, i: number) => {
                expenseRows.push({
                  daily_time_sheet_entry_id: newEntryId,
                  type: item.type,
                  amount:        item.amount        ? parseFloat(item.amount)        : null,
                  departure_odo: item.departure_odo ? parseFloat(item.departure_odo) : null,
                  arrival_odo:   item.arrival_odo   ? parseFloat(item.arrival_odo)   : null,
                  job_description: item.job_description || '',
                  sort_order: item.sort_order ?? i,
                });
              });
            });

            if (expenseRows.length > 0) {
              const { error: expenseError } = await supabase
                .from('daily_time_sheet_expense_items')
                .insert(expenseRows);
              if (expenseError) {
                console.error('Error inserting expense items:', expenseError);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error parsing entries JSON:", e);
      }
    }

    // Upload attachments
    if (data && data[0]) {
      const formId = data[0].id;

      if (isNewFormat && jsonBody.uploaded_attachments) {
        // New format: Insert URLs that were uploaded directly to storage
        const uploadedAttachments = JSON.parse(jsonBody.uploaded_attachments);
        for (const attachment of uploadedAttachments) {
          await supabase
            .from('daily_time_sheet_attachments')
            .insert([{
              daily_time_sheet_id: formId,
              file_url: attachment.url,
              file_name: attachment.title || attachment.fileName,
              file_type: attachment.fileType || null,
              file_size: attachment.fileSize || null,
              description: attachment.title || '',
            }]);
        }
      } else if (attachmentFiles.length > 0) {
        // Old format: Upload files to storage from FormData
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

    // Fire-and-forget notification fan-out (errors swallowed by helper)
    if (data && data[0]) {
      const actorName = await getUserDisplayName(supabase, user.id);
      await createNotifications(supabase, {
        type: 'form.submitted',
        formType: 'daily-time-sheet',
        recordId: data[0].id,
        actorId: user.id,
        actorName,
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
