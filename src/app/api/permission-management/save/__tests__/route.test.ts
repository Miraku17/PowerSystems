/**
 * @jest-environment node
 */
import { POST } from '../route';
import { getServiceSupabase } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/permission-management/guard';

jest.mock('@/lib/supabase');
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: any) => (req: Request, ctx: any) =>
    handler(req, { user: { id: 'user-1', email: 'x@x' }, ...ctx }),
}));
jest.mock('@/lib/permission-management/guard');

function buildSupabase(opts: { permissions: any[]; rpcResult?: any; matrixData?: any }) {
  const c: any = {};
  c.from = jest.fn(() => c);
  c.select = jest.fn(() => c);
  c.order = jest.fn();
  c.rpc = jest.fn();

  // Sequence of `.order()` calls:
  // 1) permissions select for validation
  // 2-4) re-load matrix: positions, permissions, assignments
  c.order
    .mockResolvedValueOnce({ data: opts.permissions, error: null })
    .mockResolvedValueOnce({ data: opts.matrixData?.positions ?? [], error: null })
    .mockResolvedValueOnce({ data: opts.matrixData?.permissions ?? opts.permissions, error: null })
    .mockResolvedValueOnce({ data: opts.matrixData?.assignments ?? [], error: null });

  c.rpc.mockResolvedValue(opts.rpcResult ?? { data: 'batch-uuid', error: null });
  return c;
}

const validBody = {
  reason: 'demo',
  changes: [{ position_id: 'pos-a', permission_id: 'p1', op: 'grant', scope: null }],
};

const PERMS = [{ id: 'p1', module: 'leave', action: 'access', description: null, is_scoped: false }];

describe('POST /api/permission-management/save', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when caller is not Super Admin', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: false });
    const res = await POST(
      new Request('http://x/save', { method: 'POST', body: JSON.stringify(validBody) }),
      {} as any,
    );
    expect(res.status).toBe(403);
  });

  it('rejects malformed body', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    (getServiceSupabase as jest.Mock).mockReturnValue(buildSupabase({ permissions: PERMS }));
    const res = await POST(
      new Request('http://x/save', { method: 'POST', body: JSON.stringify({ reason: 'x' }) }),
      {} as any,
    );
    expect(res.status).toBe(400);
  });

  it('rejects empty changes array', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    (getServiceSupabase as jest.Mock).mockReturnValue(buildSupabase({ permissions: PERMS }));
    const res = await POST(
      new Request('http://x/save', { method: 'POST', body: JSON.stringify({ reason: '', changes: [] }) }),
      {} as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/No changes/);
  });

  it('rejects when validateChanges fails (e.g., super admin position)', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    (getServiceSupabase as jest.Mock).mockReturnValue(buildSupabase({ permissions: PERMS }));
    const body = {
      reason: '',
      changes: [{ position_id: 'p-super', permission_id: 'p1', op: 'grant', scope: null }],
    };
    const res = await POST(
      new Request('http://x/save', { method: 'POST', body: JSON.stringify(body) }),
      {} as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/Super Admin/);
  });

  it('returns 500 when RPC errors (transaction rolled back)', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    const supa = buildSupabase({
      permissions: PERMS,
      rpcResult: { data: null, error: { message: 'boom' } },
    });
    (getServiceSupabase as jest.Mock).mockReturnValue(supa);
    const res = await POST(
      new Request('http://x/save', { method: 'POST', body: JSON.stringify(validBody) }),
      {} as any,
    );
    expect(res.status).toBe(500);
  });

  it('happy path: calls RPC, returns batch_id and fresh matrix', async () => {
    (requireSuperAdmin as jest.Mock).mockResolvedValue({ ok: true, superAdminPositionId: 'p-super' });
    const supa = buildSupabase({
      permissions: PERMS,
      rpcResult: { data: 'batch-uuid', error: null },
      matrixData: {
        positions: [{ id: 'pos-a', name: 'Admin 1' }],
        permissions: PERMS,
        assignments: [{ position_id: 'pos-a', permission_id: 'p1', scope: null }],
      },
    });
    (getServiceSupabase as jest.Mock).mockReturnValue(supa);

    const res = await POST(
      new Request('http://x/save', { method: 'POST', body: JSON.stringify(validBody) }),
      {} as any,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.batch_id).toBe('batch-uuid');
    expect(json.data.assignments).toEqual([{ position_id: 'pos-a', permission_id: 'p1', scope: null }]);
    expect(supa.rpc).toHaveBeenCalledWith('apply_permission_changes', {
      p_changes: validBody.changes,
      p_reason: 'demo',
      p_performed_by: 'user-1',
    });
  });
});
