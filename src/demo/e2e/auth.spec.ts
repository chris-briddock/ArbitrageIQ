import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, resetAndLogin } from "./helpers";

test("rejects invalid credentials with an inline error", async ({ page }) => {
  await page.request.post("/api/demo/reset");
  await page.goto("/auth/login");
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", "Wrong!Password1");
  await page.click("button[type=submit]");

  await expect(
    page.getByText("Email or password is incorrect."),
  ).toBeVisible();
});

test("signs in with MFA and gates app routes", async ({ page }) => {
  await resetAndLogin(page);

  // Session established — the live feed renders deals.
  await expect(page.getByText("Active Deals", { exact: true })).toBeVisible();

  // Signing out locks the app routes again.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/auth/login");
  await page.goto("/approvals");
  await page.waitForURL(/auth\/login/);
});
