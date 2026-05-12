/**
 * Regression: JO Request "Verified By" field auto-fills with the logged-in
 * user's name + signature and locks the dropdown — preventing them from
 * stamping another user's stored signature.
 *
 * Background: SignatorySelect supports `autoFillForPositions`. When the
 * logged-in user's position matches, the field is auto-populated with their
 * name + signature_url and the dropdown chevron / clear button disappear.
 * Previously the JO form used hardcoded `filterPositions=[Admin 1, Admin 2,
 * Super Admin]` which let Admin 1 pick any other Admin's signature.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000),
 *     pointed at a local Supabase with admin1@powersystems / password123.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

test.describe("Admin 1 — JO Request Verified By lock", () => {
  test("auto-fills logged-in name and hides the dropdown chevron", async ({
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

    // Login payload doesn't ship firstname/lastname; pull the canonical fullName
    // from /api/users so the assertion stays correct if the DB record changes.
    const usersRes = await apiCtx.get("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersRes.ok(), "/api/users should succeed").toBeTruthy();
    const usersBody = await usersRes.json();
    const meRecord = (usersBody.data as Array<{ id: string; fullName: string }>).find(
      (u) => u.id === userId,
    );
    expect(meRecord, "logged-in user appears in /api/users").toBeTruthy();
    const expectedFullName = meRecord!.fullName;

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    await page.goto("/dashboard/job-order-request");

    // Locate the Verified By field by its uppercase label.
    const verifiedByLabel = page.getByText("Verified By", { exact: true }).last();
    await expect(verifiedByLabel).toBeVisible({ timeout: 10_000 });

    const verifiedByInput = page.locator('input[name="verified_by_name"]');
    await expect(verifiedByInput).toBeVisible();

    // 1) Auto-filled with the logged-in user's name.
    await expect(verifiedByInput).toHaveValue(expectedFullName, {
      timeout: 10_000,
    });

    // 2) Locked: readonly, and the dropdown chevron + clear (X) buttons are
    //    absent — both are conditioned on `!isLocked` inside SignatorySelect.
    await expect(verifiedByInput).toHaveAttribute("readonly", "");

    // The "Verified By" field is the last SignatorySelect on the page.
    // Within its container, neither the ChevronDown toggle nor the clear (X)
    // button should be rendered.
    const verifiedByContainer = verifiedByInput.locator("xpath=ancestor::div[1]");
    await expect(
      verifiedByContainer.locator("button"),
      "no dropdown chevron or clear button should be rendered when locked",
    ).toHaveCount(0);

    // 3) Clicking the input must NOT open a dropdown listing other users.
    await verifiedByInput.click({ force: true });
    // Wait a tick to ensure any dropdown would have rendered.
    await page.waitForTimeout(200);
    // No option list items appear (those are <button> children inside an
    // absolute-positioned dropdown panel beside the input).
    await expect(verifiedByContainer.locator("button")).toHaveCount(0);
  });
});
