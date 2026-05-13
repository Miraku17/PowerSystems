/**
 * Regression: Super Admin must NOT be auto-filled-and-locked on any
 * signatory field. The Admin 1 / Admin 2 locks shipped over the past
 * commits all listed "Super Admin" in their `autoFillForPositions`
 * arrays, so without an SA bypass SA also got locked — but the role
 * exists precisely to override signatory restrictions and pick any user.
 *
 *   - SignatorySelect.tsx — added `isCurrentUserSuperAdmin` guard that
 *     short-circuits the auto-fill effect.
 *   - ComponentsTeardownMeasuringForm + EditComponentsTeardownMeasuring
 *     — `lockedCheckedByName` returns undefined for Super Admin.
 *
 * Coverage:
 *   - JO Request → Approved By, Service Dept, Verified By
 *   - Daily Time Sheet → Checked By, Service Coordinator, Approved By,
 *     Service Manager
 *   - Fill Up Form → Components Teardown Measuring → Checked By
 *
 * Requires zhaztedv@gmail.com / password123 on local Supabase.
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SA_EMAIL || "zhaztedv@gmail.com";
const PASSWORD = process.env.PSI_E2E_SA_PASSWORD || "password123";

async function expectUnlocked(page: Page, selector: string, label: string) {
  const input = page.locator(selector).first();
  await expect(input, `${label}: visible`).toBeVisible({ timeout: 10_000 });
  // SignatorySelect inputs are always `readonly` (dropdown-only, no typing),
  // so the lock signal is the chevron toggle: present when unlocked,
  // unmounted when isLocked. SA must see the chevron.
  const wrapper = input.locator("xpath=ancestor::div[1]");
  const buttonCount = await wrapper.locator("button").count();
  expect(
    buttonCount,
    `${label}: chevron toggle button must render for Super Admin`,
  ).toBeGreaterThan(0);
}

test.describe("Super Admin — signatory access bypass", () => {
  test("can reach every signatory dropdown on JO + DTS + Components Teardown", async ({
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
    expect(loginBody.data.user.position).toBe("Super Admin");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    // ---------------------------------------------------------------
    // JO Request — Approved By, Service Dept, Verified By
    // ---------------------------------------------------------------
    await page.goto("/dashboard/job-order-request");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectUnlocked(page, 'input[name="approved_by_name"]', "JO Approved By");
    await expectUnlocked(
      page,
      'input[name="received_by_service_dept_name"]',
      "JO Service Dept",
    );
    await expectUnlocked(page, 'input[name="verified_by_name"]', "JO Verified By");

    // ---------------------------------------------------------------
    // Daily Time Sheet — Checked By, Service Coordinator, Approved By,
    // Service Manager
    // ---------------------------------------------------------------
    await page.goto("/dashboard/daily-time-sheet");
    await page.waitForLoadState("networkidle").catch(() => {});
    await expectUnlocked(page, 'input[name="checked_by"]', "DTS Checked By");
    await expectUnlocked(
      page,
      'input[name="service_coordinator"]',
      "DTS Service Coordinator",
    );
    await expectUnlocked(
      page,
      'input[name="approved_by_service"]',
      "DTS Approved By",
    );
    await expectUnlocked(
      page,
      'input[name="service_manager"]',
      "DTS Service Manager",
    );

    // ---------------------------------------------------------------
    // Fill Up Form → Components Teardown Measuring → Checked By
    // ---------------------------------------------------------------
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

    const checkedByInputs = page.locator(
      'input[placeholder="Enter checked by"]',
    );
    await expect(checkedByInputs.first()).toBeVisible({ timeout: 15_000 });
    const count = await checkedByInputs.count();
    for (let i = 0; i < count; i++) {
      const input = checkedByInputs.nth(i);
      const readonly = await input.getAttribute("readonly");
      expect(
        readonly,
        `Components Teardown Checked By #${i} must NOT be readonly`,
      ).toBeNull();
    }
  });
});
