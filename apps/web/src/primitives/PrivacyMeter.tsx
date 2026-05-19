/**
 * PrivacyMeter — vertical gauge for how much information is shared.
 *
 * Range 0..1. Fills in the privacy-cost color (warm orange) as exposure
 * rises. Includes a label and a numeric readout so screen readers and
 * sighted users can both consume it.
 */

import type { CSSProperties } from "react";

export interface PrivacyMeterProps {
  /** 0..1 (clamped) */
  exposure: number;
  label?: string;
  testId?: string;
}

export function PrivacyMeter({
  exposure,
  label = "privacy cost",
  testId,
}: PrivacyMeterProps) {
  const clamped = Math.min(1, Math.max(0, exposure));
  const pct = clamped * 100;

  const wrapper: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    alignItems: "center",
  };
  const labelStyle: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const track: CSSProperties = {
    width: "var(--space-5, 24px)",
    height: "var(--space-7, 120px)",
    background: "var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    position: "relative",
    overflow: "hidden",
  };
  const fill: CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: `${pct}%`,
    background: "var(--privacy-cost, #d3603a)",
    transition: "height var(--motion-mid, 240ms) var(--easing-soft, ease)",
  };
  const readout: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    fontWeight: 600,
    color: "var(--neutral-fg, #1c1c1f)",
  };

  return (
    <div
      style={wrapper}
      data-testid={testId ?? "privacy-meter"}
      role="img"
      aria-label={`${label}: ${Math.round(pct)} percent`}
    >
      <div style={labelStyle}>{label}</div>
      <div style={track} data-testid="privacy-meter-track">
        <div style={fill} data-testid="privacy-meter-fill" />
      </div>
      <div style={readout} data-testid="privacy-meter-readout">
        {Math.round(pct)}%
      </div>
    </div>
  );
}
