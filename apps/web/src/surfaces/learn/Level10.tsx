import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  DEFAULT_MENU_SIGNALS,
  SAMPLE_MODELS,
  certifyCoordinationModel,
  clearMenuAgreement,
  generateMenuOptions,
  resolveCoordinationModel,
  type CoordinationScope,
  type MenuCostSignals,
  type MenuOption,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level10Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

type ScopePresetId = "sku-week" | "category" | "global";

const SCOPE_PRESETS: Array<{
  id: ScopePresetId;
  label: string;
  scope: CoordinationScope;
}> = [
  {
    id: "sku-week",
    label: "SKU x FC x week",
    scope: {
      vendor: "vendor_123",
      sku: "SKU-001",
      fc: "ABE8",
      week: "2026-W22",
      marketplace: "US",
      category: "electronics.accessories",
      contractType: "replenishment",
    },
  },
  {
    id: "category",
    label: "Category default",
    scope: {
      vendor: "vendor_999",
      category: "electronics.accessories",
      marketplace: "US",
      contractType: "replenishment",
    },
  },
  {
    id: "global",
    label: "Global fallback",
    scope: { contractType: "replenishment" },
  },
];

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function windowLabel(option: MenuOption): string {
  const [start, end] = option.shipWindowDays;
  return `${start}-${end}d`;
}

