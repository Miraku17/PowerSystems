import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GrindexServiceFormData {
  job_order: string;
  reporting_person_name: string;
  report_date: string;
  customer_name: string;
  contact_person: string;
  address: string;
  email_address: string;
  phone_number: string;
  // Pump Fields
  pump_model: string;
  pump_serial_no: string;
  engine_model: string;
  engine_serial_no: string;
  kw: string;
  rpm: string;
  product_number: string;
  hmax: string;
  qmax: string;
  running_hours: string;
  // Operational Data
  location: string;
  date_in_service: string;
  date_failed: string;
  date_commissioned: string;
  // Complaints & Findings
  customer_complaint: string;
  possible_cause: string;
  observation: string;
  findings: string;
  action_taken: string;
  recommendations: string;
  summary_details: string;
  within_coverage_period: string;
  warrantable_failure: string;
  // Signatures
  service_technician: string;
  service_technician_signature: string;
  noted_by: string;
  noted_by_signature: string;
  approved_by: string;
  approved_by_signature: string;
  acknowledged_by: string;
  acknowledged_by_signature: string;
}

interface GrindexServiceFormStore {
  formData: GrindexServiceFormData;
  setFormData: (data: Partial<GrindexServiceFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: GrindexServiceFormData = {
  job_order: "",
  reporting_person_name: "",
  report_date: "",
  customer_name: "",
  contact_person: "",
  address: "",
  email_address: "",
  phone_number: "",
  // Pump Fields
  pump_model: "",
  pump_serial_no: "",
  engine_model: "",
  engine_serial_no: "",
  kw: "",
  rpm: "",
  product_number: "",
  hmax: "",
  qmax: "",
  running_hours: "",
  // Operational Data
  location: "",
  date_in_service: "",
  date_failed: "",
  date_commissioned: "",
  // Complaints & Findings
  customer_complaint: "",
  possible_cause: "",
  observation: "",
  findings: "",
  action_taken: "",
  recommendations: "",
  summary_details: "",
  within_coverage_period: "No",
  warrantable_failure: "No",
  // Signatures
  service_technician: "",
  service_technician_signature: "",
  noted_by: "",
  noted_by_signature: "",
  approved_by: "",
  approved_by_signature: "",
  acknowledged_by: "",
  acknowledged_by_signature: "",
};

export const useGrindexServiceFormStore = create<GrindexServiceFormStore>()(
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
      name: 'psi-grindex-service-form-draft',
    }
  )
);
