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
