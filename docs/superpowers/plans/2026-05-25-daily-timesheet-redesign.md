# Daily Time Sheet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Daily Time Sheet form, data model, API, and PDF to match the photo layout — typed per-entry expense items, location columns on time rows, three signatories, and a locked auto-calculated summary.

**Architecture:** A new `daily_time_sheet_expense_items` table holds typed expense rows (breakfast / lunch / dinner / car_odo / hotel_others) keyed to each `daily_time_sheet_entries` row. The entries table gains `initial_location`, `final_location`, and `is_travel` columns. The Zustand store drops flat expense fields in favor of an `ExpenseItem[]` array per entry; summary totals are derived client-side. Old records (no expense_items rows) render via a legacy fallback in View and PDF components.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand (persist), Supabase (PostgreSQL), jsPDF, Tailwind CSS, Jest + jsdom

**Spec:** [`docs/superpowers/specs/2026-05-25-daily-timesheet-redesign.md`](../specs/2026-05-25-daily-timesheet-redesign.md)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `sql/daily-timesheet-redesign.sql` | Create | DB migration — new table + entry column additions |
| `src/stores/dailyTimeSheetFormStore.ts` | Modify | New types, updated TimeSheetEntry, expense_items actions, version 6, `computeSummary` selector |
| `src/stores/__tests__/dailyTimeSheetFormStore.computeSummary.test.ts` | Create | Unit tests for the `computeSummary` selector |
| `src/stores/__tests__/dailyTimeSheetFormStore.expenseItems.test.ts` | Create | Unit tests for the new expense_items store actions |
| `src/components/DailyTimeSheetForm.tsx` | Modify | New form UI — unified manhours+expenses table, locked summary, three signatories |
| `src/app/api/forms/daily-time-sheet/route.ts` | Modify | POST: persist `expense_items` to new table, drop unused signatory fields |
| `src/app/api/forms/daily-time-sheet/[id]/route.ts` | Modify | GET: join expense_items; PATCH: delete-then-insert expense_items on update |
| `src/components/EditDailyTimeSheet.tsx` | Modify | Hydrate from joined query; share the new form UI |
| `src/components/ViewDailyTimeSheet.tsx` | Modify | New photo-layout read view + legacy fallback |
| `src/app/api/pdf/daily-time-sheet/[id]/route.ts` | Modify | PDF layout rewrite + legacy fallback |

---

## Task 1: Database Migration

**Files:**
- Create: `sql/daily-timesheet-redesign.sql`

- [ ] **Step 1: Write the SQL migration**

Create `sql/daily-timesheet-redesign.sql`:

```sql
-- Daily Time Sheet redesign (2026-05-25)
-- Adds expense_items table + location/travel columns on entries.
-- Old expense_* / travel_* columns on daily_time_sheet_entries remain
-- untouched (nullable) so legacy records still render via the View/PDF
-- legacy fallback.

BEGIN;

-- 1. Per-entry typed expense rows
CREATE TABLE IF NOT EXISTS daily_time_sheet_expense_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_time_sheet_entry_id uuid NOT NULL
    REFERENCES daily_time_sheet_entries(id) ON DELETE CASCADE,
  type                      text NOT NULL
    CHECK (type IN ('breakfast','lunch','dinner','car_odo','hotel_others')),
  amount                    numeric(10,2),
  job_description           text,
  departure_odo             numeric,   -- car_odo only
  arrival_odo               numeric,   -- car_odo only
  sort_order                int  NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dts_expense_items_entry_id
  ON daily_time_sheet_expense_items(daily_time_sheet_entry_id);

-- 2. New columns on entries
ALTER TABLE daily_time_sheet_entries
  ADD COLUMN IF NOT EXISTS initial_location text,
  ADD COLUMN IF NOT EXISTS final_location   text,
  ADD COLUMN IF NOT EXISTS is_travel        boolean NOT NULL DEFAULT false;

COMMIT;
```

- [ ] **Step 2: Apply the migration in Supabase**

Run the SQL above via the Supabase SQL editor (Dashboard → SQL → New query → paste → Run), or via the Supabase CLI:

```bash
psql "$DATABASE_URL" -f sql/daily-timesheet-redesign.sql
```

Expected: command completes without error. Verify by running:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'daily_time_sheet_entries'
  AND column_name IN ('initial_location','final_location','is_travel');
```

Expected: three rows returned.

```sql
SELECT to_regclass('public.daily_time_sheet_expense_items');
```

Expected: returns `daily_time_sheet_expense_items` (not null).

- [ ] **Step 3: Commit**

```bash
git add sql/daily-timesheet-redesign.sql
git commit -m "feat(dts): db migration for expense_items table + entry location columns"
```

---

## Task 2: Zustand Store — Types and Actions

**Files:**
- Modify: `src/stores/dailyTimeSheetFormStore.ts`
- Create: `src/stores/__tests__/dailyTimeSheetFormStore.expenseItems.test.ts`

- [ ] **Step 1: Write failing tests for expense_items store actions**

Create `src/stores/__tests__/dailyTimeSheetFormStore.expenseItems.test.ts`:

```ts
import { useDailyTimeSheetFormStore } from '../dailyTimeSheetFormStore';

const store = () => useDailyTimeSheetFormStore.getState();

