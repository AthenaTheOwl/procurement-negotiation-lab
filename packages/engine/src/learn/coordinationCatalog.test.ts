import { describe, expect, it } from "vitest";
import {
  COORDINATION_CATALOG,
  catalogSummary,
  entryById,
} from "./coordinationCatalog";

describe("coordinationCatalog", () => {
  it("ships all 12 mechanisms with stable ids", () => {
    expect(COORDINATION_CATALOG.length).toBe(12);
    const ids = COORDINATION_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has non-empty exchanges + leaks text (provenance lens is the point)", () => {
    for (const e of COORDINATION_CATALOG) {
      expect(e.exchanges.length).toBeGreaterThan(20);
      expect(e.leaks.length).toBeGreaterThan(10);
    }
  });

  it("sealed-bid VCG is incentive-compatible; vanilla ADMM is not", () => {
    expect(entryById("sealed-auction").incentiveCompatible).toBe(true);
    expect(entryById("admm").incentiveCompatible).toBe(false);
  });

  it("vanilla ADMM is medium-high confidentiality; DP-ADMM is formal", () => {
    expect(entryById("admm").confidentiality).toBe("medium-high");
    expect(entryById("differentially-private-admm").confidentiality).toBe(
      "formal",
    );
  });

  it("secure-mpc is formal confidentiality, first-best welfare", () => {
    const entry = entryById("secure-mpc");
    expect(entry.confidentiality).toBe("formal");
    expect(entry.welfare).toBe("first-best");
  });

  it("centralized LP is first-best but low confidentiality", () => {
    const entry = entryById("small-lp");
    expect(entry.welfare).toBe("first-best");
    expect(entry.confidentiality).toBe("low");
  });

  it("entryById throws on unknown id", () => {
    expect(() => entryById("not-a-mechanism" as never)).toThrow();
  });

  it("catalogSummary returns one row per entry with required fields", () => {
    const rows = catalogSummary();
    expect(rows.length).toBe(COORDINATION_CATALOG.length);
    for (const row of rows) {
      expect(row.id).toBeTruthy();
      expect(row.name.length).toBeGreaterThan(0);
    }
  });

  it("rough setup-effort ordering matches the practitioner story", () => {
    // Rules + menus should be cheaper than ADMM and MPC.
    const rule = entryById("rule").setupEffort;
    const menu = entryById("posted-price").setupEffort;
    const admm = entryById("admm").setupEffort;
    const mpc = entryById("secure-mpc").setupEffort;
    const order = { "very-low": 0, low: 1, medium: 2, high: 3 } as const;
    expect(order[rule]).toBeLessThan(order[admm]);
    expect(order[menu]).toBeLessThan(order[admm]);
    expect(order[admm]).toBeLessThanOrEqual(order[mpc]);
  });
});
