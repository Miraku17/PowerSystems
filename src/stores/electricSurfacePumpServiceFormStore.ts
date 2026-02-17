import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ElectricSurfacePumpServiceFormData {
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
  product_number: string;
  pump_model: string;
  pump_serial_number: string;
  impeller_material: string;
  pump_rpm: string;
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

  // Service Information
  customers_complaints: string;
  possible_cause: string;

  // Warranty Coverage
  is_unit_within_coverage: boolean | null;
  is_warrantable_failure: boolean | null;
  warranty_summary_details: string;

  // Service Details
  action_taken: string;
  observation: string;
  findings: string;
  recommendation: string;

  // Signatures
  performed_by_name: string;
  performed_by_signature: string;
  checked_approved_by_name: string;
  checked_approved_by_signature: string;
  noted_by_user_id: string;
  approved_by_user_id: string;
  noted_by_name: string;
  noted_by_signature: string;
  acknowledged_by_name: string;
  acknowledged_by_signature: string;
}

interface ElectricSurfacePumpServiceFormStore {
  formData: ElectricSurfacePumpServiceFormData;
  setFormData: (data: Partial<ElectricSurfacePumpServiceFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: ElectricSurfacePumpServiceFormData = {
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
  product_number: "",
  pump_model: "",
  pump_serial_number: "",
  impeller_material: "",
  pump_rpm: "",
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
  motor_connection: "",

  // Service Dates & Location
  date_in_service_commissioning: "",
  date_failed: "",
  servicing_date: "",
  running_hours: "",
  location: "",

  // Service Information
  customers_complaints: "",
  possible_cause: "",

  // Warranty Coverage
  is_unit_within_coverage: null,
  is_warrantable_failure: null,
  warranty_summary_details: "",

  // Service Details
  action_taken: "",
  observation: "",
  findings: "",
  recommendation: "",

  // Signatures
  performed_by_name: "",
  performed_by_signature: "",
  checked_approved_by_name: "",
  checked_approved_by_signature: "",
  noted_by_user_id: "",
  approved_by_user_id: "",
  noted_by_name: "",
  noted_by_signature: "",
  acknowledged_by_name: "",
  acknowledged_by_signature: "",
};

export const useElectricSurfacePumpServiceFormStore = create<ElectricSurfacePumpServiceFormStore>()(
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
      name: 'psi-electric-surface-pump-service-form-draft',
    }
  )
);
