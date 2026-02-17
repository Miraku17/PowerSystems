import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ElectricSurfacePumpTeardownFormData {
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
  motor_connection: string;

  // Service Dates & Location
  date_in_service_commissioning: string;
  date_failed: string;
  servicing_date: string;
  running_hours: string;
  location: string;

  // Warranty Coverage
  is_unit_within_coverage: boolean | null;
  is_warrantable_failure: boolean | null;

  // Reason for Teardown
  reason_for_teardown: string;

  // Motor Components Evaluation
  motor_fan_cover: string;
  motor_o_ring: string;
  motor_end_shield: string;
  motor_rotor_shaft: string;
  motor_end_bearing: string;
  motor_stator_winding: string;
  motor_eyebolt: string;
  motor_terminal_box: string;
  motor_name_plate: string;
  motor_fan: string;
  motor_frame: string;
  motor_rotor: string;
  motor_front_bearing: string;
  motor_end_shield_2: string;

  // Wet End Components Evaluation
  wet_end_impeller: string;
  wet_end_impeller_vanes: string;
  wet_end_face_seal: string;
  wet_end_shaft: string;
  wet_end_bell_housing: string;
  wet_end_bearings: string;
  wet_end_vacuum_unit: string;
  wet_end_oil_reservoir: string;
  wet_end_vacuum_chamber: string;
  wet_end_wear_ring: string;

  // Wet End Others
  wet_end_other_11_name: string;
  wet_end_other_11_value: string;
  wet_end_other_12_name: string;
  wet_end_other_12_value: string;
  wet_end_other_13_name: string;
  wet_end_other_13_value: string;
  wet_end_other_14_name: string;
  wet_end_other_14_value: string;
  wet_end_other_15_name: string;
  wet_end_other_15_value: string;
  wet_end_other_16_name: string;
  wet_end_other_16_value: string;
  wet_end_other_17_name: string;
  wet_end_other_17_value: string;
  wet_end_other_18_name: string;
  wet_end_other_18_value: string;
  wet_end_other_19_name: string;
  wet_end_other_19_value: string;

  // Signatures
  teardowned_by_name: string;
  teardowned_by_signature: string;
  checked_approved_by_name: string;
  checked_approved_by_signature: string;
  noted_by_user_id: string;
  approved_by_user_id: string;
  noted_by_name: string;
  noted_by_signature: string;
  acknowledged_by_name: string;
  acknowledged_by_signature: string;
}

interface ElectricSurfacePumpTeardownFormStore {
  formData: ElectricSurfacePumpTeardownFormData;
  setFormData: (data: Partial<ElectricSurfacePumpTeardownFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: ElectricSurfacePumpTeardownFormData = {
  reporting_person_name: "",
  reporting_person_contact: "",
  equipment_manufacturer: "",
  job_order: "",
  jo_date: "",
  customer: "",
  contact_person: "",
  address: "",
  email_or_contact: "",

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
  motor_connection: "",

  date_in_service_commissioning: "",
  date_failed: "",
  servicing_date: "",
  running_hours: "",
  location: "",

  is_unit_within_coverage: null,
  is_warrantable_failure: null,

  reason_for_teardown: "",

  motor_fan_cover: "",
  motor_o_ring: "",
  motor_end_shield: "",
  motor_rotor_shaft: "",
  motor_end_bearing: "",
  motor_stator_winding: "",
  motor_eyebolt: "",
  motor_terminal_box: "",
  motor_name_plate: "",
  motor_fan: "",
  motor_frame: "",
  motor_rotor: "",
  motor_front_bearing: "",
  motor_end_shield_2: "",

  wet_end_impeller: "",
  wet_end_impeller_vanes: "",
  wet_end_face_seal: "",
  wet_end_shaft: "",
  wet_end_bell_housing: "",
  wet_end_bearings: "",
  wet_end_vacuum_unit: "",
  wet_end_oil_reservoir: "",
  wet_end_vacuum_chamber: "",
  wet_end_wear_ring: "",

  wet_end_other_11_name: "",
  wet_end_other_11_value: "",
  wet_end_other_12_name: "",
  wet_end_other_12_value: "",
  wet_end_other_13_name: "",
  wet_end_other_13_value: "",
  wet_end_other_14_name: "",
  wet_end_other_14_value: "",
  wet_end_other_15_name: "",
  wet_end_other_15_value: "",
  wet_end_other_16_name: "",
  wet_end_other_16_value: "",
  wet_end_other_17_name: "",
  wet_end_other_17_value: "",
  wet_end_other_18_name: "",
  wet_end_other_18_value: "",
  wet_end_other_19_name: "",
  wet_end_other_19_value: "",

  teardowned_by_name: "",
  teardowned_by_signature: "",
  checked_approved_by_name: "",
  checked_approved_by_signature: "",
  noted_by_user_id: "",
  approved_by_user_id: "",
  noted_by_name: "",
  noted_by_signature: "",
  acknowledged_by_name: "",
  acknowledged_by_signature: "",
};

export const useElectricSurfacePumpTeardownFormStore = create<ElectricSurfacePumpTeardownFormStore>()(
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
      name: 'psi-electric-surface-pump-teardown-form-draft',
    }
  )
);
