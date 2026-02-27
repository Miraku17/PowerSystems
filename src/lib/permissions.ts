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
 * Get the scope of a specific permission for a user's position.
 * Returns "all", "branch", "own", or null if the permission doesn't exist.
 */
export async function getPermissionScope(
  supabase: SupabaseClient,
  userId: string,
  module: string,
  action: string
): Promise<string | null> {
  const { data: userData } = await supabase
    .from('users')
    .select('position_id')
    .eq('id', userId)
    .single();

  if (!userData?.position_id) return null;

  const { data: perm } = await supabase
    .from('position_permissions')
    .select('scope, permissions!inner(module, action)')
    .eq('position_id', userData.position_id)
    .eq('permissions.module', module)
    .eq('permissions.action', action)
    .maybeSingle();

  return perm?.scope ?? null;
}

/**
 * Check if a user has permission to edit/delete a record.
 * Supports "all", "branch", and "own" scopes for edit actions.
 * - "all" scope: can edit any record
 * - "branch" scope: can only edit records from users in the same branch (address match)
 * - "own" scope: can only edit records they created
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

  // For edit, check scope using the dedicated 'edit' permission (separate from 'write')
  if (action === 'edit') {
    const scope = await getPermissionScope(supabase, userId, module, 'edit');

    if (scope === 'branch') {
      // Fetch both the current user's address and the record creator's address
      const [{ data: currentUserData }, { data: creatorData }] = await Promise.all([
        supabase.from('users').select('address').eq('id', userId).single(),
        recordCreatedBy
          ? supabase.from('users').select('address').eq('id', recordCreatedBy).single()
          : Promise.resolve({ data: null }),
      ]);

      const sameAddress =
        !!currentUserData?.address &&
        !!creatorData?.address &&
        currentUserData.address === creatorData.address;

      if (!sameAddress) {
        return {
          allowed: false,
          isAdmin: false,
          isOwner: recordCreatedBy === userId,
          error: NextResponse.json(
            { error: 'You can only edit records from your branch' },
            { status: 403 }
          ),
        };
      }
    } else if (scope === 'own') {
      if (recordCreatedBy !== userId) {
        return {
          allowed: false,
          isAdmin: false,
          isOwner: false,
          error: NextResponse.json(
            { error: 'You can only edit your own records' },
            { status: 403 }
          ),
        };
      }
    }
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
