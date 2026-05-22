/**
 * Level 06 (mobile) — A third party.
 *
 * Same shape as web port, simpler layout for narrow screens.
 */

import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { SplitRule } from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { IntroCard } from "../../primitives/IntroCard";
import { LevelShell } from "../../primitives/LevelShell";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { SplitRuleToggle } from "../../primitives/SplitRuleToggle";
import { colors, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

interface PartyRow {
  id: "buyer" | "supplier" | "packager";
  name: string;
  role: "buyer" | "supplier" | "packager";
  outside: number;
  marginalShare: number;
  proportionalShare: number;
}

const PARTIES: PartyRow[] = [
  { id: "buyer", name: "Buyer", role: "buyer", outside: 8400, marginalShare: 0.45, proportionalShare: 0.42 },
  { id: "supplier", name: "Supplier", role: "supplier", outside: 5200, marginalShare: 0.30, proportionalShare: 0.34 },
  { id: "packager", name: "Packager", role: "packager", outside: 3200, marginalShare: 0.25, proportionalShare: 0.24 },
];

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

function computeShares(rule: SplitRule, capacityRatio: number) {
  const planUtility = 17_000 * (0.4 + 0.6 * capacityRatio);
  return PARTIES.map((p) => {
    let share = p.proportionalShare;
    if (rule === "equal") share = 1 / PARTIES.length;
    if (rule === "shapley") share = p.marginalShare;
    return { share, party: p, utility: share * planUtility };
  });
}

export interface Level06Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

export function Level06({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level06Props) {
  const [capacityPct, setCapacityPct] = useState(100);
  const [rule, setRule] = useState<SplitRule>("proportional");
  const [triedRules, setTriedRules] = useState<Set<SplitRule>>(
    () => new Set(["proportional"]),
  );

  const rows = useMemo(
    () => computeShares(rule, capacityPct / 100),
    [rule, capacityPct],
  );

  const handleRuleChange = (next: SplitRule) => {
    setRule(next);
    setTriedRules((prev) => {
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
  };

  const canContinue = triedRules.size >= 2;
  const allHappy = rows.every((r) => r.utility >= r.party.outside);
  const totalUtility = rows.reduce((sum, row) => sum + row.utility, 0);

  return (
    <LevelShell
      level={6}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="A third party"
      stakes="A packager joins. The surplus has to split across all three."
      continueLabel="Continue → Level 7"
      continueDisabled={!canContinue}
      onContinue={() => canContinue && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <IntroCard
        heading="A third party joined the deal"
        body="The buyer wants chips. The supplier (foundry) makes wafers. The new packager bonds and tests them — and they're the slowest, most expensive link. If they have less capacity, the whole plan produces less value. You have two controls: packager capacity (changes how much value the joint plan can produce) and the split rule (changes how that value gets divided). Find a setting where all three parties stay above their outside option."
        bullets={[
          "proportional — split by stated contribution; default in long-standing relationships",
          "equal — everyone gets the same slice; symbolic move, usually fails the biggest contributor",
          "shapley — each party gets a slice equal to their marginal contribution; game-theory fair",
        ]}
        testID="level6-intro"
      />
      <View
        testID="level6-graph"
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: space.s5,
        }}
      >
        {rows.map(({ party, utility }) => {
          const happy = utility >= party.outside;
          return (
            <AgentFigure
              key={party.id}
              role={party.role}
              mood={happy ? "happy" : "worried"}
              size="medium"
              label={`${party.name} · ${money(utility)}`}
            />
          );
        })}
      </View>

      <View
        testID="level6-capacity-explainer"
        style={{
          backgroundColor: colors.neutralBg,
          borderLeftWidth: 4,
          borderLeftColor: colors.rolePackager,
          padding: space.s4,
          gap: space.s2,
        }}
      >
        <Text style={{ fontSize: type.t2, fontWeight: "600" }}>
          Why touch packager capacity?
        </Text>
        <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
          The packager is the third-party chokepoint after wafers exist:
          substrate, bonding, and advanced-packaging slots. Lower capacity means
          the same buyer/supplier plan creates less real utility, so the split
          rule has to decide who absorbs or gets compensated for that bottleneck.
        </Text>
        <Text style={{ fontSize: type.t1, color: colors.neutralFgSoft }}>
          Current packager capacity is {capacityPct}% of the unconstrained plan,
          producing {money(totalUtility)} total utility before the outside-option
          check below.
        </Text>
      </View>

      <QuantityKnob
        label="Packager capacity"
        value={capacityPct}
        min={20}
        max={100}
        step={5}
        unit="%"
        onChange={setCapacityPct}
        testID="level6-capacity"
      />

      <SplitRuleToggle value={rule} onChange={handleRuleChange} testID="level6-rule" />

      <View testID="level6-table" style={{ gap: space.s2 }}>
        {rows.map(({ party, share, utility }) => {
          const happy = utility >= party.outside;
          return (
            <View
              key={party.id}
              testID={`row-${party.id}`}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: space.s2,
                borderBottomWidth: 1,
                borderBottomColor: colors.neutralLine,
              }}
            >
              <Text style={{ fontWeight: "600", flex: 1 }}>{party.name}</Text>
              <Text style={{ flex: 1, textAlign: "center" }}>
                {Math.round(share * 100)}%
              </Text>
              <Text style={{ flex: 1, textAlign: "center" }}>{money(utility)}</Text>
              <Text
                style={{
                  flex: 1,
                  textAlign: "right",
                  color: happy ? colors.surplusGood : colors.surplusLost,
                  fontWeight: "600",
                }}
              >
                {happy ? "✓ yes" : "✗ no"}
              </Text>
            </View>
          );
        })}
      </View>

      <Text
        testID="level6-helper"
        style={{ fontSize: type.t2, color: colors.neutralFgSoft, textAlign: "center" }}
      >
        Tried {triedRules.size} of 3 split rules.{" "}
        {canContinue
          ? allHappy
            ? "Everyone above outside option. The deal closes."
            : "One party is below outside. Try a different rule or more capacity."
          : "Toggle the rule to compare. Shapley splits by marginal contribution; equal splits ignore it; proportional sits between."}
      </Text>
    </LevelShell>
  );
}
