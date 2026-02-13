-- ============================================
-- MIGRATION: Add 'closed' status to approvals
-- Admin 2 can close a service form after both
-- levels are approved and work is completed.
-- ============================================

-- 1. Update the status constraint to include 'closed'
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
ALTER TABLE public.approvals ADD CONSTRAINT approvals_status_check
  CHECK (status IN ('pending', 'in-progress', 'completed', 'closed'));

-- 2. Update the trigger function to preserve 'closed' status
CREATE OR REPLACE FUNCTION public.handle_approval_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();

  -- Preserve completed/closed status (only set via explicit user actions)
  IF NEW.status IN ('completed', 'closed') THEN
    -- still update approved_at timestamps if levels changed
    IF NEW.level1_status != OLD.level1_status AND NEW.level1_status = 'completed' THEN
      NEW.level1_approved_at = now();
    END IF;
    IF NEW.level2_status != OLD.level2_status AND NEW.level2_status = 'completed' THEN
      NEW.level2_approved_at = now();
    END IF;
    RETURN NEW;
  END IF;

  -- Both levels approved = in-progress (user will manually complete later)
  IF NEW.level1_status = 'completed' AND NEW.level2_status = 'completed' THEN
    NEW.status = 'in-progress';
  -- Any level started = overall in-progress
  ELSIF NEW.level1_status = 'in-progress' OR NEW.level1_status = 'completed'
     OR NEW.level2_status = 'in-progress' THEN
    NEW.status = 'in-progress';
  ELSE
    NEW.status = 'pending';
  END IF;

  IF NEW.level1_status != OLD.level1_status AND NEW.level1_status = 'completed' THEN
    NEW.level1_approved_at = now();
  END IF;

  IF NEW.level2_status != OLD.level2_status AND NEW.level2_status = 'completed' THEN
    NEW.level2_approved_at = now();
  END IF;

  RETURN NEW;
END;
$$;
