import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';
import { requireSuperAdmin } from '@/lib/permission-management/guard';
import { validateChanges } from '@/lib/permission-management/validate';
import { isKnownPermission } from '@/lib/permission-management/known-permissions';
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

  if (body.changes.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No changes to save' },
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

  const knownPermissions = permissions.filter((p: { module: string; action: string }) =>
    isKnownPermission(p.module, p.action),
  );

  const validation = validateChanges(body.changes, knownPermissions, guard.superAdminPositionId);
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

  if (positions.error || perms.error || assignments.error) {
    return NextResponse.json(
      { success: false, message: 'Save succeeded but failed to reload matrix; refresh the page' },
      { status: 500 },
    );
  }

  const visiblePerms = (perms.data ?? []).filter((p: { module: string; action: string }) =>
    isKnownPermission(p.module, p.action),
  );
  const visiblePermIds = new Set(visiblePerms.map((p: { id: string }) => p.id));
  const visibleAssignments = (assignments.data ?? []).filter((a: { permission_id: string }) =>
    visiblePermIds.has(a.permission_id),
  );

  return NextResponse.json({
    success: true,
    batch_id: batchId,
    data: {
      positions: positions.data ?? [],
      permissions: visiblePerms,
      assignments: visibleAssignments,
    },
  });
});
