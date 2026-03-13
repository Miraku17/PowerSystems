-- Add LWOP (Leave Without Pay) to leave_type constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check CHECK (leave_type IN ('VL', 'SL', 'EL', 'LWOP'));
