/**
 * Level 07 — Audit the inputs.
 *
 * Toggle honesty off → decoys show red. Toggle on → all green. Reinforces
 * that the mechanism settles the deal on honest inputs; audits are the
 * second layer for when inputs aren't honest.
 *
 * Spec: specs/0010-pedagogical-redesign/levels/07.md
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  fetchRiskCorpus,
  makeScenario,
  runDecoyAudit,
  type RiskChunk,
} from "@lab/engine";
import { LevelShell } from "../../primitives/LevelShell";
import { TOTAL_LEVELS, type LearnProgress } from "../../state/learnProgress";

type EvidenceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; chunks: RiskChunk[] }
  | { kind: "error"; message: string };

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
  const [evidenceOn, setEvidenceOn] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceState>({ kind: "idle" });

  useEffect(() => {
    if (!evidenceOn || evidence.kind === "ok" || evidence.kind === "loading") return;
    setEvidence({ kind: "loading" });
    fetchRiskCorpus()
      .then((corpus) =>
        setEvidence({ kind: "ok", chunks: corpus.chunks.slice(0, 3) }),
      )
      .catch((err) =>
        setEvidence({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
  }, [evidenceOn, evidence.kind]);

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
        <div
          data-testid="level7-intro"
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
            What the honesty toggle models
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Every mechanism in the previous levels assumes the parties
            tell the truth about their costs and capacity. They often
            don't. The list below is a set of <strong>decoy patterns</strong>{" "}
            — known fingerprints of misreporting (e.g. capacity inflated,
            cost overstated, demand exaggerated). Each decoy has an
            <em> expected pattern</em> the audit would see if the party
            were honest, and an <em>actual pattern</em> the engine
            generated under current participant behavior.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--type-2, 1rem)",
              lineHeight: 1.5,
              color: "var(--neutral-fg, #1c1c1f)",
            }}
          >
            Flip the toggle below from OFF to ON. With honesty OFF,
            expected and actual diverge — rows go red. With honesty ON,
            they match — rows go green. The lesson: the mechanism settles
            the deal on the inputs it's given; an audit layer is what
            catches when those inputs are being gamed.
          </p>
        </div>

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3, 12px)",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "var(--type-2, 1rem)" }}>
            Live RAG evidence from supplier-risk-rag-agent
          </span>
          <button
            type="button"
            onClick={() => setEvidenceOn((on) => !on)}
            aria-pressed={evidenceOn}
            data-testid="evidence-toggle"
            style={{
              background: evidenceOn
                ? "var(--role-coordinator, #6d54ff)"
                : "var(--neutral-line, #e3e3df)",
              color: evidenceOn ? "white" : "var(--neutral-fg, #1c1c1f)",
              border: 0,
              padding: "var(--space-2, 8px) var(--space-5, 24px)",
              borderRadius: "var(--radius-pill, 999px)",
              fontSize: "var(--type-2, 1rem)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {evidenceOn ? "ON" : "OFF"}
          </button>
        </div>
        {evidenceOn && (
          <div data-testid="evidence-panel" style={list}>
            {evidence.kind === "loading" && (
              <div style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}>
                Fetching live filing excerpts from supplier-risk-rag-agent…
              </div>
            )}
            {evidence.kind === "error" && (
              <div
                style={{ color: "var(--surplus-lost, #d24a4a)" }}
                data-testid="evidence-error"
              >
                Live evidence unavailable: {evidence.message}. The decoy
                audit above still runs locally.
              </div>
            )}
            {evidence.kind === "ok" &&
              evidence.chunks.map((chunk, idx) => (
                <div
                  key={idx}
                  data-testid={`evidence-${idx}`}
                  style={{
                    background: "var(--neutral-bg, #f7f7f4)",
                    borderLeft:
                      "4px solid var(--role-coordinator, #6d54ff)",
                    borderRadius: "var(--radius-tile, 12px)",
                    padding:
                      "var(--space-3, 12px) var(--space-4, 16px)",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {chunk.company ?? chunk.ticker ?? "supplier"}
                    {chunk.section ? ` · ${chunk.section}` : ""}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--type-1, 0.85rem)",
                      color: "var(--neutral-fg-soft, #5b5b62)",
                      marginTop: "var(--space-1, 4px)",
                    }}
                  >
                    {chunk.text.slice(0, 320)}
                    {chunk.text.length > 320 ? "…" : ""}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--type-1, 0.85rem)",
                      color: "var(--neutral-fg-soft, #5b5b62)",
                      marginTop: "var(--space-1, 4px)",
                    }}
                  >
                    accession: {chunk.accession ?? "—"} · cik:{" "}
                    {chunk.cik ?? "—"}
                  </div>
                </div>
              ))}
          </div>
        )}

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
