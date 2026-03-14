-- Permission to access the Daily Time Sheet page
-- Only Super Admin, Admin 1, and Admin 2 can access DTS

INSERT INTO permissions (module, action, description)
VALUES ('dts', 'access', 'Access Daily Time Sheet page')
ON CONFLICT (module, action) DO NOTHING;

-- Super Admin: dts.access (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'dts'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 1: dts.access (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'dts'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 2: dts.access (branch)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'dts'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );
