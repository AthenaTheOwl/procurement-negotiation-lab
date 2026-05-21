/**
 * buyPlan — multi-SKU buy plan with typed inter-SKU relationships.
 *
 * Standalone of the legacy LabArena: this is the model behind the
 * new BuyPlanStudio surface. Each SKU has its own utility formula
 * (re-using compileFormula from spec 0003) plus shared cost
 * parameters. Relationships couple SKUs:
 *   - substitute: cross-cap on demand (buying SKU A reduces effective
 *     demand for SKU B by a substitution coefficient).
 *   - complement: bundle lift (buying both lifts joint utility by a
 *     synergy term: bundle_coef * min(q_a, q_b)).
 *   - shared-capacity: hard cap on sum of q across SKUs in the group.
 *
 * The engine evaluates a plan against the user's formulas, then
 * applies relationship corrections, and returns:
 *   { perSku: [...utilities], corrections: [...], aggregate, ... }
 *
 * The relationship math is intentionally simple (linear corrections),
 * because the level's job is to show *that* SKUs interact, not to
 * pretend the lab is a real planner. Pedagogy over precision.
 */

import { compileFormula, FormulaError } from "../model/formula";

export interface SkuParameters {
  demand: number;
  unit_cost: number;
  service_value: number;
  shortage_penalty: number;
  excess_penalty: number;
}

export const DEFAULT_SKU_PARAMS: SkuParameters = {
  demand: 500,
  unit_cost: 55,
  service_value: 125,
  shortage_penalty: 92,
  excess_penalty: 7,
};

export type RelationshipKind = "substitute" | "complement" | "shared-capacity";

export interface Relationship {
  id: string;
  kind: RelationshipKind;
  /** SKU ids involved. For substitute / complement, exactly 2. For shared-capacity, 2..N. */
  skuIds: string[];
  /**
   * Coupling coefficient. Interpretation depends on kind:
   *   substitute: fraction in [0, 1] — buying 1 unit of A reduces effective demand
   *     for B by `strength` units (and vice versa).
   *   complement: bundle margin per matched unit ($/unit).
   *   shared-capacity: capacity cap (units).
   */
  strength: number;
}

export interface SkuRow {
  id: string;
  name: string;
  formula: string;
  params: SkuParameters;
  q: number;
}

export interface SkuEvalResult {
  skuId: string;
  name: string;
  q: number;
  utility: number;
  error: string | null;
}

export interface RelationshipCorrection {
  id: string;
  kind: RelationshipKind;
  skuIds: string[];
  /** Signed correction applied to aggregate utility (+ for complement, − for substitute) */
  delta: number;
  /** True iff the relationship is *binding* this plan (capacity exceeded, etc.) */
  binding: boolean;
  /** Plain-english explanation rendered by the surface */
  note: string;
}

export interface PlanResult {
  perSku: SkuEvalResult[];
  corrections: RelationshipCorrection[];
  aggregate: number;
  /** Any SKU rows where the formula didn't compile. */
  errors: { skuId: string; message: string }[];
  /** Hard constraints violated (e.g. shared capacity over cap). */
  violations: { id: string; message: string }[];
}

/**
 * Variable set Level 8 already supports. SKU utility formulas can use
 * the same names so the workflow rhymes with "Author your own".
 */
const ALLOWED_VARS = new Set<string>([
  "q",
  "demand",
  "unit_cost",
  "service_value",
  "shortage_penalty",
  "excess_penalty",
  "holding",
]);

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function evalSkuFormula(row: SkuRow): SkuEvalResult {
  try {
    const compiled = compileFormula(row.formula, ALLOWED_VARS);
    const namespace: Record<string, number> = {
      q: row.q,
      demand: row.params.demand,
      unit_cost: row.params.unit_cost,
      service_value: row.params.service_value,
      shortage_penalty: row.params.shortage_penalty,
      excess_penalty: row.params.excess_penalty,
      holding: 5, // default holding-cost reference; SKU formulas can ignore it
    };
    return {
      skuId: row.id,
      name: row.name,
      q: row.q,
      utility: compiled.evaluate(namespace),
      error: null,
    };
  } catch (e) {
    return {
      skuId: row.id,
      name: row.name,
      q: row.q,
      utility: 0,
      error: e instanceof FormulaError ? e.message : String(e),
    };
  }
}

