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
