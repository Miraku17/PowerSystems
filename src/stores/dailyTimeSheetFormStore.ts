import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimeSheetEntry {
  id: string;
  entry_date: string;
  start_time: string;
  stop_time: string;
  total_hours: string;
  job_description: string;
  has_date: boolean;
}

interface DailyTimeSheetFormData {
  // Header / Basic Information
  job_number: string;
  job_order_request_id: string;
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
  addRow: () => void;
  addDateRow: () => void;
  updateEntry: (id: string, data: Partial<TimeSheetEntry>) => void;
  removeEntry: (id: string) => void;
}

const generateEntryId = () => `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const createEntry = (hasDate: boolean): TimeSheetEntry => ({
  id: generateEntryId(),
  entry_date: '',
  start_time: '',
  stop_time: '',
  total_hours: '',
  job_description: '',
  has_date: hasDate,
});

const initialFormData: DailyTimeSheetFormData = {
  job_number: '',
  job_order_request_id: '',
  date: '',
  customer: '',
  address: '',
  entries: [createEntry(true)],
  total_manhours: '',
  grand_total_manhours: '',
  performed_by_signature: '',
  performed_by_name: '',
  approved_by_signature: '',
  approved_by_name: '',
  total_srt: '',
  actual_manhour: '',
  performance: '',
  service_office_note: '',
  checked_by: '',
  service_coordinator: '',
  approved_by_service: '',
  service_manager: '',
  status: 'PENDING',
};

export const useDailyTimeSheetFormStore = create<DailyTimeSheetFormStore>()(
  persist(
    (set) => ({
      formData: { ...initialFormData, entries: [createEntry(true)] },
      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      resetFormData: () => set({ formData: { ...initialFormData, entries: [createEntry(true)] } }),
      addRow: () =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: [...state.formData.entries, createEntry(false)],
          },
        })),
      addDateRow: () =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: [...state.formData.entries, createEntry(true)],
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
      version: 2,
      migrate: (persistedState: any, version: number) => {
        const state = persistedState as any;
        if (state.formData) {
          // Migrate entries: ensure has_date field exists, remove date_section_id
          const entries = (state.formData.entries || []).map((entry: any) => ({
            id: entry.id,
            entry_date: entry.entry_date || '',
            start_time: entry.start_time || '',
            stop_time: entry.stop_time || '',
            total_hours: entry.total_hours || '',
            job_description: entry.job_description || '',
            has_date: entry.has_date !== undefined ? entry.has_date : true,
          }));

          // Remove dateSections if it exists
          const { dateSections, ...restFormData } = state.formData;

          return {
            ...state,
            formData: {
              ...restFormData,
              entries: entries.length > 0 ? entries : [createEntry(true)],
            },
          };
        }
        return persistedState;
      },
    }
  )
);
