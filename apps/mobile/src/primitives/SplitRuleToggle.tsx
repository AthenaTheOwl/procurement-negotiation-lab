/**
 * SplitRuleToggle (mobile) — 3-stop pill toggle.
 */

import { Pressable, Text, View } from "react-native";
import type { SplitRule } from "@lab/engine";
import { colors, radius, space, type } from "../theme/tokens";

export const SPLIT_RULES: SplitRule[] = ["proportional", "equal", "shapley"];

export interface SplitRuleToggleProps {
  value: SplitRule;
  onChange: (next: SplitRule) => void;
  disabled?: boolean;
  testID?: string;
}

export function SplitRuleToggle({
  value,
  onChange,
  disabled = false,
  testID,
}: SplitRuleToggleProps) {
  return (
    <View
      testID={testID ?? "split-rule-toggle"}
      accessibilityLabel="surplus split rule"
      style={{
        flexDirection: "row",
        backgroundColor: colors.neutralBg,
        borderRadius: radius.pill,
        padding: space.s1,
        gap: space.s1,
        borderWidth: 1,
        borderColor: colors.neutralLine,
        alignSelf: "center",
      }}
    >
      {SPLIT_RULES.map((rule) => {
        const isActive = rule === value;
        return (
          <Pressable
            key={rule}
            testID={`split-rule-${rule}`}
            disabled={disabled}
            onPress={() => onChange(rule)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            style={{
              paddingVertical: space.s2,
              paddingHorizontal: space.s5,
              borderRadius: radius.pill,
              backgroundColor: isActive ? colors.roleCoordinator : "transparent",
            }}
          >
            <Text
              style={{
                color: isActive ? "white" : colors.neutralFg,
                fontSize: type.t2,
                fontWeight: isActive ? "600" : "400",
              }}
            >
              {rule}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