function applyRelationship(
  rel: Relationship,
  perSku: Map<string, SkuEvalResult>,
  skuById: Map<string, SkuRow>,
): RelationshipCorrection {
  const involved = rel.skuIds
    .map((id) => skuById.get(id))
    .filter((r): r is SkuRow => Boolean(r));
  const strength = finiteNonNegative(rel.strength);

  if (rel.kind === "complement") {
    if (involved.length !== 2) {
      return {
        id: rel.id,
        kind: rel.kind,
        skuIds: rel.skuIds,
        delta: 0,
        binding: false,
        note: "complement requires exactly two SKUs; correction skipped.",
      };
    }
    const matched = Math.min(
      finiteNonNegative(involved[0].q),
      finiteNonNegative(involved[1].q),
    );
    const delta = matched * strength;
    return {
      id: rel.id,
      kind: rel.kind,
      skuIds: rel.skuIds,
      delta,
      binding: delta > 0,
      note: `+$${Math.round(delta).toLocaleString()} bundle lift across ${involved.map((s) => s.name).join(" + ")} (matched ${matched} units x $${strength}/unit).`,
    };
  }

  if (rel.kind === "substitute") {
    if (involved.length !== 2) {
      return {
        id: rel.id,
        kind: rel.kind,
        skuIds: rel.skuIds,
        delta: 0,
        binding: false,
        note: "substitute requires exactly two SKUs; correction skipped.",
      };
    }
    // Sum of q above combined demand is "wasted" (cannibalized). Charge
    // the excess at the average service_value times strength.
    const combinedDemand = Math.max(
      finiteNonNegative(involved[0].params.demand),
      finiteNonNegative(involved[1].params.demand),
    );
    const combinedQ =
      finiteNonNegative(involved[0].q) + finiteNonNegative(involved[1].q);
    const overlap = Math.max(0, combinedQ - combinedDemand);
    const avgValue =
      (finiteNonNegative(involved[0].params.service_value) +
        finiteNonNegative(involved[1].params.service_value)) /
      2;
    const delta = -overlap * strength * avgValue * 0.25;
    return {
      id: rel.id,
      kind: rel.kind,
      skuIds: rel.skuIds,
      delta,
      binding: overlap > 0,
      note:
        overlap > 0
          ? `−$${Math.round(-delta).toLocaleString()} substitution penalty across ${involved
              .map((s) => s.name)
              .join(" / ")} (overlap ${overlap} units cannibalized).`
          : `${involved.map((s) => s.name).join(" / ")} substitute, but no overlap at current plan.`,
    };
  }

  // shared-capacity: hard cap on sum(q).
  if (involved.length === 0) {
    return {
      id: rel.id,
      kind: rel.kind,
      skuIds: rel.skuIds,
      delta: 0,
      binding: false,
      note: "shared-capacity relationship has no matching SKUs; correction skipped.",
    };
  }
  const totalQ = involved.reduce((acc, s) => acc + finiteNonNegative(s.q), 0);
  const cap = strength;
  const over = Math.max(0, totalQ - cap);
  if (over > 0) {
    // Heavy penalty: over * worst-case service value across involved SKUs.
    const worstService = Math.max(
      ...involved.map((s) => finiteNonNegative(s.params.service_value)),
    );
    const delta = -over * worstService;
    return {
      id: rel.id,
      kind: rel.kind,
      skuIds: rel.skuIds,
      delta,
      binding: true,
      note: `Shared capacity ${cap} exceeded by ${over} units across ${involved.map((s) => s.name).join(", ")}. Penalty $${Math.round(-delta).toLocaleString()}.`,
    };
  }
  return {
    id: rel.id,
    kind: rel.kind,
    skuIds: rel.skuIds,
    delta: 0,
    binding: false,
    note: `Shared capacity ${cap} respected (using ${totalQ}).`,
  };
}

