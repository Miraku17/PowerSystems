import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SubmersiblePumpCommissioningFormData {
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

  // Installation Details
  location: string;
  submerge_depth: string;
  length_of_wire_size: string;
  pipe_size_type: string;
  pipe_length: string;
  static_head: string;
  check_valve_size_type: string;
  no_of_elbows_size: string;
  media: string;

  // Other Details
  commissioning_date: string;
  power_source: string;
  controller_type: string;
  sump_type: string;
  controller_brand: string;
  pumping_arrangement: string;
  controller_rating: string;
  others: string;

  // Actual Operational Details
  actual_voltage: string;
  actual_frequency: string;
  actual_amps: string;
  discharge_pressure: string;
  discharge_flow: string;
  quality_of_water: string;
  water_temp: string;
  duration: string;

  // Comments
  comments: string;

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

interface SubmersiblePumpCommissioningFormStore {
  formData: SubmersiblePumpCommissioningFormData;
  setFormData: (data: Partial<SubmersiblePumpCommissioningFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: SubmersiblePumpCommissioningFormData = {
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

  // Installation Details
  location: "",
  submerge_depth: "",
  length_of_wire_size: "",
  pipe_size_type: "",
  pipe_length: "",
  static_head: "",
  check_valve_size_type: "",
  no_of_elbows_size: "",
  media: "",

  // Other Details
  commissioning_date: "",
  power_source: "",
  controller_type: "",
  sump_type: "",
  controller_brand: "",
  pumping_arrangement: "",
  controller_rating: "",
  others: "",

  // Actual Operational Details
  actual_voltage: "",
  actual_frequency: "",
  actual_amps: "",
  discharge_pressure: "",
  discharge_flow: "",
  quality_of_water: "",
  water_temp: "",
  duration: "",

  // Comments
  comments: "",

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

export const useSubmersiblePumpCommissioningFormStore = create<SubmersiblePumpCommissioningFormStore>()(
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
      name: 'psi-submersible-pump-commissioning-form-draft',
    }
  )
);
