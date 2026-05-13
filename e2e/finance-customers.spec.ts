/**
 * Regression: Finance must be able to add AND edit customers, but NOT
 * delete them.
 *
 * Background: Finance previously held only `customer_management.{read,edit}`,
 * so the Add Customer button was gated out (canWrite returned false). The
 * `grant_finance_customer_management_write.sql` migration adds the missing
 * `customer_management.write` row. Delete is intentionally NOT granted.
 *
 * Requires finance@powersystems / password123 on local Supabase (Position:
 * Finance).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_FIN_EMAIL || "finance@powersystems";
const PASSWORD = process.env.PSI_E2E_FIN_PASSWORD || "password123";

test.describe("Finance — Customers add + edit (no delete)", () => {
  test("sees Add and Edit, does not see Delete; full add+edit cycle works", async ({
    page,
    context,
  }) => {
    const apiCtx = context.request;

    const loginRes = await apiCtx.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), "Finance login should succeed").toBeTruthy();
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

    page.on("response", (res) => {
      if (!res.ok() && res.url().includes("/api/customers")) {
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

    // Seed a customer via the API so the edit step has a deterministic row.
    const seedName = `FINANCE E2E SEEDED ${Date.now()}`;
    const seedRes = await apiCtx.post("/api/customers", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customer: seedName,
        name: "Reporter Name",
        address: "Seed Address",
        equipment: "Engine",
        contactPerson: "Original Contact",
        email: "seed@example.com",
        phone: "555-2222",
      },
    });
    expect(seedRes.ok(), "seed POST /api/customers").toBeTruthy();
    const seedBody = await seedRes.json();
    const seededId: string =
      seedBody?.data?.id ?? seedBody?.id ?? seedBody?.data?.customer_id;
    expect(seededId).toBeTruthy();

    await page.goto("/dashboard/customers");
    await expect(page.getByText(seedName).first()).toBeVisible({
      timeout: 10_000,
    });

    // 1. Add Customer button MUST render (canWrite via new perm grant).
    await expect(
      page.getByRole("button", { name: "Add Customer" }),
      "Add Customer button must render for Finance",
    ).toBeVisible();

    // 2. Edit pencil MUST render on every customer row.
    await expect(
      page.getByRole("button", { name: `Edit ${seedName}` }),
      "Edit pencil must render for Finance",
    ).toBeVisible();

    // 3. Delete trash must NOT render anywhere on the page.
    await expect(
      page.locator('button[aria-label^="Delete "]'),
      "no Delete buttons must render for Finance",
    ).toHaveCount(0);

    // 4. Full edit cycle: open modal, change contact, save, confirm.
    await page.getByRole("button", { name: `Edit ${seedName}` }).click();
    const contactInput = page.getByPlaceholder("e.g. Jane Smith");
    await expect(contactInput).toBeVisible();
    await contactInput.fill("Edited By Finance E2E");

    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .first()
      .click();
    await expect(
      page.getByText("Are you sure you want to save these changes?"),
    ).toBeVisible();

    const [editResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/customers/${seededId}`) &&
          r.request().method() === "PUT",
        { timeout: 15_000 },
      ),
      page
        .getByRole("button", { name: "Save Changes", exact: true })
        .last()
        .click(),
    ]);
    expect(editResp.status(), "Finance PUT /customers must succeed").toBe(200);
    await expect(
      page.getByText(/customer updated successfully/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // 5. Full add cycle: click Add Customer, fill the modal, submit.
    const addName = `FINANCE E2E ADDED ${Date.now()}`;
    await page.getByRole("button", { name: "Add Customer" }).click();
    await page.getByPlaceholder("e.g. Acme Corp").fill(addName);
    await page.getByPlaceholder("e.g. John Doe").fill("Finance Reporter");
    await page.getByPlaceholder("e.g. Generator X-100").fill("Finance Eqp");
    await page.getByPlaceholder("e.g. Jane Smith").fill("Finance Contact");
    await page.getByPlaceholder("Full address...").fill("Finance Address");

    await page
      .getByRole("button", { name: "Create Customer", exact: true })
      .click();
    await expect(
      page.getByText("Are you sure you want to create this customer?"),
    ).toBeVisible();

    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/customers") &&
          r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      page
        .getByRole("button", { name: "Create", exact: true })
        .last()
        .click(),
    ]);
    expect(createResp.status(), "Finance POST /customers must succeed").toBe(
      201,
    );
    await expect(
      page.getByText(/customer created successfully/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Cleanup: delete the two seeded rows using a service-role REST call
    // (Finance itself lacks delete; we go around).
    const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY;
    if (SERVICE_KEY) {
      const addedRes = await apiCtx.get("/api/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const after = (await addedRes.json()) as {
        data?: Array<{ id: string; customer: string }>;
      };
      const addedRow = (after.data ?? []).find((c) => c.customer === addName);
      const ids = [seededId];
      if (addedRow?.id) ids.push(addedRow.id);
      for (const id of ids) {
        await apiCtx
          .delete(
            `http://127.0.0.1:54321/rest/v1/customers?id=eq.${id}`,
            {
              headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
            },
          )
          .catch(() => {});
      }
    }
  });
});
