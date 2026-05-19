import { describe, it, expect } from "vitest";
import { multiPartyTransferLedger, shapleyValues } from "./shapleyTransfer";
import type { Participant } from "./types";

function buyer(id = "b"): Participant {
  return {
    id,
    role: "buyer",
    name: id,
    strategyId: "launch-protector-buyer",
    reliability: 1,
    outsideOption: 8000,
    parameters: { urgency: 0.7, flexibility: 0.5, truthfulness: 0.7, privacyPreference: 0.5, riskAversion: 0.6 },
  };
}

function supplier(id: string, outsideOption = 4500): Participant {
  return {
    id,
    role: "supplier",
    name: id,
    strategyId: "capacity-guard-supplier",
    reliability: 0.9,
    outsideOption,
    parameters: { urgency: 0.4, flexibility: 0.5, truthfulness: 0.7, privacyPreference: 0.7, riskAversion: 0.65 },
  };
}

describe("multiPartyTransferLedger", () => {
  it("returns one row per participant", () => {
    const participants = [buyer(), supplier("s1"), supplier("s2"), supplier("s3")];
    const rows = multiPartyTransferLedger({
      participants,
      globalUtility: 20000,
      alpha: 1,
      splitRule: "proportional",
    });
    expect(rows).toHaveLength(4);
  });

  it("proportional split assigns negative transfer to buyer and positive to suppliers", () => {
    const rows = multiPartyTransferLedger({
      participants: [buyer(), supplier("s1"), supplier("s2")],
      globalUtility: 22000,
      alpha: 1,
      splitRule: "proportional",
    });
    expect(rows[0].transfer).toBeLessThanOrEqual(0);
    const supplierPositive = rows
      .filter((r) => r.role === "supplier")
      .every((r) => r.transfer >= 0);
    expect(supplierPositive).toBe(true);
  });

  it("equal split shares the pool equally among non-buyer participants", () => {
    const rows = multiPartyTransferLedger({
      participants: [buyer(), supplier("s1"), supplier("s2")],
      globalUtility: 22000,
      alpha: 1,
      splitRule: "equal",
    });
    const supplierTransfers = rows.filter((r) => r.role === "supplier").map((r) => r.transfer);
    expect(Math.abs(supplierTransfers[0] - supplierTransfers[1])).toBeLessThan(1e-6);
  });

  it("shapley split returns finite transfers for up to 6 participants", () => {
    const rows = multiPartyTransferLedger({
      participants: [buyer(), supplier("s1"), supplier("s2"), supplier("s3")],
      globalUtility: 25000,
      alpha: 1,
      splitRule: "shapley",
    });
    for (const row of rows) {
      expect(Number.isFinite(row.transfer)).toBe(true);
    }
  });

  it("no-worse-off check is per participant", () => {
    const rows = multiPartyTransferLedger({
      participants: [buyer(), supplier("s1", 6000)],
      globalUtility: 25000,
      alpha: 1,
      splitRule: "proportional",
    });
    for (const row of rows) {
      if (row.utilityAfterTransfer >= row.outsideOption) {
        expect(row.noWorseOff).toBe(true);
      } else {
        expect(row.noWorseOff).toBe(false);
      }
    }
  });

  it("returns zero transfers when surplus is negative", () => {
    const rows = multiPartyTransferLedger({
      participants: [buyer(), supplier("s1", 30000)],
      globalUtility: 10000,
      alpha: 1,
      splitRule: "proportional",
    });
    for (const row of rows) {
      expect(row.transfer).toBe(0);
    }
  });
});

describe("shapleyValues", () => {
  it("sum of shapley values equals the value of the grand coalition", () => {
    const v = (subset: number[]) => (subset.length === 0 ? 0 : subset.length * 10);
    const phi = shapleyValues(4, v);
    const total = phi.reduce((sum, value) => sum + value, 0);
    expect(Math.abs(total - 40)).toBeLessThan(1e-6);
  });
});
