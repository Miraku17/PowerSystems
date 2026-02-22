-- Leave Filing System - Assign Permissions to Positions
-- Run this AFTER leave-system.sql

-- ============================================
-- leave.access - All positions can access the leave page
-- ============================================
INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('Super Admin', 'Admin 1', 'Admin 2', 'Super User', 'User 1', 'User 2', 'Accounting')
  AND perm.module = 'leave'
  AND perm.action = 'access'
ON CONFLICT DO NOTHING;

-- ============================================
-- leave.write - All positions can file leave
-- ============================================
INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('Super Admin', 'Admin 1', 'Admin 2', 'Super User', 'User 1', 'User 2', 'Accounting')
  AND perm.module = 'leave'
  AND perm.action = 'write'
ON CONFLICT DO NOTHING;

-- ============================================
-- leave_approval.access - Admins can access leave approval page
-- ============================================
INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('Super Admin', 'Admin 1', 'Admin 2')
  AND perm.module = 'leave_approval'
  AND perm.action = 'access'
ON CONFLICT DO NOTHING;

-- ============================================
-- leave_approval.edit - Admins can approve/reject leave
-- ============================================
INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('Super Admin', 'Admin 1', 'Admin 2')
  AND perm.module = 'leave_approval'
  AND perm.action = 'edit'
ON CONFLICT DO NOTHING;

-- ============================================
-- leave_credits.access - Super Admin can view leave credits
-- ============================================
INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'leave_credits'
  AND perm.action = 'access'
ON CONFLICT DO NOTHING;

-- ============================================
-- leave_credits.write - Super Admin can modify leave credits
-- ============================================
INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'leave_credits'
  AND perm.action = 'write'
ON CONFLICT DO NOTHING;
