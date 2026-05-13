/**
 * End-to-end smoke for Admin 1 and Admin 2 JO Request create + edit
 * AFTER the signatory auto-fill + lock fixes.
 *
 *   - Admin 1 (admin1@powersystems) has jo_signatory.{requested_by,
 *     approved_by, verified_by}.
 *   - Admin 2 (admin2dvo@powersystems) has jo_signatory.{requested_by,
 *     approved_by, service_dept, verified_by}.
 *
 * For each variant:
 *   1. Login + seed localStorage token.
 *   2. /dashboard/job-order-request → fill required customer name → submit.
 *      Auto-filled signatory fields must clear the server-side
 *      `jo_signatory.<action>` gates.
 *   3. Lookup the created record by customer name (service-role REST).
 *   4. /dashboard/records/folders/job-order-request → find the row → open
 *      the edit modal → change contact_person → confirm.
 *   5. Assert PATCH → 200 + "updated successfully" toast.
 *   6. Cleanup: delete the JO via service-role REST so re-runs stay clean.
 *
 * Regression guard: any of the auto-fill-lock changes
 * (00a7d7a / 25ff4da / 08bd031) reverting would surface as a 403 on the
 * POST signatory gate or a hung locator during the form interaction.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

interface Variant {
  label: string;
  email: string;
  password: string;
  position: string;
}

const variants: Variant[] = [
  {
    label: "Admin 1",
    email: process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems",
    password: process.env.PSI_E2E_A1_PASSWORD || "password123",
    position: "Admin 1",
  },
  {
    label: "Admin 2",
    email: process.env.PSI_E2E_A2_EMAIL || "admin2dvo@powersystems",
    password: process.env.PSI_E2E_A2_PASSWORD || "password123",
    position: "Admin 2",
  },
];

async function lookupJoByCustomer(
  apiCtx: APIRequestContext,
  customerName: string,
): Promise<string | null> {
  if (!SERVICE_KEY) return null;
  const res = await apiCtx.get(
    `${SUPABASE_URL}/rest/v1/job_order_request_form?full_customer_name=eq.${encodeURIComponent(customerName)}&select=id&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  );
  if (!res.ok()) return null;
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

async function deleteJoByServiceRole(
  apiCtx: APIRequestContext,
  joId: string,
): Promise<void> {
  if (!SERVICE_KEY) return;
  await apiCtx
    .delete(`${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${joId}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })
    .catch(() => {});
}

for (const variant of variants) {
  test.describe(`${variant.label} — JO Request create + edit`, () => {
    test("can create and edit a JO Request via the UI", async ({
      page,
      context,
    }) => {
      const apiCtx: APIRequestContext = context.request;

      const customerName = `${variant.label
        .toUpperCase()
        .replace(" ", "")} E2E ${Date.now()}`;
      const editedContact = `Edited by ${variant.label}`;

      // --- Login ----------------------------------------------------------
      const loginRes = await apiCtx.post("/api/auth/login", {
        data: { email: variant.email, password: variant.password },
      });
      expect(loginRes.ok(), `${variant.label} login`).toBeTruthy();
      const loginBody = await loginRes.json();
      const token: string = loginBody.data.access_token;
      expect(loginBody.data.user.position).toBe(variant.position);

      await page.addInitScript(
        ({ token, user }: { token: string; user: unknown }) => {
          window.localStorage.setItem("authToken", token);
          window.localStorage.setItem("user", JSON.stringify(user));
        },
        { token, user: loginBody.data.user },
      );

      page.on("response", (res) => {
        if (!res.ok() && res.url().includes("/api/forms/job-order-request")) {
          res
            .text()
            .then((body) =>
              console.log(
                `[server ${res.status()} ${res.request().method()}] ${res.url()} ${body}`,
              ),
            )
            .catch(() => {});
        }
      });

      let createdJoId: string | null = null;

      try {
        // --- Create -----------------------------------------------------
        await page.addInitScript(() => {
          window.localStorage.removeItem("psi-job-order-request-form-draft");
        });
        await page.goto("/dashboard/job-order-request");

        const customerInput = page
          .locator('input[name="full_customer_name"]')
          .first();
        await customerInput.waitFor({ state: "visible", timeout: 15_000 });
        await page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => {});
        await customerInput.fill(customerName);
        await page.keyboard.press("Escape");
        await expect(customerInput).toHaveValue(customerName);

        const submitBtn = page.getByRole("button", {
          name: /Submit Job Order Request/i,
        });
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
            { timeout: 25_000 },
          ),
          page.getByRole("button", { name: /^Confirm$/ }).click(),
        ]);
        expect(
          createResp.ok(),
          `${variant.label} POST failed: ${createResp.status()}`,
        ).toBeTruthy();

        await expect(
          page.getByText("Form submitted successfully!", { exact: false }),
        ).toBeVisible({ timeout: 15_000 });

        createdJoId = await lookupJoByCustomer(apiCtx, customerName);
        expect(
          createdJoId,
          `${variant.label} created JO row lookup`,
        ).toBeTruthy();

        // --- Edit -------------------------------------------------------
        await page.goto("/dashboard/records/folders/job-order-request");
        const row = page.locator("tr", { hasText: customerName }).first();
        await row.waitFor({ state: "visible", timeout: 15_000 });
        await row.getByTitle("Edit").click();

        // EditJobOrderRequest renders <Input name="contact_person" ... />.
        // `.last()` disambiguates from any other input still in the DOM.
        const editContact = page
          .locator('input[name="contact_person"]')
          .last();
        await editContact.waitFor({ state: "visible", timeout: 10_000 });
        await editContact.fill(editedContact);

        const [editResp] = await Promise.all([
          page.waitForResponse(
            (r) =>
              r
                .url()
                .includes(`/api/forms/job-order-request/${createdJoId}`) &&
              r.request().method() === "PATCH",
            { timeout: 25_000 },
          ),
          page.getByRole("button", { name: /Save Changes/i }).click(),
        ]);
        expect(
          editResp.ok(),
          `${variant.label} PATCH failed: ${editResp.status()}`,
        ).toBeTruthy();

        await expect(
          page.getByText(/updated successfully/i).first(),
        ).toBeVisible({ timeout: 15_000 });
      } finally {
        if (createdJoId) await deleteJoByServiceRole(apiCtx, createdJoId);
      }
    });
  });
}
