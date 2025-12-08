import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await supabase
      .from('grindex_service_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching grindex service forms:', error);
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
      companyForm: {
        id: 'grindex-service',
        name: 'Grindex Service Form',
        formType: 'grindex-service',
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error('API error fetching grindex service forms:', error);
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

    // Extract fields matching grindex_service_forms schema
    const job_order = getString('job_order');
    const report_date = getString('report_date');
    const reporting_person_name = getString('reporting_person_name');
    const customer_name = getString('customer_name');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_address = getString('email_address');
    const phone_number = getString('phone_number');

    // Pump Fields
    const pump_model = getString('pump_model');
    const pump_serial_no = getString('pump_serial_no');
    const engine_model = getString('engine_model');
    const engine_serial_no = getString('engine_serial_no');
    const kw = getString('kw');
    const rpm = getString('rpm');
    const product_number = getString('product_number');
    const hmax = getString('hmax');
    const qmax = getString('qmax');
    const running_hours = getString('running_hours');

    // Operational Data
    const date_in_service = getString('date_in_service');
    const date_failed = getString('date_failed');
    const date_commissioned = getString('date_commissioned');

    // Complaints & Findings
    const customer_complaint = getString('customer_complaint');
    const possible_cause = getString('possible_cause');
    const observation = getString('observation');
    const findings = getString('findings');
    const action_taken = getString('action_taken');
    const recommendations = getString('recommendations');
    const summary_details = getString('summary_details');

    // Signatures
    const service_technician = getString('service_technician');
    const rawServiceTechSignature = getString('service_technician_signature');
    const noted_by = getString('noted_by');
    const rawNotedBySignature = getString('noted_by_signature');
    const approved_by = getString('approved_by');
    const rawApprovedBySignature = getString('approved_by_signature');
    const acknowledged_by = getString('acknowledged_by');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');

    // Process Signatures
    const timestamp = Date.now();
    const service_technician_signature = await uploadSignature(
      supabase,
      rawServiceTechSignature,
      `grindex/service-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      supabase,
      rawNotedBySignature,
      `grindex/noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      supabase,
      rawApprovedBySignature,
      `grindex/approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      supabase,
      rawAcknowledgedBySignature,
      `grindex/acknowledged-by-${timestamp}.png`
    );

    // Handle Multiple Attachment Uploads - Process later after report is created
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Insert into Database
    const { data, error } = await supabase
      .from('grindex_service_forms')
      .insert([
        {
          job_order,
          report_date: report_date || null,
          reporting_person_name,
          customer_name,
          contact_person,
          address,
          email_address,
          phone_number,
          pump_model,
          pump_serial_no,
          engine_model,
          engine_serial_no,
          kw,
          rpm,
          product_number,
          hmax,
          qmax,
          running_hours,
          date_in_service: date_in_service || null,
          date_failed: date_failed || null,
          date_commissioned: date_commissioned || null,
          customer_complaint,
          possible_cause,
          observation,
          findings,
          action_taken,
          recommendations,
          summary_details,
          service_technician,
          service_technician_signature,
          noted_by,
          noted_by_signature,
          approved_by,
          approved_by_signature,
          acknowledged_by,
          acknowledged_by_signature,
        },
      ])
      .select();

    if (error) {
      console.error('Error inserting grindex service form data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upload attachments and save to grindex_service_attachments table
    if (attachmentFiles.length > 0 && data && data[0]) {
      const formId = data[0].id;

      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          // Upload to service-reports/grindex bucket
          const filename = `grindex/${Date.now()}-${file.name.replace(/\s/g, '_')}`;

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

          // Insert into grindex_service_attachments table
          const { error: attachmentError } = await supabase
            .from('grindex_service_attachments')
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

    return NextResponse.json({ message: 'Grindex Service Form submitted successfully', data }, { status: 201 });
  } catch (error) {
    console.error('Error processing grindex service form request:', error);
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

    // Fetch the current record to get old signature URLs for deletion
    const { data: currentRecord, error: fetchError } = await supabase
      .from("grindex_service_forms")
      .select("service_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Extract fields
    const {
      job_order,
      report_date,
      reporting_person_name,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      pump_model,
      pump_serial_no,
      engine_model,
      engine_serial_no,
      kw,
      rpm,
      product_number,
      hmax,
      qmax,
      running_hours,
      date_in_service,
      date_failed,
      date_commissioned,
      customer_complaint,
      possible_cause,
      observation,
      findings,
      action_taken,
      recommendations,
      summary_details,
      service_technician,
      service_technician_signature: rawServiceTechSignature,
      noted_by,
      noted_by_signature: rawNotedBySignature,
      approved_by,
      approved_by_signature: rawApprovedBySignature,
      acknowledged_by,
      acknowledged_by_signature: rawAcknowledgedBySignature,
    } = body;

    // Check for duplicate Job Order if it's being updated
    if (job_order) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('grindex_service_forms')
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

    // Process Signatures
    const timestamp = Date.now();
    const service_technician_signature = await uploadSignature(
      serviceSupabase,
      rawServiceTechSignature || "",
      `grindex/service-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `grindex/noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature || "",
      `grindex/approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `grindex/acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures only if they were replaced with new ones OR explicitly cleared
    if (currentRecord.service_technician_signature) {
      if (rawServiceTechSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.service_technician_signature);
      } else if (service_technician_signature && service_technician_signature !== currentRecord.service_technician_signature) {
        await deleteSignature(serviceSupabase, currentRecord.service_technician_signature);
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
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      pump_model,
      pump_serial_no,
      engine_model,
      engine_serial_no,
      kw,
      rpm,
      product_number,
      hmax,
      qmax,
      running_hours,
      date_in_service: date_in_service || null,
      date_failed: date_failed || null,
      date_commissioned: date_commissioned || null,
      customer_complaint,
      possible_cause,
      observation,
      findings,
      action_taken,
      recommendations,
      summary_details,
      service_technician,
      noted_by,
      approved_by,
      acknowledged_by,
    };

    // Only update signatures if they were processed (non-empty) or explicitly cleared
    if (service_technician_signature) updateData.service_technician_signature = service_technician_signature;
    else if (rawServiceTechSignature === "") updateData.service_technician_signature = null;

    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

    if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
    else if (rawApprovedBySignature === "") updateData.approved_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

    // Update the record in Supabase
    const { data, error } = await supabase
      .from("grindex_service_forms")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating grindex service form:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Grindex Service Form updated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing grindex service form update request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
