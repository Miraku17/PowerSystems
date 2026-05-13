/**
 * Regression: Super User must be able to read ALL form records folders
 * — including Daily Time Sheets.
 *
 * Background: Super User held only `form_records.read`. The records folder
 * page gates the DTS folder separately on `dts.access` (folders/page.tsx:152),
 * so Super User saw every folder except DTS. The
 * `grant_super_user_dts_access.sql` migration adds the missing perm and
 * unlocks the DTS folder, giving Super User the full 16-folder view.
 *
 * (If the deployed code is still pre-772a9f1, Super User would have seen
 *  only 1 folder — JO Requests — because the old gate hid every fill-up-
 *  form folder behind `fill_up_form.access`. That code change is already
 *  in main; this spec also confirms the post-fix behaviour.)
 *
 * Requires aacanuto@powersystems / password123 on local Supabase
 * (Position: Super User).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SU_EMAIL || "aacanuto@powersystems";
const PASSWORD = process.env.PSI_E2E_SU_PASSWORD || "password123";

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

test.describe("Super User — Form Records folder visibility", () => {
  test("sees every folder (including Daily Time Sheets)", async ({
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
    expect(loginBody.data.user.position).toBe("Super User");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    await page.goto("/dashboard/records/folders");
    await expect(
      page.getByText("Job Order Requests", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const headings = await page.locator("h3, h2").allTextContents();
    const visible = ALL_FOLDERS.filter((name) =>
      headings.some((t) => t.includes(name)),
    );
    const hidden = ALL_FOLDERS.filter((name) => !visible.includes(name));

    expect(hidden, "Super User should see every folder").toEqual([]);
    expect(visible.length).toBe(ALL_FOLDERS.length);
  });
});
