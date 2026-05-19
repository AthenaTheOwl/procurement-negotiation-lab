import { describe, expect, it } from "vitest";
import {
  applyPreset,
  DEFAULT_MULTI_PERIOD_CONFIG,
  defaultMultiPeriodPlan,
  evaluateMultiPeriodPlan,
  optimalMultiPeriodPlan,
  optimalQuantityForWeek,
  SHORTFALL_PENALTY,
} from "./multiPeriod";

describe("defaultMultiPeriodPlan", () => {
  it("creates 12 weeks with monotonically falling confidence past week 3", () => {
    const plan = defaultMultiPeriodPlan();
    expect(plan.length).toBe(12);
    expect(plan[0].commitment).toBe("firm");
    expect(plan[2].commitment).toBe("firm");
    expect(plan[3].commitment).toBe("soft");
    expect(plan[6].commitment).toBe("soft");
    expect(plan[7].commitment).toBe("forecast");
    expect(plan[11].commitment).toBe("forecast");
    for (let i = 1; i < plan.length; i += 1) {
      // confidence either equal or strictly less than the previous
      expect(plan[i].forecastConfidence).toBeLessThanOrEqual(
        plan[i - 1].forecastConfidence,
      );
    }
  });

  it("demand mean tapers off as the horizon stretches", () => {
    const plan = defaultMultiPeriodPlan();
    expect(plan[0].demandMean).toBe(500);
    expect(plan[11].demandMean).toBeLessThan(plan[0].demandMean);
  });
});

describe("optimalQuantityForWeek", () => {
  it("returns effective demand when service value exceeds unit cost", () => {
    const plan = defaultMultiPeriodPlan();
    const week1 = plan[0];
    const expected = week1.demandMean * week1.forecastConfidence;
    expect(optimalQuantityForWeek(week1)).toBeCloseTo(expected);
  });

  it("returns 0 when service value is below unit cost", () => {
    const plan = defaultMultiPeriodPlan();
    const result = optimalQuantityForWeek(plan[0], {
      ...DEFAULT_MULTI_PERIOD_CONFIG,
      serviceValue: 10,
      unitCost: 100,
    });
    expect(result).toBe(0);
  });
});

describe("evaluateMultiPeriodPlan", () => {
  it("returns a result with 12 weekly utilities + a total", () => {
    const result = evaluateMultiPeriodPlan(defaultMultiPeriodPlan());
    expect(result.weeks.length).toBe(12);
    expect(typeof result.total).toBe("number");
  });

  it("optimal plan beats the default plan in total utility", () => {
    const base = defaultMultiPeriodPlan();
    const baseUtility = evaluateMultiPeriodPlan(base).total;
    const opt = optimalMultiPeriodPlan(base);
    const optUtility = evaluateMultiPeriodPlan(opt).total;
    expect(optUtility).toBeGreaterThanOrEqual(baseUtility);
  });

  it("missing a firm commitment is more costly than missing a forecast one", () => {
    const base = defaultMultiPeriodPlan();
    const week1 = { ...base[0] }; // firm commit, week 1
    week1.q = week1.committed - 50;
    const firmShortfallResult = evaluateMultiPeriodPlan([week1]);
    const sameWeekAsForecast = { ...week1, commitment: "forecast" as const };
    const forecastShortfallResult = evaluateMultiPeriodPlan([
      sameWeekAsForecast,
    ]);
    expect(firmShortfallResult.weeks[0].shortfall).toBeGreaterThan(
      forecastShortfallResult.weeks[0].shortfall,
    );
  });

  it("shortfall scales linearly with units missed", () => {
    const base = defaultMultiPeriodPlan();
    const w = { ...base[0], q: base[0].committed - 10 };
    const w2 = { ...base[0], q: base[0].committed - 20 };
    const a = evaluateMultiPeriodPlan([w]).weeks[0].shortfall;
    const b = evaluateMultiPeriodPlan([w2]).weeks[0].shortfall;
    expect(b).toBeCloseTo(a * 2);
  });
});

describe("applyPreset", () => {
  it("`all-firm` converts every week's commitment to firm", () => {
    const base = defaultMultiPeriodPlan();
    const allFirm = applyPreset(base, "all-firm");
    expect(allFirm.every((w) => w.commitment === "firm")).toBe(true);
  });

  it("`drop-far-weeks` cuts q for weeks 8-12 only", () => {
    const base = defaultMultiPeriodPlan();
    const dropped = applyPreset(base, "drop-far-weeks");
    expect(dropped[0].q).toBe(base[0].q);
    expect(dropped[11].q).toBeLessThan(base[11].q);
  });

  it("`optimal` matches optimalMultiPeriodPlan elementwise", () => {
    const base = defaultMultiPeriodPlan();
    const a = applyPreset(base, "optimal");
    const b = optimalMultiPeriodPlan(base);
    for (let i = 0; i < a.length; i += 1) {
      expect(a[i].q).toBeCloseTo(b[i].q);
    }
  });

  it("`default` resets to a fresh default plan", () => {
    const mutated = defaultMultiPeriodPlan().map((w) => ({
      ...w,
      q: 0,
      commitment: "forecast" as const,
    }));
    const reset = applyPreset(mutated, "default");
    expect(reset[0].commitment).toBe("firm");
    expect(reset[0].q).toBe(500);
  });
});

describe("SHORTFALL_PENALTY", () => {
  it("firm is the heaviest, forecast is free, soft is in between", () => {
    expect(SHORTFALL_PENALTY.firm).toBeGreaterThan(SHORTFALL_PENALTY.soft);
    expect(SHORTFALL_PENALTY.soft).toBeGreaterThan(SHORTFALL_PENALTY.forecast);
    expect(SHORTFALL_PENALTY.forecast).toBe(0);
  });
});
