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

describe('GET /api/permission-management/matrix', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when caller is not Super Admin', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: false });
    const res = await GET(new Request('http://x/matrix'), {} as any);
    expect(res.status).toBe(403);
  });

  it('returns positions, permissions, assignments for Super Admin', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });

    const c: any = {};
    c.from = jest.fn(() => c);
    c.select = jest.fn(() => c);
    c.order = jest.fn();
    c.order
      .mockResolvedValueOnce({ data: [{ id: 'pos-a', name: 'Admin 1' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'p1', module: 'leave', action: 'access', description: null, is_scoped: false }], error: null })
      .mockResolvedValueOnce({ data: [{ position_id: 'pos-a', permission_id: 'p1', scope: null }], error: null });

    (getServiceSupabase as jest.Mock).mockReturnValue(c);

    const res = await GET(new Request('http://x/matrix'), {} as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        positions: [{ id: 'pos-a', name: 'Admin 1' }],
        permissions: [{ id: 'p1', module: 'leave', action: 'access', description: null, is_scoped: false }],
        assignments: [{ position_id: 'pos-a', permission_id: 'p1', scope: null }],
      },
    });
  });
});
