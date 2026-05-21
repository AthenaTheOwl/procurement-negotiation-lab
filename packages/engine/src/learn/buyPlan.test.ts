import { describe, expect, it } from "vitest";
import {
  defaultBuyPlan,
  evaluateBuyPlan,
  optimalBuyPlan,
  type Relationship,
  type SkuRow,
} from "./buyPlan";

describe("buyPlan", () => {
  it("defaultBuyPlan ships 3 SKUs + 3 relationships", () => {
    const { skus, relationships } = defaultBuyPlan();
    expect(skus.length).toBe(3);
    expect(relationships.length).toBe(3);
  });

  it("evaluateBuyPlan computes per-SKU utility + aggregate", () => {
    const { skus, relationships } = defaultBuyPlan();
    const result = evaluateBuyPlan(skus, relationships);
    expect(result.perSku.length).toBe(3);
    const base = result.perSku.reduce((acc, r) => acc + r.utility, 0);
    const corrections = result.corrections.reduce((acc, c) => acc + c.delta, 0);
    expect(result.aggregate).toBeCloseTo(base + corrections, 5);
  });

  it("complement relationship adds a positive correction", () => {
    const { skus, relationships } = defaultBuyPlan();
    const result = evaluateBuyPlan(skus, relationships);
    const comp = result.corrections.find((c) => c.kind === "complement");
    expect(comp).toBeDefined();
    expect(comp!.delta).toBeGreaterThan(0);
  });

  it("substitute relationship adds a non-positive correction (zero when no overlap)", () => {
    const { skus, relationships } = defaultBuyPlan();
    const result = evaluateBuyPlan(skus, relationships);
    const sub = result.corrections.find((c) => c.kind === "substitute");
    expect(sub).toBeDefined();
    expect(sub!.delta).toBeLessThanOrEqual(0);
  });

  it("shared-capacity violation produces a heavy negative correction + a violation", () => {
    const { skus } = defaultBuyPlan();
    const overSkus = skus.map((s) => ({ ...s, q: 800 }));
    const rels: Relationship[] = [
      {
        id: "cap",
        kind: "shared-capacity",
        skuIds: skus.map((s) => s.id),
        strength: 1000,
      },
    ];
    const result = evaluateBuyPlan(overSkus, rels);
    expect(result.violations.length).toBe(1);
    expect(result.corrections[0].delta).toBeLessThan(0);
  });

  it("ignores relationships whose SKU ids no longer exist", () => {
    const { skus } = defaultBuyPlan();
    const rels: Relationship[] = [
      {
        id: "missing-cap",
        kind: "shared-capacity",
        skuIds: ["missing-a", "missing-b"],
        strength: 100,
      },
    ];
    const result = evaluateBuyPlan(skus, rels);
    expect(result.corrections[0].delta).toBe(0);
    expect(result.violations).toEqual([]);
    expect(Number.isFinite(result.aggregate)).toBe(true);
  });

  it("clamps invalid relationship strength instead of flipping correction signs", () => {
    const { skus } = defaultBuyPlan();
    const rels: Relationship[] = [
      {
        id: "negative-complement",
        kind: "complement",
        skuIds: ["sku-a", "sku-c"],
        strength: -10,
      },
    ];
    const result = evaluateBuyPlan(skus, rels);
    expect(result.corrections[0].delta).toBe(0);
    expect(result.corrections[0].binding).toBe(false);
  });

  it("invalid formula on one SKU surfaces a per-SKU error but doesn't crash the rest", () => {
    const { skus, relationships } = defaultBuyPlan();
    const broken = skus.slice();
    broken[0] = { ...broken[0], formula: "this is (( not valid" };
    const result = evaluateBuyPlan(broken, relationships);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].skuId).toBe(broken[0].id);
    // remaining SKUs still produced utility numbers
    expect(result.perSku[1].error).toBeNull();
    expect(result.perSku[2].error).toBeNull();
  });

  it("optimalBuyPlan snaps q to demand when service_value > unit_cost", () => {
    const { skus } = defaultBuyPlan();
    const opt = optimalBuyPlan(skus, []);
    for (let i = 0; i < skus.length; i += 1) {
      expect(opt[i].q).toBe(skus[i].params.demand);
    }
  });

  it("optimalBuyPlan respects shared-capacity by scaling down proportionally", () => {
    const { skus } = defaultBuyPlan();
    const totalDemand = skus.reduce((acc, s) => acc + s.params.demand, 0); // 1350
    const cap: Relationship = {
      id: "tight-cap",
      kind: "shared-capacity",
      skuIds: skus.map((s) => s.id),
      strength: 900, // tighter than the sum of demands
    };
    const opt = optimalBuyPlan(skus, [cap]);
    const total = opt.reduce((acc, s) => acc + s.q, 0);
    expect(total).toBeLessThanOrEqual(900);
    expect(total).toBeGreaterThan(0);
    expect(totalDemand).toBeGreaterThan(900); // sanity
  });

  it("aggregate utility is a finite number for the default plan", () => {
    const { skus, relationships } = defaultBuyPlan();
    const result = evaluateBuyPlan(skus, relationships);
    expect(Number.isFinite(result.aggregate)).toBe(true);
  });
});
