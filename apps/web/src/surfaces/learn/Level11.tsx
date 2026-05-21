/**
 * Level 11 — How to coordinate without a solver.
 *
 * Walks the user through the coordination-mechanism catalog and shows
 * what each protocol exchanges across the trust boundary. This is the
 * level that owns the "ADMM is privacy-by-decentralization, not
 * privacy-by-guarantee" framing — it lists six practical alternatives
 * to ADMM that are cheaper, simpler, and often equally confidential.
 *
 * No formula editor here; the level's job is comparison, not author.
 */

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  COORDINATION_CATALOG,
  type CoordinationEntry,
  type CoordinationFamily,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

export interface Level11Props {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
}

const CONFIDENTIALITY_COLOR: Record<
  CoordinationEntry["confidentiality"],
  string
> = {
  low: "var(--surplus-lost, #d24a4a)",
  medium: "var(--privacy-cost, #d3603a)",
  "medium-high": "var(--role-supplier, #f4a85f)",
  high: "var(--surplus-good, #1bb676)",
  formal: "var(--role-coordinator, #6d54ff)",
};

const WELFARE_LABEL: Record<CoordinationEntry["welfare"], string> = {
  "first-best": "first-best",
  "near-first-best": "near first-best",
  good: "good",
  ok: "ok",
  weak: "weak",
};

const SETUP_LABEL: Record<CoordinationEntry["setupEffort"], string> = {
  minimal: "minimal",
  low: "low",
  medium: "medium",
  high: "high",
};

