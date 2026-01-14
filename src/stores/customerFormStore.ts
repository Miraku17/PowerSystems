import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerFormData {
  name: string;
  equipment: string;
  customer: string;
  contactPerson: string;
  address: string;
  email: string;
  phone: string;
}

interface CustomerFormStore {
  formData: CustomerFormData;
  setFormData: (data: Partial<CustomerFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: CustomerFormData = {
  name: "",
  equipment: "",
  customer: "",
  contactPerson: "",
  address: "",
  email: "",
  phone: "",
};

export const useCustomerFormStore = create<CustomerFormStore>()(
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
      name: 'psi-customer-form-draft',
    }
  )
);
