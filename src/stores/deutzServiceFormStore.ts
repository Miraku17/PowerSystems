import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DeutzServiceFormData {
  job_order: string;
  reporting_person_name: string;
  report_date: string;
  customer_name: string;
  contact_person: string;
  address: string;
  email_address: string;
  phone_number: string;
  equipment_manufacturer: string;
  equipment_model: string;
  equipment_serial_no: string;
  engine_model: string;
  engine_serial_no: string;
  alternator_brand_model: string;
  alternator_serial_no: string;
  location: string;
  date_in_service: string;
  rating: string;
  revolution: string;
  starting_voltage: string;
  running_hours: string;
  fuel_pump_serial_no: string;
  fuel_pump_code: string;
  lube_oil_type: string;
  fuel_type: string;
  cooling_water_additives: string;
  date_failed: string;
  turbo_model: string;
  turbo_serial_no: string;
  customer_complaint: string;
  possible_cause: string;
  observation: string;
  findings: string;
  action_taken: string;
  recommendations: string;
  summary_details: string;
  within_coverage_period: string;
  warrantable_failure: string;
  service_technician: string;
  service_technician_signature: string;
  noted_by: string;
  noted_by_signature: string;
  approved_by: string;
  approved_by_signature: string;
  acknowledged_by: string;
  acknowledged_by_signature: string;
}

interface DeutzServiceFormStore {
  formData: DeutzServiceFormData;
  setFormData: (data: Partial<DeutzServiceFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: DeutzServiceFormData = {
  job_order: "",
  reporting_person_name: "",
  report_date: "",
  customer_name: "",
  contact_person: "",
  address: "",
  email_address: "",
  phone_number: "",
  equipment_manufacturer: "",
  equipment_model: "",
  equipment_serial_no: "",
  engine_model: "",
  engine_serial_no: "",
  alternator_brand_model: "",
  alternator_serial_no: "",
  location: "",
  date_in_service: "",
  rating: "",
  revolution: "",
  starting_voltage: "",
  running_hours: "",
  fuel_pump_serial_no: "",
  fuel_pump_code: "",
  lube_oil_type: "",
  fuel_type: "",
  cooling_water_additives: "",
  date_failed: "",
  turbo_model: "",
  turbo_serial_no: "",
  customer_complaint: "",
  possible_cause: "",
  observation: "",
  findings: "",
  action_taken: "",
  recommendations: "",
  summary_details: "",
  within_coverage_period: "No",
  warrantable_failure: "No",
  service_technician: "",
  service_technician_signature: "",
  noted_by: "",
  noted_by_signature: "",
  approved_by: "",
  approved_by_signature: "",
  acknowledged_by: "",
  acknowledged_by_signature: "",
};

export const useDeutzServiceFormStore = create<DeutzServiceFormStore>()(
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
      name: 'psi-deutz-service-form-draft',
    }
  )
);
