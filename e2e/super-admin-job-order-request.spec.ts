/**
 * End-to-end UI smoke for Super Admin editing a Job Order Request.
 *
 * The client reports that Super Admin still cannot edit a JO from the
 * dashboard. The API-level tests pass — so this spec drives the real
 * browser the same way the client does:
 *  1. Programmatic login as Super Admin (seeds localStorage).
 *  2. Create a JO from /dashboard/job-order-request, filling Service
 *     Use Only fields + signatory dropdowns (the things a Super Admin
 *     uniquely can touch).
 *  3. Open the new JO in /dashboard/records/folders/job-order-request,
 *     click the pencil, change a non-gated field AND a Service Use Only
 *     cost, AND the JO number — then Save Changes.
 *  4. Assert the success toast.
 *  5. Clean up the test record.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000).
 *   - A Super Admin account with known creds:
 *       PSI_E2E_SA_EMAIL    (default: zhaztedv@gmail.com)
 *       PSI_E2E_SA_PASSWORD (default: password123)
 *
 * Run: `npm run test:e2e -- e2e/super-admin-job-order-request.spec.ts`
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SA_EMAIL || "zhaztedv@gmail.com";
const PASSWORD = process.env.PSI_E2E_SA_PASSWORD || "password123";

const CUSTOMER_NAME = "SA E2E CUSTOMER";
const EDITED_CONTACT = "Edited By Super Admin E2E";
const EDITED_PARTS_COST = "1234.56";

test.describe("Super Admin — JO Request create + edit", () => {
  test("can create and fully edit a Job Order Request via the UI", async ({
    page,
    context,
  }) => {
    const apiCtx = context.request;

    // --- Login + seed token --------------------------------------------------
    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), "login should succeed").toBeTruthy();
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

    // Surface server-side errors on failed JO requests so test logs explain
    // *why* a click didn't result in success, not just "toast never appeared."
    page.on("response", (res) => {
      if (
        !res.ok() &&
        res.url().includes("/api/forms/job-order-request")
      ) {
        res
          .text()
          .then((body) =>
            console.log(`[server ${res.status()} ${res.request().method()}] ${body}`),
          )
          .catch(() => {});
      }
    });

    let createdJoId: string | null = null;

    try {
      // --- Step 1: Create JO via the UI ------------------------------------
      await page.addInitScript(() => {
        window.localStorage.removeItem("psi-job-order-request-form-draft");
      });
      await page.goto("/dashboard/job-order-request");

      const customerInput = page
        .locator('input[name="full_customer_name"]')
        .first();
      await customerInput.waitFor({ state: "visible", timeout: 15_000 });

      // Wait for initial network fetches so React is past hydration.
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      await customerInput.fill(CUSTOMER_NAME);
      await page.keyboard.press("Escape"); // dismiss autocomplete dropdown

      await page.locator('input[name="address"]').fill("E2E Address");
      await page.locator('input[name="location_of_unit"]').fill("E2E Location");
      await page.locator('input[name="contact_person"]').fill("E2E Contact");
      await page.locator('input[name="telephone_numbers"]').fill("0000000000");
      await page.locator('textarea[name="particulars"]').fill("E2E particulars");
      await page.locator('input[name="equipment_model"]').fill("E2E Model");
      await page.locator('input[name="equipment_number"]').fill("E2E-001");
      await page.locator('input[name="engine_model"]').fill("E2E Engine");
      await page.locator('input[name="esn"]').fill("E2E-ESN");
      await page.locator('textarea[name="complaints"]').fill("E2E complaints");
      await page.locator('textarea[name="work_to_be_done"]').fill("E2E work");

      await expect(customerInput).toHaveValue(CUSTOMER_NAME);

      // Submit → confirm.
      const submitBtn = page.getByRole("button", { name: /Submit Job Order Request/i });
      await submitBtn.scrollIntoViewIfNeeded();
      await submitBtn.click();

      await expect(
        page.getByRole("heading", { name: /Confirm Submission/i }),
      ).toBeVisible({ timeout: 10_000 });

      const [createResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/forms/job-order-request") &&
            r.request().method() === "POST",
          { timeout: 20_000 },
        ),
        page.getByRole("button", { name: /^Confirm$/ }).click(),
      ]);
      expect(createResp.ok(), `POST failed: ${createResp.status()}`).toBeTruthy();

      await expect(
        page.getByText("Form submitted successfully!", { exact: false }),
      ).toBeVisible({ timeout: 15_000 });

      // --- Step 2: Edit the JO via the UI ----------------------------------
      await page.goto("/dashboard/records/folders/job-order-request");

      const row = page.locator("tr", { hasText: CUSTOMER_NAME }).first();
      await row.waitFor({ state: "visible", timeout: 15_000 });
      await row.getByTitle("Edit").click();

      // Wait for edit modal — it lazy-loads.
      const editContact = page.locator('input[name="contact_person"]').last();
      await editContact.waitFor({ state: "visible", timeout: 10_000 });
      await editContact.fill(EDITED_CONTACT);

      // Super Admin can edit the JO number — the input is enabled for them.
      const joNumberInput = page.locator('input[name="shop_field_jo_number"]').last();
      const joNumberBefore = await joNumberInput.inputValue();
      await joNumberInput.fill(`${joNumberBefore}-SA`);

      // And the Service Use Only parts_cost (gated to jo_service_use.edit).
      const partsCostInput = page.locator('input[name="parts_cost"]').last();
      await partsCostInput.scrollIntoViewIfNeeded();
      await partsCostInput.fill(EDITED_PARTS_COST);

      const [editResp] = await Promise.all([
        page.waitForResponse(
          (r) =>
            /\/api\/forms\/job-order-request\/[\w-]+/.test(r.url()) &&
            r.request().method() === "PATCH",
          { timeout: 20_000 },
        ),
        page.getByRole("button", { name: /Save Changes/i }).click(),
      ]);
      expect(editResp.ok(), `PATCH failed: ${editResp.status()}`).toBeTruthy();

      // Capture the edited record's id from the PATCH URL for cleanup.
      const match = editResp.url().match(/job-order-request\/([\w-]+)/);
      if (match) createdJoId = match[1];

      await expect(
        page.getByText("Job Order Request updated successfully!", { exact: false }),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      if (createdJoId) {
        await apiCtx
          .delete(`/api/forms/job-order-request/${createdJoId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => {
            /* best-effort cleanup */
          });
      }
    }
  });
});
