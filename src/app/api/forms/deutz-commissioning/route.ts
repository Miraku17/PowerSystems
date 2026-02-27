import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";
import { getApprovalsByTable, getApprovalForRecord, createApprovalRecord } from "@/lib/approvals";
import { getUserAddresses } from "@/lib/users";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("deutz_commissioning_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching commissioning reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Fetch approval statuses for all records
    const approvalMap = await getApprovalsByTable(supabase, "deutz_commissioning_report");

    const creatorIds = [...new Set(data.map((r: any) => r.created_by).filter(Boolean))];
    const addressMap = await getUserAddresses(supabase, creatorIds as string[]);

    // Map to consistent format for frontend
    const formRecords = data.map((record: any) => {
      const approval = getApprovalForRecord(approvalMap, String(record.id));
      return {
        id: record.id,
        companyFormId: null,
        job_order: record.job_order_no,
        data: { ...record, approval_status: approval.approval_status },
        dateCreated: record.created_at,
        dateUpdated: record.updated_at,
        created_by: record.created_by,
        created_by_address: addressMap[record.created_by] || null,
        approval,
        companyForm: {
          id: "deutz-commissioning",
          name: "Deutz Commissioning Report",
          formType: "deutz-commissioning",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching commissioning reports:", error);
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

const uploadSignature = async (serviceSupabase: any, base64Data: string, fileName: string) => {
  if (!base64Data) return '';
  if (base64Data.startsWith('http')) return base64Data;
  if (!base64Data.startsWith('data:image')) return '';

  try {
    // Extract the base64 string
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
    // Check content type to determine if it's new format (JSON) or old format (FormData)
    const contentType = request.headers.get('content-type') || '';
    const isNewFormat = contentType.includes('application/json');

    let formData: FormData | null = null;
    let jsonBody: any = null;

    if (isNewFormat) {
      jsonBody = await request.json();
    } else {
      formData = await request.formData();
    }

    const serviceSupabase = supabase;

    // Helper to safely get string values
    const getString = (key: string) => {
      if (isNewFormat) return jsonBody[key] || '';
      return formData!.get(key) as string || '';
    };

    // Helper to convert empty strings to null for numeric fields
    const toNumeric = (value: any) => {
      if (value === '' || value === null || value === undefined) return null;
      return value;
    };

    const reporting_person_name = getString('reporting_person_name');
    const equipment_name = getString('equipment_name');
    const running_hours = getString('running_hours');
    const customer_name = getString('customer_name');
    const contact_person = getString('contact_person');
    const address = getString('address');
    const email_address = getString('email_address');
    const phone_number = getString('phone_number');
    const commissioning_location = getString('commissioning_location');
    const job_order_no = getString('job_order_no');
    const commissioning_date = getString('commissioning_date');
    const engine_model = getString('engine_model');
    const engine_serial_no = getString('engine_serial_no');
    const commissioning_no = getString('commissioning_no');
    const equipment_manufacturer = getString('equipment_manufacturer');
    const equipment_no = getString('equipment_no');
    const equipment_type = getString('equipment_type');
    const output = getString('output');
    const revolutions = getString('revolutions');
    const main_effective_pressure = getString('main_effective_pressure');
    const lube_oil_type = getString('lube_oil_type');
    const fuel_type = getString('fuel_type');
    const cooling_water_additives = getString('cooling_water_additives');
    const fuel_pump_serial_no = getString('fuel_pump_serial_no');
    const fuel_pump_code = getString('fuel_pump_code');
    const turbo_model = getString('turbo_model');
    const turbo_serial_no = getString('turbo_serial_no');
    const summary = getString('summary');
    const check_oil_level = getString('check_oil_level');
    const check_air_filter = getString('check_air_filter');
    const check_hoses_clamps = getString('check_hoses_clamps');
    const check_engine_support = getString('check_engine_support');
    const check_v_belt = getString('check_v_belt');
    const check_water_level = getString('check_water_level');
    const crankshaft_end_play = getString('crankshaft_end_play');
    const inspector = getString('inspector');
    const comments_action = getString('comments_action');
    const rpm_idle_speed = getString('rpm_idle_speed');
    const rpm_full_speed = getString('rpm_full_speed');
    const oil_pressure_idle = getString('oil_pressure_idle');
    const oil_pressure_full = getString('oil_pressure_full');
    const oil_temperature = getString('oil_temperature');
    const engine_smoke = getString('engine_smoke');
    const engine_vibration = getString('engine_vibration');
    const check_engine_leakage = getString('check_engine_leakage');
    const cylinder_head_temp = getString('cylinder_head_temp');
    const cylinder_no = getString('cylinder_no');
    const cylinder_a1 = getString('cylinder_a1');
    const cylinder_a2 = getString('cylinder_a2');
    const cylinder_a3 = getString('cylinder_a3');
    const cylinder_a4 = getString('cylinder_a4');
    const cylinder_a5 = getString('cylinder_a5');
    const cylinder_a6 = getString('cylinder_a6');
    const cylinder_b1 = getString('cylinder_b1');
    const cylinder_b2 = getString('cylinder_b2');
    const cylinder_b3 = getString('cylinder_b3');
    const cylinder_b4 = getString('cylinder_b4');
    const cylinder_b5 = getString('cylinder_b5');
    const cylinder_b6 = getString('cylinder_b6');
    const starter_part_no = getString('starter_part_no');
    const alternator_part_no = getString('alternator_part_no');
    const v_belt_part_no = getString('v_belt_part_no');
    const air_filter_part_no = getString('air_filter_part_no');
    const oil_filter_part_no = getString('oil_filter_part_no');
    const fuel_filter_part_no = getString('fuel_filter_part_no');
    const pre_fuel_filter_part_no = getString('pre_fuel_filter_part_no');
    const controller_brand = getString('controller_brand');
    const controller_model = getString('controller_model');
    const remarks = getString('remarks');
    const recommendation = getString('recommendation');
    const attending_technician = getString('attending_technician');
    const rawAttendingSignature = getString('attending_technician_signature');
    const noted_by = getString('noted_by');
    const rawNotedBySignature = getString('noted_by_signature');
    const approved_by = getString('approved_by');
    const rawApprovedSignature = getString('approved_by_signature');
    const acknowledged_by = getString('acknowledged_by');
    const rawAcknowledgedSignature = getString('acknowledged_by_signature');
    const noted_by_user_id = getString('noted_by_user_id') || null;
    const approved_by_user_id = getString('approved_by_user_id') || null;

    // Handle Multiple Attachment Uploads
    const attachmentFiles = !isNewFormat ? formData!.getAll('attachment_files') as File[] : [];
    const attachmentTitles = !isNewFormat ? formData!.getAll('attachment_titles') as string[] : [];

    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      serviceSupabase,
      rawAttendingSignature,
      `deutz/commission/commissioning-attending-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature,
      `deutz/commission/commissioning-noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedSignature,
      `deutz/commission/commissioning-approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedSignature,
      `deutz/commission/commissioning-acknowledged-by-${timestamp}.png`
    );

    // Generate Job Order No. - MANUALLY INPUT NOW
    // const { count, error: countError } = await supabase
    //   .from("deutz_commissioning_report")
    //   .select("*", { count: "exact", head: true });

    // if (countError) {
    //   console.error("Error fetching record count:", countError);
    //   return NextResponse.json(
    //     { error: "Failed to generate Job Order No." },
    //     { status: 500 }
    //   );
    // }

    // const currentYear = new Date().getFullYear();
    // const nextSequence = (count || 0) + 1;
    // const generatedJobOrderNo = `DEUTZ-COM-${currentYear}-${nextSequence
    //   .toString()
    //   .padStart(4, "0")}`;

    const { data, error } = await supabase
      .from("deutz_commissioning_report")
      .insert([
        {
          reporting_person_name,
          equipment_name,
          running_hours,
          customer_name,
          contact_person,
          address,
          email_address,
          phone_number,
          commissioning_location,
          job_order_no,
          commissioning_date: commissioning_date || null,
          engine_model,
          engine_serial_no,
          commissioning_no,
          equipment_manufacturer,
          equipment_no,
          equipment_type,
          output: toNumeric(output),
          revolutions: toNumeric(revolutions),
          main_effective_pressure: toNumeric(main_effective_pressure),
          lube_oil_type,
          fuel_type,
          cooling_water_additives,
          fuel_pump_serial_no,
          fuel_pump_code,
          turbo_model,
          turbo_serial_no,
          summary,
          check_oil_level,
          check_air_filter,
          check_hoses_clamps,
          check_engine_support,
          check_v_belt,
          check_water_level,
          crankshaft_end_play: toNumeric(crankshaft_end_play),
          inspector,
          comments_action,
          rpm_idle_speed: toNumeric(rpm_idle_speed),
          rpm_full_speed: toNumeric(rpm_full_speed),
          oil_pressure_idle: toNumeric(oil_pressure_idle),
          oil_pressure_full: toNumeric(oil_pressure_full),
          oil_temperature: toNumeric(oil_temperature),
          engine_smoke,
          engine_vibration,
          check_engine_leakage,
          cylinder_head_temp: toNumeric(cylinder_head_temp),
          cylinder_no: toNumeric(cylinder_no),
          cylinder_a1: toNumeric(cylinder_a1),
          cylinder_a2: toNumeric(cylinder_a2),
          cylinder_a3: toNumeric(cylinder_a3),
          cylinder_a4: toNumeric(cylinder_a4),
          cylinder_a5: toNumeric(cylinder_a5),
          cylinder_a6: toNumeric(cylinder_a6),
          cylinder_b1: toNumeric(cylinder_b1),
          cylinder_b2: toNumeric(cylinder_b2),
          cylinder_b3: toNumeric(cylinder_b3),
          cylinder_b4: toNumeric(cylinder_b4),
          cylinder_b5: toNumeric(cylinder_b5),
          cylinder_b6: toNumeric(cylinder_b6),
          starter_part_no,
          alternator_part_no,
          v_belt_part_no,
          air_filter_part_no,
          oil_filter_part_no,
          fuel_filter_part_no,
          pre_fuel_filter_part_no,
          controller_brand,
          controller_model,
          remarks,
          recommendation,
          attending_technician,
          noted_by,
          approved_by,
          acknowledged_by,
          attending_technician_signature,
          noted_by_signature,
          approved_by_signature,
          acknowledged_by_signature,
          noted_by_user_id,
          approved_by_user_id,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && data[0]) {
      const formId = data[0].id;

      if (isNewFormat && jsonBody.uploaded_attachments) {
        const uploadedAttachments = JSON.parse(jsonBody.uploaded_attachments);
        for (const attachment of uploadedAttachments) {
          await supabase
            .from('deutz_commission_attachments')
            .insert([{
              form_id: formId,
              file_url: attachment.url,
              file_title: attachment.title || attachment.fileName,
            }]);
        }
      } else if (attachmentFiles.length > 0) {
        for (let i = 0; i < attachmentFiles.length; i++) {
          const file = attachmentFiles[i];
          const title = attachmentTitles[i] || '';

          if (file && file.size > 0) {
            const filename = `deutz/commission/${Date.now()}-${sanitizeFilename(file.name)}`;

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
              .from('deutz_commission_attachments')
              .insert([{
                form_id: formId,
                file_url: fileUrl,
                file_title: title,
              }]);

            if (attachmentError) {
              console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
            }
          }
        }
      }

      // Log to audit_logs
      await supabase.from('audit_logs').insert({
        table_name: 'deutz_commissioning_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });

      // Create approval record for service report workflow
      await createApprovalRecord(supabase, 'deutz_commissioning_report', data[0].id, user.id);
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

    // Fetch the current record to get old signature URLs for deletion and permission check
    const { data: currentRecord, error: fetchError } = await supabase
      .from("deutz_commissioning_report")
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

    // Extract fields matching the database schema (same as POST)
    const {
      reporting_person_name,
      equipment_name,
      running_hours,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      commissioning_location,
      job_order_no,
      commissioning_date,
      engine_model,
      engine_serial_no,
      commissioning_no,
      equipment_manufacturer,
      equipment_no,
      equipment_type,
      output,
      revolutions,
      main_effective_pressure,
      lube_oil_type,
      fuel_type,
      cooling_water_additives,
      fuel_pump_serial_no,
      fuel_pump_code,
      turbo_model,
      turbo_serial_no,
      summary,
      check_oil_level,
      check_air_filter,
      check_hoses_clamps,
      check_engine_support,
      check_v_belt,
      check_water_level,
      crankshaft_end_play,
      inspector,
      comments_action,
      rpm_idle_speed,
      rpm_full_speed,
      oil_pressure_idle,
      oil_pressure_full,
      oil_temperature,
      engine_smoke,
      engine_vibration,
      check_engine_leakage,
      cylinder_head_temp,
      cylinder_no,
      cylinder_a1,
      cylinder_a2,
      cylinder_a3,
      cylinder_a4,
      cylinder_a5,
      cylinder_a6,
      cylinder_b1,
      cylinder_b2,
      cylinder_b3,
      cylinder_b4,
      cylinder_b5,
      cylinder_b6,
      starter_part_no,
      alternator_part_no,
      v_belt_part_no,
      air_filter_part_no,
      oil_filter_part_no,
      fuel_filter_part_no,
      pre_fuel_filter_part_no,
      controller_brand,
      controller_model,
      remarks,
      recommendation,
      attending_technician,
      attending_technician_signature: rawAttendingSignature,
      noted_by,
      noted_by_signature: rawNotedBySignature,
      approved_by,
      approved_by_signature: rawApprovedSignature,
      acknowledged_by,
      acknowledged_by_signature: rawAcknowledgedSignature,
      noted_by_user_id,
      approved_by_user_id,
    } = body;

    // Check for duplicate Job Order if it's being updated
    if (job_order_no) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('deutz_commissioning_report')
        .select('id')
        .eq('job_order_no', job_order_no)
        .neq('id', id) // Exclude current record
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
      `deutz/commission/commissioning-attending-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `deutz/commission/commissioning-noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedSignature || "",
      `deutz/commission/commissioning-approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedSignature || "",
      `deutz/commission/commissioning-acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures only if they were replaced with new ones OR explicitly cleared
    if (currentRecord.attending_technician_signature) {
      // Delete if signature was cleared
      if (rawAttendingSignature === "") {
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

    // Construct update object
    const updateData: any = {
      reporting_person_name,
      equipment_name,
      running_hours,
      customer_name,
      contact_person,
      address,
      email_address,
      phone_number,
      commissioning_location,
      job_order_no,
      commissioning_date: commissioning_date || null,
      engine_model,
      engine_serial_no,
      commissioning_no,
      equipment_manufacturer,
      equipment_no,
      equipment_type,
      output,
      revolutions,
      main_effective_pressure,
      lube_oil_type,
      fuel_type,
      cooling_water_additives,
      fuel_pump_serial_no,
      fuel_pump_code,
      turbo_model,
      turbo_serial_no,
      summary,
      check_oil_level,
      check_air_filter,
      check_hoses_clamps,
      check_engine_support,
      check_v_belt,
      check_water_level,
      crankshaft_end_play,
      inspector,
      comments_action,
      rpm_idle_speed,
      rpm_full_speed,
      oil_pressure_idle,
      oil_pressure_full,
      oil_temperature,
      engine_smoke,
      engine_vibration,
      check_engine_leakage,
      cylinder_head_temp,
      cylinder_no,
      cylinder_a1,
      cylinder_a2,
      cylinder_a3,
      cylinder_a4,
      cylinder_a5,
      cylinder_a6,
      cylinder_b1,
      cylinder_b2,
      cylinder_b3,
      cylinder_b4,
      cylinder_b5,
      cylinder_b6,
      starter_part_no,
      alternator_part_no,
      v_belt_part_no,
      air_filter_part_no,
      oil_filter_part_no,
      fuel_filter_part_no,
      pre_fuel_filter_part_no,
      controller_brand,
      controller_model,
      remarks,
      recommendation,
      attending_technician,
      noted_by,
      approved_by,
      acknowledged_by,
      noted_by_user_id: noted_by_user_id || null,
      approved_by_user_id: approved_by_user_id || null,
    };

    // Only update signatures if they were processed (non-empty)
    if (attending_technician_signature) updateData.attending_technician_signature = attending_technician_signature;
    else if (rawAttendingSignature === "") updateData.attending_technician_signature = null; // Handle clearing

    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

    if (approved_by_signature) updateData.approved_by_signature = approved_by_signature;
    else if (rawApprovedSignature === "") updateData.approved_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedSignature === "") updateData.acknowledged_by_signature = null;

    // Set updated_by and updated_at
    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("deutz_commissioning_report")
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
      table_name: 'deutz_commissioning_report',
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