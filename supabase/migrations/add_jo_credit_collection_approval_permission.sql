-- Permission for Credit & Collection approval on Job Order Requests
INSERT INTO permissions (module, action, description)
VALUES ('jo_credit_collection_approval', 'edit', 'Approve as Credit & Collection on Job Order Requests')
ON CONFLICT (module, action) DO NOTHING;

-- Super Admin (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'jo_credit_collection_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 1 (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'jo_credit_collection_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin'
  AND perm.module = 'jo_credit_collection_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Finance (all)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Finance'
  AND perm.module = 'jo_credit_collection_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 2 (branch)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'jo_credit_collection_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Super User (branch)
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super User'
  AND perm.module = 'jo_credit_collection_approval'
  AND perm.action = 'edit'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );
