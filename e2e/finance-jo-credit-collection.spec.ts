/**
 * Regression: Finance must see + sign the JO Request "Credit & Collection"
 * field on both the create form AND the edit modal. The field auto-fills
 * with Finance's own name + signature and locks the dropdown so Finance
 * can't pick another user's signature.
 *
 * Before the fix:
 *   - JobOrderRequestForm.tsx gated the C&C field on
 *     `['super user','super admin']` — Finance was excluded.
 *   - EditJobOrderRequest.tsx gated it on `jo_credit_collection_approval.edit`
 *     which Finance doesn't hold either.
 *
 * After:
 *   - Create form widens the position list to include "Finance".
 *   - Edit form widens the perm check to also accept position === "Finance".
 *   - Both render the field with `autoFillForPositions={["Finance"]}` so
 *     Finance is locked to their own signature.
 *
 * Requires finance@powersystems / password123 on local Supabase.
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_FIN_EMAIL || "finance@powersystems";
const PASSWORD = process.env.PSI_E2E_FIN_PASSWORD || "password123";
const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

async function expectAutoFilledAndLocked(
  page: Page,
  selector: string,
  expectedFullName: string,
  label: string,
) {
  const input = page.locator(selector).first();
  await expect(input, `${label}: visible`).toBeVisible({ timeout: 10_000 });
  await expect(input, `${label}: auto-filled with logged-in name`).toHaveValue(
    expectedFullName,
    { timeout: 10_000 },
  );
  // Locked SignatorySelect inputs: chevron toggle + clear button are
  // unmounted. So the input's relative wrapper should have no <button>.
  const wrapper = input.locator("xpath=ancestor::div[1]");
  await expect(
    wrapper.locator("button"),
    `${label}: no chevron / clear button while locked`,
  ).toHaveCount(0);
}

test.describe("Finance — JO Credit & Collection access + lock", () => {
  test("renders + auto-fills + locks on both create and edit", async ({
    page,
    context,
  }) => {
    const apiCtx = context.request;

    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const token: string = loginBody.data.access_token;
    const userId: string = loginBody.data.user.id;
    expect(loginBody.data.user.position).toBe("Finance");

    // Canonical fullName from /api/users.
    const usersRes = await apiCtx.get("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersRes.ok()).toBeTruthy();
    const usersBody = await usersRes.json();
    const me = (usersBody.data as Array<{ id: string; fullName: string }>).find(
      (u) => u.id === userId,
    );
    expect(me).toBeTruthy();
    const expectedFullName = me!.fullName;

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    // -----------------------------------------------------------------
    // 1) CREATE FORM — /dashboard/job-order-request
    // -----------------------------------------------------------------
    await page.addInitScript(() => {
      window.localStorage.removeItem("psi-job-order-request-form-draft");
    });
    await page.goto("/dashboard/job-order-request");
    await page.waitForLoadState("networkidle").catch(() => {});

    await expectAutoFilledAndLocked(
      page,
      'input[name="received_by_credit_collection_name"]',
      expectedFullName,
      "Create form C&C",
    );

    // -----------------------------------------------------------------
    // 2) EDIT MODAL — seed a JO via service-role REST so Finance can
    //    open the modal as the row's creator (canEditRecord short-
    //    circuits to true for creators regardless of form_records.edit).
    // -----------------------------------------------------------------
    expect(
      SERVICE_KEY,
      "PSI_E2E_SUPABASE_SERVICE_KEY must be set for the edit-form seed",
    ).toBeTruthy();

    const seedCustomerName = `FINANCE C&C E2E ${Date.now()}`;
    const seedRes = await apiCtx.post(
      `${SUPABASE_URL}/rest/v1/job_order_request_form`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: {
          full_customer_name: seedCustomerName,
          reporting_branch: "Manila",
          date_prepared: new Date().toISOString().slice(0, 10),
          status: "Pending",
          created_by: userId,
        },
      },
    );
    expect(seedRes.ok(), `seed REST insert: ${seedRes.status()}`).toBeTruthy();
    const seedRows = (await seedRes.json()) as Array<{ id: string }>;
    const seededJoId = seedRows[0]?.id;
    expect(seededJoId).toBeTruthy();

    try {
      await page.goto("/dashboard/records/folders/job-order-request");
      const row = page
        .locator("tr", { hasText: seedCustomerName })
        .first();
      await row.waitFor({ state: "visible", timeout: 15_000 });
      await row.getByTitle("Edit").click();

      await expectAutoFilledAndLocked(
        page,
        'input[name="received_by_credit_collection_name"]',
        expectedFullName,
        "Edit modal C&C",
      );
    } finally {
      // Cleanup via service-role REST.
      await apiCtx
        .delete(
          `${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${seededJoId}`,
          {
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
          },
        )
        .catch(() => {});
    }
  });
});
