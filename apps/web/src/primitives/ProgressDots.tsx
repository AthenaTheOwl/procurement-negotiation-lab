/**
 * ProgressDots — 1..N indicator for the learn surface.
 *
 * Renders each step as one of three states:
 *   completed — solid dot in the surplus-good color
 *   current   — outlined dot with a pulsing ring
 *   locked    — outlined dot with reduced opacity
 *
 * Click on a completed or current dot navigates back to that level.
 */

import type { CSSProperties } from "react";

export interface ProgressDotsProps {
  current: number;
  total: number;
  completedThrough: number;
  onJumpTo?: (level: number) => void;
  testId?: string;
}

export function ProgressDots({
  current,
  total,
  completedThrough,
  onJumpTo,
  testId,
}: ProgressDotsProps) {
  const wrapper: CSSProperties = {
    display: "flex",
    gap: "var(--space-2, 8px)",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-2, 8px) 0",
  };

  const dots: JSX.Element[] = [];
  for (let level = 1; level <= total; level += 1) {
    const state =
      level <= completedThrough
        ? "completed"
        : level === current
          ? "current"
          : "locked";
    const clickable =
      onJumpTo !== undefined && (state === "completed" || state === "current");
    const dotStyle: CSSProperties = {
      width: "var(--space-3, 12px)",
      height: "var(--space-3, 12px)",
      borderRadius: "var(--radius-pill, 999px)",
      border: "2px solid var(--neutral-line, #e3e3df)",
      background:
        state === "completed"
          ? "var(--surplus-good, #1bb676)"
          : "transparent",
      opacity: state === "locked" ? 0.4 : 1,
      transform: state === "current" ? "scale(1.25)" : "scale(1)",
      boxShadow:
        state === "current"
          ? "0 0 0 4px color-mix(in srgb, var(--surplus-good, #1bb676) 25%, transparent)"
          : "none",
      cursor: clickable ? "pointer" : "default",
      transition:
        "all var(--motion-quick, 120ms) var(--easing-soft, ease)",
      padding: 0,
    };
    dots.push(
      <button
        key={level}
        type="button"
        style={dotStyle}
        disabled={!clickable}
        onClick={() => clickable && onJumpTo?.(level)}
        aria-label={`Level ${level} (${state})`}
        aria-current={state === "current" ? "step" : undefined}
        data-testid={`progress-dot-${level}`}
        data-state={state}
      />,
    );
  }

  return (
    <div
      style={wrapper}
      role="navigation"
      aria-label="Lesson progress"
      data-testid={testId ?? "progress-dots"}
    >
      {dots}
    </div>
  );
}
