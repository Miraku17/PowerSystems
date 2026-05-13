import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * JO statuses that block service-report creation. Pending / Close /
 * Cancelled JOs are not "in service" — admins must move the JO to
 * In-Progress before any fill-up form can be filed against it.
 *
 * Spec: "Users cannot fillup form using JO number with pending, closed
 * and cancelled status. May fillup form using JO number with in-progress
 * status."
 */
const BLOCKED_STATUSES = new Set(["Pending", "Close", "Cancelled"]);

export interface JoStatusGateResult {
  ok: boolean;
  status?: string;
  reason?: string;
}

/**
 * Verify that the JO referenced by `joNumber` (the human `shop_field_jo_number`)
 * is currently In-Progress. Service-report create routes call this after
 * extracting the JO number from the request body. Returns `{ok:true}` when
 * the JO exists AND is In-Progress; returns `{ok:false, reason}` otherwise.
 *
 * When `joNumber` is empty / undefined, returns `{ok:true}` — some form
 * types allow a blank JO field (legacy data, admin overrides). The caller
 * decides whether a non-empty value is required for that form.
 */
export async function assertJoInProgress(
  supabase: SupabaseClient,
  joNumber: string | null | undefined,
): Promise<JoStatusGateResult> {
  const value = (joNumber || "").trim();
  if (!value) return { ok: true };

  const { data, error } = await supabase
    .from("job_order_request_form")
    .select("status, deleted_at")
    .eq("shop_field_jo_number", value)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: `Failed to verify JO number "${value}": ${error.message}`,
    };
  }

  if (!data) {
    return {
      ok: false,
      reason: `JO number "${value}" not found.`,
    };
  }

  if (BLOCKED_STATUSES.has(data.status)) {
    return {
      ok: false,
      status: data.status,
      reason: `Cannot fill out a form for JO "${value}" — its status is "${data.status}". Only JOs with status "In-Progress" can be used.`,
    };
  }

  return { ok: true, status: data.status };
}

/**
 * Variant for daily_time_sheet — references the JO by its UUID
 * (`job_order_request_id`), not by the human `shop_field_jo_number`.
 */
export async function assertJoInProgressById(
  supabase: SupabaseClient,
  joId: string | null | undefined,
): Promise<JoStatusGateResult> {
  const value = (joId || "").trim();
  if (!value) return { ok: true };

  const { data, error } = await supabase
    .from("job_order_request_form")
    .select("status, deleted_at")
    .eq("id", value)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: `Failed to verify JO: ${error.message}` };
  }
  if (!data) return { ok: false, reason: "JO not found." };
  if (BLOCKED_STATUSES.has(data.status)) {
    return {
      ok: false,
      status: data.status,
      reason: `JO status is "${data.status}". Only In-Progress JOs accept new forms.`,
    };
  }
  return { ok: true, status: data.status };
}
