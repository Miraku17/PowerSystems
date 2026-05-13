/**
 * Regression: Phase 3 of the JO status workflow — cascade close.
 *
 * Spec: "Once the status of a job order is closed, the status of filled
 * up forms from the same job order will close also."
 *
 * Implementation:
 *   * Each form table got a `status text NOT NULL DEFAULT 'In-Progress'`
 *     column via the `add_status_to_form_tables_and_cascade` migration.
 *   * The PATCH /api/forms/job-order-request/[id]/status route, when the
 *     new status is 'Close', runs UPDATE … SET status='Close' over every
 *     form table that references this JO (by shop_field_jo_number for the
 *     service-report tables; by UUID for daily_time_sheet).
 *
 * The spec drives the API directly. It seeds:
 *   - 1 JO Request (status='In-Progress', shop_field_jo_number=X)
 *   - 1 deutz_service_report (job_order=X)
 *   - 1 engine_teardown_report (job_number=X)
 *
 * After PATCH /status { status: 'Close' }:
 *   - JO is Close ✓ (already covered by phase 1 spec, asserted here too)
 *   - Both linked service reports have status='Close'
 *   - cascadeUpdates in the response is >= 2
 *
 * daily_time_sheet is intentionally excluded from the cascade — its
 * `status` column predates this work and tracks a different (approval)
 * lifecycle. Overwriting it would corrupt the leave-approval state.
 *
 * Cleanup via service-role REST.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

const ADMIN1_EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const ADMIN1_PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

async function login(apiCtx: APIRequestContext) {
  const res = await apiCtx.post("/api/auth/login", {
    data: { email: ADMIN1_EMAIL, password: ADMIN1_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.data.access_token as string, userId: body.data.user.id as string };
}

async function restInsert<T>(
  apiCtx: APIRequestContext,
  table: string,
  data: Record<string, unknown>,
): Promise<T> {
  const res = await apiCtx.post(`${SUPABASE_URL}/rest/v1/${table}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data,
  });
  expect(res.ok(), `seed ${table}: ${res.status()} ${await res.text()}`).toBeTruthy();
  const rows = (await res.json()) as T[];
  return rows[0];
}

async function restDelete(
  apiCtx: APIRequestContext,
  table: string,
  filter: string,
): Promise<void> {
  await apiCtx
    .delete(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    .catch(() => {});
}

async function fetchStatus(
  apiCtx: APIRequestContext,
  table: string,
  filter: string,
): Promise<string> {
  const res = await apiCtx.get(
    `${SUPABASE_URL}/rest/v1/${table}?${filter}&select=status`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    },
  );
  const rows = (await res.json()) as Array<{ status: string }>;
  return rows[0]?.status ?? "";
}

test.describe("JO status — cascade close to linked forms", () => {
  test.beforeAll(() => {
    expect(SERVICE_KEY).toBeTruthy();
  });

  test("closing a JO closes its linked deutz/engine/DTS forms too", async ({
    request,
  }) => {
    const admin1 = await login(request);
    const ts = Date.now();
    const joNumber = `CASCADE-${ts}`;

    // 1) Seed JO at status='In-Progress'.
    const jo = await restInsert<{ id: string; shop_field_jo_number: string }>(
      request,
      "job_order_request_form",
      {
        full_customer_name: `CASCADE CUSTOMER ${ts}`,
        reporting_branch: "Manila",
        date_prepared: new Date().toISOString().slice(0, 10),
        status: "In-Progress",
        shop_field_jo_number: joNumber,
        created_by: admin1.userId,
      },
    );

    // 2) Seed linked service reports referencing the JO. We only need
    //    minimum-required columns; the migration's NOT NULL constraints
    //    on these tables are forgiving for most fields.
    const deutz = await restInsert<{ id: string; status: string }>(
      request,
      "deutz_service_report",
      {
        job_order: joNumber,
        customer_name: "Doesn't matter",
        created_by: admin1.userId,
      },
    );
    const engine = await restInsert<{ id: string; status: string }>(
      request,
      "engine_teardown_reports",
      {
        job_number: joNumber,
        customer: "Doesn't matter",
        created_by: admin1.userId,
      },
    );

    try {
      // 3) Sanity: linked service-report forms default to In-Progress.
      expect(deutz.status).toBe("In-Progress");
      expect(engine.status).toBe("In-Progress");

      // 4) Close the JO via the API.
      const closeRes = await request.patch(
        `/api/forms/job-order-request/${jo.id}/status`,
        {
          headers: { Authorization: `Bearer ${admin1.token}` },
          data: { status: "Close" },
        },
      );
      expect(closeRes.ok(), "PATCH /status Close").toBeTruthy();
      const closeBody = await closeRes.json();
      expect(closeBody.cascadeUpdates, "cascade hits ≥ 2").toBeGreaterThanOrEqual(2);

      // 5) Each linked service-report should now be Close.
      expect(
        await fetchStatus(request, "deutz_service_report", `id=eq.${deutz.id}`),
      ).toBe("Close");
      expect(
        await fetchStatus(request, "engine_teardown_reports", `id=eq.${engine.id}`),
      ).toBe("Close");
    } finally {
      await restDelete(request, "deutz_service_report", `id=eq.${deutz.id}`);
      await restDelete(request, "engine_teardown_reports", `id=eq.${engine.id}`);
      await restDelete(request, "job_order_request_form", `id=eq.${jo.id}`);
    }
  });

  test("cascade does NOT fire for status changes other than Close", async ({
    request,
  }) => {
    const admin1 = await login(request);
    const ts = Date.now();
    const joNumber = `NOCASC-${ts}`;

    const jo = await restInsert<{ id: string }>(request, "job_order_request_form", {
      full_customer_name: `NOCASC ${ts}`,
      reporting_branch: "Manila",
      date_prepared: new Date().toISOString().slice(0, 10),
      status: "In-Progress",
      shop_field_jo_number: joNumber,
      created_by: admin1.userId,
    });
    const deutz = await restInsert<{ id: string }>(request, "deutz_service_report", {
      job_order: joNumber,
      customer_name: "Doesn't matter",
      created_by: admin1.userId,
    });

    try {
      // Move JO to Cancelled — linked form must stay In-Progress.
      const res = await request.patch(
        `/api/forms/job-order-request/${jo.id}/status`,
        {
          headers: { Authorization: `Bearer ${admin1.token}` },
          data: { status: "Cancelled" },
        },
      );
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.cascadeUpdates, "no cascade on Cancelled").toBe(0);
      expect(
        await fetchStatus(request, "deutz_service_report", `id=eq.${deutz.id}`),
      ).toBe("In-Progress");
    } finally {
      await restDelete(request, "deutz_service_report", `id=eq.${deutz.id}`);
      await restDelete(request, "job_order_request_form", `id=eq.${jo.id}`);
    }
  });
});
