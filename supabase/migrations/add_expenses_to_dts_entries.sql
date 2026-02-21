-- Add expense columns to daily_time_sheet_entries (per row)
ALTER TABLE daily_time_sheet_entries
  ADD COLUMN expense_breakfast DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_lunch DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_dinner DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_transport DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_lodging DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_others DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_total DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN expense_remarks TEXT DEFAULT '';

COMMENT ON COLUMN daily_time_sheet_entries.expense_breakfast IS 'Breakfast expense for this entry';
COMMENT ON COLUMN daily_time_sheet_entries.expense_lunch IS 'Lunch expense for this entry';
COMMENT ON COLUMN daily_time_sheet_entries.expense_dinner IS 'Dinner expense for this entry';
COMMENT ON COLUMN daily_time_sheet_entries.expense_transport IS 'Transportation expense for this entry';
COMMENT ON COLUMN daily_time_sheet_entries.expense_lodging IS 'Lodging expense for this entry';
COMMENT ON COLUMN daily_time_sheet_entries.expense_others IS 'Other expenses for this entry';
COMMENT ON COLUMN daily_time_sheet_entries.expense_total IS 'Total expense for this entry (sum of all expense fields)';
COMMENT ON COLUMN daily_time_sheet_entries.expense_remarks IS 'Remarks for expenses on this entry';
