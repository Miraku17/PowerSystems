import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { SECTION_DEFINITIONS } from "@/stores/engineInspectionReceivingFormStore";

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
        upsert: true,
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

// --- GET: Fetch all engine inspection receiving reports ---
export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("engine_inspection_receiving_report")
      .select("*, engine_inspection_items(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching engine inspection reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.jo_number,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      companyForm: {
        id: "engine-inspection-receiving",
        name: "Engine Inspection / Receiving Report",
        formType: "engine-inspection-receiving",
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching engine inspection reports:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// --- POST: Create new engine inspection receiving report ---
export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    const getString = (key: string) => (formData.get(key) as string) || '';

    // Extract header & engine fields
    const customer = getString('customer');
    const jo_date = getString('jo_date');
    const jo_number = getString('jo_number');
    const address = getString('address');
    const err_no = getString('err_no');
    const engine_maker = getString('engine_maker');
    const application = getString('application');
    const engine_model = getString('engine_model');
    const engine_serial_number = getString('engine_serial_number');
    const date_received = getString('date_received');
    const date_inspected = getString('date_inspected');
    const engine_rpm = getString('engine_rpm');
    const engine_kw = getString('engine_kw');
    const modification_of_engine = getString('modification_of_engine');
    const missing_parts = getString('missing_parts');

    // Signatures
    const inspected_by_technician_name = getString('inspected_by_technician_name');
    const rawTechSignature = getString('inspected_by_technician_signature');
    const inspected_by_supervisor_name = getString('inspected_by_supervisor_name');
    const rawSupervisorSignature = getString('inspected_by_supervisor_signature');

    // Parse inspection items JSON
    const inspectionItemsJson = getString('inspectionItems');
    let inspectionItems: Record<string, { field_status: string; field_remarks: string; shop_status: string; shop_remarks: string }> = {};
    try {
      if (inspectionItemsJson) {
        inspectionItems = JSON.parse(inspectionItemsJson);
      }
    } catch (e) {
      console.error("Error parsing inspectionItems JSON:", e);
    }

    // Check for duplicate JO Number
    if (jo_number) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('engine_inspection_receiving_report')
        .select('id')
        .eq('jo_number', jo_number)
        .is('deleted_at', null)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate JO Number:', searchError);
        return NextResponse.json({ error: 'Failed to validate JO Number uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json(
          { error: `JO Number '${jo_number}' already exists.` },
          { status: 400 }
        );
      }
    }

    // Upload signatures
    const timestamp = Date.now();
    const inspected_by_technician_signature = await uploadSignature(
      supabase,
      rawTechSignature,
      `engine-inspection/technician-${timestamp}.png`
    );
    const inspected_by_supervisor_signature = await uploadSignature(
      supabase,
      rawSupervisorSignature,
      `engine-inspection/supervisor-${timestamp}.png`
    );

    // Insert main record
    const { data: mainData, error: mainError } = await supabase
      .from("engine_inspection_receiving_report")
      .insert([{
        customer,
        jo_date: jo_date || null,
        jo_number,
        address,
        err_no,
        engine_maker,
        application,
        engine_model,
        engine_serial_number,
        date_received: date_received || null,
        date_inspected: date_inspected || null,
        engine_rpm,
        engine_kw,
        modification_of_engine,
        missing_parts,
        inspected_by_technician_name,
        inspected_by_technician_signature,
        inspected_by_supervisor_name,
        inspected_by_supervisor_signature,
        created_by: user.id,
      }])
      .select();

    if (mainError) {
      console.error("Error inserting main record:", mainError);
      return NextResponse.json({ error: mainError.message }, { status: 500 });
    }

    const reportId = mainData[0].id;

    // Build and bulk-insert inspection items
    const itemRows: any[] = [];
    for (const sectionDef of SECTION_DEFINITIONS) {
      const allItems = sectionDef.items || [];
      if (sectionDef.subSections) {
        for (const sub of sectionDef.subSections) {
          allItems.push(...sub.items);
        }
      }

      for (const item of allItems) {
        const itemData = inspectionItems[item.item_key];
        if (itemData) {
          itemRows.push({
            report_id: reportId,
            section: sectionDef.sectionKey,
            item_key: item.item_key,
            item_label: item.label,
            item_order: item.order,
            field_status: itemData.field_status || null,
            field_remarks: itemData.field_remarks || '',
            shop_status: itemData.shop_status || null,
            shop_remarks: itemData.shop_remarks || '',
          });
        }
      }
    }

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase
        .from("engine_inspection_items")
        .insert(itemRows);

      if (itemsError) {
        console.error("Error inserting inspection items:", itemsError);
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      table_name: 'engine_inspection_receiving_report',
      record_id: reportId,
      action: 'CREATE',
      old_data: null,
      new_data: mainData[0],
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Engine Inspection / Receiving Report submitted successfully", data: mainData },
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

// --- PATCH: Update existing engine inspection receiving report ---
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

    // Fetch current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("engine_inspection_receiving_report")
      .select("inspected_by_technician_signature, inspected_by_supervisor_signature, deleted_at, created_by")
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
      supabase,
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
      customer, jo_date, jo_number, address, err_no,
      engine_maker, application, engine_model, engine_serial_number,
      date_received, date_inspected, engine_rpm, engine_kw,
      modification_of_engine, missing_parts,
      inspected_by_technician_name,
      inspected_by_technician_signature: rawTechSignature,
      inspected_by_supervisor_name,
      inspected_by_supervisor_signature: rawSupervisorSignature,
      inspectionItems,
    } = body;

    // Check for duplicate JO Number
    if (jo_number) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('engine_inspection_receiving_report')
        .select('id')
        .eq('jo_number', jo_number)
        .neq('id', id)
        .is('deleted_at', null)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate JO Number:', searchError);
        return NextResponse.json({ error: 'Failed to validate JO Number uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json(
          { error: `JO Number '${jo_number}' already exists.` },
          { status: 400 }
        );
      }
    }

    // Process signatures
    const timestamp = Date.now();
    const inspected_by_technician_signature = await uploadSignature(
      supabase,
      rawTechSignature || "",
      `engine-inspection/technician-${timestamp}.png`
    );
    const inspected_by_supervisor_signature = await uploadSignature(
      supabase,
      rawSupervisorSignature || "",
      `engine-inspection/supervisor-${timestamp}.png`
    );

    // Delete old signatures if replaced
    if (currentRecord.inspected_by_technician_signature) {
      if (rawTechSignature === "") {
        await deleteSignature(supabase, currentRecord.inspected_by_technician_signature);
      } else if (inspected_by_technician_signature && inspected_by_technician_signature !== currentRecord.inspected_by_technician_signature) {
        await deleteSignature(supabase, currentRecord.inspected_by_technician_signature);
      }
    }
    if (currentRecord.inspected_by_supervisor_signature) {
      if (rawSupervisorSignature === "") {
        await deleteSignature(supabase, currentRecord.inspected_by_supervisor_signature);
      } else if (inspected_by_supervisor_signature && inspected_by_supervisor_signature !== currentRecord.inspected_by_supervisor_signature) {
        await deleteSignature(supabase, currentRecord.inspected_by_supervisor_signature);
      }
    }

    // Build update object
    const updateData: any = {
      customer,
      jo_date: jo_date || null,
      jo_number,
      address,
      err_no,
      engine_maker,
      application,
      engine_model,
      engine_serial_number,
      date_received: date_received || null,
      date_inspected: date_inspected || null,
      engine_rpm,
      engine_kw,
      modification_of_engine,
      missing_parts,
      inspected_by_technician_name,
      inspected_by_supervisor_name,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Handle signature updates
    if (inspected_by_technician_signature) updateData.inspected_by_technician_signature = inspected_by_technician_signature;
    else if (rawTechSignature === "") updateData.inspected_by_technician_signature = null;

    if (inspected_by_supervisor_signature) updateData.inspected_by_supervisor_signature = inspected_by_supervisor_signature;
    else if (rawSupervisorSignature === "") updateData.inspected_by_supervisor_signature = null;

    // Update main record
    const { data: updatedData, error: updateError } = await supabase
      .from("engine_inspection_receiving_report")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating record:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Delete-and-reinsert inspection items
    if (inspectionItems) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from("engine_inspection_items")
        .delete()
        .eq("report_id", id);

      if (deleteError) {
        console.error("Error deleting old inspection items:", deleteError);
      }

      // Re-insert
      const itemRows: any[] = [];
      for (const sectionDef of SECTION_DEFINITIONS) {
        const allItems = sectionDef.items ? [...sectionDef.items] : [];
        if (sectionDef.subSections) {
          for (const sub of sectionDef.subSections) {
            allItems.push(...sub.items);
          }
        }

        for (const item of allItems) {
          const itemData = inspectionItems[item.item_key];
          if (itemData) {
            itemRows.push({
              report_id: id,
              section: sectionDef.sectionKey,
              item_key: item.item_key,
              item_label: item.label,
              item_order: item.order,
              field_status: itemData.field_status || null,
              field_remarks: itemData.field_remarks || '',
              shop_status: itemData.shop_status || null,
              shop_remarks: itemData.shop_remarks || '',
            });
          }
        }
      }

      if (itemRows.length > 0) {
        const { error: insertError } = await supabase
          .from("engine_inspection_items")
          .insert(itemRows);

        if (insertError) {
          console.error("Error re-inserting inspection items:", insertError);
        }
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      table_name: 'engine_inspection_receiving_report',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: updatedData,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Engine Inspection / Receiving Report updated successfully", data: updatedData },
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
