import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";

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
      .select("*, daily_time_sheet_entries(*)")
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

    // Fetch the current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("daily_time_sheet")
      .select(`
        performed_by_signature,
        approved_by_signature,
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

    // Extract form fields from JSON body
    const {
      job_number,
      job_order_request_id,
      date,
      customer,
      address,
      total_manhours,
      grand_total_manhours,
      performed_by_name,
      approved_by_name,
      performed_by_signature: rawPerformedBySignature,
      approved_by_signature: rawApprovedBySignature,
      total_srt,
      actual_manhour,
      performance,
      service_office_note,
      checked_by,
      service_coordinator,
      approved_by_service,
      service_manager,
      status = 'Pending',
      entries,
    } = body;

    // Process Signatures
    const timestamp = Date.now();
    const performed_by_signature = await uploadSignature(
      serviceSupabase,
      rawPerformedBySignature || '',
      `daily-time-sheet/performed-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature || '',
      `daily-time-sheet/approved-by-${timestamp}.png`
    );

    // Delete old signatures if replaced
    if (currentRecord.performed_by_signature) {
      if (rawPerformedBySignature === "" || rawPerformedBySignature === null) {
        await deleteSignature(serviceSupabase, currentRecord.performed_by_signature);
      } else if (performed_by_signature && performed_by_signature !== currentRecord.performed_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.performed_by_signature);
      }
    }
    if (currentRecord.approved_by_signature) {
      if (rawApprovedBySignature === "" || rawApprovedBySignature === null) {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      } else if (approved_by_signature && approved_by_signature !== currentRecord.approved_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      }
    }

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
      approved_by_name: approved_by_name || '',
      total_srt: total_srt ? parseFloat(total_srt) : null,
      actual_manhour: actual_manhour ? parseFloat(actual_manhour) : null,
      performance: performance ? parseFloat(performance) : null,
      service_office_note: service_office_note || '',
      checked_by: checked_by || '',
      service_coordinator: service_coordinator || '',
      approved_by_service: approved_by_service || '',
      service_manager: service_manager || '',
      status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Handle signature updates
    if (performed_by_signature) updateData.performed_by_signature = performed_by_signature;
    else if (rawPerformedBySignature === "" || rawPerformedBySignature === null) updateData.performed_by_signature = null;

    if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
    else if (rawApprovedBySignature === "" || rawApprovedBySignature === null) updateData.approved_by_signature = null;

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

    // Update time entries
    if (entries && Array.isArray(entries)) {
      // Delete existing entries
      await supabase
        .from("daily_time_sheet_entries")
        .delete()
        .eq("daily_time_sheet_id", id);

      // Insert new entries
      if (entries.length > 0) {
        const entryRecords = entries.map((entry: any, index: number) => ({
          daily_time_sheet_id: id,
          entry_date: entry.entry_date || null,
          start_time: entry.start_time || null,
          stop_time: entry.stop_time || null,
          total_hours: entry.total_hours ? parseFloat(entry.total_hours) : null,
          job_description: entry.job_description || '',
          sort_order: entry.sort_order ?? index,
          expense_breakfast: entry.expense_breakfast ? parseFloat(entry.expense_breakfast) : 0,
          expense_lunch: entry.expense_lunch ? parseFloat(entry.expense_lunch) : 0,
          expense_dinner: entry.expense_dinner ? parseFloat(entry.expense_dinner) : 0,
          expense_transport: entry.expense_transport ? parseFloat(entry.expense_transport) : 0,
          expense_lodging: entry.expense_lodging ? parseFloat(entry.expense_lodging) : 0,
          expense_others: entry.expense_others ? parseFloat(entry.expense_others) : 0,
          expense_total: entry.expense_total ? parseFloat(entry.expense_total) : 0,
          expense_remarks: entry.expense_remarks || '',
          travel_hours: entry.travel_hours ? parseFloat(entry.travel_hours) : 0,
          travel_time_from: entry.travel_time_from || '',
          travel_time_to: entry.travel_time_to || '',
          travel_time_depart: entry.travel_time_depart || null,
          travel_time_arrived: entry.travel_time_arrived || null,
          travel_time_hours: entry.travel_time_hours ? parseFloat(entry.travel_time_hours) : 0,
          travel_distance_from: entry.travel_distance_from || '',
          travel_distance_to: entry.travel_distance_to || '',
          travel_departure_odo: entry.travel_departure_odo ? parseFloat(entry.travel_departure_odo) : 0,
          travel_arrival_odo: entry.travel_arrival_odo ? parseFloat(entry.travel_arrival_odo) : 0,
          travel_distance_km: entry.travel_distance_km ? parseFloat(entry.travel_distance_km) : 0,
        }));

        const { error: entriesError } = await supabase
          .from("daily_time_sheet_entries")
          .insert(entryRecords);

        if (entriesError) {
          console.error("Error updating entries:", entriesError);
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
