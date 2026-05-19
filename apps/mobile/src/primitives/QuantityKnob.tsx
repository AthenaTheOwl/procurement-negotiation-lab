/**
 * QuantityKnob (mobile) — RN slider with label + readout.
 *
 * Implementation: a Pressable + PanResponder-driven slider is the
 * native equivalent, but we keep this v1 simpler by exposing the same
 * prop API and rendering "−"/"+" pressables for adjustment. A future
 * upgrade swaps in @react-native-community/slider once the dep is
 * added (deferred to avoid a native-module install in v1).
 */

import { Pressable, Text, View } from "react-native";
import { colors, radius, space, type } from "../theme/tokens";

export interface QuantityKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
  onRelease?: (final: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
  testID?: string;
}

export function QuantityKnob({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  onRelease,
  format,
  disabled = false,
  testID,
}: QuantityKnobProps) {
  const display = format ? format(value) : unit ? `${value} ${unit}` : String(value);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const inc = () => {
    if (disabled) return;
    const next = clamp(value + step);
    onChange(next);
  };
  const dec = () => {
    if (disabled) return;
    const next = clamp(value - step);
    onChange(next);
  };
  const release = () => {
    onRelease?.(value);
  };

  const fillPct = ((value - min) / Math.max(1e-9, max - min)) * 100;

  return (
    <View testID={testID ?? "quantity-knob"} style={{ gap: space.s2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: type.t2, color: colors.neutralFg }}>{label}</Text>
        <Text style={{ fontSize: type.t4, fontWeight: "600", color: colors.neutralFg }}>
          {display}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.s3,
        }}
      >
        <Pressable
          onPress={dec}
          onPressOut={release}
          disabled={disabled}
          testID="quantity-knob-decrease"
          style={{
            width: space.s7,
            height: space.s7,
            borderRadius: radius.pill,
            backgroundColor: colors.neutralBg2,
            borderWidth: 1,
            borderColor: colors.neutralLine,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel={`decrease ${label}`}
        >
          <Text style={{ fontSize: type.t4, color: colors.neutralFg }}>−</Text>
        </Pressable>
        <View
          style={{
            flex: 1,
            height: space.s2,
            borderRadius: radius.pill,
            backgroundColor: colors.neutralLine,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${fillPct}%`,
              height: "100%",
              backgroundColor: colors.roleBuyer,
            }}
            testID="quantity-knob-fill"
          />
        </View>
        <Pressable
          onPress={inc}
          onPressOut={release}
          disabled={disabled}
          testID="quantity-knob-increase"
          style={{
            width: space.s7,
            height: space.s7,
            borderRadius: radius.pill,
            backgroundColor: colors.roleBuyer,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel={`increase ${label}`}
        >
          <Text style={{ fontSize: type.t4, color: "white" }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
