/**
 * Regression: Finance must be able to view all 16 form-records folders.
 *
 * Before the perm grant, Finance only saw the Job Order Requests folder
 * because the records page (since 772a9f1) gates the entire folder list on
 * `form_records.read` and Finance held neither that nor `dts.access`.
 *
 * The grant_finance_form_records_read_and_dts_access.sql migration adds:
 *   - form_records.read  (all)  → opens every fill-up-form folder
 *   - dts.access         (all)  → unhides the Daily Time Sheets folder
 *
 * Requires finance@powersystems / password123 on local Supabase.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_FIN_EMAIL || "finance@powersystems";
const PASSWORD = process.env.PSI_E2E_FIN_PASSWORD || "password123";

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

test.describe("Finance — Form Records folder visibility", () => {
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
    expect(loginBody.data.user.position).toBe("Finance");

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

    expect(hidden, "Finance should see every folder").toEqual([]);
    expect(visible.length).toBe(ALL_FOLDERS.length);
  });
});
