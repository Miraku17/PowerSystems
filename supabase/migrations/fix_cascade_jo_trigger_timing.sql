-- ============================================================
-- Fix: Make FK constraints DEFERRABLE INITIALLY DEFERRED and
-- revert trigger to AFTER UPDATE.
--
-- Problem: With non-deferrable FKs, neither BEFORE nor AFTER
-- triggers work — AFTER fails because child rows still reference
-- the old parent value; BEFORE fails because the new parent value
-- doesn't exist yet. DEFERRABLE INITIALLY DEFERRED postpones FK
-- checks to transaction commit, after both the parent update and
-- the cascade trigger have completed.
-- ============================================================

-- 1. Drop existing FK constraints
ALTER TABLE submersible_pump_service_report DROP CONSTRAINT IF EXISTS fk_sub_pump_svc_jo;
ALTER TABLE submersible_pump_commissioning_report DROP CONSTRAINT IF EXISTS fk_sub_pump_comm_jo;
ALTER TABLE submersible_pump_teardown_report DROP CONSTRAINT IF EXISTS fk_sub_pump_tear_jo;
ALTER TABLE engine_surface_pump_service_report DROP CONSTRAINT IF EXISTS fk_eng_pump_svc_jo;
ALTER TABLE engine_surface_pump_commissioning_report DROP CONSTRAINT IF EXISTS fk_eng_pump_comm_jo;
ALTER TABLE engine_teardown_reports DROP CONSTRAINT IF EXISTS fk_eng_tear_jo;
ALTER TABLE engine_inspection_receiving_report DROP CONSTRAINT IF EXISTS fk_eng_insp_jo;
ALTER TABLE electric_surface_pump_service_report DROP CONSTRAINT IF EXISTS fk_elec_pump_svc_jo;
ALTER TABLE electric_surface_pump_commissioning_report DROP CONSTRAINT IF EXISTS fk_elec_pump_comm_jo;
ALTER TABLE electric_surface_pump_teardown_report DROP CONSTRAINT IF EXISTS fk_elec_pump_tear_jo;
ALTER TABLE components_teardown_measuring_report DROP CONSTRAINT IF EXISTS fk_comp_tear_jo;
ALTER TABLE deutz_service_report DROP CONSTRAINT IF EXISTS fk_deutz_svc_jo;
ALTER TABLE deutz_commissioning_report DROP CONSTRAINT IF EXISTS fk_deutz_comm_jo;
ALTER TABLE daily_time_sheet DROP CONSTRAINT IF EXISTS fk_dts_jo;

-- 2. Re-add FK constraints as DEFERRABLE INITIALLY DEFERRED NOT VALID
ALTER TABLE submersible_pump_service_report
  ADD CONSTRAINT fk_sub_pump_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE submersible_pump_commissioning_report
  ADD CONSTRAINT fk_sub_pump_comm_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE submersible_pump_teardown_report
  ADD CONSTRAINT fk_sub_pump_tear_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE engine_surface_pump_service_report
  ADD CONSTRAINT fk_eng_pump_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE engine_surface_pump_commissioning_report
  ADD CONSTRAINT fk_eng_pump_comm_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE engine_teardown_reports
  ADD CONSTRAINT fk_eng_tear_jo
  FOREIGN KEY (job_number) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE engine_inspection_receiving_report
  ADD CONSTRAINT fk_eng_insp_jo
  FOREIGN KEY (jo_number) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE electric_surface_pump_service_report
  ADD CONSTRAINT fk_elec_pump_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE electric_surface_pump_commissioning_report
  ADD CONSTRAINT fk_elec_pump_comm_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE electric_surface_pump_teardown_report
  ADD CONSTRAINT fk_elec_pump_tear_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE components_teardown_measuring_report
  ADD CONSTRAINT fk_comp_tear_jo
  FOREIGN KEY (job_order_no) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE deutz_service_report
  ADD CONSTRAINT fk_deutz_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE deutz_commissioning_report
  ADD CONSTRAINT fk_deutz_comm_jo
  FOREIGN KEY (job_order_no) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

ALTER TABLE daily_time_sheet
  ADD CONSTRAINT fk_dts_jo
  FOREIGN KEY (job_number) REFERENCES job_order_request_form(shop_field_jo_number)
  DEFERRABLE INITIALLY DEFERRED NOT VALID;

-- 3. Revert trigger to AFTER UPDATE (cleaner now that FK checks are deferred)
DROP TRIGGER IF EXISTS trigger_cascade_jo_number_update ON job_order_request_form;

CREATE TRIGGER trigger_cascade_jo_number_update
  AFTER UPDATE ON job_order_request_form
  FOR EACH ROW
  EXECUTE FUNCTION cascade_jo_number_update();
