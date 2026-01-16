import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await supabase
      .from('deutz_service_report')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching service reports:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map to consistent format for frontend
    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null, // Not applicable for direct table queries
      job_order: record.job_order,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      companyForm: {
        id: 'deutz-service',
        name: 'Deutz Service Report',
        formType: 'deutz-service',
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error('API error fetching service reports:', error);
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
    // URL format: /storage/v1/object/public/signatures/filename.png
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

    // Helper to convert empty strings to null for numeric fields
    const getNumeric = (key: string) => {
      const value = formData.get(key) as string || '';
      return value.trim() === '' ? null : value;
    };

    // Helper to convert string values to boolean or null
    const getBoolean = (key: string): boolean | null => {
      const value = (formData.get(key) as string || '').trim().toLowerCase();
      if (value === '') return null;
      return value === 'true' || value === '1' || value === 'yes';
    };

    // Extract fields
    const reporting_person_name = getString('reporting_person_name');
    const equipment_manufacturer = getString('equipment_manufacturer');
    const job_order = getString('job_order');
    const report_date = getString('report_date');
    const customer_name = getString('customer_name');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_address = getString('email_address');
    const phone_number = getString('phone_number');
    const engine_model = getString('engine_model');
    const engine_serial_no = getString('engine_serial_no');
    const alternator_brand_model = getString('alternator_brand_model');
    const equipment_model = getString('equipment_model');
    const equipment_serial_no = getString('equipment_serial_no');
    const alternator_serial_no = getString('alternator_serial_no');
    const location = getString('location');
    const date_in_service = getString('date_in_service');
    const rating = getNumeric('rating');
    const revolution = getNumeric('revolution');
    const starting_voltage = getNumeric('starting_voltage');
    const running_hours = getNumeric('running_hours');
    const fuel_pump_serial_no = getString('fuel_pump_serial_no');
    const fuel_pump_code = getString('fuel_pump_code');
    const lube_oil_type = getString('lube_oil_type');
    const fuel_type = getString('fuel_type');
    const cooling_water_additives = getString('cooling_water_additives');
    const date_failed = getString('date_failed');
    const turbo_model = getString('turbo_model');
    const turbo_serial_no = getString('turbo_serial_no');
    const customer_complaint = getString('customer_complaint');
    const possible_cause = getString('possible_cause');
    const within_coverage_period = getBoolean('within_coverage_period');
    const warrantable_failure = getBoolean('warrantable_failure');
    const summary_details = getString('summary_details');
    const service_technician = getString('service_technician');
    const rawServiceTechSignature = getString('service_technician_signature');
    const noted_by = getString('noted_by');
    const rawNotedBySignature = getString('noted_by_signature');
    const approved_by = getString('approved_by');
    const rawApprovedBySignature = getString('approved_by_signature');
    const acknowledged_by = getString('acknowledged_by');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');
    const action_taken = getString('action_taken');
    const observation = getString('observation');
    const findings = getString('findings');
    const recommendations = getString('recommendations');
    
    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      supabase,
      rawServiceTechSignature,
      `deutz/service/service-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      supabase,
      rawNotedBySignature,
      `deutz/service/noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      supabase,
      rawApprovedBySignature,
      `deutz/service/approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      supabase,
      rawAcknowledgedBySignature,
      `deutz/service/acknowledged-by-${timestamp}.png`
    );

    // Handle Multiple Attachment Uploads - Process later after report is created
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Insert into Database
    const { data, error } = await supabase
      .from('deutz_service_report')
      .insert([
        {
          reporting_person_name,
          equipment_manufacturer,
          job_order,
          report_date: report_date || null,
          customer_name,
          contact_person,
          address,
          email_address,
          phone_number,
          engine_model,
          engine_serial_no,
          alternator_brand_model,
          equipment_model,
          equipment_serial_no,
          alternator_serial_no,
          location,
          date_in_service: date_in_service || null,
          rating,
          revolution,
          starting_voltage,
          running_hours,
          fuel_pump_serial_no,
          fuel_pump_code,
          lube_oil_type,
          fuel_type,
          cooling_water_additives,
          date_failed: date_failed || null,
          turbo_model,
          turbo_serial_no,
          customer_complaint,
          possible_cause,
          within_coverage_period,
          warrantable_failure,
          summary_details,
          service_technician,
          attending_technician_signature,
          noted_by,
          noted_by_signature,
          approved_by,
          approved_by_signature,
          acknowledged_by,
          acknowledged_by_signature,
          action_taken,
          observation,
          findings,
          recommendations,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error('Error inserting data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upload attachments and save to deutz_service_attachments table
    if (attachmentFiles.length > 0 && data && data[0]) {
      const reportId = data[0].id;

      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          // Upload to service-reports/deutz bucket
          const filename = `deutz/${Date.now()}-${file.name.replace(/\s/g, '_')}`;

          const { error: uploadError } = await supabase.storage
            .from('service-reports')
            .upload(filename, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            continue; // Skip this file and continue with others
          }

          const { data: publicUrlData } = supabase.storage
            .from('service-reports')
            .getPublicUrl(filename);

          const fileUrl = publicUrlData.publicUrl;

          // Insert into deutz_service_attachments table
          const { error: attachmentError } = await supabase
            .from('deutz_service_attachments')
            .insert([
              {
                report_id: reportId,
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
        table_name: 'deutz_service_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ message: 'Service Report submitted successfully', data }, { status: 201 });
  } catch (error) {
    console.error('Error processing request:', error);
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

    console.log('[API] PATCH deutz-service - Received signatures:', {
      attending_technician_signature: body.attending_technician_signature,
      service_technician_signature: body.service_technician_signature,
      approved_by_signature: body.approved_by_signature,
      acknowledged_by_signature: body.acknowledged_by_signature,
    });

    // Fetch the current record to get old signature URLs for deletion and permission check
    const { data: currentRecord, error: fetchError } = await supabase
      .from("deutz_service_report")
      .select("attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Check if record is soft-deleted
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

    // Extract fields matching the database schema
    // Note: In POST, service_technician_signature is mapped to attending_technician_signature in DB
    const {
      reporting_person_name,
      equipment_manufacturer,
      job_order,
      report_date,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      engine_model,
      engine_serial_no,
      alternator_brand_model,
      equipment_model,
      equipment_serial_no,
      alternator_serial_no,
      location,
      date_in_service,
      rating,
      revolution,
      starting_voltage,
      running_hours,
      fuel_pump_serial_no,
      fuel_pump_code,
      lube_oil_type,
      fuel_type,
      cooling_water_additives,
      date_failed,
      turbo_model,
      turbo_serial_no,
      customer_complaint,
      possible_cause,
      within_coverage_period,
      warrantable_failure,
      summary_details,
      service_technician,
      attending_technician_signature: rawServiceTechSignature, // Frontend Edit component uses this name
      service_technician_signature: rawServiceTechSignatureAlt, // Frontend Create component uses this name
      noted_by,
      noted_by_signature: rawNotedBySignature,
      approved_by,
      approved_by_signature: rawApprovedBySignature,
      acknowledged_by,
      acknowledged_by_signature: rawAcknowledgedBySignature,
      action_taken,
      observation,
      findings,
      recommendations,
    } = body;

    // Check for duplicate Job Order if it's being updated
    if (job_order) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('deutz_service_report')
        .select('id')
        .eq('job_order', job_order)
        .neq('id', id) // Exclude current record
        .single();

      if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
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

    // Handle signature field name discrepancy (use nullish coalescing to preserve empty strings)
    const signatureToProcess = rawServiceTechSignature !== undefined ? rawServiceTechSignature : rawServiceTechSignatureAlt;

    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      serviceSupabase,
      signatureToProcess || "",
      `deutz/service/service-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `deutz/service/noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature || "",
      `deutz/service/approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `deutz/service/acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures only if they were replaced with new ones OR explicitly cleared
    if (currentRecord.attending_technician_signature) {
      // Delete if signature was cleared
      if (signatureToProcess === "") {
        await deleteSignature(serviceSupabase, currentRecord.attending_technician_signature);
      }
      // Or if a NEW signature was uploaded (different from the old one)
      else if (attending_technician_signature && attending_technician_signature !== currentRecord.attending_technician_signature) {
        await deleteSignature(serviceSupabase, currentRecord.attending_technician_signature);
      }
    }
    if (currentRecord.noted_by_signature) {
      if (rawNotedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
      }
      else if (noted_by_signature && noted_by_signature !== currentRecord.noted_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
      }
    }
    if (currentRecord.approved_by_signature) {
      if (rawApprovedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      }
      else if (approved_by_signature && approved_by_signature !== currentRecord.approved_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      }
    }
    if (currentRecord.acknowledged_by_signature) {
      if (rawAcknowledgedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
      }
      else if (acknowledged_by_signature && acknowledged_by_signature !== currentRecord.acknowledged_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
      }
    }

    // Construct update object
    const updateData: any = {
      reporting_person_name,
      equipment_manufacturer,
      job_order,
      report_date: report_date || null,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      engine_model,
      engine_serial_no,
      alternator_brand_model,
      equipment_model,
      equipment_serial_no,
      alternator_serial_no,
      location,
      date_in_service: date_in_service || null,
      rating,
      revolution,
      starting_voltage,
      running_hours,
      fuel_pump_serial_no,
      fuel_pump_code,
      lube_oil_type,
      fuel_type,
      cooling_water_additives,
      date_failed: date_failed || null,
      turbo_model,
      turbo_serial_no,
      customer_complaint,
      possible_cause,
      within_coverage_period,
      warrantable_failure,
      summary_details,
      service_technician,
      noted_by,
      approved_by,
      acknowledged_by,
      action_taken,
      observation,
      findings,
      recommendations,
    };

     // Only update signatures if they were processed (non-empty) or explicitly cleared
     if (attending_technician_signature) updateData.attending_technician_signature = attending_technician_signature;
     else if (signatureToProcess === "") updateData.attending_technician_signature = null;

     if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
     else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

     if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
     else if (rawApprovedBySignature === "") updateData.approved_by_signature = null;

     if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
     else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

     console.log('[API] PATCH deutz-service - Final signature values being saved:', {
       attending_technician_signature: updateData.attending_technician_signature,
       approved_by_signature: updateData.approved_by_signature,
       acknowledged_by_signature: updateData.acknowledged_by_signature,
     });

    // Set updated_by and updated_at
    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    // Update the record in Supabase
    const { data, error } = await supabase
      .from("deutz_service_report")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating record:", error);
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
      table_name: 'deutz_service_report',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Service Report updated successfully", data },
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