import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GrindexCommissioningFormData {
  // Reporting Person Info
  reporting_person_name: string;
  phone_number: string;

  // Equipment Info
  equipment_name: string;
  running_hours: string;

  // Customer Info
  customer_name: string;
  contact_person: string;
  address: string;
  email_address: string;

  // Commissioning Details
  commissioning_location: string;
  job_order_no: string;
  commissioning_date: string;

  // Pump Details
  pump_model: string;
  pump_serial_no: string;
  commissioning_no: string;
  equipment_manufacturer: string;
  pump_no: string;
  pump_type: string;

  // Technical Specifications
  rated_shaft_power_kw: string;
  rated_voltage: string;
  rated_current_amps: string;
  phase: string;
  frequency_hz: string;
  oil_type: string;
  maximum_height_m: string;
  maximum_capacity: string;
  pump_weight: string;
  hmax: string;
  qmax: string;

  // Summary & Inspection
  summary: string;
  inspector: string;
  comments_action: string;

  // Signatures
  attending_technician: string;
  attending_technician_signature: string;
  approved_by: string;
  approved_by_signature: string;
  acknowledged_by: string;
  acknowledged_by_signature: string;
}

interface GrindexCommissioningFormStore {
  formData: GrindexCommissioningFormData;
  setFormData: (data: Partial<GrindexCommissioningFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: GrindexCommissioningFormData = {
  // Reporting Person Info
  reporting_person_name: "",
  phone_number: "",

  // Equipment Info
  equipment_name: "",
  running_hours: "",

  // Customer Info
  customer_name: "",
  contact_person: "",
  address: "",
  email_address: "",

  // Commissioning Details
  commissioning_location: "",
  job_order_no: "",
  commissioning_date: "",

  // Pump Details
  pump_model: "",
  pump_serial_no: "",
  commissioning_no: "",
  equipment_manufacturer: "",
  pump_no: "",
  pump_type: "",

  // Technical Specifications
  rated_shaft_power_kw: "",
  rated_voltage: "",
  rated_current_amps: "",
  phase: "",
  frequency_hz: "",
  oil_type: "",
  maximum_height_m: "",
  maximum_capacity: "",
  pump_weight: "",
  hmax: "",
  qmax: "",

  // Summary & Inspection
  summary: "",
  inspector: "",
  comments_action: "",

  // Signatures
  attending_technician: "",
  attending_technician_signature: "",
  approved_by: "",
  approved_by_signature: "",
  acknowledged_by: "",
  acknowledged_by_signature: "",
};

export const useGrindexCommissioningFormStore = create<GrindexCommissioningFormStore>()(
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
      name: 'psi-grindex-commissioning-form-draft',
    }
  )
);
