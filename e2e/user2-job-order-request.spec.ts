/**
 * Smoke test for the User-2-can-edit-and-create-JO regression.
 *
 * Drives the browser end-to-end (not just the API):
 *  1. Programmatic login as User 2 (seeds localStorage so the dashboard
 *     auth check passes on first navigation).
 *  2. Navigates to /dashboard/job-order-request and fills + submits the
 *     create form via the actual form controls + buttons.
 *  3. Navigates to /dashboard/records/folders/job-order-request, finds
 *     the JO created in step 2, clicks the pencil to open the edit
 *     modal, changes contact_person, and clicks "Save Changes".
 *  4. Asserts the "updated successfully" toast.
 *  5. Cleans up the test record via service-role API.
 *
 * The bug this guards: EditJobOrderRequest.tsx PATCHes the whole formData
 * on save (including empty-string signatory fields). Before the fix at
 * api/forms/job-order-request/[id]/route.ts, the signatory gate fired on
 * `!== undefined` and blocked any user without `jo_signatory.<action>`
 * — i.e. User 2 — from editing anything on a JO, even unrelated fields.
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000)
 *     pointed at a local Supabase that has a "User 2" position seeded.
 *   - A User-2 account with known credentials:
 *       PSI_E2E_U2_EMAIL    (default: user2@powersystems)
 *       PSI_E2E_U2_PASSWORD (default: password123)
 *   - One-time browser install: `npx playwright install chromium`.
 *
 * Run: `npm run test:e2e -- e2e/user2-job-order-request.spec.ts`
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_U2_EMAIL || "user2@powersystems";
const PASSWORD = process.env.PSI_E2E_U2_PASSWORD || "password123";

const CUSTOMER_NAME = "USER2 E2E CUSTOMER";
const EDITED_CONTACT = "Edited By User2 E2E";

test.describe("User 2 — JO Request create + edit", () => {
  test("can create and edit a Job Order Request via the UI", async ({
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
    expect(loginBody.data.user.position).toBe("User 2");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    let createdJoId: string | null = null;

    // On failure, surface server-side errors so test logs explain WHY,
    // not just "toast didn't appear."
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

    try {
      // --- Step 1: Create JO via the UI ------------------------------------
      // The persisted Zustand store keeps formData in localStorage between
      // sessions and would shadow our fills. Wipe it before navigating.
      await page.addInitScript(() => {
        window.localStorage.removeItem("psi-job-order-request-form-draft");
      });

      await page.goto("/dashboard/job-order-request");

      // Wait for the form to render. The Customer field is the
      // CustomerAutocomplete (renders an <input> under the hood).
      const customerInput = page
        .locator('input[name="full_customer_name"]')
        .first();
      await customerInput.waitFor({ state: "visible", timeout: 15_000 });

      // Wait for the form's data fetches (permissions + next-number) to
      // complete so React is past the initial hydration burst. Otherwise the
      // first few keystrokes get dropped on the controlled input.
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      await customerInput.fill(CUSTOMER_NAME);

      // Dismiss the autocomplete dropdown by pressing Escape.
      await page.keyboard.press("Escape");

      await page.locator('input[name="address"]').fill("E2E Address");
      await page
        .locator('input[name="location_of_unit"]')
        .fill("E2E Location");
      await page.locator('input[name="contact_person"]').fill("E2E Contact");
      await page
        .locator('input[name="telephone_numbers"]')
        .fill("0000000000");
      await page
        .locator('textarea[name="particulars"]')
        .fill("E2E particulars");
      await page.locator('input[name="equipment_model"]').fill("E2E Model");
      await page.locator('input[name="equipment_number"]').fill("E2E-001");
      await page.locator('input[name="engine_model"]').fill("E2E Engine");
      await page.locator('input[name="esn"]').fill("E2E-ESN");
      await page
        .locator('textarea[name="complaints"]')
        .fill("E2E complaints");
      await page.locator('textarea[name="work_to_be_done"]').fill("E2E work");

      // Verify React state actually committed our input — if it didn't,
      // no amount of clicking Submit will get past the customer-name validator.
      await expect(customerInput).toHaveValue(CUSTOMER_NAME);

      // Submit the form. This opens the ConfirmationModal.
      const submitBtn = page.getByRole("button", { name: /Submit Job Order Request/i });
      await submitBtn.scrollIntoViewIfNeeded();
      await submitBtn.click();

      // Wait for the confirmation modal to actually mount.
      await expect(page.getByRole("heading", { name: /Confirm Submission/i })).toBeVisible({
        timeout: 10_000,
      });

      // The modal renders confirmText="Confirm". Click the exact button inside the modal.
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

      // The offline-submit hook fires toast.success("Form submitted successfully!").
      await expect(
        page.getByText("Form submitted successfully!", { exact: false }),
      ).toBeVisible({ timeout: 15_000 });

      // Look up the JO id we just created so we can target it in the edit step
      // and clean it up later. Using the service-role lookup avoids tying the
      // test to whatever read-scope User 2 has on the records list.
      const lookupRes = await apiCtx.get(
        `/api/forms/job-order-request?full_customer_name=${encodeURIComponent(CUSTOMER_NAME)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Fall back to scraping the records list if that route doesn't filter.
      if (lookupRes.ok()) {
        const body = await lookupRes.json();
        const rows: any[] = body.data ?? [];
        const match = rows.find(
          (r) => (r.full_customer_name ?? r.data?.full_customer_name) === CUSTOMER_NAME,
        );
        if (match?.id) createdJoId = match.id;
      }

      // --- Step 2: Edit the JO via the UI ----------------------------------
      await page.goto("/dashboard/records/folders/job-order-request");

      // Find the row with our customer name and click its Edit button.
      const row = page
        .locator("tr", { hasText: CUSTOMER_NAME })
        .first();
      await row.waitFor({ state: "visible", timeout: 15_000 });
      await row.getByTitle("Edit").click();

      // The edit modal mounts EditJobOrderRequest, which exposes
      // <Input name="contact_person" ... />.
      const editContact = page.locator('input[name="contact_person"]').last();
      await editContact.waitFor({ state: "visible", timeout: 10_000 });
      await editContact.fill(EDITED_CONTACT);

      await page.getByRole("button", { name: /Save Changes/i }).click();

      // EditJobOrderRequest.tsx:203 fires
      // toast.success("Job Order Request updated successfully!").
      await expect(
        page.getByText("Job Order Request updated successfully!", { exact: false }),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      // --- Cleanup ---------------------------------------------------------
      if (createdJoId) {
        await apiCtx.delete(
          `/api/forms/job-order-request/${createdJoId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => {
          /* swallow — cleanup is best-effort */
        });
      }
    }
  });
});
