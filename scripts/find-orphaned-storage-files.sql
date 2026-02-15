-- ============================================================
-- STEP 1: Find orphaned ATTACHMENTS (files in service-reports bucket)
-- These are attachment records whose parent form was soft-deleted
-- ============================================================

-- Query: List all orphaned attachments with their file URLs
SELECT 'deutz_commission' AS form_type, a.id, a.file_url, r.deleted_at
FROM deutz_commission_attachments a
JOIN deutz_commissioning_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'deutz_service', a.id, a.file_url, r.deleted_at
FROM deutz_service_attachments a
JOIN deutz_service_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'sp_commissioning', a.id, a.file_url, r.deleted_at
FROM submersible_pump_commissioning_attachments a
JOIN submersible_pump_commissioning_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'sp_service', a.id, a.file_url, r.deleted_at
FROM submersible_pump_service_attachments a
JOIN submersible_pump_service_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'sp_teardown', a.id, a.file_url, r.deleted_at
FROM submersible_pump_teardown_attachments a
JOIN submersible_pump_teardown_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'esp_commissioning', a.id, a.file_url, r.deleted_at
FROM electric_surface_pump_commissioning_attachments a
JOIN electric_surface_pump_commissioning_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'esp_service', a.id, a.file_url, r.deleted_at
FROM electric_surface_pump_service_attachments a
JOIN electric_surface_pump_service_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'esp_teardown', a.id, a.file_url, r.deleted_at
FROM electric_surface_pump_teardown_attachments a
JOIN electric_surface_pump_teardown_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'engine_sp_commissioning', a.id, a.file_url, r.deleted_at
FROM engine_surface_pump_commissioning_attachments a
JOIN engine_surface_pump_commissioning_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'engine_sp_service', a.id, a.file_url, r.deleted_at
FROM engine_surface_pump_service_attachments a
JOIN engine_surface_pump_service_report r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'daily_time_sheet', a.id, a.file_url, r.deleted_at
FROM daily_time_sheet_attachments a
JOIN daily_time_sheet r ON r.id = a.daily_time_sheet_id
WHERE r.deleted_at IS NOT NULL

UNION ALL

SELECT 'job_order', a.id, a.file_url, r.deleted_at
FROM job_order_attachments a
JOIN job_order_request_form r ON r.id = a.report_id
WHERE r.deleted_at IS NOT NULL

ORDER BY form_type, deleted_at;


-- ============================================================
-- STEP 2: Find orphaned SIGNATURES (files in signatures bucket)
-- These are signature URLs on soft-deleted forms
-- ============================================================

