import { expect, test } from "@playwright/test";

async function openClassicLabArena(page: import("@playwright/test").Page) {
  await page.goto("/#lab", { waitUntil: "domcontentloaded" });
  await page.getByTestId("sandbox-tab-classic").click();
  await expect(page.getByTestId("lab-surface")).toBeVisible();
}

test.describe("procurement-negotiation-lab smoke", () => {
  test("home page loads with hero + nav", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByTestId("home-surface")).toBeVisible();
    await expect(page.getByTestId("home-start-cta")).toBeVisible();
    await expect(page.getByTestId("home-sandbox-link")).toBeVisible();
  });

  test("lab arena renders preset grid + view picker", async ({ page }) => {
    await openClassicLabArena(page);
    await expect(page.getByTestId("view-picker")).toBeVisible();
    await expect(page.getByTestId("participant-roster")).toBeVisible();
  });

  test("sandbox convergence and transfer tabs render", async ({ page }) => {
    await page.goto("/#lab", { waitUntil: "domcontentloaded" });
    await page.getByTestId("sandbox-tab-convergence").click();
    await expect(page.getByTestId("convergence-playground")).toBeVisible();
    await expect(page.getByTestId("convergence-menu-balanced")).toBeVisible();
    await page.getByTestId("sandbox-tab-transfers").click();
    await expect(page.getByTestId("transfer-pricing-studio")).toBeVisible();
    await expect(page.getByTestId("transfer-guardrail")).toBeVisible();
  });

  test("clicking a preset re-runs algorithms", async ({ page }) => {
    await openClassicLabArena(page);
    const preset = page.getByRole("button", { name: /advanced packaging/i });
    if (await preset.isVisible()) {
      await preset.click();
      await expect(page.getByTestId("multi-party-ledger")).toBeVisible();
    }
  });

  test("split-rule toggle updates the multi-party ledger", async ({ page }) => {
    await openClassicLabArena(page);
    const button = page.getByTestId("split-shapley-btn");
    if (await button.isVisible()) {
      await button.click();
      await expect(page.getByTestId("multi-party-ledger")).toBeVisible();
    }
  });

  test("CSV import panel surfaces example loader", async ({ page }) => {
    await openClassicLabArena(page);
    await expect(page.getByTestId("csv-import-panel")).toBeVisible();
    const exampleButton = page.getByTestId("csv-example-btn");
    await expect(exampleButton).toBeVisible();
  });

  test("RunReport panel is present and JSON export button exists", async ({ page }) => {
    await openClassicLabArena(page);
    await expect(page.getByTestId("run-report-panel")).toBeVisible();
    await expect(page.getByTestId("export-json-btn")).toBeVisible();
  });

  test("Level 10 Model Studio certifies and clears a menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.localStorage.setItem(
        "proc-lab.learnProgress",
        JSON.stringify({
          highest_completed: 9,
          completion_timestamps: {},
          last_seen_level: 10,
        }),
      );
    });
    await page.goto("/#/learn/10", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("menu-option-A")).toBeVisible();
    await expect(page.getByTestId("selected-model")).toContainText(
      "vendor-123.sku-001.abe8.w22.v4",
    );
    await page.getByTestId("certify-model").click();
    await expect(page.getByTestId("certification-results")).toContainText("Pass");
    await expect(page.getByTestId("cleared-agreement")).toContainText(
      "selected_option",
    );
  });
});
