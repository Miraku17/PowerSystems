import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("engine_surface_pump_commissioning_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching engine surface pump commissioning reports:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_order,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      companyForm: {
        id: "engine-surface-pump-commissioning",
        name: "Engine Driven Surface Pump Commissioning Report",
        formType: "engine-surface-pump-commissioning",
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching engine surface pump commissioning reports:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
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
    const { error } = await serviceSupabase.storage.from('signatures').remove([filePath]);
    if (error) console.error(`Error deleting signature ${filePath}:`, error);
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
    const { data, error } = await serviceSupabase.storage.from('signatures').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
    if (error) { console.error(`Error uploading ${fileName}:`, error); return ''; }
    const { data: { publicUrl } } = serviceSupabase.storage.from('signatures').getPublicUrl(data.path);
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

    // Engine Details
    const engine_model = getString('engine_model');
    const engine_serial_number = getString('engine_serial_number');
    const engine_horse_power = getString('engine_horse_power');
    const injection_pump_model = getString('injection_pump_model');
    const injection_pump_serial_no = getString('injection_pump_serial_no');
    const pump_code = getString('pump_code');
    const turbo_charger_brand = getString('turbo_charger_brand');
    const turbo_charger_model = getString('turbo_charger_model');
    const turbo_charger_serial_no = getString('turbo_charger_serial_no');
    const type_of_fuel = getString('type_of_fuel');
    const engine_oil = getString('engine_oil');
    const cooling_type = getString('cooling_type');
    const fuel_filter_pn = getString('fuel_filter_pn');
    const oil_filter_pn = getString('oil_filter_pn');
    const air_filter_pn = getString('air_filter_pn');
    const charging_alternator_pn = getString('charging_alternator_pn');
    const starting_motor_pn = getString('starting_motor_pn');
    const radiator_fan_belt_pn = getString('radiator_fan_belt_pn');
    const alternator_belt_pn = getString('alternator_belt_pn');
    const system_voltage = getString('system_voltage');

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
    const engine_idle_rpm = getString('engine_idle_rpm');
    const engine_full_rpm = getString('engine_full_rpm');
    const oil_pressure_idle_rpm = getString('oil_pressure_idle_rpm');
    const oil_pressure_full_rpm = getString('oil_pressure_full_rpm');
    const oil_temperature = getString('oil_temperature');
    const engine_exhaust_temperature = getString('engine_exhaust_temperature');
    const engine_smoke_quality = getString('engine_smoke_quality');
    const engine_vibration = getString('engine_vibration');
    const charging_voltage = getString('charging_voltage');
    const engine_running_hours = getString('engine_running_hours');
    const pump_discharge_pressure = getString('pump_discharge_pressure');
    const test_duration = getString('test_duration');
    const crankshaft_end_play_prior_test = getString('crankshaft_end_play_prior_test');
    const crankshaft_end_play_post_test = getString('crankshaft_end_play_post_test');

    // Signatures
    const commissioned_by_name = getString('commissioned_by_name');
    const rawCommissionedBySignature = getString('commissioned_by_signature');
    const checked_approved_by_name = getString('checked_approved_by_name');
    const rawCheckedApprovedBySignature = getString('checked_approved_by_signature');
    const noted_by_name = getString('noted_by_name');
    const rawNotedBySignature = getString('noted_by_signature');
    const acknowledged_by_name = getString('acknowledged_by_name');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');

    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    const timestamp = Date.now();
    const commissioned_by_signature = await uploadSignature(serviceSupabase, rawCommissionedBySignature, `engine-surface/commissioning/commissioned-by-${timestamp}.png`);
    const checked_approved_by_signature = await uploadSignature(serviceSupabase, rawCheckedApprovedBySignature, `engine-surface/commissioning/checked-approved-by-${timestamp}.png`);
    const noted_by_signature = await uploadSignature(serviceSupabase, rawNotedBySignature, `engine-surface/commissioning/noted-by-${timestamp}.png`);
    const acknowledged_by_signature = await uploadSignature(serviceSupabase, rawAcknowledgedBySignature, `engine-surface/commissioning/acknowledged-by-${timestamp}.png`);

    const { data, error } = await supabase
      .from("engine_surface_pump_commissioning_report")
      .insert([{
        reporting_person_name, reporting_person_contact, equipment_manufacturer, job_order,
        jo_date: jo_date || null, customer, contact_person, address, email_or_contact,
        pump_maker, pump_type, impeller_material, pump_model, pump_serial_number, pump_rpm,
        product_number, hmax_head, qmax_flow, suction_size, suction_connection, suction_strainer_pn,
        discharge_size, discharge_connection, configuration,
        engine_model, engine_serial_number, engine_horse_power, injection_pump_model,
        injection_pump_serial_no, pump_code, turbo_charger_brand, turbo_charger_model,
        turbo_charger_serial_no, type_of_fuel, engine_oil, cooling_type, fuel_filter_pn,
        oil_filter_pn, air_filter_pn, charging_alternator_pn, starting_motor_pn,
        radiator_fan_belt_pn, alternator_belt_pn, system_voltage,
        location, static_head, commissioning_date: commissioning_date || null,
        suction_pipe_size, suction_pipe_length, suction_pipe_type, discharge_pipe_size,
        discharge_pipe_length, discharge_pipe_type, check_valve_size_type, no_of_elbows_size, media_to_be_pump,
        engine_idle_rpm, engine_full_rpm, oil_pressure_idle_rpm, oil_pressure_full_rpm,
        oil_temperature, engine_exhaust_temperature, engine_smoke_quality, engine_vibration,
        charging_voltage, engine_running_hours, pump_discharge_pressure, test_duration,
        crankshaft_end_play_prior_test, crankshaft_end_play_post_test,
        commissioned_by_name, commissioned_by_signature, checked_approved_by_name,
        checked_approved_by_signature, noted_by_name, noted_by_signature,
        acknowledged_by_name, acknowledged_by_signature, created_by: user.id,
      }])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (attachmentFiles.length > 0 && data && data[0]) {
      const formId = data[0].id;
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';
        if (file && file.size > 0) {
          const filename = `engine-surface/commissioning/${Date.now()}-${sanitizeFilename(file.name)}`;
          const { error: uploadError } = await serviceSupabase.storage.from('service-reports').upload(filename, file, { cacheControl: '3600', upsert: false });
          if (uploadError) { console.error(`Error uploading file ${file.name}:`, uploadError); continue; }
          const { data: publicUrlData } = serviceSupabase.storage.from('service-reports').getPublicUrl(filename);
          const fileUrl = publicUrlData.publicUrl;
          const { error: attachmentError } = await supabase.from('engine_surface_pump_commissioning_attachments').insert([{ report_id: formId, file_url: fileUrl, file_name: title || file.name, file_type: file.type, file_size: file.size }]);
          if (attachmentError) console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
        }
      }
    }

    if (data && data[0]) {
      await supabase.from('audit_logs').insert({ table_name: 'engine_surface_pump_commissioning_report', record_id: data[0].id, action: 'CREATE', old_data: null, new_data: data[0], performed_by: user.id, performed_at: new Date().toISOString() });
    }

    return NextResponse.json({ message: "Report submitted successfully", data }, { status: 201 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Record ID is required" }, { status: 400 });

    const body = await request.json();
    const serviceSupabase = supabase;

    const { data: currentRecord, error: fetchError } = await supabase
      .from("engine_surface_pump_commissioning_report")
      .select("commissioned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (currentRecord.deleted_at) return NextResponse.json({ error: "Cannot update a deleted record" }, { status: 400 });

    const permission = await checkRecordPermission(serviceSupabase, user.id, currentRecord.created_by, 'edit');
    if (!permission.allowed) return permission.error ?? NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const timestamp = Date.now();
    const commissioned_by_signature = await uploadSignature(serviceSupabase, body.commissioned_by_signature || "", `engine-surface/commissioning/commissioned-by-${timestamp}.png`);
    const checked_approved_by_signature = await uploadSignature(serviceSupabase, body.checked_approved_by_signature || "", `engine-surface/commissioning/checked-approved-by-${timestamp}.png`);
    const noted_by_signature = await uploadSignature(serviceSupabase, body.noted_by_signature || "", `engine-surface/commissioning/noted-by-${timestamp}.png`);
    const acknowledged_by_signature = await uploadSignature(serviceSupabase, body.acknowledged_by_signature || "", `engine-surface/commissioning/acknowledged-by-${timestamp}.png`);

    // Delete old signatures if replaced
    if (currentRecord.commissioned_by_signature && body.commissioned_by_signature === "") await deleteSignature(serviceSupabase, currentRecord.commissioned_by_signature);
    else if (commissioned_by_signature && commissioned_by_signature !== currentRecord.commissioned_by_signature) await deleteSignature(serviceSupabase, currentRecord.commissioned_by_signature);
    if (currentRecord.checked_approved_by_signature && body.checked_approved_by_signature === "") await deleteSignature(serviceSupabase, currentRecord.checked_approved_by_signature);
    else if (checked_approved_by_signature && checked_approved_by_signature !== currentRecord.checked_approved_by_signature) await deleteSignature(serviceSupabase, currentRecord.checked_approved_by_signature);
    if (currentRecord.noted_by_signature && body.noted_by_signature === "") await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
    else if (noted_by_signature && noted_by_signature !== currentRecord.noted_by_signature) await deleteSignature(serviceSupabase, currentRecord.noted_by_signature);
    if (currentRecord.acknowledged_by_signature && body.acknowledged_by_signature === "") await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);
    else if (acknowledged_by_signature && acknowledged_by_signature !== currentRecord.acknowledged_by_signature) await deleteSignature(serviceSupabase, currentRecord.acknowledged_by_signature);

    const updateData: any = {
      ...body,
      jo_date: body.jo_date || null,
      commissioning_date: body.commissioning_date || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (commissioned_by_signature) updateData.commissioned_by_signature = commissioned_by_signature;
    else if (body.commissioned_by_signature === "") updateData.commissioned_by_signature = null;
    if (checked_approved_by_signature) updateData.checked_approved_by_signature = checked_approved_by_signature;
    else if (body.checked_approved_by_signature === "") updateData.checked_approved_by_signature = null;
    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (body.noted_by_signature === "") updateData.noted_by_signature = null;
    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (body.acknowledged_by_signature === "") updateData.acknowledged_by_signature = null;

    const { data, error } = await supabase.from("engine_surface_pump_commissioning_report").update(updateData).eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_logs').insert({ table_name: 'engine_surface_pump_commissioning_report', record_id: id, action: 'UPDATE', old_data: currentRecord, new_data: data, performed_by: user.id, performed_at: new Date().toISOString() });

    return NextResponse.json({ message: "Report updated successfully", data }, { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
