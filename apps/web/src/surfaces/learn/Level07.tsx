/**
 * Level 07 — Audit the inputs.
 *
 * Toggle honesty off → decoys show red. Toggle on → all green. Reinforces
 * that the mechanism settles the deal on honest inputs; audits are the
 * second layer for when inputs aren't honest.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/07.md
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { makeScenario, runDecoyAudit } from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level07Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

export function Level07({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level07Props) {
  const honestRows = useMemo(() => {
    const scenario = makeScenario({
      customTruthfulness: 1,
      customPrivacyPreference: 0.2,
    });
    return runDecoyAudit(scenario);
  }, []);
  const dishonestRows = useMemo(() => {
    const scenario = makeScenario({
      customTruthfulness: 0.2,
      customPrivacyPreference: 0.6,
    });
    return runDecoyAudit(scenario);
  }, []);

  const [honest, setHonest] = useState(false);
  const [toggled, setToggled] = useState(false);

  const rows = honest ? honestRows : dishonestRows;
  const matched = rows.filter((r) => r.match).length;
  const total = rows.length;

  const handleToggle = () => {
    setHonest((prev) => {
      const next = !prev;
      setToggled(true);
      return next;
    });
  };

  const canContinue = toggled;
  const handleContinue = () => {
    if (canContinue) onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const switchRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3, 12px)",
    justifyContent: "center",
  };
  const toggleBtn: CSSProperties = {
    background: honest ? "var(--surplus-good, #1bb676)" : "var(--surplus-lost, #d24a4a)",
    color: "white",
    border: 0,
    padding: "var(--space-2, 8px) var(--space-5, 24px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-2, 1rem)",
    fontWeight: 600,
    cursor: "pointer",
  };
  const summary: CSSProperties = {
    fontSize: "var(--type-3, 1.05rem)",
    color: "var(--neutral-fg, #1c1c1f)",
    textAlign: "center",
  };
  const list: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
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
      level={7}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Audit the inputs"
      stakes="What if a participant misreports? The mechanism does its job. The audit catches the gap."
      continueLabel="Continue → Level 8"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={switchRow}>
          <span>Participants honest?</span>
          <button
            type="button"
            style={toggleBtn}
            onClick={handleToggle}
            data-testid="honesty-toggle"
            aria-pressed={honest}
          >
            {honest ? "ON" : "OFF"}
          </button>
        </div>

        <div style={summary} data-testid="level7-summary">
          {matched} of {total} decoy patterns match expectation.{" "}
          {honest
            ? "Honest inputs: all match."
            : "Misreports show up as mismatches."}
        </div>

        <div style={list} data-testid="level7-list">
          {rows.map((row) => {
            const bg = row.match
              ? "var(--deal-zone, rgba(27, 182, 118, 0.1))"
              : "var(--walkaway-zone, rgba(210, 74, 74, 0.1))";
            const border = row.match
              ? "var(--surplus-good, #1bb676)"
              : "var(--surplus-lost, #d24a4a)";
            return (
              <div
                key={row.decoyId}
                data-testid={`decoy-${row.decoyId}`}
                style={{
                  background: bg,
                  borderLeft: `4px solid ${border}`,
                  borderRadius: "var(--radius-tile, 12px)",
                  padding: "var(--space-3, 12px) var(--space-4, 16px)",
                }}
              >
                <div style={{ fontWeight: 600 }}>{row.title}</div>
                <div
                  style={{
                    fontSize: "var(--type-1, 0.85rem)",
                    color: "var(--neutral-fg-soft, #5b5b62)",
                  }}
                >
                  expected: {row.expectedPattern}
                </div>
                <div
                  style={{
                    fontSize: "var(--type-1, 0.85rem)",
                    color: row.match
                      ? "var(--surplus-good, #1bb676)"
                      : "var(--surplus-lost, #d24a4a)",
                  }}
                >
                  actual: {row.actualPattern}
                </div>
              </div>
            );
          })}
        </div>

        {toggled && (
          <div style={reveal} role="status" data-testid="level7-reveal">
            The mechanism settles the deal when inputs are honest. Audits
            like the decoy panel catch the gap when participants
            misreport. Both layers matter.
          </div>
        )}
      </div>
    </LevelShell>
  );
}
