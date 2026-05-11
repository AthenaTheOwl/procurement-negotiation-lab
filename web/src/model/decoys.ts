import { algorithmResults, effectiveCapacity, makeScenario } from "./simulation";
import type { DecoyAuditResult, LabScenario } from "./types";

interface DecoySpec {
  id: string;
  title: string;
  scenario: LabScenario;
  expectedPattern: string;
  catchesMisreportKind: string;
  evaluate: (scenario: LabScenario) => { match: boolean; actualPattern: string; explanation: string };
}

export const decoys: DecoySpec[] = [
  {
    id: "cheap-routing-known",
    title: "Cheap routing known",
    scenario: makeScenario({
      presetId: "regional-shipping-asymmetry",
      infoMode: "cost-band",
      fulfillmentCenterCount: 5,
      supplierReliability: 0.96,
    }),
    expectedPattern: "CPP+VCG should beat price-only when routing economics matter.",
    catchesMisreportKind: "FC-bias or routing-cost misreporting",
    evaluate: (scenario) => {
      const runs = algorithmResults(scenario);
      const vcg = runs.find((run) => run.id === "cpp-vcg");
      const priceOnly = runs.find((run) => run.id === "price-only");
      const match = Boolean(
        scenario.infoMode === "cost-band" && vcg && priceOnly && vcg.oracleGap < priceOnly.oracleGap,
      );
      return {
        match,
        actualPattern: match ? "VCG recovered more routing value than price-only." : "Price-only looked better than VCG.",
        explanation:
          "When the cheap route is known, a quantity-only or price-only signal should not outperform the richer coordination rule.",
      };
    },
  },
  {
    id: "fragile-supplier-known",
    title: "Fragile supplier known",
    scenario: makeScenario({
      presetId: "multi-vendor-shortage",
      supplierReliability: 0.58,
      capacityTightness: 0.82,
    }),
    expectedPattern: "Effective supplier capacity should fall below stated capacity.",
    catchesMisreportKind: "Reliability-prior bypass attempts",
    evaluate: (scenario) => {
      const supplier = effectiveCapacity("supplier", scenario);
      const match = supplier.effective < supplier.stated;
      return {
        match,
        actualPattern: `${supplier.effective} effective units from ${supplier.stated} stated units.`,
        explanation:
          "The audit expects the planner to discount a fragile supplier instead of accepting stated capacity at face value.",
      };
    },
  },
  {
    id: "collusion-pattern",
    title: "Repeated high-quote pattern",
    scenario: makeScenario({
      presetId: "multi-vendor-shortage",
      customTruthfulness: 0.42,
      customPrivacyPreference: 0.9,
      participantCount: 4,
    }),
    expectedPattern: "Low truthfulness plus high privacy should create a warning pattern.",
    catchesMisreportKind: "Coordinated quote shading or collusive price posture",
    evaluate: (scenario) => {
      const match = scenario.customTruthfulness < 0.55 && scenario.customPrivacyPreference > 0.75;
      return {
        match,
        actualPattern: `truthfulness ${scenario.customTruthfulness.toFixed(2)}, privacy ${scenario.customPrivacyPreference.toFixed(2)}.`,
        explanation:
          "This decoy does not prove collusion; it catches the pattern that should trigger human review in a pilot.",
      };
    },
  },
  {
    id: "missing-capacity-pattern",
    title: "Missing capacity pattern",
    scenario: makeScenario({
      presetId: "substrate-crunch",
      supplierReliability: 0.62,
      capacityTightness: 0.9,
    }),
    expectedPattern: "Effective supplier capacity should be lower than expected demand.",
    catchesMisreportKind: "Capacity overpromise",
    evaluate: (scenario) => {
      const supplier = effectiveCapacity("supplier", scenario);
      const match = supplier.effective < scenario.demand;
      return {
        match,
        actualPattern: `${supplier.effective} effective units versus ${scenario.demand} demand.`,
        explanation:
          "If stated capacity cannot survive the reliability prior, the mechanism should flag the promise instead of hiding it inside a transfer.",
      };
    },
  },
  {
    id: "reliability-mismatch",
    title: "Reliability and lead-time mismatch",
    scenario: makeScenario({
      presetId: "substrate-crunch",
      supplierReliability: 0.52,
      leadTimeWeeks: 18,
      volatility: 0.46,
    }),
    expectedPattern: "Long lead time and high volatility should not carry a perfect reliability assumption.",
    catchesMisreportKind: "Inconsistent self-reported reliability",
    evaluate: (scenario) => {
      const stress = scenario.leadTimeWeeks >= 14 && scenario.volatility >= 0.35;
      const match = stress && scenario.supplierReliability < 0.8;
      return {
        match,
        actualPattern: `${scenario.leadTimeWeeks} week lead time, ${Math.round(
          scenario.volatility * 100,
        )}% volatility, ${Math.round(scenario.supplierReliability * 100)}% reliability.`,
        explanation:
          "The decoy catches configurations that claim high delivery certainty despite long lead times and volatile demand.",
      };
    },
  },
];

export function runDecoyAudit(baseScenario: LabScenario): DecoyAuditResult[] {
  return decoys.map((decoy) => {
    const isBehaviorPattern = decoy.id === "collusion-pattern";
    const scenario = makeScenario({
      ...decoy.scenario,
      buyerAgentId: baseScenario.buyerAgentId,
      supplierAgentId: baseScenario.supplierAgentId,
      customTruthfulness: isBehaviorPattern
        ? baseScenario.customTruthfulness
        : Math.min(decoy.scenario.customTruthfulness, baseScenario.customTruthfulness),
      customPrivacyPreference: isBehaviorPattern
        ? baseScenario.customPrivacyPreference
        : Math.max(decoy.scenario.customPrivacyPreference, baseScenario.customPrivacyPreference),
    });
    const outcome = decoy.evaluate(scenario);
    return {
      decoyId: decoy.id,
      title: decoy.title,
      match: outcome.match,
      expectedPattern: decoy.expectedPattern,
      actualPattern: outcome.actualPattern,
      catchesMisreportKind: decoy.catchesMisreportKind,
      explanation: outcome.explanation,
    };
  });
}
