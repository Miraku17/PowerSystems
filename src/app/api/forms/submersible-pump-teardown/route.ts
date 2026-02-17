import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { sanitizeFilename } from "@/lib/utils";
import { getApprovalsByTable, getApprovalForRecord, createApprovalRecord } from "@/lib/approvals";

// Increase body size limit to 50MB for this route (signatures + images)
export const maxDuration = 60; // Max execution time in seconds
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("submersible_pump_teardown_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching submersible pump teardown reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const approvalMap = await getApprovalsByTable(supabase, "submersible_pump_teardown_report");

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
          id: "submersible-pump-teardown",
          name: "Submersible Pump Teardown Report",
          formType: "submersible-pump-teardown",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching submersible pump teardown reports:", error);
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

    // Determine content type from the base64 string
    const contentType = base64Data.match(/data:(image\/[a-z]+);/)?.[1] || 'image/png';

    // Update filename extension based on content type
    const extension = contentType.split('/')[1];
    const updatedFileName = fileName.replace(/\.[^.]+$/, `.${extension}`);

    const { data, error } = await serviceSupabase.storage
      .from('signatures')
      .upload(updatedFileName, buffer, {
        contentType: contentType,
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${updatedFileName}:`, error);
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

    // Extract all fields
    // Header / Basic Information
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
    const serial_number = getString('serial_number');
    const part_number = getString('part_number');
    const kw_rating_p1 = getString('kw_rating_p1');
    const kw_rating_p2 = getString('kw_rating_p2');
    const voltage = getString('voltage');
    const phase = getString('phase');
    const frequency = getString('frequency');
    const rpm = getString('rpm');
    const hmax_head = getString('hmax_head');
    const qmax_flow = getString('qmax_flow');
    const tmax = getString('tmax');
    const running_hrs = getString('running_hrs');
    const date_of_failure = getString('date_of_failure');
    const teardown_date = getString('teardown_date');
    const reason_for_teardown = getString('reason_for_teardown');

    // Warranty Coverage
    const is_within_warranty = getBoolean('is_within_warranty');
    const is_warrantable_failure = getBoolean('is_warrantable_failure');

    // External Condition Before Teardown
    const ext_discharge_findings = getString('ext_discharge_findings');
    const ext_power_cable_findings = getString('ext_power_cable_findings');
    const ext_signal_cable_findings = getString('ext_signal_cable_findings');
    const ext_lifting_eye_findings = getString('ext_lifting_eye_findings');
    const ext_terminal_cover_findings = getString('ext_terminal_cover_findings');
    const ext_outer_casing_findings = getString('ext_outer_casing_findings');
    const ext_oil_plug_findings = getString('ext_oil_plug_findings');
    const ext_strainer_findings = getString('ext_strainer_findings');
    const ext_motor_inspection_plug_findings = getString('ext_motor_inspection_plug_findings');

    // Components Condition During Teardown
    const comp_discharge_unit_findings = getString('comp_discharge_unit_findings');
    const comp_cable_unit_findings = getString('comp_cable_unit_findings');
    const comp_top_housing_unit_findings = getString('comp_top_housing_unit_findings');
    const comp_starter_unit_findings = getString('comp_starter_unit_findings');
    const comp_motor_unit_findings = getString('comp_motor_unit_findings');
    const comp_shaft_rotor_unit_findings = getString('comp_shaft_rotor_unit_findings');
    const comp_seal_unit_findings = getString('comp_seal_unit_findings');
    const comp_wet_end_unit_findings = getString('comp_wet_end_unit_findings');
    const teardown_comments = getString('teardown_comments');

    // Motor Condition - Stator Winding Resistance
    const stator_l1_l2 = getString('stator_l1_l2');
    const stator_l1_l3 = getString('stator_l1_l3');
    const stator_l2_l3 = getString('stator_l2_l3');

    // Motor Condition - Insulation Resistance
    const insulation_u1_ground = getString('insulation_u1_ground');
    const insulation_u2_ground = getString('insulation_u2_ground');
    const insulation_v1_ground = getString('insulation_v1_ground');
    const insulation_v2_ground = getString('insulation_v2_ground');
    const insulation_w1_ground = getString('insulation_w1_ground');
    const insulation_w2_ground = getString('insulation_w2_ground');
    const motor_comments = getString('motor_comments');

    // Signatures
    const teardowned_by_name = getString('teardowned_by_name');
    const rawTeardownedBySignature = getString('teardowned_by_signature');
    const checked_approved_by_name = getString('checked_approved_by_name');
    const rawCheckedApprovedBySignature = getString('checked_approved_by_signature');
    const noted_by_name = getString('noted_by_name');
    const noted_by_user_id = getString('noted_by_user_id') || null;
    const rawNotedBySignature = getString('noted_by_signature');
    const acknowledged_by_name = getString('acknowledged_by_name');
    const rawAcknowledgedBySignature = getString('acknowledged_by_signature');
    const approved_by_user_id = getString('approved_by_user_id') || null;

    // Handle Attachment Uploads
    let preTeardownFiles: File[] = [];
    let preTeardownTitles: string[] = [];
    let wetEndFiles: File[] = [];
    let wetEndTitles: string[] = [];
    let motorFiles: File[] = [];
    let motorTitles: string[] = [];
    let uploadedAttachments: any = null;

    if (isNewFormat) {
      // New format: URLs are already in the JSON body
      uploadedAttachments = jsonBody.uploaded_attachments ? JSON.parse(jsonBody.uploaded_attachments) : null;
    } else {
      // Old format: Files from FormData
      preTeardownFiles = formData!.getAll('pre_teardown_files') as File[];
      preTeardownTitles = formData!.getAll('pre_teardown_titles') as string[];
      wetEndFiles = formData!.getAll('wet_end_files') as File[];
      wetEndTitles = formData!.getAll('wet_end_titles') as string[];
      motorFiles = formData!.getAll('motor_files') as File[];
      motorTitles = formData!.getAll('motor_titles') as string[];
    }

    // Process Signatures
    const timestamp = Date.now();
    const teardowned_by_signature = await uploadSignature(
      serviceSupabase,
      rawTeardownedBySignature,
      `submersible/teardown/teardowned-by-${timestamp}.png`
    );
    const checked_approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawCheckedApprovedBySignature,
      `submersible/teardown/checked-approved-by-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature,
      `submersible/teardown/noted-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature,
      `submersible/teardown/acknowledged-by-${timestamp}.png`
    );

    // Check for duplicate Job Order
    if (job_order && job_order.trim() !== '') {
      const { data: existingRecord, error: searchError } = await supabase
        .from('submersible_pump_teardown_report')
        .select('id')
        .eq('job_order', job_order)
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

    const { data, error } = await supabase
      .from("submersible_pump_teardown_report")
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
          serial_number,
          part_number,
          kw_rating_p1,
          kw_rating_p2,
          voltage,
          phase,
          frequency,
          rpm,
          hmax_head,
          qmax_flow,
          tmax,
          running_hrs,
          date_of_failure: date_of_failure || null,
          teardown_date: teardown_date || null,
          reason_for_teardown,
          is_within_warranty,
          is_warrantable_failure,
          ext_discharge_findings,
          ext_power_cable_findings,
          ext_signal_cable_findings,
          ext_lifting_eye_findings,
          ext_terminal_cover_findings,
          ext_outer_casing_findings,
          ext_oil_plug_findings,
          ext_strainer_findings,
          ext_motor_inspection_plug_findings,
          comp_discharge_unit_findings,
          comp_cable_unit_findings,
          comp_top_housing_unit_findings,
          comp_starter_unit_findings,
          comp_motor_unit_findings,
          comp_shaft_rotor_unit_findings,
          comp_seal_unit_findings,
          comp_wet_end_unit_findings,
          teardown_comments,
          stator_l1_l2,
          stator_l1_l3,
          stator_l2_l3,
          insulation_u1_ground,
          insulation_u2_ground,
          insulation_v1_ground,
          insulation_v2_ground,
          insulation_w1_ground,
          insulation_w2_ground,
          motor_comments,
          teardowned_by_name,
          teardowned_by_signature,
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
      const errorMessage = error.message || 'Failed to insert teardown report';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Insert attachments
    if (data && data[0]) {
      const formId = data[0].id;

      if (isNewFormat && uploadedAttachments) {
        // New format: Insert URLs that were uploaded directly to storage
        // Pre-teardown attachments
        for (const attachment of uploadedAttachments.pre_teardown || []) {
          const { error: attachmentError } = await supabase
            .from('submersible_pump_teardown_attachments')
            .insert([
              {
                report_id: formId,
                file_url: attachment.url,
                file_name: attachment.title || attachment.fileName,
                file_type: attachment.fileType,
                file_size: attachment.fileSize,
                attachment_category: 'pre_teardown',
              },
            ]);

          if (attachmentError) {
            console.error(`Error inserting attachment record:`, attachmentError);
          }
        }

        // Wet end attachments
        for (const attachment of uploadedAttachments.wet_end || []) {
          const { error: attachmentError } = await supabase
            .from('submersible_pump_teardown_attachments')
            .insert([
              {
                report_id: formId,
                file_url: attachment.url,
                file_name: attachment.title || attachment.fileName,
                file_type: attachment.fileType,
                file_size: attachment.fileSize,
                attachment_category: 'wet_end',
              },
            ]);

          if (attachmentError) {
            console.error(`Error inserting attachment record:`, attachmentError);
          }
        }

        // Motor attachments
        for (const attachment of uploadedAttachments.motor || []) {
          const { error: attachmentError } = await supabase
            .from('submersible_pump_teardown_attachments')
            .insert([
              {
                report_id: formId,
                file_url: attachment.url,
                file_name: attachment.title || attachment.fileName,
                file_type: attachment.fileType,
                file_size: attachment.fileSize,
                attachment_category: 'motor',
              },
            ]);

          if (attachmentError) {
            console.error(`Error inserting attachment record:`, attachmentError);
          }
        }
      } else {
        // Old format: Upload files to storage from FormData
        // Upload pre-teardown photos
        for (let i = 0; i < preTeardownFiles.length; i++) {
          const file = preTeardownFiles[i];
          const title = preTeardownTitles[i] || '';

          if (file && file.size > 0) {
            const filename = `submersible/teardown/pre-teardown/${Date.now()}-${sanitizeFilename(file.name)}`;

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
              .from('submersible_pump_teardown_attachments')
              .insert([
                {
                  report_id: formId,
                  file_url: fileUrl,
                  file_name: title || file.name,
                  file_type: file.type,
                  file_size: file.size,
                  attachment_category: 'pre_teardown',
                },
              ]);

            if (attachmentError) {
              console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
            }
          }
        }

        // Upload wet end photos
        for (let i = 0; i < wetEndFiles.length; i++) {
          const file = wetEndFiles[i];
          const title = wetEndTitles[i] || '';

          if (file && file.size > 0) {
            const filename = `submersible/teardown/wet-end/${Date.now()}-${sanitizeFilename(file.name)}`;

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
              .from('submersible_pump_teardown_attachments')
              .insert([
                {
                  report_id: formId,
                  file_url: fileUrl,
                  file_name: title || file.name,
                  file_type: file.type,
                  file_size: file.size,
                  attachment_category: 'wet_end',
                },
              ]);

            if (attachmentError) {
              console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
            }
          }
        }

        // Upload motor photos
        for (let i = 0; i < motorFiles.length; i++) {
          const file = motorFiles[i];
          const title = motorTitles[i] || '';

          if (file && file.size > 0) {
            const filename = `submersible/teardown/motor/${Date.now()}-${sanitizeFilename(file.name)}`;

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
              .from('submersible_pump_teardown_attachments')
              .insert([
                {
                  report_id: formId,
                  file_url: fileUrl,
                  file_name: title || file.name,
                  file_type: file.type,
                  file_size: file.size,
                  attachment_category: 'motor',
                },
              ]);

            if (attachmentError) {
              console.error(`Error inserting attachment record for ${file.name}:`, attachmentError);
            }
          }
        }
      }
    }

    // Log to audit_logs
    if (data && data[0]) {
      await supabase.from('audit_logs').insert({
        table_name: 'submersible_pump_teardown_report',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });

      await createApprovalRecord(supabase, 'submersible_pump_teardown_report', data[0].id, user.id);
    }

    return NextResponse.json(
      { message: "Teardown Report submitted successfully", data },
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
      .from("submersible_pump_teardown_report")
      .select("teardowned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature, deleted_at, created_by")
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
      serial_number,
      part_number,
      kw_rating_p1,
      kw_rating_p2,
      voltage,
      phase,
      frequency,
      rpm,
      hmax_head,
      qmax_flow,
      tmax,
      running_hrs,
      date_of_failure,
      teardown_date,
      reason_for_teardown,
      is_within_warranty,
      is_warrantable_failure,
      ext_discharge_findings,
      ext_power_cable_findings,
      ext_signal_cable_findings,
      ext_lifting_eye_findings,
      ext_terminal_cover_findings,
      ext_outer_casing_findings,
      ext_oil_plug_findings,
      ext_strainer_findings,
      ext_motor_inspection_plug_findings,
      comp_discharge_unit_findings,
      comp_cable_unit_findings,
      comp_top_housing_unit_findings,
      comp_starter_unit_findings,
      comp_motor_unit_findings,
      comp_shaft_rotor_unit_findings,
      comp_seal_unit_findings,
      comp_wet_end_unit_findings,
      teardown_comments,
      stator_l1_l2,
      stator_l1_l3,
      stator_l2_l3,
      insulation_u1_ground,
      insulation_u2_ground,
      insulation_v1_ground,
      insulation_v2_ground,
      insulation_w1_ground,
      insulation_w2_ground,
      motor_comments,
      teardowned_by_name,
      teardowned_by_signature: rawTeardownedBySignature,
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
        .from('submersible_pump_teardown_report')
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
    const teardowned_by_signature = await uploadSignature(
      serviceSupabase,
      rawTeardownedBySignature || "",
      `submersible/teardown/teardowned-by-${timestamp}.png`
    );
    const checked_approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawCheckedApprovedBySignature || "",
      `submersible/teardown/checked-approved-by-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `submersible/teardown/noted-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedBySignature || "",
      `submersible/teardown/acknowledged-by-${timestamp}.png`
    );

    // Delete old signatures if replaced
    if (currentRecord.teardowned_by_signature) {
      if (rawTeardownedBySignature === "") {
        await deleteSignature(serviceSupabase, currentRecord.teardowned_by_signature);
      } else if (teardowned_by_signature && teardowned_by_signature !== currentRecord.teardowned_by_signature) {
        await deleteSignature(serviceSupabase, currentRecord.teardowned_by_signature);
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
      serial_number,
      part_number,
      kw_rating_p1,
      kw_rating_p2,
      voltage,
      phase,
      frequency,
      rpm,
      hmax_head,
      qmax_flow,
      tmax,
      running_hrs,
      date_of_failure: date_of_failure || null,
      teardown_date: teardown_date || null,
      reason_for_teardown,
      is_within_warranty,
      is_warrantable_failure,
      ext_discharge_findings,
      ext_power_cable_findings,
      ext_signal_cable_findings,
      ext_lifting_eye_findings,
      ext_terminal_cover_findings,
      ext_outer_casing_findings,
      ext_oil_plug_findings,
      ext_strainer_findings,
      ext_motor_inspection_plug_findings,
      comp_discharge_unit_findings,
      comp_cable_unit_findings,
      comp_top_housing_unit_findings,
      comp_starter_unit_findings,
      comp_motor_unit_findings,
      comp_shaft_rotor_unit_findings,
      comp_seal_unit_findings,
      comp_wet_end_unit_findings,
      teardown_comments,
      stator_l1_l2,
      stator_l1_l3,
      stator_l2_l3,
      insulation_u1_ground,
      insulation_u2_ground,
      insulation_v1_ground,
      insulation_v2_ground,
      insulation_w1_ground,
      insulation_w2_ground,
      motor_comments,
      teardowned_by_name,
      checked_approved_by_name,
      noted_by_name,
      noted_by_user_id: noted_by_user_id || null,
      acknowledged_by_name,
      approved_by_user_id: approved_by_user_id || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

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
      .from("submersible_pump_teardown_report")
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
      table_name: 'submersible_pump_teardown_report',
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
