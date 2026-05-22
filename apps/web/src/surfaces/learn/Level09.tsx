/**
 * Level 09 — Multi-period commitment workbench.
 *
 * The graduation level for the lab's multi-week procurement framing.
 * The user edits a 12-week schedule of buyer commitments. Each week
 * has a quantity (q), a commitment type (firm / soft / forecast), and
 * a forecast confidence that fades over the horizon.
 *
 * Spec: addendum 4 to spec 0010 (procurement-negotiation-lab v1
 * multi-period); engine helpers in packages/engine/src/learn/multiPeriod.ts.
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  COMMITMENT_KINDS,
  applyPreset,
  defaultMultiPeriodPlan,
  evaluateMultiPeriodPlan,
  optimalMultiPeriodPlan,
  type CommitmentKind,
  type MultiPeriodPreset,
  type WeekPlan,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { SurplusBar } from "../../primitives/SurplusBar";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level09Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

const COMMITMENT_LABEL: Record<CommitmentKind, string> = {
  firm: "firm",
  soft: "soft",
  forecast: "forecast",
};

const COMMITMENT_COLOR: Record<CommitmentKind, string> = {
  firm: "var(--role-coordinator, #6d54ff)",
  soft: "var(--role-supplier, #f4a85f)",
  forecast: "var(--neutral-fg-soft, #5b5b62)",
};

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

const PRESETS: { id: MultiPeriodPreset; label: string }[] = [
  { id: "default", label: "Reset" },
  { id: "all-firm", label: "All firm" },
  { id: "drop-far-weeks", label: "Drop far weeks" },
  { id: "optimal", label: "Snap to optimum" },
];

export function Level09({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level09Props) {
  const [plan, setPlan] = useState<WeekPlan[]>(() => defaultMultiPeriodPlan());
  const [revealed, setRevealed] = useState(false);
  const [editedSomething, setEditedSomething] = useState(false);

  const result = useMemo(() => evaluateMultiPeriodPlan(plan), [plan]);
  const optPlan = useMemo(() => optimalMultiPeriodPlan(plan), [plan]);
  const optResult = useMemo(
    () => evaluateMultiPeriodPlan(optPlan),
    [optPlan],
  );
  const lost = Math.max(0, optResult.total - result.total);
  const ratio = optResult.total > 0 ? result.total / optResult.total : 1;

  const updateWeek = (index: number, patch: Partial<WeekPlan>) => {
    setPlan((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setEditedSomething(true);
  };

  const handlePreset = (preset: MultiPeriodPreset) => {
    setPlan((prev) => applyPreset(prev, preset));
    setEditedSomething(true);
  };

  const canContinue = revealed;

  const handleContinue = () => {
    if (!canContinue) return;
    onComplete();
    onOpenSandbox?.();
  };

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const summary: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "var(--space-4, 16px)",
  };
  const stat: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-3, 12px) var(--space-4, 16px)",
  };
  const presetRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-2, 8px)",
  };
  const presetBtn: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-pill, 999px)",
    padding: "var(--space-2, 8px) var(--space-4, 16px)",
    fontSize: "var(--type-2, 1rem)",
    cursor: "pointer",
  };
  const table: CSSProperties = {
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
    verticalAlign: "middle",
  };
  const revealBtn: CSSProperties = {
    background: revealed
      ? "var(--neutral-line, #e3e3df)"
      : "var(--role-coordinator, #6d54ff)",
    color: revealed ? "var(--neutral-fg-soft, #5b5b62)" : "white",
    border: 0,
    padding: "var(--space-3, 12px) var(--space-5, 24px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontSize: "var(--type-3, 1.05rem)",
    fontWeight: 600,
    alignSelf: "center",
    cursor: revealed ? "default" : "pointer",
  };
  const reveal: CSSProperties = {
    background: "var(--deal-zone, rgba(27, 182, 118, 0.1))",
    borderLeft: "4px solid var(--surplus-good, #1bb676)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-4, 16px)",
    fontSize: "var(--type-2, 1rem)",
  };

  return (
    <LevelShell
      level={9}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="Multi-period commitment workbench"
      stakes="Twelve weeks of commitments. Firm promises lock in surplus but cost a lot to miss. Find a schedule that holds up under fading forecast confidence."
      continueLabel="Open Sandbox →"
      continueDisabled={!canContinue}
      onContinue={handleContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div
          data-testid="level9-intro"
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
            What this workbench models
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            A real buy plan covers many weeks ahead, not a single
            number. The table below has one row per week. For each week
            you set <strong>q</strong> (units you'll buy) and a
            <strong> commitment type</strong>, which controls how much it
            costs you if you miss the promise.
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "var(--space-5, 24px)",
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            <li>
              <strong>firm</strong> — guaranteed delivery. Highest joint
              value if you hit it, biggest penalty if you miss. Use for
              weeks where demand is locked in.
            </li>
            <li>
              <strong>soft</strong> — committed but cancellable with a
              penalty. Mid-cost on miss. Use when demand is likely but
              not certain.
            </li>
            <li>
              <strong>forecast</strong> — non-binding signal. Cheapest on
              miss but the supplier may not hold capacity. Use for
              far-horizon weeks where the forecast is just a guess.
            </li>
          </ul>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            The <strong>confidence</strong> column shows how confident
            the forecast is for each week (it fades over the horizon —
            you know next week better than week 12). Your goal: pick a
            commitment mix that matches confidence to risk. The
            "Snap to optimum" preset shows the closed-form answer.
          </p>
        </div>

        <div style={summary}>
          <div style={stat}>
            <div
              style={{
                fontSize: "var(--type-1, 0.85rem)",
                color: "var(--neutral-fg-soft, #5b5b62)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              your total
            </div>
            <div
              style={{ fontSize: "var(--type-4, 1.3rem)", fontWeight: 600 }}
              data-testid="level9-total"
            >
              {money(result.total)}
            </div>
          </div>
          <div style={stat}>
            <div
              style={{
                fontSize: "var(--type-1, 0.85rem)",
                color: "var(--neutral-fg-soft, #5b5b62)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              optimum total
            </div>
            <div
              style={{ fontSize: "var(--type-4, 1.3rem)", fontWeight: 600 }}
              data-testid="level9-optimum"
            >
              {money(optResult.total)}
            </div>
          </div>
          <div style={stat}>
            <div
              style={{
                fontSize: "var(--type-1, 0.85rem)",
                color: "var(--neutral-fg-soft, #5b5b62)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              gap to optimum
            </div>
            <div
              style={{ fontSize: "var(--type-4, 1.3rem)", fontWeight: 600 }}
              data-testid="level9-gap"
            >
              {money(lost)} ({Math.round((1 - ratio) * 100)}%)
            </div>
          </div>
        </div>

        <SurplusBar
          value={Math.max(0, result.total)}
          lost={lost}
          label="Twelve-week joint utility"
          testId="level9-surplus"
        />

        <div style={presetRow}>
          {PRESETS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              style={presetBtn}
              onClick={() => handlePreset(id)}
              data-testid={`preset-${id}`}
            >
              {label}
            </button>
          ))}
        </div>

        <table style={table} data-testid="level9-table">
          <thead>
            <tr>
              <th style={th}>week</th>
              <th style={th}>demand mean</th>
              <th style={th}>confidence</th>
              <th style={th}>commitment</th>
              <th style={th}>committed</th>
              <th style={th}>q</th>
              <th style={th}>weekly utility</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((week, idx) => {
              const r = result.weeks[idx];
              return (
                <tr key={week.week} data-testid={`week-${week.week}`}>
                  <td style={td}>{week.week}</td>
                  <td style={td}>{Math.round(week.demandMean)}</td>
                  <td style={td}>
                    {Math.round(week.forecastConfidence * 100)}%
                  </td>
                  <td style={td}>
                    <select
                      value={week.commitment}
                      onChange={(e) =>
                        updateWeek(idx, {
                          commitment: e.target.value as CommitmentKind,
                        })
                      }
                      style={{
                        background: COMMITMENT_COLOR[week.commitment],
                        color: "white",
                        border: 0,
                        borderRadius: "var(--radius-pill, 999px)",
                        padding: "4px 10px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      data-testid={`commitment-${week.week}`}
                      aria-label={`commitment for week ${week.week}`}
                    >
                      {COMMITMENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {COMMITMENT_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={Math.round(week.committed)}
                      min={0}
                      max={1000}
                      step={5}
                      onChange={(e) =>
                        updateWeek(idx, {
                          committed: Number(e.target.value),
                        })
                      }
                      style={{
                        width: "70px",
                        padding: "4px",
                        borderRadius: "var(--radius-tile, 12px)",
                        border: "1px solid var(--neutral-line, #e3e3df)",
                      }}
                      data-testid={`committed-${week.week}`}
                      aria-label={`committed for week ${week.week}`}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={Math.round(week.q)}
                      min={0}
                      max={1000}
                      step={5}
                      onChange={(e) =>
                        updateWeek(idx, { q: Number(e.target.value) })
                      }
                      style={{
                        width: "70px",
                        padding: "4px",
                        borderRadius: "var(--radius-tile, 12px)",
                        border: "1px solid var(--neutral-line, #e3e3df)",
                      }}
                      data-testid={`q-${week.week}`}
                      aria-label={`q for week ${week.week}`}
                    />
                  </td>
                  <td
                    style={{
                      ...td,
                      color:
                        r.utility >= 0
                          ? "var(--surplus-good, #1bb676)"
                          : "var(--surplus-lost, #d24a4a)",
                      fontWeight: 600,
                    }}
                  >
                    {money(r.utility)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          type="button"
          style={revealBtn}
          onClick={() => setRevealed(true)}
          disabled={revealed || !editedSomething}
          data-testid="level9-reveal"
        >
          {revealed ? "Optimum revealed" : "Reveal the schedule optimum"}
        </button>

        {revealed && (
          <div style={reveal} role="status" data-testid="level9-reveal-text">
            The closed-form optimum sets each week's q to that week's
            effective demand (demand × confidence). Firm weeks lock in
            value early but punish misses; forecast weeks let you defer
            commitment to the cheapest signal. Your schedule scored{" "}
            <strong>{money(result.total)}</strong> against an optimum of{" "}
            <strong>{money(optResult.total)}</strong> — {Math.round(ratio * 100)}%
            of the achievable joint utility. The Sandbox lets you swap in
            different agents, run audits, and export the whole run.
          </div>
        )}
      </div>
    </LevelShell>
  );
}
