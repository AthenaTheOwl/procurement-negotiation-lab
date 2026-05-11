import { describe, it, expect } from "vitest";
import { makeScenario } from "./simulation";
import { deriveParticipants, participantsByRole } from "./participants";

describe("deriveParticipants", () => {
  it("returns exactly 2 participants for the default scenario", () => {
    const scenario = makeScenario();
    const participants = deriveParticipants(scenario);
    expect(participants).toHaveLength(2);
    expect(participants[0].role).toBe("buyer");
    expect(participants[1].role).toBe("supplier");
  });

  it("respects participantCount when synthesizing N parties", () => {
    const scenario = makeScenario({ participantCount: 5 });
    const participants = deriveParticipants(scenario);
    expect(participants.length).toBe(5);
    expect(participantsByRole(participants, "buyer")).toHaveLength(1);
    expect(participantsByRole(participants, "supplier").length).toBeGreaterThanOrEqual(4);
  });

  it("uses explicit participants when provided", () => {
    const scenario = makeScenario({ participantCount: 3 });
    scenario.participants = [
      {
        id: "b",
        role: "buyer",
        name: "Buyer Inc",
        strategyId: "launch-protector-buyer",
        reliability: 0.9,
        parameters: { urgency: 0.6, flexibility: 0.5, truthfulness: 0.7, privacyPreference: 0.5, riskAversion: 0.6 },
        outsideOption: 7000,
      },
      {
        id: "s1",
        role: "supplier",
        name: "Supplier 1",
        strategyId: "capacity-guard-supplier",
        reliability: 0.85,
        parameters: { urgency: 0.4, flexibility: 0.4, truthfulness: 0.7, privacyPreference: 0.8, riskAversion: 0.7 },
      },
      {
        id: "s2",
        role: "supplier",
        name: "Supplier 2",
        strategyId: "yield-optimizer-supplier",
        reliability: 0.88,
        parameters: { urgency: 0.4, flexibility: 0.55, truthfulness: 0.75, privacyPreference: 0.7, riskAversion: 0.65 },
      },
    ];
    const participants = deriveParticipants(scenario);
    expect(participants).toHaveLength(3);
    expect(participants[0].id).toBe("b");
  });
});
