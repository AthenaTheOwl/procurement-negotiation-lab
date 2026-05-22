import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  DEFAULT_MENU_SIGNALS,
  SAMPLE_MODELS,
  certifyCoordinationModel,
  clearMenuAgreement,
  generateMenuOptions,
  resolveCoordinationModel,
} from "@lab/engine";
import { IntroCard } from "../../primitives/IntroCard";
import { LevelShell } from "../../primitives/LevelShell";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level10Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

const MODEL_SCOPE = {
  vendor: "vendor_123",
  sku: "SKU-001",
  fc: "ABE8",
  week: "2026-W22",
  marketplace: "US",
  category: "electronics.accessories",
  contractType: "replenishment",
};

export function Level10({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level10Props) {
  const [capacity, setCapacity] = useState(
    DEFAULT_MENU_SIGNALS.capacityShadowPricePerUnit,
  );
  const [certified, setCertified] = useState(false);

  const menu = useMemo(
    () =>
      generateMenuOptions({
        ...DEFAULT_MENU_SIGNALS,
        capacityShadowPricePerUnit: capacity,
      }),
    [capacity],
  );
  const resolution = useMemo(
    () => resolveCoordinationModel(SAMPLE_MODELS, MODEL_SCOPE),
    [],
  );
  const checks = useMemo(
    () =>
      resolution.selected
        ? certifyCoordinationModel(resolution.selected, menu)
        : [],
    [resolution.selected, menu],
  );
  const allChecksPass = checks.length > 0 && checks.every((check) => check.pass);
  const agreement = useMemo(
    () =>
      clearMenuAgreement(menu, [
        { optionId: "A", maximumFeePerUnit: 0.2 },
        { optionId: "B", minimumCreditPerUnit: 0.02 },
        { optionId: "C", minimumCreditPerUnit: 0.2 },
      ]),
    [menu],
  );

  return (
    <LevelShell
      level={10}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Model Studio"
      stakes="Vendor models submit preferences and constraints. The shared kernel clears feasible, auditable terms."
      continueLabel="Open Sandbox ->"
      continueDisabled={!certified || !allChecksPass}
      onContinue={() => {
        if (certified && allChecksPass) {
          onComplete();
          onOpenSandbox?.();
        }
      }}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <View style={{ gap: space.s4 }}>
        <IntroCard
          heading="What Model Studio is for"
          body="Until now, the lab decided how surplus got split. In a real procurement platform, the buyer doesn't impose a split rule — they publish a menu of priced options (fast / standard / flexible) and let vendors choose. Model Studio is the authoring layer for that menu."
          steps={[
            "Resolve scope — pick how specific the policy is. SKU-level overrides category-level overrides global default.",
            "Tune the cost signals — capacity shadow price, lateness penalty, holding-cost relief. These shape the prices on the menu.",
            "Certify and clear — the platform checks monotonicity and margin guardrails, then lets the vendor click an option to clear an agreement.",
          ]}
          testID="level10-intro"
        />
        <View
          style={{
            backgroundColor: colors.neutralBg,
            borderRadius: radius.tile,
            padding: space.s4,
            gap: space.s2,
          }}
        >
          <Text style={{ fontSize: type.t3, fontWeight: "600" }}>
            Resolved model
          </Text>
          <Text testID="selected-model" style={{ fontSize: type.t1 }}>
            {resolution.selected?.modelId}
          </Text>
          <Text style={{ fontSize: type.t2, color: colors.neutralFgSoft }}>
            capacity signal: {money(capacity)} / unit
          </Text>
          <View style={{ flexDirection: "row", gap: space.s2 }}>
            <Pressable
              testID="capacity-down"
              onPress={() => {
                setCapacity((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100));
                setCertified(false);
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.neutralLine,
                borderRadius: radius.pill,
                padding: space.s3,
              }}
            >
              <Text>Less scarce</Text>
            </Pressable>
            <Pressable
              testID="capacity-up"
              onPress={() => {
                setCapacity((v) => Math.min(0.5, Math.round((v + 0.05) * 100) / 100));
                setCertified(false);
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.neutralLine,
                borderRadius: radius.pill,
                padding: space.s3,
              }}
            >
              <Text>More scarce</Text>
            </Pressable>
          </View>
        </View>

        {menu.map((option) => (
          <View
            key={option.optionId}
            testID={`menu-option-${option.optionId}`}
            style={{
              backgroundColor: colors.neutralBg2,
              borderRadius: radius.tile,
              borderWidth: 1,
              borderColor: colors.neutralLine,
              padding: space.s3,
              gap: space.s1,
            }}
          >
            <Text style={{ fontSize: type.t2, fontWeight: "600" }}>
              {option.optionId}. {option.label}
            </Text>
            <Text>
              {option.quantity.toLocaleString()} units, {option.shipWindowDays[0]}
              -{option.shipWindowDays[1]}d arrival
            </Text>
            <Text testID={`option-${option.optionId}-fee`}>
              fee {money(option.feePerUnit)} / credit {money(option.creditPerUnit)}
            </Text>
          </View>
        ))}

        <Pressable
          testID="certify-model"
          onPress={() => setCertified(true)}
          style={{
            alignSelf: "center",
            backgroundColor: colors.roleCoordinator,
            borderRadius: radius.pill,
            paddingVertical: space.s3,
            paddingHorizontal: space.s5,
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Run certification
          </Text>
        </Pressable>

        {certified && (
          <View testID="certification-results" style={{ gap: space.s2 }}>
            {checks.map((check) => (
              <Text key={check.id} style={{ fontSize: type.t1 }}>
                {check.pass ? "Pass" : "Fail"}: {check.label}
              </Text>
            ))}
            <Text testID="cleared-agreement" style={{ fontSize: type.t2 }}>
              Cleared option: {agreement.selected?.optionId ?? "none"}
            </Text>
          </View>
        )}
      </View>
    </LevelShell>
  );
}
