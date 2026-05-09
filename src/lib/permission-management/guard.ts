import type { SupabaseClient } from '@supabase/supabase-js';

export type GuardResult =
  | { ok: true; superAdminPositionId: string }
  | { ok: false };

export async function requireSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<GuardResult> {
  const { data, error } = await supabase
    .from('users')
    .select('position:positions(id, name)')
    .eq('id', userId)
    .single();

  if (error || !data) return { ok: false };
  const position = (data as any).position as { id: string; name: string } | null;
  if (!position || position.name !== 'Super Admin') return { ok: false };

  return { ok: true, superAdminPositionId: position.id };
}
