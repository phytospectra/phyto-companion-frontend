import { test, expect } from "@playwright/test";
import { join } from "node:path";

/**
 * Happy path: upload a spectra file, start the analysis, and land on the
 * run's analysis page. The mock backend is enabled by the Playwright
 * webServer env (NEXT_PUBLIC_USE_MOCKS=true), so no external services run.
 */
test("uploads a spectra file and starts an analysis run", async ({ page }) => {
  await page.goto("/upload");

  await expect(
    page.getByRole("heading", { name: /upload a sample/i })
  ).toBeVisible();

  await page
    .locator('input[type="file"]')
    .setInputFiles(join(__dirname, "fixtures", "sample.mzML"));

  await expect(page.getByText("sample.mzML")).toBeVisible();

  await page.getByRole("button", { name: /start analysis/i }).click();

  await expect(page).toHaveURL(/\/analysis\/[^/]+$/);
  await expect(page.getByRole("heading", { name: /analysis ·/i })).toBeVisible();

  // The run pauses for human review before any novel generation.
  await expect(page.getByText(/human review required/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /approve the checkpoint/i })
  ).toBeVisible();
});
