-- =========================================
-- Add form_records:read permission with scope
-- =========================================
-- This migration adds a 'read' action to the form_records module,
-- enabling scope-based filtering (all, branch, own) for viewing form records.

-- Step 1: Insert the read permission
INSERT INTO permissions (id, module, action, description)
VALUES (
  gen_random_uuid(),
  'form_records',
  'read',
  'Can view form records. Scope controls visibility: all = all records, branch = same branch/address, own = only own records.'
)
ON CONFLICT (module, action) DO NOTHING;

-- Step 2: Assign read permission with scope to all positions
-- Adjust position names and scopes to match your actual positions.

-- Super Admin: can see all records
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'form_records'
  AND perm.action = 'read'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 1: can see all records
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'form_records'
  AND perm.action = 'read'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 2: can only see records from same branch (address)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'form_records'
  AND perm.action = 'read'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Branch-level positions: can see records from same branch (address)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('Super User')
  AND perm.module = 'form_records'
  AND perm.action = 'read'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Own-level positions: can only see their own records
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'own'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name IN ('User 1', 'User 2')
  AND perm.module = 'form_records'
  AND perm.action = 'read'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Step 3: Verify the assignments
SELECT
  p.name as position_name,
  perm.action,
  pp.scope
FROM positions p
INNER JOIN position_permissions pp ON p.id = pp.position_id
INNER JOIN permissions perm ON pp.permission_id = perm.id
WHERE perm.module = 'form_records'
  AND perm.action = 'read'
ORDER BY p.name;
