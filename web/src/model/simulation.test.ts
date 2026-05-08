import { describe, expect, it } from "vitest";
import { substrateCrunch } from "../data/story";
import {
  algorithmResults,
  detectEnding,
  evaluateRound,
  informationSweep,
  initialScores,
  makeScenario,
  transferLedger,
} from "./simulation";

describe("simulation model", () => {
  it("produces finite consequences for every story choice", () => {
    for (const beat of substrateCrunch.beats) {
      for (const choice of beat.choices) {
        const result = evaluateRound(beat, choice, initialScores);
        expect(result.residual).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.globalUtility)).toBe(true);
        expect(result.plainEnglish.length).toBeGreaterThan(20);
      }
    }
  });

  it("compares local JIT, CPP mechanisms, baselines, and an oracle", () => {
    const runs = algorithmResults(makeScenario());
    expect(runs.map((run) => run.id)).toEqual([
      "jit-baseline",
      "centralized-oracle",
      "cpp-vcg",
      "cpp-admm",
      "menu-contracts",
      "alternating-best-response",
      "price-only",
      "consensus-averaging",
    ]);
    expect(runs.find((run) => run.id === "centralized-oracle")!.oracleGap).toBe(0);
    expect(runs.every((run) => Number.isFinite(run.globalUtility))).toBe(true);
    expect(runs.every((run) => run.incentiveStory.length > 10)).toBe(true);
  });

  it("shows more information as a tradeoff between value and privacy", () => {
    const sweep = informationSweep(makeScenario());
    const privateMode = sweep.find((row) => row.mode === "private");
    const oracleMode = sweep.find((row) => row.mode === "full-oracle");
    expect(privateMode).toBeDefined();
    expect(oracleMode).toBeDefined();
    expect(oracleMode!.globalUtility).toBeGreaterThan(privateMode!.globalUtility);
    expect(oracleMode!.privacy).toBeGreaterThan(privateMode!.privacy);
  });

  it("computes a no-worse-off transfer ledger", () => {
    const rows = transferLedger(26000);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.noWorseOff)).toBe(true);
  });

  it("detects walk-away when final surplus is not enough", () => {
    const beat = substrateCrunch.beats[0];
    const result = evaluateRound(beat, beat.choices[0], {
      relationship: -5,
      coverageRisk: 4,
      budgetPressure: 4,
      privacyShared: 0,
    });
    const ending = detectEnding([result], result.nextScores);
    expect(ending.title).toBe("Walk-away");
  });
});
