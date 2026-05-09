/**
 * Smoke test for the editable Report Header.
 *
 * What it verifies (the regression we actually care about):
 *   When the Report Header content changes via the Super-Admin-gated API
 *   (the same endpoint the /dashboard/header-settings admin page calls),
 *   the header rendered on the printable forms (e.g. Fill Up Form) updates
 *   to reflect the new content.
 *
 * Why this shape:
 *   The admin page is wrapped by a dashboard layout with a brief redirect race
 *   on initial load that flakes UI-driven tests. The header settings form is
 *   itself a thin wrapper over PATCH /api/report-header. Driving the API
 *   exercises the same code path the page exercises, and avoids the layout race.
 *   The actual user-visible regression is the form rendering — that's what we
 *   assert in the browser.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000).
 *   - Super-Admin credentials via env vars PSI_E2E_EMAIL / PSI_E2E_PASSWORD.
 *   - One-time browser install: `npx playwright install chromium`.
 *
 * Run: `PSI_E2E_EMAIL=… PSI_E2E_PASSWORD=… npm run test:e2e`
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_EMAIL;
const PASSWORD = process.env.PSI_E2E_PASSWORD;

const TEST_COMPANY = "Power Systems, Incorporated (E2E DEMO)";
const TEST_EMAIL = "sales+e2e@psi-deutz.com";

interface HeaderContent {
  company_name: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  branches: string;
}

test.describe("Report Header (Super Admin editable)", () => {
  test.skip(!EMAIL || !PASSWORD, "set PSI_E2E_EMAIL and PSI_E2E_PASSWORD to run");

  test("editing header content via the API updates the header on a Fill Up form", async ({
    page,
    context,
  }) => {
    // Programmatic login. This sets the auth cookies on the browser context
    // AND gives us a bearer token for direct API calls.
    const apiCtx = context.request;
    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), "login should succeed").toBeTruthy();
    const token: string = (await loginRes.json()).data.access_token;

    // The app's axios interceptor reads the token from localStorage too,
    // so seed it before the first navigation.
    await page.addInitScript(({ token }) => {
      window.localStorage.setItem("authToken", token);
    }, { token });

    // Snapshot original header content so we can restore at the end.
    const snapshotRes = await apiCtx.get("/api/report-header", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(snapshotRes.ok()).toBeTruthy();
    const original: HeaderContent = (await snapshotRes.json()).data;

    // Apply the edit (this is the exact request the /dashboard/header-settings
    // page issues when the Super Admin clicks "Save"). It is gated server-side
    // so non-Super-Admins receive 403.
    const patchRes = await apiCtx.patch("/api/report-header", {
      headers: { Authorization: `Bearer ${token}` },
      data: { company_name: TEST_COMPANY, email: TEST_EMAIL },
    });
    expect(patchRes.ok(), "Super Admin PATCH should succeed").toBeTruthy();
    const patched: HeaderContent = (await patchRes.json()).data;
    expect(patched.company_name).toBe(TEST_COMPANY);
    expect(patched.email).toBe(TEST_EMAIL);

    try {
      // Now visit a form that mounts <ReportHeader/>. The default selection is
      // the Deutz Service Form. The header should reflect the just-saved values.
      await page.goto("/dashboard/fill-up-form");
      await expect(page.getByText(TEST_COMPANY)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(TEST_EMAIL)).toBeVisible();
    } finally {
      // Always restore, even if assertions failed above.
      const restoreRes = await apiCtx.patch("/api/report-header", {
        headers: { Authorization: `Bearer ${token}` },
        data: { company_name: original.company_name, email: original.email },
      });
      expect(restoreRes.ok(), "restore should succeed").toBeTruthy();
    }
  });
});
