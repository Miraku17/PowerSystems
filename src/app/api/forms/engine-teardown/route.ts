import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Fetch main reports with all related data
    const { data: reports, error } = await supabase
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
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching engine teardown reports:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const formRecords = reports.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_number,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
      updated_by: record.updated_by,
      companyForm: {
        id: "engine-teardown",
        name: "Engine Teardown Report",
        formType: "engine-teardown",
      },
    }));

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching engine teardown reports:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    const getString = (key: string) => formData.get(key) as string || '';
    const getBoolean = (key: string) => formData.get(key) === 'true';

    // Header Information
    const customer = getString('customer');
    const job_number = getString('job_number');
    const engine_model = getString('engine_model');
    const serial_no = getString('serial_no');
    const attending_technician = getString('attending_technician');
    const service_supervisor = getString('service_supervisor');

    // Signatures
    const attending_technician_signature = getString('attending_technician_signature');
    const service_supervisor_signature = getString('service_supervisor_signature');

    // 1. Insert main report first
    const { data: reportData, error: reportError } = await supabase
      .from("engine_teardown_reports")
      .insert([{
        customer,
        job_number,
        engine_model,
        serial_no,
        attending_technician,
        service_supervisor,
        attending_technician_signature,
        service_supervisor_signature,
        created_by: user.id,
        updated_by: user.id,
      }])
      .select()
      .single();

    if (reportError) {
      console.error("Error creating main report:", reportError);
      return NextResponse.json({ success: false, message: reportError.message }, { status: 500 });
    }

    const report_id = reportData.id;

    // 2. Insert Cylinder Block Inspection
    const { error: cylinderBlockError } = await supabase
      .from("cylinder_block_inspections")
      .insert([{
        report_id,
        cam_shaft_bushing_bore: getString('cam_shaft_bushing_bore'),
        cylinder_liner_counter_bore: getString('cylinder_liner_counter_bore'),
        liner_to_block_clearance: getString('liner_to_block_clearance'),
        lower_liner_bore: getString('lower_liner_bore'),
        upper_liner_bore: getString('upper_liner_bore'),
        top_deck: getString('top_deck'),
        comments: getString('cylinder_block_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (cylinderBlockError) {
      console.error("Error creating cylinder block inspection:", cylinderBlockError);
    }

    // 3. Insert Main Bearing Inspection
    const { error: mainBearingError } = await supabase
      .from("main_bearing_inspections")
      .insert([{
        report_id,
        fine_particle_abrasion: getBoolean('main_bearing_fine_particle_abrasion'),
        coarse_particle_abrasion: getBoolean('main_bearing_coarse_particle_abrasion'),
        immobile_dirt_particle: getBoolean('main_bearing_immobile_dirt_particle'),
        insufficient_lubricant: getBoolean('main_bearing_insufficient_lubricant'),
        water_in_lubricant: getBoolean('main_bearing_water_in_lubricant'),
        fuel_in_lubricant: getBoolean('main_bearing_fuel_in_lubricant'),
        chemical_corrosion: getBoolean('main_bearing_chemical_corrosion'),
        cavitation_long_idle_period: getBoolean('main_bearing_cavitation_long_idle_period'),
        oxide_buildup: getBoolean('main_bearing_oxide_buildup'),
        cold_start: getBoolean('main_bearing_cold_start'),
        hot_shut_down: getBoolean('main_bearing_hot_shut_down'),
        offside_wear: getBoolean('main_bearing_offside_wear'),
        thrust_load_failure: getBoolean('main_bearing_thrust_load_failure'),
        installation_technique: getBoolean('main_bearing_installation_technique'),
        dislocation_of_bearing: getBoolean('main_bearing_dislocation_of_bearing'),
        comments: getString('main_bearing_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (mainBearingError) {
      console.error("Error creating main bearing inspection:", mainBearingError);
    }

    // 4. Insert Con Rod Bearing Inspection
    const { error: conRodBearingError } = await supabase
      .from("con_rod_bearing_inspections")
      .insert([{
        report_id,
        fine_particle_abrasion: getBoolean('con_rod_bearing_fine_particle_abrasion'),
        coarse_particle_abrasion: getBoolean('con_rod_bearing_coarse_particle_abrasion'),
        immobile_dirt_particle: getBoolean('con_rod_bearing_immobile_dirt_particle'),
        insufficient_lubricant: getBoolean('con_rod_bearing_insufficient_lubricant'),
        water_in_lubricant: getBoolean('con_rod_bearing_water_in_lubricant'),
        fuel_in_lubricant: getBoolean('con_rod_bearing_fuel_in_lubricant'),
        chemical_corrosion: getBoolean('con_rod_bearing_chemical_corrosion'),
        cavitation_long_idle_period: getBoolean('con_rod_bearing_cavitation_long_idle_period'),
        oxide_buildup: getBoolean('con_rod_bearing_oxide_buildup'),
        cold_start: getBoolean('con_rod_bearing_cold_start'),
        hot_shut_down: getBoolean('con_rod_bearing_hot_shut_down'),
        offside_wear: getBoolean('con_rod_bearing_offside_wear'),
        thrust_load_failure: getBoolean('con_rod_bearing_thrust_load_failure'),
        installation_technique: getBoolean('con_rod_bearing_installation_technique'),
        dislocation_of_bearing: getBoolean('con_rod_bearing_dislocation_of_bearing'),
        comments: getString('con_rod_bearing_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (conRodBearingError) {
      console.error("Error creating con rod bearing inspection:", conRodBearingError);
    }

    // 5. Insert Connecting Rod Arm Inspections (Left and Right banks)
    const { error: conRodLeftError } = await supabase
      .from("connecting_rod_arm_inspections")
      .insert([{
        report_id,
        bank: 'left',
        cylinder_1_serviceable: getBoolean('con_rod_left_1_serviceable'),
        cylinder_2_serviceable: getBoolean('con_rod_left_2_serviceable'),
        cylinder_3_serviceable: getBoolean('con_rod_left_3_serviceable'),
        cylinder_4_serviceable: getBoolean('con_rod_left_4_serviceable'),
        cylinder_5_serviceable: getBoolean('con_rod_left_5_serviceable'),
        cylinder_6_serviceable: getBoolean('con_rod_left_6_serviceable'),
        cylinder_7_serviceable: getBoolean('con_rod_left_7_serviceable'),
        cylinder_8_serviceable: getBoolean('con_rod_left_8_serviceable'),
        process_imperfection: getBoolean('con_rod_process_imperfection'),
        forming_machining_faults: getBoolean('con_rod_forming_machining_faults'),
        critical_design_feature: getBoolean('con_rod_critical_design_feature'),
        hydraulic_lock: getBoolean('con_rod_hydraulic_lock'),
        bending: getBoolean('con_rod_bending'),
        foreign_materials: getBoolean('con_rod_foreign_materials'),
        misalignment: getBoolean('con_rod_misalignment'),
        others: getBoolean('con_rod_others'),
        bearing_failure: getBoolean('con_rod_bearing_failure'),
        comments: getString('con_rod_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (conRodLeftError) {
      console.error("Error creating connecting rod left inspection:", conRodLeftError);
    }

    const { error: conRodRightError } = await supabase
      .from("connecting_rod_arm_inspections")
      .insert([{
        report_id,
        bank: 'right',
        cylinder_1_serviceable: getBoolean('con_rod_right_1_serviceable'),
        cylinder_2_serviceable: getBoolean('con_rod_right_2_serviceable'),
        cylinder_3_serviceable: getBoolean('con_rod_right_3_serviceable'),
        cylinder_4_serviceable: getBoolean('con_rod_right_4_serviceable'),
        cylinder_5_serviceable: getBoolean('con_rod_right_5_serviceable'),
        cylinder_6_serviceable: getBoolean('con_rod_right_6_serviceable'),
        cylinder_7_serviceable: getBoolean('con_rod_right_7_serviceable'),
        cylinder_8_serviceable: getBoolean('con_rod_right_8_serviceable'),
        process_imperfection: getBoolean('con_rod_process_imperfection'),
        forming_machining_faults: getBoolean('con_rod_forming_machining_faults'),
        critical_design_feature: getBoolean('con_rod_critical_design_feature'),
        hydraulic_lock: getBoolean('con_rod_hydraulic_lock'),
        bending: getBoolean('con_rod_bending'),
        foreign_materials: getBoolean('con_rod_foreign_materials'),
        misalignment: getBoolean('con_rod_misalignment'),
        others: getBoolean('con_rod_others'),
        bearing_failure: getBoolean('con_rod_bearing_failure'),
        comments: getString('con_rod_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (conRodRightError) {
      console.error("Error creating connecting rod right inspection:", conRodRightError);
    }

    // 6. Insert Conrod Bush Inspections (Left and Right banks)
    const { error: conrodBushLeftError } = await supabase
      .from("conrod_bush_inspections")
      .insert([{
        report_id,
        bank: 'left',
        cylinder_1_serviceable: getBoolean('conrod_bush_left_1_serviceable'),
        cylinder_2_serviceable: getBoolean('conrod_bush_left_2_serviceable'),
        cylinder_3_serviceable: getBoolean('conrod_bush_left_3_serviceable'),
        cylinder_4_serviceable: getBoolean('conrod_bush_left_4_serviceable'),
        cylinder_5_serviceable: getBoolean('conrod_bush_left_5_serviceable'),
        cylinder_6_serviceable: getBoolean('conrod_bush_left_6_serviceable'),
        cylinder_7_serviceable: getBoolean('conrod_bush_left_7_serviceable'),
        cylinder_8_serviceable: getBoolean('conrod_bush_left_8_serviceable'),
        piston_cracking: getBoolean('conrod_bush_piston_cracking'),
        dirt_entry: getBoolean('conrod_bush_dirt_entry'),
        oil_contamination: getBoolean('conrod_bush_oil_contamination'),
        cavitation: getBoolean('conrod_bush_cavitation'),
        counter_weighting: getBoolean('conrod_bush_counter_weighting'),
        corrosion: getBoolean('conrod_bush_corrosion'),
        thermal_fatigue: getBoolean('conrod_bush_thermal_fatigue'),
        others: getBoolean('conrod_bush_others'),
        comments: getString('conrod_bush_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (conrodBushLeftError) {
      console.error("Error creating conrod bush left inspection:", conrodBushLeftError);
    }

    const { error: conrodBushRightError } = await supabase
      .from("conrod_bush_inspections")
      .insert([{
        report_id,
        bank: 'right',
        cylinder_1_serviceable: getBoolean('conrod_bush_right_1_serviceable'),
        cylinder_2_serviceable: getBoolean('conrod_bush_right_2_serviceable'),
        cylinder_3_serviceable: getBoolean('conrod_bush_right_3_serviceable'),
        cylinder_4_serviceable: getBoolean('conrod_bush_right_4_serviceable'),
        cylinder_5_serviceable: getBoolean('conrod_bush_right_5_serviceable'),
        cylinder_6_serviceable: getBoolean('conrod_bush_right_6_serviceable'),
        cylinder_7_serviceable: getBoolean('conrod_bush_right_7_serviceable'),
        cylinder_8_serviceable: getBoolean('conrod_bush_right_8_serviceable'),
        piston_cracking: getBoolean('conrod_bush_piston_cracking'),
        dirt_entry: getBoolean('conrod_bush_dirt_entry'),
        oil_contamination: getBoolean('conrod_bush_oil_contamination'),
        cavitation: getBoolean('conrod_bush_cavitation'),
        counter_weighting: getBoolean('conrod_bush_counter_weighting'),
        corrosion: getBoolean('conrod_bush_corrosion'),
        thermal_fatigue: getBoolean('conrod_bush_thermal_fatigue'),
        others: getBoolean('conrod_bush_others'),
        comments: getString('conrod_bush_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (conrodBushRightError) {
      console.error("Error creating conrod bush right inspection:", conrodBushRightError);
    }

    // 7. Insert Crankshaft Inspection
    const { error: crankshaftError } = await supabase
      .from("crankshaft_inspections")
      .insert([{
        report_id,
        status: getString('crankshaft_status') || null,
        excessive_load: getBoolean('crankshaft_excessive_load'),
        mismatch_gears_transmission: getBoolean('crankshaft_mismatch_gears_transmission'),
        bad_radius_blend_fillets: getBoolean('crankshaft_bad_radius_blend_fillets'),
        bearing_failure: getBoolean('crankshaft_bearing_failure'),
        cracked: getBoolean('crankshaft_cracked'),
        others: getBoolean('crankshaft_others'),
        contamination: getBoolean('crankshaft_contamination'),
        comments: getString('crankshaft_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (crankshaftError) {
      console.error("Error creating crankshaft inspection:", crankshaftError);
    }

    // 8. Insert Camshaft Inspections (Left and Right)
    const { error: camshaftLeftError } = await supabase
      .from("camshaft_inspections")
      .insert([{
        report_id,
        bank: 'left',
        serviceable: getBoolean('camshaft_left_serviceable'),
        bushing_failure: getBoolean('camshaft_left_bushing_failure'),
        lobe_follower_failure: getBoolean('camshaft_left_lobe_follower_failure'),
        overhead_adjustment: getBoolean('camshaft_left_overhead_adjustment'),
        others: getBoolean('camshaft_left_others'),
        comments: getString('camshaft_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (camshaftLeftError) {
      console.error("Error creating camshaft left inspection:", camshaftLeftError);
    }

    const { error: camshaftRightError } = await supabase
      .from("camshaft_inspections")
      .insert([{
        report_id,
        bank: 'right',
        serviceable: getBoolean('camshaft_right_serviceable'),
        bushing_failure: getBoolean('camshaft_right_bushing_failure'),
        lobe_follower_failure: getBoolean('camshaft_right_lobe_follower_failure'),
        overhead_adjustment: getBoolean('camshaft_right_overhead_adjustment'),
        others: getBoolean('camshaft_right_others'),
        comments: getString('camshaft_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (camshaftRightError) {
      console.error("Error creating camshaft right inspection:", camshaftRightError);
    }

    // 9. Insert Vibration Damper Inspection
    const { error: vibrationDamperError } = await supabase
      .from("vibration_damper_inspections")
      .insert([{
        report_id,
        serviceable: getBoolean('vibration_damper_serviceable'),
        running_hours: getBoolean('vibration_damper_running_hours'),
        others: getBoolean('vibration_damper_others'),
        comments: getString('vibration_damper_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (vibrationDamperError) {
      console.error("Error creating vibration damper inspection:", vibrationDamperError);
    }

    // 10. Insert Cylinder Head Inspection
    const { error: cylinderHeadError } = await supabase
      .from("cylinder_head_inspections")
      .insert([{
        report_id,
        status: getString('cylinder_heads_status') || null,
        cracked_valve_injector_port: getBoolean('cylinder_heads_cracked_valve_injector_port'),
        valve_failure: getBoolean('cylinder_heads_valve_failure'),
        cracked_valve_port: getBoolean('cylinder_heads_cracked_valve_port'),
        broken_valve_spring: getBoolean('cylinder_heads_broken_valve_spring'),
        cracked_head_core: getBoolean('cylinder_heads_cracked_head_core'),
        others_scratches_pinholes: getBoolean('cylinder_heads_others_scratches_pinholes'),
        comments: getString('cylinder_heads_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (cylinderHeadError) {
      console.error("Error creating cylinder head inspection:", cylinderHeadError);
    }

    // 11. Insert Engine Valve Inspection
    const { error: engineValveError } = await supabase
      .from("engine_valve_inspections")
      .insert([{
        report_id,
        serviceable: getBoolean('engine_valves_serviceable'),
        erosion_fillet: getBoolean('engine_valves_erosion_fillet'),
        thermal_fatigue: getBoolean('engine_valves_thermal_fatigue'),
        stuck_up: getBoolean('engine_valves_stuck_up'),
        broken_stem: getBoolean('engine_valves_broken_stem'),
        guttering_channeling: getBoolean('engine_valves_guttering_channeling'),
        others: getBoolean('engine_valves_others'),
        mechanical_fatigue: getBoolean('engine_valves_mechanical_fatigue'),
        comments: getString('engine_valves_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (engineValveError) {
      console.error("Error creating engine valve inspection:", engineValveError);
    }

    // 12. Insert Valve Crosshead Inspection
    const { error: valveCrossheadError } = await supabase
      .from("valve_crosshead_inspections")
      .insert([{
        report_id,
        serviceable: getBoolean('valve_crossheads_serviceable'),
        comments: getString('valve_crossheads_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (valveCrossheadError) {
      console.error("Error creating valve crosshead inspection:", valveCrossheadError);
    }

    // 13. Insert Piston Inspections (Left and Right)
    const { error: pistonLeftError } = await supabase
      .from("piston_inspections")
      .insert([{
        report_id,
        bank: 'left',
        serviceable: getBoolean('pistons_left_serviceable'),
        scored: getBoolean('pistons_left_scored'),
        crown_damage: getBoolean('pistons_left_crown_damage'),
        burning: getBoolean('pistons_left_burning'),
        piston_fracture: getBoolean('pistons_left_piston_fracture'),
        thrust_anti_thrust_scoring: getBoolean('pistons_left_thrust_anti_thrust_scoring'),
        ring_groove_wear: getBoolean('pistons_left_ring_groove_wear'),
        pin_bore_wear: getBoolean('pistons_left_pin_bore_wear'),
        comments: getString('pistons_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (pistonLeftError) {
      console.error("Error creating piston left inspection:", pistonLeftError);
    }

    const { error: pistonRightError } = await supabase
      .from("piston_inspections")
      .insert([{
        report_id,
        bank: 'right',
        serviceable: getBoolean('pistons_right_serviceable'),
        scored: getBoolean('pistons_right_scored'),
        crown_damage: getBoolean('pistons_right_crown_damage'),
        burning: getBoolean('pistons_right_burning'),
        piston_fracture: getBoolean('pistons_right_piston_fracture'),
        thrust_anti_thrust_scoring: getBoolean('pistons_right_thrust_anti_thrust_scoring'),
        ring_groove_wear: getBoolean('pistons_right_ring_groove_wear'),
        pin_bore_wear: getBoolean('pistons_right_pin_bore_wear'),
        comments: getString('pistons_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (pistonRightError) {
      console.error("Error creating piston right inspection:", pistonRightError);
    }

    // 14. Insert Cylinder Liner Inspections (Left and Right)
    const { error: cylinderLinerLeftError } = await supabase
      .from("cylinder_liner_inspections")
      .insert([{
        report_id,
        bank: 'left',
        serviceable: getBoolean('cylinder_liners_left_serviceable'),
        scoring: getBoolean('cylinder_liners_left_scoring'),
        corrosion: getBoolean('cylinder_liners_left_corrosion'),
        cracking: getBoolean('cylinder_liners_left_cracking'),
        fretting: getBoolean('cylinder_liners_left_fretting'),
        cavitation: getBoolean('cylinder_liners_left_cavitation'),
        pin_holes: getBoolean('cylinder_liners_left_pin_holes'),
        comments: getString('cylinder_liners_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (cylinderLinerLeftError) {
      console.error("Error creating cylinder liner left inspection:", cylinderLinerLeftError);
    }

    const { error: cylinderLinerRightError } = await supabase
      .from("cylinder_liner_inspections")
      .insert([{
        report_id,
        bank: 'right',
        serviceable: getBoolean('cylinder_liners_right_serviceable'),
        scoring: getBoolean('cylinder_liners_right_scoring'),
        corrosion: getBoolean('cylinder_liners_right_corrosion'),
        cracking: getBoolean('cylinder_liners_right_cracking'),
        fretting: getBoolean('cylinder_liners_right_fretting'),
        cavitation: getBoolean('cylinder_liners_right_cavitation'),
        pin_holes: getBoolean('cylinder_liners_right_pin_holes'),
        comments: getString('cylinder_liners_comments'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (cylinderLinerRightError) {
      console.error("Error creating cylinder liner right inspection:", cylinderLinerRightError);
    }

    // 15. Insert Component Inspections
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
      const { error: compError } = await supabase
        .from("component_inspections")
        .insert([{
          report_id,
          component_type: comp.type,
          serviceable: getBoolean(comp.serviceable),
          comments: getString(comp.comments),
          created_by: user.id,
          updated_by: user.id,
        }]);

      if (compError) {
        console.error(`Error creating ${comp.type} inspection:`, compError);
      }
    }

    // 16. Insert Missing Components
    const missingComponentsText = getString('missing_components');
    if (missingComponentsText) {
      const { error: missingError } = await supabase
        .from("missing_components")
        .insert([{
          report_id,
          component_description: missingComponentsText,
          created_by: user.id,
          updated_by: user.id,
        }]);

      if (missingError) {
        console.error("Error creating missing components:", missingError);
      }
    }

    // 17. Insert Major Components Summary
    const { error: majorComponentsError } = await supabase
      .from("major_components_summary")
      .insert([{
        report_id,
        cylinder_block: getString('component_cylinder_block'),
        crankshaft: getString('component_crankshaft'),
        camshaft: getString('component_camshaft'),
        connecting_rod: getString('component_connecting_rod'),
        timing_gear: getString('component_timing_gear'),
        idler_gear: getString('component_idler_gear'),
        accessory_drive_gear: getString('component_accessory_drive_gear'),
        water_pump_drive_gear: getString('component_water_pump_drive_gear'),
        cylinder_head: getString('component_cylinder_head'),
        oil_cooler: getString('component_oil_cooler'),
        exhaust_manifold: getString('component_exhaust_manifold'),
        turbo_chargers: getString('component_turbo_chargers'),
        intake_manifold: getString('component_intake_manifold'),
        flywheel_housing: getString('component_flywheel_housing'),
        flywheel: getString('component_flywheel'),
        ring_gear: getString('component_ring_gear'),
        oil_pan: getString('component_oil_pan'),
        front_engine_support: getString('component_front_engine_support'),
        rear_engine_support: getString('component_rear_engine_support'),
        front_engine_cover: getString('component_front_engine_cover'),
        pulleys: getString('component_pulleys'),
        fan_hub: getString('component_fan_hub'),
        air_compressor: getString('component_air_compressor'),
        injection_pump: getString('component_injection_pump'),
        others: getString('component_others'),
        created_by: user.id,
        updated_by: user.id,
      }]);

    if (majorComponentsError) {
      console.error("Error creating major components summary:", majorComponentsError);
    }

    // Fetch the complete report with all related data
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
      .eq("id", report_id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete report:", fetchError);
      return NextResponse.json({ success: true, data: reportData }, { status: 201 });
    }

    return NextResponse.json({ success: true, data: completeReport }, { status: 201 });
  } catch (error: any) {
    console.error("API error creating engine teardown report:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
  }
});
