/**
 * QuantityKnob — a wide, accessible numeric slider with an attached label
 * and live readout. The "round-friendly" version of an HTML <input
 * type="range">. Pure presentation; no engine imports.
 */

import { useId } from "react";
import type { CSSProperties } from "react";

export interface QuantityKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
  onRelease?: (final: number) => void;
  /** wrap the readout in a custom formatter (e.g. money(value)) */
  format?: (value: number) => string;
  disabled?: boolean;
  testId?: string;
}

export function QuantityKnob({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  onRelease,
  format,
  disabled = false,
  testId,
}: QuantityKnobProps) {
  const id = useId();
  const display = format
    ? format(value)
    : unit
      ? `${value} ${unit}`
      : String(value);
  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    width: "100%",
  };
  const headRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "var(--space-3, 12px)",
  };
  const labelStyle: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const valueStyle: CSSProperties = {
    fontSize: "var(--type-4, 1.3rem)",
    fontWeight: 600,
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const rangeStyle: CSSProperties = {
    width: "100%",
    accentColor: "var(--role-buyer, #3a78ff)",
    height: "var(--space-5, 24px)",
    cursor: disabled ? "not-allowed" : "grab",
  };

  return (
    <div style={wrapperStyle} data-testid={testId ?? "quantity-knob"}>
      <div style={headRow}>
        <label htmlFor={id} style={labelStyle}>
          {label}
        </label>
        <output htmlFor={id} style={valueStyle} aria-live="polite">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={() => onRelease?.(value)}
        style={rangeStyle}
        aria-label={label}
      />
    </div>
  );
}
