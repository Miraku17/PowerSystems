import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EngineSurfacePumpCommissioningFormData {
  // Header / Basic Information
  reporting_person_name: string;
  reporting_person_contact: string;
  equipment_manufacturer: string;
  job_order: string;
  jo_date: string;
  customer: string;
  contact_person: string;
  address: string;
  email_or_contact: string;

  // Pump Details
  pump_maker: string;
  pump_type: string;
  impeller_material: string;
  pump_model: string;
  pump_serial_number: string;
  pump_rpm: string;
  product_number: string;
  hmax_head: string;
  qmax_flow: string;
  suction_size: string;
  suction_connection: string;
  suction_strainer_pn: string;
  discharge_size: string;
  discharge_connection: string;
  configuration: string;

  // Engine Details
  engine_model: string;
  engine_serial_number: string;
  engine_horse_power: string;
  injection_pump_model: string;
  injection_pump_serial_no: string;
  pump_code: string;
  turbo_charger_brand: string;
  turbo_charger_model: string;
  turbo_charger_serial_no: string;
  type_of_fuel: string;
  engine_oil: string;
  cooling_type: string;
  fuel_filter_pn: string;
  oil_filter_pn: string;
  air_filter_pn: string;
  charging_alternator_pn: string;
  starting_motor_pn: string;
  radiator_fan_belt_pn: string;
  alternator_belt_pn: string;
  system_voltage: string;

  // Installation Details
  location: string;
  static_head: string;
  commissioning_date: string;
  suction_pipe_size: string;
  suction_pipe_length: string;
  suction_pipe_type: string;
  discharge_pipe_size: string;
  discharge_pipe_length: string;
  discharge_pipe_type: string;
  check_valve_size_type: string;
  no_of_elbows_size: string;
  media_to_be_pump: string;

  // Operational Details
  engine_idle_rpm: string;
  engine_full_rpm: string;
  oil_pressure_idle_rpm: string;
  oil_pressure_full_rpm: string;
  oil_temperature: string;
  engine_exhaust_temperature: string;
  engine_smoke_quality: string;
  engine_vibration: string;
  charging_voltage: string;
  engine_running_hours: string;
  pump_discharge_pressure: string;
  test_duration: string;
  crankshaft_end_play_prior_test: string;
  crankshaft_end_play_post_test: string;

  // Signatures
  commissioned_by_name: string;
  commissioned_by_signature: string;
  checked_approved_by_name: string;
  checked_approved_by_signature: string;
  noted_by_user_id: string;
  approved_by_user_id: string;
  noted_by_name: string;
  noted_by_signature: string;
  acknowledged_by_name: string;
  acknowledged_by_signature: string;
}

interface EngineSurfacePumpCommissioningFormStore {
  formData: EngineSurfacePumpCommissioningFormData;
  setFormData: (data: Partial<EngineSurfacePumpCommissioningFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: EngineSurfacePumpCommissioningFormData = {
  // Header / Basic Information
  reporting_person_name: "",
  reporting_person_contact: "",
  equipment_manufacturer: "",
  job_order: "",
  jo_date: "",
  customer: "",
  contact_person: "",
  address: "",
  email_or_contact: "",

  // Pump Details
  pump_maker: "",
  pump_type: "",
  impeller_material: "",
  pump_model: "",
  pump_serial_number: "",
  pump_rpm: "",
  product_number: "",
  hmax_head: "",
  qmax_flow: "",
  suction_size: "",
  suction_connection: "",
  suction_strainer_pn: "",
  discharge_size: "",
  discharge_connection: "",
  configuration: "",

  // Engine Details
  engine_model: "",
  engine_serial_number: "",
  engine_horse_power: "",
  injection_pump_model: "",
  injection_pump_serial_no: "",
  pump_code: "",
  turbo_charger_brand: "",
  turbo_charger_model: "",
  turbo_charger_serial_no: "",
  type_of_fuel: "",
  engine_oil: "",
  cooling_type: "",
  fuel_filter_pn: "",
  oil_filter_pn: "",
  air_filter_pn: "",
  charging_alternator_pn: "",
  starting_motor_pn: "",
  radiator_fan_belt_pn: "",
  alternator_belt_pn: "",
  system_voltage: "",

  // Installation Details
  location: "",
  static_head: "",
  commissioning_date: "",
  suction_pipe_size: "",
  suction_pipe_length: "",
  suction_pipe_type: "",
  discharge_pipe_size: "",
  discharge_pipe_length: "",
  discharge_pipe_type: "",
  check_valve_size_type: "",
  no_of_elbows_size: "",
  media_to_be_pump: "",

  // Operational Details
  engine_idle_rpm: "",
  engine_full_rpm: "",
  oil_pressure_idle_rpm: "",
  oil_pressure_full_rpm: "",
  oil_temperature: "",
  engine_exhaust_temperature: "",
  engine_smoke_quality: "",
  engine_vibration: "",
  charging_voltage: "",
  engine_running_hours: "",
  pump_discharge_pressure: "",
  test_duration: "",
  crankshaft_end_play_prior_test: "",
  crankshaft_end_play_post_test: "",

  // Signatures
  commissioned_by_name: "",
  commissioned_by_signature: "",
  checked_approved_by_name: "",
  checked_approved_by_signature: "",
  noted_by_user_id: "",
  approved_by_user_id: "",
  noted_by_name: "",
  noted_by_signature: "",
  acknowledged_by_name: "",
  acknowledged_by_signature: "",
};

export const useEngineSurfacePumpCommissioningFormStore = create<EngineSurfacePumpCommissioningFormStore>()(
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
      name: 'psi-engine-surface-pump-commissioning-form-draft',
    }
  )
);
