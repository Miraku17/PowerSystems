/**
 * Regression: Admin 1's actions on the Customers page.
 *
 *   - Admin 1 has `customer_management.{read,write,edit}` but NOT `.delete`.
 *   - UI must therefore show the pencil (edit) button but NOT the trash
 *     (delete) button on every customer row.
 *   - Clicking the pencil opens the edit modal pre-filled with the row's
 *     data and submitting it succeeds (PUT /api/customers/[id] → 200).
 *
 * Requirements:
 *   - Local dev server at PSI_E2E_BASE_URL (default http://localhost:3000),
 *     pointed at a local Supabase with admin1@powersystems / password123.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

const CUSTOMER_NAME = `ADMIN1 E2E CUSTOMER ${Date.now()}`;
const EDITED_CONTACT = "Edited By Admin1 E2E";

test.describe("Admin 1 — Customers actions", () => {
  test("can edit but cannot delete a customer", async ({ page, context }) => {
    const apiCtx = context.request;

    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), "login should succeed").toBeTruthy();
    const loginBody = await loginRes.json();
    const token: string = loginBody.data.access_token;
    expect(loginBody.data.user.position).toBe("Admin 1");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    // Seed a customer via the API so the row exists deterministically.
    const createRes = await apiCtx.post("/api/customers", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customer: CUSTOMER_NAME,
        name: "Reporter Name",
        address: "123 Test St",
        equipment: "Engine",
        contactPerson: "Original Contact",
        email: "original@example.com",
        phone: "555-0000",
      },
    });
    expect(createRes.ok(), "seed customer create").toBeTruthy();
    const created = await createRes.json();
    const customerId: string =
      created?.data?.id ?? created?.id ?? created?.data?.customer_id;
    expect(customerId, "seeded customer id present").toBeTruthy();

    // Surface server errors in test logs.
    page.on("response", (res) => {
      if (!res.ok() && res.url().includes("/api/customers")) {
        res
          .text()
          .then((body) =>
            console.log(
              `[server ${res.status()} ${res.request().method()}] ${body}`,
            ),
          )
          .catch(() => {});
      }
    });

    // Navigate to Customers page and locate the seeded row.
    await page.goto("/dashboard/customers");
    await expect(page.getByText(CUSTOMER_NAME).first()).toBeVisible({
      timeout: 10_000,
    });

    // Edit pencil must exist; Delete trash must NOT exist anywhere on the page
    // (Admin 1 lacks customer_management.delete).
    const editBtn = page.getByRole("button", {
      name: `Edit ${CUSTOMER_NAME}`,
    });
    await expect(editBtn).toBeVisible();
    await expect(
      page.locator('button[aria-label^="Delete "]'),
      "no delete buttons should be rendered for Admin 1",
    ).toHaveCount(0);

    // Open the edit modal and change Contact Person (placeholder-keyed input,
    // since labels aren't bound via htmlFor).
    await editBtn.click();
    const contactInput = page.getByPlaceholder("e.g. Jane Smith");
    await expect(contactInput).toBeVisible();
    await contactInput.fill(EDITED_CONTACT);

    // Submit the form → confirmation modal appears → confirm the update.
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .first()
      .click();
    await expect(
      page.getByText("Are you sure you want to save these changes?"),
    ).toBeVisible();

    const [editResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/customers/${customerId}`) &&
          res.request().method() === "PUT",
        { timeout: 15_000 },
      ),
      page
        .getByRole("button", { name: "Save Changes", exact: true })
        .last()
        .click(),
    ]);

    expect(editResponse.status(), "PUT /customers should succeed").toBe(200);
    await expect(
      page.getByText(/customer updated successfully/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Cleanup: delete via Postgres directly since Admin 1 has no delete perm.
    // We rely on the service role REST endpoint exposed by local Supabase.
    const serviceKey = process.env.PSI_E2E_SUPABASE_SERVICE_KEY;
    if (serviceKey) {
      await apiCtx
        .delete(
          `http://127.0.0.1:54321/rest/v1/customers?id=eq.${customerId}`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          },
        )
        .catch(() => {});
    }
  });
});
