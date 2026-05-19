/**
 * PredictReveal — tracks the user's first commitment, then shows the
 * truth.
 *
 * Pattern: the user makes a guess (drags a slider, picks a stop). The
 * primitive holds the guess hidden until the user calls `reveal()`,
 * then renders the prediction + the actual answer side by side.
 *
 * Used by Levels 2, 3, 5, 6, and the lab's "what would you predict?"
 * micro-interactions in Phases 3-4.
 */

import { useState, type ReactNode, type CSSProperties } from "react";

export interface PredictRevealProps<T> {
  /** The user's current "live" value (slider position, etc.) */
  liveValue: T;
  /** Pretty-print a value for display in the prediction/truth row. */
  renderValue: (value: T) => ReactNode;
  /** The "true answer" the user is trying to find. */
  truth: T;
  /** A short label above the prediction row (e.g. "your guess"). */
  predictionLabel?: string;
  /** A short label above the truth row (e.g. "the answer"). */
  truthLabel?: string;
  /** A one-sentence reveal blurb shown only after the user reveals. */
  insight: ReactNode;
  /**
   * Called when the user clicks "reveal". The captured guess is the
   * `liveValue` at the moment of the click.
   */
  onReveal?: (guess: T) => void;
  /** Disable the reveal button. */
  disabled?: boolean;
  /** Override the reveal button label. */
  revealLabel?: string;
  /** testid for the wrapper */
  testId?: string;
}

export function PredictReveal<T>({
  liveValue,
  renderValue,
  truth,
  predictionLabel = "your guess",
  truthLabel = "the answer",
  insight,
  onReveal,
  disabled = false,
  revealLabel = "Reveal",
  testId,
}: PredictRevealProps<T>) {
  const [guess, setGuess] = useState<T | null>(null);

  const handleReveal = () => {
    if (disabled) return;
    setGuess(liveValue);
    onReveal?.(liveValue);
  };

  const wrapper: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
  };
  const button: CSSProperties = {
    background: disabled
      ? "var(--neutral-line, #e3e3df)"
      : "var(--role-coordinator, #6d54ff)",
    color: disabled ? "var(--neutral-fg-soft, #5b5b62)" : "white",
    border: 0,
    padding: "var(--space-3, 12px) var(--space-5, 24px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    alignSelf: "center",
    cursor: disabled ? "not-allowed" : "pointer",
  };
  const compareGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--space-4, 16px)",
    background: "var(--neutral-bg, #f7f7f4)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
  };
  const cellLabel: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const cellValue: CSSProperties = {
    fontSize: "var(--type-4, 1.3rem)",
    fontWeight: 600,
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const insightBox: CSSProperties = {
    borderLeft: "4px solid var(--surplus-good, #1bb676)",
    background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
    padding: "var(--space-3, 12px) var(--space-4, 16px)",
    borderRadius: "var(--radius-tile, 12px)",
    fontSize: "var(--type-3, 1.05rem)",
  };

  return (
    <div style={wrapper} data-testid={testId ?? "predict-reveal"}>
      {guess === null ? (
        <button
          type="button"
          style={button}
          onClick={handleReveal}
          disabled={disabled}
          data-testid="predict-reveal-button"
        >
          {revealLabel}
        </button>
      ) : (
        <>
          <div style={compareGrid} data-testid="predict-reveal-compare">
            <div>
              <div style={cellLabel}>{predictionLabel}</div>
              <div style={cellValue} data-testid="predict-reveal-guess">
                {renderValue(guess)}
              </div>
            </div>
            <div>
              <div style={cellLabel}>{truthLabel}</div>
              <div style={cellValue} data-testid="predict-reveal-truth">
                {renderValue(truth)}
              </div>
            </div>
          </div>
          <div style={insightBox} role="status" data-testid="predict-reveal-insight">
            {insight}
          </div>
        </>
      )}
    </div>
  );
}
