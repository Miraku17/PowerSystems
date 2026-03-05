-- Add leave_approval access + edit (branch scope) for Super User

-- leave_approval.access with branch scope
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super User'
  AND perm.module = 'leave_approval'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- leave_approval.edit with branch scope
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT
  gen_random_uuid(),
  p.id,
  perm.id,
  'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super User'
  AND perm.module = 'leave_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );
