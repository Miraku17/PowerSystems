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
      .from("electric_surface_pump_teardown_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching electric surface pump teardown reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const approvalMap = await getApprovalsByTable(supabase, "electric_surface_pump_teardown_report");

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
          id: "electric-surface-pump-teardown",
          name: "Electric Driven Surface Pump Teardown Report",
          formType: "electric-surface-pump-teardown",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching electric surface pump teardown reports:", error);
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

// All text fields from the schema
const textFields = [
  'reporting_person_name', 'reporting_person_contact', 'equipment_manufacturer',
  'job_order', 'customer', 'contact_person', 'address', 'email_or_contact',
  'pump_maker', 'pump_type', 'impeller_material', 'pump_model', 'pump_serial_number',
  'pump_rpm', 'product_number', 'hmax_head', 'qmax_flow',
  'suction_size', 'suction_connection', 'suction_strainer_pn',
  'discharge_size', 'discharge_connection', 'configuration',
  'motor_maker', 'motor_model', 'motor_hp', 'motor_phase', 'motor_rpm',
  'motor_voltage', 'motor_frequency', 'motor_amps', 'motor_max_amb_temperature',
  'motor_insulation_class', 'motor_no_of_leads', 'motor_connection',
  'running_hours', 'location', 'reason_for_teardown',
  'motor_fan_cover', 'motor_o_ring', 'motor_end_shield', 'motor_rotor_shaft',
  'motor_end_bearing', 'motor_stator_winding', 'motor_eyebolt', 'motor_terminal_box',
  'motor_name_plate', 'motor_fan', 'motor_frame', 'motor_rotor',
  'motor_front_bearing', 'motor_end_shield_2',
  'wet_end_impeller', 'wet_end_impeller_vanes', 'wet_end_face_seal',
  'wet_end_shaft', 'wet_end_bell_housing', 'wet_end_bearings',
  'wet_end_vacuum_unit', 'wet_end_oil_reservoir', 'wet_end_vacuum_chamber',
  'wet_end_wear_ring',
  'wet_end_other_11_name', 'wet_end_other_11_value',
  'wet_end_other_12_name', 'wet_end_other_12_value',
  'wet_end_other_13_name', 'wet_end_other_13_value',
  'wet_end_other_14_name', 'wet_end_other_14_value',
  'wet_end_other_15_name', 'wet_end_other_15_value',
  'wet_end_other_16_name', 'wet_end_other_16_value',
  'wet_end_other_17_name', 'wet_end_other_17_value',
  'wet_end_other_18_name', 'wet_end_other_18_value',
  'wet_end_other_19_name', 'wet_end_other_19_value',
  'teardowned_by_name', 'checked_approved_by_name',
  'noted_by_name', 'acknowledged_by_name',
];

const dateFields = ['jo_date', 'date_in_service_commissioning', 'date_failed', 'servicing_date'];
const booleanFields = ['is_unit_within_coverage', 'is_warrantable_failure'];

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const serviceSupabase = supabase;

    // Check content type to determine if it's new format (JSON) or old format (FormData)
    const contentType = request.headers.get('content-type') || '';
    const isNewFormat = contentType.includes('application/json');

    let formData: FormData | null = null;
    let jsonBody: any = null;

    if (isNewFormat) {
      // New format: JSON with pre-uploaded file URLs
      jsonBody = await request.json();
    } else {
      // Old format: FormData with files
      formData = await request.formData();
    }

    const getString = (key: string) => {
      if (isNewFormat) {
        return jsonBody[key] || '';
      }
      return formData!.get(key) as string || '';
    };

    const getBoolean = (key: string) => {
      if (isNewFormat) {
        const val = jsonBody[key];
        if (val === true || val === 'true') return true;
        if (val === false || val === 'false') return false;
        return null;
      }
      const val = formData!.get(key) as string;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return null;
    };

    // Build insert object
    const insertData: any = { created_by: user.id };

    for (const field of textFields) {
      insertData[field] = getString(field);
    }

    for (const field of dateFields) {
      insertData[field] = getString(field) || null;
    }

    for (const field of booleanFields) {
      insertData[field] = getBoolean(field);
    }

    // Process Signatures
    const timestamp = Date.now();
    insertData.teardowned_by_signature = await uploadSignature(
      serviceSupabase, getString('teardowned_by_signature'),
      `electric-surface-pump/teardown/teardowned-by-${timestamp}.png`
    );
    insertData.checked_approved_by_signature = await uploadSignature(
      serviceSupabase, getString('checked_approved_by_signature'),
      `electric-surface-pump/teardown/checked-approved-by-${timestamp}.png`
    );
    insertData.noted_by_signature = await uploadSignature(
      serviceSupabase, getString('noted_by_signature'),
      `electric-surface-pump/teardown/noted-by-${timestamp}.png`
    );
    insertData.acknowledged_by_signature = await uploadSignature(
      serviceSupabase, getString('acknowledged_by_signature'),
      `electric-surface-pump/teardown/acknowledged-by-${timestamp}.png`
    );

    const { data, error } = await supabase
      .from("electric_surface_pump_teardown_report")
      .insert([insertData])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert attachments
    if (data && data[0]) {
      const formId = data[0].id;

      if (isNewFormat && jsonBody.uploaded_attachments) {
        // New format: Insert URLs that were uploaded directly to storage
        const uploadedAttachments = JSON.parse(jsonBody.uploaded_attachments);

        // Motor components attachments
        for (const attachment of uploadedAttachments.motor_components || []) {
          await supabase
            .from('electric_surface_pump_teardown_attachments')
            .insert([{
              report_id: formId,
              file_url: attachment.url,
              file_name: attachment.title || attachment.fileName,
              file_type: attachment.fileType,
              file_size: attachment.fileSize,
              attachment_category: 'motor_components',
            }]);
        }

        // Wet end attachments
        for (const attachment of uploadedAttachments.wet_end || []) {
          await supabase
            .from('electric_surface_pump_teardown_attachments')
            .insert([{
              report_id: formId,
              file_url: attachment.url,
              file_name: attachment.title || attachment.fileName,
              file_type: attachment.fileType,
              file_size: attachment.fileSize,
              attachment_category: 'wet_end',
            }]);
        }
      } else {
        // Old format: Upload files to storage from FormData
        const motorComponentsFiles = formData!.getAll('motor_components_files') as File[];
        const motorComponentsTitles = formData!.getAll('motor_components_titles') as string[];
        const wetEndFiles = formData!.getAll('wet_end_files') as File[];
        const wetEndTitles = formData!.getAll('wet_end_titles') as string[];

        // Upload motor components photos
        for (let i = 0; i < motorComponentsFiles.length; i++) {
          const file = motorComponentsFiles[i];
          const title = motorComponentsTitles[i] || '';

          if (file && file.size > 0) {
            const filename = `electric-surface-pump/teardown/motor-components/${Date.now()}-${sanitizeFilename(file.name)}`;

            const { error: uploadError } = await serviceSupabase.storage
              .from('service-reports')
              .upload(filename, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
              console.error(`Error uploading file ${file.name}:`, uploadError);
              continue;
            }

            const { data: publicUrlData } = serviceSupabase.storage
              .from('service-reports')
              .getPublicUrl(filename);

            await supabase
              .from('electric_surface_pump_teardown_attachments')
              .insert([{
                report_id: formId,
                file_url: publicUrlData.publicUrl,
                file_name: title || file.name,
                file_type: file.type,
                file_size: file.size,
                attachment_category: 'motor_components',
              }]);
          }
        }

        // Upload wet end photos
        for (let i = 0; i < wetEndFiles.length; i++) {
          const file = wetEndFiles[i];
          const title = wetEndTitles[i] || '';

          if (file && file.size > 0) {
            const filename = `electric-surface-pump/teardown/wet-end/${Date.now()}-${sanitizeFilename(file.name)}`;

            const { error: uploadError } = await serviceSupabase.storage
              .from('service-reports')
              .upload(filename, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
              console.error(`Error uploading file ${file.name}:`, uploadError);
              continue;
            }

            const { data: publicUrlData } = serviceSupabase.storage
              .from('service-reports')
              .getPublicUrl(filename);

            await supabase
              .from('electric_surface_pump_teardown_attachments')
              .insert([{
                report_id: formId,
                file_url: publicUrlData.publicUrl,
                file_name: title || file.name,
                file_type: file.type,
                file_size: file.size,
              attachment_category: 'wet_end',
            }]);
          }
        }
      }
    }

    // Log to audit_logs
    if (data && data[0]) {
      await supabase.from('audit_logs').insert({
        table_name: 'electric_surface_pump_teardown_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });

      await createApprovalRecord(supabase, 'electric_surface_pump_teardown_report', data[0].id, user.id);
    }

    return NextResponse.json(
      { message: "Teardown Report submitted successfully", data },
      { status: 201 }
    );
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

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const serviceSupabase = supabase;

    // Fetch the current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("electric_surface_pump_teardown_report")
      .select("teardowned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (currentRecord.deleted_at) {
      return NextResponse.json({ error: "Cannot update a deleted record" }, { status: 400 });
    }

    // Permission check
    const permission = await checkRecordPermission(serviceSupabase, user.id, currentRecord.created_by, 'edit');
    if (!permission.allowed) {
      return permission.error ?? NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Check for duplicate Job Order
    if (body.job_order) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('electric_surface_pump_teardown_report')
        .select('id')
        .eq('job_order', body.job_order)
        .neq('id', id)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate job order:', searchError);
        return NextResponse.json({ error: 'Failed to validate Job Order uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json({ error: `Job Order '${body.job_order}' already exists.` }, { status: 400 });
      }
    }

    // Extract signature fields before building update object
    const rawTeardownedBySignature = body.teardowned_by_signature || "";
    const rawCheckedApprovedBySignature = body.checked_approved_by_signature || "";
    const rawNotedBySignature = body.noted_by_signature || "";
    const rawAcknowledgedBySignature = body.acknowledged_by_signature || "";

    // Process Signatures
    const timestamp = Date.now();
    const teardowned_by_signature = await uploadSignature(serviceSupabase, rawTeardownedBySignature, `electric-surface-pump/teardown/teardowned-by-${timestamp}.png`);
    const checked_approved_by_signature = await uploadSignature(serviceSupabase, rawCheckedApprovedBySignature, `electric-surface-pump/teardown/checked-approved-by-${timestamp}.png`);
    const noted_by_signature = await uploadSignature(serviceSupabase, rawNotedBySignature, `electric-surface-pump/teardown/noted-by-${timestamp}.png`);
    const acknowledged_by_signature = await uploadSignature(serviceSupabase, rawAcknowledgedBySignature, `electric-surface-pump/teardown/acknowledged-by-${timestamp}.png`);

    // Delete old signatures if replaced
    const sigFields = [
      { current: currentRecord.teardowned_by_signature, raw: rawTeardownedBySignature, uploaded: teardowned_by_signature },
      { current: currentRecord.checked_approved_by_signature, raw: rawCheckedApprovedBySignature, uploaded: checked_approved_by_signature },
      { current: currentRecord.noted_by_signature, raw: rawNotedBySignature, uploaded: noted_by_signature },
      { current: currentRecord.acknowledged_by_signature, raw: rawAcknowledgedBySignature, uploaded: acknowledged_by_signature },
    ];

    for (const sig of sigFields) {
      if (sig.current) {
        if (sig.raw === "") {
          await deleteSignature(serviceSupabase, sig.current);
        } else if (sig.uploaded && sig.uploaded !== sig.current) {
          await deleteSignature(serviceSupabase, sig.current);
        }
      }
    }

    // Build update object
    const updateData: any = { updated_by: user.id, updated_at: new Date().toISOString() };

    for (const field of textFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    for (const field of dateFields) {
      if (body[field] !== undefined) updateData[field] = body[field] || null;
    }

    for (const field of booleanFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    // Handle signature updates
    if (teardowned_by_signature) updateData.teardowned_by_signature = teardowned_by_signature;
    else if (rawTeardownedBySignature === "") updateData.teardowned_by_signature = null;

    if (checked_approved_by_signature) updateData.checked_approved_by_signature = checked_approved_by_signature;
    else if (rawCheckedApprovedBySignature === "") updateData.checked_approved_by_signature = null;

    if (noted_by_signature) updateData.noted_by_signature = noted_by_signature;
    else if (rawNotedBySignature === "") updateData.noted_by_signature = null;

    if (acknowledged_by_signature) updateData.acknowledged_by_signature = acknowledged_by_signature;
    else if (rawAcknowledgedBySignature === "") updateData.acknowledged_by_signature = null;

    const { data, error } = await supabase
      .from("electric_surface_pump_teardown_report")
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
      table_name: 'electric_surface_pump_teardown_report',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: data,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Teardown Report updated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
