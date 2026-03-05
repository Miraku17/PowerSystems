-- Create dedicated DTS approval permission module (separate from general approvals)

-- 1. Create the permissions
INSERT INTO permissions (module, action, description)
VALUES
  ('dts_approval', 'access', 'Access DTS approval page'),
  ('dts_approval', 'edit', 'Approve or change DTS status')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Assign to positions (mirror existing approvals.edit assignments with their scopes)

-- Super Admin: dts_approval.access (all) + dts_approval.edit (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'dts_approval'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'dts_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 1: dts_approval.access (all) + dts_approval.edit (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'dts_approval'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'dts_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 2: dts_approval.access (branch) + dts_approval.edit (branch)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'dts_approval'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'dts_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );
