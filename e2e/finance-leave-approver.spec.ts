/**
 * Regression: Finance is the FINAL approver of leaves — not conditional.
 *
 * The Leave Management page renders the action column based on the viewer's
 * leave_approval_* perms (LeaveRequests.tsx:67-69, :241-273):
 *
 *   - `leave_approval.edit` alone        → Conditional + Reject + Revoke
 *   - `leave_approval_full.edit` (extra) → Approve (final, credit-deducting)
 *                                          → Conditional button is hidden
 *
 * Before the grant Finance held only leave_approval.{access,edit}, so the
 * orange "Set Conditional" warning button appeared on pending rows. After
 * the grant_finance_leave_approval_full migration, the green "Approve"
 * button takes its place.
 *
 * Requires finance@powersystems / password123 on local Supabase.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_FIN_EMAIL || "finance@powersystems";
const PASSWORD = process.env.PSI_E2E_FIN_PASSWORD || "password123";
const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

test.describe("Finance — final approver of leaves (not conditional)", () => {
  test("Pending leave row shows Approve, not Conditional", async ({
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

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    // Seed a pending leave request via service-role REST so the spec doesn't
    // depend on existing fixtures.
    expect(
      SERVICE_KEY,
      "PSI_E2E_SUPABASE_SERVICE_KEY required to seed leave_requests",
    ).toBeTruthy();
    const reason = `FINANCE LEAVE E2E ${Date.now()}`;
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
          user_id: userId,
          leave_type: "VL",
          start_date: "2026-06-01",
          end_date: "2026-06-01",
          total_days: 1,
          reason,
          status: "pending",
        },
      },
    );
    expect(seedRes.ok(), `seed leave_requests: ${seedRes.status()}`).toBeTruthy();
    const seededRows = (await seedRes.json()) as Array<{ id: string }>;
    const seededId = seededRows[0]?.id;
    expect(seededId).toBeTruthy();

    try {
      await page.goto("/dashboard/leave-management");
      const row = page.locator("tr", { hasText: reason }).first();
      await row.waitFor({ state: "visible", timeout: 15_000 });

      // ActionButton renders the label inside a sibling <span> (tooltip),
      // not as aria-label. The tooltip text lives in the DOM (just hidden
      // via opacity unless hovered) — Playwright text matchers find it.

      // Approve tooltip MUST appear in the row (green check button).
      await expect(
        row.getByText("Approve", { exact: true }),
        "Finance must see the Approve action on pending leaves",
      ).toHaveCount(1);

      // Set Conditional MUST NOT appear — gated to !canFullApprove holders.
      await expect(
        row.getByText("Set Conditional", { exact: true }),
        "Finance must NOT see the Conditional action",
      ).toHaveCount(0);

      // Reject still available (red X button).
      await expect(
        row.getByText("Reject", { exact: true }),
        "Finance retains Reject",
      ).toHaveCount(1);
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
