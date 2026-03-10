-- Add utilization fields to daily_time_sheet
ALTER TABLE public.daily_time_sheet
  ADD COLUMN IF NOT EXISTS available_manhour NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS leave_hours NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_average_utilization NUMERIC(10, 2) DEFAULT NULL;
