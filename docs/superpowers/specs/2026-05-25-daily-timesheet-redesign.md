# Daily Time Sheet Redesign

**Date:** 2026-05-25  
**Scope:** Full redesign — DB schema + API + Zustand store + Form/View/Edit UI + PDF export  
**Reference:** Photo of target layout (manhours | expenses | job description table + summary block)

---

## Goal

Re-create the Daily Time Sheet form to match the photo layout:
- Manhour rows gain **Initial Location** and **Final Location** columns
- Expenses become a **typed, variable-count list** per time entry (Breakfast, Lunch, Dinner, Car ODO, Hotel & Others) instead of fixed flat fields
- Car ODO expenses capture **Departure ODO** and **Arrival ODO** instead of a flat amount
- Summary is **locked/auto-calculated** from expense items and time entries
- Signatories simplified to **three**: Prepared By, Checked By (Admin 2), Approved By (Admin 1 / SuperAdmin)
- Exported PDF matches the photo layout

---

## Database Schema

### New table: `daily_time_sheet_expense_items`

```sql
CREATE TABLE daily_time_sheet_expense_items (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_time_sheet_entry_id   uuid NOT NULL REFERENCES daily_time_sheet_entries(id) ON DELETE CASCADE,
  type                        text NOT NULL CHECK (type IN ('breakfast','lunch','dinner','car_odo','hotel_others')),
  amount                      numeric(10,2),
  job_description             text,
  departure_odo               numeric,   -- car_odo only
  arrival_odo                 numeric,   -- car_odo only
  sort_order                  int NOT NULL DEFAULT 0,
  created_at                  timestamptz DEFAULT now()
);
```

### Alter `daily_time_sheet_entries`

```sql
ALTER TABLE daily_time_sheet_entries
  ADD COLUMN IF NOT EXISTS initial_location text,
  ADD COLUMN IF NOT EXISTS final_location   text,
  ADD COLUMN IF NOT EXISTS is_travel        boolean NOT NULL DEFAULT false;
```

The existing `expense_*`, `travel_time_*`, and `travel_distance_*` columns remain **nullable and untouched**. New records leave them null and use `daily_time_sheet_expense_items` instead. The view/PDF components use the presence of expense_items rows to detect old vs. new records.

### `daily_time_sheet` signatory columns

No new columns needed. The three signatories map to existing columns:
- **Prepared By** → `performed_by_name` / `performed_by_signature`
- **Checked By** → `checked_by` / `checked_by_signature`
- **Approved By** → `approved_by_service` / `approved_by_service_signature`

`service_coordinator_*` and `service_manager_*` columns remain in the DB but are unused by the new form.

---

## Zustand Store (`dailyTimeSheetFormStore.ts`)

### New types

```ts
export type ExpenseItemType = 'breakfast' | 'lunch' | 'dinner' | 'car_odo' | 'hotel_others'

export interface ExpenseItem {
  id:              string   // client-side UUID only
  type:            ExpenseItemType
  amount:          string
  job_description: string
  departure_odo:   string   // car_odo only
  arrival_odo:     string   // car_odo only
  sort_order:      number
}
```

### Updated `TimeSheetEntry`

Remove all `expense_*`, `travel_time_*`, `travel_distance_*` fields. Add:
```ts
initial_location: string
final_location:   string
is_travel:        boolean   // drives Total Travel Hours in Summary
expense_items:    ExpenseItem[]
```

### Updated `DailyTimeSheetFormData`

Remove: `total_srt`, `actual_manhour`, `performance`, `total_service_manhours`, `available_manhour`, `leave_hours`, `daily_average_utilization`, `service_coordinator`, `service_coordinator_signature`, `service_manager`, `service_manager_signature`.

Summary totals are derived client-side via selectors; they are not stored in form state.

Keep: `performed_by_name/signature`, `checked_by/signature`, `approved_by_service/approved_by_service_signature`.

### Store actions — additions

- `addExpenseItem(entryId, type)` — appends a new ExpenseItem to the entry
- `updateExpenseItem(entryId, itemId, data)` — partial update
- `removeExpenseItem(entryId, itemId)` — removes the item

### Store version

Bump to `6`. Migration zeroes removed fields and sets `expense_items: []` on every entry.

---

## Auto-Calculation (client-side)

All computed values are derived from store state; none are stored as form fields.

