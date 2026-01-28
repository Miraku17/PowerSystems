import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EngineSurfacePumpServiceFormData {
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
  cooling_additives: string;

  // Service Dates & Location
  location: string;
  date_in_service_commissioning: string;
  running_hours: string;
  date_failed: string;
  servicing_date: string;

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
  noted_by_name: string;
  noted_by_signature: string;
  acknowledged_by_name: string;
  acknowledged_by_signature: string;
}

interface EngineSurfacePumpServiceFormStore {
  formData: EngineSurfacePumpServiceFormData;
  setFormData: (data: Partial<EngineSurfacePumpServiceFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: EngineSurfacePumpServiceFormData = {
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
  cooling_additives: "",

  // Service Dates & Location
  location: "",
  date_in_service_commissioning: "",
  running_hours: "",
  date_failed: "",
  servicing_date: "",

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
  noted_by_name: "",
  noted_by_signature: "",
  acknowledged_by_name: "",
  acknowledged_by_signature: "",
};

export const useEngineSurfacePumpServiceFormStore = create<EngineSurfacePumpServiceFormStore>()(
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
      name: 'psi-engine-surface-pump-service-form-draft',
    }
  )
);
