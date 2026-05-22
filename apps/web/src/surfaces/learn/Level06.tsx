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
  plainRole: string;
}

const PARTIES: PartyRow[] = [
  {
    id: "buyer",
    name: "Buyer",
    role: "buyer",
    outside: 8400,
    marginalShare: 0.45,
    proportionalShare: 0.42,
    plainRole: "the customer paying for finished chips",
  },
  {
    id: "supplier",
    name: "Supplier",
    role: "supplier",
    outside: 5200,
    marginalShare: 0.3,
    proportionalShare: 0.34,
    plainRole: "the foundry making the wafers",
  },
  {
    id: "packager",
    name: "Packager",
    role: "packager",
    outside: 3200,
    marginalShare: 0.25,
    proportionalShare: 0.24,
    plainRole: "the bottleneck shop that bonds + tests the chips",
  },
];

const SPLIT_RULE_EXPLAINER: Record<
  SplitRule,
  { headline: string; how: string; whenToUse: string }
> = {
  proportional: {
    headline: "Proportional — split by stated contribution",
    how: "Each party gets a slice sized to its declared contribution. Buyer claims the most (they pay for the plan), supplier next, packager least.",
    whenToUse:
      "Default in long-standing supplier relationships where everyone trusts the declared shares. Easy to compute, easy to argue with.",
  },
  equal: {
    headline: "Equal — everyone gets the same slice",
    how: "Total surplus is divided into three. The packager (smallest contributor) wins; the buyer (biggest contributor) loses.",
    whenToUse:
      "Symbolic moves only — e.g. \"we are partners.\" Rarely matches how value got created, so it usually fails the no-worse-off test for the biggest contributor.",
  },
  shapley: {
    headline: "Shapley — split by marginal contribution",
    how: "Each party gets a slice equal to their average marginal contribution across all possible orderings of joining the coalition. Game theory's fair-share answer.",
    whenToUse:
      "When the parties contribute unequal value and need a defensible, math-grounded split. Costs more to compute but is harder to dispute.",
  },
};

