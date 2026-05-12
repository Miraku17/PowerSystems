import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';
import { requireSuperAdmin } from '@/lib/permission-management/guard';
import { isKnownPermission } from '@/lib/permission-management/known-permissions';

export const GET = withAuth(async (_req, { user }) => {
  const supabase = getServiceSupabase();

  const guard = await requireSuperAdmin(supabase, user.id);
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, message: 'Super Admin required' },
      { status: 403 },
    );
  }

  const [positions, permissions, assignments] = await Promise.all([
    supabase.from('positions').select('id, name, is_super_admin').order('name'),
    supabase
      .from('permissions')
      .select('id, module, action, description, is_scoped')
      .order('module'),
    supabase.from('position_permissions').select('position_id, permission_id, scope').order('position_id'),
  ]);

  if (positions.error || permissions.error || assignments.error) {
    return NextResponse.json(
      { success: false, message: 'Failed to load matrix' },
      { status: 500 },
    );
  }

  const visiblePermissions = (permissions.data ?? []).filter((p: { module: string; action: string }) =>
    isKnownPermission(p.module, p.action),
  );
  const visiblePermissionIds = new Set(visiblePermissions.map((p: { id: string }) => p.id));
  const visibleAssignments = (assignments.data ?? []).filter((a: { permission_id: string }) =>
    visiblePermissionIds.has(a.permission_id),
  );

  return NextResponse.json({
    success: true,
    data: {
      positions: positions.data ?? [],
      permissions: visiblePermissions,
      assignments: visibleAssignments,
    },
  });
});
