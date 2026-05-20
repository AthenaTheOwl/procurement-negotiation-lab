import { describe, expect, it } from "vitest";
import {
  DEFAULT_MENU_GUARDRAILS,
  DEFAULT_MENU_SIGNALS,
  SAMPLE_MODELS,
  certifyCoordinationModel,
  clearMenuAgreement,
  fallbackOrderForScope,
  generateMenuOptions,
  matchesScope,
  resolveCoordinationModel,
  scopeSpecificity,
} from "./modelStudio";

describe("modelStudio", () => {
  it("scores scope specificity by populated fields", () => {
    expect(scopeSpecificity({ vendor: "v", sku: "s", week: "w" })).toBe(3);
    expect(scopeSpecificity({})).toBe(0);
  });

  it("matches model scopes as partial constraints over a requested scope", () => {
    expect(
      matchesScope(
        { category: "electronics", marketplace: "US" },
        { category: "electronics", marketplace: "US", sku: "SKU-1" },
      ),
    ).toBe(true);
    expect(
      matchesScope(
        { category: "grocery", marketplace: "US" },
        { category: "electronics", marketplace: "US" },
      ),
    ).toBe(false);
  });

  it("returns a human-readable fallback path for the scope lattice", () => {
    expect(
      fallbackOrderForScope({
        vendor: "vendor_123",
        sku: "SKU-001",
        fc: "ABE8",
        week: "2026-W22",
        category: "electronics.accessories",
      }),
    ).toEqual([
      "SKU x vendor x FC x week",
      "category x vendor",
      "category default",
      "global default",
    ]);
  });

  it("resolves the most specific applicable model", () => {
    const resolution = resolveCoordinationModel(SAMPLE_MODELS, {
      vendor: "vendor_123",
      sku: "SKU-001",
      fc: "ABE8",
      week: "2026-W22",
      marketplace: "US",
      category: "electronics.accessories",
      contractType: "replenishment",
    });
    expect(resolution.selected?.modelId).toBe("vendor-123.sku-001.abe8.w22.v4");
    expect(resolution.candidates.length).toBe(3);
  });

  it("falls back to category when SKU-level model does not apply", () => {
    const resolution = resolveCoordinationModel(SAMPLE_MODELS, {
      vendor: "vendor_999",
      category: "electronics.accessories",
      marketplace: "US",
      contractType: "replenishment",
    });
    expect(resolution.selected?.modelId).toBe("category.electronics.flex-window.v2");
  });

  it("generates fast, standard, and flex menu options from cost signals", () => {
    const menu = generateMenuOptions(DEFAULT_MENU_SIGNALS);
    expect(menu.map((option) => option.optionId)).toEqual(["A", "B", "C"]);
    expect(menu[0].feePerUnit).toBeCloseTo(0.25);
    expect(menu[1].creditPerUnit).toBeCloseTo(0.03);
    expect(menu[2].creditPerUnit).toBeCloseTo(0.17);
  });

  it("reprices fast-window fees when capacity gets scarce", () => {
    const calm = generateMenuOptions({
      ...DEFAULT_MENU_SIGNALS,
      capacityShadowPricePerUnit: 0.05,
    });
    const scarce = generateMenuOptions({
      ...DEFAULT_MENU_SIGNALS,
      capacityShadowPricePerUnit: 0.3,
    });
    expect(scarce[0].feePerUnit).toBeGreaterThan(calm[0].feePerUnit);
  });

  it("certifies a well-formed model and menu under default guardrails", () => {
    const model = SAMPLE_MODELS[2];
    const checks = certifyCoordinationModel(model, generateMenuOptions());
    expect(checks.every((check) => check.pass)).toBe(true);
  });

  it("fails guardrails when fees exceed the configured maximum", () => {
    const menu = generateMenuOptions({
      ...DEFAULT_MENU_SIGNALS,
      capacityShadowPricePerUnit: 0.7,
    });
    const checks = certifyCoordinationModel(SAMPLE_MODELS[2], menu);
    expect(checks.find((check) => check.id === "guardrails")?.pass).toBe(false);
  });

  it("clears the highest-margin acceptable agreement", () => {
    const menu = generateMenuOptions();
    const agreement = clearMenuAgreement(menu, [
      { optionId: "A", maximumFeePerUnit: 0.3 },
      { optionId: "B", minimumCreditPerUnit: 0.02 },
      { optionId: "C", minimumCreditPerUnit: 0.2 },
    ]);
    expect(agreement.selected?.optionId).toBe("A");
    expect(agreement.contract?.quantity).toBe(1200);
    expect(agreement.rejected).toContainEqual({
      optionId: "C",
      reason: "credit below vendor range",
    });
  });

  it("can block all options under stricter margin guardrails", () => {
    const agreement = clearMenuAgreement(generateMenuOptions(), [], {
      ...DEFAULT_MENU_GUARDRAILS,
      minPlatformMarginPerUnit: 3,
    });
    expect(agreement.selected).toBeNull();
    expect(agreement.contract).toBeNull();
    expect(agreement.rejected.length).toBe(3);
  });
});