SELECT form_type, id, signature_field, signature_url, deleted_at FROM (

  -- Deutz Commissioning
  SELECT 'deutz_commissioning' AS form_type, id, unnest(ARRAY['attending_technician', 'noted_by', 'approved_by', 'acknowledged_by']) AS signature_field,
    unnest(ARRAY[attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature]) AS signature_url, deleted_at
  FROM deutz_commissioning_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Deutz Service
  SELECT 'deutz_service', id, unnest(ARRAY['attending_technician', 'noted_by', 'approved_by', 'acknowledged_by']),
    unnest(ARRAY[attending_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature]), deleted_at
  FROM deutz_service_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- SP Commissioning
  SELECT 'sp_commissioning', id, unnest(ARRAY['commissioned_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[commissioned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM submersible_pump_commissioning_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- SP Service
  SELECT 'sp_service', id, unnest(ARRAY['performed_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[performed_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM submersible_pump_service_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- SP Teardown
  SELECT 'sp_teardown', id, unnest(ARRAY['teardowned_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[teardowned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM submersible_pump_teardown_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- ESP Commissioning
  SELECT 'esp_commissioning', id, unnest(ARRAY['commissioned_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[commissioned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM electric_surface_pump_commissioning_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- ESP Service
  SELECT 'esp_service', id, unnest(ARRAY['performed_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[performed_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM electric_surface_pump_service_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- ESP Teardown
  SELECT 'esp_teardown', id, unnest(ARRAY['teardowned_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[teardowned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM electric_surface_pump_teardown_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Engine SP Commissioning
  SELECT 'engine_sp_commissioning', id, unnest(ARRAY['commissioned_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[commissioned_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM engine_surface_pump_commissioning_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Engine SP Service
  SELECT 'engine_sp_service', id, unnest(ARRAY['performed_by', 'checked_approved_by', 'noted_by', 'acknowledged_by']),
    unnest(ARRAY[performed_by_signature, checked_approved_by_signature, noted_by_signature, acknowledged_by_signature]), deleted_at
  FROM engine_surface_pump_service_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Daily Time Sheet
  SELECT 'daily_time_sheet', id, unnest(ARRAY['performed_by', 'approved_by']),
    unnest(ARRAY[performed_by_signature, approved_by_signature]), deleted_at
  FROM daily_time_sheet WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Job Order Request
  SELECT 'job_order', id, unnest(ARRAY['requested_by', 'approved_by', 'received_by_service_dept', 'received_by_credit_collection', 'verified_by']),
    unnest(ARRAY[requested_by_signature, approved_by_signature, received_by_service_dept_signature, received_by_credit_collection_signature, verified_by_signature]), deleted_at
  FROM job_order_request_form WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Engine Inspection Receiving
  SELECT 'engine_inspection_receiving', id, unnest(ARRAY['service_technician', 'noted_by', 'approved_by', 'acknowledged_by']),
    unnest(ARRAY[service_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature]), deleted_at
  FROM engine_inspection_receiving_report WHERE deleted_at IS NOT NULL

  UNION ALL

  -- Engine Teardown
  SELECT 'engine_teardown', id, unnest(ARRAY['service_technician', 'noted_by', 'approved_by', 'acknowledged_by']),
    unnest(ARRAY[service_technician_signature, noted_by_signature, approved_by_signature, acknowledged_by_signature]), deleted_at
  FROM engine_teardown_reports WHERE deleted_at IS NOT NULL

) AS all_signatures
WHERE signature_url IS NOT NULL
ORDER BY form_type, deleted_at;


-- ============================================================
-- STEP 3: COUNTS summary - how many orphaned files per form
-- ============================================================

SELECT 'ATTACHMENTS' AS file_type, form_type, count(*) AS orphaned_count FROM (
  SELECT 'deutz_commission' AS form_type FROM deutz_commission_attachments a JOIN deutz_commissioning_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'deutz_service' FROM deutz_service_attachments a JOIN deutz_service_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'sp_commissioning' FROM submersible_pump_commissioning_attachments a JOIN submersible_pump_commissioning_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'sp_service' FROM submersible_pump_service_attachments a JOIN submersible_pump_service_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'sp_teardown' FROM submersible_pump_teardown_attachments a JOIN submersible_pump_teardown_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'esp_commissioning' FROM electric_surface_pump_commissioning_attachments a JOIN electric_surface_pump_commissioning_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'esp_service' FROM electric_surface_pump_service_attachments a JOIN electric_surface_pump_service_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'esp_teardown' FROM electric_surface_pump_teardown_attachments a JOIN electric_surface_pump_teardown_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'engine_sp_commissioning' FROM engine_surface_pump_commissioning_attachments a JOIN engine_surface_pump_commissioning_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'engine_sp_service' FROM engine_surface_pump_service_attachments a JOIN engine_surface_pump_service_report r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'daily_time_sheet' FROM daily_time_sheet_attachments a JOIN daily_time_sheet r ON r.id = a.daily_time_sheet_id WHERE r.deleted_at IS NOT NULL
  UNION ALL SELECT 'job_order' FROM job_order_attachments a JOIN job_order_request_form r ON r.id = a.report_id WHERE r.deleted_at IS NOT NULL
) counts
GROUP BY form_type
ORDER BY orphaned_count DESC;
