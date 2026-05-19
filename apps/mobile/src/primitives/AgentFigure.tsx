/**
 * AgentFigure (mobile) — RN-SVG mirror of the web primitive.
 *
 * Same prop API as apps/web/src/primitives/AgentFigure.tsx. Renders an
 * SVG body + head + face composed from role/mood. No Lottie yet —
 * static SVG only. Lottie integration lands when a motion lib is added.
 */

import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { colors, space, type } from "../theme/tokens";

export type AgentRole =
  | "buyer"
  | "supplier"
  | "packager"
  | "logistics"
  | "distributor"
  | "coordinator";

export type AgentMood = "neutral" | "happy" | "worried" | "walked-away";
export type AgentSize = "small" | "medium" | "large";

export interface AgentFigureProps {
  role: AgentRole;
  mood?: AgentMood;
  size?: AgentSize;
  onActivate?: () => void;
  label?: string;
  testID?: string;
}

const ROLE_ACCENTS: Record<AgentRole, string> = {
  buyer: colors.roleBuyer,
  supplier: colors.roleSupplier,
  packager: colors.rolePackager,
  logistics: colors.roleLogistics,
  distributor: colors.roleDistributor,
  coordinator: colors.roleCoordinator,
};

const SIZE_PX: Record<AgentSize, number> = {
  small: 56,
  medium: 96,
  large: 144,
};

function MouthPath({ mood, cx, cy }: { mood: AgentMood; cx: number; cy: number }) {
  switch (mood) {
    case "happy":
      return (
        <Path
          d={`M ${cx - 7} ${cy} Q ${cx} ${cy + 7} ${cx + 7} ${cy}`}
          stroke={colors.neutralFg}
          strokeWidth={1.8}
          fill="none"
        />
      );
    case "worried":
      return (
        <Path
          d={`M ${cx - 7} ${cy + 3} Q ${cx} ${cy - 4} ${cx + 7} ${cy + 3}`}
          stroke={colors.neutralFg}
          strokeWidth={1.8}
          fill="none"
        />
      );
    case "walked-away":
      return (
        <Path
          d={`M ${cx - 5} ${cy} L ${cx + 5} ${cy}`}
          stroke={colors.neutralFg}
          strokeWidth={1.8}
          fill="none"
        />
      );
    default:
      return (
        <Path
          d={`M ${cx - 6} ${cy} L ${cx + 6} ${cy}`}
          stroke={colors.neutralFg}
          strokeWidth={1.6}
          fill="none"
        />
      );
  }
}

export function AgentFigure({
  role,
  mood = "neutral",
  size = "medium",
  onActivate,
  label,
  testID,
}: AgentFigureProps) {
  const px = SIZE_PX[size];
  const accent = ROLE_ACCENTS[role];
  const cx = px / 2;
  const headY = px * 0.34;
  const bodyY = px * 0.7;
  const eyeOffset = px * 0.05;

  const figure = (
    <Svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
      {/* Body — rounded rectangle */}
      <G>
        <Ellipse cx={cx} cy={bodyY} rx={px * 0.35} ry={px * 0.22} fill={accent} />
      </G>
      {/* Head */}
      <Circle cx={cx} cy={headY} r={px * 0.22} fill={accent} />
      {/* Eyes */}
      <Circle cx={cx - eyeOffset * 1.6} cy={headY - 2} r={2.2} fill={colors.neutralFg} />
      <Circle cx={cx + eyeOffset * 1.6} cy={headY - 2} r={2.2} fill={colors.neutralFg} />
      <MouthPath mood={mood} cx={cx} cy={headY + 6} />
    </Svg>
  );

  const child = (
    <View
      style={{ alignItems: "center", gap: space.s2 }}
      testID={testID ?? `agent-figure-${role}`}
      accessibilityRole={onActivate ? "button" : "image"}
      accessibilityLabel={label ?? `${role} ${mood}`}
    >
      {figure}
      {label !== undefined && (
        <Text
          style={{
            fontSize: type.t1,
            color: colors.neutralFgSoft,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );

  if (onActivate) {
    return (
      <Pressable onPress={onActivate} testID={testID ?? `agent-figure-${role}`}>
        {child}
      </Pressable>
    );
  }
  return child;
}
