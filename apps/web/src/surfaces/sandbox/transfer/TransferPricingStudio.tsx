import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  DEFAULT_TRANSFER_SCENARIO,
  TRANSFER_METHODS,
  evaluateTransferPricing,
  type TransferMethod,
  type TransferPricingScenario,
} from "@lab/engine";

const METHOD_LABEL: Record<TransferMethod, string> = {
  "surplus-share": "Surplus share",
  "marginal-externality": "Marginal externality",
  "two-part-tariff": "Two-part tariff",
  "vcg-style": "VCG-style",
};

const INPUT_HELP: Record<keyof TransferPricingScenario, string> = {
  method: "Choose how the acceptable transfer is priced.",
  units: "Affected units in the proposed operational change.",
  vendorIncrementalCost: "Private cost the vendor bears to accept the new plan.",
  platformBenefit: "Operational value the platform gets from the change before paying the transfer.",
  networkCongestionCost: "Real network cost the plan imposes elsewhere. This reduces welfare.",
  splitAlpha: "Surplus share paid above the vendor's minimum compensation. 0 means bare minimum; 1 gives the vendor all surplus.",
  capacityShadowPricePerUnit: "Scarcity value per unit for constrained slots, lanes, or nodes.",
  serviceCreditPerUnit: "Per-unit credit for improving service, fill rate, or stockout risk.",
  timingPremiumPerUnit: "Per-unit premium for moving volume into the valuable arrival window.",
  congestionChargePerUnit: "Per-unit charge for using overloaded network capacity.",
  markdownRiskChargePerUnit: "Per-unit charge for creating excess or aging inventory risk.",
};

