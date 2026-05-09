import { diffPermissions } from '../diff';
import { Assignment, DraftMap, Permission, draftKey } from '../types';

const PERMS: Permission[] = [
  { id: 'p-binary', module: 'leave', action: 'access', description: null, is_scoped: false },
  { id: 'p-scoped', module: 'form_records', action: 'read', description: null, is_scoped: true },
];

const POS_A = 'pos-a';

describe('diffPermissions', () => {
  it('returns [] when draft equals server', () => {
    const server: Assignment[] = [{ position_id: POS_A, permission_id: 'p-binary', scope: null }];
    const draft: DraftMap = { [draftKey(POS_A, 'p-binary')]: { granted: true, scope: null } };
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([]);
  });

  it('emits grant when draft toggles a binary perm on', () => {
    const server: Assignment[] = [];
    const draft: DraftMap = { [draftKey(POS_A, 'p-binary')]: { granted: true, scope: null } };
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([
      { position_id: POS_A, permission_id: 'p-binary', op: 'grant', scope: null },
    ]);
  });

  it('emits revoke when draft toggles a binary perm off', () => {
    const server: Assignment[] = [{ position_id: POS_A, permission_id: 'p-binary', scope: null }];
    const draft: DraftMap = { [draftKey(POS_A, 'p-binary')]: { granted: false, scope: null } };
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([
      { position_id: POS_A, permission_id: 'p-binary', op: 'revoke' },
    ]);
  });

  it('emits scope_change when granted scoped perm changes scope', () => {
    const server: Assignment[] = [{ position_id: POS_A, permission_id: 'p-scoped', scope: 'own' }];
    const draft: DraftMap = { [draftKey(POS_A, 'p-scoped')]: { granted: true, scope: 'all' } };
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([
      { position_id: POS_A, permission_id: 'p-scoped', op: 'scope_change', scope: 'all' },
    ]);
  });

  it('emits grant with scope when scoped perm goes from off to scoped', () => {
    const server: Assignment[] = [];
    const draft: DraftMap = { [draftKey(POS_A, 'p-scoped')]: { granted: true, scope: 'branch' } };
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([
      { position_id: POS_A, permission_id: 'p-scoped', op: 'grant', scope: 'branch' },
    ]);
  });

  it('ignores draft entries that are not granted and not present on server', () => {
    const server: Assignment[] = [];
    const draft: DraftMap = { [draftKey(POS_A, 'p-binary')]: { granted: false, scope: null } };
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([]);
  });

  it('treats missing draft entries as "no change" (uses server state)', () => {
    const server: Assignment[] = [{ position_id: POS_A, permission_id: 'p-binary', scope: null }];
    const draft: DraftMap = {};
    expect(diffPermissions({ server, draft, permissions: PERMS })).toEqual([]);
  });
});
