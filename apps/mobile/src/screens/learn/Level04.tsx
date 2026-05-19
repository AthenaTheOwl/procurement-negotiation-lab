/**
 * Level 04 (mobile) — Splitting the surplus.
 *
 * No SVG curve in v1 mobile: a numeric readout per party + a 0-100%
 * share knob + figures that flip moods when below outside option.
 */

import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  DEFAULT_BUYER_OUTSIDE,
  DEFAULT_SUPPLIER_OUTSIDE,
  defaultLearnScenario,
  feasibleBand,
  findJointOptimum,
  splitOutcome,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { LevelShell } from "../../primitives/LevelShell";
import { PredictReveal } from "../../primitives/PredictReveal";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export interface Level04Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
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
  const [lo, hi] = useMemo(() => feasibleBand(config), [config]);
  const fairCenter = (lo + hi) / 2;

  const [sharePct, setSharePct] = useState(0);
  const share = sharePct / 100;
  const point = splitOutcome(share, config);
  const [reachedFeasible, setReachedFeasible] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Mark feasible as soon as a feasible share is shown.
  if (point.feasible && !reachedFeasible) {
    // schedule once via micro-task to avoid render-time setState
    Promise.resolve().then(() => setReachedFeasible(true));
  }

  const buyerMood: "neutral" | "happy" | "worried" | "walked-away" =
    !point.buyerFeasible ? "walked-away" : reachedFeasible ? "happy" : "neutral";
  const supplierMood: "neutral" | "happy" | "worried" | "walked-away" =
    !point.supplierFeasible ? "walked-away" : reachedFeasible ? "happy" : "neutral";

  const statusLabel = point.feasible
    ? "both above outside option"
    : !point.buyerFeasible
      ? "buyer would walk"
      : "supplier would walk";
  const statusColor = point.feasible ? colors.surplusGood : colors.surplusLost;

  const canContinue = revealed && reachedFeasible;

  return (
    <LevelShell
      level={4}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Splitting the surplus"
      stakes="A deal needs both parties above their walkaway. Find a share where both stay in the room."
      continueLabel="Continue → Level 5"
      continueDisabled={!canContinue}
      onContinue={() => canContinue && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <View
        style={{
          flexDirection: "row",
          gap: space.s7,
          justifyContent: "center",
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
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
      </View>

      <View
        style={{
          backgroundColor: colors.neutralBg,
          borderRadius: radius.tile,
          padding: space.s3,
          gap: space.s2,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
            buyer utility
          </Text>
          <Text style={{ fontSize: type.t2, fontWeight: "600" }}>
            {money(point.buyerUtility)} (outside {money(point.buyerOutside)})
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
            supplier utility
          </Text>
          <Text style={{ fontSize: type.t2, fontWeight: "600" }}>
            {money(point.supplierUtility)} (outside {money(point.supplierOutside)})
          </Text>
        </View>
      </View>

      <QuantityKnob
        label="Buyer's share of surplus"
        value={sharePct}
        min={0}
        max={100}
        step={5}
        unit="%"
        onChange={setSharePct}
        testID="level4-share"
      />

      <Text
        testID="level4-status"
        style={{
          fontSize: type.t3,
          fontWeight: "600",
          color: statusColor,
          textAlign: "center",
        }}
      >
        {statusLabel}
      </Text>

      <PredictReveal
        liveValue={sharePct}
        truth={Math.round(fairCenter * 100)}
        renderValue={(v) => `${v}%`}
        predictionLabel="your share"
        truthLabel="centerpoint"
        insight={`Feasible band: ${Math.round(lo * 100)}% to ${Math.round(hi * 100)}%; the fair centerpoint sits at ${Math.round(fairCenter * 100)}%. This is the seed for a Cost-Benefit Transfer.`}
        revealLabel="Reveal the centerpoint"
        onReveal={() => setRevealed(true)}
        disabled={!reachedFeasible}
        testID="level4-reveal"
      />
    </LevelShell>
  );
}
