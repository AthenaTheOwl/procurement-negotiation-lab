import { describe, expect, it } from "vitest";
import { scenarioPresets, presetById } from "./scenarios";
import { algorithmResults, makeScenario, multiPartyLedger } from "../model/simulation";
import { deriveParticipants } from "../model/participants";

const NEW_SCENARIOS = [
  "advanced-packaging-bottleneck",
  "export-control-shock",
  "hyperscaler-surge",
  "distributor-floats-inventory",
  "audit-catches-misreport",
];

describe("scenario presets", () => {
  it("includes the original six plus five new scenarios", () => {
    expect(scenarioPresets.length).toBeGreaterThanOrEqual(11);
    for (const id of NEW_SCENARIOS) {
      expect(scenarioPresets.find((preset) => preset.id === id)).toBeDefined();
    }
  });

  it("each new scenario produces algorithm results and a non-empty multi-party ledger", () => {
    for (const id of NEW_SCENARIOS) {
      const scenario = makeScenario({ presetId: id });
      const preset = presetById(id);
      expect(preset.soWhat.length).toBeGreaterThan(0);
      const runs = algorithmResults(scenario);
      expect(runs.length).toBeGreaterThan(0);
      const participants = deriveParticipants(scenario);
      expect(participants.length).toBe(scenario.participantCount);
      const rows = multiPartyLedger(scenario);
      expect(rows.length).toBe(participants.length);
    }
  });

  it("multi-party scenarios actually have 3+ participants", () => {
    for (const id of [
      "advanced-packaging-bottleneck",
      "export-control-shock",
      "hyperscaler-surge",
      "distributor-floats-inventory",
    ]) {
      const scenario = makeScenario({ presetId: id });
      const participants = deriveParticipants(scenario);
      expect(participants.length).toBeGreaterThanOrEqual(3);
    }
  });
});
