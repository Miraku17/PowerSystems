import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

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

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    // Fetch report with all related data
    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .select(`
        *,
        cylinder_block_inspections(*),
        main_bearing_inspections(*),
        con_rod_bearing_inspections(*),
        connecting_rod_arm_inspections(*),
        conrod_bush_inspections(*),
        crankshaft_inspections(*),
        camshaft_inspections(*),
        vibration_damper_inspections(*),
        cylinder_head_inspections(*),
        engine_valve_inspections(*),
        valve_crosshead_inspections(*),
        piston_inspections(*),
        cylinder_liner_inspections(*),
        component_inspections(*),
        missing_components(*),
        major_components_summary(*)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Supabase error fetching engine teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching engine teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    const getString = (key: string) => formData.get(key) as string || '';
    const getBoolean = (key: string) => formData.get(key) === 'true';
    const hasField = (key: string) => formData.has(key);

    // Fetch existing record to get old signature URLs
    const { data: existingRecord } = await supabase
      .from("engine_teardown_reports")
      .select("attending_technician_signature, service_supervisor_signature")
      .eq("id", id)
      .single();

    // 1. Update main report
    const mainReportData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (hasField('customer')) mainReportData.customer = getString('customer');
    if (hasField('job_number')) mainReportData.job_number = getString('job_number');
    if (hasField('engine_model')) mainReportData.engine_model = getString('engine_model');
    if (hasField('serial_no')) mainReportData.serial_no = getString('serial_no');
    if (hasField('attending_technician')) mainReportData.attending_technician = getString('attending_technician');
    if (hasField('service_supervisor')) mainReportData.service_supervisor = getString('service_supervisor');

    // Handle signature uploads
    const timestamp = Date.now();
    if (hasField('attending_technician_signature')) {
      const rawSignature = getString('attending_technician_signature');
      // Delete old signature if exists and new one is being uploaded
      if (existingRecord?.attending_technician_signature && rawSignature.startsWith('data:image')) {
        await deleteSignature(supabase, existingRecord.attending_technician_signature);
      }
      mainReportData.attending_technician_signature = await uploadSignature(
        supabase,
        rawSignature,
        `engine-teardown/attending-technician-${id}-${timestamp}.png`
      );
    }
    if (hasField('service_supervisor_signature')) {
      const rawSignature = getString('service_supervisor_signature');
      // Delete old signature if exists and new one is being uploaded
      if (existingRecord?.service_supervisor_signature && rawSignature.startsWith('data:image')) {
        await deleteSignature(supabase, existingRecord.service_supervisor_signature);
      }
      mainReportData.service_supervisor_signature = await uploadSignature(
        supabase,
        rawSignature,
        `engine-teardown/service-supervisor-${id}-${timestamp}.png`
      );
    }

    const { error: mainError } = await supabase
      .from("engine_teardown_reports")
      .update(mainReportData)
      .eq("id", id);

    if (mainError) {
      console.error("Error updating main report:", mainError);
      return NextResponse.json({ success: false, message: mainError.message }, { status: 500 });
    }

    // 2. Update Cylinder Block Inspection
    const cylinderBlockData: any = { updated_by: user.id };
    if (hasField('cam_shaft_bushing_bore')) cylinderBlockData.cam_shaft_bushing_bore = getString('cam_shaft_bushing_bore');
    if (hasField('cylinder_liner_counter_bore')) cylinderBlockData.cylinder_liner_counter_bore = getString('cylinder_liner_counter_bore');
    if (hasField('liner_to_block_clearance')) cylinderBlockData.liner_to_block_clearance = getString('liner_to_block_clearance');
    if (hasField('lower_liner_bore')) cylinderBlockData.lower_liner_bore = getString('lower_liner_bore');
    if (hasField('upper_liner_bore')) cylinderBlockData.upper_liner_bore = getString('upper_liner_bore');
    if (hasField('top_deck')) cylinderBlockData.top_deck = getString('top_deck');
    if (hasField('cylinder_block_comments')) cylinderBlockData.comments = getString('cylinder_block_comments');

    await supabase.from("cylinder_block_inspections").update(cylinderBlockData).eq("report_id", id);

    // 3. Update Main Bearing Inspection
    const mainBearingData: any = { updated_by: user.id };
    if (hasField('main_bearing_fine_particle_abrasion')) mainBearingData.fine_particle_abrasion = getBoolean('main_bearing_fine_particle_abrasion');
    if (hasField('main_bearing_coarse_particle_abrasion')) mainBearingData.coarse_particle_abrasion = getBoolean('main_bearing_coarse_particle_abrasion');
    if (hasField('main_bearing_immobile_dirt_particle')) mainBearingData.immobile_dirt_particle = getBoolean('main_bearing_immobile_dirt_particle');
    if (hasField('main_bearing_insufficient_lubricant')) mainBearingData.insufficient_lubricant = getBoolean('main_bearing_insufficient_lubricant');
    if (hasField('main_bearing_water_in_lubricant')) mainBearingData.water_in_lubricant = getBoolean('main_bearing_water_in_lubricant');
    if (hasField('main_bearing_fuel_in_lubricant')) mainBearingData.fuel_in_lubricant = getBoolean('main_bearing_fuel_in_lubricant');
    if (hasField('main_bearing_chemical_corrosion')) mainBearingData.chemical_corrosion = getBoolean('main_bearing_chemical_corrosion');
    if (hasField('main_bearing_cavitation_long_idle_period')) mainBearingData.cavitation_long_idle_period = getBoolean('main_bearing_cavitation_long_idle_period');
    if (hasField('main_bearing_oxide_buildup')) mainBearingData.oxide_buildup = getBoolean('main_bearing_oxide_buildup');
    if (hasField('main_bearing_cold_start')) mainBearingData.cold_start = getBoolean('main_bearing_cold_start');
    if (hasField('main_bearing_hot_shut_down')) mainBearingData.hot_shut_down = getBoolean('main_bearing_hot_shut_down');
    if (hasField('main_bearing_offside_wear')) mainBearingData.offside_wear = getBoolean('main_bearing_offside_wear');
    if (hasField('main_bearing_thrust_load_failure')) mainBearingData.thrust_load_failure = getBoolean('main_bearing_thrust_load_failure');
    if (hasField('main_bearing_installation_technique')) mainBearingData.installation_technique = getBoolean('main_bearing_installation_technique');
    if (hasField('main_bearing_dislocation_of_bearing')) mainBearingData.dislocation_of_bearing = getBoolean('main_bearing_dislocation_of_bearing');
    if (hasField('main_bearing_comments')) mainBearingData.comments = getString('main_bearing_comments');

    await supabase.from("main_bearing_inspections").update(mainBearingData).eq("report_id", id);

    // 4. Update Con Rod Bearing Inspection
    const conRodBearingData: any = { updated_by: user.id };
    if (hasField('con_rod_bearing_fine_particle_abrasion')) conRodBearingData.fine_particle_abrasion = getBoolean('con_rod_bearing_fine_particle_abrasion');
    if (hasField('con_rod_bearing_coarse_particle_abrasion')) conRodBearingData.coarse_particle_abrasion = getBoolean('con_rod_bearing_coarse_particle_abrasion');
    if (hasField('con_rod_bearing_immobile_dirt_particle')) conRodBearingData.immobile_dirt_particle = getBoolean('con_rod_bearing_immobile_dirt_particle');
    if (hasField('con_rod_bearing_insufficient_lubricant')) conRodBearingData.insufficient_lubricant = getBoolean('con_rod_bearing_insufficient_lubricant');
    if (hasField('con_rod_bearing_water_in_lubricant')) conRodBearingData.water_in_lubricant = getBoolean('con_rod_bearing_water_in_lubricant');
    if (hasField('con_rod_bearing_fuel_in_lubricant')) conRodBearingData.fuel_in_lubricant = getBoolean('con_rod_bearing_fuel_in_lubricant');
    if (hasField('con_rod_bearing_chemical_corrosion')) conRodBearingData.chemical_corrosion = getBoolean('con_rod_bearing_chemical_corrosion');
    if (hasField('con_rod_bearing_cavitation_long_idle_period')) conRodBearingData.cavitation_long_idle_period = getBoolean('con_rod_bearing_cavitation_long_idle_period');
    if (hasField('con_rod_bearing_oxide_buildup')) conRodBearingData.oxide_buildup = getBoolean('con_rod_bearing_oxide_buildup');
    if (hasField('con_rod_bearing_cold_start')) conRodBearingData.cold_start = getBoolean('con_rod_bearing_cold_start');
    if (hasField('con_rod_bearing_hot_shut_down')) conRodBearingData.hot_shut_down = getBoolean('con_rod_bearing_hot_shut_down');
    if (hasField('con_rod_bearing_offside_wear')) conRodBearingData.offside_wear = getBoolean('con_rod_bearing_offside_wear');
    if (hasField('con_rod_bearing_thrust_load_failure')) conRodBearingData.thrust_load_failure = getBoolean('con_rod_bearing_thrust_load_failure');
    if (hasField('con_rod_bearing_installation_technique')) conRodBearingData.installation_technique = getBoolean('con_rod_bearing_installation_technique');
    if (hasField('con_rod_bearing_dislocation_of_bearing')) conRodBearingData.dislocation_of_bearing = getBoolean('con_rod_bearing_dislocation_of_bearing');
    if (hasField('con_rod_bearing_comments')) conRodBearingData.comments = getString('con_rod_bearing_comments');

    await supabase.from("con_rod_bearing_inspections").update(conRodBearingData).eq("report_id", id);

    // 5. Update Connecting Rod Arm Inspections (Left and Right)
    const conRodLeftData: any = { updated_by: user.id };
    if (hasField('con_rod_left_1_serviceable')) conRodLeftData.cylinder_1_serviceable = getBoolean('con_rod_left_1_serviceable');
    if (hasField('con_rod_left_2_serviceable')) conRodLeftData.cylinder_2_serviceable = getBoolean('con_rod_left_2_serviceable');
    if (hasField('con_rod_left_3_serviceable')) conRodLeftData.cylinder_3_serviceable = getBoolean('con_rod_left_3_serviceable');
    if (hasField('con_rod_left_4_serviceable')) conRodLeftData.cylinder_4_serviceable = getBoolean('con_rod_left_4_serviceable');
    if (hasField('con_rod_left_5_serviceable')) conRodLeftData.cylinder_5_serviceable = getBoolean('con_rod_left_5_serviceable');
    if (hasField('con_rod_left_6_serviceable')) conRodLeftData.cylinder_6_serviceable = getBoolean('con_rod_left_6_serviceable');
    if (hasField('con_rod_left_7_serviceable')) conRodLeftData.cylinder_7_serviceable = getBoolean('con_rod_left_7_serviceable');
    if (hasField('con_rod_left_8_serviceable')) conRodLeftData.cylinder_8_serviceable = getBoolean('con_rod_left_8_serviceable');
    if (hasField('con_rod_process_imperfection')) conRodLeftData.process_imperfection = getBoolean('con_rod_process_imperfection');
    if (hasField('con_rod_forming_machining_faults')) conRodLeftData.forming_machining_faults = getBoolean('con_rod_forming_machining_faults');
    if (hasField('con_rod_critical_design_feature')) conRodLeftData.critical_design_feature = getBoolean('con_rod_critical_design_feature');
    if (hasField('con_rod_hydraulic_lock')) conRodLeftData.hydraulic_lock = getBoolean('con_rod_hydraulic_lock');
    if (hasField('con_rod_bending')) conRodLeftData.bending = getBoolean('con_rod_bending');
    if (hasField('con_rod_foreign_materials')) conRodLeftData.foreign_materials = getBoolean('con_rod_foreign_materials');
    if (hasField('con_rod_misalignment')) conRodLeftData.misalignment = getBoolean('con_rod_misalignment');
    if (hasField('con_rod_others')) conRodLeftData.others = getBoolean('con_rod_others');
    if (hasField('con_rod_bearing_failure')) conRodLeftData.bearing_failure = getBoolean('con_rod_bearing_failure');
    if (hasField('con_rod_comments')) conRodLeftData.comments = getString('con_rod_comments');

    await supabase.from("connecting_rod_arm_inspections").update(conRodLeftData).eq("report_id", id).eq("bank", "left");

    const conRodRightData: any = { updated_by: user.id };
    if (hasField('con_rod_right_1_serviceable')) conRodRightData.cylinder_1_serviceable = getBoolean('con_rod_right_1_serviceable');
    if (hasField('con_rod_right_2_serviceable')) conRodRightData.cylinder_2_serviceable = getBoolean('con_rod_right_2_serviceable');
    if (hasField('con_rod_right_3_serviceable')) conRodRightData.cylinder_3_serviceable = getBoolean('con_rod_right_3_serviceable');
    if (hasField('con_rod_right_4_serviceable')) conRodRightData.cylinder_4_serviceable = getBoolean('con_rod_right_4_serviceable');
    if (hasField('con_rod_right_5_serviceable')) conRodRightData.cylinder_5_serviceable = getBoolean('con_rod_right_5_serviceable');
    if (hasField('con_rod_right_6_serviceable')) conRodRightData.cylinder_6_serviceable = getBoolean('con_rod_right_6_serviceable');
    if (hasField('con_rod_right_7_serviceable')) conRodRightData.cylinder_7_serviceable = getBoolean('con_rod_right_7_serviceable');
    if (hasField('con_rod_right_8_serviceable')) conRodRightData.cylinder_8_serviceable = getBoolean('con_rod_right_8_serviceable');
    // Apply same causes to right bank
    if (hasField('con_rod_process_imperfection')) conRodRightData.process_imperfection = getBoolean('con_rod_process_imperfection');
    if (hasField('con_rod_forming_machining_faults')) conRodRightData.forming_machining_faults = getBoolean('con_rod_forming_machining_faults');
    if (hasField('con_rod_critical_design_feature')) conRodRightData.critical_design_feature = getBoolean('con_rod_critical_design_feature');
    if (hasField('con_rod_hydraulic_lock')) conRodRightData.hydraulic_lock = getBoolean('con_rod_hydraulic_lock');
    if (hasField('con_rod_bending')) conRodRightData.bending = getBoolean('con_rod_bending');
    if (hasField('con_rod_foreign_materials')) conRodRightData.foreign_materials = getBoolean('con_rod_foreign_materials');
    if (hasField('con_rod_misalignment')) conRodRightData.misalignment = getBoolean('con_rod_misalignment');
    if (hasField('con_rod_others')) conRodRightData.others = getBoolean('con_rod_others');
    if (hasField('con_rod_bearing_failure')) conRodRightData.bearing_failure = getBoolean('con_rod_bearing_failure');
    if (hasField('con_rod_comments')) conRodRightData.comments = getString('con_rod_comments');

    await supabase.from("connecting_rod_arm_inspections").update(conRodRightData).eq("report_id", id).eq("bank", "right");

    // 6. Update Conrod Bush Inspections (Left and Right)
    const conrodBushLeftData: any = { updated_by: user.id };
    if (hasField('conrod_bush_left_1_serviceable')) conrodBushLeftData.cylinder_1_serviceable = getBoolean('conrod_bush_left_1_serviceable');
    if (hasField('conrod_bush_left_2_serviceable')) conrodBushLeftData.cylinder_2_serviceable = getBoolean('conrod_bush_left_2_serviceable');
    if (hasField('conrod_bush_left_3_serviceable')) conrodBushLeftData.cylinder_3_serviceable = getBoolean('conrod_bush_left_3_serviceable');
    if (hasField('conrod_bush_left_4_serviceable')) conrodBushLeftData.cylinder_4_serviceable = getBoolean('conrod_bush_left_4_serviceable');
    if (hasField('conrod_bush_left_5_serviceable')) conrodBushLeftData.cylinder_5_serviceable = getBoolean('conrod_bush_left_5_serviceable');
    if (hasField('conrod_bush_left_6_serviceable')) conrodBushLeftData.cylinder_6_serviceable = getBoolean('conrod_bush_left_6_serviceable');
    if (hasField('conrod_bush_left_7_serviceable')) conrodBushLeftData.cylinder_7_serviceable = getBoolean('conrod_bush_left_7_serviceable');
    if (hasField('conrod_bush_left_8_serviceable')) conrodBushLeftData.cylinder_8_serviceable = getBoolean('conrod_bush_left_8_serviceable');
    if (hasField('conrod_bush_piston_cracking')) conrodBushLeftData.piston_cracking = getBoolean('conrod_bush_piston_cracking');
    if (hasField('conrod_bush_dirt_entry')) conrodBushLeftData.dirt_entry = getBoolean('conrod_bush_dirt_entry');
    if (hasField('conrod_bush_oil_contamination')) conrodBushLeftData.oil_contamination = getBoolean('conrod_bush_oil_contamination');
    if (hasField('conrod_bush_cavitation')) conrodBushLeftData.cavitation = getBoolean('conrod_bush_cavitation');
    if (hasField('conrod_bush_counter_weighting')) conrodBushLeftData.counter_weighting = getBoolean('conrod_bush_counter_weighting');
    if (hasField('conrod_bush_corrosion')) conrodBushLeftData.corrosion = getBoolean('conrod_bush_corrosion');
    if (hasField('conrod_bush_thermal_fatigue')) conrodBushLeftData.thermal_fatigue = getBoolean('conrod_bush_thermal_fatigue');
    if (hasField('conrod_bush_others')) conrodBushLeftData.others = getBoolean('conrod_bush_others');
    if (hasField('conrod_bush_comments')) conrodBushLeftData.comments = getString('conrod_bush_comments');

    await supabase.from("conrod_bush_inspections").update(conrodBushLeftData).eq("report_id", id).eq("bank", "left");

    const conrodBushRightData: any = { updated_by: user.id };
    if (hasField('conrod_bush_right_1_serviceable')) conrodBushRightData.cylinder_1_serviceable = getBoolean('conrod_bush_right_1_serviceable');
    if (hasField('conrod_bush_right_2_serviceable')) conrodBushRightData.cylinder_2_serviceable = getBoolean('conrod_bush_right_2_serviceable');
    if (hasField('conrod_bush_right_3_serviceable')) conrodBushRightData.cylinder_3_serviceable = getBoolean('conrod_bush_right_3_serviceable');
    if (hasField('conrod_bush_right_4_serviceable')) conrodBushRightData.cylinder_4_serviceable = getBoolean('conrod_bush_right_4_serviceable');
    if (hasField('conrod_bush_right_5_serviceable')) conrodBushRightData.cylinder_5_serviceable = getBoolean('conrod_bush_right_5_serviceable');
    if (hasField('conrod_bush_right_6_serviceable')) conrodBushRightData.cylinder_6_serviceable = getBoolean('conrod_bush_right_6_serviceable');
    if (hasField('conrod_bush_right_7_serviceable')) conrodBushRightData.cylinder_7_serviceable = getBoolean('conrod_bush_right_7_serviceable');
    if (hasField('conrod_bush_right_8_serviceable')) conrodBushRightData.cylinder_8_serviceable = getBoolean('conrod_bush_right_8_serviceable');
    // Apply same causes to right bank
    if (hasField('conrod_bush_piston_cracking')) conrodBushRightData.piston_cracking = getBoolean('conrod_bush_piston_cracking');
    if (hasField('conrod_bush_dirt_entry')) conrodBushRightData.dirt_entry = getBoolean('conrod_bush_dirt_entry');
    if (hasField('conrod_bush_oil_contamination')) conrodBushRightData.oil_contamination = getBoolean('conrod_bush_oil_contamination');
    if (hasField('conrod_bush_cavitation')) conrodBushRightData.cavitation = getBoolean('conrod_bush_cavitation');
    if (hasField('conrod_bush_counter_weighting')) conrodBushRightData.counter_weighting = getBoolean('conrod_bush_counter_weighting');
    if (hasField('conrod_bush_corrosion')) conrodBushRightData.corrosion = getBoolean('conrod_bush_corrosion');
    if (hasField('conrod_bush_thermal_fatigue')) conrodBushRightData.thermal_fatigue = getBoolean('conrod_bush_thermal_fatigue');
    if (hasField('conrod_bush_others')) conrodBushRightData.others = getBoolean('conrod_bush_others');
    if (hasField('conrod_bush_comments')) conrodBushRightData.comments = getString('conrod_bush_comments');

    await supabase.from("conrod_bush_inspections").update(conrodBushRightData).eq("report_id", id).eq("bank", "right");

    // 7. Update Crankshaft Inspection
    const crankshaftData: any = { updated_by: user.id };
    if (hasField('crankshaft_status')) crankshaftData.status = getString('crankshaft_status');
    if (hasField('crankshaft_excessive_load')) crankshaftData.excessive_load = getBoolean('crankshaft_excessive_load');
    if (hasField('crankshaft_mismatch_gears_transmission')) crankshaftData.mismatch_gears_transmission = getBoolean('crankshaft_mismatch_gears_transmission');
    if (hasField('crankshaft_bad_radius_blend_fillets')) crankshaftData.bad_radius_blend_fillets = getBoolean('crankshaft_bad_radius_blend_fillets');
    if (hasField('crankshaft_bearing_failure')) crankshaftData.bearing_failure = getBoolean('crankshaft_bearing_failure');
    if (hasField('crankshaft_cracked')) crankshaftData.cracked = getBoolean('crankshaft_cracked');
    if (hasField('crankshaft_others')) crankshaftData.others = getBoolean('crankshaft_others');
    if (hasField('crankshaft_contamination')) crankshaftData.contamination = getBoolean('crankshaft_contamination');
    if (hasField('crankshaft_comments')) crankshaftData.comments = getString('crankshaft_comments');

    await supabase.from("crankshaft_inspections").update(crankshaftData).eq("report_id", id);

    // 8. Update Camshaft Inspections (Left and Right)
    const camshaftLeftData: any = { updated_by: user.id };
    if (hasField('camshaft_left_serviceable')) camshaftLeftData.serviceable = getBoolean('camshaft_left_serviceable');
    if (hasField('camshaft_left_bushing_failure')) camshaftLeftData.bushing_failure = getBoolean('camshaft_left_bushing_failure');
    if (hasField('camshaft_left_lobe_follower_failure')) camshaftLeftData.lobe_follower_failure = getBoolean('camshaft_left_lobe_follower_failure');
    if (hasField('camshaft_left_overhead_adjustment')) camshaftLeftData.overhead_adjustment = getBoolean('camshaft_left_overhead_adjustment');
    if (hasField('camshaft_left_others')) camshaftLeftData.others = getBoolean('camshaft_left_others');
    if (hasField('camshaft_comments')) camshaftLeftData.comments = getString('camshaft_comments');

    await supabase.from("camshaft_inspections").update(camshaftLeftData).eq("report_id", id).eq("bank", "left");

    const camshaftRightData: any = { updated_by: user.id };
    if (hasField('camshaft_right_serviceable')) camshaftRightData.serviceable = getBoolean('camshaft_right_serviceable');
    if (hasField('camshaft_right_bushing_failure')) camshaftRightData.bushing_failure = getBoolean('camshaft_right_bushing_failure');
    if (hasField('camshaft_right_lobe_follower_failure')) camshaftRightData.lobe_follower_failure = getBoolean('camshaft_right_lobe_follower_failure');
    if (hasField('camshaft_right_overhead_adjustment')) camshaftRightData.overhead_adjustment = getBoolean('camshaft_right_overhead_adjustment');
    if (hasField('camshaft_right_others')) camshaftRightData.others = getBoolean('camshaft_right_others');
    if (hasField('camshaft_comments')) camshaftRightData.comments = getString('camshaft_comments');

    await supabase.from("camshaft_inspections").update(camshaftRightData).eq("report_id", id).eq("bank", "right");

    // 9. Update Vibration Damper Inspection
    const vibrationDamperData: any = { updated_by: user.id };
    if (hasField('vibration_damper_serviceable')) vibrationDamperData.serviceable = getBoolean('vibration_damper_serviceable');
    if (hasField('vibration_damper_running_hours')) vibrationDamperData.running_hours = getBoolean('vibration_damper_running_hours');
    if (hasField('vibration_damper_others')) vibrationDamperData.others = getBoolean('vibration_damper_others');
    if (hasField('vibration_damper_comments')) vibrationDamperData.comments = getString('vibration_damper_comments');

    await supabase.from("vibration_damper_inspections").update(vibrationDamperData).eq("report_id", id);

    // 10. Update Cylinder Head Inspection
    const cylinderHeadData: any = { updated_by: user.id };
    if (hasField('cylinder_heads_status')) cylinderHeadData.status = getString('cylinder_heads_status');
    if (hasField('cylinder_heads_cracked_valve_injector_port')) cylinderHeadData.cracked_valve_injector_port = getBoolean('cylinder_heads_cracked_valve_injector_port');
    if (hasField('cylinder_heads_valve_failure')) cylinderHeadData.valve_failure = getBoolean('cylinder_heads_valve_failure');
    if (hasField('cylinder_heads_cracked_valve_port')) cylinderHeadData.cracked_valve_port = getBoolean('cylinder_heads_cracked_valve_port');
    if (hasField('cylinder_heads_broken_valve_spring')) cylinderHeadData.broken_valve_spring = getBoolean('cylinder_heads_broken_valve_spring');
    if (hasField('cylinder_heads_cracked_head_core')) cylinderHeadData.cracked_head_core = getBoolean('cylinder_heads_cracked_head_core');
    if (hasField('cylinder_heads_others_scratches_pinholes')) cylinderHeadData.others_scratches_pinholes = getBoolean('cylinder_heads_others_scratches_pinholes');
    if (hasField('cylinder_heads_comments')) cylinderHeadData.comments = getString('cylinder_heads_comments');

    await supabase.from("cylinder_head_inspections").update(cylinderHeadData).eq("report_id", id);

    // 11. Update Engine Valve Inspection
    const engineValveData: any = { updated_by: user.id };
    if (hasField('engine_valves_serviceable')) engineValveData.serviceable = getBoolean('engine_valves_serviceable');
    if (hasField('engine_valves_erosion_fillet')) engineValveData.erosion_fillet = getBoolean('engine_valves_erosion_fillet');
    if (hasField('engine_valves_thermal_fatigue')) engineValveData.thermal_fatigue = getBoolean('engine_valves_thermal_fatigue');
    if (hasField('engine_valves_stuck_up')) engineValveData.stuck_up = getBoolean('engine_valves_stuck_up');
    if (hasField('engine_valves_broken_stem')) engineValveData.broken_stem = getBoolean('engine_valves_broken_stem');
    if (hasField('engine_valves_guttering_channeling')) engineValveData.guttering_channeling = getBoolean('engine_valves_guttering_channeling');
    if (hasField('engine_valves_others')) engineValveData.others = getBoolean('engine_valves_others');
    if (hasField('engine_valves_mechanical_fatigue')) engineValveData.mechanical_fatigue = getBoolean('engine_valves_mechanical_fatigue');
    if (hasField('engine_valves_comments')) engineValveData.comments = getString('engine_valves_comments');

    await supabase.from("engine_valve_inspections").update(engineValveData).eq("report_id", id);

    // 12. Update Valve Crosshead Inspection
    const valveCrossheadData: any = { updated_by: user.id };
    if (hasField('valve_crossheads_serviceable')) valveCrossheadData.serviceable = getBoolean('valve_crossheads_serviceable');
    if (hasField('valve_crossheads_comments')) valveCrossheadData.comments = getString('valve_crossheads_comments');

    await supabase.from("valve_crosshead_inspections").update(valveCrossheadData).eq("report_id", id);

    // 13. Update Piston Inspections (Left and Right)
    const pistonLeftData: any = { updated_by: user.id };
    if (hasField('pistons_left_serviceable')) pistonLeftData.serviceable = getBoolean('pistons_left_serviceable');
    if (hasField('pistons_left_scored')) pistonLeftData.scored = getBoolean('pistons_left_scored');
    if (hasField('pistons_left_crown_damage')) pistonLeftData.crown_damage = getBoolean('pistons_left_crown_damage');
    if (hasField('pistons_left_burning')) pistonLeftData.burning = getBoolean('pistons_left_burning');
    if (hasField('pistons_left_piston_fracture')) pistonLeftData.piston_fracture = getBoolean('pistons_left_piston_fracture');
    if (hasField('pistons_left_thrust_anti_thrust_scoring')) pistonLeftData.thrust_anti_thrust_scoring = getBoolean('pistons_left_thrust_anti_thrust_scoring');
    if (hasField('pistons_left_ring_groove_wear')) pistonLeftData.ring_groove_wear = getBoolean('pistons_left_ring_groove_wear');
    if (hasField('pistons_left_pin_bore_wear')) pistonLeftData.pin_bore_wear = getBoolean('pistons_left_pin_bore_wear');
    if (hasField('pistons_comments')) pistonLeftData.comments = getString('pistons_comments');

    await supabase.from("piston_inspections").update(pistonLeftData).eq("report_id", id).eq("bank", "left");

    const pistonRightData: any = { updated_by: user.id };
    if (hasField('pistons_right_serviceable')) pistonRightData.serviceable = getBoolean('pistons_right_serviceable');
    if (hasField('pistons_right_scored')) pistonRightData.scored = getBoolean('pistons_right_scored');
    if (hasField('pistons_right_crown_damage')) pistonRightData.crown_damage = getBoolean('pistons_right_crown_damage');
    if (hasField('pistons_right_burning')) pistonRightData.burning = getBoolean('pistons_right_burning');
    if (hasField('pistons_right_piston_fracture')) pistonRightData.piston_fracture = getBoolean('pistons_right_piston_fracture');
    if (hasField('pistons_right_thrust_anti_thrust_scoring')) pistonRightData.thrust_anti_thrust_scoring = getBoolean('pistons_right_thrust_anti_thrust_scoring');
    if (hasField('pistons_right_ring_groove_wear')) pistonRightData.ring_groove_wear = getBoolean('pistons_right_ring_groove_wear');
    if (hasField('pistons_right_pin_bore_wear')) pistonRightData.pin_bore_wear = getBoolean('pistons_right_pin_bore_wear');
    if (hasField('pistons_comments')) pistonRightData.comments = getString('pistons_comments');

    await supabase.from("piston_inspections").update(pistonRightData).eq("report_id", id).eq("bank", "right");

    // 14. Update Cylinder Liner Inspections (Left and Right)
    const cylinderLinerLeftData: any = { updated_by: user.id };
    if (hasField('cylinder_liners_left_serviceable')) cylinderLinerLeftData.serviceable = getBoolean('cylinder_liners_left_serviceable');
    if (hasField('cylinder_liners_left_scoring')) cylinderLinerLeftData.scoring = getBoolean('cylinder_liners_left_scoring');
    if (hasField('cylinder_liners_left_corrosion')) cylinderLinerLeftData.corrosion = getBoolean('cylinder_liners_left_corrosion');
    if (hasField('cylinder_liners_left_cracking')) cylinderLinerLeftData.cracking = getBoolean('cylinder_liners_left_cracking');
    if (hasField('cylinder_liners_left_fretting')) cylinderLinerLeftData.fretting = getBoolean('cylinder_liners_left_fretting');
    if (hasField('cylinder_liners_left_cavitation')) cylinderLinerLeftData.cavitation = getBoolean('cylinder_liners_left_cavitation');
    if (hasField('cylinder_liners_left_pin_holes')) cylinderLinerLeftData.pin_holes = getBoolean('cylinder_liners_left_pin_holes');
    if (hasField('cylinder_liners_comments')) cylinderLinerLeftData.comments = getString('cylinder_liners_comments');

    await supabase.from("cylinder_liner_inspections").update(cylinderLinerLeftData).eq("report_id", id).eq("bank", "left");

    const cylinderLinerRightData: any = { updated_by: user.id };
    if (hasField('cylinder_liners_right_serviceable')) cylinderLinerRightData.serviceable = getBoolean('cylinder_liners_right_serviceable');
    if (hasField('cylinder_liners_right_scoring')) cylinderLinerRightData.scoring = getBoolean('cylinder_liners_right_scoring');
    if (hasField('cylinder_liners_right_corrosion')) cylinderLinerRightData.corrosion = getBoolean('cylinder_liners_right_corrosion');
    if (hasField('cylinder_liners_right_cracking')) cylinderLinerRightData.cracking = getBoolean('cylinder_liners_right_cracking');
    if (hasField('cylinder_liners_right_fretting')) cylinderLinerRightData.fretting = getBoolean('cylinder_liners_right_fretting');
    if (hasField('cylinder_liners_right_cavitation')) cylinderLinerRightData.cavitation = getBoolean('cylinder_liners_right_cavitation');
    if (hasField('cylinder_liners_right_pin_holes')) cylinderLinerRightData.pin_holes = getBoolean('cylinder_liners_right_pin_holes');
    if (hasField('cylinder_liners_comments')) cylinderLinerRightData.comments = getString('cylinder_liners_comments');

    await supabase.from("cylinder_liner_inspections").update(cylinderLinerRightData).eq("report_id", id).eq("bank", "right");

    // 15. Update Component Inspections
    const componentTypes = [
      { type: 'timing_gear', serviceable: 'timing_gear_serviceable', comments: 'timing_gear_comments' },
      { type: 'turbo_chargers', serviceable: 'turbo_chargers_serviceable', comments: 'turbo_chargers_comments' },
      { type: 'accessories_drive', serviceable: 'accessories_drive_serviceable', comments: 'accessories_drive_comments' },
      { type: 'idler_gear', serviceable: 'idler_gear_serviceable', comments: 'idler_gear_comments' },
      { type: 'oil_pump', serviceable: 'oil_pump_serviceable', comments: 'oil_pump_comments' },
      { type: 'water_pump', serviceable: 'water_pump_serviceable', comments: 'water_pump_comments' },
      { type: 'starting_motor', serviceable: 'starting_motor_serviceable', comments: 'starting_motor_comments' },
      { type: 'charging_alternator', serviceable: 'charging_alternator_serviceable', comments: 'charging_alternator_comments' },
    ];

    for (const comp of componentTypes) {
      const compData: any = { updated_by: user.id };
      if (hasField(comp.serviceable)) compData.serviceable = getBoolean(comp.serviceable);
      if (hasField(comp.comments)) compData.comments = getString(comp.comments);

      await supabase.from("component_inspections").update(compData).eq("report_id", id).eq("component_type", comp.type);
    }

    // 16. Update Missing Components
    if (hasField('missing_components')) {
      const missingData = {
        component_description: getString('missing_components'),
        updated_by: user.id,
      };

      // Check if record exists
      const { data: existingMissing } = await supabase
        .from("missing_components")
        .select("id")
        .eq("report_id", id)
        .single();

      if (existingMissing) {
        await supabase.from("missing_components").update(missingData).eq("report_id", id);
      } else {
        await supabase.from("missing_components").insert([{
          report_id: id,
          component_description: getString('missing_components'),
          created_by: user.id,
          updated_by: user.id,
        }]);
      }
    }

    // 17. Update Major Components Summary
    const majorData: any = { updated_by: user.id };
    if (hasField('component_cylinder_block')) majorData.cylinder_block = getString('component_cylinder_block');
    if (hasField('component_crankshaft')) majorData.crankshaft = getString('component_crankshaft');
    if (hasField('component_camshaft')) majorData.camshaft = getString('component_camshaft');
    if (hasField('component_connecting_rod')) majorData.connecting_rod = getString('component_connecting_rod');
    if (hasField('component_timing_gear')) majorData.timing_gear = getString('component_timing_gear');
    if (hasField('component_idler_gear')) majorData.idler_gear = getString('component_idler_gear');
    if (hasField('component_accessory_drive_gear')) majorData.accessory_drive_gear = getString('component_accessory_drive_gear');
    if (hasField('component_water_pump_drive_gear')) majorData.water_pump_drive_gear = getString('component_water_pump_drive_gear');
    if (hasField('component_cylinder_head')) majorData.cylinder_head = getString('component_cylinder_head');
    if (hasField('component_oil_cooler')) majorData.oil_cooler = getString('component_oil_cooler');
    if (hasField('component_exhaust_manifold')) majorData.exhaust_manifold = getString('component_exhaust_manifold');
    if (hasField('component_turbo_chargers')) majorData.turbo_chargers = getString('component_turbo_chargers');
    if (hasField('component_intake_manifold')) majorData.intake_manifold = getString('component_intake_manifold');
    if (hasField('component_flywheel_housing')) majorData.flywheel_housing = getString('component_flywheel_housing');
    if (hasField('component_flywheel')) majorData.flywheel = getString('component_flywheel');
    if (hasField('component_ring_gear')) majorData.ring_gear = getString('component_ring_gear');
    if (hasField('component_oil_pan')) majorData.oil_pan = getString('component_oil_pan');
    if (hasField('component_front_engine_support')) majorData.front_engine_support = getString('component_front_engine_support');
    if (hasField('component_rear_engine_support')) majorData.rear_engine_support = getString('component_rear_engine_support');
    if (hasField('component_front_engine_cover')) majorData.front_engine_cover = getString('component_front_engine_cover');
    if (hasField('component_pulleys')) majorData.pulleys = getString('component_pulleys');
    if (hasField('component_fan_hub')) majorData.fan_hub = getString('component_fan_hub');
    if (hasField('component_air_compressor')) majorData.air_compressor = getString('component_air_compressor');
    if (hasField('component_injection_pump')) majorData.injection_pump = getString('component_injection_pump');
    if (hasField('component_others')) majorData.others = getString('component_others');

    await supabase.from("major_components_summary").update(majorData).eq("report_id", id);

    // Fetch and return the complete updated report
    const { data: completeReport, error: fetchError } = await supabase
      .from("engine_teardown_reports")
      .select(`
        *,
        cylinder_block_inspections(*),
        main_bearing_inspections(*),
        con_rod_bearing_inspections(*),
        connecting_rod_arm_inspections(*),
        conrod_bush_inspections(*),
        crankshaft_inspections(*),
        camshaft_inspections(*),
        vibration_damper_inspections(*),
        cylinder_head_inspections(*),
        engine_valve_inspections(*),
        valve_crosshead_inspections(*),
        piston_inspections(*),
        cylinder_liner_inspections(*),
        component_inspections(*),
        missing_components(*),
        major_components_summary(*)
      `)
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching updated report:", fetchError);
      return NextResponse.json({ success: true, message: "Report updated" });
    }

    return NextResponse.json({ success: true, data: completeReport });
  } catch (error: any) {
    console.error("API error updating engine teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error deleting engine teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Engine Teardown Report deleted successfully", data });
  } catch (error: any) {
    console.error("API error deleting engine teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});