export function evaluateBuyPlan(
  skus: SkuRow[],
  relationships: Relationship[],
): PlanResult {
  const perSku: SkuEvalResult[] = skus.map(evalSkuFormula);
  const perSkuMap = new Map(perSku.map((r) => [r.skuId, r]));
  const skuById = new Map(skus.map((s) => [s.id, s]));

  const corrections: RelationshipCorrection[] = relationships.map((rel) =>
    applyRelationship(rel, perSkuMap, skuById),
  );

  const baseUtility = perSku.reduce((acc, r) => acc + r.utility, 0);
  const correctionTotal = corrections.reduce((acc, c) => acc + c.delta, 0);
  const aggregate = baseUtility + correctionTotal;

  const errors = perSku
    .filter((r) => r.error !== null)
    .map((r) => ({ skuId: r.skuId, message: r.error as string }));

  const violations = corrections
    .filter((c) => c.kind === "shared-capacity" && c.binding)
    .map((c) => ({ id: c.id, message: c.note }));

  return { perSku, corrections, aggregate, errors, violations };
}

/**
 * Per-SKU optimum: q* = demand when service_value > unit_cost, else 0.
 * Returns a plan with the same shape but q snapped to per-SKU optimum.
 * Relationship-aware tuning is left for the next pass.
 */
export function optimalBuyPlan(
  skus: SkuRow[],
  relationships: Relationship[] = [],
): SkuRow[] {
  const cap = relationships.find((r) => r.kind === "shared-capacity");
  const result = skus.map((sku) => ({
    ...sku,
    q:
      sku.params.service_value > sku.params.unit_cost
        ? sku.params.demand
        : 0,
  }));
  if (cap) {
    const involved = result.filter((s) => cap.skuIds.includes(s.id));
    const total = involved.reduce((acc, s) => acc + s.q, 0);
    if (total > cap.strength && total > 0) {
      const scale = cap.strength / total;
      for (const s of result) {
        if (cap.skuIds.includes(s.id)) {
          s.q = Math.floor(s.q * scale);
        }
      }
    }
  }
  return result;
}

export function defaultBuyPlan(): { skus: SkuRow[]; relationships: Relationship[] } {
  const skus: SkuRow[] = [
    {
      id: "sku-a",
      name: "Chip A (high-end)",
      formula:
        "service_value * min(q, demand) - unit_cost * q - shortage_penalty * max(demand - q, 0) - excess_penalty * max(q - demand, 0)",
      params: {
        ...DEFAULT_SKU_PARAMS,
        service_value: 140,
        unit_cost: 60,
        demand: 400,
      },
      q: 350,
    },
    {
      id: "sku-b",
      name: "Chip B (mid-range)",
      formula:
        "service_value * min(q, demand) - unit_cost * q - shortage_penalty * max(demand - q, 0) - excess_penalty * max(q - demand, 0)",
      params: {
        ...DEFAULT_SKU_PARAMS,
        service_value: 95,
        unit_cost: 45,
        demand: 600,
      },
      q: 500,
    },
    {
      id: "sku-c",
      name: "Accessory (bundle)",
      formula:
        "service_value * min(q, demand) - unit_cost * q - shortage_penalty * max(demand - q, 0)",
      params: {
        ...DEFAULT_SKU_PARAMS,
        service_value: 35,
        unit_cost: 18,
        demand: 350,
        shortage_penalty: 22,
        excess_penalty: 3,
      },
      q: 250,
    },
  ];
  const relationships: Relationship[] = [
    {
      id: "rel-sub-ab",
      kind: "substitute",
      skuIds: ["sku-a", "sku-b"],
      strength: 0.4,
    },
    {
      id: "rel-comp-ac",
      kind: "complement",
      skuIds: ["sku-a", "sku-c"],
      strength: 8,
    },
    {
      id: "rel-cap-shared",
      kind: "shared-capacity",
      skuIds: ["sku-a", "sku-b", "sku-c"],
      strength: 1500,
    },
  ];
  return { skus, relationships };
}
