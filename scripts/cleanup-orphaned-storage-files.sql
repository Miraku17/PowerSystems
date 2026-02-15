-- ============================================================
-- CLEANUP: Delete orphaned attachment DB records
--
-- IMPORTANT: This only deletes the DATABASE records.
-- You still need to delete the actual FILES from Supabase storage
-- using the file URLs from the find query (Step 1).
--
-- Run the find query FIRST, copy the file_url values,
-- then use the Supabase dashboard or storage API to remove them
-- from the "service-reports" and "signatures" buckets.
-- ============================================================

-- Run the find query first to see what will be deleted!
-- Then uncomment the DELETE statements below.

-- DELETE attachment records for soft-deleted deutz commissioning forms
-- DELETE FROM deutz_commission_attachments WHERE report_id IN (SELECT id FROM deutz_commissioning_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM deutz_service_attachments WHERE report_id IN (SELECT id FROM deutz_service_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM submersible_pump_commissioning_attachments WHERE report_id IN (SELECT id FROM submersible_pump_commissioning_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM submersible_pump_service_attachments WHERE report_id IN (SELECT id FROM submersible_pump_service_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM submersible_pump_teardown_attachments WHERE report_id IN (SELECT id FROM submersible_pump_teardown_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM electric_surface_pump_commissioning_attachments WHERE report_id IN (SELECT id FROM electric_surface_pump_commissioning_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM electric_surface_pump_service_attachments WHERE report_id IN (SELECT id FROM electric_surface_pump_service_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM electric_surface_pump_teardown_attachments WHERE report_id IN (SELECT id FROM electric_surface_pump_teardown_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM engine_surface_pump_commissioning_attachments WHERE report_id IN (SELECT id FROM engine_surface_pump_commissioning_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM engine_surface_pump_service_attachments WHERE report_id IN (SELECT id FROM engine_surface_pump_service_report WHERE deleted_at IS NOT NULL);

-- DELETE FROM daily_time_sheet_attachments WHERE daily_time_sheet_id IN (SELECT id FROM daily_time_sheet WHERE deleted_at IS NOT NULL);

-- DELETE FROM job_order_attachments WHERE report_id IN (SELECT id FROM job_order_request_form WHERE deleted_at IS NOT NULL);


-- ============================================================
-- NULL out signature URLs on soft-deleted forms
-- (After deleting the actual files from storage)
-- ============================================================

-- UPDATE deutz_commissioning_report SET attending_technician_signature = NULL, noted_by_signature = NULL, approved_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (attending_technician_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR approved_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE deutz_service_report SET attending_technician_signature = NULL, noted_by_signature = NULL, approved_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (attending_technician_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR approved_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE submersible_pump_commissioning_report SET commissioned_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (commissioned_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE submersible_pump_service_report SET performed_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (performed_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE submersible_pump_teardown_report SET teardowned_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (teardowned_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE electric_surface_pump_commissioning_report SET commissioned_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (commissioned_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE electric_surface_pump_service_report SET performed_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (performed_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE electric_surface_pump_teardown_report SET teardowned_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (teardowned_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE engine_surface_pump_commissioning_report SET commissioned_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (commissioned_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE engine_surface_pump_service_report SET performed_by_signature = NULL, checked_approved_by_signature = NULL, noted_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (performed_by_signature IS NOT NULL OR checked_approved_by_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE daily_time_sheet SET performed_by_signature = NULL, approved_by_signature = NULL WHERE deleted_at IS NOT NULL AND (performed_by_signature IS NOT NULL OR approved_by_signature IS NOT NULL);

-- UPDATE job_order_request_form SET requested_by_signature = NULL, approved_by_signature = NULL, received_by_service_dept_signature = NULL, received_by_credit_collection_signature = NULL, verified_by_signature = NULL WHERE deleted_at IS NOT NULL AND (requested_by_signature IS NOT NULL OR approved_by_signature IS NOT NULL OR received_by_service_dept_signature IS NOT NULL OR received_by_credit_collection_signature IS NOT NULL OR verified_by_signature IS NOT NULL);

-- UPDATE engine_inspection_receiving_report SET service_technician_signature = NULL, noted_by_signature = NULL, approved_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (service_technician_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR approved_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);

-- UPDATE engine_teardown_reports SET service_technician_signature = NULL, noted_by_signature = NULL, approved_by_signature = NULL, acknowledged_by_signature = NULL WHERE deleted_at IS NOT NULL AND (service_technician_signature IS NOT NULL OR noted_by_signature IS NOT NULL OR approved_by_signature IS NOT NULL OR acknowledged_by_signature IS NOT NULL);
