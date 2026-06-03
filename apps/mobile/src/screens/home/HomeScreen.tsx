/**
 * HomeScreen (mobile) — landing surface mirroring apps/web/.../HomeSurface.
 *
 * Async progress load: AsyncStorage is async, so we kick off
 * loadProgress() in an effect and render once it resolves.
 */

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AgentFigure } from "../../primitives/AgentFigure";
import { ProgressDots } from "../../primitives/ProgressDots";
import { colors, radius, space, type } from "../../theme/tokens";
import {
  TOTAL_LEVELS,
  clearProgress,
  emptyProgress,
  loadProgress,
  type LearnProgress,
} from "../../state/learnProgress";

export interface HomeScreenProps {
  onStartPlaying: (level: number) => void;
  onOpenSandbox: () => void;
}

export function HomeScreen({ onStartPlaying, onOpenSandbox }: HomeScreenProps) {
  const [progress, setProgress] = useState<LearnProgress>(emptyProgress());

  useEffect(() => {
    let cancelled = false;
    loadProgress().then((p) => {
      if (!cancelled) setProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasProgress = progress.highest_completed > 0;
  const continueLevel = Math.min(
    TOTAL_LEVELS,
    progress.highest_completed + 1,
  );

  const handleReset = async () => {
    await clearProgress();
    setProgress(emptyProgress());
  };

  return (
    <View
      testID="home-surface"
      style={{
        flex: 1,
        backgroundColor: colors.neutralBg,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: space.s4,
        }}
      >
        <Text style={{ fontSize: type.t3, fontWeight: "600" }}>
          procurement-negotiation-lab
        </Text>
        <Pressable
          testID="home-sandbox-link"
          onPress={onOpenSandbox}
          accessibilityLabel="Sandbox"
        >
          <Text style={{ color: colors.neutralFgSoft, fontSize: type.t2 }}>
            Sandbox →
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          padding: space.s5,
          alignItems: "center",
          justifyContent: "center",
          gap: space.s6,
        }}
      >
        <View
          style={{ flexDirection: "row", gap: space.s7, flexWrap: "wrap", justifyContent: "center" }}
        >
          <AgentFigure role="buyer" size="large" label="Buyer" />
          <AgentFigure role="supplier" size="large" label="Supplier" />
        </View>

        <Text
          style={{
            fontSize: type.t6,
            fontWeight: "600",
            textAlign: "center",
            color: colors.neutralFg,
            lineHeight: type.t6 * 1.15,
          }}
        >
          A small lab for mechanism design — built one screen at a time.
        </Text>
        <Text
          style={{
            fontSize: type.t2,
            color: colors.neutralFgSoft,
            textAlign: "center",
          }}
        >
          Walk through twelve short levels and end up with the intuition to
          build your own utility formulas in the Sandbox.
        </Text>

        {hasProgress && (
          <ProgressDots
            current={continueLevel}
            total={TOTAL_LEVELS}
            completedThrough={progress.highest_completed}
          />
        )}

        <View style={{ gap: space.s3, alignItems: "center" }}>
          <Pressable
            testID="home-start-cta"
            onPress={() => onStartPlaying(hasProgress ? continueLevel : 1)}
            style={{
              backgroundColor: colors.roleBuyer,
              paddingVertical: space.s4,
              paddingHorizontal: space.s7,
              borderRadius: radius.pill,
            }}
          >
            <Text style={{ color: "white", fontSize: type.t3, fontWeight: "600" }}>
              {hasProgress ? `Continue at Level ${continueLevel}` : "Start playing"}
            </Text>
          </Pressable>
          {hasProgress && (
            <Pressable
              testID="home-restart-cta"
              onPress={() => onStartPlaying(1)}
              style={{
                paddingVertical: space.s3,
                paddingHorizontal: space.s6,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: colors.neutralLine,
              }}
            >
              <Text style={{ fontSize: type.t2 }}>Start from Level 1</Text>
            </Pressable>
          )}
          <Pressable
            testID="home-sandbox-cta"
            onPress={onOpenSandbox}
            style={{
              paddingVertical: space.s3,
              paddingHorizontal: space.s6,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: colors.neutralLine,
            }}
          >
            <Text style={{ fontSize: type.t2 }}>Open Sandbox</Text>
          </Pressable>
          {hasProgress && (
            <Pressable
              testID="home-reset-progress"
              onPress={handleReset}
            >
              <Text
                style={{
                  fontSize: type.t1,
                  color: colors.neutralFgSoft,
                  textDecorationLine: "underline",
                }}
              >
                Reset progress
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
