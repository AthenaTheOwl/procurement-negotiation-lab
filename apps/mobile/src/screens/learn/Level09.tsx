/**
 * Level 09 (mobile) — Multi-period commitment workbench.
 *
 * Same engine surfaces as the web port. Compact list-style layout for
 * narrow screens: each week is a card with q + commitment + weekly
 * utility. Presets are pills above the list.
 */

import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  COMMITMENT_KINDS,
  applyPreset,
  defaultMultiPeriodPlan,
  evaluateMultiPeriodPlan,
  optimalMultiPeriodPlan,
  type CommitmentKind,
  type MultiPeriodPreset,
  type WeekPlan,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { SurplusBar } from "../../primitives/SurplusBar";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level09Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

const COMMITMENT_COLOR: Record<CommitmentKind, string> = {
  firm: colors.roleCoordinator,
  soft: colors.roleSupplier,
  forecast: colors.neutralFgSoft,
};

const PRESETS: { id: MultiPeriodPreset; label: string }[] = [
  { id: "default", label: "Reset" },
  { id: "all-firm", label: "All firm" },
  { id: "drop-far-weeks", label: "Drop far weeks" },
  { id: "optimal", label: "Snap to optimum" },
];

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

export function Level09({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level09Props) {
  const [plan, setPlan] = useState<WeekPlan[]>(() => defaultMultiPeriodPlan());
  const [revealed, setRevealed] = useState(false);
  const [edited, setEdited] = useState(false);

  const result = useMemo(() => evaluateMultiPeriodPlan(plan), [plan]);
  const optPlan = useMemo(() => optimalMultiPeriodPlan(plan), [plan]);
  const optResult = useMemo(
    () => evaluateMultiPeriodPlan(optPlan),
    [optPlan],
  );
  const lost = Math.max(0, optResult.total - result.total);
  const ratio = optResult.total > 0 ? result.total / optResult.total : 1;

  const updateWeek = (idx: number, patch: Partial<WeekPlan>) => {
    setPlan((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    setEdited(true);
  };

  const handlePreset = (preset: MultiPeriodPreset) => {
    setPlan((prev) => applyPreset(prev, preset));
    setEdited(true);
  };

  const cycleCommitment = (idx: number) => {
    const current = plan[idx].commitment;
    const nextIdx = (COMMITMENT_KINDS.indexOf(current) + 1) % COMMITMENT_KINDS.length;
    updateWeek(idx, { commitment: COMMITMENT_KINDS[nextIdx] });
  };

  return (
    <LevelShell
      level={9}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Multi-period commitment workbench"
      stakes="Twelve weeks. Firm promises lock in surplus but cost a lot to miss. Find a schedule that holds up under fading forecast confidence."
      continueLabel="Open Sandbox →"
      continueDisabled={!revealed}
      onContinue={() => {
        if (revealed) {
          onComplete();
          onOpenSandbox?.();
        }
      }}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: space.s3,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, minWidth: 120 }}>
          <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
            your total
          </Text>
          <Text style={{ fontSize: type.t4, fontWeight: "600" }} testID="level9-total">
            {money(result.total)}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 120 }}>
          <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
            optimum
          </Text>
          <Text style={{ fontSize: type.t4, fontWeight: "600" }} testID="level9-optimum">
            {money(optResult.total)}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 120 }}>
          <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
            gap
          </Text>
          <Text style={{ fontSize: type.t4, fontWeight: "600" }} testID="level9-gap">
            {money(lost)} ({Math.round((1 - ratio) * 100)}%)
          </Text>
        </View>
      </View>

      <SurplusBar
        value={Math.max(0, result.total)}
        lost={lost}
        label="Twelve-week joint utility"
        testID="level9-surplus"
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
        {PRESETS.map(({ id, label }) => (
          <Pressable
            key={id}
            testID={`preset-${id}`}
            onPress={() => handlePreset(id)}
            style={{
              backgroundColor: colors.neutralBg2,
              borderWidth: 1,
              borderColor: colors.neutralLine,
              borderRadius: radius.pill,
              paddingVertical: space.s2,
              paddingHorizontal: space.s4,
            }}
          >
            <Text style={{ fontSize: type.t2 }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: space.s2 }} testID="level9-list">
        {plan.map((week, idx) => {
          const r = result.weeks[idx];
          return (
            <View
              key={week.week}
              testID={`week-${week.week}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.s3,
                backgroundColor: colors.neutralBg2,
                borderRadius: radius.tile,
                padding: space.s3,
                borderWidth: 1,
                borderColor: colors.neutralLine,
              }}
            >
              <Text style={{ width: 30, fontWeight: "600" }}>{week.week}</Text>
              <Pressable
                testID={`commitment-${week.week}`}
                onPress={() => cycleCommitment(idx)}
                accessibilityLabel={`commitment for week ${week.week}`}
                style={{
                  backgroundColor: COMMITMENT_COLOR[week.commitment],
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600", fontSize: type.t1 }}>
                  {week.commitment}
                </Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <TextInput
                  testID={`q-${week.week}`}
                  value={String(Math.round(week.q))}
                  onChangeText={(value) =>
                    updateWeek(idx, { q: Number(value || "0") })
                  }
                  keyboardType="number-pad"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.neutralLine,
                    borderRadius: radius.tile,
                    padding: space.s2,
                    width: 70,
                  }}
                  accessibilityLabel={`q for week ${week.week}`}
                />
              </View>
              <Text
                style={{
                  width: 80,
                  textAlign: "right",
                  color: r.utility >= 0 ? colors.surplusGood : colors.surplusLost,
                  fontWeight: "600",
                  fontSize: type.t1,
                }}
              >
                {money(r.utility)}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable
        testID="level9-reveal"
        onPress={() => setRevealed(true)}
        disabled={revealed || !edited}
        style={{
          backgroundColor: revealed
            ? colors.neutralLine
            : colors.roleCoordinator,
          paddingVertical: space.s3,
          paddingHorizontal: space.s5,
          borderRadius: radius.pill,
          alignSelf: "center",
        }}
      >
        <Text
          style={{
            color: revealed ? colors.neutralFgSoft : "white",
            fontSize: type.t2,
            fontWeight: "600",
          }}
        >
          {revealed ? "Optimum revealed" : "Reveal the schedule optimum"}
        </Text>
      </Pressable>

      {revealed && (
        <View
          testID="level9-reveal-text"
          style={{
            backgroundColor: colors.dealZone,
            borderLeftWidth: 4,
            borderLeftColor: colors.surplusGood,
            borderRadius: radius.tile,
            padding: space.s4,
          }}
        >
          <Text style={{ fontSize: type.t2 }}>
            The closed-form optimum sets each week's q to that week's
            effective demand (demand × confidence). Firm weeks lock in
            value early but punish misses; forecast weeks defer
            commitment to the cheapest signal. You scored{" "}
            <Text style={{ fontWeight: "600" }}>{money(result.total)}</Text>{" "}
            against an optimum of{" "}
            <Text style={{ fontWeight: "600" }}>{money(optResult.total)}</Text>{" "}
            — {Math.round(ratio * 100)}% of the achievable joint utility.
          </Text>
        </View>
      )}
    </LevelShell>
  );
}
