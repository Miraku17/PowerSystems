import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EngineTeardownFormData {
  // Header Information
  customer: string;
  job_number: string;
  engine_model: string;
  serial_no: string;
  attending_technician: string;
  service_supervisor: string;

  // Signatures
  attending_technician_signature: string;
  service_supervisor_signature: string;

  // 1. Cylinder Block
  cam_shaft_bushing_bore: string;
  cylinder_liner_counter_bore: string;
  liner_to_block_clearance: string;
  lower_liner_bore: string;
  upper_liner_bore: string;
  top_deck: string;
  cylinder_block_comments: string;

  // 2. Main Bearings
  main_bearing_fine_particle_abrasion: boolean;
  main_bearing_coarse_particle_abrasion: boolean;
  main_bearing_immobile_dirt_particle: boolean;
  main_bearing_insufficient_lubricant: boolean;
  main_bearing_water_in_lubricant: boolean;
  main_bearing_fuel_in_lubricant: boolean;
  main_bearing_chemical_corrosion: boolean;
  main_bearing_cavitation_long_idle_period: boolean;
  main_bearing_oxide_buildup: boolean;
  main_bearing_cold_start: boolean;
  main_bearing_hot_shut_down: boolean;
  main_bearing_offside_wear: boolean;
  main_bearing_thrust_load_failure: boolean;
  main_bearing_installation_technique: boolean;
  main_bearing_dislocation_of_bearing: boolean;
  main_bearing_comments: string;

  // 3. Con Rod Bearings
  con_rod_bearing_fine_particle_abrasion: boolean;
  con_rod_bearing_coarse_particle_abrasion: boolean;
  con_rod_bearing_immobile_dirt_particle: boolean;
  con_rod_bearing_insufficient_lubricant: boolean;
  con_rod_bearing_water_in_lubricant: boolean;
  con_rod_bearing_fuel_in_lubricant: boolean;
  con_rod_bearing_chemical_corrosion: boolean;
  con_rod_bearing_cavitation_long_idle_period: boolean;
  con_rod_bearing_oxide_buildup: boolean;
  con_rod_bearing_cold_start: boolean;
  con_rod_bearing_hot_shut_down: boolean;
  con_rod_bearing_offside_wear: boolean;
  con_rod_bearing_thrust_load_failure: boolean;
  con_rod_bearing_installation_technique: boolean;
  con_rod_bearing_dislocation_of_bearing: boolean;
  con_rod_bearing_comments: string;

  // 4. Connecting Rod Arms - Left Bank
  con_rod_left_1_serviceable: boolean;
  con_rod_left_2_serviceable: boolean;
  con_rod_left_3_serviceable: boolean;
  con_rod_left_4_serviceable: boolean;
  con_rod_left_5_serviceable: boolean;
  con_rod_left_6_serviceable: boolean;
  con_rod_left_7_serviceable: boolean;
  con_rod_left_8_serviceable: boolean;

  // 4. Connecting Rod Arms - Right Bank
  con_rod_right_1_serviceable: boolean;
  con_rod_right_2_serviceable: boolean;
  con_rod_right_3_serviceable: boolean;
  con_rod_right_4_serviceable: boolean;
  con_rod_right_5_serviceable: boolean;
  con_rod_right_6_serviceable: boolean;
  con_rod_right_7_serviceable: boolean;
  con_rod_right_8_serviceable: boolean;

  // 4. Connecting Rod Arms - Causes
  con_rod_process_imperfection: boolean;
  con_rod_forming_machining_faults: boolean;
  con_rod_critical_design_feature: boolean;
  con_rod_hydraulic_lock: boolean;
  con_rod_bending: boolean;
  con_rod_foreign_materials: boolean;
  con_rod_misalignment: boolean;
  con_rod_others: boolean;
  con_rod_bearing_failure: boolean;
  con_rod_comments: string;

  // 5. Conrod Bushes - Left Bank
  conrod_bush_left_1_serviceable: boolean;
  conrod_bush_left_2_serviceable: boolean;
  conrod_bush_left_3_serviceable: boolean;
  conrod_bush_left_4_serviceable: boolean;
  conrod_bush_left_5_serviceable: boolean;
  conrod_bush_left_6_serviceable: boolean;
  conrod_bush_left_7_serviceable: boolean;
  conrod_bush_left_8_serviceable: boolean;

  // 5. Conrod Bushes - Right Bank
  conrod_bush_right_1_serviceable: boolean;
  conrod_bush_right_2_serviceable: boolean;
  conrod_bush_right_3_serviceable: boolean;
  conrod_bush_right_4_serviceable: boolean;
  conrod_bush_right_5_serviceable: boolean;
  conrod_bush_right_6_serviceable: boolean;
  conrod_bush_right_7_serviceable: boolean;
  conrod_bush_right_8_serviceable: boolean;

  // 5. Conrod Bushes - Causes
  conrod_bush_piston_cracking: boolean;
  conrod_bush_dirt_entry: boolean;
  conrod_bush_oil_contamination: boolean;
  conrod_bush_cavitation: boolean;
  conrod_bush_counter_weighting: boolean;
  conrod_bush_corrosion: boolean;
  conrod_bush_thermal_fatigue: boolean;
  conrod_bush_others: boolean;
  conrod_bush_comments: string;

  // 6. Crankshaft
  crankshaft_status: string; // serviceable, non_serviceable, require_repair
  crankshaft_excessive_load: boolean;
  crankshaft_mismatch_gears_transmission: boolean;
  crankshaft_bad_radius_blend_fillets: boolean;
  crankshaft_bearing_failure: boolean;
  crankshaft_cracked: boolean;
  crankshaft_others: boolean;
  crankshaft_contamination: boolean;
  crankshaft_comments: string;

  // 7. Camshaft - Left Bank
  camshaft_left_serviceable: boolean;
  camshaft_left_bushing_failure: boolean;
  camshaft_left_lobe_follower_failure: boolean;
  camshaft_left_overhead_adjustment: boolean;
  camshaft_left_others: boolean;

  // 7. Camshaft - Right Bank
  camshaft_right_serviceable: boolean;
  camshaft_right_bushing_failure: boolean;
  camshaft_right_lobe_follower_failure: boolean;
  camshaft_right_overhead_adjustment: boolean;
  camshaft_right_others: boolean;
  camshaft_comments: string;

  // 8. Vibration Damper
  vibration_damper_serviceable: boolean;
  vibration_damper_running_hours: boolean;
  vibration_damper_others: boolean;
  vibration_damper_comments: string;

  // 9. Cylinder Heads
  cylinder_heads_status: string; // serviceable, non_serviceable, require_repair
  cylinder_heads_cracked_valve_injector_port: boolean;
  cylinder_heads_valve_failure: boolean;
  cylinder_heads_cracked_valve_port: boolean;
  cylinder_heads_broken_valve_spring: boolean;
  cylinder_heads_cracked_head_core: boolean;
  cylinder_heads_others_scratches_pinholes: boolean;
  cylinder_heads_comments: string;

  // 10. Engine Valves
  engine_valves_serviceable: boolean;
  engine_valves_erosion_fillet: boolean;
  engine_valves_thermal_fatigue: boolean;
  engine_valves_stuck_up: boolean;
  engine_valves_broken_stem: boolean;
  engine_valves_guttering_channeling: boolean;
  engine_valves_others: boolean;
  engine_valves_mechanical_fatigue: boolean;
  engine_valves_comments: string;

  // 11. Valve Crossheads
  valve_crossheads_serviceable: boolean;
  valve_crossheads_comments: string;

  // 12. Pistons - Left Bank
  pistons_left_serviceable: boolean;
  pistons_left_scored: boolean;
  pistons_left_crown_damage: boolean;
  pistons_left_burning: boolean;
  pistons_left_piston_fracture: boolean;
  pistons_left_thrust_anti_thrust_scoring: boolean;
  pistons_left_ring_groove_wear: boolean;
  pistons_left_pin_bore_wear: boolean;

  // 12. Pistons - Right Bank
  pistons_right_serviceable: boolean;
  pistons_right_scored: boolean;
  pistons_right_crown_damage: boolean;
  pistons_right_burning: boolean;
  pistons_right_piston_fracture: boolean;
  pistons_right_thrust_anti_thrust_scoring: boolean;
  pistons_right_ring_groove_wear: boolean;
  pistons_right_pin_bore_wear: boolean;
  pistons_comments: string;

  // 13. Cylinder Liners - Left Bank
  cylinder_liners_left_serviceable: boolean;
  cylinder_liners_left_scoring: boolean;
  cylinder_liners_left_corrosion: boolean;
  cylinder_liners_left_cracking: boolean;
  cylinder_liners_left_fretting: boolean;
  cylinder_liners_left_cavitation: boolean;
  cylinder_liners_left_pin_holes: boolean;

  // 13. Cylinder Liners - Right Bank
  cylinder_liners_right_serviceable: boolean;
  cylinder_liners_right_scoring: boolean;
  cylinder_liners_right_corrosion: boolean;
  cylinder_liners_right_cracking: boolean;
  cylinder_liners_right_fretting: boolean;
  cylinder_liners_right_cavitation: boolean;
  cylinder_liners_right_pin_holes: boolean;
  cylinder_liners_comments: string;

  // 14. Timing Gear
  timing_gear_serviceable: boolean;
  timing_gear_comments: string;

  // 15. Turbo Chargers
  turbo_chargers_serviceable: boolean;
  turbo_chargers_comments: string;

  // 16. Accessories Drive
  accessories_drive_serviceable: boolean;
  accessories_drive_comments: string;

  // 17. Idler Gear
  idler_gear_serviceable: boolean;
  idler_gear_comments: string;

  // 18. Oil Pump
  oil_pump_serviceable: boolean;
  oil_pump_comments: string;

  // 19. Water Pump
  water_pump_serviceable: boolean;
  water_pump_comments: string;

  // 20. Starting Motor
  starting_motor_serviceable: boolean;
  starting_motor_comments: string;

  // 21. Charging Alternator
  charging_alternator_serviceable: boolean;
  charging_alternator_comments: string;

  // 22. Missing Components
  missing_components: string;

  // 23. Major Components Summary
  component_cylinder_block: string;
  component_crankshaft: string;
  component_camshaft: string;
  component_connecting_rod: string;
  component_timing_gear: string;
  component_idler_gear: string;
  component_accessory_drive_gear: string;
  component_water_pump_drive_gear: string;
  component_cylinder_head: string;
  component_oil_cooler: string;
  component_exhaust_manifold: string;
  component_turbo_chargers: string;
  component_intake_manifold: string;
  component_flywheel_housing: string;
  component_flywheel: string;
  component_ring_gear: string;
  component_oil_pan: string;
  component_front_engine_support: string;
  component_rear_engine_support: string;
  component_front_engine_cover: string;
  component_pulleys: string;
  component_fan_hub: string;
  component_air_compressor: string;
  component_injection_pump: string;
  component_others: string;
}

