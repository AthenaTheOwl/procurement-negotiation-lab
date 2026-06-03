/**
 * Level 12 - Weighted-Nash mechanism proof.
 *
 * This level turns the mechanism catalog into an executable comparison:
 * full-oracle weighted Nash versus bounded-leakage weighted Nash. The goal
 * is plain-English trust calibration, not derivation.
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  runWeightedNashBounded,
  runWeightedNashPlaintext,
  type NashScenario,
  type WeightedNashAlgorithmRun,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
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
  id: "level12-substrate-crunch",
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
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatUtility(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
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
        runId: "level12-bounded-demo",
      }),
      plaintext: runWeightedNashPlaintext(DEMO_SCENARIO, {
        informationMode: "full_oracle",
      }),
    }),
    [],
  );

  const run = runs[selected];
  const leakage = run.leakage_report;
  const plaintextGap = Math.abs(
    quantity(runs.plaintext) - quantity(runs.bounded),
  );
  const canContinue = accepted && visited.size === 2;

  const select = (next: MechanismView) => {
    setSelected(next);
    setVisited((prev) => {
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const intro: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px) var(--space-5, 24px)",
    lineHeight: 1.5,
  };
  const switchRow: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const modeButton = (mode: MechanismView): CSSProperties => ({
    background:
      selected === mode
        ? "var(--role-coordinator, #6d54ff)"
        : "var(--neutral-bg-2, #ffffff)",
    color: selected === mode ? "white" : "var(--neutral-fg, #1c1c1f)",
    border: `1px solid ${
      selected === mode
        ? "var(--role-coordinator, #6d54ff)"
        : "var(--neutral-line, #e3e3df)"
    }`,
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px)",
    cursor: "pointer",
    textAlign: "left",
  });
  const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const card: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px)",
  };
  const label: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const value: CSSProperties = {
    marginTop: "var(--space-1, 4px)",
    fontSize: "var(--type-5, 1.8rem)",
    fontWeight: 700,
  };
  const explanation: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const gotIt: CSSProperties = {
    alignSelf: "center",
    background: accepted
      ? "var(--neutral-line, #e3e3df)"
      : "var(--role-buyer, #3a78ff)",
    color: accepted ? "var(--neutral-fg-soft, #5b5b62)" : "white",
    border: 0,
    padding: "var(--space-3, 12px) var(--space-5, 24px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontWeight: 600,
    fontSize: "var(--type-3, 1.05rem)",
    cursor: accepted ? "default" : "pointer",
  };

  return (
    <LevelShell
      level={12}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Weighted-Nash with a privacy budget"
      stakes="The solver is useful only if it preserves the deal floor and names what it reveals."
      continueLabel="Open Sandbox"
      continueDisabled={!canContinue}
      onContinue={() => canContinue && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage} data-testid="level12-stage">
        <div style={intro}>
          <p style={{ marginTop: 0 }}>
            Weighted-Nash is the fairness rule behind this negotiation pass:
            find the quantity that maximizes each party's gain over its BATNA,
            not just the buyer's preferred quantity or the supplier's margin.
          </p>
          <p style={{ marginBottom: 0 }}>
            Level 12 compares the full-oracle version with the bounded-leakage
            protocol. The plaintext run is the target. The privacy run should
            stay close while exposing only a transcript and a measured leakage
            budget.
          </p>
        </div>

        <div style={switchRow} role="group" aria-label="Mechanism selector">
          <button
            type="button"
            style={modeButton("bounded")}
            onClick={() => select("bounded")}
            aria-pressed={selected === "bounded"}
            data-testid="level12-mode-bounded"
          >
            <strong>Bounded-leakage mode</strong>
            <div>Private utilities stay local; transcript leakage is measured.</div>
          </button>
          <button
            type="button"
            style={modeButton("plaintext")}
            onClick={() => select("plaintext")}
            aria-pressed={selected === "plaintext"}
            data-testid="level12-mode-plaintext"
          >
            <strong>Plaintext oracle</strong>
            <div>All utility formulas are visible; result is the benchmark.</div>
          </button>
        </div>

        <div style={grid} data-testid="level12-results">
          <div style={card}>
            <div style={label}>consensus quantity</div>
            <div style={value}>{fmt(quantity(run), 1)}</div>
            <div>{DEMO_SCENARIO.products[0].name}</div>
          </div>
          <div style={card}>
            <div style={label}>global utility</div>
            <div style={value}>{formatUtility(run.ledger.global_utility)}</div>
            <div>{run.convergence.replace(/_/g, " ")}</div>
          </div>
          <div style={card}>
            <div style={label}>BATNA gate</div>
            <div style={value}>{batnaPass(run) ? "pass" : "fail"}</div>
            <div>No party should be worse off than walking away.</div>
          </div>
          <div style={card} data-testid="level12-leakage-card">
            <div style={label}>leakage report</div>
            <div style={value}>
              {leakage
                ? `epsilon ${fmt(leakage.aggregate.max_epsilon_measured, 2)}`
                : "full oracle"}
            </div>
            <div>
              {leakage
                ? `Bound ${fmt(leakage.aggregate.max_epsilon_bound, 2)} across ${
                    leakage.round_count
                  } rounds.`
                : "No privacy claim: the coordinator sees every utility formula."}
            </div>
          </div>
        </div>

        <div style={explanation}>
          <div style={card} data-testid="level12-batna-explain">
            <div style={label}>plain-English BATNA check</div>
            <p>
              The algorithm optimizes surplus above each outside option. If
              the chosen point cannot keep both sides above that floor, it is a
              no-deal result, not a clever compromise.
            </p>
          </div>
          <div style={card} data-testid="level12-privacy-explain">
            <div style={label}>privacy mode check</div>
            <p>
              Bounded leakage is not magic secrecy. It says what crossed the
              wire, hashes the transcript, and verifies measured epsilon stays
              below the declared bound.
            </p>
          </div>
          <div style={card} data-testid="level12-parity-explain">
            <div style={label}>parity with oracle</div>
            <p>
              The privacy run lands within {fmt(plaintextGap, 1)} units of the
              plaintext quantity in this scenario. That is the trade-off the UI
              should show before a user trusts the counterpacket.
            </p>
          </div>
        </div>

        <button
          type="button"
          style={gotIt}
          disabled={accepted || visited.size < 2}
          onClick={() => setAccepted(true)}
          data-testid="level12-got-it"
        >
          {accepted ? "Ready for the sandbox" : "Got it"}
        </button>
      </div>
    </LevelShell>
  );
}
