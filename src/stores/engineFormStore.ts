import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EngineFormData {
  model: string;
  serialNo: string;
  altBrandModel: string;
  equipModel: string;
  equipSerialNo: string;
  altSerialNo: string;
  location: string;
  rating: string;
  rpm: string;
  startVoltage: string;
  runHours: string;
  fuelPumpSN: string;
  fuelPumpCode: string;
  lubeOil: string;
  fuelType: string;
  coolantAdditive: string;
  turboModel: string;
  turboSN: string;
  companyId: string;
}

interface EngineFormStore {
  formData: EngineFormData;
  setFormData: (data: Partial<EngineFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: EngineFormData = {
  model: "",
  serialNo: "",
  altBrandModel: "",
  equipModel: "",
  equipSerialNo: "",
  altSerialNo: "",
  location: "",
  rating: "",
  rpm: "",
  startVoltage: "",
  runHours: "",
  fuelPumpSN: "",
  fuelPumpCode: "",
  lubeOil: "",
  fuelType: "",
  coolantAdditive: "",
  turboModel: "",
  turboSN: "",
  companyId: "",
};

export const useEngineFormStore = create<EngineFormStore>()(
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
      name: 'psi-engine-form-draft',
    }
  )
);
