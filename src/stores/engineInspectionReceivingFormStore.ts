import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Interfaces ---

export interface InspectionItemData {
  field_status: string; // 's' | 'ns' | ''
  field_remarks: string;
  shop_status: string;  // 's' | 'ns' | ''
  shop_remarks: string;
}

export interface SectionItem {
  item_key: string;
  label: string;
  order: number;
}

export interface SubSection {
  label: string;
  items: SectionItem[];
}

export interface SectionDefinition {
  section: string;
  sectionKey: string;
  title: string;
  subSections?: SubSection[];
  items?: SectionItem[];
}

export interface EngineInspectionReceivingFormData {
  // Header
  customer: string;
  jo_date: string;
  jo_number: string;
  address: string;
  err_no: string;

  // Engine Details
  engine_maker: string;
  application: string;
  engine_model: string;
  engine_serial_number: string;
  date_received: string;
  date_inspected: string;
  engine_rpm: string;
  engine_kw: string;

  // Inspection Items
  inspectionItems: Record<string, InspectionItemData>;

  // Free Text Sections
  modification_of_engine: string;
  missing_parts: string;

  // Signatures (matching Deutz Service Form)
  service_technician_name: string;
  service_technician_signature: string;
  noted_by_name: string;
  noted_by_signature: string;
  approved_by_name: string;
  approved_by_signature: string;
  noted_by_user_id: string;
  approved_by_user_id: string;
  acknowledged_by_name: string;
  acknowledged_by_signature: string;
}

