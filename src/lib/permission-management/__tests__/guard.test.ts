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
  it('returns ok when the user position is Super Admin', async () => {
    const supabase = chainable({ data: { position: { id: 'p-super', name: 'Super Admin' } }, error: null });
    const result = await requireSuperAdmin(supabase as any, 'user-1');
    expect(result).toEqual({ ok: true, superAdminPositionId: 'p-super' });
  });

  it('returns ok=false when the user position is not Super Admin', async () => {
    const supabase = chainable({ data: { position: { id: 'p-admin1', name: 'Admin 1' } }, error: null });
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
