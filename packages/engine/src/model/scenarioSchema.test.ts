import { describe, it, expect } from "vitest";
import { makeScenario } from "./simulation";
import { parseScenario, parseScenarioOrThrow, SCHEMA_VERSION } from "./scenarioSchema";

describe("scenarioSchema", () => {
  it("accepts a baseline scenario from makeScenario", () => {
    const scenario = makeScenario();
    const result = parseScenario({
      ...scenario,
      schemaVersion: SCHEMA_VERSION,
      splitRule: "proportional",
      provenance: { source: "synthetic", citations: [] },
    });
    expect(result.ok).toBe(true);
    expect(result.data?.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects an invalid scenario with field-path errors", () => {
    const result = parseScenario({
      schemaVersion: SCHEMA_VERSION,
      presetId: "",
      demand: -10,
      volatility: 0.2,
      capacityTightness: 0.5,
      leadTimeWeeks: 0,
      fulfillmentCenterCount: 1,
      participantCount: 2,
      productCount: 1,
      periodCount: 1,
      infoMode: "private",
      buyerAgentId: "x",
      supplierAgentId: "y",
      customBuyerUrgency: 0.5,
      customSupplierFlexibility: 0.5,
      customTruthfulness: 0.5,
      customPrivacyPreference: 0.5,
      customRiskAversion: 0.5,
      alpha: 0.5,
      buyerReliability: 1,
      supplierReliability: 1,
      epsilon: 0.05,
    });
    expect(result.ok).toBe(false);
    const fields = result.errors?.map((e) => e.path) ?? [];
    expect(fields).toContain("presetId");
    expect(fields).toContain("demand");
    expect(fields).toContain("leadTimeWeeks");
  });

  it("rejects participants whose count mismatches participantCount", () => {
    const scenario = makeScenario({ participantCount: 3 });
    const result = parseScenario({
      ...scenario,
      schemaVersion: SCHEMA_VERSION,
      participants: [
        {
          id: "buyer",
          role: "buyer",
          name: "Buyer",
          strategyId: "launch-protector-buyer",
          reliability: 1,
          parameters: {
            urgency: 0.5,
            flexibility: 0.5,
            truthfulness: 0.5,
            privacyPreference: 0.5,
            riskAversion: 0.5,
          },
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.[0].path).toMatch(/participants/);
  });

  it("parseScenarioOrThrow throws with field info on invalid input", () => {
    expect(() => parseScenarioOrThrow({ presetId: "x" })).toThrow(/invalid scenario/);
  });
});
