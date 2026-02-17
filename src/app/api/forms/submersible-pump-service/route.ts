import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";
import { getApprovalsByTable, getApprovalForRecord, createApprovalRecord } from "@/lib/approvals";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("submersible_pump_service_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching submersible pump service reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const approvalMap = await getApprovalsByTable(supabase, "submersible_pump_service_report");

    const formRecords = data.map((record: any) => {
      const approval = getApprovalForRecord(approvalMap, String(record.id));
      return {
        id: record.id,
        companyFormId: null,
        job_order: record.job_order,
        data: { ...record, approval_status: approval.approval_status },
        dateCreated: record.created_at,
        dateUpdated: record.updated_at,
        created_by: record.created_by,
        approval,
        companyForm: {
          id: "submersible-pump-service",
          name: "Submersible Pump Service Report",
          formType: "submersible-pump-service",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching submersible pump service reports:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

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

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const serviceSupabase = supabase;

    const getString = (key: string) => formData.get(key) as string || '';
    const getBoolean = (key: string) => {
      const value = formData.get(key) as string;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return null;
    };

    // Extract all fields
    const reporting_person_name = getString('reporting_person_name');
    const reporting_person_contact = getString('reporting_person_contact');
    const equipment_manufacturer = getString('equipment_manufacturer');
    const job_order = getString('job_order');
    const jo_date = getString('jo_date');
    const customer = getString('customer');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_or_contact = getString('email_or_contact');

    // Pump Details
    const pump_model = getString('pump_model');
    const pump_serial_number = getString('pump_serial_number');
    const pump_type = getString('pump_type');
    const kw_rating_p1 = getString('kw_rating_p1');
    const kw_rating_p2 = getString('kw_rating_p2');
    const voltage = getString('voltage');
    const frequency = getString('frequency');
    const max_head = getString('max_head');
    const max_flow = getString('max_flow');
    const max_submerged_depth = getString('max_submerged_depth');
    const no_of_leads = getString('no_of_leads');
    const configuration = getString('configuration');
    const discharge_size_type = getString('discharge_size_type');

    // Service Dates & Operation Info
    const date_in_service_commissioning = getString('date_in_service_commissioning');
    const date_failed = getString('date_failed');
    const servicing_date = getString('servicing_date');
    const running_hours = getString('running_hours');
    const water_quality = getString('water_quality');
    const water_temp = getString('water_temp');

    // Service Information
    const customers_complaints = getString('customers_complaints');
    const possible_cause = getString('possible_cause');

    // Warranty Coverage
    const is_within_coverage_period = getBoolean('is_within_coverage_period');
    const is_warrantable_failure = getBoolean('is_warrantable_failure');
    const warranty_summary_details = getString('warranty_summary_details');

    // Service Details
    const action_taken = getString('action_taken');
    const observation = getString('observation');
    const findings = getString('findings');
    const recommendation = getString('recommendation');

    // Signatures
    const performed_by_name = getString('performed_by_name');
    const rawPerformedBySignature = getString('performed_by_signature');
    const checked_approved_by_name = getString('checked_approved_by_name');
    const rawCheckedApprovedBySignature = getString('checked_approved_by_signature');
    const noted_by_name = getString('noted_by_name');
    const noted_by_user_id = getString('noted_by_user_id') || null;
    const rawNotedBySignature = getString('noted_by_signature');
    const acknowledged_by_name = getString('acknowledged_by_name');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');
    const approved_by_user_id = getString('approved_by_user_id') || null;

    // Handle Attachment Uploads
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Process Signatures
    const timestamp = Date.now();
    const performed_by_signature = await uploadSignature(
      serviceSupabase,
      rawPerformedBySignature,
      `submersible/service/performed-by-${timestamp}.png`
    );
    const checked_approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawCheckedApprovedBySignature,
      `submersible/service/checked-approved-by-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature,
      `submersible/service/noted-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature,
      `submersible/service/acknowledged-by-${timestamp}.png`
    );

    const { data, error } = await supabase
      .from("submersible_pump_service_report")
      .insert([
        {
          reporting_person_name,
          reporting_person_contact,
          equipment_manufacturer,
          job_order,
          jo_date: jo_date || null,
          customer,
          contact_person,
          address,
          email_or_contact,
          pump_model,
          pump_serial_number,
          pump_type,
          kw_rating_p1,
          kw_rating_p2,
          voltage,
          frequency,
          max_head,
          max_flow,
          max_submerged_depth,
          no_of_leads,
          configuration,
          discharge_size_type,
          date_in_service_commissioning: date_in_service_commissioning || null,
          date_failed: date_failed || null,
          servicing_date: servicing_date || null,
          running_hours,
          water_quality,
          water_temp,
          customers_complaints,
          possible_cause,
          is_within_coverage_period,
          is_warrantable_failure,
          warranty_summary_details,
          action_taken,
          observation,
          findings,
          recommendation,
          performed_by_name,
          performed_by_signature,
          checked_approved_by_name,
          checked_approved_by_signature,
          noted_by_name,
          noted_by_user_id,
          noted_by_signature,
          acknowledged_by_name,
          acknowledged_by_signature,
          approved_by_user_id,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upload attachments
    if (attachmentFiles.length > 0 && data && data[0]) {
      const formId = data[0].id;

      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          const filename = `submersible/service/${Date.now()}-${sanitizeFilename(file.name)}`;

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
            .from('submersible_pump_service_attachments')
            .insert([
              {
                report_id: formId,
                file_url: fileUrl,
                file_name: title || file.name,
                file_type: file.type,
                file_size: file.size,
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
        table_name: 'submersible_pump_service_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });

      await createApprovalRecord(supabase, 'submersible_pump_service_report', data[0].id, user.id);
    }

    return NextResponse.json(
      { message: "Report submitted successfully", data },
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

export const PATCH = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const serviceSupabase = supabase;

    // Fetch the current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("submersible_pump_service_report")
      .select("performed_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
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
      reporting_person_name,
      reporting_person_contact,
      equipment_manufacturer,
      job_order,
      jo_date,
      customer,
      contact_person,
      address,
      email_or_contact,
      pump_model,
      pump_serial_number,
      pump_type,
      kw_rating_p1,
      kw_rating_p2,
      voltage,
      frequency,
      max_head,
      max_flow,
      max_submerged_depth,
      no_of_leads,
      configuration,
      discharge_size_type,
      date_in_service_commissioning,
      date_failed,
      servicing_date,
      running_hours,
      water_quality,
      water_temp,
      customers_complaints,
      possible_cause,
      is_within_coverage_period,
      is_warrantable_failure,
      warranty_summary_details,
      action_taken,
      observation,
      findings,
      recommendation,
      performed_by_name,
      performed_by_signature: rawPerformedBySignature,
      checked_approved_by_name,
      checked_approved_by_signature: rawCheckedApprovedBySignature,
      noted_by_name,
      noted_by_user_id,
      noted_by_signature: rawNotedBySignature,
      acknowledged_by_name,
      acknowledged_by_signature: rawAcknowledgedBySignature,
      approved_by_user_id,
    } = body;

    // Check for duplicate Job Order
    if (job_order) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('submersible_pump_service_report')
        .select('id')
        .eq('job_order', job_order)
        .neq('id', id)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate job order:', searchError);
        return NextResponse.json({ error: 'Failed to validate Job Order uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json(
          { error: `Job Order '${job_order}' already exists.` },
          { status: 400 }
        );
      }
    }

    // Process Signatures
    const timestamp = Date.now();
    const performed_by_signature = await uploadSignature(
      serviceSupabase,
      rawPerformedBySignature || "",
      `submersible/service/performed-by-${timestamp}.png`
    );
    const checked_approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawCheckedApprovedBySignature || "",
      `submersible/service/checked-approved-by-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `submersible/service/noted-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `submersible/service/acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures if replaced
    if (currentRecord.performed_by_signature) {
      if (rawPerformedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.performed_by_signature);
      } else if (performed_by_signature && performed_by_signature !== currentRecord.performed_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.performed_by_signature);
      }
    }
    if (currentRecord.checked_approved_by_signature) {
      if (rawCheckedApprovedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.checked_approved_by_signature);
      } else if (checked_approved_by_signature && checked_approved_by_signature !== currentRecord.checked_approved_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.checked_approved_by_signature);
      }
    }
    if (currentRecord.noted_by_signature) {
      if (rawNotedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
      } else if (noted_by_signature && noted_by_signature !== currentRecord.noted_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
      }
    }
    if (currentRecord.acknowledged_by_signature) {
      if (rawAcknowledgedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
      } else if (acknowledged_by_signature && acknowledged_by_signature !== currentRecord.acknowledged_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
      }
    }

    // Construct update object
    const updateData: any = {
      reporting_person_name,
      reporting_person_contact,
      equipment_manufacturer,
      job_order,
      jo_date: jo_date || null,
      customer,
      contact_person,
      address,
      email_or_contact,
      pump_model,
      pump_serial_number,
      pump_type,
      kw_rating_p1,
      kw_rating_p2,
      voltage,
      frequency,
      max_head,
      max_flow,
      max_submerged_depth,
      no_of_leads,
      configuration,
      discharge_size_type,
      date_in_service_commissioning: date_in_service_commissioning || null,
      date_failed: date_failed || null,
      servicing_date: servicing_date || null,
      running_hours,
      water_quality,
      water_temp,
      customers_complaints,
      possible_cause,
      is_within_coverage_period,
      is_warrantable_failure,
      warranty_summary_details,
      action_taken,
      observation,
      findings,
      recommendation,
      performed_by_name,
      checked_approved_by_name,
      noted_by_name,
      noted_by_user_id: noted_by_user_id || null,
      acknowledged_by_name,
      approved_by_user_id: approved_by_user_id || null,
      updated_at: new Date().toISOString(),
    };

    // Handle signature updates
    if (performed_by_signature) updateData.performed_by_signature = performed_by_signature;
    else if (rawPerformedBySignature === "") updateData.performed_by_signature = null;

    if (checked_approved_by_signature) updateData.checked_approved_by_signature = checked_approved_by_signature;
    else if (rawCheckedApprovedBySignature === "") updateData.checked_approved_by_signature = null;

    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

    const { data, error } = await supabase
      .from("submersible_pump_service_report")
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
      table_name: 'submersible_pump_service_report',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Report updated successfully", data },
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
