/**
 * Regression: Super Admin must be able to upload AND rename product PDFs.
 *
 * Same code path as the Admin 1 fix in e4f77d4 — the front-end now talks
 * to /api/products (service-role under the hood) instead of calling
 * Supabase Storage directly with the anon-key browser client, which is
 * what produced the "new row violates row-level security policy" toast.
 * Super Admin's `isSuperAdmin` bypass plus the server-side
 * `products.{read,write}` permission gates both pass, so the upload +
 * rename + delete flow works identically.
 *
 * Requires zhaztedv@gmail.com / password123 on local Supabase.
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SA_EMAIL || "zhaztedv@gmail.com";
const PASSWORD = process.env.PSI_E2E_SA_PASSWORD || "password123";

const ORIGINAL_NAME_HUMAN = "super-admin-e2e-original.pdf";
const RENAMED_NAME_HUMAN = `super-admin-e2e-renamed-${Date.now()}`;

const MINIMAL_PDF_BYTES = Buffer.from(
  `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000053 00000 n
0000000098 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
148
%%EOF
`,
  "utf-8",
);

test.describe("Super Admin — Products upload + rename", () => {
  test("uploads a PDF, renames it, and cleans up via the API", async ({
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
    expect(loginBody.data.user.position).toBe("Super Admin");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    page.on("response", (res) => {
      if (!res.ok() && res.url().includes("/api/products")) {
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

    await page.goto("/dashboard/products");
    await expect(
      page.getByRole("heading", { name: "Products" }),
    ).toBeVisible({ timeout: 10_000 });

    const uploadResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/products") &&
        res.request().method() === "POST",
      { timeout: 15_000 },
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: ORIGINAL_NAME_HUMAN,
      mimeType: "application/pdf",
      buffer: MINIMAL_PDF_BYTES,
    });
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(201);
    const uploadBody = (await uploadResponse.json()) as {
      data: { name: string };
    };
    const storedName = uploadBody.data.name;
    expect(storedName).toMatch(/super-admin-e2e-original\.pdf$/);

    await expect(page.getByText(/Uploaded 1 file/i)).toBeVisible({
      timeout: 10_000,
    });

    const fileRow = page.locator("li", { hasText: storedName }).first();
    await expect(fileRow).toBeVisible();
    const renameBtn = fileRow.getByRole("button", {
      name: `Rename ${storedName}`,
    });
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    const renameInput = page.getByPlaceholder("Product reference sheet");
    await expect(renameInput).toBeVisible();
    await renameInput.fill(RENAMED_NAME_HUMAN);

    const renameResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/products/${encodeURIComponent(storedName)}`) &&
        res.request().method() === "PATCH",
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: "Save" }).click();
    const renameResponse = await renameResponsePromise;
    expect(renameResponse.status()).toBe(200);
    const renameBody = (await renameResponse.json()) as {
      data: { name: string };
    };
    expect(renameBody.data.name).toBe(`${RENAMED_NAME_HUMAN}.pdf`);

    await expect(page.getByText(/File renamed/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(`${RENAMED_NAME_HUMAN}.pdf`).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Cleanup via the API — Super Admin holds products.write.
    const delRes = await apiCtx.delete(
      `/api/products/${encodeURIComponent(`${RENAMED_NAME_HUMAN}.pdf`)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(delRes.ok()).toBeTruthy();
  });
});
