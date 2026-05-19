/**
 * split — helper for Level 04 (surplus splitting).
 *
 * Models a two-party transfer where the buyer's "share of surplus" runs
 * 0..1. Both parties have outside options; extreme shares drop one side
 * below its outside line ("walkaway zone"). The feasible band sits in
 * the middle and is wide enough to be discoverable but narrow enough
 * that the user has to actually look at both curves.
 *
 * Math (closed-form):
 *   surplus      = max(0, globalUtility - buyerOutside - supplierOutside)
 *   buyer(s)     = buyerOutside  + 0.5*surplus + (s - 0.5) * 1.5*surplus
 *   supplier(s)  = supplierOutside + 0.5*surplus + (0.5 - s) * 1.5*surplus
 *
 * Feasible region: s in [1/6, 5/6]. At s = 0.5 both parties sit at
 * outside + 0.5*surplus — the "fair split" centerpoint.
 */

export interface SplitPoint {
  share: number;
  buyerUtility: number;
  supplierUtility: number;
  buyerOutside: number;
  supplierOutside: number;
  buyerFeasible: boolean;
  supplierFeasible: boolean;
  feasible: boolean;
}

export interface SplitConfig {
  globalUtility: number;
  buyerOutside?: number;
  supplierOutside?: number;
}

export const DEFAULT_BUYER_OUTSIDE = 8400;
export const DEFAULT_SUPPLIER_OUTSIDE = 5200;

export function splitOutcome(share: number, config: SplitConfig): SplitPoint {
  const clamped = Math.max(0, Math.min(1, share));
  const buyerOutside = config.buyerOutside ?? DEFAULT_BUYER_OUTSIDE;
  const supplierOutside = config.supplierOutside ?? DEFAULT_SUPPLIER_OUTSIDE;
  const surplus = Math.max(
    0,
    config.globalUtility - buyerOutside - supplierOutside,
  );
  const offset = (clamped - 0.5) * 1.5 * surplus;
  const buyerUtility = buyerOutside + 0.5 * surplus + offset;
  const supplierUtility = supplierOutside + 0.5 * surplus - offset;
  const buyerFeasible = buyerUtility >= buyerOutside;
  const supplierFeasible = supplierUtility >= supplierOutside;
  return {
    share: clamped,
    buyerUtility,
    supplierUtility,
    buyerOutside,
    supplierOutside,
    buyerFeasible,
    supplierFeasible,
    feasible: buyerFeasible && supplierFeasible,
  };
}

/**
 * Sample the split-share curve across [0, 1] in `step` increments.
 */
export function sampleSplitCurve(
  step: number,
  config: SplitConfig,
): SplitPoint[] {
  const points: SplitPoint[] = [];
  for (let s = 0; s <= 1 + 1e-9; s += step) {
    points.push(splitOutcome(s, config));
  }
  return points;
}

/**
 * Return [low, high] feasibility bounds (inclusive). When surplus <= 0,
 * feasibility collapses to the midpoint and the band is empty.
 */
export function feasibleBand(config: SplitConfig): [number, number] {
  const buyerOutside = config.buyerOutside ?? DEFAULT_BUYER_OUTSIDE;
  const supplierOutside = config.supplierOutside ?? DEFAULT_SUPPLIER_OUTSIDE;
  const surplus = config.globalUtility - buyerOutside - supplierOutside;
  if (surplus <= 0) return [0.5, 0.5];
  // buyer feasible when offset >= -0.5 surplus → s >= 1/6
  // supplier feasible when offset <= 0.5 surplus → s <= 5/6
  return [1 / 6, 5 / 6];
}
