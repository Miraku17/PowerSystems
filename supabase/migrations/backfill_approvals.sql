-- Backfill approvals for existing service report records that don't have one yet
-- This ensures all records show the status dropdown in the UI

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'deutz_commissioning_report', CAST(r.id AS text), 'Pending', r.created_by
FROM deutz_commissioning_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'deutz_commissioning_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'deutz_service_report', CAST(r.id AS text), 'Pending', r.created_by
FROM deutz_service_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'deutz_service_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'submersible_pump_service_report', CAST(r.id AS text), 'Pending', r.created_by
FROM submersible_pump_service_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'submersible_pump_service_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'submersible_pump_commissioning_report', CAST(r.id AS text), 'Pending', r.created_by
FROM submersible_pump_commissioning_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'submersible_pump_commissioning_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'submersible_pump_teardown_report', CAST(r.id AS text), 'Pending', r.created_by
FROM submersible_pump_teardown_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'submersible_pump_teardown_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'engine_surface_pump_service_report', CAST(r.id AS text), 'Pending', r.created_by
FROM engine_surface_pump_service_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'engine_surface_pump_service_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'engine_surface_pump_commissioning_report', CAST(r.id AS text), 'Pending', r.created_by
FROM engine_surface_pump_commissioning_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'engine_surface_pump_commissioning_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'electric_surface_pump_service_report', CAST(r.id AS text), 'Pending', r.created_by
FROM electric_surface_pump_service_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'electric_surface_pump_service_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'electric_surface_pump_commissioning_report', CAST(r.id AS text), 'Pending', r.created_by
FROM electric_surface_pump_commissioning_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'electric_surface_pump_commissioning_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'electric_surface_pump_teardown_report', CAST(r.id AS text), 'Pending', r.created_by
FROM electric_surface_pump_teardown_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'electric_surface_pump_teardown_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'engine_inspection_receiving_report', CAST(r.id AS text), 'Pending', r.created_by
FROM engine_inspection_receiving_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'engine_inspection_receiving_report' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'engine_teardown_reports', CAST(r.id AS text), 'Pending', r.created_by
FROM engine_teardown_reports r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'engine_teardown_reports' AND a.report_id = CAST(r.id AS text)
);

INSERT INTO approvals (report_table, report_id, status, requested_by)
SELECT 'components_teardown_measuring_report', CAST(r.id AS text), 'Pending', r.created_by
FROM components_teardown_measuring_report r
WHERE NOT EXISTS (
  SELECT 1 FROM approvals a WHERE a.report_table = 'components_teardown_measuring_report' AND a.report_id = CAST(r.id AS text)
);
