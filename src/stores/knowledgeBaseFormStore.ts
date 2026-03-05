import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KBCategory } from '@/types';

interface KBFormData {
  category: KBCategory;
  title: string;
  content: string;
  videoLinks: string[];
  documentLinks: string[];
}

interface KBFormStore {
  formData: KBFormData;
  setFormData: (data: Partial<KBFormData>) => void;
  resetFormData: () => void;
}

const initialFormData: KBFormData = {
  category: "engine",
  title: "",
  content: "",
  videoLinks: [],
  documentLinks: [],
};

export const useKBFormStore = create<KBFormStore>()(
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
      name: 'psi-kb-form-draft',
    }
  )
);
