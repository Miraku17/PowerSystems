-- Add total_service_manhours column to daily_time_sheet (for "Total ManHours" in Service Office section)
ALTER TABLE daily_time_sheet ADD COLUMN IF NOT EXISTS total_service_manhours numeric;
