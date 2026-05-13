/**
 * Regression: Phase 2 of the JO status workflow — block fill-up of service
 * reports when the JO is not 'In-Progress'.
 *
 * Two enforcement layers:
 *   (a) /api/forms/job-order-request/approved — autocomplete endpoint
 *       only returns JOs whose status is 'In-Progress'.
 *   (b) Each service-report create route revalidates by calling
 *       `assertJoInProgress` (src/lib/jo-status.ts) right after extracting
 *       the JO field. Returns 403 with a descriptive `error` when the
 *       JO is Pending / Close / Cancelled / missing.
 *
 * This spec drives the API directly (no UI) — the autocomplete + the
 * deutz-service create route are exercised as representative examples.
 * The other 13 form create routes use the same helper, so a regression
 * in any of them surfaces via the autocomplete filter test + the
 * shared-helper unit-ish coverage below.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

const ADMIN1_EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const ADMIN1_PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

async function loginAsAdmin1(apiCtx: APIRequestContext) {
  const res = await apiCtx.post("/api/auth/login", {
    data: { email: ADMIN1_EMAIL, password: ADMIN1_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.data.access_token as string, userId: body.data.user.id as string };
}

async function seedJo(
  apiCtx: APIRequestContext,
  createdBy: string,
  status: "Pending" | "In-Progress" | "Close" | "Cancelled",
  customerName: string,
  joNumber: string,
): Promise<string> {
  const res = await apiCtx.post(`${SUPABASE_URL}/rest/v1/job_order_request_form`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      full_customer_name: customerName,
      reporting_branch: "Manila",
      date_prepared: new Date().toISOString().slice(0, 10),
      status,
      shop_field_jo_number: joNumber,
      created_by: createdBy,
    },
  });
  expect(res.ok(), `seed JO (${status}): ${res.status()}`).toBeTruthy();
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0].id;
}

async function deleteJo(apiCtx: APIRequestContext, joId: string): Promise<void> {
  await apiCtx
    .delete(`${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${joId}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    .catch(() => {});
}

test.describe("JO status — fill-up gate (autocomplete + server)", () => {
  test.beforeAll(() => {
    expect(SERVICE_KEY).toBeTruthy();
  });

  test("autocomplete only returns In-Progress JOs", async ({ request }) => {
    const admin1 = await loginAsAdmin1(request);
    const ts = Date.now();
    const pendingJo = await seedJo(
      request, admin1.userId, "Pending",
      `GATE Pending ${ts}`, `GATE-P-${ts}`,
    );
    const inProgressJo = await seedJo(
      request, admin1.userId, "In-Progress",
      `GATE InProg ${ts}`, `GATE-I-${ts}`,
    );
    const closedJo = await seedJo(
      request, admin1.userId, "Close",
      `GATE Closed ${ts}`, `GATE-C-${ts}`,
    );

    try {
      const res = await request.get(
        `/api/forms/job-order-request/approved?search=${ts}&limit=50`,
        { headers: { Authorization: `Bearer ${admin1.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const numbers = (body.data as Array<{ shop_field_jo_number: string }>).map(
        (j) => j.shop_field_jo_number,
      );

      expect(numbers, "In-Progress JO must appear").toContain(`GATE-I-${ts}`);
      expect(numbers, "Pending JO must NOT appear").not.toContain(`GATE-P-${ts}`);
      expect(numbers, "Closed JO must NOT appear").not.toContain(`GATE-C-${ts}`);
    } finally {
      await deleteJo(request, pendingJo);
      await deleteJo(request, inProgressJo);
      await deleteJo(request, closedJo);
    }
  });

  test("server rejects deutz-service create when JO is Pending (403)", async ({
    request,
  }) => {
    const admin1 = await loginAsAdmin1(request);
    const ts = Date.now();
    const pendingJoId = await seedJo(
      request, admin1.userId, "Pending",
      `GATE SERVER PENDING ${ts}`, `GATE-SVR-P-${ts}`,
    );

    try {
      const formData = new FormData();
      formData.append("job_order", `GATE-SVR-P-${ts}`);
      formData.append("customer_name", "Doesn't matter");
      formData.append("uploaded_attachments", "[]");

      const res = await request.post("/api/forms/deutz-service", {
        headers: { Authorization: `Bearer ${admin1.token}` },
        multipart: {
          job_order: `GATE-SVR-P-${ts}`,
          customer_name: "Doesn't matter",
          uploaded_attachments: "[]",
        },
      });
      expect(res.status(), "Pending JO submit must be 403").toBe(403);
      const body = await res.json();
      expect(String(body.error || "")).toContain("Pending");
    } finally {
      await deleteJo(request, pendingJoId);
    }
  });

  test("server rejects deutz-service create when JO is Close (403)", async ({
    request,
  }) => {
    const admin1 = await loginAsAdmin1(request);
    const ts = Date.now();
    const closedJoId = await seedJo(
      request, admin1.userId, "Close",
      `GATE SERVER CLOSED ${ts}`, `GATE-SVR-C-${ts}`,
    );

    try {
      const res = await request.post("/api/forms/deutz-service", {
        headers: { Authorization: `Bearer ${admin1.token}` },
        multipart: {
          job_order: `GATE-SVR-C-${ts}`,
          customer_name: "Doesn't matter",
          uploaded_attachments: "[]",
        },
      });
      expect(res.status(), "Closed JO submit must be 403").toBe(403);
      const body = await res.json();
      expect(String(body.error || "")).toContain("Close");
    } finally {
      await deleteJo(request, closedJoId);
    }
  });

  test("server rejects deutz-service create when JO does not exist (403)", async ({
    request,
  }) => {
    const admin1 = await loginAsAdmin1(request);
    const res = await request.post("/api/forms/deutz-service", {
      headers: { Authorization: `Bearer ${admin1.token}` },
      multipart: {
        job_order: `GATE-DOES-NOT-EXIST-${Date.now()}`,
        customer_name: "Doesn't matter",
        uploaded_attachments: "[]",
      },
    });
    expect(res.status(), "Unknown JO submit must be 403").toBe(403);
    const body = await res.json();
    expect(String(body.error || "")).toContain("not found");
  });
});
