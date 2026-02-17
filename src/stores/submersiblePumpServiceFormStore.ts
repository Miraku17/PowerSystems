import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SubmersiblePumpServiceFormData {
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
  pump_model: string;
  pump_serial_number: string;
  pump_type: string;
  kw_rating_p1: string;
  kw_rating_p2: string;
  voltage: string;
  frequency: string;
  max_head: string;
  max_flow: string;
  max_submerged_depth: string;
  no_of_leads: string;
  configuration: string;
  discharge_size_type: string;

  // Service Dates & Operation Info
  date_in_service_commissioning: string;
  date_failed: string;
  servicing_date: string;
  running_hours: string;
  water_quality: string;
  water_temp: string;

  // Service Information
  customers_complaints: string;
  possible_cause: string;

  // Warranty Coverage
  is_within_coverage_period: boolean | null;
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

interface SubmersiblePumpServiceFormStore {
  formData: SubmersiblePumpServiceFormData;
  setFormData: (data: Partial<SubmersiblePumpServiceFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: SubmersiblePumpServiceFormData = {
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
  pump_model: "",
  pump_serial_number: "",
  pump_type: "",
  kw_rating_p1: "",
  kw_rating_p2: "",
  voltage: "",
  frequency: "",
  max_head: "",
  max_flow: "",
  max_submerged_depth: "",
  no_of_leads: "",
  configuration: "",
  discharge_size_type: "",

  // Service Dates & Operation Info
  date_in_service_commissioning: "",
  date_failed: "",
  servicing_date: "",
  running_hours: "",
  water_quality: "",
  water_temp: "",

  // Service Information
  customers_complaints: "",
  possible_cause: "",

  // Warranty Coverage
  is_within_coverage_period: null,
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

export const useSubmersiblePumpServiceFormStore = create<SubmersiblePumpServiceFormStore>()(
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
      name: 'psi-submersible-pump-service-form-draft',
    }
  )
);
