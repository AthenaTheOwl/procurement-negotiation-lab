import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  runWeightedNashBounded,
  runWeightedNashPlaintext,
  type NashScenario,
  type WeightedNashAlgorithmRun,
} from "@lab/engine";
import { IntroCard } from "../../primitives/IntroCard";
import { LevelShell } from "../../primitives/LevelShell";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level12Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

type MechanismView = "bounded" | "plaintext";

const DEMO_SCENARIO: NashScenario = {
  id: "mobile-level12-substrate-crunch",
  title: "Substrate crunch, single SKU",
  n_periods: 1,
  currency: "USD",
  products: [
    {
      id: "ai-substrate-A",
      name: "AI accelerator substrate, generation A",
      demand_mean: 500,
      demand_std: 80,
      unit_value: 100,
    },
  ],
  participants: [
    {
      id: "buyer-northstar",
      name: "Northstar Substrates",
      role: "buyer",
      utility_formula:
        "service_level_value * min(q, demand) " +
        "- unit_price * q " +
        "- shortage_penalty * max(demand - q, 0) " +
        "- inventory_penalty * max(q - demand, 0)",
      parameters: {
        service_level_value: 100,
        unit_price: 50,
        shortage_penalty: 80,
        inventory_penalty: 5,
      },
      outside_option: 0,
    },
    {
      id: "supplier-cinder",
      name: "Cinder Lithography Services",
      role: "supplier",
      utility_formula:
        "revenue_per_unit * q " +
        "- production_cost * q " +
        "- holding_cost * max(q - demand, 0) " +
        "- stockout_penalty * max(demand - q, 0) " +
        "- risk_premium * risk_score * q",
      parameters: {
        revenue_per_unit: 50,
        production_cost: 30,
        holding_cost: 3,
        stockout_penalty: 6,
        risk_premium: 8,
      },
      outside_option: 0,
    },
  ],
  capacity: { "ai-substrate-A": 800 },
  risk_score: 0,
  evidence_ids: [],
};

function fmt(value: number, digits = 1): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function quantity(run: WeightedNashAlgorithmRun): number {
  return run.iterations[0]?.consensus[0] ?? 0;
}

function batnaPass(run: WeightedNashAlgorithmRun): boolean {
  return Object.entries(run.ledger.local).every(
    ([id, utility]) => utility >= (run.ledger.outside_options[id] ?? 0),
  );
}

export function Level12({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level12Props) {
  const [selected, setSelected] = useState<MechanismView>("bounded");
  const [visited, setVisited] = useState<Set<MechanismView>>(
    () => new Set(["bounded"]),
  );
  const [accepted, setAccepted] = useState(false);

  const runs = useMemo(
    () => ({
      bounded: runWeightedNashBounded(DEMO_SCENARIO, {
        runId: "mobile-level12-bounded-demo",
      }),
      plaintext: runWeightedNashPlaintext(DEMO_SCENARIO, {
        informationMode: "full_oracle",
      }),
    }),
    [],
  );

  const run = runs[selected];
  const leakage = run.leakage_report;
  const canContinue = accepted && visited.size === 2;

  const select = (mode: MechanismView) => {
    setSelected(mode);
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(mode);
      return next;
    });
  };

  return (
    <LevelShell
      level={12}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Weighted-Nash with a privacy budget"
      stakes="A counterpacket is credible only if it preserves BATNA floors and names what it reveals."
      continueLabel="Open Sandbox ->"
      continueDisabled={!canContinue}
      onContinue={() => {
        if (canContinue) {
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
          heading="What weighted-Nash is doing"
          body="It picks the quantity that maximizes each party's gain over its walk-away option. Plaintext mode is the benchmark. Bounded-leakage mode keeps utility formulas local, then reports the transcript leakage budget."
          testID="level12-mobile-intro"
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2 }}>
          {(["bounded", "plaintext"] as const).map((mode) => (
            <Pressable
              key={mode}
              testID={`level12-mobile-mode-${mode}`}
              onPress={() => select(mode)}
              style={{
                flexGrow: 1,
                minWidth: 150,
                backgroundColor:
                  selected === mode ? colors.roleCoordinator : colors.neutralBg2,
                borderColor:
                  selected === mode ? colors.roleCoordinator : colors.neutralLine,
                borderWidth: 1,
                borderRadius: radius.tile,
                padding: space.s3,
              }}
            >
              <Text
                style={{
                  color: selected === mode ? "white" : colors.neutralFg,
                  fontWeight: "600",
                }}
              >
                {mode === "bounded" ? "Bounded leakage" : "Plaintext oracle"}
              </Text>
              <Text
                style={{
                  color: selected === mode ? "white" : colors.neutralFgSoft,
                  fontSize: type.t1,
                }}
              >
                {mode === "bounded"
                  ? "Private utilities stay local."
                  : "Coordinator sees every formula."}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          testID="level12-mobile-results"
          style={{
            backgroundColor: colors.neutralBg,
            borderRadius: radius.tile,
            padding: space.s4,
            gap: space.s2,
          }}
        >
          <Text style={{ fontSize: type.t3, fontWeight: "600" }}>
            Consensus quantity: {fmt(quantity(run), 1)}
          </Text>
          <Text style={{ fontSize: type.t2 }}>
            Global utility: {fmt(run.ledger.global_utility, 0)}
          </Text>
          <Text style={{ fontSize: type.t2 }}>
            BATNA gate: {batnaPass(run) ? "pass" : "fail"}
          </Text>
          <Text testID="level12-mobile-leakage" style={{ fontSize: type.t2 }}>
            Leakage:{" "}
            {leakage
              ? `epsilon ${fmt(leakage.aggregate.max_epsilon_measured, 2)} / bound ${fmt(
                  leakage.aggregate.max_epsilon_bound,
                  2,
                )}`
              : "full oracle, no privacy claim"}
          </Text>
        </View>

        <Text style={{ fontSize: type.t2, color: colors.neutralFgSoft }}>
          Visit both modes, then confirm you understand the trade-off before
          opening the sandbox.
        </Text>

        <Pressable
          testID="level12-mobile-got-it"
          disabled={accepted || visited.size < 2}
          onPress={() => setAccepted(true)}
          style={{
            alignSelf: "center",
            backgroundColor:
              accepted || visited.size < 2 ? colors.neutralLine : colors.roleBuyer,
            borderRadius: radius.pill,
            paddingVertical: space.s3,
            paddingHorizontal: space.s5,
          }}
        >
          <Text
            style={{
              color:
                accepted || visited.size < 2 ? colors.neutralFgSoft : "white",
              fontWeight: "600",
            }}
          >
            {accepted ? "Ready for the sandbox" : "Got it"}
          </Text>
        </Pressable>
      </View>
    </LevelShell>
  );
}
