-- Remove level-based approval columns from approvals table
-- =========================================================

-- 1. Drop dependent RLS policies
DROP POLICY IF EXISTS "Admin2 can do level1 approval" ON public.approvals;
DROP POLICY IF EXISTS "Admin1 can do level2 approval" ON public.approvals;

-- 2. Drop dependent views
DROP VIEW IF EXISTS pending_level1_approvals;
DROP VIEW IF EXISTS pending_level2_approvals;

-- 3. Drop the level status check constraints
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_level1_status_check;
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_level2_status_check;

-- 4. Drop the level foreign key constraints
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_level1_approved_by_fkey;
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_level2_approved_by_fkey;

-- 5. Drop the level indexes
DROP INDEX IF EXISTS idx_approvals_level1_status;
DROP INDEX IF EXISTS idx_approvals_level2_status;

-- 6. Drop the level columns
ALTER TABLE public.approvals
  DROP COLUMN IF EXISTS level1_status,
  DROP COLUMN IF EXISTS level1_approved_by,
  DROP COLUMN IF EXISTS level1_approved_at,
  DROP COLUMN IF EXISTS level1_remarks,
  DROP COLUMN IF EXISTS level2_status,
  DROP COLUMN IF EXISTS level2_approved_by,
  DROP COLUMN IF EXISTS level2_approved_at,
  DROP COLUMN IF EXISTS level2_remarks;

-- 7. Drop the old approval status trigger (no longer needed for level-based logic)
DROP TRIGGER IF EXISTS approval_status_trigger ON public.approvals;
DROP FUNCTION IF EXISTS handle_approval_status();
