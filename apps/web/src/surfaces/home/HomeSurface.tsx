/**
 * HomeSurface — the new entry experience for the deployed app.
 *
 * Replaces the dense Lab Arena landing. A first-time visitor sees one
 * primary "Start playing" CTA. A repeat visitor sees "Continue at
 * Level N" plus a visible "Sandbox →" link.
 */

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AgentFigure } from "../../primitives/AgentFigure";
import { ProgressDots } from "../../primitives/ProgressDots";
import {
  TOTAL_LEVELS,
  clearProgress,
  loadProgress,
  type LearnProgress,
} from "../../state/learnProgress";
import { loadStreak, touchStreak, type Streak } from "../../state/streak";

export interface HomeSurfaceProps {
  onStartPlaying: (level: number) => void;
  onOpenSandbox: () => void;
  onOpenNegotiate?: () => void;
}

export function HomeSurface({
  onStartPlaying,
  onOpenSandbox,
  onOpenNegotiate,
}: HomeSurfaceProps) {
  const [progress, setProgress] = useState<LearnProgress>(() => loadProgress());
  const [streak, setStreak] = useState<Streak>(() => loadStreak());

  // Live-reload on mount in case another tab updated localStorage,
  // and stamp today's visit into the streak.
  useEffect(() => {
    setProgress(loadProgress());
    setStreak(touchStreak());
  }, []);

  const hasProgress = progress.highest_completed > 0;
  const continueLevel = Math.min(
    TOTAL_LEVELS,
    progress.highest_completed + 1,
  );

  const handleReset = () => {
    clearProgress();
    setProgress(loadProgress());
  };

  const shell: CSSProperties = {
    minHeight: "100vh",
    background: "var(--neutral-bg, #f7f7f4)",
    color: "var(--neutral-fg, #1c1c1f)",
    display: "flex",
    flexDirection: "column",
  };
  const nav: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-4, 16px) var(--space-6, 32px)",
  };
  const navLogo: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
  const navLink: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    background: "transparent",
    border: 0,
    cursor: "pointer",
    padding: "var(--space-2, 8px) var(--space-4, 16px)",
    borderRadius: "var(--radius-pill, 999px)",
  };
  const main: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-6, 32px)",
    padding: "var(--space-6, 32px) var(--space-5, 24px)",
    textAlign: "center",
  };
  const title: CSSProperties = {
    fontSize: "var(--type-6, 2.4rem)",
    fontWeight: 600,
    margin: 0,
    maxWidth: "720px",
    lineHeight: 1.15,
  };
  const subtitle: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    margin: 0,
    maxWidth: "560px",
  };
  const figureRow: CSSProperties = {
    display: "flex",
    gap: "var(--space-7, 48px)",
    flexWrap: "wrap",
    justifyContent: "center",
  };
  const ctaRow: CSSProperties = {
    display: "flex",
    gap: "var(--space-3, 12px)",
    flexWrap: "wrap",
    justifyContent: "center",
  };
  const primaryBtn: CSSProperties = {
    background: "var(--role-buyer, #3a78ff)",
    color: "white",
    border: 0,
    padding: "var(--space-4, 16px) var(--space-7, 48px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    cursor: "pointer",
  };
  const ghostBtn: CSSProperties = {
    background: "transparent",
    color: "var(--neutral-fg, #1c1c1f)",
    border: "2px solid var(--neutral-line, #e3e3df)",
    padding: "var(--space-4, 16px) var(--space-6, 32px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 500,
    cursor: "pointer",
  };
  const resetLink: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    background: "transparent",
    border: 0,
    cursor: "pointer",
    textDecoration: "underline",
  };

  return (
    <div style={shell} data-testid="home-surface">
      <nav style={nav}>
        <span style={navLogo}>procurement-negotiation-lab</span>
        <button
          type="button"
          style={navLink}
          onClick={onOpenSandbox}
          data-testid="home-sandbox-link"
        >
          Sandbox →
        </button>
      </nav>

      <main style={main}>
        <div style={figureRow}>
          <AgentFigure role="buyer" mood="neutral" size="large" label="Buyer" />
          <AgentFigure
            role="supplier"
            mood="neutral"
            size="large"
            label="Supplier"
          />
        </div>

        <h1 style={title}>
          A small lab for mechanism design — built one screen at a time.
        </h1>
        <p style={subtitle}>
          Walk through nine short levels and end up with the intuition to
          build your own utility formulas in the Sandbox.
        </p>

        {hasProgress && (
          <ProgressDots
            current={continueLevel}
            total={TOTAL_LEVELS}
            completedThrough={progress.highest_completed}
          />
        )}

        {streak.current > 0 && (
          <div
            data-testid="streak-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2, 8px)",
              background: "var(--neutral-bg-2, #ffffff)",
              border: "1px solid var(--neutral-line, #e3e3df)",
              borderRadius: "var(--radius-pill, 999px)",
              padding: "var(--space-2, 8px) var(--space-4, 16px)",
              fontSize: "var(--type-2, 1rem)",
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            <strong>{streak.current}</strong>-day streak
            {streak.longest > streak.current && (
              <span style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}>
                · longest {streak.longest}
              </span>
            )}
          </div>
        )}

        <div style={ctaRow}>
          <button
            type="button"
            style={primaryBtn}
            onClick={() => onStartPlaying(hasProgress ? continueLevel : 1)}
            data-testid="home-start-cta"
          >
            {hasProgress ? `Continue at Level ${continueLevel}` : "Start playing"}
          </button>
          {hasProgress && (
            <button
              type="button"
              style={ghostBtn}
              onClick={() => onStartPlaying(1)}
              data-testid="home-restart-cta"
            >
              Start from Level 1
            </button>
          )}
          <button
            type="button"
            style={ghostBtn}
            onClick={onOpenSandbox}
            data-testid="home-sandbox-cta"
          >
            Open Sandbox
          </button>
          {onOpenNegotiate && (
            <button
              type="button"
              style={ghostBtn}
              onClick={onOpenNegotiate}
              data-testid="home-negotiate-cta"
            >
              Negotiate with a partner
            </button>
          )}
        </div>

        {hasProgress && (
          <button
            type="button"
            style={resetLink}
            onClick={handleReset}
            data-testid="home-reset-progress"
          >
            Reset progress
          </button>
        )}
      </main>
    </div>
  );
}
