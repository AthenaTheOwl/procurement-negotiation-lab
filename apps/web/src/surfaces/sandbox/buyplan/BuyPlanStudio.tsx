/**
 * BuyPlanStudio — multi-SKU buy-plan workbench.
 *
 * Replaces the part of the legacy LabArena that pretended a
 * single-product simulation was "the sandbox". This surface lets the
 * user model a complete buy plan: multiple SKUs, per-SKU utility
 * formulas, typed inter-SKU relationships, and an aggregate plan
 * utility with relationship corrections shown explicitly.
 *
 * The classic LabArena is still reachable via the parent SandboxApp
 * tab toggle — we don't break what already works.
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  defaultBuyPlan,
  evaluateBuyPlan,
  optimalBuyPlan,
  type Relationship,
  type RelationshipKind,
  type SkuRow,
} from "@lab/engine";

const RELATIONSHIP_LABEL: Record<RelationshipKind, string> = {
  substitute: "substitute",
  complement: "complement",
  "shared-capacity": "shared capacity",
};

const RELATIONSHIP_COLOR: Record<RelationshipKind, string> = {
  substitute: "var(--surplus-lost, #d24a4a)",
  complement: "var(--surplus-good, #1bb676)",
  "shared-capacity": "var(--role-coordinator, #6d54ff)",
};

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

export function BuyPlanStudio() {
  const initial = useMemo(() => defaultBuyPlan(), []);
  const [skus, setSkus] = useState<SkuRow[]>(initial.skus);
  const [relationships, setRelationships] = useState<Relationship[]>(
    initial.relationships,
  );

  const result = useMemo(
    () => evaluateBuyPlan(skus, relationships),
    [skus, relationships],
  );
  const optimumSkus = useMemo(
    () => optimalBuyPlan(skus, relationships),
    [skus, relationships],
  );
  const optimumResult = useMemo(
    () => evaluateBuyPlan(optimumSkus, relationships),
    [optimumSkus, relationships],
  );
  const gapToOptimum = Math.max(0, optimumResult.aggregate - result.aggregate);

  const updateSku = (idx: number, patch: Partial<SkuRow>) => {
    setSkus((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      if (patch.params) {
        next[idx].params = { ...prev[idx].params, ...patch.params };
      }
      return next;
    });
  };

  const updateRelationship = (idx: number, patch: Partial<Relationship>) => {
    setRelationships((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleSnapToOptimum = () => setSkus(optimumSkus);
  const handleReset = () => {
    const fresh = defaultBuyPlan();
    setSkus(fresh.skus);
    setRelationships(fresh.relationships);
  };

  const shell: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const summary: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const stat: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px) var(--space-4, 16px)",
  };
  const provLabel: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const ctaRow: CSSProperties = {
    display: "flex",
    gap: "var(--space-3, 12px)",
    flexWrap: "wrap",
  };
  const btn: CSSProperties = {
    background: "var(--role-coordinator, #6d54ff)",
    color: "white",
    border: 0,
    padding: "var(--space-2, 8px) var(--space-4, 16px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontWeight: 600,
    cursor: "pointer",
  };
  const ghostBtn: CSSProperties = {
    ...btn,
    background: "transparent",
    color: "var(--neutral-fg, #1c1c1f)",
    border: "1px solid var(--neutral-line, #e3e3df)",
  };
  const skuCard: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
  };
  const paramGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "var(--space-2, 8px)",
  };
  const relCard: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px) var(--space-4, 16px)",
    display: "flex",
    gap: "var(--space-3, 12px)",
    alignItems: "center",
    flexWrap: "wrap",
  };

  return (
    <div style={shell} data-testid="buyplan-studio">
      <div>
        <h2 style={{ margin: 0, fontSize: "var(--type-4, 1.3rem)" }}>
          Multi-SKU buy plan
        </h2>
        <p style={{ margin: "var(--space-2, 8px) 0 0 0", color: "var(--neutral-fg-soft, #5b5b62)" }}>
          Edit per-SKU formulas, parameters, and quantities. Wire
          relationships between SKUs (substitute / complement / shared
          capacity). The aggregate utility shows your plan's total joint
          value with relationship corrections applied.
        </p>
      </div>

      <div style={summary}>
        <div style={stat}>
          <div style={provLabel}>your aggregate</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }} data-testid="plan-aggregate">
            {money(result.aggregate)}
          </strong>
        </div>
        <div style={stat}>
          <div style={provLabel}>optimum (heuristic)</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }} data-testid="plan-optimum">
            {money(optimumResult.aggregate)}
          </strong>
        </div>
        <div style={stat}>
          <div style={provLabel}>gap to optimum</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }} data-testid="plan-gap">
            {money(gapToOptimum)}
          </strong>
        </div>
        <div style={stat}>
          <div style={provLabel}>SKUs in plan</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }}>{skus.length}</strong>
        </div>
      </div>

      <div style={ctaRow}>
        <button
          type="button"
          style={btn}
          onClick={handleSnapToOptimum}
          data-testid="plan-snap-optimum"
        >
          Snap to per-SKU optimum
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={handleReset}
          data-testid="plan-reset"
        >
          Reset plan
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-4, 16px)",
        }}
        data-testid="plan-sku-grid"
      >
        {skus.map((sku, idx) => {
          const evalRow = result.perSku.find((p) => p.skuId === sku.id);
          return (
            <div key={sku.id} style={skuCard} data-testid={`sku-${sku.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <input
                  type="text"
                  value={sku.name}
                  onChange={(e) => updateSku(idx, { name: e.target.value })}
                  style={{
                    border: 0,
                    background: "transparent",
                    fontSize: "var(--type-3, 1.05rem)",
                    fontWeight: 600,
                    flex: 1,
                  }}
                  aria-label={`SKU ${sku.id} name`}
                  data-testid={`sku-${sku.id}-name`}
                />
                <strong
                  style={{
                    color:
                      (evalRow?.utility ?? 0) >= 0
                        ? "var(--surplus-good, #1bb676)"
                        : "var(--surplus-lost, #d24a4a)",
                  }}
                  data-testid={`sku-${sku.id}-utility`}
                >
                  {money(evalRow?.utility ?? 0)}
                </strong>
              </div>
              {evalRow?.error && (
                <div
                  data-testid={`sku-${sku.id}-error`}
                  style={{
                    color: "var(--surplus-lost, #d24a4a)",
                    fontSize: "var(--type-1, 0.85rem)",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  }}
                >
                  {evalRow.error}
                </div>
              )}
              <div>
                <label
                  htmlFor={`q-${sku.id}`}
                  style={{ fontSize: "var(--type-1, 0.85rem)", color: "var(--neutral-fg-soft, #5b5b62)" }}
                >
                  quantity (q)
                </label>
                <input
                  id={`q-${sku.id}`}
                  type="number"
                  min={0}
                  max={5000}
                  step={10}
                  value={Math.round(sku.q)}
                  onChange={(e) => updateSku(idx, { q: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "var(--space-2, 8px)",
                    borderRadius: "var(--radius-tile, 12px)",
                    border: "1px solid var(--neutral-line, #e3e3df)",
                  }}
                  data-testid={`sku-${sku.id}-q`}
                />
              </div>
              <div style={paramGrid}>
                {(["demand", "service_value", "unit_cost"] as const).map(
                  (key) => (
                    <label
                      key={key}
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <span
                        style={{
                          fontSize: "var(--type-1, 0.85rem)",
                          color: "var(--neutral-fg-soft, #5b5b62)",
                        }}
                      >
                        {key.replace("_", " ")}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={Math.round(sku.params[key])}
                        onChange={(e) =>
                          updateSku(idx, {
                            params: { [key]: Number(e.target.value) } as never,
                          })
                        }
                        style={{
                          padding: "var(--space-2, 8px)",
                          borderRadius: "var(--radius-tile, 12px)",
                          border: "1px solid var(--neutral-line, #e3e3df)",
                        }}
                        data-testid={`sku-${sku.id}-${key}`}
                      />
                    </label>
                  ),
                )}
              </div>
              <div>
                <label
                  htmlFor={`formula-${sku.id}`}
                  style={{ fontSize: "var(--type-1, 0.85rem)", color: "var(--neutral-fg-soft, #5b5b62)" }}
                >
                  utility formula
                </label>
                <textarea
                  id={`formula-${sku.id}`}
                  value={sku.formula}
                  onChange={(e) => updateSku(idx, { formula: e.target.value })}
                  style={{
                    width: "100%",
                    minHeight: "var(--space-7, 80px)",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    fontSize: "var(--type-1, 0.85rem)",
                    padding: "var(--space-2, 8px)",
                    borderRadius: "var(--radius-tile, 12px)",
                    border: evalRow?.error
                      ? "2px solid var(--surplus-lost, #d24a4a)"
                      : "1px solid var(--neutral-line, #e3e3df)",
                  }}
                  data-testid={`sku-${sku.id}-formula`}
                  aria-invalid={Boolean(evalRow?.error)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <h3 style={{ margin: 0, fontSize: "var(--type-3, 1.05rem)" }}>
          SKU relationships
        </h3>
        {relationships.map((rel, idx) => {
          const correction = result.corrections.find((c) => c.id === rel.id);
          return (
            <div
              key={rel.id}
              style={{
                ...relCard,
                borderLeft: `4px solid ${RELATIONSHIP_COLOR[rel.kind]}`,
              }}
              data-testid={`relationship-${rel.id}`}
            >
              <strong style={{ minWidth: "140px" }}>
                {RELATIONSHIP_LABEL[rel.kind]}
              </strong>
              <span style={{ flex: 1 }}>
                {rel.skuIds
                  .map((id) => skus.find((s) => s.id === id)?.name ?? id)
                  .join(" ↔ ")}
              </span>
              <label
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)" }}
              >
                <span style={{ fontSize: "var(--type-1, 0.85rem)" }}>
                  {rel.kind === "shared-capacity"
                    ? "cap (units)"
                    : rel.kind === "complement"
                      ? "$ / matched unit"
                      : "strength"}
                </span>
                <input
                  type="number"
                  min={0}
                  step={rel.kind === "shared-capacity" ? 50 : 0.05}
                  value={rel.strength}
                  onChange={(e) =>
                    updateRelationship(idx, {
                      strength: Number(e.target.value),
                    })
                  }
                  style={{
                    width: "100px",
                    padding: "var(--space-1, 4px) var(--space-2, 8px)",
                    borderRadius: "var(--radius-tile, 12px)",
                    border: "1px solid var(--neutral-line, #e3e3df)",
                  }}
                  data-testid={`relationship-${rel.id}-strength`}
                />
              </label>
              <span
                data-testid={`relationship-${rel.id}-correction`}
                style={{
                  color:
                    (correction?.delta ?? 0) >= 0
                      ? "var(--surplus-good, #1bb676)"
                      : "var(--surplus-lost, #d24a4a)",
                  fontWeight: 600,
                  minWidth: "100px",
                  textAlign: "right",
                }}
              >
                {(correction?.delta ?? 0) >= 0 ? "+" : ""}
                {money(correction?.delta ?? 0)}
              </span>
              <span
                style={{
                  flexBasis: "100%",
                  fontSize: "var(--type-1, 0.85rem)",
                  color: "var(--neutral-fg-soft, #5b5b62)",
                }}
              >
                {correction?.note ?? ""}
              </span>
            </div>
          );
        })}
      </div>

      {result.violations.length > 0 && (
        <div
          data-testid="plan-violations"
          style={{
            background: "var(--walkaway-zone, rgba(210, 74, 74, 0.1))",
            borderLeft: "4px solid var(--surplus-lost, #d24a4a)",
            borderRadius: "var(--radius-tile, 12px)",
            padding: "var(--space-3, 12px) var(--space-4, 16px)",
          }}
        >
          <strong>Plan violates hard constraints:</strong>
          <ul style={{ margin: "var(--space-1, 4px) 0 0 var(--space-5, 24px)" }}>
            {result.violations.map((v) => (
              <li key={v.id}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
