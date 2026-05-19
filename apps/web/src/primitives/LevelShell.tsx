/**
 * LevelShell — common layout for every learn-surface level.
 *
 * Top:    ProgressDots
 * Top mid: one-sentence stakes line
 * Middle: the manipulable visual (children)
 * Bottom: prompt + Continue button + optional Reveal panel
 *
 * One concept per screen, by construction.
 */

import type { ReactNode, CSSProperties } from "react";
import { ProgressDots } from "./ProgressDots";

export interface LevelShellProps {
  level: number;
  total: number;
  completedThrough: number;
  title: string;
  stakes: string;
  children: ReactNode;
  prompt?: ReactNode;
  reveal?: ReactNode;
  continueLabel?: string;
  continueDisabled?: boolean;
  onContinue?: () => void;
  onJumpTo?: (level: number) => void;
  /** small persistent link to /sandbox in the corner */
  onOpenSandbox?: () => void;
  /** small persistent link back to home */
  onOpenHome?: () => void;
}

export function LevelShell({
  level,
  total,
  completedThrough,
  title,
  stakes,
  children,
  prompt,
  reveal,
  continueLabel = "Continue",
  continueDisabled = false,
  onContinue,
  onJumpTo,
  onOpenSandbox,
  onOpenHome,
}: LevelShellProps) {
  const shell: CSSProperties = {
    minHeight: "100vh",
    background: "var(--neutral-bg, #f7f7f4)",
    color: "var(--neutral-fg, #1c1c1f)",
    padding: "var(--space-5, 24px) var(--space-5, 24px)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6, 32px)",
  };
  const nav: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-4, 16px)",
  };
  const navLink: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    background: "transparent",
    border: 0,
    cursor: "pointer",
    padding: "var(--space-1, 4px) var(--space-3, 12px)",
    borderRadius: "var(--radius-pill, 999px)",
  };
  const main: CSSProperties = {
    maxWidth: "920px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const titleStyle: CSSProperties = {
    fontSize: "var(--type-5, 1.8rem)",
    fontWeight: 600,
    margin: 0,
    textAlign: "center",
  };
  const stakesStyle: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textAlign: "center",
    margin: 0,
  };
  const stage: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-6, 32px)",
    boxShadow: "var(--shadow-md, 0 4px 12px rgba(28, 28, 31, 0.1))",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const promptRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-4, 16px)",
    flexWrap: "wrap",
  };
  const continueBtn: CSSProperties = {
    background: continueDisabled
      ? "var(--neutral-line, #e3e3df)"
      : "var(--role-buyer, #3a78ff)",
    color: continueDisabled
      ? "var(--neutral-fg-soft, #5b5b62)"
      : "white",
    border: 0,
    padding: "var(--space-3, 12px) var(--space-6, 32px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    cursor: continueDisabled ? "not-allowed" : "pointer",
    transition: "background var(--motion-quick, 120ms) var(--easing-soft, ease)",
  };
  const revealStyle: CSSProperties = {
    background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
    borderLeft: "4px solid var(--surplus-good, #1bb676)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px) var(--space-5, 24px)",
    fontSize: "var(--type-3, 1.05rem)",
    color: "var(--neutral-fg, #1c1c1f)",
    transition: "opacity var(--motion-mid, 240ms) var(--easing-soft, ease)",
  };

  return (
    <section style={shell} data-testid={`level-shell-${level}`}>
      <div style={nav}>
        <button
          type="button"
          style={navLink}
          onClick={onOpenHome}
          aria-label="Home"
        >
          ← Home
        </button>
        <ProgressDots
          current={level}
          total={total}
          completedThrough={completedThrough}
          onJumpTo={onJumpTo}
        />
        <button
          type="button"
          style={navLink}
          onClick={onOpenSandbox}
          aria-label="Sandbox"
        >
          Sandbox →
        </button>
      </div>

      <div style={main}>
        <header>
          <h1 style={titleStyle}>{title}</h1>
          <p style={stakesStyle}>{stakes}</p>
        </header>

        <div style={stage}>{children}</div>

        {reveal && (
          <div role="status" aria-live="polite" style={revealStyle} data-testid="level-reveal">
            {reveal}
          </div>
        )}

        <div style={promptRow}>
          <div style={{ flex: 1 }}>{prompt}</div>
          <button
            type="button"
            style={continueBtn}
            disabled={continueDisabled}
            onClick={onContinue}
            data-testid="level-continue"
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
