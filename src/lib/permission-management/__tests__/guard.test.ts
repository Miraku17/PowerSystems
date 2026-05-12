import { requireSuperAdmin } from '../guard';

function chainable(payload: any) {
  const c: any = {};
  c.from = jest.fn(() => c);
  c.select = jest.fn(() => c);
  c.eq = jest.fn(() => c);
  c.single = jest.fn().mockResolvedValue(payload);
  return c;
}

describe('requireSuperAdmin', () => {
  it('returns ok when the user position is flagged is_super_admin', async () => {
    const supabase = chainable({ data: { position: { id: 'p-super', is_super_admin: true } }, error: null });
    const result = await requireSuperAdmin(supabase as any, 'user-1');
    expect(result).toEqual({ ok: true, superAdminPositionId: 'p-super' });
  });

  it('returns ok=false when the user position is not flagged is_super_admin', async () => {
    const supabase = chainable({ data: { position: { id: 'p-admin1', is_super_admin: false } }, error: null });
    const result = await requireSuperAdmin(supabase as any, 'user-1');
    expect(result.ok).toBe(false);
  });

  it('returns ok=false when the user has no position', async () => {
    const supabase = chainable({ data: { position: null }, error: null });
    const result = await requireSuperAdmin(supabase as any, 'user-1');
    expect(result.ok).toBe(false);
  });

  it('returns ok=false on Supabase error', async () => {
    const supabase = chainable({ data: null, error: { message: 'boom' } });
    const result = await requireSuperAdmin(supabase as any, 'user-1');
    expect(result.ok).toBe(false);
  });
});
