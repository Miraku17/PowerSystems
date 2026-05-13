/**
 * Regression: Fill Up Form → Components Teardown Measuring → "Checked By"
 * fields auto-fill with the logged-in user's name and lock the dropdown.
 *
 * Background: ComponentsTeardownMeasuringForm uses an inline `UserAutocomplete`
 * (and `UserAutocompleteEdit` in the edit modal) for Checked By. Both used to
 * render the full users list — letting an Admin pick another user and
 * effectively stamp that other user's name onto the measurement section. Per
 * the requirement we now pass `lockToCurrentUserName` whenever the logged-in
 * user's position is Admin 1 / Admin 2 / Super Admin: the input auto-fills
 * with their fullName, becomes readonly, and the chevron + dropdown options
 * are unmounted.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000),
 *     pointed at a local Supabase with admin1@powersystems / password123.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

test.describe("Admin 1 — Components Teardown Measuring Checked By lock", () => {
  test("auto-fills logged-in name and locks the dropdown", async ({
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

    // Canonical fullName for the assertion.
    const usersRes = await apiCtx.get("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersRes.ok()).toBeTruthy();
    const usersBody = await usersRes.json();
    const me = (usersBody.data as Array<{ id: string; fullName: string }>).find(
      (u) => u.id === userId,
    );
    expect(me, "logged-in user appears in /api/users").toBeTruthy();
    const expectedFullName = me!.fullName;

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    // Navigate to the Fill Up Form page and switch to Components Teardown
    // Measuring via the CustomSelect trigger.
    await page.goto("/dashboard/fill-up-form");

    // The CustomSelect renders a "form-select" labelled button. Wait for the
    // page heading first to ensure the form-type selector has mounted.
    await expect(
      page.getByRole("heading", { name: "Fill Up Form" }),
    ).toBeVisible({ timeout: 10_000 });

    const selectTrigger = page
      .locator('label[for="form-select"]')
      .locator("xpath=ancestor::div[1]")
      .getByRole("button")
      .first();
    await expect(selectTrigger).toBeVisible({ timeout: 10_000 });
    await selectTrigger.click();
    await page
      .getByRole("button", { name: "Components Teardown Measuring Report" })
      .click();

    // Wait for the form to mount. The main-summary "Checked By" sits next to a
    // "Technician" autocomplete near the bottom; locate the last Checked By
    // input on the page.
    const checkedByInputs = page.locator(
      'input[placeholder="Enter checked by"]',
    );
    await expect(checkedByInputs.first()).toBeVisible({ timeout: 15_000 });

    // Every Checked By input must:
    //   - have value === logged-in fullName (auto-filled)
    //   - be readonly (locked)
    const count = await checkedByInputs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const input = checkedByInputs.nth(i);
      await expect(input, `Checked By #${i} auto-fills`).toHaveValue(
        expectedFullName,
        { timeout: 10_000 },
      );
      await expect(input, `Checked By #${i} is readonly`).toHaveAttribute(
        "readonly",
        "",
      );
    }

    // The chevron toggle button should be unmounted while locked, so clicking
    // a Checked By input must NOT open a dropdown with other users.
    const firstCheckedBy = checkedByInputs.first();
    const checkedByContainer = firstCheckedBy.locator("xpath=ancestor::div[1]");
    await expect(
      checkedByContainer.locator("button"),
      "no chevron toggle while locked",
    ).toHaveCount(0);

    await firstCheckedBy.click({ force: true });
    await page.waitForTimeout(200);
    // No options list rendered.
    await expect(checkedByContainer.locator("div[class*=cursor-pointer]")).toHaveCount(
      0,
    );
  });
});
