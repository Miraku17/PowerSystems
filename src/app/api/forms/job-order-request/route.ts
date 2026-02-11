import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeFilename } from "@/lib/utils";
import { getApprovalsByTable, getApprovalForRecord } from "@/lib/approvals";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("job_order_request_form")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching job order requests:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const approvalMap = await getApprovalsByTable(supabase, "job_order_request_form");

    const formRecords = data.map((record: any) => {
      const approval = getApprovalForRecord(approvalMap, String(record.id));
      return {
        id: record.id,
        companyFormId: null,
        job_order: record.shop_field_jo_number,
        data: { ...record }, // Don't overwrite approval_status - use the actual database value
        dateCreated: record.created_at,
        dateUpdated: record.updated_at,
        created_by: record.created_by,
        approval,
        companyForm: {
          id: "job-order-request",
          name: "Job Order Request Form",
          formType: "job-order-request",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching job order requests:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

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

    // Extract all fields (shop_field_jo_number is now auto-generated from jo_number)
    const date_prepared = getString('date_prepared');
    const full_customer_name = getString('full_customer_name');
    const address = getString('address');
    const location_of_unit = getString('location_of_unit');
    const contact_person = getString('contact_person');
    const telephone_numbers = getString('telephone_numbers');
    const particulars = getString('particulars');
    const equipment_model = getString('equipment_model');
    const equipment_number = getString('equipment_number');
    const engine_model = getString('engine_model');
    const esn = getString('esn');
    const complaints = getString('complaints');
    const work_to_be_done = getString('work_to_be_done');
    const preferred_service_date = getString('preferred_service_date');
    const preferred_service_time = getString('preferred_service_time');
    const charges_absorbed_by = getString('charges_absorbed_by');
    const qtn_ref = getString('qtn_ref');
    const customers_po_wty_claim_no = getString('customers_po_wty_claim_no');
    const dr_number = getString('dr_number');
    const requested_by_name = getString('requested_by_name');
    const approved_by_name = getString('approved_by_name');
    const received_by_service_dept_name = getString('received_by_service_dept_name');
    const received_by_credit_collection_name = getString('received_by_credit_collection_name');
    const estimated_repair_days = getString('estimated_repair_days');
    const technicians_involved = getString('technicians_involved');
    const date_job_started = getString('date_job_started');
    const date_job_completed_closed = getString('date_job_completed_closed');
    const parts_cost = getString('parts_cost');
    const labor_cost = getString('labor_cost');
    const other_cost = getString('other_cost');
    const total_cost = getString('total_cost');
    const date_of_invoice = getString('date_of_invoice');
    const invoice_number = getString('invoice_number');
    const remarks = getString('remarks');
    const verified_by_name = getString('verified_by_name');
    const status = getString('status') || 'PENDING';

    // Signatures
    const rawRequestedBySignature = getString('requested_by_signature');
    const rawApprovedBySignature = getString('approved_by_signature');
    const rawReceivedByServiceDeptSignature = getString('received_by_service_dept_signature');
    const rawReceivedByCreditCollectionSignature = getString('received_by_credit_collection_signature');
    const rawVerifiedBySignature = getString('verified_by_signature');

    // Handle Attachment Uploads
    const attachmentFiles = formData.getAll('attachment_files') as File[];
    const attachmentTitles = formData.getAll('attachment_titles') as string[];

    // Process Signatures
    const timestamp = Date.now();
    const requested_by_signature = await uploadSignature(
      serviceSupabase,
      rawRequestedBySignature,
      `job-order-request/requested-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedBySignature,
      `job-order-request/approved-by-${timestamp}.png`
    );
    const received_by_service_dept_signature = await uploadSignature(
      serviceSupabase,
      rawReceivedByServiceDeptSignature,
      `job-order-request/received-by-service-${timestamp}.png`
    );
    const received_by_credit_collection_signature = await uploadSignature(
      serviceSupabase,
      rawReceivedByCreditCollectionSignature,
      `job-order-request/received-by-credit-${timestamp}.png`
    );
    const verified_by_signature = await uploadSignature(
      serviceSupabase,
      rawVerifiedBySignature,
      `job-order-request/verified-by-${timestamp}.png`
    );

    const { data, error } = await supabase
      .from("job_order_request_form")
      .insert([
        {
          date_prepared: date_prepared || null,
          full_customer_name,
          address,
          location_of_unit,
          contact_person,
          telephone_numbers,
          particulars,
          equipment_model,
          equipment_number,
          engine_model,
          esn,
          complaints,
          work_to_be_done,
          preferred_service_date: preferred_service_date || null,
          preferred_service_time: preferred_service_time || null,
          charges_absorbed_by,
          qtn_ref,
          customers_po_wty_claim_no,
          dr_number,
          requested_by_name,
          requested_by_signature,
          approved_by_name,
          approved_by_signature,
          received_by_service_dept_name,
          received_by_service_dept_signature,
          received_by_credit_collection_name,
          received_by_credit_collection_signature,
          estimated_repair_days: estimated_repair_days ? parseInt(estimated_repair_days) : null,
          technicians_involved,
          date_job_started: date_job_started || null,
          date_job_completed_closed: date_job_completed_closed || null,
          parts_cost: parts_cost ? parseFloat(parts_cost) : null,
          labor_cost: labor_cost ? parseFloat(labor_cost) : null,
          other_cost: other_cost ? parseFloat(other_cost) : null,
          total_cost: total_cost ? parseFloat(total_cost) : null,
          date_of_invoice: date_of_invoice || null,
          invoice_number,
          remarks,
          verified_by_name,
          verified_by_signature,
          status,
          created_by: user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-set shop_field_jo_number from jo_number (SERIAL)
    if (data && data[0]) {
      const joNumber = `JO-${String(data[0].jo_number).padStart(4, '0')}`;
      await supabase
        .from("job_order_request_form")
        .update({ shop_field_jo_number: joNumber })
        .eq("id", data[0].id);
      data[0].shop_field_jo_number = joNumber;
    }

    // Upload attachments
    if (attachmentFiles.length > 0 && data && data[0]) {
      const formId = data[0].id;

      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const title = attachmentTitles[i] || '';

        if (file && file.size > 0) {
          const filename = `job-order-request/${Date.now()}-${sanitizeFilename(file.name)}`;

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
            .from('job_order_attachments')
            .insert([
              {
                job_order_id: formId,
                file_url: fileUrl,
                file_name: title || file.name,
                file_type: file.type,
                file_size: file.size,
                description: title,
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
        table_name: 'job_order_request_form',
        record_id: data[0].id,
        action: 'CREATE',
        old_data: null,
        new_data: data[0],
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { message: "Job Order Request submitted successfully", data },
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
