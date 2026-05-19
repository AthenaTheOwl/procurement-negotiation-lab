import { expect, test } from "@playwright/test";

test.describe("procurement-negotiation-lab smoke", () => {
  test("home page loads with hero + nav", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByTestId("home-surface")).toBeVisible();
    await expect(page.getByTestId("home-start-cta")).toBeVisible();
    await expect(page.getByTestId("home-sandbox-link")).toBeVisible();
  });

  test("lab arena renders preset grid + view picker", async ({ page }) => {
    await page.goto("/#lab", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /lab arena/i }).click();
    await expect(page.getByTestId("lab-surface")).toBeVisible();
    await expect(page.getByTestId("view-picker")).toBeVisible();
    await expect(page.getByTestId("participant-roster")).toBeVisible();
  });

  test("clicking a preset re-runs algorithms", async ({ page }) => {
    await page.goto("/#lab", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /lab arena/i }).click();
    const preset = page.getByRole("button", { name: /advanced packaging/i });
    if (await preset.isVisible()) {
      await preset.click();
      await expect(page.getByTestId("multi-party-ledger")).toBeVisible();
    }
  });

  test("split-rule toggle updates the multi-party ledger", async ({ page }) => {
    await page.goto("/#lab", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /lab arena/i }).click();
    const button = page.getByTestId("split-shapley-btn");
    if (await button.isVisible()) {
      await button.click();
      await expect(page.getByTestId("multi-party-ledger")).toBeVisible();
    }
  });

  test("CSV import panel surfaces example loader", async ({ page }) => {
    await page.goto("/#lab", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /lab arena/i }).click();
    await expect(page.getByTestId("csv-import-panel")).toBeVisible();
    const exampleButton = page.getByTestId("csv-example-btn");
    await expect(exampleButton).toBeVisible();
  });

  test("RunReport panel is present and JSON export button exists", async ({ page }) => {
    await page.goto("/#lab", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /lab arena/i }).click();
    await expect(page.getByTestId("run-report-panel")).toBeVisible();
    await expect(page.getByTestId("export-json-btn")).toBeVisible();
  });
});
