-- Permission to access the Job Order Request form page
INSERT INTO permissions (module, action, description)
VALUES ('job_order_request', 'access', 'Access Job Order Request form')
ON CONFLICT (module, action) DO NOTHING;

-- Super Admin
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 1
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 1'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin 2
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'branch'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin 2'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Admin
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Admin'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Finance
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Finance'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- Super User
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'all'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super User'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- User 1
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'own'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'User 1'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );

-- User 2
INSERT INTO position_permissions (id, position_id, permission_id, scope)
SELECT gen_random_uuid(), p.id, perm.id, 'own'
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'User 2'
  AND perm.module = 'job_order_request'
  AND perm.action = 'access'
  AND NOT EXISTS (
    SELECT 1 FROM position_permissions pp
    WHERE pp.position_id = p.id AND pp.permission_id = perm.id
  );
