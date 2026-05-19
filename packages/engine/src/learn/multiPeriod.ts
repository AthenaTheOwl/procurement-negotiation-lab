/**
 * multiPeriod — multi-week commitment workbench helpers.
 *
 * Adds the deferred v1 of spec 0003 / addendum-4: a 12-week
 * commitment schedule with firm / soft / forecast commitments per
 * week. Each commitment type carries a different penalty if actuals
 * miss the committed quantity, plus a different value of locked-in
 * capacity to the supplier.
 *
 * Math (per week):
 *   delivered_value(q) = service_value * min(q, demand_mean * forecast_confidence)
 *   shortfall_penalty(q) = penalty(commit) * max(0, committed - q)
 *   overcommit_penalty(q) = excess_penalty * max(0, q - demand_mean * 1.2)
 *   weekly_utility(q) = delivered_value - unit_cost * q
 *                       - shortfall_penalty - overcommit_penalty
 *
 * Penalty by commitment type:
 *   firm     → 130 per unit short (you guaranteed delivery; the supplier
 *              dropped other orders to honor it; missing it costs
 *              relationship + cover-cost)
 *   soft     → 60 per unit short (you flagged you might pull back; the
 *              supplier kept some flexibility)
 *   forecast → 0 per unit short (it's a non-binding signal)
 *
 * Confidence by week (default):
 *   weeks 1-3:  ~0.95 (firm-eligible: demand is locked in)
 *   weeks 4-7:  ~0.75 (soft-commit zone: still confident but rough)
 *   weeks 8-12: 0.35..0.55 (forecast zone: more rumor than fact)
 */

export type CommitmentKind = "firm" | "soft" | "forecast";

export const COMMITMENT_KINDS: CommitmentKind[] = ["firm", "soft", "forecast"];

export const SHORTFALL_PENALTY: Record<CommitmentKind, number> = {
  firm: 130,
  soft: 60,
  forecast: 0,
};

export interface WeekPlan {
  week: number;
  q: number;
  committed: number;
  commitment: CommitmentKind;
  demandMean: number;
  forecastConfidence: number;
}

export interface MultiPeriodConfig {
  weeks: number;
  serviceValue: number;
  unitCost: number;
  excessPenalty: number;
}

export const DEFAULT_MULTI_PERIOD_CONFIG: MultiPeriodConfig = {
  weeks: 12,
  serviceValue: 125,
  unitCost: 55,
  excessPenalty: 7,
};

/**
 * The default 12-week schedule the workbench opens with. Demand
 * tapers off and confidence falls as the horizon stretches. Buyer
 * starts committed at the demand mean of each week.
 */
export function defaultMultiPeriodPlan(
  config: MultiPeriodConfig = DEFAULT_MULTI_PERIOD_CONFIG,
): WeekPlan[] {
  const plan: WeekPlan[] = [];
  for (let w = 1; w <= config.weeks; w += 1) {
    const demandMean = 500 - (w - 1) * 12;
    let confidence: number;
    let kind: CommitmentKind;
    if (w <= 3) {
      confidence = 0.95;
      kind = "firm";
    } else if (w <= 7) {
      confidence = 0.75;
      kind = "soft";
    } else {
      confidence = Math.max(0.35, 0.65 - (w - 7) * 0.06);
      kind = "forecast";
    }
    plan.push({
      week: w,
      q: demandMean,
      committed: demandMean,
      commitment: kind,
      demandMean,
      forecastConfidence: confidence,
    });
  }
  return plan;
}

export interface WeekResult {
  week: number;
  utility: number;
  delivered: number;
  shortfall: number;
  overcommit: number;
  commitment: CommitmentKind;
}

export interface MultiPeriodResult {
  total: number;
  weeks: WeekResult[];
}

function weeklyUtility(
  week: WeekPlan,
  config: MultiPeriodConfig,
): WeekResult {
  const effectiveDemand = week.demandMean * week.forecastConfidence;
  const delivered = config.serviceValue * Math.min(week.q, effectiveDemand);
  const cost = config.unitCost * week.q;
  const shortfall =
    SHORTFALL_PENALTY[week.commitment] *
    Math.max(0, week.committed - week.q);
  const overcommit =
    config.excessPenalty * Math.max(0, week.q - week.demandMean * 1.2);
  return {
    week: week.week,
    utility: delivered - cost - shortfall - overcommit,
    delivered,
    shortfall,
    overcommit,
    commitment: week.commitment,
  };
}

export function evaluateMultiPeriodPlan(
  plan: WeekPlan[],
  config: MultiPeriodConfig = DEFAULT_MULTI_PERIOD_CONFIG,
): MultiPeriodResult {
  const weeks = plan.map((week) => weeklyUtility(week, config));
  const total = weeks.reduce((sum, w) => sum + w.utility, 0);
  return { total, weeks };
}

/**
 * Per-week optimum q (ignoring shortfall against an existing
 * committed value). The optimal q for week w is the effective demand
 * (demandMean * forecastConfidence) when service_value > unit_cost,
 * up to the 1.2× demand-mean overcommit boundary. The closed-form
 * holds because the penalty terms are piecewise-linear and the
 * delivered_value is concave-flat at the kink.
 */
export function optimalQuantityForWeek(
  week: WeekPlan,
  config: MultiPeriodConfig = DEFAULT_MULTI_PERIOD_CONFIG,
): number {
  if (config.serviceValue <= config.unitCost) {
    // Never optimal to commit any units; q = 0 dominates.
    return 0;
  }
  return week.demandMean * week.forecastConfidence;
}

/**
 * Rewrite a plan to its per-week optimum. The committed field is
 * kept (the user might have over-committed already and the optimum
 * acknowledges that).
 */
export function optimalMultiPeriodPlan(
  plan: WeekPlan[],
  config: MultiPeriodConfig = DEFAULT_MULTI_PERIOD_CONFIG,
): WeekPlan[] {
  return plan.map((week) => ({
    ...week,
    q: optimalQuantityForWeek(week, config),
  }));
}

/**
 * A few representative actions the user can take in Level 9 — wired
 * to button presses, not full strategies. Lets the UI offer
 * "balance" / "all firm" / "drop far weeks" as one-tap presets.
 */
export type MultiPeriodPreset =
  | "default"
  | "all-firm"
  | "drop-far-weeks"
  | "optimal";

export function applyPreset(
  plan: WeekPlan[],
  preset: MultiPeriodPreset,
  config: MultiPeriodConfig = DEFAULT_MULTI_PERIOD_CONFIG,
): WeekPlan[] {
  switch (preset) {
    case "default":
      return defaultMultiPeriodPlan(config);
    case "all-firm":
      return plan.map((w) => ({ ...w, commitment: "firm" }));
    case "drop-far-weeks":
      return plan.map((w) =>
        w.week > 7 ? { ...w, q: w.demandMean * 0.4 } : w,
      );
    case "optimal":
      return optimalMultiPeriodPlan(plan, config);
  }
}
