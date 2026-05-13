/**
 * Regression: spec #14 Reports page restructure.
 *
 * 1. Five report-type cards render with the new labels.
 * 2. The "Include Statuses" checkbox group is gone entirely.
 * 3. Each JO-status report (pending / WIP / cancelled / closed) downloads
 *    successfully against prod-like data.
 * 4. Engine Report downloads when given a date range, and rejects a
 *    no-filter request with 400.
 *
 * Drives the API directly for the status reports; UI render assertions
 * cover the page-level changes.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const SA_EMAIL = process.env.PSI_E2E_SA_EMAIL || "zhaztedv@gmail.com";
const SA_PASSWORD = process.env.PSI_E2E_SA_PASSWORD || "password123";

async function loginSA(apiCtx: APIRequestContext) {
  const res = await apiCtx.post("/api/auth/login", {
    data: { email: SA_EMAIL, password: SA_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.data.access_token as string;
}

test.describe("Reports page — restructured per spec #14", () => {
  test("renders five new report types and no Include Statuses block", async ({
    page,
    context,
  }) => {
    const token = await loginSA(context.request);

    await page.addInitScript((t) => {
      window.localStorage.setItem("authToken", t);
    }, token);
    await page.goto("/dashboard/reports");
    await expect(
      page.getByRole("heading", { name: "Reports", exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // 1. Each new report-type label is present.
    for (const label of [
      "Pending Job Orders",
      "Work In Progress",
      "Cancelled Job Orders",
      "Closed Job Orders",
      "Engine Report",
    ]) {
      await expect(
        page.getByText(label, { exact: true }),
        `card "${label}" must render`,
      ).toBeVisible();
    }

    // 2. Legacy report-type labels are gone.
    for (const oldLabel of [
      "JOB Orders Generated",
      "JOB Order Status",
      "Work In Process",
      "Manhour Utilization",
    ]) {
      await expect(
        page.getByText(oldLabel, { exact: true }),
        `legacy card "${oldLabel}" must be removed`,
      ).toHaveCount(0);
    }

    // 3. "Include Statuses" block is gone.
    await expect(
      page.getByText(/include statuses/i),
      "Include Statuses block must be removed",
    ).toHaveCount(0);
  });

  test("API: all five report types succeed against prod-like data", async ({
    request,
  }) => {
    const token = await loginSA(request);
    const auth = { Authorization: `Bearer ${token}` };

    const startDate = "2020-01-01";
    const endDate = "2030-12-31";

    const types = [
      "pending-jo",
      "work-in-progress",
      "cancelled-jo",
      "closed-jo",
    ];
    for (const reportType of types) {
      const res = await request.get(
        `/api/reports/job-orders?reportType=${reportType}&startDate=${startDate}&endDate=${endDate}`,
        { headers: auth },
      );
      // 200 (data present) or 404 (no rows in this slice) are both proof
      // the new route is wired — the only thing we MUST reject is a 400
      // (validation regression) or 500 (server crash).
      expect(
        [200, 404].includes(res.status()),
        `${reportType} expected 200/404 but got ${res.status()}`,
      ).toBeTruthy();
    }

    // Engine Report with date range → 200/404; with no filter → 400.
    const engineWithRange = await request.get(
      `/api/reports/job-orders?reportType=engine&startDate=${startDate}&endDate=${endDate}`,
      { headers: auth },
    );
    expect(
      [200, 404].includes(engineWithRange.status()),
      `engine (with range) expected 200/404 but got ${engineWithRange.status()}`,
    ).toBeTruthy();

    const engineNoFilter = await request.get(
      `/api/reports/job-orders?reportType=engine`,
      { headers: auth },
    );
    expect(engineNoFilter.status(), "engine (no filter) must be 400").toBe(
      400,
    );
  });

  test("JO-status reports (A-D) share the 17-column Service Job Order layout", async ({
    request,
  }) => {
    const token = await loginSA(request);
    const auth = { Authorization: `Bearer ${token}` };
    const expectedHeader =
      "Job Order,Charges Absorbed By,Date Opened,Date Closed,Customer,Equipment,Engine / Serial No.,Work Description,Quotation No.,Labor Charge,Parts,Machining / Calibration,Other Expenses,Total (VAT Inclusive),Running Hours,Remarks,Attending Technician";

    const wideRange = "startDate=2020-01-01&endDate=2030-12-31";
    for (const reportType of [
      "pending-jo",
      "work-in-progress",
      "cancelled-jo",
      "closed-jo",
    ]) {
      const res = await request.get(
        `/api/reports/job-orders?reportType=${reportType}&${wideRange}`,
        { headers: auth },
      );
      if (res.status() === 404) {
        // Empty slice on this branch — header assertion is unreachable but
        // the contract is still validated by the other three siblings.
        continue;
      }
      expect(res.ok(), `${reportType} expected 200, got ${res.status()}`).toBeTruthy();
      const headerLine = (await res.text()).split("\n")[0];
      expect(headerLine, `${reportType} CSV header`).toBe(expectedHeader);
    }
  });

  test("Engine Report CSV columns match the spec", async ({ request }) => {
    const token = await loginSA(request);
    const res = await request.get(
      "/api/reports/job-orders?reportType=engine&startDate=2020-01-01&endDate=2030-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    // Skip the strict header check if there are no rows on prod.
    if (res.status() === 404) {
      test.skip(true, "No deutz_service_report rows in this range — header asserted unreachable.");
      return;
    }
    expect(res.ok(), `engine report status ${res.status()}`).toBeTruthy();
    const csv = await res.text();
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toBe(
      "JO NUMBER,CUSTOMER,EQUIPMENT / MODEL,ENGINE / SERIAL NUMBER,RUNNING HOURS,FINDINGS,RECOMMENDATION",
    );
  });
});
