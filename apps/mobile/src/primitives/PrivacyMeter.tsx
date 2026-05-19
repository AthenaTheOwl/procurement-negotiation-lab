/**
 * PrivacyMeter (mobile) — vertical 0-100% gauge.
 */

import { Text, View } from "react-native";
import { colors, radius, space, type } from "../theme/tokens";

export interface PrivacyMeterProps {
  exposure: number;
  label?: string;
  testID?: string;
}

export function PrivacyMeter({
  exposure,
  label = "privacy cost",
  testID,
}: PrivacyMeterProps) {
  const clamped = Math.min(1, Math.max(0, exposure));
  const pct = clamped * 100;

  return (
    <View
      testID={testID ?? "privacy-meter"}
      accessibilityLabel={`${label}: ${Math.round(pct)} percent`}
      accessibilityRole="image"
      style={{ alignItems: "center", gap: space.s2 }}
    >
      <Text
        style={{
          fontSize: 10,
          color: colors.neutralFgSoft,
          textTransform: "uppercase",
          letterSpacing: 0.04,
        }}
      >
        {label}
      </Text>
      <View
        testID="privacy-meter-track"
        style={{
          width: space.s5,
          height: 120,
          backgroundColor: colors.neutralLine,
          borderRadius: radius.tile,
          overflow: "hidden",
          justifyContent: "flex-end",
        }}
      >
        <View
          testID="privacy-meter-fill"
          style={{
            height: `${pct}%`,
            backgroundColor: colors.privacyCost,
          }}
        />
      </View>
      <Text
        testID="privacy-meter-readout"
        style={{ fontSize: type.t2, fontWeight: "600", color: colors.neutralFg }}
      >
        {Math.round(pct)}%
      </Text>
    </View>
  );
}
