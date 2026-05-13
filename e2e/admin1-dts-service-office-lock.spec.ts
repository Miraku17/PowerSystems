/**
 * Regression: Daily Time Sheet "FOR SERVICE OFFICE ONLY" signatories
 * auto-fill with the logged-in user and lock the dropdown — preventing them
 * from stamping another user's stored signature on Checked By, Service
 * Coordinator, Approved By, and Service Manager.
 *
 * Background: each of the four service-office SignatorySelects used
 * `showAllUsers` + `filterByPermission` so any user holding the relevant
 * `dts_service_office.<action>` perm appeared in the dropdown. Per requirement
 * only the logged-in user's name should be reachable. The fix passes
 * `autoFillForPositions` with the positions that hold each perm; SignatorySelect
 * then auto-fills + locks for matching logged-in users.
 *
 * Admin 1 on local Supabase only holds `dts_service_office.service_manager`
 * — that's the field this spec exercises. The other three remain disabled
 * for Admin 1 (no perm).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

test.describe("Admin 1 — DTS Service Office signatory lock", () => {
  test("Service Manager auto-fills logged-in name and locks the dropdown", async ({
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
    expect(loginBody.data.user.position).toBe("Admin 1");

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

    await page.goto("/dashboard/daily-time-sheet");

    // Locate the Service Manager input by name. Admin 1 holds the
    // service_manager perm and its autoFillForPositions=["Admin 1", "Super
    // Admin"] matches the logged-in user, so the field auto-populates + locks.
    const serviceManagerInput = page.locator('input[name="service_manager"]');
    await expect(serviceManagerInput).toBeVisible({ timeout: 10_000 });
    await expect(serviceManagerInput).toHaveValue(expectedFullName, {
      timeout: 10_000,
    });
    await expect(serviceManagerInput).toHaveAttribute("readonly", "");

    // While locked, SignatorySelect unmounts the chevron toggle + the clear
    // (X) button — both conditioned on `!isLocked`. The input's relative
    // wrapper should contain no <button> children.
    const wrapper = serviceManagerInput.locator("xpath=ancestor::div[1]");
    await expect(
      wrapper.locator("button"),
      "no chevron or clear button while locked",
    ).toHaveCount(0);

    // Clicking the input must not open a dropdown listing other users.
    await serviceManagerInput.click({ force: true });
    await page.waitForTimeout(200);
    await expect(wrapper.locator("button")).toHaveCount(0);

    // The three other service-office fields are disabled for Admin 1 (no
    // perm) — their inputs render `disabled`, which is the expected gate.
    for (const name of ["checked_by", "service_coordinator", "approved_by_service"]) {
      const input = page.locator(`input[name="${name}"]`);
      await expect(input, `${name} is permission-gated`).toBeDisabled();
    }
  });
});
