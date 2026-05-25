import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExpenseItemType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'car_odo'
  | 'hotel_others';

export interface ExpenseItem {
  id: string;
  type: ExpenseItemType;
  amount: string;
  job_description: string;
  departure_odo: string;   // car_odo only
  arrival_odo: string;     // car_odo only
  sort_order: number;
}

export interface TimeSheetEntry {
  id: string;
  entry_date: string;
  start_time: string;
  stop_time: string;
  total_hours: string;
  has_date: boolean;
  initial_location: string;
  final_location: string;
  is_travel: boolean;
  expense_items: ExpenseItem[];
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

  // Totals (kept for API submission — derived from entries)
  total_manhours: string;
  grand_total_manhours: string;

  // Three signatories
  performed_by_name: string;        // Prepared By
  performed_by_signature: string;
  checked_by: string;               // Checked By (Admin 2)
  checked_by_signature: string;
  approved_by_service: string;      // Approved By (Admin 1 / SuperAdmin)
  approved_by_service_signature: string;

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
  addExpenseItem: (entryId: string, type: ExpenseItemType) => void;
  updateExpenseItem: (entryId: string, itemId: string, data: Partial<ExpenseItem>) => void;
  removeExpenseItem: (entryId: string, itemId: string) => void;
}

const generateEntryId = () => `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const generateExpenseId = () => `expense-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const createEntry = (hasDate: boolean): TimeSheetEntry => ({
  id: generateEntryId(),
  entry_date: '',
  start_time: '',
  stop_time: '',
  total_hours: '',
  has_date: hasDate,
  initial_location: '',
  final_location: '',
  is_travel: false,
  expense_items: [],
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
  performed_by_name: '',
  performed_by_signature: '',
  checked_by: '',
  checked_by_signature: '',
  approved_by_service: '',
  approved_by_service_signature: '',
  status: 'Pending',
};

export interface DailyTimeSheetSummary {
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalTravelHours: number;
  grandTotalManhours: number;
  totalMealAllowance: number;
  totalFareExpense: number;
  totalHotelOthers: number;
  grandTotalExpense: number;
  totalDistanceTravelKm: number;
}

const parseHHMM = (s: string): number | null => {
  if (!s) return null;
  const [h, m] = s.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const computeEntryWorkedMinutes = (entry: TimeSheetEntry) => {
  const startMin = parseHHMM(entry.start_time);
  const stopMinRaw = parseHHMM(entry.stop_time);
  if (startMin === null || stopMinRaw === null) return { totalMin: 0, regMin: 0 };
  let stopMin = stopMinRaw;
  if (stopMin <= startMin) stopMin += 24 * 60;
  const totalMin = stopMin - startMin;
  const workStart = 8 * 60;
  const workEnd = 17 * 60;
  const overlapStart = Math.max(startMin, workStart);
  const overlapEnd = Math.min(stopMin, workEnd);
  const regMin = Math.max(0, overlapEnd - overlapStart);
  return { totalMin, regMin };
};

export function computeSummary(entries: TimeSheetEntry[]): DailyTimeSheetSummary {
  let regMin = 0;
  let otMin = 0;
  let travelMin = 0;
  let mealAllowance = 0;
  let fareExpense = 0;
  let hotelOthers = 0;
  let distanceKm = 0;

  for (const entry of entries) {
    const { totalMin, regMin: r } = computeEntryWorkedMinutes(entry);
    if (entry.is_travel) {
      travelMin += totalMin;
    } else {
      regMin += r;
      otMin += totalMin - r;
    }

    for (const item of entry.expense_items) {
      const amt = parseFloat(item.amount) || 0;
      if (item.type === 'breakfast' || item.type === 'lunch' || item.type === 'dinner') {
        mealAllowance += amt;
      } else if (item.type === 'car_odo') {
        fareExpense += amt;
        const dep = parseFloat(item.departure_odo);
        const arr = parseFloat(item.arrival_odo);
        if (!Number.isNaN(dep) && !Number.isNaN(arr) && arr > dep) {
          distanceKm += arr - dep;
        }
      } else if (item.type === 'hotel_others') {
        hotelOthers += amt;
      }
    }
  }

  return {
    totalRegularHours: regMin / 60,
    totalOvertimeHours: otMin / 60,
    totalTravelHours: travelMin / 60,
    grandTotalManhours: (regMin + otMin + travelMin) / 60,
    totalMealAllowance: mealAllowance,
    totalFareExpense: fareExpense,
    totalHotelOthers: hotelOthers,
    grandTotalExpense: mealAllowance + fareExpense + hotelOthers,
    totalDistanceTravelKm: distanceKm,
  };
}

export const useDailyTimeSheetFormStore = create<DailyTimeSheetFormStore>()(
  persist(
    (set) => ({
      formData: { ...initialFormData, entries: [createEntry(true)] },
      setFormData: (data) =>
        set((state) => ({ formData: { ...state.formData, ...data } })),
      resetFormData: () =>
        set({ formData: { ...initialFormData, entries: [createEntry(true)] } }),
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
            entries: state.formData.entries.map((e) =>
              e.id === id ? { ...e, ...data } : e
            ),
          },
        })),
      removeEntry: (id) =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: state.formData.entries.filter((e) => e.id !== id),
          },
        })),
      addExpenseItem: (entryId, type) =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: state.formData.entries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    expense_items: [
                      ...e.expense_items,
                      {
                        id: generateExpenseId(),
                        type,
                        amount: '',
                        job_description: '',
                        departure_odo: '',
                        arrival_odo: '',
                        sort_order: e.expense_items.length,
                      },
                    ],
                  }
                : e
            ),
          },
        })),
      updateExpenseItem: (entryId, itemId, data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: state.formData.entries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    expense_items: e.expense_items.map((i) =>
                      i.id === itemId ? { ...i, ...data } : i
                    ),
                  }
                : e
            ),
          },
        })),
      removeExpenseItem: (entryId, itemId) =>
        set((state) => ({
          formData: {
            ...state.formData,
            entries: state.formData.entries.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    expense_items: e.expense_items.filter((i) => i.id !== itemId),
                  }
                : e
            ),
          },
        })),
    }),
    {
      name: 'psi-daily-time-sheet-form-draft',
      version: 6,
      migrate: (_persistedState: any, _version: number) => {
        // v6 redesign — schema changed fundamentally. Reset to a clean draft;
        // there is no clean 1:1 mapping from legacy persisted state.
        return {
          formData: { ...initialFormData, entries: [createEntry(true)] },
        };
      },
    }
  )
);
