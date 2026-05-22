/**
 * Level 03 — Information moves the sweet spot.
 *
 * Drag the info-mode slider through 6 stops. As info shared rises, the
 * surplus bar grows but the privacy meter rises too. There is a "sweet
 * zone" in the middle (cost-band / forecast-band).
 *
 * Spec: specs/0010-pedagogical-redesign/levels/03.md
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { informationSweep, makeScenario, type InfoMode } from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { InfoSlider } from "../../primitives/InfoSlider";
import { LevelShell } from "../../primitives/LevelShell";
import { PredictReveal } from "../../primitives/PredictReveal";
import { PrivacyMeter } from "../../primitives/PrivacyMeter";
import { SurplusBar } from "../../primitives/SurplusBar";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

const SWEET_ZONE: InfoMode[] = ["cost-band", "forecast-band"];

const INFO_MODE_EXPLAINER: Record<
  InfoMode,
  { headline: string; reveals: string; tradeoff: string }
> = {
  private: {
    headline: "Private — nothing shared",
    reveals: "Each party keeps their costs, capacity, and forecast to themselves. The supplier has no idea what the buyer wants; the buyer has no idea what the supplier can do.",
    tradeoff: "Maximum privacy, near-zero coordination. Surplus collapses because no one can plan against the other side.",
  },
  "risk-only": {
    headline: "Risk-only — share a single risk flag",
    reveals: "Each party shares one bit: \"I'm at risk of shortage\" or \"I'm at risk of excess.\" No numbers attached.",
    tradeoff: "Privacy still high, but the signal is too coarse to drive joint planning. Surplus barely moves.",
  },
  "capacity-band": {
    headline: "Capacity band — share a rough capacity range",
    reveals: "The supplier shares \"I can do roughly 200–400 units.\" Buyer shares \"I roughly need 400–600.\" Ranges, not point values.",
    tradeoff: "Useful enough to size the deal directionally. Privacy still mostly intact — no costs revealed.",
  },
  "cost-band": {
    headline: "Cost band — share rough cost / value bands",
    reveals: "Each party shares value/cost in bands (\"my cost is between $40 and $55 per unit\"). Detailed cost curves stay hidden.",
    tradeoff: "Sweet zone. Almost all the welfare gain of full disclosure, without revealing the exact economics.",
  },
  "forecast-band": {
    headline: "Forecast band — share future demand range",
    reveals: "On top of cost bands, parties share rough forward-looking demand: \"next quarter we expect 1500–1800.\"",
    tradeoff: "Even more welfare recovered. Privacy cost rises modestly.",
  },
  "full-oracle": {
    headline: "Full oracle — share everything to a coordinator",
    reveals: "Each party hands over full cost curves, capacity profiles, forecasts, and outside options to a trusted coordinator. The coordinator computes the best joint plan.",
    tradeoff: "Maximum welfare. The price: you need a coordinator you can trust without reservation, and any breach reveals everything.",
  },
};

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

  const current = sweep.find((row) => row.mode === mode) ?? sweep[0];
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

  const moodFor = (
    side: "buyer" | "supplier",
  ): "neutral" | "happy" | "worried" => {
    if (mode === "private") return side === "supplier" ? "worried" : "neutral";
    if (mode === "full-oracle") return "worried";
    if (SWEET_ZONE.includes(mode)) return "happy";
    return "neutral";
  };

  const canContinue = revealed && visited.size >= 3;
  const handleContinue = () => {
    if (canContinue) onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
    alignItems: "stretch",
  };
  const figureRow: CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "var(--space-7, 48px)",
    alignItems: "flex-end",
    flexWrap: "wrap",
  };
  const metersRow: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "var(--space-5, 24px)",
    alignItems: "end",
  };
  const helper: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textAlign: "center",
  };

  const sweetZone = SWEET_ZONE.includes(mode);
  const insight = sweetZone
    ? `Sharing a ${mode === "cost-band" ? "cost" : "forecast"} band recovers most of the joint surplus while parties keep their detailed costs hidden. Going further requires disclosing more than the marginal welfare gain justifies.`
    : mode === "full-oracle"
      ? "Full disclosure recovers the most surplus. It also requires each side to hand over its full cost and capacity profile to a coordinator they trust to keep them honest."
      : "With this little shared, the supplier can't plan well — surplus stays low. The info mode caps what each side has agreed to expose; the mechanism (next level) decides how to use it.";

  return (
    <LevelShell
      level={3}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Information moves the sweet spot"
      stakes="How much do they have to share to close the gap?"
      continueLabel="Continue → Level 4"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div
          data-testid="level3-intro"
          style={{
            background: "var(--neutral-bg-2, #ffffff)",
            border: "1px solid var(--neutral-line, #e3e3df)",
            borderRadius: "var(--radius-card, 16px)",
            padding: "var(--space-4, 16px) var(--space-5, 24px)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2, 8px)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              fontWeight: 600,
            }}
          >
            What the info slider models
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Closing the gap (Level 2) needed both sides to know each
            other's costs. In real procurement, no one wants to dump their
            cost structure. This slider's six stops represent how much
            information each side has agreed to disclose — from{" "}
            <strong>nothing</strong> on the left to{" "}
            <strong>full cost curves</strong> on the right. Each stop has
            a different cost in privacy and a different ceiling on the
            joint surplus you can recover.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Your job: try a few stops, watch the green (surplus) and
            orange (privacy cost) bars move, and find the
            "sweet zone" — the stop where most welfare is recovered
            without giving away the whole cost structure.
          </p>
        </div>

        <div style={figureRow}>
          <AgentFigure
            role="buyer"
            mood={moodFor("buyer")}
            size="medium"
            label="Buyer"
          />
          <AgentFigure
            role="supplier"
            mood={moodFor("supplier")}
            size="medium"
            label="Supplier"
          />
        </div>

        <InfoSlider
          value={mode}
          onChange={handleChange}
          highlight={SWEET_ZONE}
          testId="level3-info-slider"
        />

        <div
          data-testid="level3-mode-explainer"
          style={{
            background: "var(--neutral-bg-2, #ffffff)",
            border: "1px solid var(--neutral-line, #e3e3df)",
            borderLeft: "4px solid var(--privacy-cost, #d3603a)",
            borderRadius: "var(--radius-tile, 12px)",
            padding: "var(--space-3, 12px) var(--space-4, 16px)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1, 4px)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-3, 1.05rem)",
              fontWeight: 600,
            }}
          >
            {INFO_MODE_EXPLAINER[mode].headline}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            <strong>What gets shared:</strong>{" "}
            {INFO_MODE_EXPLAINER[mode].reveals}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-1, 0.85rem)",
              color: "var(--neutral-fg-soft, #5b5b62)",
              fontStyle: "italic",
            }}
          >
            <strong>Trade-off:</strong>{" "}
            {INFO_MODE_EXPLAINER[mode].tradeoff}
          </p>
        </div>

        <div style={metersRow}>
          <SurplusBar
            value={current.globalUtility}
            lost={Math.max(0, oraclePeak - current.globalUtility)}
            label={`Joint surplus at "${current.label}"`}
            testId="level3-surplus"
          />
          <PrivacyMeter
            exposure={current.privacy}
            label="privacy cost"
            testId="level3-privacy"
          />
        </div>

        <div style={helper} data-testid="level3-helper">
          Visited {visited.size} of 6 info modes.{" "}
          {visited.size < 3
            ? "Try a few more before you reveal the sweet zone."
            : "You've seen enough of the curve to spot the sweet zone."}
        </div>

        <PredictReveal
          liveValue={mode}
          truth={"cost-band"}
          renderValue={(v) => String(v)}
          predictionLabel="your guess at the sweet spot"
          truthLabel="the sweet zone"
          insight={
            <>
              {insight} Recovered surplus at the current stop:{" "}
              <strong>{Math.round(recoveredPortion * 100)}%</strong> of the
              full-oracle peak.
            </>
          }
          revealLabel="Reveal the sweet zone"
          onReveal={() => setRevealed(true)}
          disabled={visited.size < 3}
          testId="level3-reveal"
        />
      </div>
    </LevelShell>
  );
}
