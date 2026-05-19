/**
 * PredictReveal (mobile) — mirror of the web primitive.
 */

import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, radius, space, type } from "../theme/tokens";

export interface PredictRevealProps<T> {
  liveValue: T;
  renderValue: (value: T) => string;
  truth: T;
  predictionLabel?: string;
  truthLabel?: string;
  insight: ReactNode;
  onReveal?: (guess: T) => void;
  disabled?: boolean;
  revealLabel?: string;
  testID?: string;
}

export function PredictReveal<T>({
  liveValue,
  renderValue,
  truth,
  predictionLabel = "your guess",
  truthLabel = "the answer",
  insight,
  onReveal,
  disabled = false,
  revealLabel = "Reveal",
  testID,
}: PredictRevealProps<T>) {
  const [guess, setGuess] = useState<T | null>(null);
  const handleReveal = () => {
    if (disabled) return;
    setGuess(liveValue);
    onReveal?.(liveValue);
  };

  return (
    <View testID={testID ?? "predict-reveal"} style={{ gap: space.s3 }}>
      {guess === null ? (
        <Pressable
          testID="predict-reveal-button"
          onPress={handleReveal}
          disabled={disabled}
          style={{
            backgroundColor: disabled ? colors.neutralLine : colors.roleCoordinator,
            paddingVertical: space.s3,
            paddingHorizontal: space.s5,
            borderRadius: radius.pill,
            alignSelf: "center",
          }}
        >
          <Text
            style={{
              color: disabled ? colors.neutralFgSoft : "white",
              fontSize: type.t2,
              fontWeight: "600",
            }}
          >
            {revealLabel}
          </Text>
        </Pressable>
      ) : (
        <>
          <View
            testID="predict-reveal-compare"
            style={{
              flexDirection: "row",
              backgroundColor: colors.neutralBg,
              borderRadius: radius.tile,
              padding: space.s4,
              gap: space.s4,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
                {predictionLabel}
              </Text>
              <Text
                testID="predict-reveal-guess"
                style={{ fontSize: type.t4, fontWeight: "600", color: colors.neutralFg }}
              >
                {renderValue(guess)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
                {truthLabel}
              </Text>
              <Text
                testID="predict-reveal-truth"
                style={{ fontSize: type.t4, fontWeight: "600", color: colors.neutralFg }}
              >
                {renderValue(truth)}
              </Text>
            </View>
          </View>
          <View
            testID="predict-reveal-insight"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: colors.surplusGood,
              backgroundColor: colors.dealZone,
              paddingVertical: space.s3,
              paddingHorizontal: space.s4,
              borderRadius: radius.tile,
            }}
          >
            {typeof insight === "string" ? (
              <Text style={{ fontSize: type.t2, color: colors.neutralFg }}>{insight}</Text>
            ) : (
              insight
            )}
          </View>
        </>
      )}
    </View>
  );
}
