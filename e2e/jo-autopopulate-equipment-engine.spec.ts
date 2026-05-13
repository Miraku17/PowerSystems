/**
 * Regression: spec #14 sub-note — equipment + engine fields auto-populate
 * on Fill-Up forms when a JO is selected.
 *
 * Seeds a JO with non-empty equipment_model / equipment_number /
 * engine_model / esn, sets status='In-Progress' (the autocomplete only
 * surfaces In-Progress JOs), then drives the Deutz Service form in the
 * browser: open Fill Up Form → Deutz Service → type into the JO
 * autocomplete → click the seeded JO → assert each target form field
 * holds the JO's value.
 *
 * Requires the linked Supabase to be `--linked` to the dev environment
 * (defaults to local Supabase if PSI_E2E_SUPABASE_URL is unset).
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const SERVICE_KEY = process.env.PSI_E2E_SUPABASE_SERVICE_KEY || "";
const SUPABASE_URL =
  process.env.PSI_E2E_SUPABASE_URL || "http://127.0.0.1:54321";

const ADMIN1_EMAIL = process.env.PSI_E2E_A1_EMAIL || "admin1@powersystems";
const ADMIN1_PASSWORD = process.env.PSI_E2E_A1_PASSWORD || "password123";

async function loginAndSeedToken(apiCtx: APIRequestContext) {
  const res = await apiCtx.post("/api/auth/login", {
    data: { email: ADMIN1_EMAIL, password: ADMIN1_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    token: body.data.access_token as string,
    user: body.data.user,
    userId: body.data.user.id as string,
  };
}

async function seedJo(
  apiCtx: APIRequestContext,
  createdBy: string,
  joNumber: string,
  equipmentModel: string,
  equipmentNumber: string,
  engineModel: string,
  esn: string,
): Promise<string> {
  const res = await apiCtx.post(`${SUPABASE_URL}/rest/v1/job_order_request_form`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      full_customer_name: `AUTOPOP CUSTOMER ${joNumber}`,
      reporting_branch: "Manila",
      date_prepared: new Date().toISOString().slice(0, 10),
      status: "In-Progress",
      shop_field_jo_number: joNumber,
      equipment_model: equipmentModel,
      equipment_number: equipmentNumber,
      engine_model: engineModel,
      esn,
      created_by: createdBy,
    },
  });
  expect(res.ok(), `seed JO: ${res.status()} ${await res.text()}`).toBeTruthy();
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0].id;
}

async function deleteJo(apiCtx: APIRequestContext, joId: string): Promise<void> {
  await apiCtx
    .delete(`${SUPABASE_URL}/rest/v1/job_order_request_form?id=eq.${joId}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    .catch(() => {});
}

test.describe("Fill-Up forms — auto-populate equipment + engine from JO", () => {
  test.beforeAll(() => {
    expect(
      SERVICE_KEY,
      "PSI_E2E_SUPABASE_SERVICE_KEY required",
    ).toBeTruthy();
  });

  test("Deutz Service form pre-fills engine + equipment when JO is picked", async ({
    page,
    context,
  }) => {
    const apiCtx = context.request;
    const { token, user, userId } = await loginAndSeedToken(apiCtx);

    const ts = Date.now();
    const joNumber = `AUTOPOP-${ts}`;
    const eqModel = "WASD81";
    const eqNumber = "ESF132876";
    const engModel = "TCD2013L04";
    const esn = "12345678";

    const joId = await seedJo(apiCtx, userId, joNumber, eqModel, eqNumber, engModel, esn);

    try {
      // Seed auth in the page session and clear any persisted Deutz draft so
      // the autopopulate effect actually runs against an empty form.
      await page.addInitScript(
        ({ token, user }) => {
          window.localStorage.setItem("authToken", token);
          window.localStorage.setItem("user", JSON.stringify(user));
          window.localStorage.removeItem("psi-deutz-service-form-draft");
        },
        { token, user },
      );

      // Navigate to Fill Up Form (Deutz Service is the default). Wait for
      // the network to go quiet so the Deutz form's dynamic-import + React
      // hydration finish before we interact with it (otherwise the first
      // controlled-input fill can land before the form's onChange handler
      // wires up, which causes false-flake).
      await page.goto("/dashboard/fill-up-form");
      await expect(
        page.getByRole("heading", { name: "Fill Up Form" }),
      ).toBeVisible({ timeout: 10_000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      // The Deutz Service form's JO autocomplete: type the seeded JO
      // number → wait for the 300ms-debounced /approved fetch to return →
      // click the matching dropdown row.
      const joInput = page.getByPlaceholder(/search by jo number or customer/i);
      await expect(joInput).toBeVisible({ timeout: 15_000 });

      await joInput.fill(joNumber);
      // The dropdown fetches every 300ms after the last keystroke. Allow up
      // to 15s for the seeded JO row to render — covers cold-start compile.
      const dropdownRow = page
        .locator("div.cursor-pointer", { hasText: joNumber })
        .first();
      await expect(dropdownRow).toBeVisible({ timeout: 15_000 });
      await dropdownRow.click();

      // After select, the form's engine + equipment inputs should hold
      // the JO's values. Deutz form names: engine_model, engine_serial_no,
      // equipment_model, equipment_serial_no.
      await expect(page.locator('input[name="engine_model"]')).toHaveValue(
        engModel,
        { timeout: 5_000 },
      );
      await expect(page.locator('input[name="engine_serial_no"]')).toHaveValue(
        esn,
      );
      await expect(page.locator('input[name="equipment_model"]')).toHaveValue(
        eqModel,
      );
      await expect(
        page.locator('input[name="equipment_serial_no"]'),
      ).toHaveValue(eqNumber);
    } finally {
      await deleteJo(apiCtx, joId);
    }
  });
});