export function Level11({
  progress,
  onComplete,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: Level11Props) {
  const [selectedId, setSelectedId] = useState<CoordinationFamily>(
    "posted-price",
  );
  const selected = useMemo(
    () => COORDINATION_CATALOG.find((e) => e.id === selectedId) ?? COORDINATION_CATALOG[0],
    [selectedId],
  );
  const [visited, setVisited] = useState<Set<CoordinationFamily>>(
    () => new Set(["posted-price"]),
  );
  const [accepted, setAccepted] = useState(false);

  const handleSelect = (id: CoordinationFamily) => {
    setSelectedId(id);
    setVisited((prev) => {
      const copy = new Set(prev);
      copy.add(id);
      return copy;
    });
  };

  const canContinue = accepted && visited.size >= 4;

  const stage: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const tile = (id: CoordinationFamily, conf: CoordinationEntry["confidentiality"]): CSSProperties => ({
    background:
      id === selectedId
        ? "var(--role-coordinator, #6d54ff)"
        : "var(--neutral-bg-2, #ffffff)",
    color: id === selectedId ? "white" : "var(--neutral-fg, #1c1c1f)",
    border: `1px solid ${
      id === selectedId
        ? "var(--role-coordinator, #6d54ff)"
        : "var(--neutral-line, #e3e3df)"
    }`,
    borderLeft: `4px solid ${CONFIDENTIALITY_COLOR[conf]}`,
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-3, 12px) var(--space-4, 16px)",
    cursor: "pointer",
    textAlign: "left" as const,
    fontSize: "var(--type-2, 1rem)",
  });
  const detailCard: CSSProperties = {
    background: "var(--neutral-bg-2, #ffffff)",
    borderRadius: "var(--radius-card, 16px)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    padding: "var(--space-5, 24px)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3, 12px)",
  };
  const statRow: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const stat: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
  };
  const provenance: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "var(--space-3, 12px)",
  };
  const provLabel: CSSProperties = {
    fontSize: "var(--type-1, 0.85rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const helper: CSSProperties = {
    fontSize: "var(--type-2, 1rem)",
    color: "var(--neutral-fg-soft, #5b5b62)",
    textAlign: "center",
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
      level={11}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title="How to coordinate without a solver"
      stakes="Twelve mechanisms, twelve different trust boundaries. The right pick depends on what you can afford to reveal."
      continueLabel="Continue → Sandbox"
      continueDisabled={!canContinue}
      onContinue={() => canContinue && onComplete()}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <div style={grid} data-testid="level11-grid">
          {COORDINATION_CATALOG.map((entry) => (
            <button
              key={entry.id}
              type="button"
              style={tile(entry.id, entry.confidentiality)}
              onClick={() => handleSelect(entry.id)}
              data-testid={`mechanism-${entry.id}`}
              aria-pressed={entry.id === selectedId}
            >
              <div style={{ fontWeight: 600 }}>{entry.name}</div>
              <div
                style={{
                  fontSize: "var(--type-1, 0.85rem)",
                  opacity: 0.85,
                  marginTop: "var(--space-1, 4px)",
                }}
              >
                {entry.gist.length > 90
                  ? `${entry.gist.slice(0, 88)}…`
                  : entry.gist}
              </div>
            </button>
          ))}
        </div>

        <div style={detailCard} data-testid="level11-detail">
          <h2 style={{ margin: 0, fontSize: "var(--type-4, 1.3rem)" }}>
            {selected.name}
          </h2>
          <p style={{ margin: 0 }}>{selected.gist}</p>

          <div style={statRow}>
            <div style={stat}>
              <div style={provLabel}>welfare</div>
              <strong>{WELFARE_LABEL[selected.welfare]}</strong>
            </div>
            <div style={stat}>
              <div style={provLabel}>setup effort</div>
              <strong>{SETUP_LABEL[selected.setupEffort]}</strong>
            </div>
            <div style={stat}>
              <div style={provLabel}>confidentiality</div>
              <strong style={{ color: CONFIDENTIALITY_COLOR[selected.confidentiality] }}>
                {selected.confidentiality}
              </strong>
            </div>
            <div style={stat}>
              <div style={provLabel}>truth-dominant?</div>
              <strong>{selected.incentiveCompatible ? "yes" : "no"}</strong>
            </div>
          </div>

          <div style={provenance}>
            <div>
              <div style={provLabel}>what it exchanges</div>
              <div data-testid="level11-exchanges">{selected.exchanges}</div>
            </div>
            <div>
              <div style={provLabel}>what an observer can infer</div>
              <div data-testid="level11-leaks">{selected.leaks}</div>
            </div>
          </div>

          <div style={provenance}>
            <div>
              <div style={provLabel}>best fits</div>
              <ul style={{ margin: 0, paddingLeft: "var(--space-5, 24px)" }}>
                {selected.bestFits.map((fit) => (
                  <li key={fit}>{fit}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={provLabel}>weaknesses</div>
              <ul style={{ margin: 0, paddingLeft: "var(--space-5, 24px)" }}>
                {selected.weaknesses.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {selected.furtherReading.length > 0 && (
            <div>
              <div style={provLabel}>further reading</div>
              <ul
                style={{ margin: 0, paddingLeft: "var(--space-5, 24px)" }}
                data-testid="level11-reading"
              >
                {selected.furtherReading.map((r) => (
                  <li key={r.href}>
                    <a href={r.href} target="_blank" rel="noreferrer">
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={helper} data-testid="level11-helper">
          Visited {visited.size} of {COORDINATION_CATALOG.length} mechanisms.{" "}
          {visited.size < 4
            ? "Click a few more before you commit."
            : "Click 'Got it' when you're ready to move on."}
        </div>

        <button
          type="button"
          onClick={() => setAccepted(true)}
          disabled={accepted || visited.size < 4}
          data-testid="level11-got-it"
          style={{
            alignSelf: "center",
            background: accepted
              ? "var(--neutral-line, #e3e3df)"
              : "var(--role-coordinator, #6d54ff)",
            color: accepted ? "var(--neutral-fg-soft, #5b5b62)" : "white",
            border: 0,
            padding: "var(--space-3, 12px) var(--space-5, 24px)",
            borderRadius: "var(--radius-pill, 999px)",
            fontWeight: 600,
            fontSize: "var(--type-3, 1.05rem)",
            cursor: accepted ? "default" : "pointer",
          }}
        >
          {accepted ? "Noted" : "Got it"}
        </button>

        {accepted && (
          <div style={reveal} role="status" data-testid="level11-reveal">
            ADMM gives <strong>structural privacy by decentralization</strong>{" "}
            (cost functions stay local; only iterates + dual prices cross the
            wire). It does NOT give a formal guarantee — iterated updates can
            still trace a marginal-cost curve. For real privacy guarantees you
            layer DP noise on top (DP-ADMM) or run cryptographic optimization
            (MPC). For most procurement coordination, a posted-price menu plus
            scoring plus rule-based guardrails covers ~80% of the value at a
            tiny fraction of the operational cost.
          </div>
        )}
      </div>
    </LevelShell>
  );
}
