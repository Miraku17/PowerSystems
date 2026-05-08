/**
 * @jest-environment node
 */
import { GET } from '../route';
import { getServiceSupabase } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/permission-management/guard';

jest.mock('@/lib/supabase');
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: any) => (req: Request, ctx: any) =>
    handler(req, { user: { id: 'user-1', email: 'x@x' }, ...ctx }),
}));
jest.mock('@/lib/permission-management/guard');

function buildChain() {
  const c: any = {};
  c.from = jest.fn(() => c);
  c.select = jest.fn(() => c);
  c.order = jest.fn(() => c);
  c.eq = jest.fn(() => c);
  c.limit = jest.fn().mockResolvedValue({ data: [{ id: 'log-1' }], error: null });
  return c;
}

describe('GET /api/permission-management/audit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when caller is not Super Admin', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: false });
    const res = await GET(new Request('http://x/audit'), {} as any);
    expect(res.status).toBe(403);
  });

  it('applies position_id and permission_id filters and limit', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    const c = buildChain();
    (getServiceSupabase as jest.Mock).mockReturnValue(c);
    const res = await GET(
      new Request('http://x/audit?position_id=pos-a&permission_id=p1&limit=10'),
      {} as any,
    );
    expect(res.status).toBe(200);
    expect(c.eq).toHaveBeenCalledWith('position_id', 'pos-a');
    expect(c.eq).toHaveBeenCalledWith('permission_id', 'p1');
    expect(c.limit).toHaveBeenCalledWith(10);
  });

  it('caps limit at 500', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    const c = buildChain();
    (getServiceSupabase as jest.Mock).mockReturnValue(c);
    await GET(new Request('http://x/audit?limit=99999'), {} as any);
    expect(c.limit).toHaveBeenCalledWith(500);
  });
});
