-- Add signatory user IDs and approval checkbox columns to all 13 service report tables

ALTER TABLE deutz_commissioning_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE deutz_service_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE submersible_pump_service_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE submersible_pump_commissioning_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE submersible_pump_teardown_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE engine_surface_pump_service_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE engine_surface_pump_commissioning_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE electric_surface_pump_service_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE electric_surface_pump_commissioning_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE electric_surface_pump_teardown_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE engine_inspection_receiving_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE engine_teardown_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;

ALTER TABLE components_teardown_measuring_report
  ADD COLUMN IF NOT EXISTS noted_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS noted_by_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by_checked BOOLEAN DEFAULT FALSE;
