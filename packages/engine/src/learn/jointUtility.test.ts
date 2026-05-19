import { describe, expect, it } from "vitest";
import {
  buyerUtilityAt,
  defaultLearnScenario,
  findJointOptimum,
  jointUtilityAt,
  sampleJointCurve,
  supplierUtilityAt,
} from "./jointUtility";

describe("learn / jointUtility", () => {
  it("buyer utility peaks around demand and is finite everywhere", () => {
    const peak = buyerUtilityAt(500, 500);
    const tooLow = buyerUtilityAt(100, 500);
    const tooHigh = buyerUtilityAt(900, 500);
    expect(Number.isFinite(peak)).toBe(true);
    expect(peak).toBeGreaterThan(tooLow);
    // High q still suffers from the excess penalty, so peak > tooHigh on this scale
    expect(peak).toBeGreaterThan(tooHigh);
  });

  it("supplier utility is finite and eventually decreases past capacity", () => {
    // At capacity, the squared over-capacity penalty is zero. The linear
    // margin term still rewards higher q until the quadratic penalty
    // dominates. The roll-off lands well past capacity; pick q values
    // far enough apart that the comparison is robust.
    const atCapacity = supplierUtilityAt(610, 610);
    const farPastCapacity = supplierUtilityAt(1200, 610);
    expect(Number.isFinite(atCapacity)).toBe(true);
    expect(Number.isFinite(farPastCapacity)).toBe(true);
    expect(atCapacity).toBeGreaterThan(farPastCapacity);
  });

  it("jointUtilityAt is the sum of buyer + supplier", () => {
    const joint = jointUtilityAt(425, 500, 610);
    const expected = buyerUtilityAt(425, 500) + supplierUtilityAt(425, 610);
    expect(joint).toBeCloseTo(expected);
  });

  it("findJointOptimum returns a q with strictly highest joint utility on the grid", () => {
    const best = findJointOptimum(0, 600, 5, 500, 610);
    const samples = sampleJointCurve(0, 600, 5, 500, 610);
    const maxJoint = Math.max(...samples.map((p) => p.joint));
    expect(best.joint).toBe(maxJoint);
  });

  it("sampleJointCurve covers the full range with the requested step", () => {
    const samples = sampleJointCurve(0, 100, 10, 500, 610);
    expect(samples.length).toBe(11);
    expect(samples[0].q).toBe(0);
    expect(samples[samples.length - 1].q).toBe(100);
  });

  it("defaultLearnScenario produces a usable scenario with 500/350 framing", () => {
    const setup = defaultLearnScenario();
    expect(setup.demand).toBe(500);
    expect(setup.supplierCapacity).toBe(350);
    expect(setup.qMin).toBe(0);
    expect(setup.qMax).toBe(600);
    expect(setup.scenario.presetId).toBeTruthy();
  });
});
