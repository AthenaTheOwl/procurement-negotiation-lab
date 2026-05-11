import { describe, expect, it } from "vitest";
import {
  algorithmResults,
  effectiveCapacity,
  frontier,
  makeScenario,
  transferLedger,
  vcgTransfer,
} from "./simulation";

describe("operational mechanism refinements", () => {
  it("defaults to full VCG-style transfer clipping", () => {
    const scenario = makeScenario();
    expect(scenario.alpha).toBe(1);
    expect(scenario.buyerReliability).toBe(1);
    expect(scenario.supplierReliability).toBe(1);
    expect(scenario.epsilon).toBe(0);
  });

  it("scales VCG transfer magnitudes with alpha", () => {
    const scenario = makeScenario();
    const full = vcgTransfer(scenario, "supplier", 1);
    expect(Math.abs(vcgTransfer(scenario, "supplier", 0.5) - full * 0.5)).toBeLessThanOrEqual(1);
    expect(vcgTransfer(scenario, "supplier", 0)).toBe(0);
  });

  it("lets zero alpha expose a no-worse-off failure when realized utility is below outside option", () => {
    const rows = transferLedger(13_000, { alpha: 0 });
    expect(rows.some((row) => !row.noWorseOff)).toBe(true);
    expect(rows.every((row) => row.transfer === 0)).toBe(true);
  });

  it("turns stated reliability into effective capacity", () => {
    const scenario = makeScenario({ supplierReliability: 0.5 });
    const supplier = effectiveCapacity("supplier", scenario);
    expect(supplier.effective).toBe(Math.round(supplier.stated * 0.5));
  });

  it("flags a zero-reliability supplier as infeasible", () => {
    const scenario = makeScenario({ supplierReliability: 0 });
    expect(effectiveCapacity("supplier", scenario).effective).toBe(0);
    expect(algorithmResults(scenario).find((run) => run.id === "cpp-vcg")?.feasible).toBe(false);
  });

  it("returns a bounded epsilon frontier", () => {
    const scenario = makeScenario({ epsilon: 0.05 });
    const exact = frontier(scenario, "cpp-vcg", 0);
    const relaxed = frontier(scenario, "cpp-vcg", 0.05);
    expect(exact.plans).toHaveLength(1);
    expect(relaxed.plans.length).toBeGreaterThanOrEqual(1);
    expect(relaxed.plans.length).toBeLessThanOrEqual(5);
    for (const plan of relaxed.plans) {
      expect((relaxed.optimalUtility - plan.globalUtility) / relaxed.optimalUtility).toBeLessThanOrEqual(0.050001);
      expect(plan.transferRows.length).toBe(2);
    }
  });
});
