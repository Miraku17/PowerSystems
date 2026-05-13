/**
 * Regression: Super User sees the Reports sidebar entry under the SYSTEM
 * section (anchored to "Reports" since Super User lacks audit_logs.read),
 * NOT under APPROVALS where Admin 1 / Admin 2 / Finance see it.
 *
 * Client run-through: "Place 'Reports' under 'SYSTEM'" (Super User context).
 *
 * Layout logic: `hasSystemAccess = isSuperAdmin || canRead("audit_logs")
 * || userPosition.toLowerCase() === "super user"`. When true, Reports is
 * placed in the SYSTEM cluster; otherwise in APPROVALS. For Super User
 * specifically, Audit Logs is filtered out (no `audit_logs.read`), so
 * Reports also carries the `section: "System"` prop to anchor the header.
 *
 * Requires aacanuto@powersystems / password123 on local Supabase
 * (Position: Super User).
 */
import { test, expect } from "@playwright/test";

const EMAIL = process.env.PSI_E2E_SU_EMAIL || "aacanuto@powersystems";
const PASSWORD = process.env.PSI_E2E_SU_PASSWORD || "password123";

test.describe("Super User — Reports placement", () => {
  test("Reports appears under SYSTEM (not APPROVALS), no Audit Logs link", async ({
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
    expect(loginBody.data.user.position).toBe("Super User");

    await page.addInitScript(
      ({ token, user }) => {
        window.localStorage.setItem("authToken", token);
        window.localStorage.setItem("user", JSON.stringify(user));
      },
      { token, user: loginBody.data.user },
    );

    await page.goto("/dashboard/overview");
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
    // Wait for the Reports nav entry to render (proxy for sidebar finishing
    // its permission-driven filter pass).
    await expect(
      sidebar.getByRole("button", { name: /^Reports$/ }),
    ).toBeVisible({ timeout: 10_000 });

    // 1. The SYSTEM section header must render.
    await expect(
      sidebar.getByText("System", { exact: true }),
      "SYSTEM section header must render for Super User",
    ).toBeVisible();

    // 2. Audit Logs entry must NOT render (Super User lacks audit_logs.read
    //    on local — same as Admin 2).
    await expect(
      sidebar.getByRole("button", { name: /Audit Logs/ }),
      "Audit Logs button must not render for Super User without the perm",
    ).toHaveCount(0);

    // 3. Determine Reports placement by walking the rendered DOM. Each
    //    sidebar item is a top-level <div> child of <nav>; if the item
    //    declares a `section`, its wrapper also includes the section
    //    header text. Iterate through the nav's direct children and track
    //    the most-recent section label; when we reach the Reports row,
    //    that's its section.
    const reportsBtn = sidebar.getByRole("button", { name: /^Reports$/ });
    await expect(reportsBtn).toHaveCount(1);

    const nearestSection = await sidebar.evaluate(() => {
      const SECTION_LABELS = ["Main Menu", "Forms", "Leave", "Approvals", "System"];
      const nav = document.querySelector("aside nav");
      if (!nav) return null;
      let current: string | null = null;
      for (const child of Array.from(nav.children)) {
        const text = (child.textContent || "").trim();
        for (const label of SECTION_LABELS) {
          if (text.startsWith(label)) {
            current = label;
            break;
          }
        }
        // Check if this child contains the Reports button.
        const buttons = child.querySelectorAll("button");
        for (const b of Array.from(buttons)) {
          if ((b.textContent || "").trim() === "Reports") {
            return current;
          }
        }
      }
      return current;
    });
    expect(
      nearestSection,
      "Reports must be under SYSTEM for Super User",
    ).toBe("System");
  });
});
