import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = "demo@arbitrageiq.com";
export const DEMO_PASSWORD = "Demo!Pass123";
export const DEMO_MFA_CODE = "000000";

/** Resets the mock store, then signs in through the UI including MFA. */
export async function resetAndLogin(page: Page): Promise<void> {
  await page.request.post("/api/demo/reset");

  await page.goto("/auth/login");
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", DEMO_PASSWORD);
  await page.click("button[type=submit]");

  // A pristine store always requires MFA after password login.
  await page.waitForURL(/auth\/mfa|dashboard/);
  if (page.url().includes("/auth/mfa")) {
    await page.fill("#code", DEMO_MFA_CODE);
    await page.click("button[type=submit]");
  }

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
