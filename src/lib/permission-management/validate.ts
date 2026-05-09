import { Change, Permission, Scope } from './types';

const VALID_SCOPES: ReadonlyArray<Scope> = ['all', 'branch', 'own'];

export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateChanges(
  changes: Change[],
  permissions: Permission[],
  superAdminPositionId: string,
): ValidationResult {
  const permById = new Map(permissions.map((p) => [p.id, p]));

  for (const c of changes) {
    if (c.position_id === superAdminPositionId) {
      return { ok: false, message: 'Super Admin permissions cannot be modified' };
    }

    const perm = permById.get(c.permission_id);
    if (!perm) {
      return { ok: false, message: `Unknown permission: ${c.permission_id}` };
    }

    if (c.scope != null && !VALID_SCOPES.includes(c.scope)) {
      return { ok: false, message: `Invalid scope: ${c.scope}` };
    }

    if (!perm.is_scoped && c.scope != null) {
      return { ok: false, message: `Permission ${perm.module}.${perm.action} does not support scope` };
    }

    if (c.op === 'scope_change' && !perm.is_scoped) {
      return { ok: false, message: `Permission ${perm.module}.${perm.action} does not support scope` };
    }
  }

  return { ok: true };
}
