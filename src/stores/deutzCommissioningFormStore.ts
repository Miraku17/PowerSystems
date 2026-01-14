import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DeutzCommissioningFormData {
  job_order_no: string;
  reporting_person_name: string;
  equipment_name: string;
  running_hours: string;
  customer_name: string;
  contact_person: string;
  address: string;
  email_address: string;
  phone_number: string;
  commissioning_location: string;
  commissioning_date: string;
  engine_model: string;
  engine_serial_no: string;
  commissioning_no: string;
  equipment_manufacturer: string;
  equipment_no: string;
  equipment_type: string;
  output: string;
  revolutions: string;
  main_effective_pressure: string;
  lube_oil_type: string;
  fuel_type: string;
  cooling_water_additives: string;
  fuel_pump_serial_no: string;
  fuel_pump_code: string;
  turbo_model: string;
  turbo_serial_no: string;
  // Inspection Prior Test
  inspection_summary: string;
  check_oil_level: string;
  check_air_filter: string;
  check_hoses_clamps: string;
  check_engine_support: string;
  check_v_belt: string;
  check_water_level: string;
  crankshaft_end_play: string;
  inspector: string;
  inspection_comments: string;
  // Operational Readings
  rpm_idle_speed: string;
  rpm_full_speed: string;
  oil_pressure_idle: string;
  oil_pressure_full: string;
  oil_temperature: string;
  engine_smoke: string;
  engine_vibration: string;
  check_engine_leakage: string;
  // Cylinder
  cylinder_head_temp: string;
  cylinder_no: string;
  cylinder_a1: string;
  cylinder_a2: string;
  cylinder_a3: string;
  cylinder_a4: string;
  cylinder_a5: string;
  cylinder_a6: string;
  cylinder_b1: string;
  cylinder_b2: string;
  cylinder_b3: string;
  cylinder_b4: string;
  cylinder_b5: string;
  cylinder_b6: string;
  // Parts Reference
  starter_part_no: string;
  alternator_part_no: string;
  v_belt_part_no: string;
  air_filter_part_no: string;
  oil_filter_part_no: string;
  fuel_filter_part_no: string;
  pre_fuel_filter_part_no: string;
  controller_brand: string;
  controller_model: string;
  remarks: string;
  recommendation: string;
  attending_technician: string;
  attending_technician_signature: string;
  noted_by: string;
  noted_by_signature: string;
  approved_by: string;
  approved_by_signature: string;
  acknowledged_by: string;
  acknowledged_by_signature: string;
}

interface DeutzCommissioningFormStore {
  formData: DeutzCommissioningFormData;
  setFormData: (data: Partial<DeutzCommissioningFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: DeutzCommissioningFormData = {
  job_order_no: "",
  reporting_person_name: "",
  equipment_name: "",
  running_hours: "",
  customer_name: "",
  contact_person: "",
  address: "",
  email_address: "",
  phone_number: "",
  commissioning_location: "",
  commissioning_date: "",
  engine_model: "",
  engine_serial_no: "",
  commissioning_no: "",
  equipment_manufacturer: "",
  equipment_no: "",
  equipment_type: "",
  output: "",
  revolutions: "",
  main_effective_pressure: "",
  lube_oil_type: "",
  fuel_type: "",
  cooling_water_additives: "",
  fuel_pump_serial_no: "",
  fuel_pump_code: "",
  turbo_model: "",
  turbo_serial_no: "",
  // Inspection Prior Test
  inspection_summary: "",
  check_oil_level: "",
  check_air_filter: "",
  check_hoses_clamps: "",
  check_engine_support: "",
  check_v_belt: "",
  check_water_level: "",
  crankshaft_end_play: "",
  inspector: "",
  inspection_comments: "",
  // Operational Readings
  rpm_idle_speed: "",
  rpm_full_speed: "",
  oil_pressure_idle: "",
  oil_pressure_full: "",
  oil_temperature: "",
  engine_smoke: "",
  engine_vibration: "",
  check_engine_leakage: "",
  // Cylinder
  cylinder_head_temp: "",
  cylinder_no: "",
  cylinder_a1: "",
  cylinder_a2: "",
  cylinder_a3: "",
  cylinder_a4: "",
  cylinder_a5: "",
  cylinder_a6: "",
  cylinder_b1: "",
  cylinder_b2: "",
  cylinder_b3: "",
  cylinder_b4: "",
  cylinder_b5: "",
  cylinder_b6: "",
  // Parts Reference
  starter_part_no: "",
  alternator_part_no: "",
  v_belt_part_no: "",
  air_filter_part_no: "",
  oil_filter_part_no: "",
  fuel_filter_part_no: "",
  pre_fuel_filter_part_no: "",
  controller_brand: "",
  controller_model: "",
  remarks: "",
  recommendation: "",
  attending_technician: "",
  attending_technician_signature: "",
  noted_by: "",
  noted_by_signature: "",
  approved_by: "",
  approved_by_signature: "",
  acknowledged_by: "",
  acknowledged_by_signature: "",
};

export const useDeutzCommissioningFormStore = create<DeutzCommissioningFormStore>()(
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
      name: 'psi-deutz-commissioning-form-draft',
    }
  )
);
