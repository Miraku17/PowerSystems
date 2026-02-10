import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserFormData {
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  address: string;
  phone: string;
  position_id: string;
  // role: "user" | "admin"; // commented out - now using position_id
}

interface UserFormStore {
  formData: UserFormData;
  setFormData: (data: Partial<UserFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: UserFormData = {
  firstname: "",
  lastname: "",
  email: "",
  username: "",
  address: "",
  phone: "",
  position_id: "",
  // role: "user", // commented out - now using position_id
};

export const useUserFormStore = create<UserFormStore>()(
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
      name: 'psi-user-form-draft',
    }
  )
);
