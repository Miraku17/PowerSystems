-- ============================================================
-- Migration: Add FK references for shop_field_jo_number
-- and Super Admin permission to edit job order number
-- ============================================================
-- NOTE: FK constraints use NOT VALID so legacy manual job order
-- values are preserved. New inserts/updates will be enforced.
-- We also add a trigger for cascade updates since NOT VALID
-- FKs don't support ON UPDATE CASCADE.
-- ============================================================

-- 1. Add UNIQUE constraint on shop_field_jo_number
ALTER TABLE job_order_request_form
  ADD CONSTRAINT uq_shop_field_jo_number UNIQUE (shop_field_jo_number);

-- ============================================================
-- 2. Add FK constraints with NOT VALID (skips existing data check)
-- ============================================================

ALTER TABLE submersible_pump_service_report
  ADD CONSTRAINT fk_sub_pump_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE submersible_pump_commissioning_report
  ADD CONSTRAINT fk_sub_pump_comm_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE submersible_pump_teardown_report
  ADD CONSTRAINT fk_sub_pump_tear_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE engine_surface_pump_service_report
  ADD CONSTRAINT fk_eng_pump_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE engine_surface_pump_commissioning_report
  ADD CONSTRAINT fk_eng_pump_comm_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE engine_teardown_reports
  ADD CONSTRAINT fk_eng_tear_jo
  FOREIGN KEY (job_number) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE engine_inspection_receiving_report
  ADD CONSTRAINT fk_eng_insp_jo
  FOREIGN KEY (jo_number) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE electric_surface_pump_service_report
  ADD CONSTRAINT fk_elec_pump_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE electric_surface_pump_commissioning_report
  ADD CONSTRAINT fk_elec_pump_comm_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE electric_surface_pump_teardown_report
  ADD CONSTRAINT fk_elec_pump_tear_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE components_teardown_measuring_report
  ADD CONSTRAINT fk_comp_tear_jo
  FOREIGN KEY (job_order_no) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE deutz_service_report
  ADD CONSTRAINT fk_deutz_svc_jo
  FOREIGN KEY (job_order) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE deutz_commissioning_report
  ADD CONSTRAINT fk_deutz_comm_jo
  FOREIGN KEY (job_order_no) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

ALTER TABLE daily_time_sheet
  ADD CONSTRAINT fk_dts_jo
  FOREIGN KEY (job_number) REFERENCES job_order_request_form(shop_field_jo_number)
  NOT VALID;

-- ============================================================
-- 3. Trigger for cascade updates (NOT VALID FKs don't support
--    ON UPDATE CASCADE, so we handle it with a trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION cascade_jo_number_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.shop_field_jo_number IS DISTINCT FROM NEW.shop_field_jo_number THEN
    UPDATE submersible_pump_service_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE submersible_pump_commissioning_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE submersible_pump_teardown_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE engine_surface_pump_service_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE engine_surface_pump_commissioning_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE engine_teardown_reports SET job_number = NEW.shop_field_jo_number WHERE job_number = OLD.shop_field_jo_number;
    UPDATE engine_inspection_receiving_report SET jo_number = NEW.shop_field_jo_number WHERE jo_number = OLD.shop_field_jo_number;
    UPDATE electric_surface_pump_service_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE electric_surface_pump_commissioning_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE electric_surface_pump_teardown_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE components_teardown_measuring_report SET job_order_no = NEW.shop_field_jo_number WHERE job_order_no = OLD.shop_field_jo_number;
    UPDATE deutz_service_report SET job_order = NEW.shop_field_jo_number WHERE job_order = OLD.shop_field_jo_number;
    UPDATE deutz_commissioning_report SET job_order_no = NEW.shop_field_jo_number WHERE job_order_no = OLD.shop_field_jo_number;
    UPDATE daily_time_sheet SET job_number = NEW.shop_field_jo_number WHERE job_number = OLD.shop_field_jo_number;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cascade_jo_number_update
  AFTER UPDATE ON job_order_request_form
  FOR EACH ROW
  EXECUTE FUNCTION cascade_jo_number_update();

-- ============================================================
-- 4. Create the permission for editing job order number
-- ============================================================

INSERT INTO permissions (id, module, action, description)
VALUES (
  gen_random_uuid(),
  'job_order_number',
  'edit',
  'Can edit the job order number (shop_field_jo_number) on job order request forms. Changes cascade to all linked service reports.'
)
ON CONFLICT (module, action) DO NOTHING;

-- Grant it to Super Admin (only if not already granted)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'job_order_number'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- ============================================================
-- 5. RPC function to update JO number with permission check
-- ============================================================

CREATE OR REPLACE FUNCTION update_job_order_number(
  _user_id UUID,
  _job_order_request_id UUID,
  _new_jo_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _old_jo_number TEXT;
BEGIN
  -- Check permission
  IF NOT has_permission(_user_id, 'job_order_number', 'edit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: cannot edit job order number');
  END IF;

  -- Get current value
  SELECT shop_field_jo_number INTO _old_jo_number
  FROM job_order_request_form
  WHERE id = _job_order_request_id AND deleted_at IS NULL;

  IF _old_jo_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job order request not found');
  END IF;

  IF _old_jo_number = _new_jo_number THEN
    RETURN jsonb_build_object('success', true, 'message', 'No change needed');
  END IF;

  -- Update the job order request form
  -- The trigger cascade_jo_number_update will automatically propagate
  -- the change to all service report tables that have matching job order values
  UPDATE job_order_request_form
  SET shop_field_jo_number = _new_jo_number,
      updated_by = _user_id,
      updated_at = NOW()
  WHERE id = _job_order_request_id;

  -- Log the change
  INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, created_at)
  VALUES (
    gen_random_uuid(),
    _user_id,
    'UPDATE_JO_NUMBER',
    'job_order_request_form',
    _job_order_request_id::TEXT,
    jsonb_build_object('shop_field_jo_number', _old_jo_number),
    jsonb_build_object('shop_field_jo_number', _new_jo_number),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_jo_number', _old_jo_number,
    'new_jo_number', _new_jo_number,
    'message', 'Job order number updated and cascaded to all linked reports'
  );
END;
$$;