function numberValue(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function preciseMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function TransferPricingStudio() {
  const [scenario, setScenario] = useState<TransferPricingScenario>(
    DEFAULT_TRANSFER_SCENARIO,
  );
  const result = useMemo(
    () => evaluateTransferPricing(scenario),
    [scenario],
  );
  const update = (patch: Partial<TransferPricingScenario>) =>
    setScenario((prev) => ({ ...prev, ...patch }));

  const shell: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const panel: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px)",
  };
  const methodGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "var(--space-2, 8px)",
  };
  const methodButton = (method: TransferMethod): CSSProperties => ({
    background:
      scenario.method === method ? "var(--role-coordinator, #6d54ff)" : "white",
    color:
      scenario.method === method ? "white" : "var(--neutral-fg, #1c1c1f)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px)",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
  });
  const label: CSSProperties = {
    color: "var(--neutral-fg-soft, #5b5b62)",
    fontSize: "var(--type-1, 0.85rem)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const inputGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-2, 8px)",
  };
  const metricGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const metric: CSSProperties = {
    ...panel,
    background: "white",
  };
  const barOuter: CSSProperties = {
    height: "14px",
    borderRadius: "var(--radius-pill, 999px)",
    background: "var(--neutral-line, #e3e3df)",
    position: "relative",
    overflow: "hidden",
  };
  const rangeWidth = Math.max(1, result.acceptanceMax - result.acceptanceMin);
  const transferPct = result.feasible
    ? ((result.selectedTransfer - result.acceptanceMin) / rangeWidth) * 100
    : 0;
  const barInner: CSSProperties = {
    width: `${Math.max(0, Math.min(100, transferPct))}%`,
    height: "100%",
    background: result.feasible
      ? "var(--surplus-good, #1bb676)"
      : "var(--surplus-lost, #d24a4a)",
  };

  return (
    <div style={shell} data-testid="transfer-pricing-studio">
      <div>
        <h2 style={{ margin: 0, fontSize: "var(--type-4, 1.3rem)" }}>
          Transfer pricing workbench
        </h2>
        <p
          style={{
            margin: "var(--space-2, 8px) 0 0 0",
            color: "var(--neutral-fg-soft, #5b5b62)",
          }}
        >
          Choose the operational plan by real welfare, then use transfers,
          credits, rebates, or penalties to make the positive-surplus plan
          acceptable.
        </p>
      </div>

      <div style={methodGrid}>
        {TRANSFER_METHODS.map((method) => (
          <button
            key={method}
            type="button"
            style={methodButton(method)}
            onClick={() => update({ method })}
            data-testid={`transfer-method-${method}`}
          >
            {METHOD_LABEL[method]}
          </button>
        ))}
      </div>

      <div style={inputGrid}>
        {[
          ["units", "units"],
          ["vendorIncrementalCost", "vendor cost"],
          ["platformBenefit", "platform benefit"],
          ["networkCongestionCost", "network congestion"],
          ["splitAlpha", "surplus share alpha"],
          ["capacityShadowPricePerUnit", "capacity / unit"],
          ["serviceCreditPerUnit", "service / unit"],
          ["timingPremiumPerUnit", "timing / unit"],
          ["congestionChargePerUnit", "congestion / unit"],
          ["markdownRiskChargePerUnit", "markdown risk / unit"],
        ].map(([key, text]) => (
          <label key={key} style={{ display: "flex", flexDirection: "column" }}>
            <span style={label}>{text}</span>
            <input
              type="number"
              step={key === "splitAlpha" ? 0.05 : key.includes("PerUnit") ? 0.01 : 100}
              min={0}
              max={key === "splitAlpha" ? 1 : undefined}
              value={scenario[key as keyof TransferPricingScenario] as number}
              onChange={(event) =>
                update({
                  [key]: numberValue(
                    event.target.value,
                    scenario[key as keyof TransferPricingScenario] as number,
                  ),
                } as Partial<TransferPricingScenario>)
              }
              style={inputStyle}
              data-testid={`transfer-input-${key}`}
            />
            <span
              style={{
                marginTop: "var(--space-1, 4px)",
                color: "var(--neutral-fg-soft, #5b5b62)",
                fontSize: "var(--type-1, 0.85rem)",
                lineHeight: 1.35,
              }}
            >
              {INPUT_HELP[key as keyof TransferPricingScenario]}
            </span>
          </label>
        ))}
      </div>

      <div style={metricGrid}>
        <div style={metric}>
          <div style={label}>real welfare surplus</div>
          <strong
            data-testid="transfer-welfare-surplus"
            style={{
              fontSize: "var(--type-4, 1.3rem)",
              color:
                result.welfareSurplus > 0
                  ? "var(--surplus-good, #1bb676)"
                  : "var(--surplus-lost, #d24a4a)",
            }}
          >
            {money(result.welfareSurplus)}
          </strong>
        </div>
        <div style={metric}>
          <div style={label}>selected transfer</div>
          <strong
            data-testid="transfer-selected"
            style={{ fontSize: "var(--type-4, 1.3rem)" }}
          >
            {money(result.selectedTransfer)}
          </strong>
          <div style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}>
            {preciseMoney(result.unitTransfer)} / unit
          </div>
        </div>
        <div style={metric}>
          <div style={label}>vendor net gain</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }}>
            {money(result.vendorNetGain)}
          </strong>
        </div>
        <div style={metric}>
          <div style={label}>platform net gain</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }}>
            {money(result.platformNetGain)}
          </strong>
        </div>
      </div>

      <div
        style={{
          ...panel,
          borderLeft: result.feasible
            ? "4px solid var(--surplus-good, #1bb676)"
            : "4px solid var(--surplus-lost, #d24a4a)",
        }}
        data-testid="transfer-guardrail"
      >
        <strong>{result.feasible ? "Acceptable interval exists" : "Blocked by welfare guardrail"}</strong>
        <p style={{ margin: "var(--space-1, 4px) 0 0 0" }}>
          {result.guardrail}
        </p>
      </div>

      <div style={panel}>
        <div style={label}>acceptance interval</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "var(--space-2, 8px) 0",
          }}
        >
          <span>min {money(result.acceptanceMin)}</span>
          <strong>{money(result.selectedTransfer)}</strong>
          <span>max {money(result.acceptanceMax)}</span>
        </div>
        <div style={barOuter} aria-hidden="true">
          <div style={barInner} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 0.8fr)",
          gap: "var(--space-4, 16px)",
        }}
      >
        <div style={panel}>
          <h3 style={{ marginTop: 0, fontSize: "var(--type-3, 1.05rem)" }}>
            Transfer components
          </h3>
          {result.components.map((component) => (
            <div
              key={component.id}
              data-testid={`transfer-component-${component.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "150px auto",
                gap: "var(--space-2, 8px)",
                padding: "var(--space-2, 8px) 0",
                borderBottom: "1px solid var(--neutral-line, #e3e3df)",
              }}
            >
              <strong>{component.label}</strong>
              <span
                style={{
                  textAlign: "right",
                  color:
                    component.amount >= 0
                      ? "var(--surplus-good, #1bb676)"
                      : "var(--surplus-lost, #d24a4a)",
                }}
              >
                {money(component.amount)}
              </span>
              <span
                style={{
                  gridColumn: "1 / -1",
                  color: "var(--neutral-fg-soft, #5b5b62)",
                }}
              >
                {component.note}
              </span>
            </div>
          ))}
        </div>

        <div style={panel}>
          <h3 style={{ marginTop: 0, fontSize: "var(--type-3, 1.05rem)" }}>
            Pricing lens
          </h3>
          <p style={{ marginTop: 0 }}>{result.explanation}</p>
          <div style={label}>budget balance</div>
          <strong>{result.budgetBalanced ? "balanced transfer" : "needs funding"}</strong>
        </div>
      </div>
    </div>
  );
}
