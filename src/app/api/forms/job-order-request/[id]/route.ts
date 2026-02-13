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
  if (!url) return;
  const filePath = getFilePathFromUrl(url);
  if (!filePath) return;

  try {
    const { error } = await serviceSupabase.storage
      .from('signatures')
      .remove([filePath]);

    if (error) {
      console.error(`Error deleting signature ${filePath}:`, error);
    }
  } catch (e) {
    console.error(`Exception deleting signature ${filePath}:`, e);
  }
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
      .from("job_order_request_form")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching job order request:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching job order request:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// PATCH - Update record
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const body = await request.json();
    const serviceSupabase = supabase;

    // Fetch the current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("job_order_request_form")
      .select(`
        requested_by_signature,
        approved_by_signature,
        received_by_service_dept_signature,
        received_by_credit_collection_signature,
        verified_by_signature,
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

    const {
      // shop_field_jo_number is auto-generated, not editable
      date_prepared,
      full_customer_name,
      address,
      location_of_unit,
      contact_person,
      telephone_numbers,
      particulars,
      equipment_model,
      equipment_number,
      engine_model,
      esn,
      complaints,
      work_to_be_done,
      preferred_service_date,
      preferred_service_time,
      charges_absorbed_by,
      qtn_ref,
      customers_po_wty_claim_no,
      dr_number,
      requested_by_name,
      requested_by_signature: rawRequestedBySignature,
      approved_by_name,
      approved_by_signature: rawApprovedBySignature,
      received_by_service_dept_name,
      received_by_service_dept_signature: rawReceivedByServiceDeptSignature,
      received_by_credit_collection_name,
      received_by_credit_collection_signature: rawReceivedByCreditCollectionSignature,
      estimated_repair_days,
      technicians_involved,
      date_job_started,
      date_job_completed_closed,
      parts_cost,
      labor_cost,
      other_cost,
      total_cost,
      date_of_invoice,
      invoice_number,
      remarks,
      verified_by_name,
      verified_by_signature: rawVerifiedBySignature,
      status,
    } = body;

    // shop_field_jo_number duplicate check removed — it's auto-generated and immutable

    // Process Signatures
    const timestamp = Date.now();
    const requested_by_signature = await uploadSignature(
      serviceSupabase,
      rawRequestedBySignature || "",
      `job-order-request/requested-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature || "",
      `job-order-request/approved-by-${timestamp}.png`
    );
    const received_by_service_dept_signature = await uploadSignature(
      serviceSupabase,
      rawReceivedByServiceDeptSignature || "",
      `job-order-request/received-by-service-${timestamp}.png`
    );
    const received_by_credit_collection_signature = await uploadSignature(
      serviceSupabase,
      rawReceivedByCreditCollectionSignature || "",
      `job-order-request/received-by-credit-${timestamp}.png`
    );
    const verified_by_signature = await uploadSignature(
      serviceSupabase,
      rawVerifiedBySignature || "",
      `job-order-request/verified-by-${timestamp}.png`
    );

    // Delete old signatures if replaced
    if (currentRecord.requested_by_signature) {
      if (rawRequestedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.requested_by_signature);
      } else if (requested_by_signature && requested_by_signature !== currentRecord.requested_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.requested_by_signature);
      }
    }
    if (currentRecord.approved_by_signature) {
      if (rawApprovedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      } else if (approved_by_signature && approved_by_signature !== currentRecord.approved_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      }
    }
    if (currentRecord.received_by_service_dept_signature) {
      if (rawReceivedByServiceDeptSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.received_by_service_dept_signature);
      } else if (received_by_service_dept_signature && received_by_service_dept_signature !== currentRecord.received_by_service_dept_signature) {
        await deleteSignature(serviceSupabase, currentRecord.received_by_service_dept_signature);
      }
    }
    if (currentRecord.received_by_credit_collection_signature) {
      if (rawReceivedByCreditCollectionSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.received_by_credit_collection_signature);
      } else if (received_by_credit_collection_signature && received_by_credit_collection_signature !== currentRecord.received_by_credit_collection_signature) {
        await deleteSignature(serviceSupabase, currentRecord.received_by_credit_collection_signature);
      }
    }
    if (currentRecord.verified_by_signature) {
      if (rawVerifiedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.verified_by_signature);
      } else if (verified_by_signature && verified_by_signature !== currentRecord.verified_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.verified_by_signature);
      }
    }

    // Construct update object (shop_field_jo_number excluded — auto-generated)
    const updateData: any = {
      date_prepared: date_prepared || null,
      full_customer_name,
      address,
      location_of_unit,
      contact_person,
      telephone_numbers,
      particulars,
      equipment_model,
      equipment_number,
      engine_model,
      esn,
      complaints,
      work_to_be_done,
      preferred_service_date: preferred_service_date || null,
      preferred_service_time: preferred_service_time || null,
      charges_absorbed_by,
      qtn_ref,
      customers_po_wty_claim_no,
      dr_number,
      requested_by_name,
      approved_by_name,
      received_by_service_dept_name,
      received_by_credit_collection_name,
      estimated_repair_days: estimated_repair_days ? parseInt(estimated_repair_days) : null,
      technicians_involved,
      date_job_started: date_job_started || null,
      date_job_completed_closed: date_job_completed_closed || null,
      parts_cost: parts_cost ? parseFloat(parts_cost) : null,
      labor_cost: labor_cost ? parseFloat(labor_cost) : null,
      other_cost: other_cost ? parseFloat(other_cost) : null,
      total_cost: total_cost ? parseFloat(total_cost) : null,
      date_of_invoice: date_of_invoice || null,
      invoice_number,
      remarks,
      verified_by_name,
      status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Handle signature updates
    if (requested_by_signature) updateData.requested_by_signature = requested_by_signature;
    else if (rawRequestedBySignature === "") updateData.requested_by_signature = null;

    if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
    else if (rawApprovedBySignature === "") updateData.approved_by_signature = null;

    if (received_by_service_dept_signature) updateData.received_by_service_dept_signature = received_by_service_dept_signature;
    else if (rawReceivedByServiceDeptSignature === "") updateData.received_by_service_dept_signature = null;

    if (received_by_credit_collection_signature) updateData.received_by_credit_collection_signature = received_by_credit_collection_signature;
    else if (rawReceivedByCreditCollectionSignature === "") updateData.received_by_credit_collection_signature = null;

    if (verified_by_signature) updateData.verified_by_signature = verified_by_signature;
    else if (rawVerifiedBySignature === "") updateData.verified_by_signature = null;

    const { data, error } = await supabase
      .from("job_order_request_form")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'job_order_request_form',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Job Order Request updated successfully", data },
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
      .from("job_order_request_form")
      .select("deleted_at, created_by")
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
    const { data, error } = await supabase
      .from("job_order_request_form")
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
      table_name: 'job_order_request_form',
      record_id: id,
      action: 'DELETE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Job Order Request deleted successfully", data },
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
