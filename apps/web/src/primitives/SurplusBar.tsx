/**
 * SurplusBar — horizontal bar visualizing joint surplus + lost value.
 *
 * Two segments:
 *   value (green)  -- joint surplus captured at the current plan
 *   lost  (red)    -- gap between current plan and oracle / sweet spot
 *
 * Both values are non-negative. The bar scales to a `max` cap; the sum
 * of value + lost is the upper bound by default.
 */

import type { CSSProperties } from "react";

export interface SurplusBarProps {
  value: number;
  lost?: number;
  /** upper bound for scaling; defaults to value + lost */
  max?: number;
  /** show the dollar-formatted readout at the right */
  showReadout?: boolean;
  /** override the right-side readout */
  readout?: string;
  /** label rendered above the bar */
  label?: string;
  testId?: string;
}

function money(value: number): string {
  const abs = Math.round(Math.abs(value));
  const formatted = `$${abs.toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

export function SurplusBar({
  value,
  lost = 0,
  max,
  showReadout = true,
  readout,
  label,
  testId,
}: SurplusBarProps) {
  const safeValue = Math.max(0, value);
  const safeLost = Math.max(0, lost);
  const total = max ?? safeValue + safeLost;
  const denom = total === 0 ? 1 : total;
  const valuePct = (safeValue / denom) * 100;
  const lostPct = (safeLost / denom) * 100;

  const wrapper: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    width: "100%",
  };
  const headRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
  };
  const track: CSSProperties = {
    display: "flex",
    height: "var(--space-5, 24px)",
    width: "100%",
    background: "var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-pill, 999px)",
    overflow: "hidden",
  };
  const valueSeg: CSSProperties = {
    width: `${valuePct}%`,
    background: "var(--surplus-good, #1bb676)",
    transition:
      "width var(--motion-mid, 240ms) var(--easing-soft, cubic-bezier(0.22, 0.61, 0.36, 1))",
  };
  const lostSeg: CSSProperties = {
    width: `${lostPct}%`,
    background: "var(--surplus-lost, #d64545)",
    transition:
      "width var(--motion-mid, 240ms) var(--easing-soft, cubic-bezier(0.22, 0.61, 0.36, 1))",
  };

  return (
    <div style={wrapper} data-testid={testId ?? "surplus-bar"}>
      {(label || showReadout) && (
        <div style={headRow}>
          {label ? <span>{label}</span> : <span />}
          {showReadout && (
            <span aria-live="polite">
              {readout ??
                (safeLost > 0
                  ? `${money(safeValue)} captured, ${money(safeLost)} lost`
                  : money(safeValue))}
            </span>
          )}
        </div>
      )}
      <div
        style={track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={safeValue}
        aria-label={label ?? "surplus bar"}
      >
        <div style={valueSeg} data-testid="surplus-bar-value" />
        <div style={lostSeg} data-testid="surplus-bar-lost" />
      </div>
    </div>
  );
}
