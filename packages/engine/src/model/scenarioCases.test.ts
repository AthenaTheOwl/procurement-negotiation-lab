import { describe, expect, it } from "vitest";
import { algorithmResults, makeScenario, transferLedger } from "./simulation";

describe("joint-optimality scenario presets", () => {
  it("has a case where ADMM converges within 30 iterations", () => {
    const runs = algorithmResults(makeScenario({ presetId: "joint-exists-admm-converges" }));
    const admm = runs.find((run) => run.id === "cpp-admm");
    expect(admm?.convergence).toBe("converged");
    expect(admm?.iterations).toBeLessThanOrEqual(30);
  });

  it("has a case where ADMM oscillates while alternating best response converges", () => {
    const runs = algorithmResults(makeScenario({ presetId: "joint-exists-admm-oscillates" }));
    const admm = runs.find((run) => run.id === "cpp-admm");
    const alternating = runs.find((run) => run.id === "alternating-best-response");
    expect(admm?.convergence).toBe("oscillating");
    expect(alternating?.convergence).toBe("converged");
  });

  it("has a case where CBT cannot make both parties no worse off", () => {
    const runs = algorithmResults(makeScenario({ presetId: "joint-does-not-exist" }));
    const cppVcg = runs.find((run) => run.id === "cpp-vcg");
    expect(cppVcg?.feasible).toBe(false);
    expect(transferLedger(cppVcg?.globalUtility ?? 0).some((row) => !row.noWorseOff)).toBe(true);
  });
});
