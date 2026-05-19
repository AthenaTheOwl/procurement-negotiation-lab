/**
 * SplitRuleToggle — 3-stop pill toggle.
 *
 * `proportional` | `equal` | `shapley`. Matches the engine's SplitRule
 * union. Pure UI; the level wires onChange to a state update.
 */

import type { CSSProperties } from "react";
import type { SplitRule } from "@lab/engine";

export const SPLIT_RULES: SplitRule[] = ["proportional", "equal", "shapley"];

export const SPLIT_LABELS: Record<SplitRule, string> = {
  proportional: "proportional",
  equal: "equal",
  shapley: "shapley",
};

export interface SplitRuleToggleProps {
  value: SplitRule;
  onChange: (next: SplitRule) => void;
  disabled?: boolean;
  testId?: string;
}

export function SplitRuleToggle({
  value,
  onChange,
  disabled = false,
  testId,
}: SplitRuleToggleProps) {
  const wrapper: CSSProperties = {
    display: "inline-flex",
    background: "var(--neutral-bg, #f7f7f4)",
    borderRadius: "var(--radius-pill, 999px)",
    padding: "var(--space-1, 4px)",
    gap: "var(--space-1, 4px)",
    border: "1px solid var(--neutral-line, #e3e3df)",
  };

  return (
    <div
      style={wrapper}
      role="radiogroup"
      aria-label="surplus split rule"
      data-testid={testId ?? "split-rule-toggle"}
    >
      {SPLIT_RULES.map((rule) => {
        const isActive = rule === value;
        const pill: CSSProperties = {
          padding: "var(--space-2, 8px) var(--space-5, 24px)",
          borderRadius: "var(--radius-pill, 999px)",
          background: isActive
            ? "var(--role-coordinator, #6d54ff)"
            : "transparent",
          color: isActive ? "white" : "var(--neutral-fg, #1c1c1f)",
          border: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "var(--type-2, 1rem)",
          fontWeight: isActive ? 600 : 400,
          transition:
            "all var(--motion-quick, 120ms) var(--easing-soft, ease)",
        };
        return (
          <button
            key={rule}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(rule)}
            style={pill}
            data-testid={`split-rule-${rule}`}
          >
            {SPLIT_LABELS[rule]}
          </button>
        );
      })}
    </div>
  );
}
