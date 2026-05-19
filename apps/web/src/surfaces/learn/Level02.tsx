/**
 * Level 02 — Close the gap.
 *
 * Two figures, one knob, one surplus bar. Drag to find the q that
 * maximizes joint surplus. Reveal compares your release point to the
 * joint optimum.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/02.md
 */

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  defaultLearnScenario,
  findJointOptimum,
  jointUtilityAt,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { LevelShell } from "../../primitives/LevelShell";
import { PredictReveal } from "../../primitives/PredictReveal";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { SurplusBar } from "../../primitives/SurplusBar";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

const TOLERANCE = 25;
const MIN_DRAG_MS = 5_000;

export interface Level02Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

export function Level02({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level02Props) {
  const setup = defaultLearnScenario();
  const optimum = findJointOptimum(
    setup.qMin,
    setup.qMax,
    5,
    setup.demand,
    setup.supplierCapacity,
  );
  const optimumJoint = optimum.joint;

  const [q, setQ] = useState<number>(setup.qMin);
  const [hasMoved, setHasMoved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [foundOptimum, setFoundOptimum] = useState(false);
  const [dragTime, setDragTime] = useState<number>(0);

  // Tick up dragTime once the user starts moving the knob.
  useEffect(() => {
    if (!hasMoved || revealed) return;
    const id = window.setInterval(() => setDragTime((t) => t + 100), 100);
    return () => window.clearInterval(id);
  }, [hasMoved, revealed]);

  const surplus = jointUtilityAt(q, setup.demand, setup.supplierCapacity);
  const lost = Math.max(0, optimumJoint - surplus);
  const within = Math.abs(q - optimum.q) <= TOLERANCE;

  const handleChange = useCallback((next: number) => {
    setQ(next);
    setHasMoved(true);
  }, []);

  const handleRelease = useCallback(
    (final: number) => {
      if (Math.abs(final - optimum.q) <= TOLERANCE) {
        setFoundOptimum(true);
      }
    },
    [optimum.q],
  );

  const mood = revealed
    ? within
      ? "happy"
      : "worried"
    : "neutral";

  const canContinue =
    revealed && (foundOptimum || dragTime >= MIN_DRAG_MS);

  const handleContinue = () => {
    if (canContinue) onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
    alignItems: "center",
  };
  const figureRow: CSSProperties = {
    display: "flex",
    gap: "var(--space-7, 48px)",
    alignItems: "flex-end",
    justifyContent: "center",
    flexWrap: "wrap",
  };
  const readout: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    color: "var(--neutral-fg, #1c1c1f)",
    textAlign: "center",
  };

  return (
    <LevelShell
      level={2}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Close the gap"
      stakes="What number would have closed the gap from last level?"
      continueLabel="Continue → Level 3"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={figureRow}>
          <AgentFigure role="buyer" mood={mood} size="medium" label="Buyer" />
          <AgentFigure role="supplier" mood={mood} size="medium" label="Supplier" />
        </div>

        <QuantityKnob
          label="Units to commit"
          value={q}
          min={setup.qMin}
          max={setup.qMax}
          step={5}
          onChange={handleChange}
          onRelease={handleRelease}
          format={(v) => `${v} units`}
          testId="level2-knob"
        />

        <SurplusBar
          value={surplus}
          lost={lost}
          label={`Joint surplus at q = ${q}`}
          testId="level2-surplus"
        />

        <div style={readout} data-testid="level2-readout">
          {hasMoved
            ? within
              ? "You're at the joint sweet spot."
              : `Try moving toward q ≈ ${optimum.q}.`
            : "Drag the slider to feel how surplus changes with q."}
        </div>

        <PredictReveal
          liveValue={q}
          truth={optimum.q}
          renderValue={(v) => `${v} units`}
          predictionLabel="where you released"
          truthLabel="joint optimum"
          insight={
            within
              ? `Right on it. Buyers want more, suppliers want less; the maximum joint surplus sits between, near q ≈ ${optimum.q}.`
              : `The joint sweet spot is q ≈ ${optimum.q}. Locally optimal asks from either side miss this; you have to see both utility curves to find it.`
          }
          revealLabel="Reveal the joint optimum"
          onReveal={() => setRevealed(true)}
          disabled={!hasMoved}
          testId="level2-reveal"
        />
      </div>
    </LevelShell>
  );
}
