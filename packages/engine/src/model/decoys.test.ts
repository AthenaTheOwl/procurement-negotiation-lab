import { describe, expect, it } from "vitest";
import { decoys, runDecoyAudit } from "./decoys";
import { makeScenario } from "./simulation";

describe("decoy audit library", () => {
  it("ships at least five named decoy scenarios with explanations", () => {
    expect(decoys.length).toBeGreaterThanOrEqual(5);
    for (const decoy of decoys) {
      expect(decoy.id).toMatch(/^[a-z-]+$/);
      expect(decoy.title.length).toBeGreaterThan(4);
      expect(decoy.expectedPattern.length).toBeGreaterThan(10);
      expect(decoy.catchesMisreportKind.length).toBeGreaterThan(6);
    }
  });

  it("runs every decoy against the current authored-agent configuration", () => {
    const rows = runDecoyAudit(makeScenario());
    expect(rows).toHaveLength(decoys.length);
    expect(rows.every((row) => row.expectedPattern && row.actualPattern)).toBe(true);
  });

  it("accepts each canonical decoy and rejects a canonical mismatch", () => {
    for (const decoy of decoys) {
      expect(decoy.evaluate(decoy.scenario).match).toBe(true);
      const mismatchScenario =
        decoy.id === "cheap-routing-known"
          ? makeScenario({ presetId: "regional-shipping-asymmetry", infoMode: "private", capacityTightness: 0.98 })
          : decoy.id === "fragile-supplier-known"
            ? makeScenario({ supplierReliability: 1 })
            : decoy.id === "collusion-pattern"
              ? makeScenario({ customTruthfulness: 0.96, customPrivacyPreference: 0.2 })
              : decoy.id === "missing-capacity-pattern"
                ? makeScenario({ demand: 220, supplierReliability: 1, capacityTightness: 0.2 })
                : makeScenario({ supplierReliability: 0.98, leadTimeWeeks: 6, volatility: 0.08 });
      expect(decoy.evaluate(mismatchScenario).match).toBe(false);
    }
  });

  it("flags the known collusion-pattern mismatch when the authored agent is highly truthful", () => {
    const rows = runDecoyAudit(
      makeScenario({
        customTruthfulness: 0.96,
        customPrivacyPreference: 0.2,
      }),
    );
    const collusion = rows.find((row) => row.decoyId === "collusion-pattern");
    expect(collusion?.match).toBe(false);
  });
});
