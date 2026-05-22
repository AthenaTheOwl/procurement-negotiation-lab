/**
 * Level 06 — A third party.
 *
 * Buyer + supplier + packager. The user adjusts the packager's
 * capacity (which throttles total quantity) and toggles between three
 * split rules, watching transfer flows update.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/06.md
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { fetchChipMapData } from "@lab/engine";
import type { ChipMapNode, SplitRule } from "@lab/engine";
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
  const [chipMapOn, setChipMapOn] = useState(false);
  const [chipMapStatus, setChipMapStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; chokepoint: number; packagerCount: number; nodes: ChipMapNode[] }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  // When the chip-map toggle flips on, fetch the graph and average
  // packager-node chokepoint scores. Use the result to bias the
  // capacity slider so the lab inherits "what the chip map currently
  // thinks" about packager constraint.
  useEffect(() => {
    if (!chipMapOn) return;
    if (chipMapStatus.kind === "ok" || chipMapStatus.kind === "loading") return;
    setChipMapStatus({ kind: "loading" });
    fetchChipMapData()
      .then((data) => {
        const packagerNodes = data.nodes.filter(
          (n) =>
            n.type === "packager" ||
            (n.short_description ?? "").toLowerCase().includes("packag"),
        );
        const scores = packagerNodes
          .map((n) => n.chokepoint_score)
          .filter((s): s is number => typeof s === "number");
        const chokepoint =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0.4;
        setChipMapStatus({
          kind: "ok",
          chokepoint,
          packagerCount: packagerNodes.length,
          nodes: packagerNodes,
        });
        const derivedCapacity = Math.round(
          Math.max(20, Math.min(100, (1 - chokepoint) * 100)),
        );
        setCapacityPct(derivedCapacity);
      })
      .catch((err) =>
        setChipMapStatus({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
  }, [chipMapOn, chipMapStatus.kind]);

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
  const explanation: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderLeft: "4px solid var(--role-packager, #9b8cff)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const explanationText: CSSProperties = {
    margin: "var(--space-1, 4px) 0 0 0",
    color: "var(--neutral-fg-soft, #5b5b62)",
    fontSize: "var(--type-2, 1rem)",
    lineHeight: 1.45,
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
          <div style={explanation} data-testid="level6-capacity-explainer">
            <strong>Why touch packager capacity?</strong>
            <p style={explanationText}>
              The packager is the third-party chokepoint after wafers exist:
              substrate, bonding, and advanced-packaging slots. Lower capacity
              means the same buyer/supplier plan creates less real utility, so
              the transfer rule has to decide who absorbs or gets compensated
              for that bottleneck.
            </p>
            <p style={explanationText}>
              Current packager capacity is {capacityPct}% of the unconstrained
              plan, producing {money(totalUtility)} total utility before the
              outside-option check below.
            </p>
          </div>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3, 12px)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "var(--type-2, 1rem)" }}>
              Seed capacity from public chip-map chokepoints
            </span>
            <button
              type="button"
              onClick={() => setChipMapOn((on) => !on)}
              data-testid="chip-map-toggle"
              aria-pressed={chipMapOn}
              style={{
                background: chipMapOn
                  ? "var(--role-coordinator, #6d54ff)"
                  : "var(--neutral-line, #e3e3df)",
                color: chipMapOn ? "white" : "var(--neutral-fg, #1c1c1f)",
                border: 0,
                padding: "var(--space-2, 8px) var(--space-5, 24px)",
                borderRadius: "var(--radius-pill, 999px)",
                fontSize: "var(--type-2, 1rem)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {chipMapOn ? "ON" : "OFF"}
            </button>
          </div>
          <p style={helper}>
            The chip-map toggle fetches public node data, averages packager
            chokepoint scores, and converts that score into this teaching
            capacity. It is a scenario seed, not a claim about current live
            operations.
          </p>
          {chipMapOn && (
            <div
              data-testid="chip-map-status"
              style={{
                fontSize: "var(--type-1, 0.85rem)",
                color: "var(--neutral-fg-soft, #5b5b62)",
                textAlign: "center",
              }}
            >
              {chipMapStatus.kind === "loading" && "Fetching chip-supply-chain-map data…"}
              {chipMapStatus.kind === "error" &&
                `Live chip-map unavailable: ${chipMapStatus.message}. Slider stays on the local default.`}
              {chipMapStatus.kind === "ok" && (
                <>
                  Live chokepoint score across {chipMapStatus.packagerCount}{" "}
                  packager node{chipMapStatus.packagerCount === 1 ? "" : "s"}:{" "}
                  <strong>{Math.round(chipMapStatus.chokepoint * 100)}%</strong>.
                  Capacity slider above set to{" "}
                  <strong>{Math.round((1 - chipMapStatus.chokepoint) * 100)}%</strong>{" "}
                  to match.
                </>
              )}
            </div>
          )}
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
