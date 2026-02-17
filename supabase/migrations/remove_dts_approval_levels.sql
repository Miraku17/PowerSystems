-- Remove approval level columns from daily_time_sheet
ALTER TABLE daily_time_sheet
  DROP COLUMN IF EXISTS level_1_approved_by,
  DROP COLUMN IF EXISTS level_1_approved_at,
  DROP COLUMN IF EXISTS level_1_notes,
  DROP COLUMN IF EXISTS level_2_approved_by,
  DROP COLUMN IF EXISTS level_2_approved_at,
  DROP COLUMN IF EXISTS level_2_notes,
  DROP COLUMN IF EXISTS approval_status;

-- Migrate existing status values to new format
UPDATE daily_time_sheet SET status = 'Pending' WHERE status = 'PENDING' OR status IS NULL;
UPDATE daily_time_sheet SET status = 'In-Progress' WHERE status = 'IN_PROGRESS';
UPDATE daily_time_sheet SET status = 'Close' WHERE status IN ('COMPLETED', 'CLOSED');
UPDATE daily_time_sheet SET status = 'Cancelled' WHERE status = 'CANCELLED';

-- Set default for new records
ALTER TABLE daily_time_sheet ALTER COLUMN status SET DEFAULT 'Pending';
