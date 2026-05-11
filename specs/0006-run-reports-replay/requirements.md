# requirements: run reports, replay, and shareable evidence

## Scope

Turn each Lab session into a portable, replayable, shareable artifact.
A "run report" captures the full trace: scenario, parameters, authored
formulas, algorithm comparison results, frontier plans, audit-mode results,
and metadata. The user can copy it as JSON (reproducibility) or markdown
(sharing in Slack/PR/blog), and can replay it by pasting the JSON back
into the lab.

This is Codex's earlier "next-highest-leverage" recommendation, deferred
from spec 0003. Without it, the lab is a single-session toy. With it, the
lab becomes a learning artifact a user can hand to a colleague, link in a
blog, or use as a teaching aid.

## Requirements

### R-REPORT-001: one-click JSON export

WHEN a visitor clicks "Export run report" after running a Lab session,
THE SYSTEM SHALL serialize the full session state as valid JSON to the
clipboard.

Acceptance:
- "Export run report" button visible after at least one algorithm has run.
- Click writes JSON to clipboard via `navigator.clipboard.writeText`.
- JSON includes: timestamp, scenario (full, including custom formulas),
  spec 0004 parameters (α, reliability, ε, audit mode), algorithm runs,
  frontier plans, decoy audit results, computed metrics (coordination gap,
  best non-oracle mechanism, transfer ledger), `schemaVersion`.
- The JSON is valid per `runReportSchema.ts` (see R-REPORT-005).

### R-REPORT-002: one-click markdown export

WHEN a visitor clicks "Export as markdown" after a Lab session, THE SYSTEM
SHALL render a shareable summary in markdown.

Acceptance:
- Markdown includes: scenario name + summary, agent setup, mechanism
  results table, coordination gap headline, "what this teaches"
  templated paragraph, footer link to the lab + report JSON.
- Output is < 80 lines for a typical run.
- Suitable for paste into Slack / GitHub PR / blog draft.
- Includes a "↓ reproduce this run" section with the full JSON.

### R-REPORT-003: replay from JSON

WHEN a visitor pastes a run report JSON into the "Replay run" input,
THE SYSTEM SHALL validate it, load the scenario + parameters + authored
formulas, and re-run the simulation to produce the same final results.

Acceptance:
- "Replay" input visible on Lab Arena.
- Paste valid JSON → all fields populate → algorithms re-run → results
  identical to the original (deterministic).
- Paste invalid JSON → friendly error with the field path.
- Replay-from-export round-trip: export → clear lab → replay → same
  resulting state.

### R-REPORT-004: run ledger in browser storage

WHEN the visitor completes a Lab session, THE SYSTEM SHALL save the run
report to `localStorage` with a unique id and a human-readable label.

Acceptance:
- Run ledger UI visible on Lab Arena ("Past runs" panel).
- Shows last 20 runs with timestamp + label + one-line summary.
- Click a past run → loads it back into the Lab.
- Click delete → removes from `localStorage`.
- Storage key is namespaced (`procurement-lab.runs.*`).

### R-REPORT-005: screenshot-safe summary view

WHEN a visitor opens a run report in summary view, THE SYSTEM SHALL render
a portfolio-shareable summary page suitable for screenshot.

Acceptance:
- Summary view accessible at `/report/[id]` (or via "View summary" button).
- Page renders in a clean fixed layout (no scrolling required for the
  main story).
- Sections: scenario card, agent setup, coordination gap headline,
  mechanism comparison sparkline, citation footer.
- Screenshot at 1200×800 produces a complete, legible image.
- No interactive controls in summary view — it's read-only.

### R-SPEC-006: spec discipline

Standard traceability discipline.

Acceptance:
- Every R-REPORT-* maps to tasks and acceptance.
- `traceability.md` kept current.
- `research.md` cites the relevant references.

## Out of scope

- Server-side report storage (DB, S3). Storage is `localStorage` only.
- Multi-user sharing (Notion/Drive/Sheets). Markdown is the share format.
- Versioned report migration (if schema changes, old reports may break
  replay; that's acceptable for v0).
- LLM-generated "what this teaches" copy. Templated only.
- PDF export. Markdown + screenshot suffice.
