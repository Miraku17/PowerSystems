import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PumpFormData {
  engineModel: string;
  engineSerialNumber: string;
  kw: string;
  pumpModel: string;
  pumpSerialNumber: string;
  rpm: string;
  productNumber: string;
  hmax: string;
  qmax: string;
  runningHours: string;
  companyId: string;
}

interface PumpFormStore {
  formData: PumpFormData;
  setFormData: (data: Partial<PumpFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: PumpFormData = {
  engineModel: "",
  engineSerialNumber: "",
  kw: "",
  pumpModel: "",
  pumpSerialNumber: "",
  rpm: "",
  productNumber: "",
  hmax: "",
  qmax: "",
  runningHours: "",
  companyId: "",
};

export const usePumpFormStore = create<PumpFormStore>()(
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
      name: 'psi-pump-form-draft',
    }
  )
);
