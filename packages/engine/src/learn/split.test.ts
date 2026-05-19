import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUYER_OUTSIDE,
  DEFAULT_SUPPLIER_OUTSIDE,
  feasibleBand,
  sampleSplitCurve,
  splitOutcome,
} from "./split";

const FAT_SURPLUS = { globalUtility: 18000 };
const THIN_SURPLUS = { globalUtility: 14000 };
const NEGATIVE_SURPLUS = { globalUtility: 10000 };

describe("splitOutcome", () => {
  it("at share = 0.5 both parties land at outside + 0.5 * surplus", () => {
    const surplus =
      FAT_SURPLUS.globalUtility -
      DEFAULT_BUYER_OUTSIDE -
      DEFAULT_SUPPLIER_OUTSIDE;
    const center = splitOutcome(0.5, FAT_SURPLUS);
    expect(center.buyerUtility).toBeCloseTo(
      DEFAULT_BUYER_OUTSIDE + 0.5 * surplus,
    );
    expect(center.supplierUtility).toBeCloseTo(
      DEFAULT_SUPPLIER_OUTSIDE + 0.5 * surplus,
    );
    expect(center.feasible).toBe(true);
  });

  it("at share = 0 supplier sits at outside + 1.25*surplus, buyer below outside", () => {
    const result = splitOutcome(0, FAT_SURPLUS);
    expect(result.buyerFeasible).toBe(false);
    expect(result.supplierFeasible).toBe(true);
    expect(result.feasible).toBe(false);
  });

  it("at share = 1 buyer is far above outside, supplier below outside", () => {
    const result = splitOutcome(1, FAT_SURPLUS);
    expect(result.buyerFeasible).toBe(true);
    expect(result.supplierFeasible).toBe(false);
    expect(result.feasible).toBe(false);
  });

  it("share outside [0, 1] is clamped", () => {
    const low = splitOutcome(-0.5, FAT_SURPLUS);
    const high = splitOutcome(1.5, FAT_SURPLUS);
    expect(low.share).toBe(0);
    expect(high.share).toBe(1);
  });

  it("uses provided outside options when supplied", () => {
    const result = splitOutcome(0.5, {
      globalUtility: 16000,
      buyerOutside: 7000,
      supplierOutside: 4000,
    });
    expect(result.buyerOutside).toBe(7000);
    expect(result.supplierOutside).toBe(4000);
  });

  it("collapses to outside options when surplus <= 0", () => {
    const result = splitOutcome(0.5, NEGATIVE_SURPLUS);
    expect(result.buyerUtility).toBeCloseTo(DEFAULT_BUYER_OUTSIDE);
    expect(result.supplierUtility).toBeCloseTo(DEFAULT_SUPPLIER_OUTSIDE);
  });
});

describe("sampleSplitCurve", () => {
  it("emits 11 points at step 0.1 covering 0..1", () => {
    const curve = sampleSplitCurve(0.1, FAT_SURPLUS);
    expect(curve.length).toBe(11);
    expect(curve[0].share).toBe(0);
    expect(curve[curve.length - 1].share).toBeCloseTo(1);
  });

  it("buyer utility increases monotonically in share when surplus > 0", () => {
    const curve = sampleSplitCurve(0.05, FAT_SURPLUS);
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i].buyerUtility).toBeGreaterThanOrEqual(
        curve[i - 1].buyerUtility,
      );
    }
  });
});

describe("feasibleBand", () => {
  it("returns [1/6, 5/6] when surplus is positive", () => {
    const [lo, hi] = feasibleBand(FAT_SURPLUS);
    expect(lo).toBeCloseTo(1 / 6);
    expect(hi).toBeCloseTo(5 / 6);
  });

  it("collapses to [0.5, 0.5] when surplus is negative", () => {
    const [lo, hi] = feasibleBand(NEGATIVE_SURPLUS);
    expect(lo).toBe(0.5);
    expect(hi).toBe(0.5);
  });

  it("works for a thin surplus too", () => {
    const [lo, hi] = feasibleBand(THIN_SURPLUS);
    expect(lo).toBeCloseTo(1 / 6);
    expect(hi).toBeCloseTo(5 / 6);
  });
});
