import { test, expect } from "@playwright/test";
import { join } from "node:path";

/**
 * Unauthenticated entry: value proposition + sign-in + demo, all before any
 * redirect. The mock-auth build signs in locally (no popup), so the test
 * signs out through the user menu to reach the landing first — which also
 * exercises the sign-out flow.
 */
test.describe("upload entry (unauthenticated)", () => {
  test("shows the value proposition and demo path before sign-in", async ({
    page,
  }) => {
    await page.goto("/upload");

    // Mock mode auto-authenticates; sign out to reach the public landing.
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await expect(
      page.getByRole("heading", {
        name: /upload your nmr \/ lc-ms data and receive evidence-graded structural hypotheses/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with google/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with email/i })
    ).toBeVisible();
    await expect(page.getByText(/Your data stays yours\./)).toBeVisible();

    // Demo path: opens the sample report without an account.
    await page.getByRole("button", { name: /see a sample analysis/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(/Sample analysis — demonstration data/i)
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /assembled report/i })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

/**
 * Happy path: upload a spectra file, start the analysis, and land on the
 * run's analysis page. The mock backend is enabled by the Playwright
 * webServer env (NEXT_PUBLIC_USE_MOCKS=true), so no external services run.
 */
test("uploads a spectra file and starts an analysis run", async ({ page }) => {
  await page.goto("/upload");

  // Mock mode authenticates immediately; the workspace heading appears.
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

  // The run pauses for human review before any novel generation. The mock
  // advances one task per poll, so allow time for it to reach the gate.
  await expect(
    page.getByRole("heading", { name: /approval required/i })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("button", { name: /approve and continue/i })
  ).toBeVisible();
});