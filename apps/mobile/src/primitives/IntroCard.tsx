/**
 * IntroCard (mobile) — the pedagogical scaffolding card placed at
 * the top of every level. Mirrors the web-side "What this level
 * shows" pattern: a heading, one or more body paragraphs, optional
 * bulleted list, optional ordered "try this" list.
 */

import { Text, View } from "react-native";
import type { ReactNode } from "react";
import { colors, radius, space, type } from "../theme/tokens";

export interface IntroCardProps {
  heading: string;
  body: ReactNode;
  bullets?: ReactNode[];
  steps?: ReactNode[];
  testID?: string;
}

export function IntroCard({
  heading,
  body,
  bullets,
  steps,
  testID,
}: IntroCardProps) {
  return (
    <View
      testID={testID ?? "intro-card"}
      style={{
        backgroundColor: colors.neutralBg2,
        borderColor: colors.neutralLine,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: space.s5,
        gap: space.s2,
      }}
    >
      <Text style={{ fontSize: type.t2, fontWeight: "600" }}>{heading}</Text>
      {typeof body === "string" ? (
        <Text
          style={{
            fontSize: type.t2,
            color: colors.neutralFg,
            lineHeight: type.t2 * 1.5,
          }}
        >
          {body}
        </Text>
      ) : (
        body
      )}
      {bullets && bullets.length > 0 && (
        <View style={{ gap: space.s1, marginTop: space.s2 }}>
          {bullets.map((b, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: space.s2 }}
            >
              <Text style={{ fontSize: type.t2, color: colors.neutralFg }}>
                •
              </Text>
              <Text
                style={{
                  fontSize: type.t2,
                  color: colors.neutralFg,
                  lineHeight: type.t2 * 1.5,
                  flex: 1,
                }}
              >
                {b}
              </Text>
            </View>
          ))}
        </View>
      )}
      {steps && steps.length > 0 && (
        <View style={{ gap: space.s1, marginTop: space.s2 }}>
          {steps.map((s, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: space.s2 }}
            >
              <Text
                style={{
                  fontSize: type.t2,
                  color: colors.neutralFg,
                  fontWeight: "600",
                  minWidth: 20,
                }}
              >
                {i + 1}.
              </Text>
              <Text
                style={{
                  fontSize: type.t2,
                  color: colors.neutralFg,
                  lineHeight: type.t2 * 1.5,
                  flex: 1,
                }}
              >
                {s}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
