/**
 * Level 01 (mobile) — There is a gap.
 *
 * RN mirror of apps/web/src/surfaces/learn/Level01.tsx. Same engine
 * call, same beat-then-reveal pattern, same Continue gating.
 */

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  defaultLearnScenario,
  findJointOptimum,
  jointUtilityAt,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { IntroCard } from "../../primitives/IntroCard";
import { LevelShell } from "../../primitives/LevelShell";
import { SurplusBar } from "../../primitives/SurplusBar";
import { colors, radius, space, type } from "../../theme/tokens";
import {
  TOTAL_LEVELS,
  type LearnProgress,
} from "../../state/learnProgress";

const SETTLED_QUANTITY = 350;
const REVEAL_BEAT_MS = 600;

export interface Level01Props {
  progress: LearnProgress;
  onComplete: () => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
  onJumpTo?: (level: number) => void;
}

export function Level01({
  progress,
  onComplete,
  onOpenHome,
  onOpenSandbox,
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

  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(() => setRevealReady(true), REVEAL_BEAT_MS);
    return () => clearTimeout(timer);
  }, [settled]);

  const handleSettle = () => {
    if (!settled) setSettled(true);
  };

  const handleContinue = () => {
    if (!revealReady) return;
    onComplete();
  };

  const moodAfter: "neutral" | "worried" = settled ? "worried" : "neutral";

  return (
    <LevelShell
      level={1}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="There is a gap"
      stakes="A factory ships fewer units than a buyer wants. See what gets lost in the gap."
      reveal={
        settled && revealReady
          ? `Settled at ${SETTLED_QUANTITY} units. The joint sweet spot sits near ${optimum.q}. Acting locally cost about $${Math.round(lost).toLocaleString()} of joint value.`
          : undefined
      }
      continueLabel="Continue → Level 2"
      continueDisabled={!revealReady}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <IntroCard
        heading="What this level shows"
        body="The buyer needs 500 units. The supplier can only ship 350. Without coordination, each side acts on their own information — the supplier ships what they have, the buyer accepts what comes. That's the local plan. Tap Settle now to see what value gets created and what gets left on the table."
        testID="level1-intro"
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: space.s7,
          alignItems: "flex-end",
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            testID="buyer-thought"
            style={{
              backgroundColor: colors.neutralBg,
              borderColor: colors.neutralLine,
              borderWidth: 1,
              borderRadius: radius.card,
              paddingVertical: space.s2,
              paddingHorizontal: space.s3,
              marginBottom: space.s3,
              minWidth: 120,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: type.t2, color: colors.neutralFg }}>
              wants: 500
            </Text>
          </View>
          <AgentFigure role="buyer" mood={moodAfter} size="large" label="Buyer" />
        </View>
        <View style={{ alignItems: "center" }}>
          <View
            testID="supplier-thought"
            style={{
              backgroundColor: colors.neutralBg,
              borderColor: colors.neutralLine,
              borderWidth: 1,
              borderRadius: radius.card,
              paddingVertical: space.s2,
              paddingHorizontal: space.s3,
              marginBottom: space.s3,
              minWidth: 120,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: type.t2, color: colors.neutralFg }}>
              has: 350
            </Text>
          </View>
          <AgentFigure
            role="supplier"
            mood={moodAfter}
            size="large"
            label="Supplier"
          />
        </View>
      </View>

      {settled ? (
        <SurplusBar
          value={settledJoint}
          lost={lost}
          label="Joint value at the local plan"
          testID="level1-surplus"
        />
      ) : (
        <Pressable
          testID="settle-button"
          onPress={handleSettle}
          style={{
            backgroundColor: colors.roleBuyer,
            paddingVertical: space.s4,
            paddingHorizontal: space.s7,
            borderRadius: radius.pill,
            alignSelf: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: type.t4, fontWeight: "600" }}>
            Settle now
          </Text>
        </Pressable>
      )}
    </LevelShell>
  );
}
