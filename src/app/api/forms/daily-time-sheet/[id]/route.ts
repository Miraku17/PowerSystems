import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission, getReadScopeFilter, hasPermission } from "@/lib/permissions";

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

// Helper to delete signature from storage
const deleteSignature = async (serviceSupabase: any, url: string | null) => {
  return;

};

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

// GET single record by ID
export const GET = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from("daily_time_sheet")
      .select("*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching daily time sheet:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    const allowedUserIds = await getReadScopeFilter(supabase, user.id);
    if (allowedUserIds !== null && (!data.created_by || !allowedUserIds.includes(data.created_by))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view this record" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching daily time sheet:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// PATCH - Update record (JSON body)
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();
    const serviceSupabase = supabase;

    // Fetch the current record (three-signatory shape)
    const { data: currentRecord, error: fetchError } = await supabase
      .from("daily_time_sheet")
      .select(`
        performed_by_signature,
        checked_by,
        checked_by_signature,
        approved_by_service,
        approved_by_service_signature,
        deleted_at,
        created_by
      `)
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (currentRecord.deleted_at) {
      return NextResponse.json(
        { error: "Cannot update a deleted record" },
        { status: 400 }
      );
    }

    // Permission check
    const permission = await checkRecordPermission(
      serviceSupabase,
      user.id,
      currentRecord.created_by,
      'edit'
    );

    if (!permission.allowed) {
      return permission.error ?? NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Validate service office field-level permissions. Only trigger when the
    // submitted value actually differs from what's already on the record — the
    // edit form sends the entire formData on every save (including empty
    // strings for fields the user never touched), so a strict `!== undefined`
    // check would 403 any user without the matching permission even when
    // they're only editing unrelated fields like date or manhours.
    const serviceOfficeFields = [
      { field: 'checked_by',          action: 'checked_by',  sigField: 'checked_by_signature' },
      { field: 'approved_by_service', action: 'approved_by', sigField: 'approved_by_service_signature' },
    ];

    const normSig = (v: any) =>
      v === null || v === undefined || v === '' ? null : String(v);

    for (const { field, action, sigField } of serviceOfficeFields) {
      const newValue = body[field];
      const newSigValue = body[sigField];
      const nameChanged =
        newValue !== undefined && normSig(newValue) !== normSig((currentRecord as any)[field]);
      const sigChanged =
        newSigValue !== undefined && normSig(newSigValue) !== normSig((currentRecord as any)[sigField]);
      if (nameChanged || sigChanged) {
        const allowed = await hasPermission(serviceSupabase, user.id, 'dts_service_office', action);
        if (!allowed) {
          return NextResponse.json(
            { error: `You do not have permission to edit the ${field.replace(/_/g, ' ')} field` },
            { status: 403 }
          );
        }
      }
    }

    // Extract form fields from JSON body (three-signatory redesign)
    const {
      job_number,
      job_order_request_id,
      date,
      customer,
      address,
      total_manhours,
      grand_total_manhours,
      performed_by_name,
      performed_by_signature: rawPerformedBySignature,
      checked_by,
      checked_by_signature: rawCheckedBySignature,
      approved_by_service,
      approved_by_service_signature: rawApprovedBySignature,
      status = 'Pending',
      entries,
    } = body;

    // Process signatures
    const timestamp = Date.now();
    const performed_by_signature = await uploadSignature(
      serviceSupabase, rawPerformedBySignature || '',
      `daily-time-sheet/performed-by-${timestamp}.png`
    );
    const checked_by_signature = await uploadSignature(
      serviceSupabase, rawCheckedBySignature || '',
      `daily-time-sheet/checked-by-${timestamp}.png`
    );
    const approved_by_service_signature = await uploadSignature(
      serviceSupabase, rawApprovedBySignature || '',
      `daily-time-sheet/approved-by-${timestamp}.png`
    );

    // Delete prior signatures if replaced
    const maybeDelete = async (existing: string | null, incomingRaw: any, incomingNew: string) => {
      if (!existing) return;
      if (incomingRaw === '' || incomingRaw === null) {
        await deleteSignature(serviceSupabase, existing);
      } else if (incomingNew && incomingNew !== existing) {
        await deleteSignature(serviceSupabase, existing);
      }
    };
    await maybeDelete(currentRecord.performed_by_signature,        rawPerformedBySignature, performed_by_signature);
    await maybeDelete(currentRecord.checked_by_signature,          rawCheckedBySignature,   checked_by_signature);
    await maybeDelete(currentRecord.approved_by_service_signature, rawApprovedBySignature,  approved_by_service_signature);

    // Construct update object
    const updateData: any = {
      job_number: job_number || '',
      job_order_request_id: job_order_request_id || null,
      date: date || null,
      customer: customer || '',
      address: address || '',
      total_manhours: total_manhours ? parseFloat(total_manhours) : null,
      grand_total_manhours: grand_total_manhours ? parseFloat(grand_total_manhours) : null,
      performed_by_name: performed_by_name || '',
      checked_by: checked_by || '',
      approved_by_service: approved_by_service || '',
      status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (performed_by_signature) updateData.performed_by_signature = performed_by_signature;
    else if (rawPerformedBySignature === '' || rawPerformedBySignature === null) updateData.performed_by_signature = null;
    if (checked_by_signature) updateData.checked_by_signature = checked_by_signature;
    else if (rawCheckedBySignature === '' || rawCheckedBySignature === null) updateData.checked_by_signature = null;
    if (approved_by_service_signature) updateData.approved_by_service_signature = approved_by_service_signature;
    else if (rawApprovedBySignature === '' || rawApprovedBySignature === null) updateData.approved_by_service_signature = null;

    const { data, error } = await supabase
      .from("daily_time_sheet")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update time entries + expense items
    if (entries && Array.isArray(entries)) {
      // CASCADE on the FK will drop expense_items when we delete entries.
      await supabase
        .from("daily_time_sheet_entries")
        .delete()
        .eq("daily_time_sheet_id", id);

      if (entries.length > 0) {
        const entryRows = entries.map((entry: any, index: number) => ({
          daily_time_sheet_id: id,
          entry_date:       entry.entry_date || null,
          start_time:       entry.start_time || null,
          stop_time:        entry.stop_time  || null,
          total_hours:      entry.total_hours ? parseFloat(entry.total_hours) : null,
          initial_location: entry.initial_location || '',
          final_location:   entry.final_location || '',
          is_travel:        !!entry.is_travel,
          sort_order:       entry.sort_order ?? index,
          job_description: '',
        }));

        const { data: insertedEntries, error: entriesError } = await supabase
          .from("daily_time_sheet_entries")
          .insert(entryRows)
          .select('id, sort_order');

        if (entriesError) {
          console.error("Error inserting entries:", entriesError);
        } else if (insertedEntries) {
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
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'daily_time_sheet',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Daily Time Sheet updated successfully", data },
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

// DELETE - Soft delete record
export const DELETE = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Fetch the current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("daily_time_sheet")
      .select("performed_by_signature, approved_by_signature, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching record:", fetchError);
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    if (currentRecord.deleted_at) {
      return NextResponse.json(
        { error: "Record is already deleted" },
        { status: 400 }
      );
    }

    // Permission check
    const permission = await checkRecordPermission(
      supabase,
      user.id,
      currentRecord.created_by,
      'delete'
    );

    if (!permission.allowed) {
      return permission.error ?? NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Soft delete - set deleted_at timestamp
    // Attachment records and signatures are preserved for potential restore
    const { data, error } = await supabase
      .from("daily_time_sheet")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error deleting record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'daily_time_sheet',
      record_id: id,
      action: 'DELETE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Daily Time Sheet deleted successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing delete request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
