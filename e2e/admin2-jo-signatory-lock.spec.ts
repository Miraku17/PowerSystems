/**
 * Regression: JO Request "Approved By (Department Head)" and "Service Dept."
 * dropdowns auto-fill with the logged-in user and lock — preventing an Admin 2
 * from stamping another admin's stored signature on either signatory field.
 *
 * The Verified By field is already covered by admin1-jo-verified-by-lock.spec
 * — this spec covers the other two signatory fields visible to Admin 2.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000),
 *     pointed at a local Supabase with admin2dvo@powersystems / password123
 *     (Position: Admin 2 — has jo_signatory.approved_by + service_dept).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A2_EMAIL || "admin2dvo@powersystems";
const PASSWORD = process.env.PSI_E2E_A2_PASSWORD || "password123";

test.describe("Admin 2 — JO Request signatory locks", () => {
  test("Approved By and Service Dept. auto-fill and lock to logged-in user", async ({
    page,
    context,
  }) => {
    const apiCtx = context.request;

    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), "login should succeed").toBeTruthy();
    const loginBody = await loginRes.json();
    const token: string = loginBody.data.access_token;
    const userId: string = loginBody.data.user.id;
    expect(loginBody.data.user.position).toBe("Admin 2");

    const usersRes = await apiCtx.get("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersRes.ok()).toBeTruthy();
    const usersBody = await usersRes.json();
    const me = (usersBody.data as Array<{ id: string; fullName: string }>).find(
      (u) => u.id === userId,
    );
    expect(me, "logged-in user in /api/users").toBeTruthy();
    const expectedFullName = me!.fullName;

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    await page.goto("/dashboard/job-order-request");

    // Both fields must auto-fill with Admin 2's fullName.
    const fields: Array<{ name: string; label: string }> = [
      { name: "approved_by_name", label: "Approved By" },
      { name: "received_by_service_dept_name", label: "Service Dept." },
    ];

    for (const { name, label } of fields) {
      const input = page.locator(`input[name="${name}"]`);
      await expect(input, `${label} input visible`).toBeVisible({
        timeout: 10_000,
      });
      await expect(input, `${label} auto-filled`).toHaveValue(
        expectedFullName,
        { timeout: 10_000 },
      );
      await expect(input, `${label} is readonly`).toHaveAttribute(
        "readonly",
        "",
      );

      // While locked, the chevron toggle + clear button are unmounted.
      const wrapper = input.locator("xpath=ancestor::div[1]");
      await expect(
        wrapper.locator("button"),
        `${label}: no chevron / clear button while locked`,
      ).toHaveCount(0);

      // Clicking the input must not open a dropdown of other users.
      await input.click({ force: true });
      await page.waitForTimeout(150);
      await expect(wrapper.locator("button")).toHaveCount(0);
    }
  });
});
