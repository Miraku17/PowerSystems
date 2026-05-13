/**
 * Regression: JO Request status workflow — phase 1 + phase 4.
 *
 * Phase 1 — auto-transition:
 *   When both Credit & Collection (received_by_credit_collection_name) AND
 *   Department Head (approved_by_name) are populated, status auto-flips
 *   from 'Pending' to 'In-Progress'. Either approval endpoint may be the
 *   one that completes the pair. Close / Cancelled status is sticky and
 *   never gets bounced back to In-Progress by an approval.
 *
 * Phase 4 — perm cleanup:
 *   Only Admin 1, Admin 2, and Super Admin hold `approvals.edit`. Finance
 *   (who held it previously) gets 403 on the status PATCH endpoint.
 *
 * Implementation references:
 *   - src/app/api/forms/job-order-request/[id]/approve-credit-collection/route.ts
 *     auto-bumps status if `approved_by_name` already set AND status='Pending'
 *   - src/app/api/forms/job-order-request/[id]/approve-dept-head/route.ts
 *     mirror logic against `received_by_credit_collection_name`
 *   - supabase migration `restrict_approvals_edit_to_admins.sql` grants
 *     Admin 2 and revokes Finance / Admin
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

// On local Supabase mirror:
//   jo_signatory.approved_by       → Admin 1, Admin 2
//   jo_credit_collection_approval  → Super Admin, Super User
// So the approval pair (Dept Head + C&C) needs two different logins.
const ADMIN1_EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const ADMIN1_PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";
const ADMIN2_EMAIL = process.env.PSI_E2E_A2_EMAIL || "admin2dvo@powersystems";
const ADMIN2_PASSWORD = process.env.PSI_E2E_A2_PASSWORD || "password123";
const SA_EMAIL = process.env.PSI_E2E_SA_EMAIL || "zhaztedv@gmail.com";
const SA_PASSWORD = process.env.PSI_E2E_SA_PASSWORD || "password123";
const FIN_EMAIL = process.env.PSI_E2E_FIN_EMAIL || "finance@powersystems";
const FIN_PASSWORD = process.env.PSI_E2E_FIN_PASSWORD || "password123";

async function loginAndGetToken(
  apiCtx: APIRequestContext,
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  const res = await apiCtx.post("/api/auth/login", {
    data: { email, password },
  });
  expect(res.ok(), `${email} login`).toBeTruthy();
  const body = await res.json();
  return { token: body.data.access_token, userId: body.data.user.id };
}

async function seedJo(
  apiCtx: APIRequestContext,
  createdBy: string,
  customerName: string,
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
      status: "Pending",
      created_by: createdBy,
    },
  });
  expect(res.ok(), `seed JO: ${res.status()}`).toBeTruthy();
  const rows = (await res.json()) as Array<{ id: string }>;
  expect(rows[0]?.id).toBeTruthy();
  return rows[0].id;
}

async function deleteJo(apiCtx: APIRequestContext, joId: string): Promise<void> {
  await apiCtx
    .delete(`${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${joId}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    .catch(() => {});
}

async function fetchJoStatus(
  apiCtx: APIRequestContext,
  joId: string,
): Promise<string> {
  const res = await apiCtx.get(
    `${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${joId}&select=status`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    },
  );
  const rows = (await res.json()) as Array<{ status: string }>;
  return rows[0]?.status ?? "";
}

test.describe("JO status — auto-transition + perm cleanup", () => {
  test.beforeAll(() => {
    expect(
      SERVICE_KEY,
      "PSI_E2E_SUPABASE_SERVICE_KEY is required",
    ).toBeTruthy();
  });

  test("auto-flips Pending→In-Progress after both approvals (C&C last)", async ({
    request,
  }) => {
    const admin1 = await loginAndGetToken(request, ADMIN1_EMAIL, ADMIN1_PASSWORD);
    const sa = await loginAndGetToken(request, SA_EMAIL, SA_PASSWORD);

    const customer = `PHASE1 C&C-LAST ${Date.now()}`;
    const joId = await seedJo(request, admin1.userId, customer);
    try {
      // 1) Dept Head approves first — status stays Pending.
      const dhRes = await request.patch(
        `/api/forms/job-order-request/${joId}/approve-dept-head`,
        { headers: { Authorization: `Bearer ${admin1.token}` } },
      );
      expect(dhRes.ok(), "dept-head approval").toBeTruthy();
      expect(await fetchJoStatus(request, joId)).toBe("Pending");

      // 2) C&C approves second — status should auto-flip to In-Progress.
      const ccRes = await request.patch(
        `/api/forms/job-order-request/${joId}/approve-credit-collection`,
        { headers: { Authorization: `Bearer ${sa.token}` } },
      );
      expect(ccRes.ok(), "C&C approval").toBeTruthy();
      expect(await fetchJoStatus(request, joId)).toBe("In-Progress");
    } finally {
      await deleteJo(request, joId);
    }
  });

  test("auto-flips Pending→In-Progress after both approvals (Dept Head last)", async ({
    request,
  }) => {
    const admin1 = await loginAndGetToken(request, ADMIN1_EMAIL, ADMIN1_PASSWORD);
    const sa = await loginAndGetToken(request, SA_EMAIL, SA_PASSWORD);

    const customer = `PHASE1 DH-LAST ${Date.now()}`;
    const joId = await seedJo(request, admin1.userId, customer);
    try {
      // 1) C&C approves first — Pending stays.
      const ccRes = await request.patch(
        `/api/forms/job-order-request/${joId}/approve-credit-collection`,
        { headers: { Authorization: `Bearer ${sa.token}` } },
      );
      expect(ccRes.ok()).toBeTruthy();
      expect(await fetchJoStatus(request, joId)).toBe("Pending");

      // 2) Dept Head approves — auto-flip.
      const dhRes = await request.patch(
        `/api/forms/job-order-request/${joId}/approve-dept-head`,
        { headers: { Authorization: `Bearer ${admin1.token}` } },
      );
      expect(dhRes.ok()).toBeTruthy();
      expect(await fetchJoStatus(request, joId)).toBe("In-Progress");
    } finally {
      await deleteJo(request, joId);
    }
  });

  test("does not bounce Close back to In-Progress on late approval", async ({
    request,
  }) => {
    const admin1 = await loginAndGetToken(request, ADMIN1_EMAIL, ADMIN1_PASSWORD);
    const sa = await loginAndGetToken(request, SA_EMAIL, SA_PASSWORD);

    const customer = `PHASE1 CLOSED-STAYS ${Date.now()}`;
    const joId = await seedJo(request, admin1.userId, customer);
    try {
      // Force the JO directly to Close via service-role REST.
      const setCloseRes = await request.patch(
        `${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${joId}`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          data: { status: "Close" },
        },
      );
      expect(setCloseRes.ok()).toBeTruthy();

      // Now run both approvals; status MUST remain Close.
      await request.patch(
        `/api/forms/job-order-request/${joId}/approve-dept-head`,
        { headers: { Authorization: `Bearer ${admin1.token}` } },
      );
      await request.patch(
        `/api/forms/job-order-request/${joId}/approve-credit-collection`,
        { headers: { Authorization: `Bearer ${sa.token}` } },
      );
      expect(await fetchJoStatus(request, joId)).toBe("Close");
    } finally {
      await deleteJo(request, joId);
    }
  });

  test("perm cleanup — Finance gets 403 from /status, Admin 2 succeeds", async ({
    request,
  }) => {
    const admin1 = await loginAndGetToken(request, ADMIN1_EMAIL, ADMIN1_PASSWORD);
    const admin2 = await loginAndGetToken(request, ADMIN2_EMAIL, ADMIN2_PASSWORD);
    const finance = await loginAndGetToken(request, FIN_EMAIL, FIN_PASSWORD);

    const customer = `PHASE4 PERM ${Date.now()}`;
    const joId = await seedJo(request, admin1.userId, customer);
    try {
      // Finance — should be DENIED after the perm cleanup.
      const finRes = await request.patch(
        `/api/forms/job-order-request/${joId}/status`,
        {
          headers: { Authorization: `Bearer ${finance.token}` },
          data: { status: "Cancelled" },
        },
      );
      expect(
        finRes.status(),
        "Finance must NOT be able to change JO status",
      ).toBe(403);

      // Admin 2 — should be ALLOWED after the perm cleanup.
      const a2Res = await request.patch(
        `/api/forms/job-order-request/${joId}/status`,
        {
          headers: { Authorization: `Bearer ${admin2.token}` },
          data: { status: "Cancelled" },
        },
      );
      expect(a2Res.status(), "Admin 2 must be able to change JO status").toBe(
        200,
      );
      expect(await fetchJoStatus(request, joId)).toBe("Cancelled");
    } finally {
      await deleteJo(request, joId);
    }
  });
});
