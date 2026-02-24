-- Add Travel Time fields to daily_time_sheet_entries
ALTER TABLE daily_time_sheet_entries
  ADD COLUMN IF NOT EXISTS travel_time_from TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_time_to TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_time_depart TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS travel_time_arrived TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS travel_time_hours DECIMAL(10, 2) DEFAULT 0;

-- Add Travel Distance fields to daily_time_sheet_entries
ALTER TABLE daily_time_sheet_entries
  ADD COLUMN IF NOT EXISTS travel_distance_from TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_distance_to TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS travel_departure_odo DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_arrival_odo DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_distance_km DECIMAL(10, 2) DEFAULT 0;

-- NOTE: The existing travel_hours column is intentionally kept for backward compatibility.
