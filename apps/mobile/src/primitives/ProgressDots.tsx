/**
 * ProgressDots (mobile) — 1..N indicator matching the web primitive.
 */

import { Pressable, View } from "react-native";
import { colors, radius, space } from "../theme/tokens";

export interface ProgressDotsProps {
  current: number;
  total: number;
  completedThrough: number;
  onJumpTo?: (level: number) => void;
  testID?: string;
}

export function ProgressDots({
  current,
  total,
  completedThrough,
  onJumpTo,
  testID,
}: ProgressDotsProps) {
  const dots = [];
  for (let level = 1; level <= total; level += 1) {
    const state =
      level <= completedThrough
        ? "completed"
        : level === current
          ? "current"
          : "locked";
    const clickable =
      onJumpTo !== undefined && (state === "completed" || state === "current");
    const size = state === "current" ? space.s4 : space.s3;
    const background =
      state === "completed" ? colors.surplusGood : "transparent";
    dots.push(
      <Pressable
        key={level}
        onPress={() => clickable && onJumpTo?.(level)}
        disabled={!clickable}
        testID={`progress-dot-${level}`}
        accessibilityRole="button"
        accessibilityLabel={`Level ${level} (${state})`}
        accessibilityState={{
          selected: state === "current",
          disabled: !clickable,
        }}
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: colors.neutralLine,
          backgroundColor: background,
          opacity: state === "locked" ? 0.4 : 1,
        }}
      />,
    );
  }

  return (
    <View
      testID={testID ?? "progress-dots"}
      accessibilityLabel="lesson progress"
      style={{
        flexDirection: "row",
        gap: space.s2,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: space.s2,
      }}
    >
      {dots}
    </View>
  );
}