export function Level10({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level10Props) {
  const [scopeId, setScopeId] = useState<ScopePresetId>("sku-week");
  const [capacity, setCapacity] = useState(
    DEFAULT_MENU_SIGNALS.capacityShadowPricePerUnit,
  );
  const [lateness, setLateness] = useState(
    DEFAULT_MENU_SIGNALS.latenessExternalityPerUnit,
  );
  const [holding, setHolding] = useState(DEFAULT_MENU_SIGNALS.holdingCostPerUnit);
  const [certified, setCertified] = useState(false);

  const scope =
    SCOPE_PRESETS.find((preset) => preset.id === scopeId)?.scope ??
    SCOPE_PRESETS[0].scope;

  const signals: MenuCostSignals = {
    ...DEFAULT_MENU_SIGNALS,
    capacityShadowPricePerUnit: capacity,
    latenessExternalityPerUnit: lateness,
    holdingCostPerUnit: holding,
  };

  const resolution = useMemo(
    () => resolveCoordinationModel(SAMPLE_MODELS, scope),
    [scope],
  );
  const menu = useMemo(() => generateMenuOptions(signals), [signals]);
  const checks = useMemo(
    () =>
      resolution.selected
        ? certifyCoordinationModel(resolution.selected, menu)
        : [],
    [resolution.selected, menu],
  );
  const allChecksPass = checks.length > 0 && checks.every((check) => check.pass);
  const agreement = useMemo(
    () =>
      clearMenuAgreement(menu, [
        { optionId: "A", maximumFeePerUnit: 0.2 },
        { optionId: "B", minimumCreditPerUnit: 0.02 },
        { optionId: "C", minimumCreditPerUnit: 0.2 },
      ]),
    [menu],
  );

  const handleContinue = () => {
    if (!certified || !allChecksPass) return;
    onComplete();
    onOpenSandbox?.();
  };

  const stage: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.8fr) minmax(320px, 1.2fr)",
    gap: "var(--space-5, 24px)",
  };
  const panel: CSSProperties = {
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
    background: "var(--neutral-bg, #f7f7f4)",
  };
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    marginBottom: "var(--space-1, 4px)",
  };
  const inputStyle: CSSProperties = {
    width: "100%",
  };
  const scopeBtn: CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    background: "var(--neutral-bg-2, #ffffff)",
    padding: "var(--space-3, 12px)",
    cursor: "pointer",
    marginBottom: "var(--space-2, 8px)",
  };
  const selectedScopeBtn: CSSProperties = {
    ...scopeBtn,
    borderColor: "var(--role-buyer, #3a78ff)",
    boxShadow: "0 0 0 2px rgba(58, 120, 255, 0.15)",
  };
  const optionGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const optionCard: CSSProperties = {
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px)",
    background: "var(--neutral-bg-2, #ffffff)",
  };
  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "var(--radius-pill, 999px)",
    background: "var(--neutral-bg, #f7f7f4)",
    padding: "3px 8px",
    margin: "4px 4px 0 0",
    fontSize: "var(--type-1, 0.85rem)",
  };
  const certifyBtn: CSSProperties = {
    border: 0,
    borderRadius: "var(--radius-pill, 999px)",
    background: "var(--role-coordinator, #6d54ff)",
    color: "white",
    padding: "var(--space-3, 12px) var(--space-5, 24px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <LevelShell
      level={10}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Model Studio: menus over a shared kernel"
      stakes="Vendors can bring different utility models. The platform still owns scope, admissible outputs, guardrails, clearing, settlement, and audit."
      continueLabel="Open Sandbox ->"
      continueDisabled={!certified || !allChecksPass}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={panel}>
            <h2 style={{ marginTop: 0, fontSize: "var(--type-4, 1.3rem)" }}>
              1. Resolve scope
            </h2>
            {SCOPE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                style={preset.id === scopeId ? selectedScopeBtn : scopeBtn}
                onClick={() => {
                  setScopeId(preset.id);
                  setCertified(false);
                }}
                data-testid={`scope-${preset.id}`}
              >
                {preset.label}
              </button>
            ))}
            <div data-testid="selected-model" style={{ marginTop: 12 }}>
              <strong>Selected model</strong>
              <br />
              {resolution.selected?.modelId ?? "none"}
            </div>
            <ol style={{ paddingLeft: 20, color: "var(--neutral-fg-soft, #5b5b62)" }}>
              {resolution.fallbackOrder.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section style={panel}>
            <h2 style={{ marginTop: 0, fontSize: "var(--type-4, 1.3rem)" }}>
              2. Price the menu
            </h2>
            <label style={labelStyle} htmlFor="capacity-signal">
              capacity shadow price: {money(capacity)} / unit
            </label>
            <input
              id="capacity-signal"
              data-testid="capacity-signal"
              style={inputStyle}
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={capacity}
              onChange={(event) => {
                setCapacity(Number(event.target.value));
                setCertified(false);
              }}
            />
            <label style={labelStyle} htmlFor="lateness-signal">
              lateness externality: {money(lateness)} / unit
            </label>
            <input
              id="lateness-signal"
              data-testid="lateness-signal"
              style={inputStyle}
              type="range"
              min="0"
              max="0.3"
              step="0.01"
              value={lateness}
              onChange={(event) => {
                setLateness(Number(event.target.value));
                setCertified(false);
              }}
            />
            <label style={labelStyle} htmlFor="holding-signal">
              holding relief: {money(holding)} / unit
            </label>
            <input
              id="holding-signal"
              data-testid="holding-signal"
              style={inputStyle}
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={holding}
              onChange={(event) => {
                setHolding(Number(event.target.value));
                setCertified(false);
              }}
            />
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={panel}>
            <h2 style={{ marginTop: 0, fontSize: "var(--type-4, 1.3rem)" }}>
              3. Offer mechanism-style choices
            </h2>
            <div style={optionGrid}>
              {menu.map((option) => (
                <article
                  key={option.optionId}
                  style={optionCard}
                  data-testid={`menu-option-${option.optionId}`}
                >
                  <strong>
                    {option.optionId}. {option.label}
                  </strong>
                  <div>{option.quantity.toLocaleString()} units</div>
                  <div>{windowLabel(option)} arrival</div>
                  <div data-testid={`option-${option.optionId}-fee`}>
                    fee {money(option.feePerUnit)} / credit{" "}
                    {money(option.creditPerUnit)}
                  </div>
                  <div>margin {money(option.platformMarginPerUnit)} / unit</div>
                  <div aria-label={`${option.optionId} cost chips`}>
                    {option.chips.map((c) => (
                      <span key={c.label} style={chip}>
                        {c.label} {money(c.amountPerUnit)}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={panel}>
            <h2 style={{ marginTop: 0, fontSize: "var(--type-4, 1.3rem)" }}>
              4. Certify, clear, settle
            </h2>
            <button
              type="button"
              style={certifyBtn}
              onClick={() => setCertified(true)}
              data-testid="certify-model"
            >
              Run certification
            </button>

            {certified && (
              <div style={{ marginTop: 16 }} data-testid="certification-results">
                {checks.map((check) => (
                  <div key={check.id}>
                    <strong>{check.pass ? "Pass" : "Fail"}:</strong>{" "}
                    {check.label} - {check.detail}
                  </div>
                ))}
                <div style={{ marginTop: 16 }} data-testid="cleared-agreement">
                  <strong>Cleared agreement</strong>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "var(--neutral-bg-2, #ffffff)",
                      borderRadius: "var(--radius-tile, 12px)",
                      padding: "var(--space-3, 12px)",
                    }}
                  >
                    {JSON.stringify(
                      {
                        selected_option: agreement.selected?.optionId ?? null,
                        contract: agreement.contract,
                        model_versions: {
                          vendor: resolution.selected?.modelId ?? null,
                          platform: "platform.capacity-price.v9",
                        },
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </LevelShell>
  );
}