// Plain-English column headers used as tooltips + sub-labels on the table.
const TABLE_HEADER_HELP: Record<string, string> = {
  party: "Who's in the deal.",
  share:
    "Slice of the total joint utility this party gets under the current rule.",
  utility:
    "Dollar value this party walks away with after the split (share × total).",
  outside:
    "What this party could get from their next-best alternative if they walk away.",
  "no worse off":
    "✓ only if utility ≥ outside. If any row is ✗, that party walks and the deal collapses.",
};

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

  // Plain-English column sub-labels styled like in-row footnotes.
  const subLabel: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    fontWeight: 400,
    display: "block",
    marginTop: "2px",
  };

  // The card under the split-rule toggle that explains the active rule.
  const ruleCard: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderLeft: "4px solid var(--role-coordinator, #6d54ff)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
  };
  const ruleCardHeadline: CSSProperties = {
    margin: 0,
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
  };
  const ruleCardLine: CSSProperties = {
    margin: "var(--space-2, 8px) 0 0 0",
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg, #1c1c1f)",
  };
  const ruleCardWhen: CSSProperties = {
    margin: "var(--space-2, 8px) 0 0 0",
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    fontStyle: "italic",
  };

  // Intro card at the top.
  const introCard: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-5, 24px)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2, 8px)",
  };
  const introHeadline: CSSProperties = {
    margin: 0,
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
  };
  const introBody: CSSProperties = {
    margin: 0,
    color: "var(--neutral-fg, #1c1c1f)",
    lineHeight: 1.5,
  };

  // "Try this" sequence.
  const trySequence: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
  };

  const ruleInfo = SPLIT_RULE_EXPLAINER[rule];
  const failingParties = rows.filter((r) => r.utility < r.party.outside);
  const failingLine =
    failingParties.length === 0
      ? "Everyone is above their outside option. The deal closes."
      : `${failingParties.map((r) => r.party.name).join(" + ")} would walk under this rule — they get less here than their outside option.`;

  return (
    <LevelShell
      level={6}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="A third party"
      stakes="A packager joins. Now you have three parties splitting one pie — and the rule you pick says who wins."
      continueLabel="Continue → Level 7"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={introCard} data-testid="level6-intro">
          <p style={introHeadline}>
            What changed since Level 5: a third party joined the deal.
          </p>
          <p style={introBody}>
            The <strong>buyer</strong> wants chips. The{" "}
            <strong>supplier</strong> (foundry) makes wafers. The new{" "}
            <strong>packager</strong> bonds and tests them — and they're the
            slowest, most expensive link. If they have less capacity, the
            whole plan produces less value, no matter how good buyer and
            supplier are.
          </p>
          <p style={introBody}>
            You have two controls. The{" "}
            <strong>packager-capacity slider</strong> changes how much value
            the joint plan can produce (lower capacity = smaller pie). The{" "}
            <strong>split-rule toggle</strong> changes how that pie gets
            divided across the three parties. Your job is to find a setting
            where all three parties leave better off than walking away.
          </p>
        </div>

        <div style={graphRow} data-testid="level6-graph">
          {rows.map(({ party, utility }) => {
            const happy = utility >= party.outside;
            const mood: "happy" | "worried" = happy ? "happy" : "worried";
            return (
              <div
                key={party.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-1, 4px)",
                  maxWidth: "200px",
                  textAlign: "center",
                }}
              >
                <AgentFigure
                  role={party.role}
                  mood={mood}
                  size="medium"
                  label={`${party.name} · ${money(utility)}`}
                />
                <span
                  style={{
                    fontSize: "var(--type-1, 0.85rem)",
                    color: "var(--neutral-fg-soft, #5b5b62)",
                  }}
                >
                  {party.plainRole}
                </span>
              </div>
            );
          })}
        </div>

        <div style={controls}>
          <div style={explanation} data-testid="level6-capacity-explainer">
            <strong>Why a packager-capacity slider?</strong>
            <p style={explanationText}>
              The packager is the third-party chokepoint in this scenario.
              In semis, advanced packaging (think TSMC's CoWoS or ASE's
              bonding lines) is the actual bottleneck for AI chips today —
              not wafer fabs. If the packager's capacity shrinks, the same
              buyer-and-supplier plan produces fewer finished chips, so the
              joint pie everyone shares gets smaller too.
            </p>
            <p style={explanationText}>
              Current packager capacity:{" "}
              <strong>{capacityPct}%</strong> of unconstrained → joint
              utility this round is{" "}
              <strong>{money(totalUtility)}</strong> before any party's
              outside option is checked.
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2, 8px)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "var(--type-2, 1rem)",
                color: "var(--neutral-fg, #1c1c1f)",
              }}
            >
              Pick a split rule
            </span>
            <SplitRuleToggle
              value={rule}
              onChange={handleRuleChange}
              testId="level6-rule"
            />
          </div>

          <div style={ruleCard} data-testid="level6-rule-explainer">
            <p style={ruleCardHeadline}>{ruleInfo.headline}</p>
            <p style={ruleCardLine}>{ruleInfo.how}</p>
            <p style={ruleCardWhen}>When you'd use it: {ruleInfo.whenToUse}</p>
          </div>

          <details
            style={{
              alignSelf: "stretch",
              background: "var(--neutral-bg, #f7f7f4)",
              borderRadius: "var(--radius-tile, 12px)",
              padding: "var(--space-3, 12px) var(--space-4, 16px)",
              border: "1px solid var(--neutral-line, #e3e3df)",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "var(--type-2, 1rem)",
              }}
            >
              Advanced: seed packager capacity from the public chip-supply-chain map
            </summary>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2, 8px)",
                marginTop: "var(--space-3, 12px)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--type-1, 0.85rem)",
                  color: "var(--neutral-fg-soft, #5b5b62)",
                }}
              >
                Pulls public chokepoint scores from the
                chip-supply-chain-map repo, averages them across packager
                nodes, and uses that average to set the capacity slider.
                Optional, and only a scenario seed — not a claim about live
                operations.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3, 12px)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "var(--type-2, 1rem)" }}>
                  Use live chip-map seed
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
              {chipMapOn && (
                <div
                  data-testid="chip-map-status"
                  style={{
                    fontSize: "var(--type-1, 0.85rem)",
                    color: "var(--neutral-fg-soft, #5b5b62)",
                  }}
                >
                  {chipMapStatus.kind === "loading" &&
                    "Fetching chip-supply-chain-map data…"}
                  {chipMapStatus.kind === "error" &&
                    `Live chip-map unavailable: ${chipMapStatus.message}. Slider stays on the local default.`}
                  {chipMapStatus.kind === "ok" && (
                    <>
                      Live chokepoint score across{" "}
                      {chipMapStatus.packagerCount} packager node
                      {chipMapStatus.packagerCount === 1 ? "" : "s"}:{" "}
                      <strong>
                        {Math.round(chipMapStatus.chokepoint * 100)}%
                      </strong>
                      . Capacity slider above set to{" "}
                      <strong>
                        {Math.round((1 - chipMapStatus.chokepoint) * 100)}%
                      </strong>{" "}
                      to match.
                    </>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>

        <table style={tableStyle} data-testid="level6-table">
          <thead>
            <tr>
              <th style={th} title={TABLE_HEADER_HELP.party}>
                party
                <span style={subLabel}>who's in the deal</span>
              </th>
              <th style={th} title={TABLE_HEADER_HELP.share}>
                share
                <span style={subLabel}>their slice under this rule</span>
              </th>
              <th style={th} title={TABLE_HEADER_HELP.utility}>
                utility
                <span style={subLabel}>$ they walk away with</span>
              </th>
              <th style={th} title={TABLE_HEADER_HELP.outside}>
                outside option
                <span style={subLabel}>$ if they walk</span>
              </th>
              <th style={th} title={TABLE_HEADER_HELP["no worse off"]}>
                stays in?
                <span style={subLabel}>only ✓ if utility ≥ outside</span>
              </th>
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
                    {happy ? "✓ yes" : "✗ no — walks"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          data-testid="level6-deal-status"
          style={{
            ...helper,
            fontSize: "var(--type-2, 1rem)",
            color: failingParties.length === 0
              ? "var(--surplus-good, #1bb676)"
              : "var(--surplus-lost, #d24a4a)",
            fontWeight: 600,
          }}
        >
          {failingLine}
        </div>

        <div style={trySequence} data-testid="level6-try-sequence">
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              fontWeight: 600,
            }}
          >
            Try this in order:
          </p>
          <ol
            style={{
              margin: "var(--space-2, 8px) 0 0 var(--space-5, 24px)",
              fontSize: "var(--type-2, 1rem)",
              color: "var(--neutral-fg, #1c1c1f)",
              lineHeight: 1.5,
            }}
          >
            <li>
              Leave capacity at 100% and the rule on{" "}
              <strong>proportional</strong>. Notice all three parties get a
              fair slice and stay above their outside option.
            </li>
            <li>
              Drop packager capacity to <strong>~40%</strong>. The whole pie
              shrinks. Notice the buyer dips toward their outside option
              first — they had the most to lose.
            </li>
            <li>
              Switch to <strong>equal</strong>. The packager (the smallest
              contributor) suddenly gets the same as the buyer. Watch the
              "stays in?" column — usually the buyer walks.
            </li>
            <li>
              Switch to <strong>shapley</strong>. Now slices follow each
              party's marginal contribution: bigger contributors get more,
              the packager gets less than under equal but more than zero.
            </li>
          </ol>
        </div>

        <div style={helper} data-testid="level6-helper">
          Tried <strong>{triedRules.size}</strong> of 3 split rules.{" "}
          {canContinue
            ? allHappy
              ? "Everyone above outside option under the current rule. You've seen the policy lever in action — Continue when ready."
              : "You've tried at least two rules — that's enough to see the trade-off. A different rule or more packager capacity would close the deal."
            : "Toggle the rule above to compare at least two rules. You won't internalize the lesson without seeing one feel different from another."}
        </div>
      </div>
    </LevelShell>
  );
}