describe('dailyTimeSheetFormStore — expense_items actions', () => {
  beforeEach(() => {
    store().resetFormData();
  });

  it('initial entry has empty expense_items array', () => {
    const entry = store().formData.entries[0];
    expect(entry.expense_items).toEqual([]);
  });

  it('addExpenseItem appends a typed item to the entry', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    const entry = store().formData.entries[0];
    expect(entry.expense_items).toHaveLength(1);
    expect(entry.expense_items[0]).toMatchObject({
      type: 'breakfast',
      amount: '',
      job_description: '',
      departure_odo: '',
      arrival_odo: '',
    });
    expect(entry.expense_items[0].id).toMatch(/^expense-/);
    expect(entry.expense_items[0].sort_order).toBe(0);
  });

  it('addExpenseItem assigns incrementing sort_order per entry', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    store().addExpenseItem(entryId, 'car_odo');
    store().addExpenseItem(entryId, 'hotel_others');
    const items = store().formData.entries[0].expense_items;
    expect(items.map(i => i.sort_order)).toEqual([0, 1, 2]);
    expect(items.map(i => i.type)).toEqual(['breakfast', 'car_odo', 'hotel_others']);
  });

  it('updateExpenseItem patches only the targeted item', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    store().addExpenseItem(entryId, 'hotel_others');
    const itemId = store().formData.entries[0].expense_items[1].id;
    store().updateExpenseItem(entryId, itemId, { amount: '5000', job_description: 'Hotel night' });
    const items = store().formData.entries[0].expense_items;
    expect(items[0].amount).toBe('');
    expect(items[1]).toMatchObject({ amount: '5000', job_description: 'Hotel night' });
  });

  it('removeExpenseItem removes the targeted item only', () => {
    const entryId = store().formData.entries[0].id;
    store().addExpenseItem(entryId, 'breakfast');
    store().addExpenseItem(entryId, 'hotel_others');
    const firstId = store().formData.entries[0].expense_items[0].id;
    store().removeExpenseItem(entryId, firstId);
    const items = store().formData.entries[0].expense_items;
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('hotel_others');
  });

  it('addRow / addDateRow create entries with empty expense_items', () => {
    store().addRow();
    store().addDateRow();
    const entries = store().formData.entries;
    expect(entries).toHaveLength(3);
    entries.forEach(e => expect(e.expense_items).toEqual([]));
  });

  it('initial entry has new location + travel fields set to empty/false', () => {
    const entry = store().formData.entries[0];
    expect(entry.initial_location).toBe('');
    expect(entry.final_location).toBe('');
    expect(entry.is_travel).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx jest src/stores/__tests__/dailyTimeSheetFormStore.expenseItems.test.ts
```

Expected: tests fail because `addExpenseItem`, `updateExpenseItem`, `removeExpenseItem`, and `expense_items` field don't exist yet.

- [ ] **Step 3: Replace the store file with the redesigned version**

Replace the entire contents of `src/stores/dailyTimeSheetFormStore.ts`:

```ts
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

const createEntry = (hasDate: boolean): TimeSheetEntry => ({
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

/**
 * Aggregated summary numbers derived from entries. UI displays these as
 * locked, read-only totals — they are also serialized into total_manhours /
 * grand_total_manhours for the API payload.
 *
 * Travel hours = total time of entries flagged is_travel=true.
 * Regular/OT split = overlap with [08:00,17:00] applied to non-travel entries
 * (matches the existing calculateRegularAndOT logic).
 */
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
      migrate: (persistedState: any, _version: number) => {
        // v6 redesign — drop all legacy expense_*/travel_*/service_office
        // fields. Re-initialise to a clean draft. Any in-flight legacy draft
        // becomes a fresh form (acceptable since the schema changed
        // fundamentally and there is no clean 1:1 mapping).
        return {
          formData: { ...initialFormData, entries: [createEntry(true)] },
        };
      },
    }
  )
);
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx jest src/stores/__tests__/dailyTimeSheetFormStore.expenseItems.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Write computeSummary tests**

Create `src/stores/__tests__/dailyTimeSheetFormStore.computeSummary.test.ts`:

```ts
import { computeSummary, TimeSheetEntry, ExpenseItem } from '../dailyTimeSheetFormStore';

const makeEntry = (overrides: Partial<TimeSheetEntry> = {}): TimeSheetEntry => ({
  id: 'e1',
  entry_date: '2026-05-17',
  start_time: '',
  stop_time: '',
  total_hours: '',
  has_date: true,
  initial_location: '',
  final_location: '',
  is_travel: false,
  expense_items: [],
  ...overrides,
});

const makeExpense = (overrides: Partial<ExpenseItem>): ExpenseItem => ({
  id: 'x1',
  type: 'breakfast',
  amount: '',
  job_description: '',
  departure_odo: '',
  arrival_odo: '',
  sort_order: 0,
  ...overrides,
});

describe('computeSummary', () => {
  it('returns all zeros for an empty entry list', () => {
    const s = computeSummary([]);
    expect(s).toEqual({
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalTravelHours: 0,
      grandTotalManhours: 0,
      totalMealAllowance: 0,
      totalFareExpense: 0,
      totalHotelOthers: 0,
      grandTotalExpense: 0,
      totalDistanceTravelKm: 0,
    });
  });

  it('splits an 8a–5p non-travel shift into 9h regular, 0h OT', () => {
    const s = computeSummary([makeEntry({ start_time: '08:00', stop_time: '17:00' })]);
    expect(s.totalRegularHours).toBe(9);
    expect(s.totalOvertimeHours).toBe(0);
    expect(s.totalTravelHours).toBe(0);
    expect(s.grandTotalManhours).toBe(9);
  });

  it('counts pre-8am hours as overtime for non-travel entries', () => {
    const s = computeSummary([makeEntry({ start_time: '06:00', stop_time: '08:00' })]);
    expect(s.totalRegularHours).toBe(0);
    expect(s.totalOvertimeHours).toBe(2);
  });

  it('counts travel entries entirely as travel hours', () => {
    const s = computeSummary([
      makeEntry({ start_time: '06:00', stop_time: '08:00', is_travel: true }),
    ]);
    expect(s.totalTravelHours).toBe(2);
    expect(s.totalRegularHours).toBe(0);
    expect(s.totalOvertimeHours).toBe(0);
    expect(s.grandTotalManhours).toBe(2);
  });

  it('photo example: 2h OT + 8h regular + 3h travel = 13h grand total', () => {
    const s = computeSummary([
      makeEntry({ start_time: '06:00', stop_time: '08:00' }),                       // 2h OT
      makeEntry({ start_time: '08:00', stop_time: '17:00' }),                       // 8h regular (overlap)
      makeEntry({ start_time: '17:00', stop_time: '20:00', is_travel: true }),      // 3h travel
    ]);
    expect(s.totalOvertimeHours).toBeCloseTo(2);
    expect(s.totalRegularHours).toBeCloseTo(9); // 08:00–17:00 overlap
    expect(s.totalTravelHours).toBeCloseTo(3);
  });

  it('aggregates meal expenses across breakfast/lunch/dinner', () => {
    const e = makeEntry({
      expense_items: [
        makeExpense({ type: 'breakfast', amount: '100' }),
        makeExpense({ type: 'lunch', amount: '150' }),
        makeExpense({ type: 'dinner', amount: '200' }),
      ],
    });
    const s = computeSummary([e]);
    expect(s.totalMealAllowance).toBe(450);
  });

  it('car_odo contributes amount to fare and ODO delta to distance', () => {
    const e = makeEntry({
      expense_items: [
        makeExpense({
          type: 'car_odo',
          amount: '0',
          departure_odo: '25641',
          arrival_odo: '26641',
        }),
      ],
    });
    const s = computeSummary([e]);
    expect(s.totalFareExpense).toBe(0);
    expect(s.totalDistanceTravelKm).toBe(1000);
  });

  it('hotel_others aggregates to its own bucket', () => {
    const e = makeEntry({
      expense_items: [makeExpense({ type: 'hotel_others', amount: '5000' })],
    });
    const s = computeSummary([e]);
    expect(s.totalHotelOthers).toBe(5000);
    expect(s.grandTotalExpense).toBe(5000);
  });

  it('grandTotalExpense sums all three buckets', () => {
    const e = makeEntry({
      expense_items: [
        makeExpense({ type: 'breakfast', amount: '100' }),
        makeExpense({ type: 'car_odo', amount: '50' }),
        makeExpense({ type: 'hotel_others', amount: '5000' }),
      ],
    });
    const s = computeSummary([e]);
    expect(s.grandTotalExpense).toBe(5150);
  });
});
```

- [ ] **Step 6: Run computeSummary tests, verify pass**

```bash
npx jest src/stores/__tests__/dailyTimeSheetFormStore.computeSummary.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 7: Run the full Jest suite to confirm no regressions in legacy DTS tests**

```bash
npx jest src/components/__tests__/DailyTimeSheet
```

Expected: existing DTS tests may FAIL because the store fields they referenced are gone. List the failures and update each one to use the new fields/actions. Do not skip failing tests — fix them so the suite stays green. (Tests live in `src/components/__tests__/DailyTimeSheet.*.test.tsx`.) Common fixes: drop assertions about `service_coordinator`, `total_srt`, etc.; switch expense assertions to `expense_items`.

- [ ] **Step 8: Commit**

```bash
git add src/stores/dailyTimeSheetFormStore.ts src/stores/__tests__/dailyTimeSheetFormStore.*.test.ts src/components/__tests__/DailyTimeSheet.*.test.tsx
git commit -m "feat(dts): redesigned store with expense_items + computeSummary selector"
```

---

## Task 3: DailyTimeSheetForm UI Rewrite

**Files:**
- Modify: `src/components/DailyTimeSheetForm.tsx`

This task replaces the body of the form. The Basic Information, Attachments, and submission button sections stay structurally similar; the Manhours/Expenses table, Summary, and Signatory sections are rewritten.

- [ ] **Step 1: Add the expense-type label map + summary helper at the top of the file**

Just below the existing imports in `src/components/DailyTimeSheetForm.tsx`, add:

```ts
import {
  useDailyTimeSheetFormStore,
  TimeSheetEntry,
  ExpenseItem,
  ExpenseItemType,
  computeSummary,
} from "@/stores/dailyTimeSheetFormStore";

const EXPENSE_TYPE_OPTIONS: { value: ExpenseItemType; label: string }[] = [
  { value: 'breakfast',    label: 'Breakfast' },
  { value: 'lunch',        label: 'Lunch' },
  { value: 'dinner',       label: 'Dinner' },
  { value: 'car_odo',      label: 'Car ODO' },
  { value: 'hotel_others', label: 'Hotel & Others' },
];

const formatPeso = (n: number) =>
  n === 0 ? '—' : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatHours = (n: number) => `${n.toFixed(2)} hours`;
```

Also delete:
- The `useEffect` that auto-calculated `total_srt / actual_manhour / performance / total_service_manhours` (current file lines ~84–120)
- The leave-check `useEffect` that fetched `/leave-requests/check` and set `leave_hours` / `available_manhour` / `daily_average_utilization` (current file lines ~122–161) — the new summary does not surface these fields, so the effect has no consumer
- The `calculateRegularAndOT` and `calculateTotalHours` helpers (now superseded by `computeSummary` and the inline total-hours block in the new `handleEntryChange`)

- [ ] **Step 2: Replace the calculation/handler block with summary-driven setters**

Inside the component, replace the entry-change handler so it only manages per-entry `total_hours` recompute and drops the old expense/travel branches. Add a derived `summary` and a single `useEffect` that pushes `total_manhours` and `grand_total_manhours` into form data for API submission:

```tsx
const {
  formData, setFormData, resetFormData, addRow, addDateRow,
  updateEntry, removeEntry,
  addExpenseItem, updateExpenseItem, removeExpenseItem,
} = useDailyTimeSheetFormStore();

const summary = React.useMemo(() => computeSummary(formData.entries), [formData.entries]);

useEffect(() => {
  const tm  = (summary.totalRegularHours + summary.totalTravelHours).toFixed(2);
  const gtm = summary.grandTotalManhours.toFixed(2);
  if (formData.total_manhours !== tm) setFormData({ total_manhours: tm });
  if (formData.grand_total_manhours !== gtm) setFormData({ grand_total_manhours: gtm });
}, [summary.totalRegularHours, summary.totalTravelHours, summary.grandTotalManhours]);

const handleEntryChange = (entryId: string, field: keyof TimeSheetEntry, value: any) => {
  updateEntry(entryId, { [field]: value });
  if (field === 'start_time' || field === 'stop_time') {
    const entry = formData.entries.find(e => e.id === entryId);
    if (!entry) return;
    const next = { ...entry, [field]: value } as TimeSheetEntry;
    if (next.start_time && next.stop_time) {
      const [sh, sm] = next.start_time.split(':').map(Number);
      const [eh, em] = next.stop_time.split(':').map(Number);
      let m = (eh * 60 + em) - (sh * 60 + sm);
      if (m < 0) m += 24 * 60;
      setTimeout(() => updateEntry(entryId, { total_hours: (m / 60).toFixed(2) }), 0);
    }
  }
};
```

- [ ] **Step 3: Replace the Manhours & Expenses section JSX**

Delete the existing `Section: Time Entries Table` block (the entire `<div>` containing the table and the regular/OT/grand summary tiles below it) and replace with:

```tsx
{/* Section: Manhours & Expenses */}
<div>
  <div className="flex items-center mb-4">
    <div className="w-1 h-6 bg-blue-600 mr-2" />
    <h3 className="text-lg font-bold text-gray-800 uppercase">Manhours & Expenses</h3>
  </div>

  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-200 text-gray-700">
          <th className="border border-gray-300 px-2 py-2 text-left w-[110px]">Date</th>
          <th className="border border-gray-300 px-2 py-2 text-left w-[90px]">Start Time</th>
          <th className="border border-gray-300 px-2 py-2 text-left">Initial Location</th>
          <th className="border border-gray-300 px-2 py-2 text-left w-[90px]">Stop Time</th>
          <th className="border border-gray-300 px-2 py-2 text-left">Final Location</th>
          <th className="border border-gray-300 px-2 py-2 text-center w-[70px]">Total</th>
          <th className="border border-gray-300 px-2 py-2 text-center w-[60px]">Travel</th>
          <th className="border border-gray-300 px-2 py-2 text-left w-[140px]">Expense Type</th>
          <th className="border border-gray-300 px-2 py-2 text-left w-[160px]">Amount</th>
          <th className="border border-gray-300 px-2 py-2 text-left">Job Description</th>
          <th className="border border-gray-300 px-2 py-2 w-[40px]"></th>
        </tr>
      </thead>
      <tbody>
        {formData.entries.map((entry) => {
          const rowSpan = Math.max(1, entry.expense_items.length);
          return (
            <React.Fragment key={entry.id}>
              <tr>
                <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                  {entry.has_date ? (
                    <input
                      type="date"
                      value={entry.entry_date}
                      onChange={(e) => handleEntryChange(entry.id, 'entry_date', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                    />
                  ) : null}
                </td>
                <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                  <input
                    type="time"
                    value={entry.start_time}
                    onChange={(e) => handleEntryChange(entry.id, 'start_time', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                  <input
                    type="text"
                    value={entry.initial_location}
                    onChange={(e) => handleEntryChange(entry.id, 'initial_location', e.target.value)}
                    placeholder="e.g. PSI Caloocan"
                    className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                  <input
                    type="time"
                    value={entry.stop_time}
                    onChange={(e) => handleEntryChange(entry.id, 'stop_time', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                  <input
                    type="text"
                    value={entry.final_location}
                    onChange={(e) => handleEntryChange(entry.id, 'final_location', e.target.value)}
                    placeholder="e.g. Philex"
                    className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center align-top" rowSpan={rowSpan}>
                  <input
                    type="text"
                    value={entry.total_hours}
                    readOnly
                    className="w-full bg-gray-100 border border-gray-300 rounded-md text-sm p-1 text-center font-semibold"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center align-top" rowSpan={rowSpan}>
                  <input
                    type="checkbox"
                    checked={entry.is_travel}
                    onChange={(e) => handleEntryChange(entry.id, 'is_travel', e.target.checked)}
                    className="h-4 w-4"
                    title="Mark this entry as Travel time"
                  />
                </td>
                {entry.expense_items[0] ? (
                  <ExpenseCells
                    entryId={entry.id}
                    item={entry.expense_items[0]}
                    onChange={updateExpenseItem}
                    onRemove={removeExpenseItem}
                  />
                ) : (
                  <td className="border border-gray-300 px-2 py-2 italic text-gray-400" colSpan={4}>
                    No expenses — click "Add Expense" below
                  </td>
                )}
                <td className="border border-gray-300 px-1 py-1 text-center align-top" rowSpan={rowSpan}>
                  {formData.entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remove this time row"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
              {entry.expense_items.slice(1).map((item) => (
                <tr key={item.id}>
                  <ExpenseCells
                    entryId={entry.id}
                    item={item}
                    onChange={updateExpenseItem}
                    onRemove={removeExpenseItem}
                  />
                </tr>
              ))}
              <tr>
                <td colSpan={11} className="border border-gray-300 px-2 py-1 bg-orange-50">
                  <button
                    type="button"
                    onClick={() => addExpenseItem(entry.id, 'breakfast')}
                    className="text-orange-700 hover:text-orange-900 text-xs font-semibold"
                  >
                    + Add Expense to this time entry
                  </button>
                </td>
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>

    {/* Add-row controls (colored, matching the photo) */}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={addRow}
        className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md">
        <PlusIcon className="h-4 w-4" /> Add New Time
      </button>
      <button type="button" onClick={addDateRow}
        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md">
        <CalendarDaysIcon className="h-4 w-4" /> Add New Date
      </button>
    </div>
  </div>
</div>

{/* Section: Summary (locked) */}
<div>
  <div className="flex items-center mb-4">
    <div className="w-1 h-6 bg-blue-600 mr-2" />
    <h3 className="text-lg font-bold text-gray-800 uppercase">Summary</h3>
    <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(auto-calculated, locked)</span>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
    <SummaryTile label="Total Overtime"        value={formatHours(summary.totalOvertimeHours)} />
    <SummaryTile label="Total Regular Hours"   value={formatHours(summary.totalRegularHours)} />
    <SummaryTile label="Total Travel Hours"    value={formatHours(summary.totalTravelHours)} />
    <SummaryTile label="Grand Total Manhours"  value={formatHours(summary.grandTotalManhours)} highlight />
    <SummaryTile label="Total Meal Allowance"  value={formatPeso(summary.totalMealAllowance)} />
    <SummaryTile label="Total Fare Expense"    value={formatPeso(summary.totalFareExpense)} />
    <SummaryTile label="Total Hotel & Others"  value={formatPeso(summary.totalHotelOthers)} />
    <SummaryTile label="Grand Total Expense"   value={formatPeso(summary.grandTotalExpense)} highlight />
    <SummaryTile label="Total Distance Travel" value={`${summary.totalDistanceTravelKm.toFixed(0)} km`} />
  </div>
</div>
```

- [ ] **Step 4: Add the `ExpenseCells` and `SummaryTile` helper components**

At the bottom of the file (after the existing `Input` / `TextArea` helpers), add:

```tsx
interface ExpenseCellsProps {
  entryId: string;
  item: ExpenseItem;
  onChange: (entryId: string, itemId: string, data: Partial<ExpenseItem>) => void;
  onRemove: (entryId: string, itemId: string) => void;
}

const ExpenseCells = ({ entryId, item, onChange, onRemove }: ExpenseCellsProps) => (
  <>
    <td className="border border-gray-300 px-1 py-1 align-top">
      <select
        value={item.type}
        onChange={(e) => onChange(entryId, item.id, { type: e.target.value as ExpenseItemType })}
        className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
      >
        {EXPENSE_TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </td>
    <td className="border border-gray-300 px-1 py-1 align-top">
      {item.type === 'car_odo' ? (
        <div className="grid grid-cols-2 gap-1">
          <input
            type="number"
            value={item.departure_odo}
            onChange={(e) => onChange(entryId, item.id, { departure_odo: e.target.value })}
            placeholder="Departure"
            className="w-full bg-white border border-gray-300 rounded-md text-xs p-1"
          />
          <input
            type="number"
            value={item.arrival_odo}
            onChange={(e) => onChange(entryId, item.id, { arrival_odo: e.target.value })}
            placeholder="Arrival"
            className="w-full bg-white border border-gray-300 rounded-md text-xs p-1"
          />
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span>
          <input
            type="number"
            step="0.01"
            value={item.amount}
            onChange={(e) => onChange(entryId, item.id, { amount: e.target.value })}
            placeholder="0.00"
            className="w-full bg-white border border-gray-300 rounded-md text-sm p-1 pl-5"
          />
        </div>
      )}
    </td>
    <td className="border border-gray-300 px-1 py-1 align-top">
      <input
        type="text"
        value={item.job_description}
        onChange={(e) => onChange(entryId, item.id, { job_description: e.target.value })}
        placeholder="e.g. Travel from PSI Caloocan to Philex"
        className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
      />
    </td>
    <td className="border border-gray-300 px-1 py-1 text-center align-top">
      <button
        type="button"
        onClick={() => onRemove(entryId, item.id)}
        className="p-1 text-red-500 hover:bg-red-50 rounded"
        title="Remove this expense"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </td>
  </>
);

interface SummaryTileProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const SummaryTile = ({ label, value, highlight }: SummaryTileProps) => (
  <div className={`flex flex-col rounded-md border p-3 ${highlight ? 'bg-blue-100 border-blue-300' : 'bg-white border-blue-100'}`}>
    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{label}</span>
    <span className={`mt-1 ${highlight ? 'text-lg font-bold text-blue-900' : 'text-base font-semibold text-gray-900'}`}>{value}</span>
  </div>
);
```

- [ ] **Step 5: Replace the Performed By + For Service Office Only blocks with the three-signatory section**

Delete both existing sections (Performed By and For Service Office Only — about 50 lines combined) and replace with:

```tsx
{/* Section: Signatories */}
<div>
  <div className="flex items-center mb-4">
    <div className="w-1 h-6 bg-blue-600 mr-2" />
    <h3 className="text-lg font-bold text-gray-800 uppercase">Signatories</h3>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
    <SignatorySelect
      label="Prepared By"
      name="performed_by_name"
      value={formData.performed_by_name}
      signatureValue={formData.performed_by_signature}
      onChange={handleSignatoryChange}
      onSignatureChange={(sig) => setFormData({ performed_by_signature: sig })}
      users={users as FormUser[]}
      subtitle="Logged-in User"
      autoFillForPositions={["User 1", "User 2"]}
    />
    <SignatorySelect
      label="Checked By"
      name="checked_by"
      value={formData.checked_by}
      signatureValue={formData.checked_by_signature}
      onChange={handleSignatoryChange}
      onSignatureChange={(sig) => setFormData({ checked_by_signature: sig })}
      users={users as FormUser[]}
      showAllUsers
      subtitle="Admin 2"
      disabled={!canEditCheckedBy}
      filterByPermission={isSuperAdmin ? undefined : "dts_service_office.checked_by"}
      autoFillForPositions={["Super Admin"]}
    />
    <SignatorySelect
      label="Approved By"
      name="approved_by_service"
      value={formData.approved_by_service}
      signatureValue={formData.approved_by_service_signature}
      onChange={handleSignatoryChange}
      onSignatureChange={(sig) => setFormData({ approved_by_service_signature: sig })}
      users={users as FormUser[]}
      showAllUsers
      subtitle="Admin 1 or Super Admin"
      disabled={!canEditApprovedBy}
      filterByPermission={isSuperAdmin ? undefined : "dts_service_office.approved_by"}
      autoFillForPositions={["Super Admin"]}
    />
  </div>
</div>
```

Also delete the now-unused `canEditServiceCoordinator`, `canEditServiceManager`, and `canEncodeServiceOffice` derivations from the permission block at the top of the component (keep `canEditCheckedBy` and `canEditApprovedBy`).

- [ ] **Step 6: Update `handleConfirmSubmit` to send the new payload shape**

Replace the entries serialization block inside `handleConfirmSubmit`:

```ts
const entriesData = formData.entries.map(({ id, has_date, expense_items, ...rest }, idx) => ({
  ...rest,
  sort_order: idx,
  expense_items: expense_items.map(({ id: _id, ...item }, i) => ({
    ...item,
    sort_order: i,
  })),
}));

const sanitizedServiceOffice = {
  ...(canEditCheckedBy ? {} : { checked_by: "", checked_by_signature: "" }),
  ...(canEditApprovedBy ? {} : { approved_by_service: "", approved_by_service_signature: "" }),
};

await submit({
  formType: 'daily-time-sheet' as any,
  formData: {
    ...formData,
    ...sanitizedServiceOffice,
    entries: JSON.stringify(entriesData),
    uploaded_attachments: JSON.stringify(uploadedData),
  } as unknown as Record<string, unknown>,
  onSuccess: () => {
    setAttachments([]);
    resetFormData();
  },
});
```

- [ ] **Step 7: Manual smoke check — start dev server and exercise the form**

```bash
npm run dev
```

Navigate to the Daily Time Sheet form. Verify:
- Adding/removing time rows works
- Adding/removing expense items per row works (try all 5 types)
- Car ODO shows ODO inputs instead of amount
- Summary auto-updates as you type (try the photo example)
- Three signatory selects render with permission-based locking

Take a screenshot of the form filled out to match the photo (May 17 2026 example) for the implementer's records.

- [ ] **Step 8: Commit**

```bash
git add src/components/DailyTimeSheetForm.tsx
git commit -m "feat(dts): redesign create form — expense_items, locations, summary, 3 signatories"
```

---

## Task 4: POST API Route

**Files:**
- Modify: `src/app/api/forms/daily-time-sheet/route.ts`

- [ ] **Step 1: Replace the field-extraction block (POST handler)**

Inside `POST`, replace the giant `const job_number = …` block (lines ~146–195) with:

```ts
const job_number              = getString('job_number');
const date                    = getString('date');
const customer                = getString('customer');
const address                 = getString('address');
const total_manhours          = getString('total_manhours');
const grand_total_manhours    = getString('grand_total_manhours');
const performed_by_name       = getString('performed_by_name');
const checked_by              = getString('checked_by');
const approved_by_service     = getString('approved_by_service');
const rawPerformedBySignature = getString('performed_by_signature');
const rawCheckedBySignature   = getString('checked_by_signature');
const rawApprovedBySignature  = getString('approved_by_service_signature');
const job_order_request_id    = getString('job_order_request_id');
const status                  = getString('status') || 'Pending';
const entriesJson             = isNewFormat ? (jsonBody.entries || '') : getString('entries');
```

- [ ] **Step 2: Replace the service-office permission check loop with the new two-field check**

Replace the `serviceOfficeFieldChecks` loop with:

```ts
const serviceOfficeChecks = [
  { value: checked_by,          action: 'checked_by',  label: 'checked by' },
  { value: approved_by_service, action: 'approved_by', label: 'approved by' },
];

for (const { value, action, label } of serviceOfficeChecks) {
  if (value) {
    const allowed = await hasPermission(supabase, user.id, 'dts_service_office', action);
    if (!allowed) {
      return NextResponse.json(
        { error: `You do not have permission to set the ${label} field` },
        { status: 403 }
      );
    }
  }
}
```

Keep the existing `assertJoInProgressById` gate immediately after this block.

- [ ] **Step 3: Update signature upload + insert payload**

Replace the signature processing + main insert block:

```ts
const timestamp = Date.now();
const performed_by_signature = await uploadSignature(
  serviceSupabase, rawPerformedBySignature,
  `daily-time-sheet/performed-by-${timestamp}.png`
);
const checked_by_signature = await uploadSignature(
  serviceSupabase, rawCheckedBySignature,
  `daily-time-sheet/checked-by-${timestamp}.png`
);
const approved_by_service_signature = await uploadSignature(
  serviceSupabase, rawApprovedBySignature,
  `daily-time-sheet/approved-by-${timestamp}.png`
);

const { data: created, error: insertError } = await supabase
  .from('daily_time_sheet')
  .insert({
    job_number,
    job_order_request_id: job_order_request_id || null,
    date: date || null,
    customer,
    address,
    total_manhours: total_manhours ? parseFloat(total_manhours) : null,
    grand_total_manhours: grand_total_manhours ? parseFloat(grand_total_manhours) : null,
    performed_by_name,
    performed_by_signature: performed_by_signature || null,
    checked_by,
    checked_by_signature: checked_by_signature || null,
    approved_by_service,
    approved_by_service_signature: approved_by_service_signature || null,
    status,
    created_by: user.id,
  })
  .select()
  .single();

if (insertError || !created) {
  console.error('Error inserting daily time sheet:', insertError);
  return NextResponse.json({ error: insertError?.message || 'Insert failed' }, { status: 500 });
}
```

Adjust to keep whatever attachment-insertion logic exists right after the main insert in the current file — just rewire it to use `created.id`.

- [ ] **Step 4: Insert entries + expense items**

After the main insert, add:

```ts
const parsedEntries: any[] = entriesJson ? JSON.parse(entriesJson) : [];

if (parsedEntries.length > 0) {
  const entryRows = parsedEntries.map((entry, index) => ({
    daily_time_sheet_id: created.id,
    entry_date:       entry.entry_date || null,
    start_time:       entry.start_time || null,
    stop_time:        entry.stop_time  || null,
    total_hours:      entry.total_hours ? parseFloat(entry.total_hours) : null,
    initial_location: entry.initial_location || '',
    final_location:   entry.final_location || '',
    is_travel:        !!entry.is_travel,
    sort_order:       entry.sort_order ?? index,
    // Legacy columns left null — view/PDF use expense_items table for new records.
    job_description: '',
  }));

  const { data: insertedEntries, error: entriesError } = await supabase
    .from('daily_time_sheet_entries')
    .insert(entryRows)
    .select('id, sort_order');

  if (entriesError) {
    console.error('Error inserting entries:', entriesError);
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  // Map sort_order back to source entry to know which expense_items belong where.
  const idBySort = new Map<number, string>();
  (insertedEntries || []).forEach((r: any) => idBySort.set(r.sort_order, r.id));

  const expenseRows: any[] = [];
  parsedEntries.forEach((entry, index) => {
    const newEntryId = idBySort.get(entry.sort_order ?? index);
    if (!newEntryId) return;
    (entry.expense_items || []).forEach((item: any, i: number) => {
      expenseRows.push({
        daily_time_sheet_entry_id: newEntryId,
        type: item.type,
        amount:          item.amount          ? parseFloat(item.amount)          : null,
        departure_odo:   item.departure_odo   ? parseFloat(item.departure_odo)   : null,
        arrival_odo:     item.arrival_odo     ? parseFloat(item.arrival_odo)     : null,
        job_description: item.job_description || '',
        sort_order: item.sort_order ?? i,
      });
    });
  });

  if (expenseRows.length > 0) {
    const { error: expenseError } = await supabase
      .from('daily_time_sheet_expense_items')
      .insert(expenseRows);
    if (expenseError) {
      console.error('Error inserting expense items:', expenseError);
      return NextResponse.json({ error: expenseError.message }, { status: 500 });
    }
  }
}

return NextResponse.json({ success: true, data: created });
```

Delete the old per-entry insert block (the one writing `expense_breakfast`, `travel_*`, etc.) — it is replaced by the block above.

- [ ] **Step 5: Smoke test — submit a form**

Run the dev server. Submit a filled-out form matching the photo. Check Supabase via SQL editor:

```sql
SELECT id, initial_location, final_location, is_travel
FROM daily_time_sheet_entries
WHERE daily_time_sheet_id = '<id from response>';

SELECT type, amount, departure_odo, arrival_odo, job_description
FROM daily_time_sheet_expense_items
WHERE daily_time_sheet_entry_id IN (
  SELECT id FROM daily_time_sheet_entries WHERE daily_time_sheet_id = '<id>'
)
ORDER BY sort_order;
```

Expected: rows present and match the form input.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/forms/daily-time-sheet/route.ts
git commit -m "feat(dts): POST route persists expense_items + entry location/travel fields"
```

---

## Task 5: GET + PATCH API Routes

**Files:**
- Modify: `src/app/api/forms/daily-time-sheet/[id]/route.ts`

- [ ] **Step 1: Update GET to join expense items**

Replace the GET query:

```ts
const { data, error } = await supabase
  .from("daily_time_sheet")
  .select("*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))")
  .eq("id", id)
  .is("deleted_at", null)
  .single();
```

Leave the surrounding permission/response code unchanged.

Also: do the same update to the GET in `src/app/api/forms/daily-time-sheet/route.ts` (the list route) so the form-list endpoint returns expense items where relevant — change its `.select("*, daily_time_sheet_entries(*)")` to `.select("*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))")`.

- [ ] **Step 2: Replace the PATCH field extraction**

Inside `PATCH`, replace the existing destructure of `body` with:

```ts
const {
  job_number,
  job_order_request_id,
  date,
  customer,
  address,
  total_manhours,
  grand_total_manhours,
  performed_by_name,
  performed_by_signature: rawPerformedBySignature,
  checked_by,
  checked_by_signature: rawCheckedBySignature,
  approved_by_service,
  approved_by_service_signature: rawApprovedBySignature,
  status = 'Pending',
  entries,
} = body;
```

- [ ] **Step 3: Update the service-office permission check**

Replace the `serviceOfficeFields` loop with the two-field variant:

```ts
const serviceOfficeFields = [
  { field: 'checked_by',          action: 'checked_by',  sigField: 'checked_by_signature' },
  { field: 'approved_by_service', action: 'approved_by', sigField: 'approved_by_service_signature' },
];
```

The body of the loop stays the same — it already compares against `currentRecord[field]` / `currentRecord[sigField]`.

- [ ] **Step 4: Update the `currentRecord` fetch and signature upload block**

Replace the `currentRecord` select inside `PATCH` to remove the unused service_coordinator/service_manager fields and add `checked_by_signature` + `approved_by_service_signature`:

```ts
const { data: currentRecord, error: fetchError } = await supabase
  .from('daily_time_sheet')
  .select(`
    performed_by_signature,
    checked_by,
    checked_by_signature,
    approved_by_service,
    approved_by_service_signature,
    deleted_at,
    created_by
  `)
  .eq('id', id)
  .single();
```

Then replace the signature upload section with:

```ts
const timestamp = Date.now();
const performed_by_signature = await uploadSignature(
  serviceSupabase, rawPerformedBySignature || '',
  `daily-time-sheet/performed-by-${timestamp}.png`
);
const checked_by_signature = await uploadSignature(
  serviceSupabase, rawCheckedBySignature || '',
  `daily-time-sheet/checked-by-${timestamp}.png`
);
const approved_by_service_signature = await uploadSignature(
  serviceSupabase, rawApprovedBySignature || '',
  `daily-time-sheet/approved-by-${timestamp}.png`
);

// Delete prior signatures if replaced (mirror the existing performed_by pattern).
const maybeDelete = async (existing: string | null, incomingRaw: any, incomingNew: string) => {
  if (!existing) return;
  if (incomingRaw === '' || incomingRaw === null) {
    await deleteSignature(serviceSupabase, existing);
  } else if (incomingNew && incomingNew !== existing) {
    await deleteSignature(serviceSupabase, existing);
  }
};
await maybeDelete(currentRecord.performed_by_signature,        rawPerformedBySignature, performed_by_signature);
await maybeDelete(currentRecord.checked_by_signature,          rawCheckedBySignature,   checked_by_signature);
await maybeDelete(currentRecord.approved_by_service_signature, rawApprovedBySignature,  approved_by_service_signature);
```

Delete the old per-signature deletion blocks (the `if (currentRecord.performed_by_signature)` and `if (currentRecord.approved_by_signature)` blocks).

- [ ] **Step 5: Replace the updateData object**

Replace `updateData` with the three-signatory minimal shape:

```ts
const updateData: any = {
  job_number: job_number || '',
  job_order_request_id: job_order_request_id || null,
  date: date || null,
  customer: customer || '',
  address: address || '',
  total_manhours: total_manhours ? parseFloat(total_manhours) : null,
  grand_total_manhours: grand_total_manhours ? parseFloat(grand_total_manhours) : null,
  performed_by_name: performed_by_name || '',
  checked_by: checked_by || '',
  approved_by_service: approved_by_service || '',
  status,
  updated_by: user.id,
  updated_at: new Date().toISOString(),
};
if (performed_by_signature) updateData.performed_by_signature = performed_by_signature;
else if (rawPerformedBySignature === '' || rawPerformedBySignature === null) updateData.performed_by_signature = null;
if (checked_by_signature) updateData.checked_by_signature = checked_by_signature;
else if (rawCheckedBySignature === '' || rawCheckedBySignature === null) updateData.checked_by_signature = null;
if (approved_by_service_signature) updateData.approved_by_service_signature = approved_by_service_signature;
else if (rawApprovedBySignature === '' || rawApprovedBySignature === null) updateData.approved_by_service_signature = null;
```

- [ ] **Step 6: Replace the entries delete-and-reinsert block**

Replace the existing `// Update time entries` block with:

```ts
if (entries && Array.isArray(entries)) {
  // CASCADE on the FK will drop expense_items when we delete entries.
  await supabase
    .from('daily_time_sheet_entries')
    .delete()
    .eq('daily_time_sheet_id', id);

  if (entries.length > 0) {
    const entryRows = entries.map((entry: any, index: number) => ({
      daily_time_sheet_id: id,
      entry_date:       entry.entry_date || null,
      start_time:       entry.start_time || null,
      stop_time:        entry.stop_time  || null,
      total_hours:      entry.total_hours ? parseFloat(entry.total_hours) : null,
      initial_location: entry.initial_location || '',
      final_location:   entry.final_location || '',
      is_travel:        !!entry.is_travel,
      sort_order:       entry.sort_order ?? index,
      job_description: '',
    }));

    const { data: insertedEntries, error: entriesError } = await supabase
      .from('daily_time_sheet_entries')
      .insert(entryRows)
      .select('id, sort_order');

    if (entriesError) {
      console.error('Error inserting entries:', entriesError);
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    const idBySort = new Map<number, string>();
    (insertedEntries || []).forEach((r: any) => idBySort.set(r.sort_order, r.id));

    const expenseRows: any[] = [];
    entries.forEach((entry: any, index: number) => {
      const newEntryId = idBySort.get(entry.sort_order ?? index);
      if (!newEntryId) return;
      (entry.expense_items || []).forEach((item: any, i: number) => {
        expenseRows.push({
          daily_time_sheet_entry_id: newEntryId,
          type: item.type,
          amount:        item.amount        ? parseFloat(item.amount)        : null,
          departure_odo: item.departure_odo ? parseFloat(item.departure_odo) : null,
          arrival_odo:   item.arrival_odo   ? parseFloat(item.arrival_odo)   : null,
          job_description: item.job_description || '',
          sort_order: item.sort_order ?? i,
        });
      });
    });

    if (expenseRows.length > 0) {
      const { error: expenseError } = await supabase
        .from('daily_time_sheet_expense_items')
        .insert(expenseRows);
      if (expenseError) {
        console.error('Error inserting expense items:', expenseError);
        return NextResponse.json({ error: expenseError.message }, { status: 500 });
      }
    }
  }
}
```

- [ ] **Step 7: Smoke test — edit an existing record**

Open an existing record (one created via Task 4 POST). Modify a few expense rows and save. Verify with:

```sql
SELECT type, amount, departure_odo, arrival_odo
FROM daily_time_sheet_expense_items
WHERE daily_time_sheet_entry_id IN (
  SELECT id FROM daily_time_sheet_entries WHERE daily_time_sheet_id = '<id>'
)
ORDER BY sort_order;
```

Expected: reflects edits.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/forms/daily-time-sheet/[id]/route.ts
git commit -m "feat(dts): GET joins expense_items; PATCH delete-then-reinsert with expense_items"
```

---

## Task 6: EditDailyTimeSheet Hydration

**Files:**
- Modify: `src/components/EditDailyTimeSheet.tsx`

The Edit component mirrors the create form. The key differences are data hydration from the GET response and an Update button instead of Submit. Plan: copy the new JSX from `DailyTimeSheetForm.tsx` and adjust the data-loading effect.

- [ ] **Step 1: Hydrate the store from fetched data**

Locate the existing `useEffect` that hydrates form state from the fetched record (it currently maps the old `expense_breakfast`, `travel_time_*` fields onto entries). Replace its entries-mapping block with:

```ts
const hydratedEntries = (record.daily_time_sheet_entries || [])
  .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  .map((entry: any, index: number) => ({
    id: `entry-${entry.id}`,
    entry_date: entry.entry_date || '',
    start_time: entry.start_time || '',
    stop_time:  entry.stop_time  || '',
    total_hours: entry.total_hours != null ? String(entry.total_hours) : '',
    has_date: index === 0 || !!entry.entry_date,
    initial_location: entry.initial_location || '',
    final_location:   entry.final_location   || '',
    is_travel:        !!entry.is_travel,
    expense_items: (entry.daily_time_sheet_expense_items || [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item: any, i: number) => ({
        id: `expense-${item.id}`,
        type: item.type,
        amount:        item.amount != null ? String(item.amount) : '',
        departure_odo: item.departure_odo != null ? String(item.departure_odo) : '',
        arrival_odo:   item.arrival_odo   != null ? String(item.arrival_odo)   : '',
        job_description: item.job_description || '',
        sort_order: item.sort_order ?? i,
      })),
  }));

setFormData({
  job_number: record.job_number || '',
  job_order_request_id: record.job_order_request_id || '',
  date: record.date || '',
  customer: record.customer || '',
  address: record.address || '',
  total_manhours: record.total_manhours != null ? String(record.total_manhours) : '',
  grand_total_manhours: record.grand_total_manhours != null ? String(record.grand_total_manhours) : '',
  performed_by_name: record.performed_by_name || '',
  performed_by_signature: record.performed_by_signature || '',
  checked_by: record.checked_by || '',
  checked_by_signature: record.checked_by_signature || '',
  approved_by_service: record.approved_by_service || '',
  approved_by_service_signature: record.approved_by_service_signature || '',
  status: record.status || 'Pending',
  entries: hydratedEntries.length > 0 ? hydratedEntries : [createEntry(true)],
});
```

(If `createEntry` is not exported from the store, change the conditional to a literal blank entry object matching the shape in Task 2.)

- [ ] **Step 2: Replace the form body with the new layout**

Replace the JSX of `EditDailyTimeSheet`'s render method with the same Manhours & Expenses table, Summary section, and three-signatory Signatories section defined in Task 3 Steps 3 and 5. Reuse the `ExpenseCells` and `SummaryTile` helpers from Task 3 — either:
  (a) copy them into this file, or
  (b) extract them to a new shared module `src/components/dailyTimeSheet/parts.tsx` and import from both `DailyTimeSheetForm.tsx` and `EditDailyTimeSheet.tsx`.

Option (b) is preferred (DRY). If you pick (b), do it as a separate prep step before this one: cut the helpers from `DailyTimeSheetForm.tsx` into the new file, re-import them, run the form once to confirm parity, then proceed to copy/import into `EditDailyTimeSheet.tsx`.

Differences from the create form:
- The submit handler calls `apiClient.patch('/forms/daily-time-sheet/' + id, payload)` (or whichever PATCH wrapper this component already uses) instead of going through `useOfflineSubmit`
- The button label is `Update Daily Time Sheet`
- The payload `entriesData` is built the same way as Task 3 Step 6 (strip `id` and `has_date` from entries, strip `id` from expense_items, assign sort_order)

- [ ] **Step 3: Delete all references to removed fields**

Remove any leftover references to `total_srt`, `actual_manhour`, `performance`, `total_service_manhours`, `service_coordinator*`, `service_manager*`, `available_manhour`, `leave_hours`, `daily_average_utilization`, and the legacy `expense_*` / `travel_*` flat fields. The TypeScript compiler will flag these — run `npx tsc --noEmit` and fix every error.

- [ ] **Step 4: Smoke test**

Open an existing record for editing, verify all expense_items and locations hydrate correctly, modify and save, then reopen to confirm the changes round-trip.

- [ ] **Step 5: Commit**

```bash
git add src/components/EditDailyTimeSheet.tsx
git commit -m "feat(dts): edit screen uses redesigned form with expense_items hydration"
```

---

## Task 7: ViewDailyTimeSheet — New Layout + Legacy Fallback

**Files:**
- Modify: `src/components/ViewDailyTimeSheet.tsx`

- [ ] **Step 1: Update the fetched-data shape and detect new vs. legacy records**

In the existing `fetchEntries` effect, change the select to include expense items (or, if entries come from the parent prop, change the parent to use the joined GET — see Task 5). Then after sorting entries, compute:

```ts
const hasNewShape = entries.some((e: any) =>
  Array.isArray(e.daily_time_sheet_expense_items) && e.daily_time_sheet_expense_items.length > 0
) || entries.some((e: any) => e.initial_location || e.final_location || e.is_travel);
```

- [ ] **Step 2: Render the new layout when `hasNewShape` is true**

Below the header section, conditionally render two layouts:

```tsx
{hasNewShape ? (
  <NewLayoutTable entries={entries} />
) : (
  <LegacyLayoutTable entries={entries} />
)}
```

Define `NewLayoutTable` inline (or as a sibling component in the same file). It mirrors the table from Task 3 but with all inputs replaced by plain text — no buttons, no inputs, no add-row UI. Use the same column layout (Date | Start | Initial | Stop | Final | Total | Travel? | Expense Type | Amount/ODO | Job Description). For each entry's expense_items, render them as the sub-rows (same `rowSpan` strategy).

Add a Summary block below the table that renders the `computeSummary` output for visual parity with the form:

```tsx
import { computeSummary } from '@/stores/dailyTimeSheetFormStore';

const summary = computeSummary(entries.map(/* adapt API shape to TimeSheetEntry */));
```

Adapt by mapping `daily_time_sheet_expense_items` → `expense_items` and stringifying numeric fields.

Render the three-signatory footer block using the existing `resolveSignature` helper.

- [ ] **Step 3: Keep `LegacyLayoutTable` for old records**

Move the existing table/summary rendering into a `LegacyLayoutTable` component that takes the entries with the old flat fields. Do not modify its behavior — old records must continue to display exactly as they used to.

- [ ] **Step 4: Smoke test both branches**

- Open a record created with Task 4 (new shape) — verify the new layout renders, summary numbers match what you entered, signatures render correctly.
- Open a record created BEFORE this migration (an old DB row) — verify the legacy layout renders unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/ViewDailyTimeSheet.tsx
git commit -m "feat(dts): view screen renders new layout + legacy fallback"
```

---

## Task 8: PDF Export — New Layout + Legacy Fallback

**Files:**
- Modify: `src/app/api/pdf/daily-time-sheet/[id]/route.ts`

- [ ] **Step 1: Update the query to join expense items**

Replace the `.select(...)` with:

```ts
const { data: record, error } = await supabase
  .from('daily_time_sheet')
  .select('*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))')
  .eq('id', id)
  .single();
```

- [ ] **Step 2: Detect record shape**

After sorting `entries`, add:

```ts
const hasNewShape = entries.some((e: any) =>
  (e.daily_time_sheet_expense_items?.length ?? 0) > 0
) || entries.some((e: any) => e.initial_location || e.final_location || e.is_travel);
```

- [ ] **Step 3: Branch the layout**

After the header section (CUSTOMER / ADDRESS / JOB NO. / DATE rows are unchanged), branch:

```ts
if (hasNewShape) {
  yPos = drawNewLayout(doc, record, entries, { leftMargin, rightMargin, pageWidth, contentWidth, yPos });
} else {
  yPos = drawLegacyLayout(doc, record, entries, { leftMargin, rightMargin, pageWidth, contentWidth, yPos });
}
```

Move the existing drawing code (the 20-row table, total manhours row, grand total, FOR SERVICE OFFICE ONLY block, signatory block) into `drawLegacyLayout` as a top-level function in the same file. No behavior change for legacy.

- [ ] **Step 4: Implement `drawNewLayout`**

Add at the bottom of the route file:

```ts
function drawNewLayout(doc: any, record: any, entries: any[], geom: {
  leftMargin: number; rightMargin: number; pageWidth: number; contentWidth: number; yPos: number;
}) {
  const { leftMargin, rightMargin, pageWidth, contentWidth } = geom;
  let yPos = geom.yPos;

  // Column widths (mm). Tune to fit A4 portrait (180mm contentWidth).
  const W = {
    date: 20, start: 14, initial: 28, stop: 14, final: 28,
    total: 12, travel: 10, type: 20, amount: 22, desc: 0, // desc fills the rest
  };
  W.desc = contentWidth - (W.date + W.start + W.initial + W.stop + W.final + W.total + W.travel + W.type + W.amount);

  // Header
  const rowHeight = 6;
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.setFillColor(230, 230, 230);
  doc.rect(leftMargin, yPos, contentWidth, rowHeight, 'F');
  let x = leftMargin;
  const headers: [keyof typeof W, string][] = [
    ['date','DATE'],['start','START'],['initial','INITIAL LOCATION'],
    ['stop','STOP'],['final','FINAL LOCATION'],['total','TOTAL'],
    ['travel','TRVL'],['type','EXPENSE TYPE'],['amount','AMOUNT'],['desc','JOB DESCRIPTION'],
  ];
  for (const [k, label] of headers) {
    doc.rect(x, yPos, W[k], rowHeight);
    doc.text(label, x + W[k] / 2, yPos + 4, { align: 'center' });
    x += W[k];
  }
  yPos += rowHeight;

  // Rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  for (const entry of entries) {
    const items = (entry.daily_time_sheet_expense_items || [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const blockRows = Math.max(1, items.length);
    const blockHeight = rowHeight * blockRows;

    // Time cells (span blockHeight)
    x = leftMargin;
    const drawCell = (w: number, text: string, height = rowHeight, opts: any = {}) => {
      doc.rect(x, yPos, w, height);
      if (text) doc.text(text, x + w / 2, yPos + 4, { align: 'center', ...opts });
      x += w;
    };
    drawCell(W.date,    entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('en-US') : '', blockHeight);
    drawCell(W.start,   entry.start_time || '', blockHeight);
    drawCell(W.initial, entry.initial_location || '', blockHeight);
    drawCell(W.stop,    entry.stop_time || '', blockHeight);
    drawCell(W.final,   entry.final_location || '', blockHeight);
    drawCell(W.total,   entry.total_hours != null ? String(entry.total_hours) : '', blockHeight);
    drawCell(W.travel,  entry.is_travel ? '✓' : '', blockHeight);

    // Expense rows on the right
    const expenseStartX = x;
    for (let i = 0; i < blockRows; i++) {
      const item = items[i];
      let ex = expenseStartX;
      doc.rect(ex, yPos + i * rowHeight, W.type,   rowHeight);
      doc.rect(ex + W.type, yPos + i * rowHeight, W.amount, rowHeight);
      doc.rect(ex + W.type + W.amount, yPos + i * rowHeight, W.desc, rowHeight);
      if (item) {
        const typeLabel: Record<string,string> = {
          breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner',
          car_odo: 'Car ODO', hotel_others: 'Hotel & Others',
        };
        doc.text(typeLabel[item.type] || item.type, ex + W.type / 2, yPos + i * rowHeight + 4, { align: 'center' });
        const amountText = item.type === 'car_odo'
          ? `${item.departure_odo ?? ''}/${item.arrival_odo ?? ''}`
          : (item.amount != null ? `₱${Number(item.amount).toFixed(2)}` : '');
        doc.text(amountText, ex + W.type + W.amount / 2, yPos + i * rowHeight + 4, { align: 'center' });
        const descLines = doc.splitTextToSize(item.job_description || '', W.desc - 2);
        doc.text(descLines.slice(0, 1), ex + W.type + W.amount + 1, yPos + i * rowHeight + 4);
      }
    }
    yPos += blockHeight;
  }

  // Summary block
  yPos += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('SUMMARY', leftMargin, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);

  const summary = computePdfSummary(entries);
  const summaryRows: [string, string][] = [
    ['Total Overtime',        `${summary.totalOvertimeHours.toFixed(2)} hours`],
    ['Total Regular Hours',   `${summary.totalRegularHours.toFixed(2)} hours`],
    ['Total Travel Hours',    `${summary.totalTravelHours.toFixed(2)} hours`],
    ['Grand Total Manhours',  `${summary.grandTotalManhours.toFixed(2)} hours`],
    ['Total Meal Allowance',  `₱${summary.totalMealAllowance.toFixed(2)}`],
    ['Total Fare Expense',    `₱${summary.totalFareExpense.toFixed(2)}`],
    ['Total Hotel & Others',  `₱${summary.totalHotelOthers.toFixed(2)}`],
    ['Grand Total Expense',   `₱${summary.grandTotalExpense.toFixed(2)}`],
    ['Total Distance Travel', `${summary.totalDistanceTravelKm.toFixed(0)} km`],
  ];
  const labelX = leftMargin;
  const valueX = leftMargin + 60;
  for (const [label, value] of summaryRows) {
    doc.text(label, labelX, yPos);
    doc.text(value, valueX, yPos);
    yPos += 5;
  }

  // Three-signatory footer
  yPos += 10;
  const colW = contentWidth / 3;
  ['PREPARED BY:', 'CHECKED BY:', 'APPROVED BY:'].forEach((label, i) => {
    const cx = leftMargin + colW * i + colW / 2;
    doc.setFont('helvetica', 'bold');
    doc.text(label, cx, yPos, { align: 'center' });
  });
  const names = [record.performed_by_name, record.checked_by, record.approved_by_service];
  doc.setFont('helvetica', 'normal');
  names.forEach((n, i) => {
    const cx = leftMargin + colW * i + colW / 2;
    doc.text(n || '', cx, yPos + 18, { align: 'center' });
    doc.line(leftMargin + colW * i + 10, yPos + 20, leftMargin + colW * (i + 1) - 10, yPos + 20);
  });

  return yPos + 26;
}

// Inline minimal port of computeSummary for the PDF route (avoid importing
// browser-tinted code into the API route).
function computePdfSummary(entries: any[]) {
  let regMin = 0, otMin = 0, travelMin = 0;
  let meal = 0, fare = 0, hotel = 0, dist = 0;
  const toMin = (s: string) => {
    if (!s) return null;
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  for (const e of entries) {
    const start = toMin(e.start_time);
    const stopRaw = toMin(e.stop_time);
    if (start != null && stopRaw != null) {
      let stop = stopRaw;
      if (stop <= start) stop += 24 * 60;
      const total = stop - start;
      if (e.is_travel) {
        travelMin += total;
      } else {
        const overlapStart = Math.max(start, 8 * 60);
        const overlapEnd = Math.min(stop, 17 * 60);
        const reg = Math.max(0, overlapEnd - overlapStart);
        regMin += reg;
        otMin += total - reg;
      }
    }
    for (const item of (e.daily_time_sheet_expense_items || [])) {
      const amt = Number(item.amount) || 0;
      if (['breakfast','lunch','dinner'].includes(item.type)) meal += amt;
      else if (item.type === 'car_odo') {
        fare += amt;
        const dep = Number(item.departure_odo), arr = Number(item.arrival_odo);
        if (!isNaN(dep) && !isNaN(arr) && arr > dep) dist += arr - dep;
      } else if (item.type === 'hotel_others') hotel += amt;
    }
  }
  return {
    totalRegularHours:  regMin / 60,
    totalOvertimeHours: otMin / 60,
    totalTravelHours:   travelMin / 60,
    grandTotalManhours: (regMin + otMin + travelMin) / 60,
    totalMealAllowance: meal,
    totalFareExpense:   fare,
    totalHotelOthers:   hotel,
    grandTotalExpense:  meal + fare + hotel,
    totalDistanceTravelKm: dist,
  };
}
```

(Inline `computePdfSummary` instead of importing `computeSummary` from the store to keep the API route free of browser-only Zustand imports.)

- [ ] **Step 5: Smoke test the PDF**

In the dev environment, navigate to the form list, export a PDF for a new record (created in Task 4) and an old record. Open both PDFs and verify:
- New record: shows photo-style layout with expense rows, summary tiles, three signatories
- Old record: shows the original layout unchanged

- [ ] **Step 6: Commit**

```bash
git add src/app/api/pdf/daily-time-sheet/[id]/route.ts
git commit -m "feat(dts): PDF renders new layout for new records, legacy layout fallback for old"
```

---

## Task 9: Type-check, full test sweep, end-to-end smoke

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any references to removed store fields.

- [ ] **Step 2: Full Jest suite**

```bash
npx jest
```

Expected: all tests pass. The new store tests should pass; legacy DTS tests should have been updated in Task 2 Step 7.

- [ ] **Step 3: End-to-end happy path in the dev server**

```bash
npm run dev
```

Walk the full flow:
1. Fill in the form to match the May 17, 2026 example from the photo
2. Verify Summary shows: 2h OT, 8h regular, 3h travel, 13h grand total; ₱100 meal, ₱5,000 hotel, ₱5,100 grand expense, 1,000km
3. Submit
4. Open the View screen — verify the new layout shows the same data
5. Export PDF — verify layout matches the photo
6. Open Edit — verify all fields hydrate, modify one expense, save, verify changes persisted
7. Open an old (pre-migration) record — verify it still displays via legacy fallback
8. Take screenshots of the form, view, and PDF for the PR description

- [ ] **Step 4: Final commit (any cleanup) and push**

```bash
git status   # confirm clean
git push     # only if branch is already pushed and PR exists
```

(Do NOT push without user approval if no PR exists yet.)
