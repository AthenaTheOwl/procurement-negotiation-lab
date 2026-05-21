import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  COORDINATION_CATALOG,
  type CoordinationEntry,
  type CoordinationFamily,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level11Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

const CONFIDENTIALITY_COLOR: Record<
  CoordinationEntry["confidentiality"],
  string
> = {
  low: colors.surplusLost,
  medium: colors.privacyCost,
  "medium-high": colors.roleSupplier,
  high: colors.surplusGood,
  formal: colors.roleCoordinator,
};

export function Level11({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level11Props) {
  const [selectedId, setSelectedId] = useState<CoordinationFamily>(
    "posted-price",
  );
  const [visited, setVisited] = useState<Set<CoordinationFamily>>(
    () => new Set(["posted-price"]),
  );
  const [accepted, setAccepted] = useState(false);
  const selected = useMemo(
    () =>
      COORDINATION_CATALOG.find((entry) => entry.id === selectedId) ??
      COORDINATION_CATALOG[0],
    [selectedId],
  );

  const select = (id: CoordinationFamily) => {
    setSelectedId(id);
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const canContinue = accepted && visited.size >= 4;

  return (
    <LevelShell
      level={11}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="How to coordinate without a solver"
      stakes="Each mechanism asks parties to reveal different things. Pick the lightest protocol that still gets the job done."
      continueLabel="Open Sandbox ->"
      continueDisabled={!canContinue}
      onContinue={() => {
        if (canContinue) {
          onComplete();
          onOpenSandbox?.();
        }
      }}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <View style={{ gap: space.s4 }}>
        <View
          testID="level11-mobile-grid"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}
        >
          {COORDINATION_CATALOG.map((entry) => (
            <Pressable
              key={entry.id}
              testID={`mechanism-${entry.id}`}
              onPress={() => select(entry.id)}
              style={{
                minWidth: 140,
                flexGrow: 1,
                borderRadius: radius.tile,
                borderWidth: 1,
                borderColor:
                  entry.id === selectedId
                    ? colors.roleCoordinator
                    : colors.neutralLine,
                borderLeftWidth: 4,
                borderLeftColor: CONFIDENTIALITY_COLOR[entry.confidentiality],
                backgroundColor:
                  entry.id === selectedId
                    ? colors.roleCoordinator
                    : colors.neutralBg2,
                padding: space.s3,
              }}
            >
              <Text
                style={{
                  color: entry.id === selectedId ? "white" : colors.neutralFg,
                  fontWeight: "600",
                  fontSize: type.t1,
                }}
              >
                {entry.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          testID="level11-mobile-detail"
          style={{
            backgroundColor: colors.neutralBg,
            borderRadius: radius.tile,
            padding: space.s4,
            gap: space.s2,
          }}
        >
          <Text style={{ fontSize: type.t3, fontWeight: "600" }}>
            {selected.name}
          </Text>
          <Text style={{ fontSize: type.t2 }}>{selected.gist}</Text>
          <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
            Welfare: {selected.welfare} / setup: {selected.setupEffort} /
            confidentiality: {selected.confidentiality}
          </Text>
          <Text testID="level11-mobile-exchanges" style={{ fontSize: type.t1 }}>
            Exchanges: {selected.exchanges}
          </Text>
          <Text testID="level11-mobile-leaks" style={{ fontSize: type.t1 }}>
            Inference risk: {selected.leaks}
          </Text>
        </View>

        <Text
          testID="level11-mobile-helper"
          style={{ textAlign: "center", color: colors.neutralFgSoft }}
        >
          Visited {visited.size} of {COORDINATION_CATALOG.length}. Visit at
          least 4 mechanisms before moving on.
        </Text>

        <Pressable
          testID="level11-mobile-got-it"
          disabled={visited.size < 4 || accepted}
          onPress={() => setAccepted(true)}
          style={{
            alignSelf: "center",
            backgroundColor:
              visited.size < 4 || accepted
                ? colors.neutralLine
                : colors.roleCoordinator,
            borderRadius: radius.pill,
            paddingVertical: space.s3,
            paddingHorizontal: space.s5,
          }}
        >
          <Text
            style={{
              color:
                visited.size < 4 || accepted ? colors.neutralFgSoft : "white",
              fontWeight: "600",
            }}
          >
            {accepted ? "Noted" : "Got it"}
          </Text>
        </Pressable>

        {accepted && (
          <View
            testID="level11-mobile-reveal"
            style={{
              backgroundColor: colors.dealZone,
              borderLeftWidth: 4,
              borderLeftColor: colors.surplusGood,
              borderRadius: radius.tile,
              padding: space.s4,
            }}
          >
            <Text style={{ fontSize: type.t2 }}>
              ADMM keeps cost functions local, but its transcript can still
              reveal marginal behavior. DP-ADMM adds formal noise. Secure MPC
              is the privacy ceiling. Menus and price loops often get most of
              the value with much less operational weight.
            </Text>
          </View>
        )}
      </View>
    </LevelShell>
  );
}
