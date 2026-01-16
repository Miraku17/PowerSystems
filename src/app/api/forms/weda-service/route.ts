import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await supabase
      .from('weda_service_report')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching weda service reports:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map to consistent format for frontend
    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_order,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      companyForm: {
        id: 'weda-service',
        name: 'WEDA Service Report',
        formType: 'weda-service',
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error('API error fetching weda service reports:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
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
    } else {
      console.log(`Successfully deleted signature: ${filePath}`);
    }
  } catch (e) {
    console.error(`Exception deleting signature ${filePath}:`, e);
  }
};

// Helper to upload signature server-side
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

    // Helper to safely get string values
    const getString = (key: string) => formData.get(key) as string || '';

    // Extract fields matching weda_service_report schema
    const job_order = getString('job_order');
    const report_date = getString('report_date');
    const reporting_person_name = getString('reporting_person_name');
    const telephone_fax = getString('telephone_fax');
    const equipment_manufacturer = getString('equipment_manufacturer');
    const customer_name = getString('customer_name');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_address = getString('email_address');
    const phone_number = getString('phone_number');

    // Pump Details
    const pump_model = getString('pump_model');
    const pump_serial_no = getString('pump_serial_no');
    const commissioning_no = getString('commissioning_no');
    const equipment_model = getString('equipment_model');
    const equipment_serial_no = getString('equipment_serial_no');
    const pump_type = getString('pump_type');
    const pump_weight = getString('pump_weight');

    // Technical Specifications
    const rating = getString('rating');
    const revolution = getString('revolution');
    const related_current_amps = getString('related_current_amps');
    const running_hours = getString('running_hours');
    const phase = getString('phase');
    const frequency_hz = getString('frequency_hz');
    const oil_type = getString('oil_type');
    const maximum_height_m = getString('maximum_height_m');
    const maximum_capacity = getString('maximum_capacity');

    // Operational Data
    const location = getString('location');
    const date_in_service = getString('date_in_service');
    const date_failed = getString('date_failed');

    // Complaints & Findings
    const customer_complaint = getString('customer_complaint');
    const possible_cause = getString('possible_cause');
    const within_coverage_period_raw = getString('within_coverage_period');
    const warrantable_failure_raw = getString('warrantable_failure');
    const within_coverage_period = within_coverage_period_raw === 'Yes';
    const warrantable_failure = warrantable_failure_raw === 'Yes';

    // Service Report Details
    const summary_details = getString('summary_details');
    const action_taken = getString('action_taken');
    const observation = getString('observation');
    const findings = getString('findings');
    const recommendations = getString('recommendations');

    // Signatures
    const attending_technician = getString('attending_technician');
    const rawAttendingTechSignature = getString('attending_technician_signature');
    const noted_by = getString('noted_by');
    const rawNotedBySignature = getString('noted_by_signature');
    const approved_by = getString('approved_by');
    const rawApprovedBySignature = getString('approved_by_signature');
    const acknowledged_by = getString('acknowledged_by');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');

    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      supabase,
      rawAttendingTechSignature,
      `weda/service/attending-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      supabase,
      rawNotedBySignature,
      `weda/service/noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      supabase,
      rawApprovedBySignature,
      `weda/service/approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      supabase,
      rawAcknowledgedBySignature,
      `weda/service/acknowledged-by-${timestamp}.png`
    );

    // Handle Multiple Attachment Uploads
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Insert into Database
    const { data, error } = await supabase
      .from('weda_service_report')
      .insert([
        {
          job_order,
          report_date: report_date || null,
          reporting_person_name,
          telephone_fax,
          equipment_manufacturer,
          customer_name,
          contact_person,
          address,
          email_address,
          phone_number,
          pump_model,
          pump_serial_no,
          commissioning_no,
          equipment_model,
          equipment_serial_no,
          pump_type,
          pump_weight: pump_weight ? parseFloat(pump_weight) : null,
          location,
          date_in_service: date_in_service || null,
          date_failed: date_failed || null,
          rating,
          revolution,
          related_current_amps: related_current_amps ? parseFloat(related_current_amps) : null,
          running_hours: running_hours ? parseFloat(running_hours) : null,
          phase,
          frequency_hz: frequency_hz ? parseFloat(frequency_hz) : null,
          oil_type,
          maximum_height_m: maximum_height_m ? parseFloat(maximum_height_m) : null,
          maximum_capacity: maximum_capacity ? parseFloat(maximum_capacity) : null,
          customer_complaint,
          possible_cause,
          within_coverage_period,
          warrantable_failure,
          summary_details,
          action_taken,
          observation,
          findings,
          recommendations,
          attending_technician,
          attending_technician_signature,
          noted_by,
          noted_by_signature,
          approved_by,
          approved_by_signature,
          acknowledged_by,
          acknowledged_by_signature,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error('Error inserting weda service report data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upload attachments and save to weda_service_attachments table
    if (attachmentFiles.length > 0 && data && data[0]) {
      const formId = data[0].id;

      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          const filename = `weda/service/${Date.now()}-${sanitizeFilename(file.name)}`;

          const { error: uploadError } = await supabase.storage
            .from('service-reports')
            .upload(filename, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from('service-reports')
            .getPublicUrl(filename);

          const fileUrl = publicUrlData.publicUrl;

          // Insert into weda_service_attachments table
          const { error: attachmentError } = await supabase
            .from('weda_service_attachments')
            .insert([
              {
                form_id: formId,
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

    // Log to audit_logs
    if (data && data[0]) {
      await supabase.from('audit_logs').insert({
        table_name: 'weda_service_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ message: 'WEDA Service Report submitted successfully', data }, { status: 201 });
  } catch (error) {
    console.error('Error processing weda service report request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const serviceSupabase = getServiceSupabase();

    // Fetch the current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("weda_service_report")
      .select("attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
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

    // Extract fields
    const {
      job_order,
      report_date,
      reporting_person_name,
      telephone_fax,
      equipment_manufacturer,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      pump_model,
      pump_serial_no,
      commissioning_no,
      equipment_model,
      equipment_serial_no,
      pump_type,
      pump_weight,
      location,
      date_in_service,
      date_failed,
      rating,
      revolution,
      related_current_amps,
      running_hours,
      phase,
      frequency_hz,
      oil_type,
      maximum_height_m,
      maximum_capacity,
      customer_complaint,
      possible_cause,
      within_coverage_period: within_coverage_period_raw,
      warrantable_failure: warrantable_failure_raw,
      summary_details,
      action_taken,
      observation,
      findings,
      recommendations,
      attending_technician,
      attending_technician_signature: rawAttendingTechSignature,
      noted_by,
      noted_by_signature: rawNotedBySignature,
      approved_by,
      approved_by_signature: rawApprovedBySignature,
      acknowledged_by,
      acknowledged_by_signature: rawAcknowledgedBySignature,
    } = body;

    // Convert warranty fields
    const within_coverage_period = within_coverage_period_raw === 'Yes' || within_coverage_period_raw === true;
    const warrantable_failure = warrantable_failure_raw === 'Yes' || warrantable_failure_raw === true;

    // Check for duplicate Job Order
    if (job_order) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('weda_service_report')
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
    const attending_technician_signature = await uploadSignature(
      serviceSupabase,
      rawAttendingTechSignature || "",
      `weda/service/attending-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `weda/service/noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature || "",
      `weda/service/approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `weda/service/acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures if replaced or cleared
    if (currentRecord.attending_technician_signature) {
      if (rawAttendingTechSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.attending_technician_signature);
      } else if (attending_technician_signature && attending_technician_signature !== currentRecord.attending_technician_signature) {
        await deleteSignature(serviceSupabase, currentRecord.attending_technician_signature);
      }
    }
    if (currentRecord.noted_by_signature) {
      if (rawNotedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
      } else if (noted_by_signature && noted_by_signature !== currentRecord.noted_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
      }
    }
    if (currentRecord.approved_by_signature) {
      if (rawApprovedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      } else if (approved_by_signature && approved_by_signature !== currentRecord.approved_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
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
      job_order,
      report_date: report_date || null,
      reporting_person_name,
      telephone_fax,
      equipment_manufacturer,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      pump_model,
      pump_serial_no,
      commissioning_no,
      equipment_model,
      equipment_serial_no,
      pump_type,
      pump_weight: pump_weight ? parseFloat(pump_weight) : null,
      location,
      date_in_service: date_in_service || null,
      date_failed: date_failed || null,
      rating,
      revolution,
      related_current_amps: related_current_amps ? parseFloat(related_current_amps) : null,
      running_hours: running_hours ? parseFloat(running_hours) : null,
      phase,
      frequency_hz: frequency_hz ? parseFloat(frequency_hz) : null,
      oil_type,
      maximum_height_m: maximum_height_m ? parseFloat(maximum_height_m) : null,
      maximum_capacity: maximum_capacity ? parseFloat(maximum_capacity) : null,
      customer_complaint,
      possible_cause,
      within_coverage_period,
      warrantable_failure,
      summary_details,
      action_taken,
      observation,
      findings,
      recommendations,
      attending_technician,
      noted_by,
      approved_by,
      acknowledged_by,
    };

    // Handle signatures
    if (attending_technician_signature) updateData.attending_technician_signature = attending_technician_signature;
    else if (rawAttendingTechSignature === "") updateData.attending_technician_signature = null;

    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

    if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
    else if (rawApprovedBySignature === "") updateData.approved_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

    // Set updated_by and updated_at
    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    // Update the record
    const { data, error } = await supabase
      .from("weda_service_report")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating weda service report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'weda_service_report',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "WEDA Service Report updated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing weda service report update request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
