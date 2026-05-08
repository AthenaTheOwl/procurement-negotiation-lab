import type { ScenarioPreset } from "../model/types";

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: "substrate-crunch",
    name: "Substrate crunch",
    oneLine: "A buyer needs long-lead substrate capacity before demand is certain.",
    soWhat: "Shows why waiting for certainty can destroy option value when supplier capacity disappears early.",
    defaults: {
      demand: 500,
      volatility: 0.26,
      capacityTightness: 0.72,
      leadTimeWeeks: 12,
      fulfillmentCenterCount: 3,
      participantCount: 2,
      productCount: 1,
      periodCount: 1,
      infoMode: "forecast-band",
      buyerAgentId: "launch-protector",
      supplierAgentId: "capacity-guard",
    },
  },
  {
    id: "regional-shipping-asymmetry",
    name: "Regional shipping asymmetry",
    oneLine: "The supplier can serve one region cheaply, but the buyer's JIT order does not encode that.",
    soWhat: "Makes the coordination gap visible: local FC orders can be expensive when vendor shipping economics are hidden.",
    defaults: {
      demand: 760,
      volatility: 0.18,
      capacityTightness: 0.55,
      leadTimeWeeks: 6,
      fulfillmentCenterCount: 5,
      participantCount: 2,
      productCount: 2,
      periodCount: 3,
      infoMode: "cost-band",
      buyerAgentId: "jit-buyer",
      supplierAgentId: "relationship-supplier",
    },
  },
  {
    id: "multi-vendor-shortage",
    name: "Multi-vendor shortage",
    oneLine: "Three suppliers compete for constrained product families across a rolling horizon.",
    soWhat: "Tests whether a mechanism still works once a clean two-agent negotiation becomes a multiparty planning problem.",
    defaults: {
      demand: 980,
      volatility: 0.34,
      capacityTightness: 0.86,
      leadTimeWeeks: 16,
      fulfillmentCenterCount: 4,
      participantCount: 4,
      productCount: 3,
      periodCount: 5,
      infoMode: "capacity-band",
      buyerAgentId: "launch-protector",
      supplierAgentId: "hard-bargainer",
    },
  },
];

export function presetById(id: string): ScenarioPreset {
  return scenarioPresets.find((preset) => preset.id === id) ?? scenarioPresets[0];
}
