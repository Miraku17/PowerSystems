-- Add updated_by column to approvals table
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS updated_by uuid NULL REFERENCES users(id);
