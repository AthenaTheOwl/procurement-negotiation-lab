/**
 * SandboxStub (mobile) — small placeholder that points users back to
 * the web Lab Arena. The full sandbox is not part of the v1 mobile
 * build: it pulls cytoscape and an Acorn-based formula compiler that
 * each need RN-specific ports. Until that work lands, the mobile
 * sandbox tile redirects users to the public deployed URL.
 */

import { Pressable, Text, View, Linking } from "react-native";
import { colors, radius, space, type } from "../../theme/tokens";

const SANDBOX_URL = "https://procurement-negotiation-lab.vercel.app/#/sandbox";

export interface SandboxStubProps {
  onOpenHome: () => void;
}

export function SandboxStub({ onOpenHome }: SandboxStubProps) {
  return (
    <View
      testID="sandbox-stub"
      style={{
        flex: 1,
        backgroundColor: colors.neutralBg,
        padding: space.s5,
        alignItems: "center",
        justifyContent: "center",
        gap: space.s5,
      }}
    >
      <Text
        style={{
          fontSize: type.t5,
          fontWeight: "600",
          textAlign: "center",
          color: colors.neutralFg,
        }}
      >
        Sandbox is on the web.
      </Text>
      <Text
        style={{
          fontSize: type.t2,
          textAlign: "center",
          color: colors.neutralFgSoft,
        }}
      >
        The full Lab Arena ships in the web app. The mobile build keeps the
        eight-level walkthrough lean; the Sandbox tools (graph, formula
        editor, run reports) live online.
      </Text>
      <Pressable
        testID="sandbox-stub-open"
        onPress={() => Linking.openURL(SANDBOX_URL)}
        style={{
          backgroundColor: colors.roleBuyer,
          paddingVertical: space.s4,
          paddingHorizontal: space.s7,
          borderRadius: radius.pill,
        }}
      >
        <Text style={{ color: "white", fontSize: type.t3, fontWeight: "600" }}>
          Open Sandbox on web
        </Text>
      </Pressable>
      <Pressable
        testID="sandbox-stub-back"
        onPress={onOpenHome}
        style={{
          paddingVertical: space.s3,
          paddingHorizontal: space.s6,
        }}
      >
        <Text
          style={{
            color: colors.neutralFgSoft,
            fontSize: type.t2,
          }}
        >
          ← Back to home
        </Text>
      </Pressable>
    </View>
  );
}
