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
      .from("electric_surface_pump_commissioning_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching electric surface pump commissioning reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const approvalMap = await getApprovalsByTable(supabase, "electric_surface_pump_commissioning_report");

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
          id: "electric-surface-pump-commissioning",
          name: "Electric Driven Surface Pump Commissioning Report",
          formType: "electric-surface-pump-commissioning",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching electric surface pump commissioning reports:", error);
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
    const pump_maker = getString('pump_maker');
    const pump_type = getString('pump_type');
    const impeller_material = getString('impeller_material');
    const pump_model = getString('pump_model');
    const pump_serial_number = getString('pump_serial_number');
    const pump_rpm = getString('pump_rpm');
    const product_number = getString('product_number');
    const hmax_head = getString('hmax_head');
    const qmax_flow = getString('qmax_flow');
    const suction_size = getString('suction_size');
    const suction_connection = getString('suction_connection');
    const suction_strainer_pn = getString('suction_strainer_pn');
    const discharge_size = getString('discharge_size');
    const discharge_connection = getString('discharge_connection');
    const configuration = getString('configuration');

    // Electric Motor Details
    const motor_maker = getString('motor_maker');
    const motor_model = getString('motor_model');
    const motor_hp = getString('motor_hp');
    const motor_phase = getString('motor_phase');
    const motor_rpm = getString('motor_rpm');
    const motor_voltage = getString('motor_voltage');
    const motor_frequency = getString('motor_frequency');
    const motor_amps = getString('motor_amps');
    const motor_max_amb_temperature = getString('motor_max_amb_temperature');
    const motor_insulation_class = getString('motor_insulation_class');
    const motor_no_of_leads = getString('motor_no_of_leads');

    // Installation Details
    const location = getString('location');
    const static_head = getString('static_head');
    const commissioning_date = getString('commissioning_date');
    const suction_pipe_size = getString('suction_pipe_size');
    const suction_pipe_length = getString('suction_pipe_length');
    const suction_pipe_type = getString('suction_pipe_type');
    const discharge_pipe_size = getString('discharge_pipe_size');
    const discharge_pipe_length = getString('discharge_pipe_length');
    const discharge_pipe_type = getString('discharge_pipe_type');
    const check_valve_size_type = getString('check_valve_size_type');
    const no_of_elbows_size = getString('no_of_elbows_size');
    const media_to_be_pump = getString('media_to_be_pump');

    // Operational Details
    const actual_rpm = getString('actual_rpm');
    const actual_voltage = getString('actual_voltage');
    const actual_amps = getString('actual_amps');
    const actual_frequency = getString('actual_frequency');
    const motor_temperature = getString('motor_temperature');
    const amb_temperature = getString('amb_temperature');
    const discharge_pressure = getString('discharge_pressure');
    const discharge_flow = getString('discharge_flow');
    const test_duration = getString('test_duration');

    // Signatures
    const commissioned_by_name = getString('commissioned_by_name');
    const rawCommissionedBySignature = getString('commissioned_by_signature');
    const checked_approved_by_name = getString('checked_approved_by_name');
    const rawCheckedApprovedBySignature = getString('checked_approved_by_signature');
    const noted_by_name = getString('noted_by_name');
    const rawNotedBySignature = getString('noted_by_signature');
    const acknowledged_by_name = getString('acknowledged_by_name');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');

    // Handle Attachment Uploads
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Process Signatures
    const timestamp = Date.now();
    const commissioned_by_signature = await uploadSignature(
      serviceSupabase,
      rawCommissionedBySignature,
      `electric-surface/commission/commissioned-by-${timestamp}.png`
    );
    const checked_approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawCheckedApprovedBySignature,
      `electric-surface/commission/checked-approved-by-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature,
      `electric-surface/commission/noted-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature,
      `electric-surface/commission/acknowledged-by-${timestamp}.png`
    );

    const { data, error } = await supabase
      .from("electric_surface_pump_commissioning_report")
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
          pump_maker,
          pump_type,
          impeller_material,
          pump_model,
          pump_serial_number,
          pump_rpm,
          product_number,
          hmax_head,
          qmax_flow,
          suction_size,
          suction_connection,
          suction_strainer_pn,
          discharge_size,
          discharge_connection,
          configuration,
          motor_maker,
          motor_model,
          motor_hp,
          motor_phase,
          motor_rpm,
          motor_voltage,
          motor_frequency,
          motor_amps,
          motor_max_amb_temperature,
          motor_insulation_class,
          motor_no_of_leads,
          location,
          static_head,
          commissioning_date: commissioning_date || null,
          suction_pipe_size,
          suction_pipe_length,
          suction_pipe_type,
          discharge_pipe_size,
          discharge_pipe_length,
          discharge_pipe_type,
          check_valve_size_type,
          no_of_elbows_size,
          media_to_be_pump,
          actual_rpm,
          actual_voltage,
          actual_amps,
          actual_frequency,
          motor_temperature,
          amb_temperature,
          discharge_pressure,
          discharge_flow,
          test_duration,
          commissioned_by_name,
          commissioned_by_signature,
          checked_approved_by_name,
          checked_approved_by_signature,
          noted_by_name,
          noted_by_signature,
          acknowledged_by_name,
          acknowledged_by_signature,
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
          const filename = `electric-surface/commission/${Date.now()}-${sanitizeFilename(file.name)}`;

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
            .from('electric_surface_pump_commissioning_attachments')
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
        table_name: 'electric_surface_pump_commissioning_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });

      await createApprovalRecord(supabase, 'electric_surface_pump_commissioning_report', data[0].id, user.id);
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
      .from("electric_surface_pump_commissioning_report")
      .select("commissioned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
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
      pump_maker,
      pump_type,
      impeller_material,
      pump_model,
      pump_serial_number,
      pump_rpm,
      product_number,
      hmax_head,
      qmax_flow,
      suction_size,
      suction_connection,
      suction_strainer_pn,
      discharge_size,
      discharge_connection,
      configuration,
      motor_maker,
      motor_model,
      motor_hp,
      motor_phase,
      motor_rpm,
      motor_voltage,
      motor_frequency,
      motor_amps,
      motor_max_amb_temperature,
      motor_insulation_class,
      motor_no_of_leads,
      location,
      static_head,
      commissioning_date,
      suction_pipe_size,
      suction_pipe_length,
      suction_pipe_type,
      discharge_pipe_size,
      discharge_pipe_length,
      discharge_pipe_type,
      check_valve_size_type,
      no_of_elbows_size,
      media_to_be_pump,
      actual_rpm,
      actual_voltage,
      actual_amps,
      actual_frequency,
      motor_temperature,
      amb_temperature,
      discharge_pressure,
      discharge_flow,
      test_duration,
      commissioned_by_name,
      commissioned_by_signature: rawCommissionedBySignature,
      checked_approved_by_name,
      checked_approved_by_signature: rawCheckedApprovedBySignature,
      noted_by_name,
      noted_by_signature: rawNotedBySignature,
      acknowledged_by_name,
      acknowledged_by_signature: rawAcknowledgedBySignature,
    } = body;

    // Check for duplicate Job Order
    if (job_order) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('electric_surface_pump_commissioning_report')
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
    const commissioned_by_signature = await uploadSignature(
      serviceSupabase,
      rawCommissionedBySignature || "",
      `electric-surface/commission/commissioned-by-${timestamp}.png`
    );
    const checked_approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawCheckedApprovedBySignature || "",
      `electric-surface/commission/checked-approved-by-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `electric-surface/commission/noted-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `electric-surface/commission/acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures if replaced
    if (currentRecord.commissioned_by_signature) {
      if (rawCommissionedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.commissioned_by_signature);
      } else if (commissioned_by_signature && commissioned_by_signature !== currentRecord.commissioned_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.commissioned_by_signature);
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
      pump_maker,
      pump_type,
      impeller_material,
      pump_model,
      pump_serial_number,
      pump_rpm,
      product_number,
      hmax_head,
      qmax_flow,
      suction_size,
      suction_connection,
      suction_strainer_pn,
      discharge_size,
      discharge_connection,
      configuration,
      motor_maker,
      motor_model,
      motor_hp,
      motor_phase,
      motor_rpm,
      motor_voltage,
      motor_frequency,
      motor_amps,
      motor_max_amb_temperature,
      motor_insulation_class,
      motor_no_of_leads,
      location,
      static_head,
      commissioning_date: commissioning_date || null,
      suction_pipe_size,
      suction_pipe_length,
      suction_pipe_type,
      discharge_pipe_size,
      discharge_pipe_length,
      discharge_pipe_type,
      check_valve_size_type,
      no_of_elbows_size,
      media_to_be_pump,
      actual_rpm,
      actual_voltage,
      actual_amps,
      actual_frequency,
      motor_temperature,
      amb_temperature,
      discharge_pressure,
      discharge_flow,
      test_duration,
      commissioned_by_name,
      checked_approved_by_name,
      noted_by_name,
      acknowledged_by_name,
      updated_at: new Date().toISOString(),
    };

    // Handle signature updates
    if (commissioned_by_signature) updateData.commissioned_by_signature = commissioned_by_signature;
    else if (rawCommissionedBySignature === "") updateData.commissioned_by_signature = null;

    if (checked_approved_by_signature) updateData.checked_approved_by_signature = checked_approved_by_signature;
    else if (rawCheckedApprovedBySignature === "") updateData.checked_approved_by_signature = null;

    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

    const { data, error } = await supabase
      .from("electric_surface_pump_commissioning_report")
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
      table_name: 'electric_surface_pump_commissioning_report',
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
