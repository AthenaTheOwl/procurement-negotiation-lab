/**
 * Level 04 — Splitting the surplus.
 *
 * Two utility curves side by side. A single share slider (0..100%) moves
 * both active markers. Find a share where both parties land above their
 * outside option.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/04.md
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  DEFAULT_BUYER_OUTSIDE,
  DEFAULT_SUPPLIER_OUTSIDE,
  defaultLearnScenario,
  feasibleBand,
  findJointOptimum,
  sampleSplitCurve,
  splitOutcome,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { LevelShell } from "../../primitives/LevelShell";
import { PredictReveal } from "../../primitives/PredictReveal";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { UtilityCurve } from "../../primitives/UtilityCurve";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

const FEASIBLE_HOLD_MS = 500;

export interface Level04Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function Level04({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level04Props) {
  const setup = defaultLearnScenario();
  const optimum = findJointOptimum(
    setup.qMin,
    setup.qMax,
    5,
    setup.demand,
    setup.supplierCapacity,
  );

  const config = useMemo(
    () => ({
      globalUtility: optimum.joint,
      buyerOutside: DEFAULT_BUYER_OUTSIDE,
      supplierOutside: DEFAULT_SUPPLIER_OUTSIDE,
    }),
    [optimum.joint],
  );
  const curve = useMemo(() => sampleSplitCurve(0.02, config), [config]);
  const buyerPoints = useMemo(
    () => curve.map((p) => ({ x: p.share, y: p.buyerUtility })),
    [curve],
  );
  const supplierPoints = useMemo(
    () => curve.map((p) => ({ x: p.share, y: p.supplierUtility })),
    [curve],
  );
  const [lo, hi] = useMemo(() => feasibleBand(config), [config]);
  const fairCenter = (lo + hi) / 2;

  const [sharePct, setSharePct] = useState(0);
  const share = sharePct / 100;
  const point = splitOutcome(share, config);

  const [feasibleStart, setFeasibleStart] = useState<number | null>(null);
  const [reachedFeasible, setReachedFeasible] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!point.feasible) {
      setFeasibleStart(null);
      return;
    }
    if (feasibleStart === null) {
      setFeasibleStart(Date.now());
    }
    const id = window.setTimeout(() => {
      if (point.feasible) {
        setReachedFeasible(true);
      }
    }, FEASIBLE_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [point.feasible, feasibleStart]);

  const buyerMood: "neutral" | "happy" | "worried" | "walked-away" =
    !point.buyerFeasible
      ? "walked-away"
      : reachedFeasible
        ? "happy"
        : "neutral";
  const supplierMood: "neutral" | "happy" | "worried" | "walked-away" =
    !point.supplierFeasible
      ? "walked-away"
      : reachedFeasible
        ? "happy"
        : "neutral";

  const statusLabel = point.feasible
    ? "both above outside option"
    : !point.buyerFeasible
      ? "buyer would walk"
      : "supplier would walk";
  const statusColor = point.feasible
    ? "var(--surplus-good, #1bb676)"
    : "var(--surplus-lost, #d24a4a)";

  const canContinue = revealed && reachedFeasible;
  const handleContinue = () => {
    if (canContinue) onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
    alignItems: "stretch",
  };
  const figureRow: CSSProperties = {
    display: "flex",
    gap: "var(--space-7, 48px)",
    justifyContent: "center",
    alignItems: "flex-end",
    flexWrap: "wrap",
  };
  const curveRow: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "var(--space-5, 24px)",
    alignItems: "start",
    justifyItems: "center",
  };
  const status: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    color: statusColor,
    textAlign: "center",
  };

  return (
    <LevelShell
      level={4}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Splitting the surplus"
      stakes="A deal needs both parties above their walkaway. Find a share where both stay in the room."
      continueLabel="Continue → Level 5"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div
          data-testid="level4-intro"
          style={{
            background: "var(--neutral-bg-2, #ffffff)",
            border: "1px solid var(--neutral-line, #e3e3df)",
            borderRadius: "var(--radius-card, 16px)",
            padding: "var(--space-4, 16px) var(--space-5, 24px)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2, 8px)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              fontWeight: 600,
            }}
          >
            What the share slider does
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Closing the gap and sharing information (Levels 2–3) created
            joint value. Now someone has to decide who gets how much.
            The slider below is the <strong>buyer's share</strong> of the
            joint surplus — from 0% (supplier takes everything) to 100%
            (buyer takes everything). The two curves show each party's
            payoff as the share moves, with a dashed line marking each
            side's <strong>outside option</strong> — what they could get
            by walking away.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Your job: find a share where <strong>both parties</strong>{" "}
            sit above their outside-option line. That's the deal zone —
            the only place where the deal closes. The marker on
            each curve turns green when that side is in the deal zone,
            red when they'd walk.
          </p>
        </div>

        <div style={figureRow}>
          <AgentFigure
            role="buyer"
            mood={buyerMood}
            size="medium"
            label={`Buyer · ${money(point.buyerUtility)}`}
          />
          <AgentFigure
            role="supplier"
            mood={supplierMood}
            size="medium"
            label={`Supplier · ${money(point.supplierUtility)}`}
          />
        </div>

        <div style={curveRow}>
          <UtilityCurve
            party="buyer"
            points={buyerPoints}
            outsideOption={config.buyerOutside ?? DEFAULT_BUYER_OUTSIDE}
            currentX={share}
            label="buyer utility"
            testId="level4-curve-buyer"
          />
          <UtilityCurve
            party="supplier"
            points={supplierPoints}
            outsideOption={config.supplierOutside ?? DEFAULT_SUPPLIER_OUTSIDE}
            currentX={share}
            label="supplier utility"
            testId="level4-curve-supplier"
          />
        </div>

        <QuantityKnob
          label="Buyer's share of the surplus"
          value={sharePct}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={setSharePct}
          testId="level4-share"
        />

        <div style={status} data-testid="level4-status">
          {statusLabel}
        </div>

        <PredictReveal
          liveValue={sharePct}
          truth={Math.round(fairCenter * 100)}
          renderValue={(v) => `${v}%`}
          predictionLabel="your share"
          truthLabel="centerpoint"
          insight={
            <>
              Both above the walkaway line means the deal is feasible. The
              feasible band runs from {Math.round(lo * 100)}% to{" "}
              {Math.round(hi * 100)}%; the fair centerpoint sits at{" "}
              {Math.round(fairCenter * 100)}%. This is the seed for a
              Cost-Benefit Transfer.
            </>
          }
          revealLabel="Reveal the centerpoint"
          onReveal={() => setRevealed(true)}
          disabled={!reachedFeasible}
          testId="level4-reveal"
        />
      </div>
    </LevelShell>
  );
}
