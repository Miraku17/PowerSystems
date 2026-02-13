import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'user' | 'admin';

export interface PermissionCheckResult {
  allowed: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  error?: NextResponse;
}

/**
 * Check if a user has a specific permission using the positions/permissions tables.
 * Uses: users -> position_permissions -> permissions lookup.
 */
export async function hasPermission(
  supabase: SupabaseClient,
  userId: string,
  module: string,
  action: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('position_id')
    .eq('id', userId)
    .single();

  if (error || !data?.position_id) return false;

  const { data: perms, error: permError } = await supabase
    .from('position_permissions')
    .select('permissions!inner(module, action)')
    .eq('position_id', data.position_id)
    .eq('permissions.module', module)
    .eq('permissions.action', action);

  if (permError) {
    console.error('Error checking permission:', permError);
    return false;
  }

  return (perms?.length || 0) > 0;
}

/**
 * Check if a user has permission to edit/delete a record.
 * Uses the positions/permissions tables instead of hardcoded roles.
 * - Users with delete permission on the module can delete any record
 * - Users with write permission can edit their own records
 */
export async function checkRecordPermission(
  supabase: SupabaseClient,
  userId: string,
  recordCreatedBy: string | undefined | null,
  action: 'edit' | 'delete' = 'edit',
  module: string = 'form_records'
): Promise<PermissionCheckResult> {
  const permAction = action === 'delete' ? 'delete' : 'write';
  const allowed = await hasPermission(supabase, userId, module, permAction);

  if (!allowed) {
    // For edit, also allow if user is the record owner and has write permission
    if (action === 'edit') {
      const isOwner = recordCreatedBy === userId;
      const canWrite = await hasPermission(supabase, userId, module, 'write');
      if (isOwner && canWrite) {
        return { allowed: true, isAdmin: false, isOwner: true };
      }
    }

    return {
      allowed: false,
      isAdmin: false,
      isOwner: recordCreatedBy === userId,
      error: NextResponse.json(
        { error: `You do not have permission to ${action} this record` },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    isAdmin: true,
    isOwner: recordCreatedBy === userId,
  };
}

/**
 * Simple role check - returns user role from database
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role as UserRole;
}

/**
 * @deprecated Use hasPermission() instead for granular permission checks
 */
export async function isUserAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId);
  return role === 'admin';
}
