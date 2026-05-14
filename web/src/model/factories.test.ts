import { describe, expect, it } from "vitest";
import { buildParticipant, buildScenario, resetFactories } from "./factories";
import { parseScenario } from "./scenarioSchema";

describe("factories", () => {
  it("buildParticipant generates unique ids by default", () => {
    resetFactories();
    const a = buildParticipant();
    const b = buildParticipant();
    expect(a.id).not.toBe(b.id);
  });

  it("buildParticipant honors overrides", () => {
    const p = buildParticipant({ role: "packager", name: "Pack Inc" });
    expect(p.role).toBe("packager");
    expect(p.name).toBe("Pack Inc");
    expect(p.strategyId).toBe("packager-cowos");
  });

  it("buildScenario produces a scenario that passes schema validation", () => {
    const scenario = buildScenario();
    const result = parseScenario({
      ...scenario,
      schemaVersion: "0.5.0",
    });
    expect(result.ok).toBe(true);
  });

  it("buildScenario stamps default synthetic provenance", () => {
    const scenario = buildScenario();
    expect(scenario.provenance?.source).toBe("synthetic");
    expect(scenario.splitRule).toBe("proportional");
  });
});
