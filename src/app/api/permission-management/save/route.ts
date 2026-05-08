import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';
import { requireSuperAdmin } from '@/lib/permission-management/guard';
import { validateChanges } from '@/lib/permission-management/validate';
import type { SaveRequestBody } from '@/lib/permission-management/types';

export const POST = withAuth(async (request, { user }) => {
  const supabase = getServiceSupabase();

  const guard = await requireSuperAdmin(supabase, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, message: 'Super Admin required' },
      { status: 403 },
    );
  }

  let body: SaveRequestBody;
  try {
    body = (await request.json()) as SaveRequestBody;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.changes)) {
    return NextResponse.json(
      { success: false, message: 'Missing changes[]' },
      { status: 400 },
    );
  }

  const { data: permissions, error: permError } = await supabase
    .from('permissions')
    .select('id, module, action, description, is_scoped')
    .order('module');

  if (permError || !permissions) {
    return NextResponse.json(
      { success: false, message: 'Failed to load permissions' },
      { status: 500 },
    );
  }

  const validation = validateChanges(body.changes, permissions, guard.superAdminPositionId);
  if (!validation.ok) {
    return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
  }

  const { data: batchId, error: rpcError } = await supabase.rpc('apply_permission_changes', {
    p_changes: body.changes,
    p_reason: body.reason ?? '',
    p_performed_by: user.id,
  });

  if (rpcError) {
    return NextResponse.json(
      { success: false, message: rpcError.message ?? 'RPC failed' },
      { status: 500 },
    );
  }

  const [positions, perms, assignments] = await Promise.all([
    supabase.from('positions').select('id, name').order('name'),
    supabase
      .from('permissions')
      .select('id, module, action, description, is_scoped')
      .order('module'),
    supabase.from('position_permissions').select('position_id, permission_id, scope').order('position_id'),
  ]);

  return NextResponse.json({
    success: true,
    batch_id: batchId,
    data: {
      positions: positions.data ?? [],
      permissions: perms.data ?? [],
      assignments: assignments.data ?? [],
    },
  });
});
