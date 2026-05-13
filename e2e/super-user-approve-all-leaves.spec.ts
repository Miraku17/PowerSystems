/**
 * Regression: Super User must be able to approve filed leaves from
 * ALL users — not just their own branch.
 *
 * Background: /api/leave-requests applies a branch filter when the viewer's
 * `leave_approval.access` is scope=branch (route.ts:55-69). Super User
 * held that perm at scope=branch on local, so they only saw same-address
 * leaves. The `widen_super_user_leave_approval_scope` migration upgrades
 * both leave_approval.{access,edit} to scope=all so Super User receives
 * the full list and can approve each row.
 *
 * Combined with the pre-existing leave_approval_full.edit (scope=all)
 * on Super User, the Pending action set on every row becomes Approve +
 * Reject — matching the "final approver" + "all branches" pattern the
 * client wants.
 *
 * Super User on local (aacanuto@powersystems) is at address
 * "PSI Deutz Manila". This spec seeds leave_requests from a user at
 * a DIFFERENT address ("PSI Deutz Davao") to prove the branch filter
 * is no longer applied.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SU_EMAIL || "aacanuto@powersystems";
const PASSWORD = process.env.PSI_E2E_SU_PASSWORD || "password123";
const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

// admin1@powersystems is at "PSI Deutz Davao" — a different branch from
// Super User's "PSI Deutz Manila". A pending leave filed by admin1 should
// now appear in Super User's queue.
const DAVAO_USER_ID = "02adb698-ead3-43d0-ac64-220ac1ccb5fb";

test.describe("Super User — approves leaves from all branches", () => {
  test("Davao-branch leave shows up + Approve action renders", async ({
    page,
    context,
  }) => {
    const apiCtx = context.request;
    expect(
      SERVICE_KEY,
      "PSI_E2E_SUPABASE_SERVICE_KEY required to seed leaves",
    ).toBeTruthy();

    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const token: string = loginBody.data.access_token;
    expect(loginBody.data.user.position).toBe("Super User");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    // Seed a pending leave from the Davao user via service-role REST.
    const reason = `SU-CROSS-BRANCH ${Date.now()}`;
    const seedRes = await apiCtx.post(
      `${SUPABASE_URL}/rest/v1/leave_requests`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        data: {
          user_id: DAVAO_USER_ID,
          leave_type: "VL",
          start_date: "2026-07-01",
          end_date: "2026-07-01",
          total_days: 1,
          reason,
          status: "pending",
        },
      },
    );
    expect(seedRes.ok(), `seed leave: ${seedRes.status()}`).toBeTruthy();
    const seedRows = (await seedRes.json()) as Array<{ id: string }>;
    const seededId = seedRows[0]?.id;
    expect(seededId).toBeTruthy();

    try {
      await page.goto("/dashboard/leave-management");
      const row = page.locator("tr", { hasText: reason }).first();
      await row.waitFor({ state: "visible", timeout: 15_000 });

      // Approve tooltip MUST render (Super User holds leave_approval_full).
      await expect(
        row.getByText("Approve", { exact: true }),
        "Approve action must render on the Davao-branch leave row",
      ).toHaveCount(1);

      // Reject tooltip also renders.
      await expect(
        row.getByText("Reject", { exact: true }),
      ).toHaveCount(1);

      // Conditional MUST NOT render (canFullApprove suppresses it).
      await expect(
        row.getByText("Set Conditional", { exact: true }),
        "Conditional must NOT render — Super User is final approver",
      ).toHaveCount(0);
    } finally {
      await apiCtx
        .delete(`${SUPABASE_URL}/rest/v1/leave_requests?id=eq.${seededId}`, {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
        })
        .catch(() => {});
    }
  });
});
