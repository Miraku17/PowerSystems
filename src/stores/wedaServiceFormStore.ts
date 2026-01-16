import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WedaServiceFormData {
  // Job Reference
  job_order: string;
  report_date: string;
  // General Information
  reporting_person_name: string;
  telephone_fax: string;
  equipment_manufacturer: string;
  customer_name: string;
  contact_person: string;
  address: string;
  email_address: string;
  phone_number: string;
  // Pump Details
  pump_model: string;
  pump_serial_no: string;
  commissioning_no: string;
  equipment_model: string;
  equipment_serial_no: string;
  pump_type: string;
  pump_weight: string;
  // Operational Data
  location: string;
  date_in_service: string;
  date_failed: string;
  // Technical Specifications
  rating: string;
  revolution: string;
  related_current_amps: string;
  running_hours: string;
  phase: string;
  frequency_hz: string;
  oil_type: string;
  maximum_height_m: string;
  maximum_capacity: string;
  // Complaints & Findings
  customer_complaint: string;
  possible_cause: string;
  within_coverage_period: string;
  warrantable_failure: string;
  // Service Report Details
  summary_details: string;
  action_taken: string;
  observation: string;
  findings: string;
  recommendations: string;
  // Signatures
  attending_technician: string;
  attending_technician_signature: string;
  noted_by: string;
  noted_by_signature: string;
  approved_by: string;
  approved_by_signature: string;
  acknowledged_by: string;
  acknowledged_by_signature: string;
}

interface WedaServiceFormStore {
  formData: WedaServiceFormData;
  setFormData: (data: Partial<WedaServiceFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: WedaServiceFormData = {
  // Job Reference
  job_order: "",
  report_date: "",
  // General Information
  reporting_person_name: "",
  telephone_fax: "",
  equipment_manufacturer: "",
  customer_name: "",
  contact_person: "",
  address: "",
  email_address: "",
  phone_number: "",
  // Pump Details
  pump_model: "",
  pump_serial_no: "",
  commissioning_no: "",
  equipment_model: "",
  equipment_serial_no: "",
  pump_type: "",
  pump_weight: "",
  // Operational Data
  location: "",
  date_in_service: "",
  date_failed: "",
  // Technical Specifications
  rating: "",
  revolution: "",
  related_current_amps: "",
  running_hours: "",
  phase: "",
  frequency_hz: "",
  oil_type: "",
  maximum_height_m: "",
  maximum_capacity: "",
  // Complaints & Findings
  customer_complaint: "",
  possible_cause: "",
  within_coverage_period: "No",
  warrantable_failure: "No",
  // Service Report Details
  summary_details: "",
  action_taken: "",
  observation: "",
  findings: "",
  recommendations: "",
  // Signatures
  attending_technician: "",
  attending_technician_signature: "",
  noted_by: "",
  noted_by_signature: "",
  approved_by: "",
  approved_by_signature: "",
  acknowledged_by: "",
  acknowledged_by_signature: "",
};

export const useWedaServiceFormStore = create<WedaServiceFormStore>()(
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
      name: 'psi-weda-service-form-draft',
    }
  )
);
