/**
 * jointUtility — small helper for the learn surface.
 *
 * The lab's existing engine returns aggregate algorithm results;
 * the learn surface also needs:
 *   - the joint surplus at a specific quantity q (for the slider)
 *   - the joint-optimal q (for the reveal)
 *
 * Both are pure functions over `makeScenario` defaults plus a quantity
 * scan. No side effects.
 */

import { makeScenario } from "../model/simulation";
import type { LabScenario } from "../model/types";

/**
 * Buyer utility at quantity q for the given scenario. Same shape as the
 * private `buyerUtilityFor` used in simulation.ts but parameterized by q
 * directly so the slider can scan a range.
 */
export function buyerUtilityAt(q: number, demand: number): number {
  const shortage = Math.max(0, demand - q);
  const excess = Math.max(0, q - demand);
  // Coefficients mirror simulation.ts's buyerUtilityFor at neutral scores.
  return 125 * Math.min(q, demand) - 55 * q - 92 * shortage - 7 * excess;
}

/** Supplier utility at quantity q. Mirrors supplierUtilityFor with neutral scores. */
export function supplierUtilityAt(q: number, capacity: number): number {
  const overCapacity = Math.max(0, q - capacity);
  return (55 - 34) * q - 5 * Math.max(0, 500 - q) - overCapacity * overCapacity * 0.07;
}

export interface JointPoint {
  q: number;
  buyer: number;
  supplier: number;
  joint: number;
}

/** Sample the joint utility curve across [qMin, qMax] in `step` increments. */
export function sampleJointCurve(
  qMin: number,
  qMax: number,
  step: number,
  demand: number,
  capacity: number,
): JointPoint[] {
  const points: JointPoint[] = [];
  for (let q = qMin; q <= qMax; q += step) {
    const buyer = buyerUtilityAt(q, demand);
    const supplier = supplierUtilityAt(q, capacity);
    points.push({ q, buyer, supplier, joint: buyer + supplier });
  }
  return points;
}

/** Joint utility at a single quantity. */
export function jointUtilityAt(
  q: number,
  demand: number,
  capacity: number,
): number {
  return buyerUtilityAt(q, demand) + supplierUtilityAt(q, capacity);
}

/**
 * Find the quantity that maximizes joint utility within a bracketed range.
 * Pure brute force over integer-step grid; sufficient for the slider UI.
 */
export function findJointOptimum(
  qMin: number,
  qMax: number,
  step: number,
  demand: number,
  capacity: number,
): JointPoint {
  let best: JointPoint | null = null;
  for (let q = qMin; q <= qMax; q += step) {
    const joint = jointUtilityAt(q, demand, capacity);
    if (!best || joint > best.joint) {
      best = {
        q,
        buyer: buyerUtilityAt(q, demand),
        supplier: supplierUtilityAt(q, capacity),
        joint,
      };
    }
  }
  if (!best) {
    return {
      q: qMin,
      buyer: 0,
      supplier: 0,
      joint: 0,
    };
  }
  return best;
}

export interface LearnScenarioDefaults {
  scenario: LabScenario;
  demand: number;
  supplierCapacity: number;
  qMin: number;
  qMax: number;
}

/** The default learn-surface scenario: 500 demand, 350 supplier capacity. */
export function defaultLearnScenario(): LearnScenarioDefaults {
  return {
    scenario: makeScenario(),
    demand: 500,
    supplierCapacity: 350,
    qMin: 0,
    qMax: 600,
  };
}
