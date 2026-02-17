import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SubmersiblePumpTeardownFormData {
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
  serial_number: string;
  part_number: string;
  kw_rating_p1: string;
  kw_rating_p2: string;
  voltage: string;
  phase: string;
  frequency: string;
  rpm: string;
  hmax_head: string;
  qmax_flow: string;
  tmax: string;
  running_hrs: string;
  date_of_failure: string;
  teardown_date: string;
  reason_for_teardown: string;

  // Warranty Coverage
  is_within_warranty: boolean | null;
  is_warrantable_failure: boolean | null;

  // External Condition Before Teardown
  ext_discharge_findings: string;
  ext_power_cable_findings: string;
  ext_signal_cable_findings: string;
  ext_lifting_eye_findings: string;
  ext_terminal_cover_findings: string;
  ext_outer_casing_findings: string;
  ext_oil_plug_findings: string;
  ext_strainer_findings: string;
  ext_motor_inspection_plug_findings: string;

  // Components Condition During Teardown
  comp_discharge_unit_findings: string;
  comp_cable_unit_findings: string;
  comp_top_housing_unit_findings: string;
  comp_starter_unit_findings: string;
  comp_motor_unit_findings: string;
  comp_shaft_rotor_unit_findings: string;
  comp_seal_unit_findings: string;
  comp_wet_end_unit_findings: string;
  teardown_comments: string;

  // Motor Condition - Stator Winding Resistance
  stator_l1_l2: string;
  stator_l1_l3: string;
  stator_l2_l3: string;

  // Motor Condition - Insulation Resistance
  insulation_u1_ground: string;
  insulation_u2_ground: string;
  insulation_v1_ground: string;
  insulation_v2_ground: string;
  insulation_w1_ground: string;
  insulation_w2_ground: string;
  motor_comments: string;

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

interface SubmersiblePumpTeardownFormStore {
  formData: SubmersiblePumpTeardownFormData;
  setFormData: (data: Partial<SubmersiblePumpTeardownFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: SubmersiblePumpTeardownFormData = {
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
  serial_number: "",
  part_number: "",
  kw_rating_p1: "",
  kw_rating_p2: "",
  voltage: "",
  phase: "",
  frequency: "",
  rpm: "",
  hmax_head: "",
  qmax_flow: "",
  tmax: "",
  running_hrs: "",
  date_of_failure: "",
  teardown_date: "",
  reason_for_teardown: "",

  // Warranty Coverage
  is_within_warranty: null,
  is_warrantable_failure: null,

  // External Condition Before Teardown
  ext_discharge_findings: "",
  ext_power_cable_findings: "",
  ext_signal_cable_findings: "",
  ext_lifting_eye_findings: "",
  ext_terminal_cover_findings: "",
  ext_outer_casing_findings: "",
  ext_oil_plug_findings: "",
  ext_strainer_findings: "",
  ext_motor_inspection_plug_findings: "",

  // Components Condition During Teardown
  comp_discharge_unit_findings: "",
  comp_cable_unit_findings: "",
  comp_top_housing_unit_findings: "",
  comp_starter_unit_findings: "",
  comp_motor_unit_findings: "",
  comp_shaft_rotor_unit_findings: "",
  comp_seal_unit_findings: "",
  comp_wet_end_unit_findings: "",
  teardown_comments: "",

  // Motor Condition - Stator Winding Resistance
  stator_l1_l2: "",
  stator_l1_l3: "",
  stator_l2_l3: "",

  // Motor Condition - Insulation Resistance
  insulation_u1_ground: "",
  insulation_u2_ground: "",
  insulation_v1_ground: "",
  insulation_v2_ground: "",
  insulation_w1_ground: "",
  insulation_w2_ground: "",
  motor_comments: "",

  // Signatures
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

export const useSubmersiblePumpTeardownFormStore = create<SubmersiblePumpTeardownFormStore>()(
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
      name: 'psi-submersible-pump-teardown-form-draft',
    }
  )
);
