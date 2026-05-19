/**
 * LevelShell (mobile) — per-level layout mirror of the web primitive.
 *
 * Vertical stack: top nav (Home / progress / Sandbox), title + stakes,
 * stage (children), optional reveal, prompt + Continue button.
 */

import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { ProgressDots } from "./ProgressDots";
import { colors, radius, space, type } from "../theme/tokens";

export interface LevelShellProps {
  level: number;
  total: number;
  completedThrough: number;
  title: string;
  stakes: string;
  children: ReactNode;
  prompt?: ReactNode;
  reveal?: ReactNode;
  continueLabel?: string;
  continueDisabled?: boolean;
  onContinue?: () => void;
  onJumpTo?: (level: number) => void;
  onOpenSandbox?: () => void;
  onOpenHome?: () => void;
}

export function LevelShell({
  level,
  total,
  completedThrough,
  title,
  stakes,
  children,
  prompt,
  reveal,
  continueLabel = "Continue",
  continueDisabled = false,
  onContinue,
  onJumpTo,
  onOpenSandbox,
  onOpenHome,
}: LevelShellProps) {
  return (
    <ScrollView
      testID={`level-shell-${level}`}
      style={{ flex: 1, backgroundColor: colors.neutralBg }}
      contentContainerStyle={{ padding: space.s5, gap: space.s5 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: space.s4,
        }}
      >
        <Pressable
          onPress={onOpenHome}
          accessibilityLabel="Home"
          testID="level-shell-home"
        >
          <Text style={{ fontSize: type.t2, color: colors.neutralFgSoft }}>
            ← Home
          </Text>
        </Pressable>
        <ProgressDots
          current={level}
          total={total}
          completedThrough={completedThrough}
          onJumpTo={onJumpTo}
        />
        <Pressable
          onPress={onOpenSandbox}
          accessibilityLabel="Sandbox"
          testID="level-shell-sandbox"
        >
          <Text style={{ fontSize: type.t2, color: colors.neutralFgSoft }}>
            Sandbox →
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: space.s2 }}>
        <Text
          style={{
            fontSize: type.t5,
            fontWeight: "600",
            color: colors.neutralFg,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: type.t2,
            color: colors.neutralFgSoft,
            textAlign: "center",
          }}
        >
          {stakes}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.neutralBg2,
          borderRadius: radius.card,
          padding: space.s5,
          gap: space.s5,
        }}
      >
        {children}
      </View>

      {reveal !== undefined && reveal !== null && (
        <View
          testID="level-reveal"
          style={{
            backgroundColor: colors.dealZone,
            borderLeftWidth: 4,
            borderLeftColor: colors.surplusGood,
            borderRadius: radius.tile,
            padding: space.s4,
          }}
        >
          {typeof reveal === "string" ? (
            <Text style={{ fontSize: type.t2, color: colors.neutralFg }}>{reveal}</Text>
          ) : (
            reveal
          )}
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: space.s4,
          flexWrap: "wrap",
        }}
      >
        <View style={{ flex: 1 }}>
          {typeof prompt === "string" ? (
            <Text style={{ fontSize: type.t2, color: colors.neutralFgSoft }}>{prompt}</Text>
          ) : (
            prompt
          )}
        </View>
        <Pressable
          onPress={onContinue}
          disabled={continueDisabled}
          testID="level-continue"
          accessibilityLabel={continueLabel}
          accessibilityState={{ disabled: continueDisabled }}
          style={{
            backgroundColor: continueDisabled ? colors.neutralLine : colors.roleBuyer,
            paddingVertical: space.s3,
            paddingHorizontal: space.s6,
            borderRadius: radius.pill,
          }}
        >
          <Text
            style={{
              color: continueDisabled ? colors.neutralFgSoft : "white",
              fontSize: type.t2,
              fontWeight: "600",
            }}
          >
            {continueLabel}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
