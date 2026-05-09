/**
 * Smoke test for the "Install for offline" button on /dashboard/pending-forms.
 *
 * Verifies:
 *   1. The button renders.
 *   2. Clicking it triggers the SW WARM_OFFLINE_CACHE message round-trip and
 *      shows a success toast.
 *   3. After clicking, the API_CACHE entry for /api/users is populated, so a
 *      subsequent offline read of /api/users would hit the SW cache.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000).
 *   - Super-Admin credentials via PSI_E2E_EMAIL / PSI_E2E_PASSWORD.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_EMAIL;
const PASSWORD = process.env.PSI_E2E_PASSWORD;

test.describe("Install for offline", () => {
  test.skip(!EMAIL || !PASSWORD, "set PSI_E2E_EMAIL and PSI_E2E_PASSWORD to run");

  test("button is visible and warms the SW cache", async ({ page, context }) => {
    // Real login so localStorage + cookies are populated.
    const apiCtx = context.request;
    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const token: string = (await loginRes.json()).data.access_token;

    await page.addInitScript(({ token }) => {
      window.localStorage.setItem("authToken", token);
    }, { token });

    await page.goto("/dashboard/pending-forms");
    await page.waitForLoadState("networkidle");

    // Wait for the SW to register and become the active controller.
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller !== null,
      { timeout: 10_000 }
    );

    const btn = page.getByRole("button", { name: /Install for offline/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await btn.click();

    // Wait for the success toast (react-hot-toast renders into the DOM).
    await expect(page.getByText(/Cached \d+ resource/i)).toBeVisible({ timeout: 15_000 });

    // The cache should now contain /api/users.
    const cached = await page.evaluate(async () => {
      const cache = await caches.open("psi-api-v1");
      const r = await cache.match("/api/users");
      return r ? r.status : null;
    });
    expect(cached, "expected /api/users in API cache after warm").toBe(200);
  });
});
