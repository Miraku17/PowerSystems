-- =========================================
-- Setup User Creation Permissions
-- =========================================
-- This script separates 'write' (create) and 'edit' (update) permissions

-- Step 1: Ensure all permissions exist for user_creation module
INSERT INTO permissions (module, action, description)
VALUES
  ('user_creation', 'read', 'Can view users list'),
  ('user_creation', 'write', 'Can create new users'),
  ('user_creation', 'edit', 'Can edit existing users'),
  ('user_creation', 'delete', 'Can delete users')
ON CONFLICT (module, action) DO UPDATE
  SET description = EXCLUDED.description;

-- Step 2: View current permissions
SELECT
  p.name as position_name,
  perm.module,
  perm.action,
  perm.description
FROM positions p
INNER JOIN position_permissions pp ON p.id = pp.position_id
INNER JOIN permissions perm ON pp.permission_id = perm.id
WHERE perm.module = 'user_creation'
ORDER BY p.name, perm.action;

-- Step 3: Example - Assign permissions to positions
-- Note: Replace position names with your actual position names

-- Super Admin: Full permissions (read, write, edit, delete)
INSERT INTO position_permissions (position_id, permission_id)
SELECT
  p.id as position_id,
  perm.id as permission_id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'user_creation'
  AND perm.action IN ('read', 'write', 'edit', 'delete')
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Admin 1: Can view, create, and edit users (but not delete)
INSERT INTO position_permissions (position_id, permission_id)
SELECT
  p.id as position_id,
  perm.id as permission_id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'user_creation'
  AND perm.action IN ('read', 'write', 'edit')
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Admin 2: Can view and edit users (but not create or delete)
INSERT INTO position_permissions (position_id, permission_id)
SELECT
  p.id as position_id,
  perm.id as permission_id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'user_creation'
  AND perm.action IN ('read', 'edit')
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Regular User: Can only view users (no create, edit, or delete)
INSERT INTO position_permissions (position_id, permission_id)
SELECT
  p.id as position_id,
  perm.id as permission_id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('User 1', 'User 2', 'Super User')
  AND perm.module = 'user_creation'
  AND perm.action = 'read'
ON CONFLICT (position_id, permission_id) DO NOTHING;

-- Step 4: Verify the assignments
SELECT
  p.name as position_name,
  STRING_AGG(perm.action, ', ' ORDER BY perm.action) as permissions
FROM positions p
LEFT JOIN position_permissions pp ON p.id = pp.position_id
LEFT JOIN permissions perm ON pp.permission_id = perm.id AND perm.module = 'user_creation'
GROUP BY p.id, p.name
ORDER BY p.name;

-- Step 5: Query to see which users have specific permissions
-- Users who can CREATE users (write permission)
SELECT
  u.firstname || ' ' || u.lastname as full_name,
  u.email,
  p.name as position_name,
  'CAN CREATE' as capability
FROM users u
INNER JOIN positions p ON u.position_id = p.id
INNER JOIN position_permissions pp ON p.id = pp.position_id
INNER JOIN permissions perm ON pp.permission_id = perm.id
WHERE perm.module = 'user_creation'
  AND perm.action = 'write';

-- Users who can EDIT users (edit permission)
SELECT
  u.firstname || ' ' || u.lastname as full_name,
  u.email,
  p.name as position_name,
  'CAN EDIT' as capability
FROM users u
INNER JOIN positions p ON u.position_id = p.id
INNER JOIN position_permissions pp ON p.id = pp.position_id
INNER JOIN permissions perm ON pp.permission_id = perm.id
WHERE perm.module = 'user_creation'
  AND perm.action = 'edit';

-- Users who can DELETE users (delete permission)
SELECT
  u.firstname || ' ' || u.lastname as full_name,
  u.email,
  p.name as position_name,
  'CAN DELETE' as capability
FROM users u
INNER JOIN positions p ON u.position_id = p.id
INNER JOIN position_permissions pp ON p.id = pp.position_id
INNER JOIN permissions perm ON pp.permission_id = perm.id
WHERE perm.module = 'user_creation'
  AND perm.action = 'delete';
