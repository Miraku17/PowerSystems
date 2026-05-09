import { KNOWN_PERMISSIONS, isKnownPermission } from '../known-permissions';

describe('known-permissions allowlist', () => {
  it('flags known pairs as known', () => {
    expect(isKnownPermission('leave', 'access')).toBe(true);
    expect(isKnownPermission('form_records', 'read')).toBe(true);
    expect(isKnownPermission('user_creation', 'delete')).toBe(true);
  });

  it('flags unknown pairs as unknown', () => {
    expect(isKnownPermission('leave', 'made_up')).toBe(false);
    expect(isKnownPermission('not_a_module', 'read')).toBe(false);
  });

  it('contains no duplicate (module, action) pairs', () => {
    const keys = KNOWN_PERMISSIONS.map((p) => `${p.module}.${p.action}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
