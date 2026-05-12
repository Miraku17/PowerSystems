/**
 * Regression: User 2 must see every Form Records folder EXCEPT
 * Daily Time Sheets.
 *
 * The bug this guards: the records folder list at
 * src/app/dashboard/records/folders/page.tsx used to hide every Fill-Up-Form
 * folder behind `fill_up_form.access` — conflating "can create new forms" with
 * "can view existing records." User 2 has `form_records.read=all` but no
 * `fill_up_form.access`, so they ended up seeing only the Job Order Requests
 * folder. The fix gates folder visibility on `form_records.read` and keeps the
 * DTS-specific `dts.access` exclusion.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000),
 *     pointed at a local Supabase with a "User 2" position seeded and
 *     user2@powersystems / password123 credentials.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_U2_EMAIL || "user2@powersystems";
const PASSWORD = process.env.PSI_E2E_U2_PASSWORD || "password123";

const ALL_FOLDERS = [
  "Job Order Requests",
  "Daily Time Sheets",
  "Deutz Service",
  "Deutz Commissioning",
  "Submersible Pump Commissioning",
  "Submersible Pump Service",
  "Submersible Pump Teardown",
  "Electric Surface Pump Commissioning",
  "Electric Surface Pump Service",
  "Engine Surface Pump Service",
  "Engine Surface Pump Commissioning",
  "Engine Teardown Report",
  "Electric Surface Pump Teardown",
  "Engine Inspection / Receiving",
  "Components Teardown Measuring",
  "Components Build-up Report",
];

test.describe("User 2 — Form Records folder visibility", () => {
  test("sees every folder except Daily Time Sheets", async ({
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
    expect(loginBody.data.user.position).toBe("User 2");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    await page.goto("/dashboard/records/folders");
    // Wait for at least one folder card to render — keying off the JO folder
    // which User 2 has unconditional read access to.
    await expect(
      page.getByText("Job Order Requests", { exact: true }).first(),
    ).toBeVisible();

    const headings = await page.locator("h3, h2").allTextContents();
    const visible = ALL_FOLDERS.filter((name) =>
      headings.some((t) => t.includes(name)),
    );
    const hidden = ALL_FOLDERS.filter((name) => !visible.includes(name));

    expect(hidden, "only Daily Time Sheets should be hidden").toEqual([
      "Daily Time Sheets",
    ]);
    expect(visible.length).toBe(ALL_FOLDERS.length - 1);
  });
});