interface EngineTeardownFormStore {
  formData: EngineTeardownFormData;
  setFormData: (data: Partial<EngineTeardownFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: EngineTeardownFormData = {
  // Header Information
  customer: "",
  job_number: "",
  engine_model: "",
  serial_no: "",
  attending_technician: "",
  service_supervisor: "",

  // Signatures
  attending_technician_signature: "",
  service_supervisor_signature: "",

  // 1. Cylinder Block
  cam_shaft_bushing_bore: "",
  cylinder_liner_counter_bore: "",
  liner_to_block_clearance: "",
  lower_liner_bore: "",
  upper_liner_bore: "",
  top_deck: "",
  cylinder_block_comments: "",

  // 2. Main Bearings
  main_bearing_fine_particle_abrasion: false,
  main_bearing_coarse_particle_abrasion: false,
  main_bearing_immobile_dirt_particle: false,
  main_bearing_insufficient_lubricant: false,
  main_bearing_water_in_lubricant: false,
  main_bearing_fuel_in_lubricant: false,
  main_bearing_chemical_corrosion: false,
  main_bearing_cavitation_long_idle_period: false,
  main_bearing_oxide_buildup: false,
  main_bearing_cold_start: false,
  main_bearing_hot_shut_down: false,
  main_bearing_offside_wear: false,
  main_bearing_thrust_load_failure: false,
  main_bearing_installation_technique: false,
  main_bearing_dislocation_of_bearing: false,
  main_bearing_comments: "",

  // 3. Con Rod Bearings
  con_rod_bearing_fine_particle_abrasion: false,
  con_rod_bearing_coarse_particle_abrasion: false,
  con_rod_bearing_immobile_dirt_particle: false,
  con_rod_bearing_insufficient_lubricant: false,
  con_rod_bearing_water_in_lubricant: false,
  con_rod_bearing_fuel_in_lubricant: false,
  con_rod_bearing_chemical_corrosion: false,
  con_rod_bearing_cavitation_long_idle_period: false,
  con_rod_bearing_oxide_buildup: false,
  con_rod_bearing_cold_start: false,
  con_rod_bearing_hot_shut_down: false,
  con_rod_bearing_offside_wear: false,
  con_rod_bearing_thrust_load_failure: false,
  con_rod_bearing_installation_technique: false,
  con_rod_bearing_dislocation_of_bearing: false,
  con_rod_bearing_comments: "",

  // 4. Connecting Rod Arms - Left Bank
  con_rod_left_1_serviceable: false,
  con_rod_left_2_serviceable: false,
  con_rod_left_3_serviceable: false,
  con_rod_left_4_serviceable: false,
  con_rod_left_5_serviceable: false,
  con_rod_left_6_serviceable: false,
  con_rod_left_7_serviceable: false,
  con_rod_left_8_serviceable: false,

  // 4. Connecting Rod Arms - Right Bank
  con_rod_right_1_serviceable: false,
  con_rod_right_2_serviceable: false,
  con_rod_right_3_serviceable: false,
  con_rod_right_4_serviceable: false,
  con_rod_right_5_serviceable: false,
  con_rod_right_6_serviceable: false,
  con_rod_right_7_serviceable: false,
  con_rod_right_8_serviceable: false,

  // 4. Connecting Rod Arms - Causes
  con_rod_process_imperfection: false,
  con_rod_forming_machining_faults: false,
  con_rod_critical_design_feature: false,
  con_rod_hydraulic_lock: false,
  con_rod_bending: false,
  con_rod_foreign_materials: false,
  con_rod_misalignment: false,
  con_rod_others: false,
  con_rod_bearing_failure: false,
  con_rod_comments: "",

  // 5. Conrod Bushes - Left Bank
  conrod_bush_left_1_serviceable: false,
  conrod_bush_left_2_serviceable: false,
  conrod_bush_left_3_serviceable: false,
  conrod_bush_left_4_serviceable: false,
  conrod_bush_left_5_serviceable: false,
  conrod_bush_left_6_serviceable: false,
  conrod_bush_left_7_serviceable: false,
  conrod_bush_left_8_serviceable: false,

  // 5. Conrod Bushes - Right Bank
  conrod_bush_right_1_serviceable: false,
  conrod_bush_right_2_serviceable: false,
  conrod_bush_right_3_serviceable: false,
  conrod_bush_right_4_serviceable: false,
  conrod_bush_right_5_serviceable: false,
  conrod_bush_right_6_serviceable: false,
  conrod_bush_right_7_serviceable: false,
  conrod_bush_right_8_serviceable: false,

  // 5. Conrod Bushes - Causes
  conrod_bush_piston_cracking: false,
  conrod_bush_dirt_entry: false,
  conrod_bush_oil_contamination: false,
  conrod_bush_cavitation: false,
  conrod_bush_counter_weighting: false,
  conrod_bush_corrosion: false,
  conrod_bush_thermal_fatigue: false,
  conrod_bush_others: false,
  conrod_bush_comments: "",

  // 6. Crankshaft
  crankshaft_status: "serviceable",
  crankshaft_excessive_load: false,
  crankshaft_mismatch_gears_transmission: false,
  crankshaft_bad_radius_blend_fillets: false,
  crankshaft_bearing_failure: false,
  crankshaft_cracked: false,
  crankshaft_others: false,
  crankshaft_contamination: false,
  crankshaft_comments: "",

  // 7. Camshaft - Left Bank
  camshaft_left_serviceable: false,
  camshaft_left_bushing_failure: false,
  camshaft_left_lobe_follower_failure: false,
  camshaft_left_overhead_adjustment: false,
  camshaft_left_others: false,

  // 7. Camshaft - Right Bank
  camshaft_right_serviceable: false,
  camshaft_right_bushing_failure: false,
  camshaft_right_lobe_follower_failure: false,
  camshaft_right_overhead_adjustment: false,
  camshaft_right_others: false,
  camshaft_comments: "",

  // 8. Vibration Damper
  vibration_damper_serviceable: false,
  vibration_damper_running_hours: false,
  vibration_damper_others: false,
  vibration_damper_comments: "",

  // 9. Cylinder Heads
  cylinder_heads_status: "serviceable",
  cylinder_heads_cracked_valve_injector_port: false,
  cylinder_heads_valve_failure: false,
  cylinder_heads_cracked_valve_port: false,
  cylinder_heads_broken_valve_spring: false,
  cylinder_heads_cracked_head_core: false,
  cylinder_heads_others_scratches_pinholes: false,
  cylinder_heads_comments: "",

  // 10. Engine Valves
  engine_valves_serviceable: false,
  engine_valves_erosion_fillet: false,
  engine_valves_thermal_fatigue: false,
  engine_valves_stuck_up: false,
  engine_valves_broken_stem: false,
  engine_valves_guttering_channeling: false,
  engine_valves_others: false,
  engine_valves_mechanical_fatigue: false,
  engine_valves_comments: "",

  // 11. Valve Crossheads
  valve_crossheads_serviceable: false,
  valve_crossheads_comments: "",

  // 12. Pistons - Left Bank
  pistons_left_serviceable: false,
  pistons_left_scored: false,
  pistons_left_crown_damage: false,
  pistons_left_burning: false,
  pistons_left_piston_fracture: false,
  pistons_left_thrust_anti_thrust_scoring: false,
  pistons_left_ring_groove_wear: false,
  pistons_left_pin_bore_wear: false,

  // 12. Pistons - Right Bank
  pistons_right_serviceable: false,
  pistons_right_scored: false,
  pistons_right_crown_damage: false,
  pistons_right_burning: false,
  pistons_right_piston_fracture: false,
  pistons_right_thrust_anti_thrust_scoring: false,
  pistons_right_ring_groove_wear: false,
  pistons_right_pin_bore_wear: false,
  pistons_comments: "",

  // 13. Cylinder Liners - Left Bank
  cylinder_liners_left_serviceable: false,
  cylinder_liners_left_scoring: false,
  cylinder_liners_left_corrosion: false,
  cylinder_liners_left_cracking: false,
  cylinder_liners_left_fretting: false,
  cylinder_liners_left_cavitation: false,
  cylinder_liners_left_pin_holes: false,

  // 13. Cylinder Liners - Right Bank
  cylinder_liners_right_serviceable: false,
  cylinder_liners_right_scoring: false,
  cylinder_liners_right_corrosion: false,
  cylinder_liners_right_cracking: false,
  cylinder_liners_right_fretting: false,
  cylinder_liners_right_cavitation: false,
  cylinder_liners_right_pin_holes: false,
  cylinder_liners_comments: "",

  // 14. Timing Gear
  timing_gear_serviceable: false,
  timing_gear_comments: "",

  // 15. Turbo Chargers
  turbo_chargers_serviceable: false,
  turbo_chargers_comments: "",

  // 16. Accessories Drive
  accessories_drive_serviceable: false,
  accessories_drive_comments: "",

  // 17. Idler Gear
  idler_gear_serviceable: false,
  idler_gear_comments: "",

  // 18. Oil Pump
  oil_pump_serviceable: false,
  oil_pump_comments: "",

  // 19. Water Pump
  water_pump_serviceable: false,
  water_pump_comments: "",

  // 20. Starting Motor
  starting_motor_serviceable: false,
  starting_motor_comments: "",

  // 21. Charging Alternator
  charging_alternator_serviceable: false,
  charging_alternator_comments: "",

  // 22. Missing Components
  missing_components: "",

  // 23. Major Components Summary
  component_cylinder_block: "",
  component_crankshaft: "",
  component_camshaft: "",
  component_connecting_rod: "",
  component_timing_gear: "",
  component_idler_gear: "",
  component_accessory_drive_gear: "",
  component_water_pump_drive_gear: "",
  component_cylinder_head: "",
  component_oil_cooler: "",
  component_exhaust_manifold: "",
  component_turbo_chargers: "",
  component_intake_manifold: "",
  component_flywheel_housing: "",
  component_flywheel: "",
  component_ring_gear: "",
  component_oil_pan: "",
  component_front_engine_support: "",
  component_rear_engine_support: "",
  component_front_engine_cover: "",
  component_pulleys: "",
  component_fan_hub: "",
  component_air_compressor: "",
  component_injection_pump: "",
  component_others: "",
};

export const useEngineTeardownFormStore = create<EngineTeardownFormStore>()(
  persist(
    (set) => ({
      formData: initialFormData,
      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      resetFormData: () => set({ formData: initialFormData }),
    }),
    {
      name: 'psi-engine-teardown-form-draft',
    }
  )
);
