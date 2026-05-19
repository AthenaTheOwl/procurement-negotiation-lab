/**
 * Level 05 (mobile) — How the rule changes the dance.
 *
 * Mobile keeps it static: instead of three animated panels, we run
 * algorithmResults() once and show the three mechanisms as cards with
 * their final stats. "Run all" just unlocks the reveal.
 */

import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { algorithmResults, makeScenario, type AlgorithmResult } from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level05Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}
function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

const PANELS: { id: AlgorithmResult["id"]; title: string; caption: string }[] = [
  {
    id: "centralized-oracle",
    title: "Centralized oracle",
    caption: "one planner picks q. Highest surplus, no privacy.",
  },
  {
    id: "cpp-admm",
    title: "CPP / ADMM",
    caption: "buyer + supplier iterate to consensus. Most surplus recovered.",
  },
  {
    id: "cpp-vcg",
    title: "CPP + VCG",
    caption: "ADMM plus a transfer that prices each side's externality.",
  },
];

export function Level05({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level05Props) {
  const results = useMemo(() => algorithmResults(makeScenario()), []);
  const lookup = useMemo(() => {
    const map: Record<string, AlgorithmResult> = {};
    for (const r of results) map[r.id] = r;
    return map;
  }, [results]);

  const [shown, setShown] = useState(false);
  const handleRun = () => setShown(true);

  return (
    <LevelShell
      level={5}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="How the rule changes the dance"
      stakes="Different rules of the game produce different deals."
      continueLabel="Continue → Level 6"
      continueDisabled={!shown}
      onContinue={() => shown && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      {PANELS.map(({ id, title, caption }) => {
        const data = lookup[id];
        return (
          <View
            key={id}
            testID={`panel-${id}`}
            style={{
              backgroundColor: colors.neutralBg2,
              borderRadius: radius.card,
              padding: space.s4,
              borderWidth: 1,
              borderColor: colors.neutralLine,
              gap: space.s2,
            }}
          >
            <Text style={{ fontSize: type.t3, fontWeight: "600" }}>{title}</Text>
            <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
              {caption}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>surplus</Text>
              <Text style={{ fontWeight: "600" }}>
                {shown ? money(data.globalUtility) : "—"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>privacy exposure</Text>
              <Text style={{ fontWeight: "600" }}>
                {shown ? pct(data.privacyExposure) : "—"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>iterations</Text>
              <Text style={{ fontWeight: "600" }}>
                {shown ? data.iterations : "—"}
              </Text>
            </View>
            {id === "cpp-vcg" && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text>transfer</Text>
                <Text style={{ fontWeight: "600" }}>
                  {shown ? money(data.transferMagnitude) : "—"}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      <Pressable
        testID="run-all"
        onPress={handleRun}
        disabled={shown}
        style={{
          backgroundColor: shown ? colors.neutralLine : colors.roleCoordinator,
          paddingVertical: space.s3,
          paddingHorizontal: space.s6,
          borderRadius: radius.pill,
          alignSelf: "center",
        }}
      >
        <Text
          style={{
            color: shown ? colors.neutralFgSoft : "white",
            fontSize: type.t2,
            fontWeight: "600",
          }}
        >
          {shown ? "Stats shown" : "Run all"}
        </Text>
      </Pressable>

      {shown && (
        <View
          testID="level5-reveal"
          style={{
            backgroundColor: colors.dealZone,
            borderLeftWidth: 4,
            borderLeftColor: colors.surplusGood,
            borderRadius: radius.tile,
            padding: space.s4,
          }}
        >
          <Text style={{ fontSize: type.t2 }}>
            Different rules trade welfare, privacy, and speed. The oracle
            needs each side's full cost and capacity profile. ADMM only
            exchanges local decisions and a coordinator price each
            iteration; no party reveals its full utility function.
            CPP+VCG adds a transfer computed from those same ADMM
            iterates, which makes truthful reporting the dominant
            strategy without requiring sealed-bid type disclosure.
            Cheaper protocols (price-only, consensus averaging) leak
            even less but aren't strategy-proof.
          </Text>
        </View>
      )}
    </LevelShell>
  );
}
