import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Batch-fetch user addresses given an array of user IDs.
 * Returns a map of userId -> address.
 */
export async function getUserAddresses(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from("users")
    .select("id, address")
    .in("id", userIds);

  if (error) {
    console.error("Error fetching user addresses:", error);
    return {};
  }

  return Object.fromEntries((data || []).map((u: any) => [u.id, u.address || ""]));
}

/**
 * Batch-fetch user display names given an array of user IDs.
 * Returns a map of userId -> "Firstname Lastname" (or username/email fallback).
 */
export async function getUserDisplayNames(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from("users")
    .select("id, firstname, lastname, username, email")
    .in("id", userIds);

  if (error) {
    console.error("Error fetching user names:", error);
    return {};
  }

  return Object.fromEntries(
    (data || []).map((u: any) => {
      const full = `${u.firstname || ""} ${u.lastname || ""}`.trim();
      const display = full || u.username || u.email || "";
      return [u.id, display];
    })
  );
}

/**
 * Resolve a single user's display name. Falls back to email local-part
 * if firstname/lastname are unset.
 */
export async function getUserDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  if (!userId) return '';
  const { data, error } = await supabase
    .from('users')
    .select('firstname, lastname, email')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return '';
  const full = `${data.firstname || ''} ${data.lastname || ''}`.trim();
  if (full) return full;
  return (data.email || '').split('@')[0] || '';
}
