/**
 * Level 08 — Author your own.
 *
 * Graduation level. The user picks a role, edits a utility formula
 * with sandboxed variables, and watches a live surplus bar respond.
 * When they've touched the formula or any parameter, a graduation
 * card appears with a "Continue → Level 9" button.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/08.md
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  FormulaError,
  compileFormula,
  decodeParticipant,
  encodeParticipant,
  strategiesForRole,
  type AgentParameters,
  type ParticipantRole,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { LevelShell } from "../../primitives/LevelShell";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { SurplusBar } from "../../primitives/SurplusBar";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level08Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

const ROLES: { role: ParticipantRole; label: string }[] = [
  { role: "buyer", label: "Buyer" },
  { role: "supplier", label: "Supplier" },
  { role: "packager", label: "Packager" },
  { role: "logistics", label: "Logistics" },
  { role: "distributor", label: "Distributor" },
];

const DEFAULT_PARAMS: AgentParameters = {
  urgency: 0.6,
  flexibility: 0.5,
  truthfulness: 0.7,
  privacyPreference: 0.6,
  riskAversion: 0.6,
};

// Variables the formula editor knows about. Includes parameters + a
// stable "demand", "q", "unit_cost", etc. context.
const ALLOWED_VARS = new Set<string>([
  "q",
  "demand",
  "unit_cost",
  "service_value",
  "shortage_penalty",
  "excess_penalty",
  "holding",
  "urgency",
  "flexibility",
  "truthfulness",
  "privacy_preference",
  "risk_aversion",
]);

const VARIABLES_HELP = `
allowed variables:
  q                    units committed
  demand               buyer's demand
  unit_cost            per-unit cost
  service_value        per-unit value to buyer
  shortage_penalty     penalty per missing unit
  excess_penalty       penalty per excess unit
  holding              supplier holding cost per unit
  urgency, flexibility, truthfulness,
  privacy_preference, risk_aversion (your sliders)

allowed functions: min, max, abs, sqrt, log, exp, clip, pow
`;

export function Level08({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level08Props) {
  const [role, setRole] = useState<ParticipantRole>("buyer");
  const defaultStrategy = useMemo(
    () => strategiesForRole(role)[0],
    [role],
  );
  const [formula, setFormula] = useState(defaultStrategy.defaultUtilityFormula);
  const [params, setParams] = useState<AgentParameters>({
    ...DEFAULT_PARAMS,
    ...defaultStrategy.defaultParameters,
  });
  const [editedFormula, setEditedFormula] = useState(false);
  const [editedParams, setEditedParams] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // If the URL carries ?p=<encoded>, decode it once on mount and
  // hydrate the level state. Tampered or stale payloads return null
  // and are ignored.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("p");
    if (!encoded) return;
    const decoded = decodeParticipant(encoded);
    if (!decoded) return;
    setRole(decoded.role);
    setFormula(decoded.formula);
    setParams(decoded.params);
    setEditedFormula(true);
    setEditedParams(true);
  }, []);

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const encoded = encodeParticipant({ role, formula, params });
    const url = `${window.location.origin}${window.location.pathname}?p=${encoded}#/learn/8`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2000);
      } else {
        window.prompt("Share this URL", url);
      }
    } catch {
      window.prompt("Share this URL", url);
    }
  };

  // re-pin formula & params when the user switches role.
  const handleRoleChange = (next: ParticipantRole) => {
    const strategy = strategiesForRole(next)[0];
    setRole(next);
    setFormula(strategy.defaultUtilityFormula);
    setParams({
      ...DEFAULT_PARAMS,
      ...strategy.defaultParameters,
    });
  };

  // Evaluate the formula at fixed reference numbers + current params.
  const evalResult = useMemo(() => {
    try {
      const compiled = compileFormula(formula, ALLOWED_VARS);
      const namespace: Record<string, number> = {
        q: 425,
        demand: 500,
        unit_cost: 55,
        service_value: 125,
        shortage_penalty: 92,
        excess_penalty: 7,
        holding: 5,
        urgency: params.urgency,
        flexibility: params.flexibility,
        truthfulness: params.truthfulness,
        privacy_preference: params.privacyPreference,
        risk_aversion: params.riskAversion,
      };
      return { value: compiled.evaluate(namespace), error: null as string | null };
    } catch (e) {
      const message = e instanceof FormulaError ? e.message : String(e);
      return { value: 0, error: message };
    }
  }, [formula, params]);

  // Compare-against-default surplus, so the bar always has scale.
  const defaultEval = useMemo(() => {
    try {
      const compiled = compileFormula(
        defaultStrategy.defaultUtilityFormula,
        ALLOWED_VARS,
      );
      const namespace: Record<string, number> = {
        q: 425,
        demand: 500,
        unit_cost: 55,
        service_value: 125,
        shortage_penalty: 92,
        excess_penalty: 7,
        holding: 5,
        urgency: defaultStrategy.defaultParameters.urgency,
        flexibility: defaultStrategy.defaultParameters.flexibility,
        truthfulness: defaultStrategy.defaultParameters.truthfulness,
        privacy_preference: defaultStrategy.defaultParameters.privacyPreference,
        risk_aversion: defaultStrategy.defaultParameters.riskAversion,
      };
      return compiled.evaluate(namespace);
    } catch {
      return 0;
    }
  }, [defaultStrategy]);

  const graduated = editedFormula || editedParams;

  const handleFormulaChange = (value: string) => {
    setFormula(value);
    if (value !== defaultStrategy.defaultUtilityFormula) {
      setEditedFormula(true);
    }
  };

  const handleParamChange = (
    key: keyof AgentParameters,
    next: number,
  ) => {
    setParams((prev) => ({ ...prev, [key]: next }));
    setEditedParams(true);
  };

  const handleContinue = () => {
    if (graduated) {
      onComplete();
    }
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const chipRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-2, 8px)",
    justifyContent: "center",
  };
  const editor: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
  };
  const textarea: CSSProperties = {
    width: "100%",
    minHeight: "var(--space-7, 120px)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "var(--type-2, 1rem)",
    padding: "var(--space-3, 12px)",
    borderRadius: "var(--radius-tile, 12px)",
    border: evalResult.error
      ? "2px solid var(--surplus-lost, #d24a4a)"
      : "1px solid var(--neutral-line, #e3e3df)",
    background: "var(--neutral-bg-2, #ffffff)",
    color: "var(--neutral-fg, #1c1c1f)",
    resize: "vertical",
  };
  const sliderGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "var(--space-4, 16px)",
  };
  const error: CSSProperties = {
    color: "var(--surplus-lost, #d24a4a)",
    fontSize: "var(--type-2, 1rem)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  };
  const hint: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
  };
  const graduation: CSSProperties = {
    background: "var(--deal-zone, rgba(27, 182, 118, 0.15))",
    borderLeft: "4px solid var(--surplus-good, #1bb676)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-5, 24px)",
    fontSize: "var(--type-3, 1.05rem)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
  };
  const graduationBtn: CSSProperties = {
    background: "var(--surplus-good, #1bb676)",
    color: "white",
    border: 0,
    padding: "var(--space-4, 16px) var(--space-7, 48px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-4, 1.3rem)",
    fontWeight: 600,
    alignSelf: "flex-start",
    cursor: "pointer",
  };
  const helpBox: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "var(--type-1, 0.85rem)",
    whiteSpace: "pre",
    color: "var(--neutral-fg, #1c1c1f)",
    overflow: "auto",
  };

  const surplusValue = Math.max(0, evalResult.value);
  const lost = Math.max(0, defaultEval - surplusValue);

  return (
    <LevelShell
      level={8}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Author your own"
      stakes="Build a participant. Pick a role, edit the formula, see what surplus your design produces. Next level: take it to a 12-week commitment schedule."
      continueLabel="Continue → Level 9"
      continueDisabled={!graduated}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={chipRow} role="radiogroup" aria-label="participant role">
          {ROLES.map(({ role: r, label }) => {
            const isActive = r === role;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleRoleChange(r)}
                data-testid={`role-chip-${r}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-1, 4px)",
                  padding: "var(--space-3, 12px)",
                  background: isActive
                    ? "var(--role-coordinator, #6d54ff)"
                    : "var(--neutral-bg-2, #ffffff)",
                  color: isActive ? "white" : "var(--neutral-fg, #1c1c1f)",
                  border: "1px solid var(--neutral-line, #e3e3df)",
                  borderRadius: "var(--radius-card, 16px)",
                  cursor: "pointer",
                  minWidth: "var(--space-7, 100px)",
                }}
              >
                <AgentFigure role={r} size="small" mood={isActive ? "happy" : "neutral"} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div style={editor}>
          <label
            htmlFor="formula-editor"
            style={{ fontSize: "var(--type-2, 1rem)", fontWeight: 600 }}
          >
            Utility formula
          </label>
          <textarea
            id="formula-editor"
            value={formula}
            onChange={(e) => handleFormulaChange(e.target.value)}
            style={textarea}
            data-testid="formula-editor"
            aria-invalid={Boolean(evalResult.error)}
          />
          {evalResult.error && (
            <div style={error} role="alert" data-testid="formula-error">
              {evalResult.error}
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: "var(--space-2, 8px)",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleShare}
              data-testid="share-participant"
              style={{
                background: shareCopied
                  ? "var(--surplus-good, #1bb676)"
                  : "var(--role-coordinator, #6d54ff)",
                color: "white",
                border: 0,
                padding: "var(--space-2, 8px) var(--space-4, 16px)",
                borderRadius: "var(--radius-pill, 999px)",
                fontSize: "var(--type-1, 0.85rem)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {shareCopied ? "URL copied!" : "Share this participant"}
            </button>
          </div>
          <div style={hint}>
            You can edit the formula. The lab parses what you write; if
            anything is wrong it shows you the message above. Variables
            you can use:
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--role-coordinator, #6d54ff)",
                cursor: "pointer",
                textDecoration: "underline",
                marginLeft: "var(--space-2, 8px)",
              }}
              data-testid="formula-help-toggle"
            >
              {helpOpen ? "hide help" : "show help"}
            </button>
          </div>
          {helpOpen && (
            <pre style={helpBox} data-testid="formula-help">
              {VARIABLES_HELP}
            </pre>
          )}
        </div>

        <div style={sliderGrid} data-testid="param-sliders">
          <QuantityKnob
            label="urgency"
            value={params.urgency}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange("urgency", v)}
            format={(v) => v.toFixed(2)}
            testId="param-urgency"
          />
          <QuantityKnob
            label="flexibility"
            value={params.flexibility}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange("flexibility", v)}
            format={(v) => v.toFixed(2)}
            testId="param-flexibility"
          />
          <QuantityKnob
            label="truthfulness"
            value={params.truthfulness}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange("truthfulness", v)}
            format={(v) => v.toFixed(2)}
            testId="param-truthfulness"
          />
          <QuantityKnob
            label="privacy preference"
            value={params.privacyPreference}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange("privacyPreference", v)}
            format={(v) => v.toFixed(2)}
            testId="param-privacy"
          />
          <QuantityKnob
            label="risk aversion"
            value={params.riskAversion}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => handleParamChange("riskAversion", v)}
            format={(v) => v.toFixed(2)}
            testId="param-risk"
          />
        </div>

        <SurplusBar
          value={surplusValue}
          lost={lost}
          label="Surplus from your participant vs the default for this role"
          testId="level8-surplus"
        />

        {graduated && (
          <div style={graduation} data-testid="graduation-card" role="status">
            <strong>You've built a participant.</strong> One screen, one
            week. The next level scales the same participant across a
            12-week commitment schedule, where firm, soft, and forecast
            promises each carry different costs.
            <button
              type="button"
              style={graduationBtn}
              onClick={handleContinue}
              data-testid="open-sandbox"
            >
              Continue → Level 9
            </button>
          </div>
        )}
      </div>
    </LevelShell>
  );
}
