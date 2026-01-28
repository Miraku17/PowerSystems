import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ElectricSurfacePumpCommissioningFormData {
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

  // Electric Motor Details
  motor_maker: string;
  motor_model: string;
  motor_hp: string;
  motor_phase: string;
  motor_rpm: string;
  motor_voltage: string;
  motor_frequency: string;
  motor_amps: string;
  motor_max_amb_temperature: string;
  motor_insulation_class: string;
  motor_no_of_leads: string;

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
  actual_rpm: string;
  actual_voltage: string;
  actual_amps: string;
  actual_frequency: string;
  motor_temperature: string;
  amb_temperature: string;
  discharge_pressure: string;
  discharge_flow: string;
  test_duration: string;

  // Signatures
  commissioned_by_name: string;
  commissioned_by_signature: string;
  checked_approved_by_name: string;
  checked_approved_by_signature: string;
  noted_by_name: string;
  noted_by_signature: string;
  acknowledged_by_name: string;
  acknowledged_by_signature: string;
}

interface ElectricSurfacePumpCommissioningFormStore {
  formData: ElectricSurfacePumpCommissioningFormData;
  setFormData: (data: Partial<ElectricSurfacePumpCommissioningFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: ElectricSurfacePumpCommissioningFormData = {
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

  // Electric Motor Details
  motor_maker: "",
  motor_model: "",
  motor_hp: "",
  motor_phase: "",
  motor_rpm: "",
  motor_voltage: "",
  motor_frequency: "",
  motor_amps: "",
  motor_max_amb_temperature: "",
  motor_insulation_class: "",
  motor_no_of_leads: "",

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
  actual_rpm: "",
  actual_voltage: "",
  actual_amps: "",
  actual_frequency: "",
  motor_temperature: "",
  amb_temperature: "",
  discharge_pressure: "",
  discharge_flow: "",
  test_duration: "",

  // Signatures
  commissioned_by_name: "",
  commissioned_by_signature: "",
  checked_approved_by_name: "",
  checked_approved_by_signature: "",
  noted_by_name: "",
  noted_by_signature: "",
  acknowledged_by_name: "",
  acknowledged_by_signature: "",
};

export const useElectricSurfacePumpCommissioningFormStore = create<ElectricSurfacePumpCommissioningFormStore>()(
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
      name: 'psi-electric-surface-pump-commissioning-form-draft',
    }
  )
);
