import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { data, error } = await supabase
      .from("deutz_commissioning_report")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching commissioning reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map to consistent format for frontend
    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null, // Not applicable for direct table queries
      job_order: record.job_order_no,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      companyForm: {
        id: "deutz-commissioning",
        name: "Deutz Commissioning Report",
        formType: "deutz-commissioning",
      },
    }));

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
    const body = await request.json();
    const serviceSupabase = getServiceSupabase();

    // Helper to convert empty strings to null for numeric fields
    const toNumeric = (value: any) => {
      if (value === '' || value === null || value === undefined) return null;
      return value;
    };

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
    } = body;

    // Process Signatures
    const timestamp = Date.now();
    const attending_technician_signature = await uploadSignature(
      serviceSupabase,
      rawAttendingSignature,
      `commissioning-attending-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature,
      `commissioning-noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedSignature,
      `commissioning-approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedSignature,
      `commissioning-acknowledged-by-${timestamp}.png`
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
          running_hours: toNumeric(running_hours),
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
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    // Fetch the current record to get old signature URLs for deletion
    const { data: currentRecord, error: fetchError } = await supabase
      .from("deutz_commissioning_report")
      .select("attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
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
      `commissioning-attending-technician-${timestamp}.png`
    );
    const noted_by_signature = await uploadSignature(
      serviceSupabase,
      rawNotedBySignature || "",
      `commissioning-noted-by-${timestamp}.png`
    );
    const approved_by_signature = await uploadSignature(
      serviceSupabase,
      rawApprovedSignature || "",
      `commissioning-approved-by-${timestamp}.png`
    );
    const acknowledged_by_signature = await uploadSignature(
      serviceSupabase,
      rawAcknowledgedSignature || "",
      `commissioning-acknowledged-by-${timestamp}.png`
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