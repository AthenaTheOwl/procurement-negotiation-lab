import { describe, expect, it } from "vitest";
import { strategies, strategiesForRole, strategyById, strategyCountByRole } from "./strategies";

describe("strategy library", () => {
  it("exports at least 8 strategies", () => {
    expect(strategies.length).toBeGreaterThanOrEqual(8);
  });

  it("covers at least 4 roles with the required minimum counts", () => {
    const counts = strategyCountByRole();
    expect(counts.buyer).toBeGreaterThanOrEqual(2);
    expect(counts.supplier).toBeGreaterThanOrEqual(3);
    expect(counts.packager).toBeGreaterThanOrEqual(1);
    expect(counts.coordinator).toBeGreaterThanOrEqual(1);
  });

  it("each strategy has a default utility formula and references", () => {
    for (const strategy of strategies) {
      expect(strategy.defaultUtilityFormula.length).toBeGreaterThan(0);
      expect(strategy.teaches.length).toBeGreaterThan(0);
    }
  });

  it("strategyById finds by id", () => {
    expect(strategyById("launch-protector-buyer")?.role).toBe("buyer");
    expect(strategyById("unknown")).toBeUndefined();
  });

  it("strategiesForRole filters by role", () => {
    const suppliers = strategiesForRole("supplier");
    expect(suppliers.every((s) => s.role === "supplier")).toBe(true);
    expect(suppliers.length).toBeGreaterThanOrEqual(3);
  });
});
