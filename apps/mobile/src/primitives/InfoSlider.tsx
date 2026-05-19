/**
 * InfoSlider (mobile) — 6-stop discrete privacy/info-mode picker.
 */

import { Pressable, Text, View } from "react-native";
import type { InfoMode } from "@lab/engine";
import { colors, radius, space, type } from "../theme/tokens";

export const INFO_STOPS: InfoMode[] = [
  "private",
  "risk-only",
  "capacity-band",
  "cost-band",
  "forecast-band",
  "full-oracle",
];

export const INFO_STOP_LABELS: Record<InfoMode, string> = {
  private: "private",
  "risk-only": "risk only",
  "capacity-band": "capacity band",
  "cost-band": "cost band",
  "forecast-band": "forecast band",
  "full-oracle": "full oracle",
};

export interface InfoSliderProps {
  value: InfoMode;
  onChange: (mode: InfoMode) => void;
  highlight?: InfoMode | InfoMode[];
  disabled?: boolean;
  testID?: string;
}

export function InfoSlider({
  value,
  onChange,
  highlight,
  disabled = false,
  testID,
}: InfoSliderProps) {
  const highlightSet = new Set<InfoMode>(
    Array.isArray(highlight) ? highlight : highlight ? [highlight] : [],
  );

  return (
    <View testID={testID ?? "info-slider"} style={{ gap: space.s3 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: space.s2,
        }}
      >
        {INFO_STOPS.map((stop) => {
          const isActive = stop === value;
          const isHighlighted = highlightSet.has(stop);
          return (
            <Pressable
              key={stop}
              testID={`info-stop-${stop}`}
              onPress={() => !disabled && onChange(stop)}
              disabled={disabled}
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={INFO_STOP_LABELS[stop]}
              style={{
                width: space.s4,
                height: space.s4,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: isHighlighted ? colors.surplusGood : colors.neutralLine,
                backgroundColor: isActive ? colors.privacyCost : colors.neutralBg2,
              }}
            />
          );
        })}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: space.s1,
        }}
      >
        {INFO_STOPS.map((stop) => (
          <Text
            key={stop}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 10,
              color: stop === value ? colors.neutralFg : colors.neutralFgSoft,
              fontWeight: stop === value ? "600" : "400",
            }}
          >
            {INFO_STOP_LABELS[stop]}
          </Text>
        ))}
      </View>
    </View>
  );
}
