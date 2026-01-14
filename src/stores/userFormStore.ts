import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserFormData {
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  address: string;
  phone: string;
  role: "user" | "admin";
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
  role: "user",
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
