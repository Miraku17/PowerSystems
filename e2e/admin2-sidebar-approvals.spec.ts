/**
 * Regression: Admin 2 sidebar after the requirement #4 changes:
 *
 *   1. No "Audit Logs" entry — gated on `audit_logs.read` which Admin 2
 *      doesn't hold. Previously the link was visible and clicking it led
 *      to a hard "Access Denied" page.
 *   2. No "SYSTEM" section header at all (since Audit Logs is the section
 *      anchor and Admin 2 also lacks Header Settings + Deleted Records).
 *   3. "Reports" moved out of SYSTEM and into APPROVALS.
 *   4. New "Leaves" entry under APPROVALS, pointing at the existing
 *      /dashboard/leave-management approver queue. The LEAVE group still
 *      shows File Leave + Leave Management (separately from APPROVALS).
 *
 * Requires admin2dvo@powersystems / password123 on local Supabase.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A2_EMAIL || "admin2dvo@powersystems";
const PASSWORD = process.env.PSI_E2E_A2_PASSWORD || "password123";

test.describe("Admin 2 — sidebar approvals layout", () => {
  test("Audit Logs hidden; Reports + Leaves under APPROVALS", async ({
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
    expect(loginBody.data.user.position).toBe("Admin 2");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    await page.goto("/dashboard/overview");
    // Wait for the sidebar to render — keying off the page heading rather
    // than a specific sidebar entry, so the assertions below test the
    // sidebar's actual filter output.
    await page.waitForLoadState("networkidle").catch(() => {});

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // 1. Audit Logs link is NOT in the sidebar.
    await expect(
      sidebar.getByRole("button", { name: /Audit Logs/ }),
      "Audit Logs button must not render for Admin 2",
    ).toHaveCount(0);

    // 2. SYSTEM section label is NOT rendered. The label text is "System"
    //    (rendered upper-cased via CSS).
    await expect(
      sidebar.getByText("System", { exact: true }),
      "SYSTEM section header must not render",
    ).toHaveCount(0);

    // 3. APPROVALS section is present and contains Reports + Leaves.
    await expect(
      sidebar.getByText("Approvals", { exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /JO Requests/ }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /DTS Requests/ }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /^Reports$/ }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /^Leaves$/ }),
    ).toBeVisible();

    // 4. LEAVE group still shows File Leave + Leave Management.
    await expect(
      sidebar.getByText("Leave", { exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /File Leave/ }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("button", { name: /Leave Management/ }),
    ).toBeVisible();

    // 5. Clicking "Leaves" under APPROVALS lands on the leave-management
    //    page (no Access Denied).
    await sidebar.getByRole("button", { name: /^Leaves$/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/leave-management/);
    // Should not show the access-denied marker.
    await expect(page.getByText(/Access Denied/i)).toHaveCount(0);
  });
});
