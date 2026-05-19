/**
 * Level 03 (mobile) — Information moves the sweet spot.
 */

import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { informationSweep, makeScenario, type InfoMode } from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { InfoSlider } from "../../primitives/InfoSlider";
import { LevelShell } from "../../primitives/LevelShell";
import { PredictReveal } from "../../primitives/PredictReveal";
import { PrivacyMeter } from "../../primitives/PrivacyMeter";
import { SurplusBar } from "../../primitives/SurplusBar";
import { colors, space, type } from "../../theme/tokens";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

const SWEET_ZONE: InfoMode[] = ["cost-band", "forecast-band"];

export interface Level03Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

export function Level03({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level03Props) {
  const sweep = useMemo(() => informationSweep(makeScenario()), []);
  const [mode, setMode] = useState<InfoMode>("private");
  const [visited, setVisited] = useState<Set<InfoMode>>(
    () => new Set(["private"]),
  );
  const [revealed, setRevealed] = useState(false);

  const current = sweep.find((r) => r.mode === mode) ?? sweep[0];
  const oraclePeak = sweep[sweep.length - 1].globalUtility;
  const recoveredPortion = current.globalUtility / oraclePeak;

  const handleChange = (next: InfoMode) => {
    setMode(next);
    setVisited((prev) => {
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
  };

  const moodFor = (side: "buyer" | "supplier"): "neutral" | "happy" | "worried" => {
    if (mode === "private") return side === "supplier" ? "worried" : "neutral";
    if (mode === "full-oracle") return "worried";
    if (SWEET_ZONE.includes(mode)) return "happy";
    return "neutral";
  };

  const canContinue = revealed && visited.size >= 3;

  return (
    <LevelShell
      level={3}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Information moves the sweet spot"
      stakes="How much do they have to share to close the gap?"
      continueLabel="Continue → Level 4"
      continueDisabled={!canContinue}
      onContinue={() => canContinue && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <View
        style={{
          flexDirection: "row",
          gap: space.s7,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <AgentFigure role="buyer" mood={moodFor("buyer")} size="medium" label="Buyer" />
        <AgentFigure role="supplier" mood={moodFor("supplier")} size="medium" label="Supplier" />
      </View>

      <InfoSlider
        value={mode}
        onChange={handleChange}
        highlight={SWEET_ZONE}
        testID="level3-info-slider"
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: space.s5,
        }}
      >
        <View style={{ flex: 1 }}>
          <SurplusBar
            value={current.globalUtility}
            lost={Math.max(0, oraclePeak - current.globalUtility)}
            label={`Joint surplus at "${current.label}"`}
            testID="level3-surplus"
          />
        </View>
        <PrivacyMeter
          exposure={current.privacy}
          label="privacy cost"
          testID="level3-privacy"
        />
      </View>

      <Text
        testID="level3-helper"
        style={{ fontSize: type.t2, color: colors.neutralFgSoft, textAlign: "center" }}
      >
        Visited {visited.size} of 6 info modes.{" "}
        {visited.size < 3
          ? "Try a few more before you reveal the sweet zone."
          : "You've seen enough of the curve to spot the sweet zone."}
      </Text>

      <PredictReveal
        liveValue={mode}
        truth={"cost-band"}
        renderValue={(v) => String(v)}
        predictionLabel="your guess"
        truthLabel="the sweet zone"
        insight={`Sharing a cost or forecast band recovers most of the joint surplus while parties keep their detailed cost and capacity profiles hidden. The info mode caps what each side has agreed to expose; the mechanism (next level) decides how to use it. Recovered at current stop: ${Math.round(recoveredPortion * 100)}% of the full-oracle peak.`}
        revealLabel="Reveal the sweet zone"
        onReveal={() => setRevealed(true)}
        disabled={visited.size < 3}
        testID="level3-reveal"
      />
    </LevelShell>
  );
}
