/**
 * SurplusBar (mobile) — horizontal bar with value (green) + lost (red).
 *
 * Mirrors apps/web/src/primitives/SurplusBar.tsx in API. The mobile
 * version uses plain View rectangles instead of CSS flex with
 * percentage widths; behavior identical.
 */

import { Text, View } from "react-native";
import { colors, radius, space, type } from "../theme/tokens";

export interface SurplusBarProps {
  value: number;
  lost?: number;
  label?: string;
  testID?: string;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function SurplusBar({
  value,
  lost = 0,
  label,
  testID,
}: SurplusBarProps) {
  const total = Math.max(1, value + lost);
  const valuePct = (Math.max(0, value) / total) * 100;
  const lostPct = (Math.max(0, lost) / total) * 100;

  return (
    <View
      testID={testID ?? "surplus-bar"}
      style={{ gap: space.s2 }}
    >
      {label !== undefined && (
        <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          height: space.s5,
          borderRadius: radius.pill,
          backgroundColor: colors.neutralLine,
          overflow: "hidden",
        }}
      >
        <View
          testID="surplus-bar-value"
          style={{
            width: `${valuePct}%`,
            backgroundColor: colors.surplusGood,
          }}
        />
        <View
          testID="surplus-bar-lost"
          style={{
            width: `${lostPct}%`,
            backgroundColor: colors.surplusLost,
            opacity: 0.85,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: type.t2, fontWeight: "600", color: colors.surplusGood }}>
          {money(value)}
        </Text>
        {lost > 0 && (
          <Text style={{ fontSize: type.t2, color: colors.surplusLost }}>
            lost {money(lost)}
          </Text>
        )}
      </View>
    </View>
  );
}
