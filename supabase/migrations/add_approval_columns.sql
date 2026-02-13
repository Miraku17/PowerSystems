-- Remove old duplicate approval columns and their indexes/constraints
ALTER TABLE job_order_request_form
  DROP CONSTRAINT IF EXISTS job_order_request_form_level_1_approver_id_fkey,
  DROP CONSTRAINT IF EXISTS job_order_request_form_level_2_approver_id_fkey;

DROP INDEX IF EXISTS idx_job_order_request_l1_approver;
DROP INDEX IF EXISTS idx_job_order_request_l2_approver;
DROP INDEX IF EXISTS idx_job_order_request_l1_status;
DROP INDEX IF EXISTS idx_job_order_request_l2_status;

ALTER TABLE job_order_request_form
  DROP COLUMN IF EXISTS level_1_approver_id,
  DROP COLUMN IF EXISTS level_1_approval_status,
  DROP COLUMN IF EXISTS level_1_approval_date,
  DROP COLUMN IF EXISTS level_1_approval_remarks,
  DROP COLUMN IF EXISTS level_2_approver_id,
  DROP COLUMN IF EXISTS level_2_approval_status,
  DROP COLUMN IF EXISTS level_2_approval_date,
  DROP COLUMN IF EXISTS level_2_approval_remarks;
