import { expect, test } from "@playwright/test";
import { resetAndLogin } from "./helpers";

test("approves a queued deal, executes, and closes it as sold", async ({
  page,
}) => {
  await resetAndLogin(page);

  await page.goto("/approvals");
  const legoRow = page.locator("li", { hasText: "LEGO Technic 42145" }).first();
  await expect(legoRow).toBeVisible();

  // Refresh first (the item is seeded 18 minutes old), then approve.
  await legoRow.getByRole("button", { name: "Refresh" }).click();
  await legoRow.getByRole("button", { name: "Approve", exact: true }).click();

  // pending → executing → purchased → listed (TDD §5.4), surfaced via polling.
  await expect(legoRow.getByText(/listed/i)).toBeVisible({ timeout: 20_000 });

  // Close the loop: mark as sold at the estimated price.
  await legoRow.getByRole("button", { name: "Mark Sold" }).click();
  await page.getByRole("button", { name: "Confirm sale" }).click();
  await expect(
    page.getByText("Deal closed — profit recorded in your history."),
  ).toBeVisible();

  // The closure lands in Analytics as the newest history row.
  await page.goto("/analytics");
  await expect(
    page.getByRole("row", { name: /LEGO Technic 42145/ }).first(),
  ).toBeVisible();
});
