/**
 * Regression: Super Admin must be able to add, edit, AND delete customers.
 *
 * Background: the customers UI gates the Add / Edit / Delete buttons on
 * `customer_management.{write,edit,delete}`. Super Admin bypasses every
 * `hasPermission` check via the server-derived `isSuperAdmin` flag
 * (src/hooks/usePermissions.ts:45), so all three buttons must render.
 * The 69366f6 Customers refactor wired the buttons; this spec guards
 * Super Admin still sees ALL three (Admin 1 only gets Edit, per the
 * admin1-customers spec, since they lack the delete perm).
 *
 * Requires zhaztedv@gmail.com / password123 on local Supabase
 * (Position: Super Admin — same account used by the existing
 *  super-admin-job-order-request spec).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SA_EMAIL || "zhaztedv@gmail.com";
const PASSWORD = process.env.PSI_E2E_SA_PASSWORD || "password123";

test.describe("Super Admin — Customers add / edit / delete", () => {
  test("can add, edit, and delete a customer end-to-end", async ({
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
    expect(loginBody.data.user.position).toBe("Super Admin");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    const customerName = `SA E2E CUSTOMER ${Date.now()}`;
    const editedContact = "Edited By Super Admin E2E";

    // Seed a customer via the API so the row is deterministic.
    const createRes = await apiCtx.post("/api/customers", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customer: customerName,
        name: "Reporter Name",
        address: "123 SA Test St",
        equipment: "Engine",
        contactPerson: "Original Contact",
        email: "sa-original@example.com",
        phone: "555-1111",
      },
    });
    expect(createRes.ok(), "seed create").toBeTruthy();
    const createBody = await createRes.json();
    const customerId: string =
      createBody?.data?.id ?? createBody?.id ?? createBody?.data?.customer_id;
    expect(customerId).toBeTruthy();

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

    await page.goto("/dashboard/customers");
    await expect(page.getByText(customerName).first()).toBeVisible({
      timeout: 10_000,
    });

    // 1. Add button is present (canWrite("customer_management") → true via SA bypass).
    await expect(
      page.getByRole("button", { name: "Add Customer" }),
    ).toBeVisible();

    // 2. Both Edit pencil AND Delete trash on this customer row.
    const editBtn = page.getByRole("button", { name: `Edit ${customerName}` });
    const deleteBtn = page.getByRole("button", {
      name: `Delete ${customerName}`,
    });
    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();

    // 3. Edit flow — open modal, change Contact Person, save, assert PUT 200.
    await editBtn.click();
    const contactInput = page.getByPlaceholder("e.g. Jane Smith");
    await expect(contactInput).toBeVisible();
    await contactInput.fill(editedContact);

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
          r.url().includes(`/api/customers/${customerId}`) &&
          r.request().method() === "PUT",
        { timeout: 15_000 },
      ),
      page
        .getByRole("button", { name: "Save Changes", exact: true })
        .last()
        .click(),
    ]);
    expect(editResp.status()).toBe(200);
    await expect(
      page.getByText(/customer updated successfully/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // 4. Delete flow — click trash, confirm in modal, assert DELETE 200 and
    //    the row disappears.
    await deleteBtn.click();
    await expect(
      page.getByText(/are you sure you want to delete this customer/i),
    ).toBeVisible();

    const [delResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/customers/${customerId}`) &&
          r.request().method() === "DELETE",
        { timeout: 15_000 },
      ),
      page.getByRole("button", { name: "Delete", exact: true }).last().click(),
    ]);
    expect(delResp.status()).toBe(200);
    await expect(page.getByText(/customer deleted successfully/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Belt-and-braces: confirm the row is gone from the DB too. GET /api/customers
    // and assert the seeded id isn't in the response.
    const after = await apiCtx.get("/api/customers", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(after.ok()).toBeTruthy();
    const afterBody = (await after.json()) as { data?: Array<{ id: string }> };
    const stillPresent = (afterBody.data ?? []).some((c) => c.id === customerId);
    expect(stillPresent, "deleted customer no longer in /api/customers").toBe(false);
  });
});
