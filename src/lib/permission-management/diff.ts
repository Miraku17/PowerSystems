import { Assignment, Change, DraftMap, Permission, draftKey } from './types';

export function diffPermissions(input: {
  server: Assignment[];
  draft: DraftMap;
  permissions: Permission[];
}): Change[] {
  const { server, draft, permissions } = input;
  const permById = new Map(permissions.map((p) => [p.id, p]));
  const serverByKey = new Map<string, Assignment>(
    server.map((a) => [draftKey(a.position_id, a.permission_id), a]),
  );

  const changes: Change[] = [];

  for (const [key, d] of Object.entries(draft)) {
    const [position_id, permission_id] = key.split(':');
    const perm = permById.get(permission_id);
    if (!perm) continue;

    const existing = serverByKey.get(key);
    const wasGranted = !!existing;
    const wasScope = existing?.scope ?? null;

    if (!d.granted && !wasGranted) continue;
    if (!d.granted && wasGranted) {
      changes.push({ position_id, permission_id, op: 'revoke' });
      continue;
    }
    if (d.granted && !wasGranted) {
      changes.push({
        position_id,
        permission_id,
        op: 'grant',
        scope: perm.is_scoped ? d.scope : null,
      });
      continue;
    }
    const draftScope = perm.is_scoped ? d.scope : null;
    if ((draftScope ?? null) !== (wasScope ?? null)) {
      changes.push({
        position_id,
        permission_id,
        op: 'scope_change',
        scope: draftScope,
      });
    }
  }

  return changes;
}
