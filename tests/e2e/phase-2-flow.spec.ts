import { test, expect } from "@playwright/test";
import { join } from "node:path";

/**
 * Phase 2 end-to-end: upload → run → human checkpoint → decision.
 *
 * The mock backend advances the run one task per poll and parks it at the
 * post_elucidation checkpoint, so the human gate is exercised for real
 * rather than simulated in the page.
 */
test.describe("phase 2 run lifecycle", () => {
  test("starts a run, pauses at the checkpoint, approves, and reaches results", async ({
    page,
  }) => {
    await page.goto("/upload");

    await page
      .locator('input[type="file"]')
      .setInputFiles(join(__dirname, "fixtures", "sample.mzML"));
    await expect(page.getByText("sample.mzML")).toBeVisible();

    await page.getByRole("button", { name: /start analysis/i }).click();
    await expect(page).toHaveURL(/\/analysis\/[^/]+$/);

    // The run must stop for human review before any authorised phase.
    const approval = page.getByRole("heading", { name: /approval required/i });
    await expect(approval).toBeVisible({ timeout: 15_000 });

    // Neither decision is possible without a typed reason.
    const approve = page.getByRole("button", { name: /approve and continue/i });
    await expect(approve).toBeVisible();
    await approve.click();
    await expect(
      page.getByText(/please give a reason of at least 10 characters/i)
    ).toBeVisible();

    await page
      .getByLabel(/reason for your decision/i)
      .fill("Top-1 candidate matches every diagnostic MS2 fragment; proceed.");
    await approve.click();

    await expect(approval).toBeHidden({ timeout: 15_000 });

    // Approval resumes the run; it completes without further human input.
    await expect(
      page.getByRole("heading", { name: /run complete/i })
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^View results$/i }).click();
    await expect(page).toHaveURL(/\/results\/[^/]+$/);
  });

  test("rejecting at the checkpoint halts the run and records the reason", async ({
    page,
  }) => {
    await page.goto("/upload");
    await page
      .locator('input[type="file"]')
      .setInputFiles(join(__dirname, "fixtures", "sample.mzML"));
    await page.getByRole("button", { name: /start analysis/i }).click();

    await expect(
      page.getByRole("heading", { name: /approval required/i })
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByLabel(/reason for your decision/i)
      .fill("MS2 coverage is too sparse to justify novel generation.");
    await page.getByRole("button", { name: /reject and stop/i }).click();

    await expect(
      page.getByRole("heading", { name: /run failed/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/checkpoint_rejected/i).first()
    ).toBeVisible();
    // Polling stops on a terminal run; the checkpoint never returns.
    await expect(
      page.getByRole("heading", { name: /approval required/i })
    ).toBeHidden();
  });

  test("pause stops polling and leaves the run resumable", async ({ page }) => {
    await page.goto("/upload");
    await page
      .locator('input[type="file"]')
      .setInputFiles(join(__dirname, "fixtures", "sample.mzML"));
    await page.getByRole("button", { name: /start analysis/i }).click();

    await expect(page).toHaveURL(/\/analysis\/[^/]+$/);
    // The button is enabled as soon as the run query resolves.
    const pause = page.getByRole("button", { name: /pause this run/i });
    await expect(pause).toBeEnabled({ timeout: 15_000 });
    await pause.click();

    await expect(page.getByLabel(/Status: Paused/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("run_paused")).toBeVisible();
  });
});
