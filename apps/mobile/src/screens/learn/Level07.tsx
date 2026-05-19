/**
 * Level 07 (mobile) — Audit the inputs.
 */

import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { makeScenario, runDecoyAudit } from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level07Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

export function Level07({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level07Props) {
  const honestRows = useMemo(
    () =>
      runDecoyAudit(
        makeScenario({ customTruthfulness: 1, customPrivacyPreference: 0.2 }),
      ),
    [],
  );
  const dishonestRows = useMemo(
    () =>
      runDecoyAudit(
        makeScenario({ customTruthfulness: 0.2, customPrivacyPreference: 0.6 }),
      ),
    [],
  );

  const [honest, setHonest] = useState(false);
  const [toggled, setToggled] = useState(false);

  const rows = honest ? honestRows : dishonestRows;
  const matched = rows.filter((r) => r.match).length;
  const total = rows.length;

  const handleToggle = () => {
    setHonest((prev) => !prev);
    setToggled(true);
  };

  return (
    <LevelShell
      level={7}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Audit the inputs"
      stakes="What if a participant misreports? The mechanism does its job. The audit catches the gap."
      continueLabel="Continue → Level 8"
      continueDisabled={!toggled}
      onContinue={() => toggled && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.s3,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: type.t2 }}>Participants honest?</Text>
        <Pressable
          testID="honesty-toggle"
          accessibilityState={{ selected: honest }}
          onPress={handleToggle}
          style={{
            backgroundColor: honest ? colors.surplusGood : colors.surplusLost,
            paddingVertical: space.s2,
            paddingHorizontal: space.s5,
            borderRadius: radius.pill,
          }}
        >
          <Text style={{ color: "white", fontSize: type.t2, fontWeight: "600" }}>
            {honest ? "ON" : "OFF"}
          </Text>
        </Pressable>
      </View>

      <Text
        testID="level7-summary"
        style={{ fontSize: type.t3, textAlign: "center" }}
      >
        {matched} of {total} decoy patterns match expectation.{" "}
        {honest
          ? "Honest inputs: all match."
          : "Misreports show up as mismatches."}
      </Text>

      <View testID="level7-list" style={{ gap: space.s3 }}>
        {rows.map((row) => {
          const bg = row.match ? colors.dealZone : colors.walkawayZone;
          const border = row.match ? colors.surplusGood : colors.surplusLost;
          return (
            <View
              key={row.decoyId}
              testID={`decoy-${row.decoyId}`}
              style={{
                backgroundColor: bg,
                borderLeftWidth: 4,
                borderLeftColor: border,
                borderRadius: radius.tile,
                paddingVertical: space.s3,
                paddingHorizontal: space.s4,
              }}
            >
              <Text style={{ fontWeight: "600" }}>{row.title}</Text>
              <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
                expected: {row.expectedPattern}
              </Text>
              <Text
                style={{
                  fontSize: type.t1,
                  color: row.match ? colors.surplusGood : colors.surplusLost,
                }}
              >
                actual: {row.actualPattern}
              </Text>
            </View>
          );
        })}
      </View>

      {toggled && (
        <View
          testID="level7-reveal"
          style={{
            backgroundColor: colors.dealZone,
            borderLeftWidth: 4,
            borderLeftColor: colors.surplusGood,
            borderRadius: radius.tile,
            padding: space.s4,
          }}
        >
          <Text style={{ fontSize: type.t2 }}>
            The mechanism settles the deal when inputs are honest. Audits
            like the decoy panel catch the gap when participants misreport.
            Both layers matter.
          </Text>
        </View>
      )}
    </LevelShell>
  );
}
