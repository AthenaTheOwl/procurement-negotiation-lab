/**
 * Level 01 — There is a gap.
 *
 * Two figures. One settle button. Reveals the lost surplus when the user
 * "settles" at the supplier's smaller quantity. No knobs.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/01.md
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  defaultLearnScenario,
  findJointOptimum,
  jointUtilityAt,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { LevelShell } from "../../primitives/LevelShell";
import { SurplusBar } from "../../primitives/SurplusBar";
import {
  TOTAL_LEVELS,
  type LearnProgress,
} from "../../state/learnProgress";

const SETTLED_QUANTITY = 350; // supplier's capacity in the default scenario
const REVEAL_BEAT_MS = 600;

export interface Level01Props {
  progress: LearnProgress;
  onComplete: () => void;
  onOpenSandbox?: () => void;
  onOpenHome?: () => void;
  onJumpTo?: (level: number) => void;
}

export function Level01({
  progress,
  onComplete,
  onOpenSandbox,
  onOpenHome,
  onJumpTo,
}: Level01Props) {
  const setup = defaultLearnScenario();
  const optimum = findJointOptimum(
    setup.qMin,
    setup.qMax,
    5,
    setup.demand,
    setup.supplierCapacity,
  );
  const settledJoint = jointUtilityAt(
    SETTLED_QUANTITY,
    setup.demand,
    setup.supplierCapacity,
  );
  const lost = Math.max(0, optimum.joint - settledJoint);

  const [settled, setSettled] = useState(false);
  const [revealReady, setRevealReady] = useState(false);

  // Once the user clicks Settle, beat a moment before unlocking Continue.
  useEffect(() => {
    if (!settled) return;
    const timer = window.setTimeout(() => setRevealReady(true), REVEAL_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [settled]);

  const handleSettle = () => {
    if (!settled) setSettled(true);
  };

  const handleContinue = () => {
    if (!revealReady) return;
    onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-6, 32px)",
  };
  const figureRow: CSSProperties = {
    display: "flex",
    gap: "var(--space-7, 48px)",
    alignItems: "flex-end",
    justifyContent: "center",
    flexWrap: "wrap",
  };
  const thoughtBubble: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg, #1c1c1f)",
    marginBottom: "var(--space-3, 12px)",
    minWidth: "120px",
    textAlign: "center",
  };
  const figureCol: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };
  const settleBtn: CSSProperties = {
    background: settled
      ? "var(--neutral-line, #e3e3df)"
      : "var(--role-buyer, #3a78ff)",
    color: settled ? "var(--neutral-fg-soft, #5b5b62)" : "white",
    border: 0,
    padding: "var(--space-4, 16px) var(--space-7, 48px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-4, 1.3rem)",
    fontWeight: 600,
    cursor: settled ? "default" : "pointer",
    transition: "background var(--motion-quick, 120ms) var(--easing-soft, ease)",
  };

  const moodAfter: "neutral" | "worried" = settled ? "worried" : "neutral";

  return (
    <LevelShell
      level={1}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="There is a gap"
      stakes="A factory ships fewer units than a buyer wants. Find out what gets lost in the gap."
      reveal={
        settled && revealReady ? (
          <div>
            <strong>Settled at {SETTLED_QUANTITY} units.</strong> The joint
            sweet spot is closer to {optimum.q} units, where the two parties
            would have captured roughly {Math.round(optimum.joint)} in joint
            value. Acting locally cost about{" "}
            <strong>${Math.round(lost).toLocaleString()}</strong> of joint
            value.
          </div>
        ) : undefined
      }
      continueLabel="Continue → Level 2"
      continueDisabled={!revealReady}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenSandbox={onOpenSandbox}
      onOpenHome={onOpenHome}
    >
      <div style={stage}>
        <div style={figureRow}>
          <div style={figureCol}>
            <div style={thoughtBubble} data-testid="buyer-thought">
              wants: 500
            </div>
            <AgentFigure
              role="buyer"
              mood={moodAfter}
              size="large"
              label="Buyer"
            />
          </div>
          <div style={figureCol}>
            <div style={thoughtBubble} data-testid="supplier-thought">
              has: 350
            </div>
            <AgentFigure
              role="supplier"
              mood={moodAfter}
              size="large"
              label="Supplier"
            />
          </div>
        </div>

        {settled ? (
          <SurplusBar
            value={settledJoint}
            lost={lost}
            label="Joint value at the local plan"
          />
        ) : (
          <button
            type="button"
            style={settleBtn}
            onClick={handleSettle}
            data-testid="settle-button"
          >
            Settle now
          </button>
        )}
      </div>
    </LevelShell>
  );
}
