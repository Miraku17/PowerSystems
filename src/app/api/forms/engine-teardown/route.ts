import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching engine teardown reports:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const formRecords = data.map((record: any) => ({
      id: record.id,
      companyFormId: null,
      job_order: record.job_number,
      data: record,
      dateCreated: record.created_at,
      dateUpdated: record.updated_at,
      created_by: record.created_by,
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

    // 1. Cylinder Block
    const cam_shaft_bushing_bore = getString('cam_shaft_bushing_bore');
    const cylinder_liner_counter_bore = getString('cylinder_liner_counter_bore');
    const liner_to_block_clearance = getString('liner_to_block_clearance');
    const lower_liner_bore = getString('lower_liner_bore');
    const upper_liner_bore = getString('upper_liner_bore');
    const top_deck = getString('top_deck');
    const cylinder_block_comments = getString('cylinder_block_comments');

    // 2. Main Bearings
    const main_bearing_fine_particle_abrasion = getBoolean('main_bearing_fine_particle_abrasion');
    const main_bearing_coarse_particle_abrasion = getBoolean('main_bearing_coarse_particle_abrasion');
    const main_bearing_immobile_dirt_particle = getBoolean('main_bearing_immobile_dirt_particle');
    const main_bearing_insufficient_lubricant = getBoolean('main_bearing_insufficient_lubricant');
    const main_bearing_water_in_lubricant = getBoolean('main_bearing_water_in_lubricant');
    const main_bearing_fuel_in_lubricant = getBoolean('main_bearing_fuel_in_lubricant');
    const main_bearing_chemical_corrosion = getBoolean('main_bearing_chemical_corrosion');
    const main_bearing_cavitation_long_idle_period = getBoolean('main_bearing_cavitation_long_idle_period');
    const main_bearing_oxide_buildup = getBoolean('main_bearing_oxide_buildup');
    const main_bearing_cold_start = getBoolean('main_bearing_cold_start');
    const main_bearing_hot_shut_down = getBoolean('main_bearing_hot_shut_down');
    const main_bearing_offside_wear = getBoolean('main_bearing_offside_wear');
    const main_bearing_thrust_load_failure = getBoolean('main_bearing_thrust_load_failure');
    const main_bearing_installation_technique = getBoolean('main_bearing_installation_technique');
    const main_bearing_dislocation_of_bearing = getBoolean('main_bearing_dislocation_of_bearing');
    const main_bearing_comments = getString('main_bearing_comments');

    // 3. Con Rod Bearings
    const con_rod_bearing_fine_particle_abrasion = getBoolean('con_rod_bearing_fine_particle_abrasion');
    const con_rod_bearing_coarse_particle_abrasion = getBoolean('con_rod_bearing_coarse_particle_abrasion');
    const con_rod_bearing_immobile_dirt_particle = getBoolean('con_rod_bearing_immobile_dirt_particle');
    const con_rod_bearing_insufficient_lubricant = getBoolean('con_rod_bearing_insufficient_lubricant');
    const con_rod_bearing_water_in_lubricant = getBoolean('con_rod_bearing_water_in_lubricant');
    const con_rod_bearing_fuel_in_lubricant = getBoolean('con_rod_bearing_fuel_in_lubricant');
    const con_rod_bearing_chemical_corrosion = getBoolean('con_rod_bearing_chemical_corrosion');
    const con_rod_bearing_cavitation_long_idle_period = getBoolean('con_rod_bearing_cavitation_long_idle_period');
    const con_rod_bearing_oxide_buildup = getBoolean('con_rod_bearing_oxide_buildup');
    const con_rod_bearing_cold_start = getBoolean('con_rod_bearing_cold_start');
    const con_rod_bearing_hot_shut_down = getBoolean('con_rod_bearing_hot_shut_down');
    const con_rod_bearing_offside_wear = getBoolean('con_rod_bearing_offside_wear');
    const con_rod_bearing_thrust_load_failure = getBoolean('con_rod_bearing_thrust_load_failure');
    const con_rod_bearing_installation_technique = getBoolean('con_rod_bearing_installation_technique');
    const con_rod_bearing_dislocation_of_bearing = getBoolean('con_rod_bearing_dislocation_of_bearing');
    const con_rod_bearing_comments = getString('con_rod_bearing_comments');

    // 4. Connecting Rod Arms
    const con_rod_left_1_serviceable = getBoolean('con_rod_left_1_serviceable');
    const con_rod_left_2_serviceable = getBoolean('con_rod_left_2_serviceable');
    const con_rod_left_3_serviceable = getBoolean('con_rod_left_3_serviceable');
    const con_rod_left_4_serviceable = getBoolean('con_rod_left_4_serviceable');
    const con_rod_left_5_serviceable = getBoolean('con_rod_left_5_serviceable');
    const con_rod_left_6_serviceable = getBoolean('con_rod_left_6_serviceable');
    const con_rod_left_7_serviceable = getBoolean('con_rod_left_7_serviceable');
    const con_rod_left_8_serviceable = getBoolean('con_rod_left_8_serviceable');
    const con_rod_right_1_serviceable = getBoolean('con_rod_right_1_serviceable');
    const con_rod_right_2_serviceable = getBoolean('con_rod_right_2_serviceable');
    const con_rod_right_3_serviceable = getBoolean('con_rod_right_3_serviceable');
    const con_rod_right_4_serviceable = getBoolean('con_rod_right_4_serviceable');
    const con_rod_right_5_serviceable = getBoolean('con_rod_right_5_serviceable');
    const con_rod_right_6_serviceable = getBoolean('con_rod_right_6_serviceable');
    const con_rod_right_7_serviceable = getBoolean('con_rod_right_7_serviceable');
    const con_rod_right_8_serviceable = getBoolean('con_rod_right_8_serviceable');
    const con_rod_process_imperfection = getBoolean('con_rod_process_imperfection');
    const con_rod_forming_machining_faults = getBoolean('con_rod_forming_machining_faults');
    const con_rod_critical_design_feature = getBoolean('con_rod_critical_design_feature');
    const con_rod_hydraulic_lock = getBoolean('con_rod_hydraulic_lock');
    const con_rod_bending = getBoolean('con_rod_bending');
    const con_rod_foreign_materials = getBoolean('con_rod_foreign_materials');
    const con_rod_misalignment = getBoolean('con_rod_misalignment');
    const con_rod_others = getBoolean('con_rod_others');
    const con_rod_bearing_failure = getBoolean('con_rod_bearing_failure');
    const con_rod_comments = getString('con_rod_comments');

    // 5. Conrod Bushes
    const conrod_bush_left_1_serviceable = getBoolean('conrod_bush_left_1_serviceable');
    const conrod_bush_left_2_serviceable = getBoolean('conrod_bush_left_2_serviceable');
    const conrod_bush_left_3_serviceable = getBoolean('conrod_bush_left_3_serviceable');
    const conrod_bush_left_4_serviceable = getBoolean('conrod_bush_left_4_serviceable');
    const conrod_bush_left_5_serviceable = getBoolean('conrod_bush_left_5_serviceable');
    const conrod_bush_left_6_serviceable = getBoolean('conrod_bush_left_6_serviceable');
    const conrod_bush_left_7_serviceable = getBoolean('conrod_bush_left_7_serviceable');
    const conrod_bush_left_8_serviceable = getBoolean('conrod_bush_left_8_serviceable');
    const conrod_bush_right_1_serviceable = getBoolean('conrod_bush_right_1_serviceable');
    const conrod_bush_right_2_serviceable = getBoolean('conrod_bush_right_2_serviceable');
    const conrod_bush_right_3_serviceable = getBoolean('conrod_bush_right_3_serviceable');
    const conrod_bush_right_4_serviceable = getBoolean('conrod_bush_right_4_serviceable');
    const conrod_bush_right_5_serviceable = getBoolean('conrod_bush_right_5_serviceable');
    const conrod_bush_right_6_serviceable = getBoolean('conrod_bush_right_6_serviceable');
    const conrod_bush_right_7_serviceable = getBoolean('conrod_bush_right_7_serviceable');
    const conrod_bush_right_8_serviceable = getBoolean('conrod_bush_right_8_serviceable');
    const conrod_bush_piston_cracking = getBoolean('conrod_bush_piston_cracking');
    const conrod_bush_dirt_entry = getBoolean('conrod_bush_dirt_entry');
    const conrod_bush_oil_contamination = getBoolean('conrod_bush_oil_contamination');
    const conrod_bush_cavitation = getBoolean('conrod_bush_cavitation');
    const conrod_bush_counter_weighting = getBoolean('conrod_bush_counter_weighting');
    const conrod_bush_corrosion = getBoolean('conrod_bush_corrosion');
    const conrod_bush_thermal_fatigue = getBoolean('conrod_bush_thermal_fatigue');
    const conrod_bush_others = getBoolean('conrod_bush_others');
    const conrod_bush_comments = getString('conrod_bush_comments');

    // 6. Crankshaft
    const crankshaft_status = getString('crankshaft_status');
    const crankshaft_excessive_load = getBoolean('crankshaft_excessive_load');
    const crankshaft_mismatch_gears_transmission = getBoolean('crankshaft_mismatch_gears_transmission');
    const crankshaft_bad_radius_blend_fillets = getBoolean('crankshaft_bad_radius_blend_fillets');
    const crankshaft_bearing_failure = getBoolean('crankshaft_bearing_failure');
    const crankshaft_cracked = getBoolean('crankshaft_cracked');
    const crankshaft_others = getBoolean('crankshaft_others');
    const crankshaft_contamination = getBoolean('crankshaft_contamination');
    const crankshaft_comments = getString('crankshaft_comments');

    // 7. Camshaft
    const camshaft_left_serviceable = getBoolean('camshaft_left_serviceable');
    const camshaft_left_bushing_failure = getBoolean('camshaft_left_bushing_failure');
    const camshaft_left_lobe_follower_failure = getBoolean('camshaft_left_lobe_follower_failure');
    const camshaft_left_overhead_adjustment = getBoolean('camshaft_left_overhead_adjustment');
    const camshaft_left_others = getBoolean('camshaft_left_others');
    const camshaft_right_serviceable = getBoolean('camshaft_right_serviceable');
    const camshaft_right_bushing_failure = getBoolean('camshaft_right_bushing_failure');
    const camshaft_right_lobe_follower_failure = getBoolean('camshaft_right_lobe_follower_failure');
    const camshaft_right_overhead_adjustment = getBoolean('camshaft_right_overhead_adjustment');
    const camshaft_right_others = getBoolean('camshaft_right_others');
    const camshaft_comments = getString('camshaft_comments');

    // 8-11
    const vibration_damper_serviceable = getBoolean('vibration_damper_serviceable');
    const vibration_damper_running_hours = getBoolean('vibration_damper_running_hours');
    const vibration_damper_others = getBoolean('vibration_damper_others');
    const vibration_damper_comments = getString('vibration_damper_comments');

    const cylinder_heads_status = getString('cylinder_heads_status');
    const cylinder_heads_cracked_valve_injector_port = getBoolean('cylinder_heads_cracked_valve_injector_port');
    const cylinder_heads_valve_failure = getBoolean('cylinder_heads_valve_failure');
    const cylinder_heads_cracked_valve_port = getBoolean('cylinder_heads_cracked_valve_port');
    const cylinder_heads_broken_valve_spring = getBoolean('cylinder_heads_broken_valve_spring');
    const cylinder_heads_cracked_head_core = getBoolean('cylinder_heads_cracked_head_core');
    const cylinder_heads_others_scratches_pinholes = getBoolean('cylinder_heads_others_scratches_pinholes');
    const cylinder_heads_comments = getString('cylinder_heads_comments');

    const engine_valves_serviceable = getBoolean('engine_valves_serviceable');
    const engine_valves_erosion_fillet = getBoolean('engine_valves_erosion_fillet');
    const engine_valves_thermal_fatigue = getBoolean('engine_valves_thermal_fatigue');
    const engine_valves_stuck_up = getBoolean('engine_valves_stuck_up');
    const engine_valves_broken_stem = getBoolean('engine_valves_broken_stem');
    const engine_valves_guttering_channeling = getBoolean('engine_valves_guttering_channeling');
    const engine_valves_others = getBoolean('engine_valves_others');
    const engine_valves_mechanical_fatigue = getBoolean('engine_valves_mechanical_fatigue');
    const engine_valves_comments = getString('engine_valves_comments');

    const valve_crossheads_serviceable = getBoolean('valve_crossheads_serviceable');
    const valve_crossheads_comments = getString('valve_crossheads_comments');

    // 12. Pistons
    const pistons_left_serviceable = getBoolean('pistons_left_serviceable');
    const pistons_left_scored = getBoolean('pistons_left_scored');
    const pistons_left_crown_damage = getBoolean('pistons_left_crown_damage');
    const pistons_left_burning = getBoolean('pistons_left_burning');
    const pistons_left_piston_fracture = getBoolean('pistons_left_piston_fracture');
    const pistons_left_thrust_anti_thrust_scoring = getBoolean('pistons_left_thrust_anti_thrust_scoring');
    const pistons_left_ring_groove_wear = getBoolean('pistons_left_ring_groove_wear');
    const pistons_left_pin_bore_wear = getBoolean('pistons_left_pin_bore_wear');
    const pistons_right_serviceable = getBoolean('pistons_right_serviceable');
    const pistons_right_scored = getBoolean('pistons_right_scored');
    const pistons_right_crown_damage = getBoolean('pistons_right_crown_damage');
    const pistons_right_burning = getBoolean('pistons_right_burning');
    const pistons_right_piston_fracture = getBoolean('pistons_right_piston_fracture');
    const pistons_right_thrust_anti_thrust_scoring = getBoolean('pistons_right_thrust_anti_thrust_scoring');
    const pistons_right_ring_groove_wear = getBoolean('pistons_right_ring_groove_wear');
    const pistons_right_pin_bore_wear = getBoolean('pistons_right_pin_bore_wear');
    const pistons_comments = getString('pistons_comments');

    // 13. Cylinder Liners
    const cylinder_liners_left_serviceable = getBoolean('cylinder_liners_left_serviceable');
    const cylinder_liners_left_scoring = getBoolean('cylinder_liners_left_scoring');
    const cylinder_liners_left_corrosion = getBoolean('cylinder_liners_left_corrosion');
    const cylinder_liners_left_cracking = getBoolean('cylinder_liners_left_cracking');
    const cylinder_liners_left_fretting = getBoolean('cylinder_liners_left_fretting');
    const cylinder_liners_left_cavitation = getBoolean('cylinder_liners_left_cavitation');
    const cylinder_liners_left_pin_holes = getBoolean('cylinder_liners_left_pin_holes');
    const cylinder_liners_right_serviceable = getBoolean('cylinder_liners_right_serviceable');
    const cylinder_liners_right_scoring = getBoolean('cylinder_liners_right_scoring');
    const cylinder_liners_right_corrosion = getBoolean('cylinder_liners_right_corrosion');
    const cylinder_liners_right_cracking = getBoolean('cylinder_liners_right_cracking');
    const cylinder_liners_right_fretting = getBoolean('cylinder_liners_right_fretting');
    const cylinder_liners_right_cavitation = getBoolean('cylinder_liners_right_cavitation');
    const cylinder_liners_right_pin_holes = getBoolean('cylinder_liners_right_pin_holes');
    const cylinder_liners_comments = getString('cylinder_liners_comments');

    // 14-21: Simple Components
    const timing_gear_serviceable = getBoolean('timing_gear_serviceable');
    const timing_gear_comments = getString('timing_gear_comments');
    const turbo_chargers_serviceable = getBoolean('turbo_chargers_serviceable');
    const turbo_chargers_comments = getString('turbo_chargers_comments');
    const accessories_drive_serviceable = getBoolean('accessories_drive_serviceable');
    const accessories_drive_comments = getString('accessories_drive_comments');
    const idler_gear_serviceable = getBoolean('idler_gear_serviceable');
    const idler_gear_comments = getString('idler_gear_comments');
    const oil_pump_serviceable = getBoolean('oil_pump_serviceable');
    const oil_pump_comments = getString('oil_pump_comments');
    const water_pump_serviceable = getBoolean('water_pump_serviceable');
    const water_pump_comments = getString('water_pump_comments');
    const starting_motor_serviceable = getBoolean('starting_motor_serviceable');
    const starting_motor_comments = getString('starting_motor_comments');
    const charging_alternator_serviceable = getBoolean('charging_alternator_serviceable');
    const charging_alternator_comments = getString('charging_alternator_comments');

    // 22. Missing Components
    const missing_components = getString('missing_components');

    // 23. Major Components Summary
    const component_cylinder_block = getString('component_cylinder_block');
    const component_crankshaft = getString('component_crankshaft');
    const component_camshaft = getString('component_camshaft');
    const component_connecting_rod = getString('component_connecting_rod');
    const component_timing_gear = getString('component_timing_gear');
    const component_idler_gear = getString('component_idler_gear');
    const component_accessory_drive_gear = getString('component_accessory_drive_gear');
    const component_water_pump_drive_gear = getString('component_water_pump_drive_gear');
    const component_cylinder_head = getString('component_cylinder_head');
    const component_oil_cooler = getString('component_oil_cooler');
    const component_exhaust_manifold = getString('component_exhaust_manifold');
    const component_turbo_chargers = getString('component_turbo_chargers');
    const component_intake_manifold = getString('component_intake_manifold');
    const component_flywheel_housing = getString('component_flywheel_housing');
    const component_flywheel = getString('component_flywheel');
    const component_ring_gear = getString('component_ring_gear');
    const component_oil_pan = getString('component_oil_pan');
    const component_front_engine_support = getString('component_front_engine_support');
    const component_rear_engine_support = getString('component_rear_engine_support');
    const component_front_engine_cover = getString('component_front_engine_cover');
    const component_pulleys = getString('component_pulleys');
    const component_fan_hub = getString('component_fan_hub');
    const component_air_compressor = getString('component_air_compressor');
    const component_injection_pump = getString('component_injection_pump');
    const component_others = getString('component_others');

    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .insert([{
        customer, job_number, engine_model, serial_no, attending_technician, service_supervisor,
        cam_shaft_bushing_bore, cylinder_liner_counter_bore, liner_to_block_clearance,
        lower_liner_bore, upper_liner_bore, top_deck, cylinder_block_comments,
        main_bearing_fine_particle_abrasion, main_bearing_coarse_particle_abrasion,
        main_bearing_immobile_dirt_particle, main_bearing_insufficient_lubricant,
        main_bearing_water_in_lubricant, main_bearing_fuel_in_lubricant,
        main_bearing_chemical_corrosion, main_bearing_cavitation_long_idle_period,
        main_bearing_oxide_buildup, main_bearing_cold_start, main_bearing_hot_shut_down,
        main_bearing_offside_wear, main_bearing_thrust_load_failure,
        main_bearing_installation_technique, main_bearing_dislocation_of_bearing,
        main_bearing_comments,
        con_rod_bearing_fine_particle_abrasion, con_rod_bearing_coarse_particle_abrasion,
        con_rod_bearing_immobile_dirt_particle, con_rod_bearing_insufficient_lubricant,
        con_rod_bearing_water_in_lubricant, con_rod_bearing_fuel_in_lubricant,
        con_rod_bearing_chemical_corrosion, con_rod_bearing_cavitation_long_idle_period,
        con_rod_bearing_oxide_buildup, con_rod_bearing_cold_start,
        con_rod_bearing_hot_shut_down, con_rod_bearing_offside_wear,
        con_rod_bearing_thrust_load_failure, con_rod_bearing_installation_technique,
        con_rod_bearing_dislocation_of_bearing, con_rod_bearing_comments,
        con_rod_left_1_serviceable, con_rod_left_2_serviceable, con_rod_left_3_serviceable,
        con_rod_left_4_serviceable, con_rod_left_5_serviceable, con_rod_left_6_serviceable,
        con_rod_left_7_serviceable, con_rod_left_8_serviceable,
        con_rod_right_1_serviceable, con_rod_right_2_serviceable, con_rod_right_3_serviceable,
        con_rod_right_4_serviceable, con_rod_right_5_serviceable, con_rod_right_6_serviceable,
        con_rod_right_7_serviceable, con_rod_right_8_serviceable,
        con_rod_process_imperfection, con_rod_forming_machining_faults,
        con_rod_critical_design_feature, con_rod_hydraulic_lock, con_rod_bending,
        con_rod_foreign_materials, con_rod_misalignment, con_rod_others,
        con_rod_bearing_failure, con_rod_comments,
        conrod_bush_left_1_serviceable, conrod_bush_left_2_serviceable,
        conrod_bush_left_3_serviceable, conrod_bush_left_4_serviceable,
        conrod_bush_left_5_serviceable, conrod_bush_left_6_serviceable,
        conrod_bush_left_7_serviceable, conrod_bush_left_8_serviceable,
        conrod_bush_right_1_serviceable, conrod_bush_right_2_serviceable,
        conrod_bush_right_3_serviceable, conrod_bush_right_4_serviceable,
        conrod_bush_right_5_serviceable, conrod_bush_right_6_serviceable,
        conrod_bush_right_7_serviceable, conrod_bush_right_8_serviceable,
        conrod_bush_piston_cracking, conrod_bush_dirt_entry,
        conrod_bush_oil_contamination, conrod_bush_cavitation,
        conrod_bush_counter_weighting, conrod_bush_corrosion,
        conrod_bush_thermal_fatigue, conrod_bush_others, conrod_bush_comments,
        crankshaft_status, crankshaft_excessive_load, crankshaft_mismatch_gears_transmission,
        crankshaft_bad_radius_blend_fillets, crankshaft_bearing_failure,
        crankshaft_cracked, crankshaft_others, crankshaft_contamination,
        crankshaft_comments,
        camshaft_left_serviceable, camshaft_left_bushing_failure,
        camshaft_left_lobe_follower_failure, camshaft_left_overhead_adjustment,
        camshaft_left_others, camshaft_right_serviceable, camshaft_right_bushing_failure,
        camshaft_right_lobe_follower_failure, camshaft_right_overhead_adjustment,
        camshaft_right_others, camshaft_comments,
        vibration_damper_serviceable, vibration_damper_running_hours,
        vibration_damper_others, vibration_damper_comments,
        cylinder_heads_status, cylinder_heads_cracked_valve_injector_port,
        cylinder_heads_valve_failure, cylinder_heads_cracked_valve_port,
        cylinder_heads_broken_valve_spring, cylinder_heads_cracked_head_core,
        cylinder_heads_others_scratches_pinholes, cylinder_heads_comments,
        engine_valves_serviceable, engine_valves_erosion_fillet,
        engine_valves_thermal_fatigue, engine_valves_stuck_up,
        engine_valves_broken_stem, engine_valves_guttering_channeling,
        engine_valves_others, engine_valves_mechanical_fatigue, engine_valves_comments,
        valve_crossheads_serviceable, valve_crossheads_comments,
        pistons_left_serviceable, pistons_left_scored, pistons_left_crown_damage,
        pistons_left_burning, pistons_left_piston_fracture,
        pistons_left_thrust_anti_thrust_scoring, pistons_left_ring_groove_wear,
        pistons_left_pin_bore_wear, pistons_right_serviceable, pistons_right_scored,
        pistons_right_crown_damage, pistons_right_burning, pistons_right_piston_fracture,
        pistons_right_thrust_anti_thrust_scoring, pistons_right_ring_groove_wear,
        pistons_right_pin_bore_wear, pistons_comments,
        cylinder_liners_left_serviceable, cylinder_liners_left_scoring,
        cylinder_liners_left_corrosion, cylinder_liners_left_cracking,
        cylinder_liners_left_fretting, cylinder_liners_left_cavitation,
        cylinder_liners_left_pin_holes, cylinder_liners_right_serviceable,
        cylinder_liners_right_scoring, cylinder_liners_right_corrosion,
        cylinder_liners_right_cracking, cylinder_liners_right_fretting,
        cylinder_liners_right_cavitation, cylinder_liners_right_pin_holes,
        cylinder_liners_comments,
        timing_gear_serviceable, timing_gear_comments, turbo_chargers_serviceable,
        turbo_chargers_comments, accessories_drive_serviceable, accessories_drive_comments,
        idler_gear_serviceable, idler_gear_comments, oil_pump_serviceable,
        oil_pump_comments, water_pump_serviceable, water_pump_comments,
        starting_motor_serviceable, starting_motor_comments,
        charging_alternator_serviceable, charging_alternator_comments,
        missing_components,
        component_cylinder_block, component_crankshaft, component_camshaft,
        component_connecting_rod, component_timing_gear, component_idler_gear,
        component_accessory_drive_gear, component_water_pump_drive_gear,
        component_cylinder_head, component_oil_cooler, component_exhaust_manifold,
        component_turbo_chargers, component_intake_manifold, component_flywheel_housing,
        component_flywheel, component_ring_gear, component_oil_pan,
        component_front_engine_support, component_rear_engine_support,
        component_front_engine_cover, component_pulleys, component_fan_hub,
        component_air_compressor, component_injection_pump, component_others,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating engine teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error("API error creating engine teardown report:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
  }
});
