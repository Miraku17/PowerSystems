import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await supabase
      .from("grindex_commissioning_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching Grindex commissioning reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_order_no,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      companyForm: {
        id: "grindex-commissioning",
        name: "Grindex Commissioning Report",
        formType: "grindex-commissioning",
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching Grindex commissioning reports:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

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
    const formData = await request.formData();
    const serviceSupabase = getServiceSupabase();

    const getString = (key: string) => formData.get(key) as string || '';

    const toNumeric = (value: any) => {
      if (value === '' || value === null || value === undefined) return null;
      return value;
    };

    // Extract form fields
    const reporting_person_name = getString('reporting_person_name');
    const phone_number = getString('phone_number');
    const equipment_name = getString('equipment_name');
    const running_hours = getString('running_hours');
    const customer_name = getString('customer_name');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_address = getString('email_address');
    const commissioning_location = getString('commissioning_location');
    const job_order_no = getString('job_order_no');
    const commissioning_date = getString('commissioning_date');
    const pump_model = getString('pump_model');
    const pump_serial_no = getString('pump_serial_no');
    const commissioning_no = getString('commissioning_no');
    const equipment_manufacturer = getString('equipment_manufacturer');
    const pump_no = getString('pump_no');
    const pump_type = getString('pump_type');
    const rated_shaft_power_kw = getString('rated_shaft_power_kw');
    const rated_voltage = getString('rated_voltage');
    const rated_current_amps = getString('rated_current_amps');
    const phase = getString('phase');
    const frequency_hz = getString('frequency_hz');
    const oil_type = getString('oil_type');
    const maximum_height_m = getString('maximum_height_m');
    const maximum_capacity = getString('maximum_capacity');
    const pump_weight = getString('pump_weight');
    const hmax = getString('hmax');
    const qmax = getString('qmax');
    const summary = getString('summary');
    const inspector = getString('inspector');
    const comments_action = getString('comments_action');
    const attending_technician = getString('attending_technician');
    const rawAttendingSignature = getString('attending_technician_signature');
    const approved_by = getString('approved_by');
    const rawApprovedSignature = getString('approved_by_signature');
    const acknowledged_by = getString('acknowledged_by');
    const rawAcknowledgedSignature = getString('acknowledged_by_signature');

    // Handle Multiple Attachment Uploads
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      serviceSupabase,
      rawAttendingSignature,
      `grindex/commission/commissioning-attending-technician-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedSignature,
      `grindex/commission/commissioning-approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedSignature,
      `grindex/commission/commissioning-acknowledged-by-${timestamp}.png`
    );

    const { data, error } = await supabase
      .from("grindex_commissioning_report")
      .insert([
        {
          reporting_person_name,
          phone_number,
          equipment_name,
          running_hours: toNumeric(running_hours),
          customer_name,
          contact_person,
          address,
          email_address,
          commissioning_location,
          job_order_no,
          commissioning_date: commissioning_date || null,
          pump_model,
          pump_serial_no,
          commissioning_no,
          equipment_manufacturer,
          pump_no,
          pump_type,
          rated_shaft_power_kw: toNumeric(rated_shaft_power_kw),
          rated_voltage,
          rated_current_amps: toNumeric(rated_current_amps),
          phase,
          frequency_hz: toNumeric(frequency_hz),
          oil_type,
          maximum_height_m: toNumeric(maximum_height_m),
          maximum_capacity,
          pump_weight,
          hmax: toNumeric(hmax),
          qmax: toNumeric(qmax),
          summary,
          inspector,
          comments_action,
          attending_technician,
          approved_by,
          acknowledged_by,
          attending_technician_signature,
          approved_by_signature,
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
          const filename = `grindex/commission/${Date.now()}-${sanitizeFilename(file.name)}`;

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

          const { error: attachmentError } = await supabase
            .from('grindex_commission_attachments')
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
        table_name: 'grindex_commissioning_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });
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

    const { data: currentRecord, error: fetchError } = await supabase
      .from("grindex_commissioning_report")
      .select("attending_technician_signature, approved_by_signature, acknowledged_by_signature, deleted_at, created_by")
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
      phone_number,
      equipment_name,
      running_hours,
      customer_name,
      contact_person,
      address,
      email_address,
      commissioning_location,
      job_order_no,
      commissioning_date,
      pump_model,
      pump_serial_no,
      commissioning_no,
      equipment_manufacturer,
      pump_no,
      pump_type,
      rated_shaft_power_kw,
      rated_voltage,
      rated_current_amps,
      phase,
      frequency_hz,
      oil_type,
      maximum_height_m,
      maximum_capacity,
      pump_weight,
      hmax,
      qmax,
      summary,
      inspector,
      comments_action,
      attending_technician,
      attending_technician_signature: rawAttendingSignature,
      approved_by,
      approved_by_signature: rawApprovedSignature,
      acknowledged_by,
      acknowledged_by_signature: rawAcknowledgedSignature,
    } = body;

    // Check for duplicate Job Order
    if (job_order_no) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('grindex_commissioning_report')
        .select('id')
        .eq('job_order_no', job_order_no)
        .neq('id', id)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate job order:', searchError);
        return NextResponse.json({ error: 'Failed to validate Job Order uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json(
          { error: `Job Order '${job_order_no}' already exists.` },
          { status: 400 }
        );
      }
    }

    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      serviceSupabase,
      rawAttendingSignature || "",
      `grindex/commission/commissioning-attending-technician-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedSignature || "",
      `grindex/commission/commissioning-approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedSignature || "",
      `grindex/commission/commissioning-acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures if replaced or cleared
    if (currentRecord.attending_technician_signature) {
      if (rawAttendingSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.attending_technician_signature);
      }
      else if (attending_technician_signature && attending_technician_signature !== currentRecord.attending_technician_signature) {
        await deleteSignature(serviceSupabase, currentRecord.attending_technician_signature);
      }
    }
    if (currentRecord.approved_by_signature) {
      if (rawApprovedSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      }
      else if (approved_by_signature && approved_by_signature !== currentRecord.approved_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.approved_by_signature);
      }
    }
    if (currentRecord.acknowledged_by_signature) {
      if (rawAcknowledgedSignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
      }
      else if (acknowledged_by_signature && acknowledged_by_signature !== currentRecord.acknowledged_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
      }
    }

    const updateData: any = {
      reporting_person_name,
      phone_number,
      equipment_name,
      running_hours,
      customer_name,
      contact_person,
      address,
      email_address,
      commissioning_location,
      job_order_no,
      commissioning_date: commissioning_date || null,
      pump_model,
      pump_serial_no,
      commissioning_no,
      equipment_manufacturer,
      pump_no,
      pump_type,
      rated_shaft_power_kw,
      rated_voltage,
      rated_current_amps,
      phase,
      frequency_hz,
      oil_type,
      maximum_height_m,
      maximum_capacity,
      pump_weight,
      hmax,
      qmax,
      summary,
      inspector,
      comments_action,
      attending_technician,
      approved_by,
      acknowledged_by,
    };

    if (attending_technician_signature) updateData.attending_technician_signature = attending_technician_signature;
    else if (rawAttendingSignature === "") updateData.attending_technician_signature = null;

    if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
    else if (rawApprovedSignature === "") updateData.approved_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedSignature === "") updateData.acknowledged_by_signature = null;

    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("grindex_commissioning_report")
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
      table_name: 'grindex_commissioning_report',
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
