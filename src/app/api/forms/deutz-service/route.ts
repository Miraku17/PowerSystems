import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await supabase
      .from('deutz_service_report')
      .select('*')
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

    // Extract fields
    const reporting_person_name = getString('reporting_person_name');
    const equipment_manufacturer = getString('equipment_manufacturer');
    const job_order = getString('job_order');
    const report_date = getString('report_date');
    const customer_name = getString('customer_name');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_address = getString('email_address');
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
    const within_coverage_period = getString('within_coverage_period');
    const warrantable_failure = getString('warrantable_failure');
    const summary_details = getString('summary_details');
    const service_technician = getString('service_technician');
    const rawServiceTechSignature = getString('service_technician_signature');
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
      `service-technician-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      supabase,
      rawApprovedBySignature,
      `approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      supabase,
      rawAcknowledgedBySignature,
      `acknowledged-by-${timestamp}.png`
    );

    // Handle Attachment Upload
    let attachmentUrl: string | null = null;
    const attachmentFile = formData.get('attachments') as File | null;

    if (attachmentFile && attachmentFile.size > 0) {
      const filename = `deutz/${Date.now()}-${attachmentFile.name.replace(/\s/g, '_')}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('service-reports')
        .upload(filename, attachmentFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue, but maybe log specific RLS errors if they persist (though service role should fix RLS)
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('service-reports')
          .getPublicUrl(filename);
        
        attachmentUrl = publicUrlData.publicUrl;
      }
    }

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
          approved_by,
          approved_by_signature,
          acknowledged_by,
          acknowledged_by_signature,
          action_taken,
          observation,
          findings,
          recommendations,
          attachments: attachmentUrl ? [attachmentUrl] : [],
        },
      ])
      .select();

    if (error) {
      console.error('Error inserting data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      `service-technician-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature || "",
      `approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `acknowledged-by-${timestamp}.png`
    );

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

     if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
     else if (rawApprovedBySignature === "") updateData.approved_by_signature = null;

     if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
     else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

     console.log('[API] PATCH deutz-service - Final signature values being saved:', {
       attending_technician_signature: updateData.attending_technician_signature,
       approved_by_signature: updateData.approved_by_signature,
       acknowledged_by_signature: updateData.acknowledged_by_signature,
     });

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