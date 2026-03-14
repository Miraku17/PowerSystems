-- Add 'conditional' to leave_requests status constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('pending', 'conditional', 'approved', 'rejected'));

-- Create leave_approval_full permission (for full approval - only Super Admin, Admin 1, Super User)
INSERT INTO permissions (module, action, description)
VALUES ('leave_approval_full', 'access', 'Access full leave approval')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description)
VALUES ('leave_approval_full', 'edit', 'Can fully approve leave requests')
ON CONFLICT (module, action) DO NOTHING;

-- Assign leave_approval_full permissions to Super Admin, Admin 1, Super User
-- Super Admin - scope all
INSERT INTO position_permissions (position_id, permission_id, scope)
SELECT p.id, perm.id, 'all'
FROM positions p, permissions perm
WHERE p.name = 'Super Admin' AND perm.module = 'leave_approval_full' AND perm.action = 'edit'
ON CONFLICT (position_id, permission_id) DO NOTHING;

INSERT INTO position_permissions (position_id, permission_id, scope)
SELECT p.id, perm.id, 'all'
FROM positions p, permissions perm
WHERE p.name = 'Super Admin' AND perm.module = 'leave_approval_full' AND perm.action = 'access'
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Admin 1 - scope all
INSERT INTO position_permissions (position_id, permission_id, scope)
SELECT p.id, perm.id, 'all'
FROM positions p, permissions perm
WHERE p.name = 'Admin 1' AND perm.module = 'leave_approval_full' AND perm.action = 'edit'
ON CONFLICT (position_id, permission_id) DO NOTHING;

INSERT INTO position_permissions (position_id, permission_id, scope)
SELECT p.id, perm.id, 'all'
FROM positions p, permissions perm
WHERE p.name = 'Admin 1' AND perm.module = 'leave_approval_full' AND perm.action = 'access'
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Super User - scope all
INSERT INTO position_permissions (position_id, permission_id, scope)
SELECT p.id, perm.id, 'all'
FROM positions p, permissions perm
WHERE p.name = 'Super User' AND perm.module = 'leave_approval_full' AND perm.action = 'edit'
ON CONFLICT (position_id, permission_id) DO NOTHING;

INSERT INTO position_permissions (position_id, permission_id, scope)
SELECT p.id, perm.id, 'all'
FROM positions p, permissions perm
WHERE p.name = 'Super User' AND perm.module = 'leave_approval_full' AND perm.action = 'access'
ON CONFLICT (position_id, permission_id) DO NOTHING;
