/**
 * Level 02 (mobile) — Close the gap.
 *
 * Same structure as the web port: increment/decrement the q knob, the
 * surplus bar reacts; reveal compares your final q to the joint
 * optimum.
 */

import { useState } from "react";
import { Text, View } from "react-native";
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
import { colors, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

const TOLERANCE = 25;

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

  const [q, setQ] = useState<number>(setup.qMin);
  const [hasMoved, setHasMoved] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const surplus = jointUtilityAt(q, setup.demand, setup.supplierCapacity);
  const lost = Math.max(0, optimum.joint - surplus);
  const within = Math.abs(q - optimum.q) <= TOLERANCE;

  const handleChange = (next: number) => {
    setQ(next);
    setHasMoved(true);
  };

  const canContinue = revealed && (within || hasMoved);
  const mood: "neutral" | "happy" | "worried" = revealed
    ? within
      ? "happy"
      : "worried"
    : "neutral";

  return (
    <LevelShell
      level={2}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Close the gap"
      stakes="What number would have closed the gap from last level?"
      continueLabel="Continue → Level 3"
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
          flexWrap: "wrap",
        }}
      >
        <AgentFigure role="buyer" mood={mood} size="medium" label="Buyer" />
        <AgentFigure role="supplier" mood={mood} size="medium" label="Supplier" />
      </View>

      <QuantityKnob
        label="Units to commit"
        value={q}
        min={setup.qMin}
        max={setup.qMax}
        step={25}
        onChange={handleChange}
        format={(v) => `${v} units`}
        testID="level2-knob"
      />

      <SurplusBar
        value={surplus}
        lost={lost}
        label={`Joint surplus at q = ${q}`}
        testID="level2-surplus"
      />

      <Text
        testID="level2-readout"
        style={{
          fontSize: type.t2,
          color: colors.neutralFg,
          textAlign: "center",
        }}
      >
        {hasMoved
          ? within
            ? "You're at the joint sweet spot."
            : `Try moving toward q ≈ ${optimum.q}.`
          : "Tap +/− to feel how surplus changes with q."}
      </Text>

      <PredictReveal
        liveValue={q}
        truth={optimum.q}
        renderValue={(v) => `${v} units`}
        predictionLabel="where you stopped"
        truthLabel="joint optimum"
        insight={
          within
            ? `Right on it. Buyers want more, suppliers want less; the maximum joint surplus sits between, near q ≈ ${optimum.q}.`
            : `The joint sweet spot is q ≈ ${optimum.q}. Locally optimal asks miss this; you have to see both utility curves to find it.`
        }
        revealLabel="Reveal the joint optimum"
        onReveal={() => setRevealed(true)}
        disabled={!hasMoved}
        testID="level2-reveal"
      />
    </LevelShell>
  );
}
