-- Simplify service report approvals: replace level-based workflow with direct status dropdown
-- Status options: 'Pending', 'In-Progress', 'Close', 'Cancelled'

-- 1. Drop the old status check constraint
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_status_check;

-- 2. Migrate existing status values to new format (catch all possible values)
UPDATE approvals SET status = 'Pending' WHERE LOWER(status) = 'pending';
UPDATE approvals SET status = 'In-Progress' WHERE LOWER(status) = 'in-progress';
UPDATE approvals SET status = 'Close' WHERE LOWER(status) IN ('completed', 'closed', 'close');
UPDATE approvals SET status = 'Cancelled' WHERE LOWER(status) IN ('cancelled', 'canceled', 'rejected');

-- Catch any remaining unmapped values → default to Pending
UPDATE approvals SET status = 'Pending' WHERE status NOT IN ('Pending', 'In-Progress', 'Close', 'Cancelled');

-- 3. Add new check constraint with simplified status values
ALTER TABLE approvals ADD CONSTRAINT approvals_status_check
  CHECK (status IN ('Pending', 'In-Progress', 'Close', 'Cancelled'));

-- 4. Update the column default to match new format
ALTER TABLE approvals ALTER COLUMN status SET DEFAULT 'Pending';

-- 5. Drop the trigger that auto-computes status from level1/level2 (if it exists)
DROP TRIGGER IF EXISTS update_approval_status_trigger ON approvals;
DROP FUNCTION IF EXISTS update_approval_status();

-- 6. Add approvals permission module (edit action for changing service report statuses)
INSERT INTO public.permissions (module, action, description)
VALUES ('approvals', 'edit', 'Change service report approval statuses')
ON CONFLICT (module, action) DO NOTHING;
