import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimeSheetEntry {
  id: string;
  entry_date: string;
  start_time: string;
  stop_time: string;
  total_hours: string;
  job_description: string;
}

interface DailyTimeSheetFormData {
  // Header / Basic Information
  job_number: string;
  date: string;

  // Customer Information
  customer: string;
  address: string;

  // Time Entries
  entries: TimeSheetEntry[];

  // Totals
  total_manhours: string;
  grand_total_manhours: string;

  // Performed By
  performed_by_signature: string;
  performed_by_name: string;

  // Approved By
  approved_by_signature: string;
  approved_by_name: string;

  // For Service Office Only
  total_srt: string;
  actual_manhour: string;
  performance: string;
  service_office_note: string;
  checked_by: string;
  service_coordinator: string;
  approved_by_service: string;
  service_manager: string;

  // Status
  status: string;
}

interface DailyTimeSheetFormStore {
  formData: DailyTimeSheetFormData;
  setFormData: (data: Partial<DailyTimeSheetFormData>) => void;
  resetFormData: () => void;
  addEntry: () => void;
  updateEntry: (id: string, data: Partial<TimeSheetEntry>) => void;
  removeEntry: (id: string) => void;
}

const generateEntryId = () => `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const createEmptyEntry = (): TimeSheetEntry => ({
  id: generateEntryId(),
  entry_date: '',
  start_time: '',
  stop_time: '',
  total_hours: '',
  job_description: '',
});

const initialFormData: DailyTimeSheetFormData = {
  // Header / Basic Information
  job_number: '',
  date: '',

  // Customer Information
  customer: '',
  address: '',

  // Time Entries - start with one empty row
  entries: [createEmptyEntry()],

  // Totals
  total_manhours: '',
  grand_total_manhours: '',

  // Performed By
  performed_by_signature: '',
  performed_by_name: '',

  // Approved By
  approved_by_signature: '',
  approved_by_name: '',

  // For Service Office Only
  total_srt: '',
  actual_manhour: '',
  performance: '',
  service_office_note: '',
  checked_by: '',
  service_coordinator: '',
  approved_by_service: '',
  service_manager: '',

  // Status
  status: 'PENDING',
};

export const useDailyTimeSheetFormStore = create<DailyTimeSheetFormStore>()(
  persist(
    (set) => ({
      formData: initialFormData,
      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      resetFormData: () => set({ formData: { ...initialFormData, entries: [createEmptyEntry()] } }),
      addEntry: () =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: [...state.formData.entries, createEmptyEntry()],
          },
        })),
      updateEntry: (id, data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: state.formData.entries.map((entry) =>
              entry.id === id ? { ...entry, ...data } : entry
            ),
          },
        })),
      removeEntry: (id) =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: state.formData.entries.filter((entry) => entry.id !== id),
          },
        })),
    }),
    {
      name: 'psi-daily-time-sheet-form-draft',
    }
  )
);
