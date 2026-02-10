import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JobOrderRequestFormData {
  // Header / Basic Information
  // shop_field_jo_number is auto-generated from jo_number (SERIAL) on the backend
  date_prepared: string;

  // Customer Information
  full_customer_name: string;
  address: string;
  location_of_unit: string;
  contact_person: string;
  telephone_numbers: string;

  // Equipment Details
  particulars: string;
  equipment_model: string;
  equipment_number: string;
  engine_model: string;
  esn: string; // Engine Serial Number

  // Service Details
  complaints: string;
  work_to_be_done: string;
  preferred_service_date: string;
  preferred_service_time: string;
  charges_absorbed_by: string;

  // Attached References
  qtn_ref: string;
  customers_po_wty_claim_no: string;
  dr_number: string;

  // Request and Approval
  requested_by_name: string;
  requested_by_signature: string;
  approved_by_name: string;
  approved_by_signature: string;
  received_by_service_dept_name: string;
  received_by_service_dept_signature: string;
  received_by_credit_collection_name: string;
  received_by_credit_collection_signature: string;

  // Service Use Only Section
  estimated_repair_days: string;
  technicians_involved: string;
  date_job_started: string;
  date_job_completed_closed: string;
  parts_cost: string;
  labor_cost: string;
  other_cost: string;
  total_cost: string;
  date_of_invoice: string;
  invoice_number: string;
  remarks: string;
  verified_by_name: string;
  verified_by_signature: string;

  // Status
  status: string;
}

interface JobOrderRequestFormStore {
  formData: JobOrderRequestFormData;
  setFormData: (data: Partial<JobOrderRequestFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: JobOrderRequestFormData = {
  // Header / Basic Information
  // shop_field_jo_number is auto-generated
  date_prepared: "",

  // Customer Information
  full_customer_name: "",
  address: "",
  location_of_unit: "",
  contact_person: "",
  telephone_numbers: "",

  // Equipment Details
  particulars: "",
  equipment_model: "",
  equipment_number: "",
  engine_model: "",
  esn: "",

  // Service Details
  complaints: "",
  work_to_be_done: "",
  preferred_service_date: "",
  preferred_service_time: "",
  charges_absorbed_by: "Customers acct",

  // Attached References
  qtn_ref: "",
  customers_po_wty_claim_no: "",
  dr_number: "",

  // Request and Approval
  requested_by_name: "",
  requested_by_signature: "",
  approved_by_name: "",
  approved_by_signature: "",
  received_by_service_dept_name: "",
  received_by_service_dept_signature: "",
  received_by_credit_collection_name: "",
  received_by_credit_collection_signature: "",

  // Service Use Only Section
  estimated_repair_days: "",
  technicians_involved: "",
  date_job_started: "",
  date_job_completed_closed: "",
  parts_cost: "",
  labor_cost: "",
  other_cost: "",
  total_cost: "",
  date_of_invoice: "",
  invoice_number: "",
  remarks: "",
  verified_by_name: "",
  verified_by_signature: "",

  // Status
  status: "PENDING",
};

export const useJobOrderRequestFormStore = create<JobOrderRequestFormStore>()(
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
      name: 'psi-job-order-request-form-draft',
    }
  )
);
