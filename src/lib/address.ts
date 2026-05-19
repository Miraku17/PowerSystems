/**
 * Normalize an address for storage: trim and collapse internal whitespace.
 * Preserves the user's chosen casing.
 */
export function normalizeAddressForStorage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Compare two addresses as branch identifiers: case-insensitive, whitespace-tolerant.
 * Returns true when both sides are non-empty and refer to the same branch.
 */
export function sameBranch(a: unknown, b: unknown): boolean {
  const na = normalizeAddressForStorage(a).toLowerCase();
  const nb = normalizeAddressForStorage(b).toLowerCase();
  return na.length > 0 && na === nb;
}
