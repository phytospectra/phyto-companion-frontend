import { test, expect } from "@playwright/test";

/**
 * Insufficient-token flow: the Billing page's demo button raises a 402,
 * the global modal opens, and its CTA routes back to /billing.
 */
test("shows the insufficient-tokens modal on a 402 and routes to billing", async ({
  page,
}) => {
  await page.goto("/billing");

  await page.getByRole("button", { name: /simulate 402/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/insufficient tokens/i)).toBeVisible();

  // Balance and requirement are stated explicitly — never a bare error.
  await expect(dialog.getByText("Balance", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Required", { exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: /go to billing/i }).click();
  await expect(page).toHaveURL(/\/billing$/);
});
