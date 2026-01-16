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
 * Check if a user has permission to edit/delete a record
 * - Admin users can edit/delete any record
 * - Regular users can only edit/delete records they created
 */
export async function checkRecordPermission(
  supabase: SupabaseClient,
  userId: string,
  recordCreatedBy: string | undefined | null,
  action: 'edit' | 'delete' = 'edit'
): Promise<PermissionCheckResult> {
  // Fetch user's role from the database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Error fetching user role:', userError);
    return {
      allowed: false,
      isAdmin: false,
      isOwner: false,
      error: NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      ),
    };
  }

  const isAdmin = userData?.role === 'admin';
  const isOwner = recordCreatedBy === userId;
  const allowed = isAdmin || isOwner;

  if (!allowed) {
    return {
      allowed: false,
      isAdmin,
      isOwner,
      error: NextResponse.json(
        { error: `You do not have permission to ${action} this record` },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    isAdmin,
    isOwner,
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
 * Check if user is admin
 */
export async function isUserAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId);
  return role === 'admin';
}
