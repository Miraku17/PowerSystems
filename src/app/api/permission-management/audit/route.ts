import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';
import { requireSuperAdmin } from '@/lib/permission-management/guard';

export const GET = withAuth(async (request, { user }) => {
  const supabase = getServiceSupabase();

  const guard = await requireSuperAdmin(supabase, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, message: 'Super Admin required' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const positionId = searchParams.get('position_id');
  const permissionId = searchParams.get('permission_id');
  const requestedLimit = parseInt(searchParams.get('limit') ?? '100', 10);
  const limit = Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 100, 500);

  let q = supabase
    .from('permission_audit_log')
    .select('*')
    .order('performed_at', { ascending: false });

  if (positionId) q = q.eq('position_id', positionId);
  if (permissionId) q = q.eq('permission_id', permissionId);

  const { data, error } = await q.limit(limit);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
});
