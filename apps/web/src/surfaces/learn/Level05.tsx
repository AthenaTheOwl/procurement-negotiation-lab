/**
 * Level 05 — How the rule changes the dance.
 *
 * Three mechanisms run side by side: centralized oracle, ADMM, VCG.
 * Stats fill in after the user clicks "Run all".
 *
 * Spec: specs/0010-pedagogical-redesign/levels/05.md
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { algorithmResults, makeScenario, type AlgorithmResult } from "@lab/engine";
import { ConvergenceAnimation, type ConvergenceKind } from "../../primitives/ConvergenceAnimation";
import { LevelShell } from "../../primitives/LevelShell";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level05Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

interface MechanismPanel {
  kind: ConvergenceKind;
  id: AlgorithmResult["id"];
  title: string;
  caption: string;
}

interface MechanismDetail extends MechanismPanel {
  plainEnglish: string;
  reveals: string;
  drawback: string;
}

const PANELS: MechanismDetail[] = [
  {
    kind: "oracle",
    id: "centralized-oracle",
    title: "Centralized oracle",
    caption: "One planner picks q. Highest surplus, no privacy.",
    plainEnglish:
      "Both sides hand over their full cost structure to a neutral planner. The planner computes the joint optimum and tells everyone what to do.",
    reveals: "Every cost and capacity curve in full detail.",
    drawback:
      "Requires complete trust in the planner. Any breach exposes everything.",
  },
  {
    kind: "admm",
    id: "cpp-admm",
    title: "CPP / ADMM",
    caption:
      "Buyer + supplier iterate by exchanging price + quantity signals.",
    plainEnglish:
      "Each side keeps their cost curve private. They take turns: supplier proposes a quantity given the current price, buyer proposes a price given the current quantity. They converge on a deal without ever showing each other their cost math.",
    reveals:
      "Local decisions and a coordinator price each round — not the underlying cost curves.",
    drawback:
      "Many rounds of back-and-forth can still leak the shape of each side's marginal-cost curve.",
  },
  {
    kind: "vcg",
    id: "cpp-vcg",
    title: "CPP + VCG transfer",
    caption:
      "Same as ADMM, plus a transfer that prices each party's externality on the other.",
    plainEnglish:
      "ADMM-style iteration to find the quantity, plus an extra payment between the two sides that compensates each for the cost they impose on the other. Telling the truth becomes the strategy that maximizes your own payoff.",
    reveals: "Same as ADMM — iterates and a transfer amount.",
    drawback:
      "More complex to compute and explain. The transfer can be large in absolute terms.",
  },
];

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function Level05({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level05Props) {
  const results = useMemo(() => algorithmResults(makeScenario()), []);
  const lookup = useMemo(() => {
    const map: Record<string, AlgorithmResult> = {};
    for (const r of results) map[r.id] = r;
    return map;
  }, [results]);

  const [running, setRunning] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [finished, setFinished] = useState<Record<ConvergenceKind, boolean>>({
    oracle: false,
    admm: false,
    vcg: false,
  });
  const completedAll =
    finished.oracle && finished.admm && finished.vcg;

  const handleRun = () => {
    // First click starts the run; subsequent clicks (after completion) replay.
    // While running, the button is disabled below so this guard mainly
    // protects against rapid double-clicks before any panel completes.
    if (running && !completedAll) return;
    setFinished({ oracle: false, admm: false, vcg: false });
    setRunKey((k) => k + 1);
    setRunning(true);
  };

  // Once every panel finishes, snap back to "not running" so the button
  // unlocks and the next click can start a fresh run.
  useEffect(() => {
    if (completedAll && running) {
      setRunning(false);
    }
  }, [completedAll, running]);

  const handlePanelComplete = (kind: ConvergenceKind) => {
    setFinished((prev) => ({ ...prev, [kind]: true }));
  };

  const handleContinue = () => {
    if (completedAll) onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "var(--space-5, 24px)",
  };
  const panel: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px)",
  };
  const title: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    margin: 0,
  };
  const caption: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    margin: 0,
  };
  const statsList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1, 4px)",
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const statRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
  };
  const button: CSSProperties = {
    background: running
      ? "var(--neutral-line, #e3e3df)"
      : "var(--role-coordinator, #6d54ff)",
    color: running ? "var(--neutral-fg-soft, #5b5b62)" : "white",
    border: 0,
    padding: "var(--space-3, 12px) var(--space-6, 32px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    cursor: running ? "default" : "pointer",
    alignSelf: "center",
  };
  const reveal: CSSProperties = {
    background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
    borderLeft: "4px solid var(--surplus-good, #1bb676)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
    fontSize: "var(--type-3, 1.05rem)",
  };

  return (
    <LevelShell
      level={5}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="How the rule changes the dance"
      stakes="Different rules of the game produce different deals. Watch three mechanisms run side by side."
      continueLabel="Continue → Level 6"
      continueDisabled={!completedAll}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div
          data-testid="level5-intro"
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
            Why three panels?
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Levels 1–4 found the right quantity and the right share. This
            level asks the next question: <strong>how do the two parties
            arrive at those numbers in the first place?</strong> Different
            negotiation protocols (mechanisms) produce different
            trade-offs between three things: how much joint value they
            recover, how much information leaks, and how many rounds it
            takes. The three panels below run the same problem under
            three protocols so you can compare side-by-side.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Click <strong>Run all</strong> below. Each panel animates
            from start to settlement; stats fill in when it finishes.
            Read the per-panel descriptions to understand what each
            mechanism does.
          </p>
        </div>

        <div style={grid}>
          {PANELS.map(({ kind, id, title: name, caption: cap, plainEnglish, reveals, drawback }) => {
            const data = lookup[id];
            const done = finished[kind];
            return (
              <div key={kind} style={panel}>
                <h2 style={title}>{name}</h2>
                <p style={caption}>{cap}</p>
                <ConvergenceAnimation
                  key={`${kind}-${runKey}`}
                  kind={kind}
                  playing={running}
                  duration={2_400}
                  onComplete={() => handlePanelComplete(kind)}
                  testId={`panel-${kind}`}
                />
                <div
                  data-testid={`detail-${kind}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1, 4px)",
                    fontSize: "var(--type-1, 0.85rem)",
                    color: "var(--neutral-fg, #1c1c1f)",
                    background: "var(--neutral-bg, #f7f7f4)",
                    padding: "var(--space-2, 8px) var(--space-3, 12px)",
                    borderRadius: "var(--radius-tile, 12px)",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>How it works:</strong> {plainEnglish}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>What gets revealed:</strong> {reveals}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--neutral-fg-soft, #5b5b62)",
                      fontStyle: "italic",
                    }}
                  >
                    <strong>Catch:</strong> {drawback}
                  </p>
                </div>
                <div style={statsList} data-testid={`stats-${kind}`}>
                  <div style={statRow}>
                    <span>surplus</span>
                    <strong>{done ? money(data.globalUtility) : "—"}</strong>
                  </div>
                  <div style={statRow}>
                    <span>privacy exposure</span>
                    <strong>{done ? percent(data.privacyExposure) : "—"}</strong>
                  </div>
                  <div style={statRow}>
                    <span>iterations</span>
                    <strong>{done ? data.iterations : "—"}</strong>
                  </div>
                  {kind === "vcg" && (
                    <div style={statRow}>
                      <span>transfer</span>
                      <strong>{done ? money(data.transferMagnitude) : "—"}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          style={button}
          onClick={handleRun}
          disabled={running}
          data-testid="run-all"
        >
          {completedAll ? "Run again" : running ? "Running…" : "Run all"}
        </button>

        {completedAll && (
          <div style={reveal} role="status" data-testid="level5-reveal">
            Different rules trade welfare, privacy, and speed. The oracle
            needs each side's full cost and capacity profile to find the
            optimum. ADMM only exchanges local decisions and a coordinator
            price each iteration; no party reveals its full utility
            function. CPP+VCG adds a transfer computed from those same
            ADMM iterates, which makes truthful reporting the dominant
            strategy without requiring sealed-bid type disclosure. Cheaper
            protocols (price-only, consensus averaging) leak even less,
            but they lose strategy-proofness and converge to lower
            welfare. The frontier is privacy traded against incentive
            compatibility.
          </div>
        )}
      </div>
    </LevelShell>
  );
}
