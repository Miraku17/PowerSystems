/**
 * Regression: Admin 2's "Checked By" fields auto-fill + lock to the
 * logged-in user on:
 *   - Fill Up Form → Components Teardown Measuring Report
 *   - Daily Time Sheet (FOR SERVICE OFFICE ONLY section)
 *
 * These locks were originally shipped for Admin 1 (commits c1f2d6f, 6db851c).
 * Both `autoFillForPositions` lists include "Admin 2" — this spec verifies
 * Admin 2 hits the same auto-fill path.
 *
 * Requires admin2dvo@powersystems / password123 on local Supabase
 * (Position: Admin 2 — Davao).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A2_EMAIL || "admin2dvo@powersystems";
const PASSWORD = process.env.PSI_E2E_A2_PASSWORD || "password123";

test.describe("Admin 2 — Checked By auto-fill + lock", () => {
  test("Components Teardown + DTS Checked By auto-fill with logged-in name", async ({
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
    expect(loginBody.data.user.position).toBe("Admin 2");

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

    // -------------------------------------------------------------------
    // PART 1 — Fill Up Form → Components Teardown Measuring Report
    // -------------------------------------------------------------------
    await page.goto("/dashboard/fill-up-form");
    await expect(
      page.getByRole("heading", { name: "Fill Up Form" }),
    ).toBeVisible({ timeout: 10_000 });

    const selectTrigger = page
      .locator('label[for="form-select"]')
      .locator("xpath=ancestor::div[1]")
      .getByRole("button")
      .first();
    await expect(selectTrigger).toBeVisible({ timeout: 15_000 });
    const targetOption = page.getByRole("button", {
      name: "Components Teardown Measuring Report",
    });
    for (let attempt = 0; attempt < 4; attempt++) {
      await selectTrigger.click();
      try {
        await expect(targetOption).toBeVisible({ timeout: 5_000 });
        break;
      } catch {
        if (attempt === 3) throw new Error("Form selector panel did not open");
      }
    }
    await targetOption.click();

    const ctCheckedByInputs = page.locator(
      'input[placeholder="Enter checked by"]',
    );
    await expect(ctCheckedByInputs.first()).toBeVisible({ timeout: 15_000 });
    const ctCount = await ctCheckedByInputs.count();
    expect(ctCount).toBeGreaterThan(0);
    for (let i = 0; i < ctCount; i++) {
      const input = ctCheckedByInputs.nth(i);
      await expect(
        input,
        `Components Teardown Checked By #${i} auto-fills as Admin 2`,
      ).toHaveValue(expectedFullName, { timeout: 10_000 });
      await expect(input).toHaveAttribute("readonly", "");
    }

    // -------------------------------------------------------------------
    // PART 2 — Daily Time Sheet → CHECKED BY (service-office section)
    // -------------------------------------------------------------------
    await page.goto("/dashboard/daily-time-sheet");

    const dtsCheckedBy = page.locator('input[name="checked_by"]');
    await expect(dtsCheckedBy).toBeVisible({ timeout: 10_000 });
    await expect(dtsCheckedBy).toHaveValue(expectedFullName, {
      timeout: 10_000,
    });
    await expect(dtsCheckedBy).toHaveAttribute("readonly", "");

    const dtsWrapper = dtsCheckedBy.locator("xpath=ancestor::div[1]");
    await expect(
      dtsWrapper.locator("button"),
      "DTS Checked By: no chevron / clear button while locked",
    ).toHaveCount(0);

    // DTS Service Coordinator also auto-fills for Admin 2 (same perm group).
    const serviceCoordInput = page.locator('input[name="service_coordinator"]');
    await expect(serviceCoordInput).toHaveValue(expectedFullName, {
      timeout: 10_000,
    });
    await expect(serviceCoordInput).toHaveAttribute("readonly", "");
  });
});
