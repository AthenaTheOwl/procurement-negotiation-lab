/**
 * Level 08 (mobile) — Author your own.
 *
 * Same engine surfaces as the web port: 5 role chips, formula text
 * input (RN TextInput), 5 parameter knobs, live surplus.
 */

import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  FormulaError,
  compileFormula,
  strategiesForRole,
  type AgentParameters,
  type ParticipantRole,
} from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { IntroCard } from "../../primitives/IntroCard";
import { LevelShell } from "../../primitives/LevelShell";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { SurplusBar } from "../../primitives/SurplusBar";
import { colors, radius, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

const ROLES: { role: ParticipantRole; label: string }[] = [
  { role: "buyer", label: "Buyer" },
  { role: "supplier", label: "Supplier" },
  { role: "packager", label: "Packager" },
  { role: "logistics", label: "Logistics" },
  { role: "distributor", label: "Distributor" },
];

const DEFAULT_PARAMS: AgentParameters = {
  urgency: 0.6,
  flexibility: 0.5,
  truthfulness: 0.7,
  privacyPreference: 0.6,
  riskAversion: 0.6,
};

// Reference values fed into every formula evaluation. Wide enough
// for every role's default formula in strategies.ts.
const REFERENCE_VALUES: Record<string, number> = {
  q: 425,
  demand: 500,
  unit_cost: 55,
  service_value: 125,
  shortage_penalty: 92,
  excess_penalty: 7,
  holding: 5,
  revenue_per_unit: 60,
  production_cost: 38,
  holding_cost: 5,
  forecast: 480,
  risk_premium: 8,
  risk_score: 0.3,
  loyalty_bonus: 12,
  relationship_score: 0.6,
  yield_value: 180,
  effective_q: 380,
  rework_cost: 15,
  capacity: 500,
  yield_rate: 0.85,
  package_margin: 45,
  bonding_cost: 12,
  substrate_carry: 7,
  substrate_pool: 400,
  lane_margin: 22,
  lane_cost: 10,
  export_penalty: 18,
  export_flag: 0,
  delay_penalty: 4,
  lead_time_days: 28,
  channel_margin: 28,
  committed_demand: 450,
};

const ALLOWED_VARS = new Set<string>([
  ...Object.keys(REFERENCE_VALUES),
  "urgency",
  "flexibility",
  "truthfulness",
  "privacy_preference",
  "risk_aversion",
]);

const SAFE_FALLBACK_FORMULA = "service_value * min(q, demand) - unit_cost * q";

function ensureParseable(formula: string): string {
  try {
    compileFormula(formula, ALLOWED_VARS);
    return formula;
  } catch {
    return SAFE_FALLBACK_FORMULA;
  }
}

function evaluate(formula: string, params: AgentParameters) {
  try {
    const compiled = compileFormula(formula, ALLOWED_VARS);
    const namespace: Record<string, number> = {
      ...REFERENCE_VALUES,
      urgency: params.urgency,
      flexibility: params.flexibility,
      truthfulness: params.truthfulness,
      privacy_preference: params.privacyPreference,
      risk_aversion: params.riskAversion,
    };
    return { value: compiled.evaluate(namespace), error: null as string | null };
  } catch (e) {
    return {
      value: 0,
      error: e instanceof FormulaError ? e.message : String(e),
    };
  }
}

export interface Level08Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

export function Level08({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level08Props) {
  const [role, setRole] = useState<ParticipantRole>("buyer");
  const defaultStrategy = useMemo(() => strategiesForRole(role)[0], [role]);
  const [formula, setFormula] = useState(
    ensureParseable(defaultStrategy.defaultUtilityFormula),
  );
  const [params, setParams] = useState<AgentParameters>({
    ...DEFAULT_PARAMS,
    ...defaultStrategy.defaultParameters,
  });
  const [editedFormula, setEditedFormula] = useState(false);
  const [editedParams, setEditedParams] = useState(false);

  const handleRoleChange = (next: ParticipantRole) => {
    const strategy = strategiesForRole(next)[0];
    setRole(next);
    setFormula(ensureParseable(strategy.defaultUtilityFormula));
    setParams({ ...DEFAULT_PARAMS, ...strategy.defaultParameters });
  };

  const evalResult = useMemo(() => evaluate(formula, params), [formula, params]);
  const defaultEval = useMemo(
    () =>
      evaluate(ensureParseable(defaultStrategy.defaultUtilityFormula), {
        ...DEFAULT_PARAMS,
        ...defaultStrategy.defaultParameters,
      }),
    [defaultStrategy],
  );

  const graduated = editedFormula || editedParams;
  const surplusValue = Math.max(0, evalResult.value);
  const lost = Math.max(0, defaultEval.value - surplusValue);

  const handleFormula = (value: string) => {
    setFormula(value);
    if (value !== ensureParseable(defaultStrategy.defaultUtilityFormula)) {
      setEditedFormula(true);
    }
  };

  const handleParamChange = (key: keyof AgentParameters, next: number) => {
    setParams((prev) => ({ ...prev, [key]: next }));
    setEditedParams(true);
  };

  return (
    <LevelShell
      level={8}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Author your own"
      stakes="Build a participant. Pick a role, edit the formula, see what surplus your design produces."
      continueLabel="Open Sandbox →"
      continueDisabled={!graduated}
      onContinue={() => {
        if (graduated) {
          onComplete();
          onOpenSandbox?.();
        }
      }}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <IntroCard
        heading="What you're building"
        body="Until now, the lab decided what each participant valued. This level lets you design one. Pick a role and the editor pre-fills a sensible default utility formula for that role. Edit the formula or the parameter sliders to change how this participant weighs different outcomes. The bar at the bottom shows the surplus your participant captures vs the default. Once you've touched a slider or the formula, the graduation card appears."
        testID="level8-intro"
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: space.s2,
          justifyContent: "center",
        }}
      >
        {ROLES.map(({ role: r, label }) => {
          const isActive = r === role;
          return (
            <Pressable
              key={r}
              testID={`role-chip-${r}`}
              onPress={() => handleRoleChange(r)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              style={{
                alignItems: "center",
                padding: space.s3,
                gap: space.s1,
                backgroundColor: isActive ? colors.roleCoordinator : colors.neutralBg2,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: colors.neutralLine,
                minWidth: 90,
              }}
            >
              <AgentFigure role={r} size="small" mood={isActive ? "happy" : "neutral"} />
              <Text style={{ color: isActive ? "white" : colors.neutralFg }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: space.s2 }}>
        <Text style={{ fontSize: type.t2, fontWeight: "600" }}>Utility formula</Text>
        <TextInput
          testID="formula-editor"
          multiline
          value={formula}
          onChangeText={handleFormula}
          style={{
            minHeight: 100,
            borderRadius: radius.tile,
            borderWidth: evalResult.error ? 2 : 1,
            borderColor: evalResult.error ? colors.surplusLost : colors.neutralLine,
            backgroundColor: colors.neutralBg2,
            padding: space.s3,
            fontFamily: "ui-monospace",
            fontSize: type.t2,
            color: colors.neutralFg,
            textAlignVertical: "top",
          }}
        />
        {evalResult.error && (
          <Text
            testID="formula-error"
            style={{
              color: colors.surplusLost,
              fontSize: type.t2,
              fontFamily: "ui-monospace",
            }}
          >
            {evalResult.error}
          </Text>
        )}
      </View>

      <View testID="param-sliders" style={{ gap: space.s4 }}>
        <QuantityKnob
          label="urgency"
          value={params.urgency}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => handleParamChange("urgency", v)}
          testID="param-urgency"
        />
        <QuantityKnob
          label="flexibility"
          value={params.flexibility}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => handleParamChange("flexibility", v)}
          testID="param-flexibility"
        />
        <QuantityKnob
          label="truthfulness"
          value={params.truthfulness}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => handleParamChange("truthfulness", v)}
          testID="param-truthfulness"
        />
        <QuantityKnob
          label="privacy preference"
          value={params.privacyPreference}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => handleParamChange("privacyPreference", v)}
          testID="param-privacy"
        />
        <QuantityKnob
          label="risk aversion"
          value={params.riskAversion}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => handleParamChange("riskAversion", v)}
          testID="param-risk"
        />
      </View>

      <SurplusBar
        value={surplusValue}
        lost={lost}
        label="Surplus from your participant vs the default for this role"
        testID="level8-surplus"
      />

      {graduated && (
        <View
          testID="graduation-card"
          style={{
            backgroundColor: colors.dealZone,
            borderLeftWidth: 4,
            borderLeftColor: colors.surplusGood,
            borderRadius: radius.card,
            padding: space.s5,
            gap: space.s3,
          }}
        >
          <Text style={{ fontSize: type.t3, fontWeight: "600" }}>
            You've built a participant.
          </Text>
          <Text style={{ fontSize: type.t2 }}>
            The Sandbox has the full toolkit — multiple parties, scenario
            import, run reports, dual-review. Continue when ready.
          </Text>
        </View>
      )}
    </LevelShell>
  );
}
