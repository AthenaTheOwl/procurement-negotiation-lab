/**
 * Level 06 — A third party.
 *
 * Buyer + supplier + packager. The user adjusts the packager's
 * capacity (which throttles total quantity) and toggles between three
 * split rules, watching transfer flows update.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/06.md
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { SplitRule } from "@lab/engine";
import { AgentFigure } from "../../primitives/AgentFigure";
import { LevelShell } from "../../primitives/LevelShell";
import { QuantityKnob } from "../../primitives/QuantityKnob";
import { SplitRuleToggle } from "../../primitives/SplitRuleToggle";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level06Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

interface PartyRow {
  id: "buyer" | "supplier" | "packager";
  name: string;
  role: "buyer" | "supplier" | "packager";
  outside: number;
  marginalShare: number; // for shapley
  proportionalShare: number;
}

const PARTIES: PartyRow[] = [
  { id: "buyer", name: "Buyer", role: "buyer", outside: 8400, marginalShare: 0.45, proportionalShare: 0.42 },
  { id: "supplier", name: "Supplier", role: "supplier", outside: 5200, marginalShare: 0.30, proportionalShare: 0.34 },
  { id: "packager", name: "Packager", role: "packager", outside: 3200, marginalShare: 0.25, proportionalShare: 0.24 },
];

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function computeShares(
  rule: SplitRule,
  capacityRatio: number,
): { share: number; party: PartyRow; utility: number }[] {
  // Plan utility scales with packager capacity ratio (chokepoint).
  const planUtility = 17_000 * (0.4 + 0.6 * capacityRatio);

  return PARTIES.map((p) => {
    let share = p.proportionalShare;
    if (rule === "equal") share = 1 / PARTIES.length;
    if (rule === "shapley") share = p.marginalShare;
    return { share, party: p, utility: share * planUtility };
  });
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

  const handleContinue = () => {
    if (canContinue) onComplete();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const graphRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "var(--space-5, 24px)",
  };
  const controls: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4, 16px)",
    alignItems: "center",
  };
  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "var(--type-2, 1rem)",
  };
  const th: CSSProperties = {
    textAlign: "left",
    padding: "var(--space-2, 8px)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    fontWeight: 400,
    borderBottom: "1px solid var(--neutral-line, #e3e3df)",
  };
  const td: CSSProperties = {
    padding: "var(--space-2, 8px)",
    borderBottom: "1px solid var(--neutral-line, #e3e3df)",
  };
  const helper: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textAlign: "center",
  };

  return (
    <LevelShell
      level={6}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="A third party"
      stakes="A packager joins. The surplus has to split across all three."
      continueLabel="Continue → Level 7"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={graphRow} data-testid="level6-graph">
          {rows.map(({ party, utility }) => {
            const happy = utility >= party.outside;
            const mood: "happy" | "worried" = happy ? "happy" : "worried";
            return (
              <AgentFigure
                key={party.id}
                role={party.role}
                mood={mood}
                size="medium"
                label={`${party.name} · ${money(utility)}`}
              />
            );
          })}
        </div>

        <div style={controls}>
          <QuantityKnob
            label="Packager capacity"
            value={capacityPct}
            min={20}
            max={100}
            step={5}
            unit="%"
            onChange={setCapacityPct}
            testId="level6-capacity"
          />
          <SplitRuleToggle
            value={rule}
            onChange={handleRuleChange}
            testId="level6-rule"
          />
        </div>

        <table style={tableStyle} data-testid="level6-table">
          <thead>
            <tr>
              <th style={th}>party</th>
              <th style={th}>share</th>
              <th style={th}>utility</th>
              <th style={th}>outside</th>
              <th style={th}>no worse off</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ party, share, utility }) => {
              const happy = utility >= party.outside;
              return (
                <tr key={party.id} data-testid={`row-${party.id}`}>
                  <td style={td}>{party.name}</td>
                  <td style={td}>{Math.round(share * 100)}%</td>
                  <td style={td}>{money(utility)}</td>
                  <td style={td}>{money(party.outside)}</td>
                  <td
                    style={{
                      ...td,
                      color: happy
                        ? "var(--surplus-good, #1bb676)"
                        : "var(--surplus-lost, #d24a4a)",
                      fontWeight: 600,
                    }}
                  >
                    {happy ? "✓ yes" : "✗ no"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={helper} data-testid="level6-helper">
          Tried {triedRules.size} of 3 split rules.{" "}
          {canContinue
            ? allHappy
              ? "Everyone above outside option. The deal closes."
              : "One party is below outside. Try a different rule or more capacity."
            : "Toggle the rule to compare. Shapley splits by marginal contribution; equal splits ignore it; proportional sits between."}
        </div>
      </div>
    </LevelShell>
  );
}