// --- Section Definitions (all 149 inspection items across 11 sections) ---

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    section: "I",
    sectionKey: "front_end",
    title: "FRONT END INSPECTION",
    subSections: [
      {
        label: "1. Liquid Cooled Engine",
        items: [
          { item_key: "lce_radiator", label: "Radiator", order: 1 },
          { item_key: "lce_radiator_fan", label: "Radiator Fan", order: 2 },
          { item_key: "lce_shroud", label: "Shroud", order: 3 },
          { item_key: "lce_radiator_fan_pulley", label: "Radiator Fan Pulley", order: 4 },
          { item_key: "lce_water_pump", label: "Water Pump", order: 5 },
          { item_key: "lce_water_pump_pulley", label: "Water Pump Pulley", order: 6 },
        ],
      },
      {
        label: "2. Air Cooled Engine",
        items: [
          { item_key: "ace_cooling_air_blower", label: "Cooling Air Blower", order: 7 },
          { item_key: "ace_impeller", label: "Impeller", order: 8 },
          { item_key: "ace_cooling_blower_pulley", label: "Cooling Blower Pulley", order: 9 },
          { item_key: "ace_air_blower_housing", label: "Air Blower Housing", order: 10 },
          { item_key: "ace_oil_supply_pipe", label: "Oil Supply Pipe", order: 11 },
          { item_key: "ace_oil_return_line", label: "Oil Return Line", order: 12 },
          { item_key: "ace_tensioner_pulley", label: "Tensioner Pulley", order: 13 },
          { item_key: "ace_blower_v_belt", label: "Blower V-belt", order: 14 },
          { item_key: "ace_switch_v_belt_rips", label: "Switch for V-belt Rips", order: 15 },
        ],
      },
      {
        label: "",
        items: [
          { item_key: "acc_drive_pulley", label: "Acc. Drive Pulley", order: 16 },
          { item_key: "air_comp_water_tubes", label: "Air Comp. Water Tubes", order: 17 },
          { item_key: "vibration_damper", label: "Vibration Damper", order: 18 },
          { item_key: "thermostat_housing", label: "Thermostat Housing", order: 19 },
          { item_key: "front_gear_cover", label: "Front Gear Cover", order: 20 },
          { item_key: "lifting_bracket", label: "Lifting Bracket", order: 21 },
          { item_key: "front_engine_support", label: "Front Engine Support", order: 22 },
          { item_key: "crankshaft_pulley", label: "Crankshaft Pulley", order: 23 },
          { item_key: "air_cleaner_housing", label: "Air Cleaner Housing", order: 24 },
          { item_key: "air_cleaner_mounting", label: "Air Cleaner Mounting", order: 25 },
          { item_key: "air_cleaner_restriction_ind", label: "Restriction Indicator", order: 26 },
        ],
      },
    ],
  },
  {
    section: "II",
    sectionKey: "right_side",
    title: "RIGHT SIDE INSPECTION",
    items: [
      { item_key: "power_steering_pump", label: "Power Steering Pump", order: 1 },
      { item_key: "rs_accessory_drive", label: "Accessory Drive", order: 2 },
      { item_key: "rs_air_compressor", label: "Air Compressor", order: 3 },
      { item_key: "fuel_injection_pump", label: "Fuel Injection Pump", order: 4 },
      { item_key: "fip_pump_code", label: "Pump Code", order: 5 },
      { item_key: "fip_pump_sn", label: "Pump S/N", order: 6 },
      { item_key: "fip_injection_pump_mounting", label: "Injection Pump Mounting", order: 7 },
      { item_key: "fip_oil_supply_pipe", label: "Oil Supply Pipe", order: 8 },
      { item_key: "fip_oil_return_pipe", label: "Oil Return Pipe", order: 9 },
      { item_key: "fip_pipe_pump_to_filter", label: "Pipe from Fuel Pump to Fuel Filter", order: 10 },
      { item_key: "fip_pipe_filter_to_pump", label: "Pipe from Filter to Injection Pump", order: 11 },
      { item_key: "fip_pre_filter_housing", label: "Pre-Filter Housing", order: 12 },
      { item_key: "fip_high_pressure_pipes", label: "High Pressure Pipes", order: 13 },
      { item_key: "overflow_valve", label: "Overflow Valve", order: 14 },
      { item_key: "overflow_valve_return_pipe", label: "Return Pipe for Overflow Valve", order: 15 },
      { item_key: "fuel_feed_pump", label: "Fuel Feed Pump", order: 16 },
      { item_key: "rs_injectors", label: "Injectors", order: 17 },
      { item_key: "injector_return_pipe", label: "Injector Return Pipe", order: 18 },
      { item_key: "shutdown_valve_solenoid", label: "Shutdown Valve/Solenoid", order: 19 },
      { item_key: "shutdown_valve_voltage", label: "Voltage", order: 20 },
      { item_key: "rs_rocker_lever_housing", label: "Rocker Lever Housing", order: 21 },
      { item_key: "rs_cylinder_head", label: "Cylinder Head", order: 22 },
      { item_key: "rs_intake_manifold", label: "Intake Manifold", order: 23 },
      { item_key: "rs_intake_connection", label: "Intake Connection", order: 24 },
      { item_key: "rs_intake_crossover", label: "Intake Crossover", order: 25 },
      { item_key: "rs_aftercooler", label: "After cooler/Charge Air Cooler", order: 26 },
      { item_key: "cam_follower", label: "Cam Follower", order: 27 },
      { item_key: "lube_oil_pump", label: "Lube Oil Pump", order: 28 },
      { item_key: "oil_pan", label: "Oil Pan", order: 29 },
      { item_key: "rs_oil_cooler", label: "Oil Cooler", order: 30 },
      { item_key: "rs_oil_filter_housing", label: "Oil Filter Housing", order: 31 },
      { item_key: "rs_turbocharger", label: "Turbocharger", order: 32 },
      { item_key: "rs_turbo_oil_supply_pipe", label: "Turbocharger Oil Supply Pipe", order: 33 },
      { item_key: "rs_turbo_oil_return_pipe", label: "Turbocharger Oil Return Pipe", order: 34 },
      { item_key: "rs_water_connection", label: "Water Connection", order: 35 },
      { item_key: "rs_fuel_manifold", label: "Fuel Manifold", order: 36 },
      { item_key: "engine_brake", label: "Engine Brake", order: 37 },
      { item_key: "rs_hand_hole_cover", label: "Hand Hole Cover", order: 38 },
    ],
  },
  {
    section: "III",
    sectionKey: "rear_end",
    title: "REAR END INSPECTION",
    items: [
      { item_key: "flywheel", label: "Flywheel", order: 1 },
      { item_key: "flywheel_sae_no", label: "SAE No.", order: 2 },
      { item_key: "flywheel_size", label: "Size", order: 3 },
      { item_key: "flywheel_type", label: "Type", order: 4 },
      { item_key: "flywheel_housing", label: "Flywheel Housing", order: 5 },
      { item_key: "fh_sae_no", label: "SAE No.", order: 6 },
      { item_key: "fh_size", label: "Size", order: 7 },
      { item_key: "fh_type", label: "Type", order: 8 },
      { item_key: "fh_magnetic_pickup", label: "Magnetic Pick-up", order: 9 },
      { item_key: "rear_water_connection", label: "Water Connection", order: 10 },
    ],
  },
  {
    section: "IV",
    sectionKey: "left_side",
    title: "LEFT SIDE INSPECTION",
    items: [
      { item_key: "water_manifold_front", label: "Water Manifold - Front", order: 1 },
      { item_key: "water_manifold_rear", label: "Water Manifold - Rear", order: 2 },
      { item_key: "water_manifold_center", label: "Water Manifold - Center", order: 3 },
      { item_key: "exhaust_manifold_front", label: "Exhaust Manifold - Front", order: 4 },
      { item_key: "exhaust_manifold_rear", label: "Exhaust Manifold - Rear", order: 5 },
      { item_key: "exhaust_manifold_center", label: "Exhaust Manifold - Center", order: 6 },
      { item_key: "ls_intake_manifold", label: "Intake Manifold", order: 7 },
      { item_key: "ls_intake_connection", label: "Intake Connection", order: 8 },
      { item_key: "ls_intake_crossover", label: "Intake Crossover", order: 9 },
      { item_key: "ls_aftercooler", label: "After cooler/Charge Air Cooler", order: 10 },
      { item_key: "corrosion_resistor", label: "Corrosion Resistor", order: 11 },
      { item_key: "water_header_cover", label: "Water Header Cover", order: 12 },
      { item_key: "starter", label: "Starter", order: 13 },
      { item_key: "starter_electric_volt", label: "Electric (Volt)", order: 14 },
      { item_key: "starter_air", label: "Air", order: 15 },
      { item_key: "charging_alternator", label: "Charging Alternator", order: 16 },
      { item_key: "charging_alt_v_belt", label: "V-belt", order: 17 },
      { item_key: "charging_alt_mounting_base", label: "Mounting Base", order: 18 },
      { item_key: "ls_oil_cooler", label: "Oil Cooler", order: 19 },
      { item_key: "hydraulic_pump", label: "Hydraulic Pump", order: 20 },
      { item_key: "ls_fuel_manifold", label: "Fuel Manifold", order: 21 },
      { item_key: "ls_oil_filter_housing", label: "Oil Filter Housing", order: 22 },
      { item_key: "ls_turbocharger", label: "Turbocharger", order: 23 },
      { item_key: "dipstick", label: "Dipstick", order: 24 },
      { item_key: "ls_hand_hole_cover", label: "Hand Hole Cover", order: 25 },
      { item_key: "ls_rocker_lever_housing", label: "Rocker Lever Housing", order: 26 },
      { item_key: "ls_cylinder_head", label: "Cylinder Head", order: 27 },
      { item_key: "ls_fuel_manifold_2", label: "Fuel Manifold", order: 28 },
    ],
  },
  {
    section: "V",
    sectionKey: "others",
    title: "OTHERS",
    items: [
      { item_key: "fuel_filter", label: "Fuel Filter", order: 1 },
      { item_key: "oil_filter", label: "Oil Filter", order: 2 },
      { item_key: "oil_filter_horizontal", label: "Horizontal Mounted", order: 3 },
      { item_key: "oil_filter_remote", label: "Remote Mounted", order: 4 },
      { item_key: "oil_by_pass_filter", label: "Oil By-Pass Filter", order: 5 },
      { item_key: "oth_oil_filter_housing", label: "Oil Filter Housing", order: 6 },
      { item_key: "oil_filler_cap", label: "Oil Filler Cap", order: 7 },
      { item_key: "oil_pressure_sensor", label: "Oil Pressure Sensor", order: 8 },
      { item_key: "oil_temperature_sensor", label: "Oil Temperature Sensor", order: 9 },
      { item_key: "coolant_temperature_sensor", label: "Coolant Temperature Sensor", order: 10 },
      { item_key: "acd_front_side", label: "Air Cooling Ducting - Front Side", order: 11 },
      { item_key: "acd_hood_cover", label: "Air Cooling Ducting - Hood Cover", order: 12 },
      { item_key: "acd_lower_side", label: "Air Cooling Ducting at Lower Side", order: 13 },
      { item_key: "acd_upper_side", label: "Air Cooling Ducting at Upper Side", order: 14 },
      { item_key: "acd_cover_rear_side", label: "Cover at Rear Side", order: 15 },
      { item_key: "acd_air_baffle", label: "Air Baffle", order: 16 },
      { item_key: "acd_upper_rail_bar", label: "Upper Rail Bar", order: 17 },
      { item_key: "acd_lower_rail_bar", label: "Lower Rail Bar", order: 18 },
      { item_key: "shutdown_linkage_mechanical", label: "Shut Down Linkage (Mechanical)", order: 19 },
      { item_key: "solenoid_linkage_electrical", label: "Solenoid Linkage (Electrical)", order: 20 },
    ],
  },
  {
    section: "VI",
    sectionKey: "construction_engines",
    title: "CONSTRUCTION ENGINES",
    items: [
      { item_key: "flywheel_flex_plate", label: "Flywheel Flex Plate", order: 1 },
      { item_key: "torque_conv_cooler", label: "Torque Conv. Cooler", order: 2 },
    ],
  },
  {
    section: "VII",
    sectionKey: "marine_engines",
    title: "MARINE ENGINES",
    items: [
      { item_key: "heat_exchanger", label: "Heat Exchanger", order: 1 },
      { item_key: "sea_water_pump", label: "Sea Water Pump", order: 2 },
      { item_key: "water_cooler", label: "Water Cooler", order: 3 },
      { item_key: "front_power_take_off", label: "Front Power Take-off", order: 4 },
      { item_key: "keel_cooling", label: "Keel Cooling", order: 5 },
    ],
  },
  {
    section: "VIII",
    sectionKey: "generating_set_engines",
    title: "GENERATING SET ENGINES",
    items: [
      { item_key: "engine_governor", label: "Engine Governor", order: 1 },
      { item_key: "over_speed_safety_control", label: "Over Speed Safety Control", order: 2 },
      { item_key: "governor_control", label: "Governor Control", order: 3 },
      { item_key: "main_alternator", label: "Main Alternator", order: 4 },
      { item_key: "ma_voltage_regulator", label: "Voltage Regulator", order: 5 },
      { item_key: "ma_main_stator", label: "Main Stator", order: 6 },
      { item_key: "ma_rotor", label: "Rotor", order: 7 },
      { item_key: "ma_output_terminal_block", label: "Output Terminal Block", order: 8 },
      { item_key: "ma_exciter", label: "Exciter", order: 9 },
      { item_key: "instrument_panel", label: "Instrument Panel", order: 10 },
    ],
  },
  {
    section: "IX",
    sectionKey: "industrial_engines",
    title: "INDUSTRIAL ENGINES",
    items: [
      { item_key: "vernier_throttle_control", label: "Vernier Throttle Control", order: 1 },
    ],
  },
  {
    section: "X",
    sectionKey: "check_thoroughly",
    title: "CHECK THOROUGHLY",
    items: [
      { item_key: "cyl_block_cracks_breakage", label: "Cylinder Block - For cracks/breakage", order: 1 },
      { item_key: "cyl_block_sign_of_welding", label: "Cylinder Block - For any sign of welding", order: 2 },
      { item_key: "crankshaft_rotate_both_dir", label: "Crankshaft - Secure front end, rotate both directions from flywheel end. No movement should be detected.", order: 3 },
      { item_key: "crankshaft_pry_bar_front_rear", label: "Crankshaft - Remove dipstick cover plate. Use pry bar to move crankshaft toward front & rear.", order: 4 },
      { item_key: "crankshaft_pry_bar_conrod", label: "Crankshaft - Insert pry bar between #4 connecting rod & crankshaft counter weight.", order: 5 },
      { item_key: "crankshaft_rotate_flywheel", label: "Crankshaft - Without securing front end, rotate from flywheel end. Movement should be detected.", order: 6 },
    ],
  },
  {
    section: "XI",
    sectionKey: "exhaust_system",
    title: "EXHAUST SYSTEM",
    items: [
      { item_key: "flexible_pipe", label: "Flexible Pipe", order: 1 },
      { item_key: "exhaust_elbow", label: "Exhaust Elbow", order: 2 },
      { item_key: "muffler", label: "Muffler", order: 3 },
    ],
  },
];