| Summary Field | Derivation |
|---|---|
| Total Regular Hours | Sum of overlap between [start, stop] and [08:00–17:00] per entry |
| Total Overtime | Total worked − Regular hours |
| Total Travel Hours | Sum of Total Time for entries where the **Travel toggle** is checked |
| Grand Total Manhours | Regular + Overtime |
| Total Meal Allowance | Sum of amount where type ∈ {breakfast, lunch, dinner} |
| Total Fare Expense | Sum of amount where type = car_odo (or arrival_odo − departure_odo × rate if no amount) |
| Total Hotel & Others | Sum of amount where type = hotel_others |
| Grand Total Expense | All expense amounts summed |
| Total Distance Travel | Sum of (arrival_odo − departure_odo) across all car_odo items |

All summary fields are **read-only** in the UI.

---

## Form UI (`DailyTimeSheetForm.tsx`)

### Basic Information (unchanged)
Job No. (required), Date, Customer (auto-filled from JO, locked), Address.

### Manhours & Expenses Table

Single unified table. Per date group:

**Date header row** (full-width, green background): date value + trash to remove entire date group.

**Time entry row** columns:
1. Start Time
2. Initial Location
3. Stop Time
4. Final Location
5. Total Time (read-only, auto-calculated)
6. Travel toggle (checkbox — marks the entry as a travel entry; drives Total Travel Hours in Summary)
7. Delete button

**Expense sub-rows** (indented under their parent time entry):
- Expense Type dropdown: Breakfast / Lunch / Dinner / Car ODO / Hotel & Others
- Amount field (hidden for Car ODO — distance drives the display)
- Departure ODO + Arrival ODO fields (Car ODO only)
- Job Description
- Delete expense button

**Add buttons** at the bottom of the table (matching photo colors):
- 🟠 Orange — "Add Expense" (adds to the last time entry)
- 🟣 Purple — "Add New Time" (adds time row to the last date group)
- 🟢 Green — "Add New Date" (adds a new date group)

### Summary Section (locked)

Two rows of read-only tiles:
- Row 1: Total Overtime | Total Regular Hours | Total Travel Hours | Grand Total Manhours
- Row 2: Total Meal Allowance | Total Fare Expense | Total Hotel & Others Expense | Grand Total Expense | Total Distance Travel

### Signatories

| Signatory | Role restriction |
|---|---|
| Prepared By | Auto-filled from logged-in user; locked for non-admins |
| Checked By | Editable only by Admin 2 |
| Approved By | Editable only by Admin 1 or SuperAdmin |

---

## API Changes

### POST `/api/forms/daily-time-sheet`

Submission payload includes entries with `initial_location`, `final_location`, and an `expense_items` JSON array per entry. Route:
1. Inserts the main `daily_time_sheet` record (three signatory fields only)
2. Inserts each entry into `daily_time_sheet_entries` (with new location columns; old expense/travel columns left null)
3. Inserts each entry's `expense_items` into `daily_time_sheet_expense_items`

### GET `/api/forms/daily-time-sheet/[id]`

Extends the Supabase query to join `daily_time_sheet_expense_items` via the entries relationship:
```ts
.select("*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))")
```

### PATCH `/api/forms/daily-time-sheet/[id]`

Same structure as POST. Deletes existing expense_items for affected entries before re-inserting (upsert-by-replace pattern).

---

## Edit Component (`EditDailyTimeSheet.tsx`)

Same UI as the form, pre-seeded from fetched data. Hydrates `expense_items` from `daily_time_sheet_expense_items` rows. Strips all logic for old flat expense/travel fields.

---

## View Component (`ViewDailyTimeSheet.tsx`)

Renders the photo layout: two-column table (manhours | expenses + job description), then Summary block, then three-signatory footer.

**Legacy fallback:** If a record has zero `daily_time_sheet_expense_items` rows, render the old flat expense columns in a simplified read-only table so existing records display correctly.

---

## PDF Export (`/api/pdf/daily-time-sheet/[id]`)

Redraws the jsPDF output to match the photo:
- Two-column table: left = manhour columns (Date, Start, Initial Location, Stop, Final Location, Total), right = expense rows + job description
- Summary block beneath the table (all nine summary fields)
- Three-signatory footer: Prepared By | Checked By | Approved By

**Legacy fallback:** Same condition as view — zero expense_items rows → render old layout.

---

## Out of Scope

- No changes to leave-check logic, JO autocomplete, attachments section, or offline submission hook
- No migration of existing expense data into the new table (old records display via legacy fallback)
- No changes to the `approve-svc-manager` or `status` sub-routes
