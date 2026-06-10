import { expect, test } from "@playwright/test";
import { resetAndLogin } from "./helpers";

test("creates a scan job that starts active with an immediate first run", async ({
  page,
}) => {
  await resetAndLogin(page);

  await page.goto("/scan-jobs");
  await expect(
    page.getByRole("heading", { name: "Scan Jobs" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New Scan Job" }).click();
  await page.fill("#keywords", "air fryer");
  await page.fill("#min_margin_pct", "25");
  await page.getByRole("button", { name: "Create scan job" }).click();

  await expect(
    page.getByText("Scan job created — first run dispatched."),
  ).toBeVisible();

  // The new job appears with the seeded four — five rows, newest active.
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  await expect(page.getByText("air fryer")).toBeVisible();
});