// --- Helper: Get all item keys from SECTION_DEFINITIONS ---

export function getAllItemKeys(): string[] {
  const keys: string[] = [];
  for (const section of SECTION_DEFINITIONS) {
    if (section.items) {
      for (const item of section.items) {
        keys.push(item.item_key);
      }
    }
    if (section.subSections) {
      for (const sub of section.subSections) {
        for (const item of sub.items) {
          keys.push(item.item_key);
        }
      }
    }
  }
  return keys;
}

// --- Build initial empty inspectionItems ---

function buildInitialInspectionItems(): Record<string, InspectionItemData> {
  const items: Record<string, InspectionItemData> = {};
  for (const key of getAllItemKeys()) {
    items[key] = { field_status: '', field_remarks: '', shop_status: '', shop_remarks: '' };
  }
  return items;
}

// --- Store ---

interface EngineInspectionReceivingFormStore {
  formData: EngineInspectionReceivingFormData;
  setFormData: (data: Partial<EngineInspectionReceivingFormData>) => void;
  setInspectionItem: (itemKey: string, field: keyof InspectionItemData, value: string) => void;
  resetFormData: () => void;
}

const initialFormData: EngineInspectionReceivingFormData = {
  customer: '',
  jo_date: '',
  jo_number: '',
  address: '',
  err_no: '',
  engine_maker: '',
  application: '',
  engine_model: '',
  engine_serial_number: '',
  date_received: '',
  date_inspected: '',
  engine_rpm: '',
  engine_kw: '',
  inspectionItems: buildInitialInspectionItems(),
  modification_of_engine: '',
  missing_parts: '',
  service_technician_name: '',
  service_technician_signature: '',
  noted_by_name: '',
  noted_by_signature: '',
  approved_by_name: '',
  approved_by_signature: '',
  noted_by_user_id: '',
  approved_by_user_id: '',
  acknowledged_by_name: '',
  acknowledged_by_signature: '',
};

export const useEngineInspectionReceivingFormStore = create<EngineInspectionReceivingFormStore>()(
  persist(
    (set) => ({
      formData: initialFormData,
      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      setInspectionItem: (itemKey, field, value) =>
        set((state) => ({
          formData: {
            ...state.formData,
            inspectionItems: {
              ...state.formData.inspectionItems,
              [itemKey]: {
                ...state.formData.inspectionItems[itemKey],
                [field]: value,
              },
            },
          },
        })),
      resetFormData: () => set({ formData: { ...initialFormData, inspectionItems: buildInitialInspectionItems() } }),
    }),
    {
      name: 'psi-engine-inspection-receiving-form-draft',
    }
  )
);
