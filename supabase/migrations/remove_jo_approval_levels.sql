-- Remove 3-level approval columns from job_order_request_form
ALTER TABLE job_order_request_form
  DROP COLUMN IF EXISTS level_1_approved_by,
  DROP COLUMN IF EXISTS level_1_approved_at,
  DROP COLUMN IF EXISTS level_1_notes,
  DROP COLUMN IF EXISTS level_2_approved_by,
  DROP COLUMN IF EXISTS level_2_approved_at,
  DROP COLUMN IF EXISTS level_2_notes,
  DROP COLUMN IF EXISTS level_3_approved_by,
  DROP COLUMN IF EXISTS level_3_approved_at,
  DROP COLUMN IF EXISTS level_3_notes,
  DROP COLUMN IF EXISTS approval_status;

-- Migrate existing status values to new format
UPDATE job_order_request_form SET status = 'Pending' WHERE status = 'PENDING';
UPDATE job_order_request_form SET status = 'In-Progress' WHERE status = 'IN_PROGRESS';
UPDATE job_order_request_form SET status = 'Close' WHERE status IN ('COMPLETED', 'CLOSED');
UPDATE job_order_request_form SET status = 'Cancelled' WHERE status = 'CANCELLED';

-- Set default for new records
ALTER TABLE job_order_request_form ALTER COLUMN status SET DEFAULT 'Pending';
