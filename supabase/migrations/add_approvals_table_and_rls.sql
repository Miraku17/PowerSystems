-- ============================================
-- MIGRATION: Centralized Approvals Table
-- Two-level approval workflow for all forms
-- Level 1: Admin2 (within branch)
-- Level 2: Admin1 (final approval)
-- ============================================

-- ============================================
-- 1. CREATE APPROVALS TABLE
-- ============================================

CREATE TABLE public.approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_table text NOT NULL,           -- e.g. 'deutz_commissioning_report', 'job_order_request_form'
  report_id text NOT NULL,              -- ID of the record being approved
  status text NOT NULL DEFAULT 'pending',

  -- Level 1: Admin2 (within same branch)
  level1_status text NOT NULL DEFAULT 'pending',
  level1_approved_by uuid NULL,
  level1_approved_at timestamptz NULL,
  level1_remarks text NULL,

  -- Level 2: Admin1 (final approval)
  level2_status text NOT NULL DEFAULT 'pending',
  level2_approved_by uuid NULL,
  level2_approved_at timestamptz NULL,
  level2_remarks text NULL,

  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT approvals_pkey PRIMARY KEY (id),
  CONSTRAINT approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES users (id),
  CONSTRAINT approvals_level1_approved_by_fkey FOREIGN KEY (level1_approved_by) REFERENCES users (id),
  CONSTRAINT approvals_level2_approved_by_fkey FOREIGN KEY (level2_approved_by) REFERENCES users (id),
  CONSTRAINT approvals_status_check CHECK (status IN ('pending', 'in-progress', 'completed')),
  CONSTRAINT approvals_level1_status_check CHECK (level1_status IN ('pending', 'in-progress', 'completed')),
  CONSTRAINT approvals_level2_status_check CHECK (level2_status IN ('pending', 'in-progress', 'completed'))
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX idx_approvals_report ON public.approvals (report_table, report_id);
CREATE INDEX idx_approvals_status ON public.approvals (status);
CREATE INDEX idx_approvals_requested_by ON public.approvals (requested_by);
CREATE INDEX idx_approvals_level1_status ON public.approvals (level1_status);
CREATE INDEX idx_approvals_level2_status ON public.approvals (level2_status);

-- ============================================
-- 2. ENABLE RLS & POLICIES
-- ============================================

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Users can view approvals they requested or if they are approvers
CREATE POLICY "Users can view relevant approvals"
  ON public.approvals FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'admin1', 'admin2')
    )
  );

-- Users can submit approval requests
CREATE POLICY "Users can request approval"
  ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Admin2 can do Level 1 approval
CREATE POLICY "Admin2 can do level1 approval"
  ON public.approvals FOR UPDATE TO authenticated
  USING (
    level1_status IN ('pending', 'in-progress')
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin2', 'admin')
    )
  )
  WITH CHECK (
    level1_approved_by = auth.uid()
  );

-- Admin1 can do Level 2 approval (only after Level 1 is approved)
CREATE POLICY "Admin1 can do level2 approval"
  ON public.approvals FOR UPDATE TO authenticated
  USING (
    level1_status = 'completed'
    AND level2_status IN ('pending', 'in-progress')
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin1', 'admin')
    )
  )
  WITH CHECK (
    level2_approved_by = auth.uid()
  );

-- ============================================
-- 3. TRIGGER: Auto-update overall status
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_approval_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();

  -- Both levels completed = overall completed
  IF NEW.level1_status = 'completed' AND NEW.level2_status = 'completed' THEN
    NEW.status = 'completed';
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

CREATE TRIGGER approval_status_trigger
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approval_status();

-- ============================================
-- 4. HELPER: Get approval status for a report
-- ============================================

CREATE OR REPLACE FUNCTION public.get_report_with_approval(
  p_report_table text,
  p_report_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'approval_id', a.id,
    'status', a.status,
    'level1_status', a.level1_status,
    'level1_approved_by', a.level1_approved_by,
    'level1_approved_at', a.level1_approved_at,
    'level1_remarks', a.level1_remarks,
    'level2_status', a.level2_status,
    'level2_approved_by', a.level2_approved_by,
    'level2_approved_at', a.level2_approved_at,
    'level2_remarks', a.level2_remarks
  ) INTO result
  FROM public.approvals a
  WHERE a.report_table = p_report_table
    AND a.report_id = p_report_id
  ORDER BY a.created_at DESC
  LIMIT 1;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- ============================================
-- 5. VIEWS: Pending approvals per level
-- ============================================

CREATE OR REPLACE VIEW public.pending_level1_approvals AS
SELECT a.*
FROM public.approvals a
WHERE a.level1_status IN ('pending', 'in-progress')
  AND a.status IN ('pending', 'in-progress');

CREATE OR REPLACE VIEW public.pending_level2_approvals AS
SELECT a.*
FROM public.approvals a
WHERE a.level1_status = 'completed'
  AND a.level2_status IN ('pending', 'in-progress')
  AND a.status = 'in-progress';
