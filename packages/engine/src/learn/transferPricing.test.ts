import { describe, expect, it } from "vitest";
import {
  TRANSFER_METHODS,
  evaluateTransferPricing,
} from "./transferPricing";

describe("transferPricing", () => {
  it("ships the four pricing lenses used by the sandbox", () => {
    expect(TRANSFER_METHODS).toEqual([
      "surplus-share",
      "marginal-externality",
      "two-part-tariff",
      "vcg-style",
    ]);
  });

  it("positive surplus creates a feasible acceptance interval", () => {
    const result = evaluateTransferPricing({
      vendorIncrementalCost: 4000,
      platformBenefit: 11000,
      networkCongestionCost: 2000,
      splitAlpha: 0.5,
    });
    expect(result.feasible).toBe(true);
    expect(result.welfareSurplus).toBe(5000);
    expect(result.acceptanceMin).toBe(4000);
    expect(result.acceptanceMax).toBe(9000);
    expect(result.selectedTransfer).toBe(6500);
    expect(result.vendorNetGain).toBe(2500);
    expect(result.platformNetGain).toBe(2500);
    expect(result.budgetBalanced).toBe(true);
  });

  it("blocks negative-welfare plans instead of transfer-funding them", () => {
    const result = evaluateTransferPricing({
      vendorIncrementalCost: 9000,
      platformBenefit: 6000,
      networkCongestionCost: 1500,
    });
    expect(result.feasible).toBe(false);
    expect(result.selectedTransfer).toBe(0);
    expect(result.guardrail).toMatch(/negative-welfare plan/);
  });

  it("two-part tariff separates unit signal from fixed surplus sharing", () => {
    const result = evaluateTransferPricing({
      method: "two-part-tariff",
      units: 1000,
      capacityShadowPricePerUnit: 0.18,
      serviceCreditPerUnit: 0.11,
      timingPremiumPerUnit: 0.07,
      congestionChargePerUnit: 0.04,
      markdownRiskChargePerUnit: 0.03,
    });
    expect(result.components.map((component) => component.id)).toContain(
      "fixed-surplus",
    );
    const marginal = result.components
      .filter((component) => component.id !== "fixed-surplus")
      .reduce((sum, component) => sum + component.amount, 0);
    expect(marginal).toBeCloseTo(290, 5);
    expect(result.selectedTransfer).toBeGreaterThan(marginal);
  });

  it("VCG-style transfer stays inside the acceptance interval", () => {
    const result = evaluateTransferPricing({ method: "vcg-style" });
    expect(result.selectedTransfer).toBe(result.acceptanceMax);
    expect(result.selectedTransfer).toBeGreaterThanOrEqual(result.acceptanceMin);
    expect(result.selectedTransfer).toBeLessThanOrEqual(result.acceptanceMax);
  });
});
