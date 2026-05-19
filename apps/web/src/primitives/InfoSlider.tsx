/**
 * InfoSlider — 6-stop discrete slider mapping privacy/information
 * trade-offs.
 *
 * Each stop is a distinct InfoMode. The slider is keyboard accessible
 * (Left/Right + Home/End) and renders one label per stop below the
 * track.
 *
 * Default stops match the engine's `InfoMode`:
 *   private → risk-only → capacity-band → cost-band → forecast-band
 *   → full-oracle
 */

import type { CSSProperties } from "react";
import type { InfoMode } from "@lab/engine";

export const INFO_STOPS: InfoMode[] = [
  "private",
  "risk-only",
  "capacity-band",
  "cost-band",
  "forecast-band",
  "full-oracle",
];

export const INFO_STOP_LABELS: Record<InfoMode, string> = {
  private: "private",
  "risk-only": "risk only",
  "capacity-band": "capacity band",
  "cost-band": "cost band",
  "forecast-band": "forecast band",
  "full-oracle": "full oracle",
};

export interface InfoSliderProps {
  value: InfoMode;
  onChange: (mode: InfoMode) => void;
  /** highlight one stop with a green ring (the "sweet zone") */
  highlight?: InfoMode | InfoMode[];
  disabled?: boolean;
  testId?: string;
}

export function InfoSlider({
  value,
  onChange,
  highlight,
  disabled = false,
  testId,
}: InfoSliderProps) {
  const currentIndex = INFO_STOPS.indexOf(value);
  const highlightSet = new Set(
    Array.isArray(highlight) ? highlight : highlight ? [highlight] : [],
  );

  const wrapper: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
    width: "100%",
  };
  const track: CSSProperties = {
    position: "relative",
    height: "var(--space-2, 8px)",
    borderRadius: "var(--radius-pill, 999px)",
    background: "var(--neutral-line, #e3e3df)",
    margin: "var(--space-4, 16px) 0",
  };
  const fill: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: `${(currentIndex / (INFO_STOPS.length - 1)) * 100}%`,
    background: "var(--privacy-cost, #d3603a)",
    borderRadius: "var(--radius-pill, 999px)",
    transition: "width var(--motion-mid, 240ms) var(--easing-soft, ease)",
  };
  const stopsRow: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    transform: "translateY(-50%)",
  };
  const labelsRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    gap: "var(--space-2, 8px)",
  };

  return (
    <div style={wrapper} data-testid={testId ?? "info-slider"}>
      <div style={track} role="presentation">
        <div style={fill} aria-hidden="true" />
        <div style={stopsRow}>
          {INFO_STOPS.map((stop, idx) => {
            const isActive = idx === currentIndex;
            const isHighlighted = highlightSet.has(stop);
            const dotStyle: CSSProperties = {
              width: "var(--space-4, 16px)",
              height: "var(--space-4, 16px)",
              borderRadius: "var(--radius-pill, 999px)",
              border: "2px solid var(--neutral-line, #e3e3df)",
              background: isActive
                ? "var(--privacy-cost, #d3603a)"
                : "var(--neutral-bg-2, #ffffff)",
              boxShadow: isHighlighted
                ? "0 0 0 4px color-mix(in srgb, var(--surplus-good, #1bb676) 30%, transparent)"
                : isActive
                  ? "0 2px 6px rgba(28, 28, 31, 0.15)"
                  : "none",
              cursor: disabled ? "not-allowed" : "pointer",
              padding: 0,
              transition: "all var(--motion-quick, 120ms) var(--easing-soft, ease)",
            };
            return (
              <button
                key={stop}
                type="button"
                style={dotStyle}
                disabled={disabled}
                onClick={() => onChange(stop)}
                data-testid={`info-stop-${stop}`}
                aria-pressed={isActive}
                aria-label={INFO_STOP_LABELS[stop]}
              />
            );
          })}
        </div>
      </div>
      <div style={labelsRow}>
        {INFO_STOPS.map((stop) => (
          <span
            key={stop}
            style={{
              flex: 1,
              textAlign: "center",
              fontWeight: stop === value ? 600 : 400,
              color:
                stop === value
                  ? "var(--neutral-fg, #1c1c1f)"
                  : "var(--neutral-fg-soft, #5b5b62)",
            }}
          >
            {INFO_STOP_LABELS[stop]}
          </span>
        ))}
      </div>
    </div>
  );
}
