import { validateChanges } from '../validate';
import { Change, Permission } from '../types';

const PERMS: Permission[] = [
  { id: 'p-binary', module: 'leave', action: 'access', description: null, is_scoped: false },
  { id: 'p-scoped', module: 'form_records', action: 'read', description: null, is_scoped: true },
];

const SUPER_ADMIN = 'pos-super';
const NORMAL = 'pos-normal';

describe('validateChanges', () => {
  it('accepts valid grant on binary perm', () => {
    const changes: Change[] = [{ position_id: NORMAL, permission_id: 'p-binary', op: 'grant', scope: null }];
    expect(validateChanges(changes, PERMS, SUPER_ADMIN)).toEqual({ ok: true });
  });

  it('rejects any change on Super Admin position', () => {
    const changes: Change[] = [{ position_id: SUPER_ADMIN, permission_id: 'p-binary', op: 'revoke' }];
    expect(validateChanges(changes, PERMS, SUPER_ADMIN)).toEqual({
      ok: false,
      message: 'Super Admin permissions cannot be modified',
    });
  });

  it('rejects scope_change on a non-scoped permission', () => {
    const changes: Change[] = [{ position_id: NORMAL, permission_id: 'p-binary', op: 'scope_change', scope: 'all' }];
    expect(validateChanges(changes, PERMS, SUPER_ADMIN)).toEqual({
      ok: false,
      message: 'Permission leave.access does not support scope',
    });
  });

  it('rejects grant with non-null scope on a non-scoped permission', () => {
    const changes: Change[] = [{ position_id: NORMAL, permission_id: 'p-binary', op: 'grant', scope: 'own' }];
    expect(validateChanges(changes, PERMS, SUPER_ADMIN)).toEqual({
      ok: false,
      message: 'Permission leave.access does not support scope',
    });
  });

  it('rejects an invalid scope value', () => {
    const changes: Change[] = [{ position_id: NORMAL, permission_id: 'p-scoped', op: 'grant', scope: 'global' as any }];
    expect(validateChanges(changes, PERMS, SUPER_ADMIN)).toEqual({
      ok: false,
      message: 'Invalid scope: global',
    });
  });

  it('rejects unknown permission id', () => {
    const changes: Change[] = [{ position_id: NORMAL, permission_id: 'p-missing', op: 'grant' }];
    expect(validateChanges(changes, PERMS, SUPER_ADMIN)).toEqual({
      ok: false,
      message: 'Unknown permission: p-missing',
    });
  });
});
