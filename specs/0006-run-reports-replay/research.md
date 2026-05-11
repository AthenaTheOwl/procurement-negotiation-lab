# research: run reports, replay, and shareable evidence

## Primary trigger

**Codex's earlier "next-highest-leverage" recommendation** during the
spec 0003 cycle:

> "Add 'Export run report' — This is the highest-leverage next product
> feature. After someone configures agents/scenario/mechanism, the app
> should generate a concise report: scenario preset + custom knobs,
> buyer/supplier archetypes, coordination gap, best mechanism, privacy
> exposure, CBT/no-worse-off result, 'what this teaches', JSON export
> for reproducibility. That turns the lab from 'interactive toy' into a
> shareable learning artifact."

This spec implements that recommendation.

## Schema design

**zod.** https://zod.dev/

Shapes:
- Runtime validation + TypeScript inference for the run report shape.
- Field-path error messages.

**JSON Schema** (referenced as context, not used directly):
https://json-schema.org/

## Reproducibility

**Software Engineering at Google.** *Reproducible Research* chapter.

Shapes:
- The principle that "this run can be re-created exactly from its
  artifact." Reports are deterministic; replay must yield identical
  metrics.

**The Twelve-Factor App.** *XII. Admin processes.* https://12factor.net/admin-processes

Shapes:
- The framing that one-off ops (export, replay) should run in the same
  environment as the main app. Both export and replay live in the same
  React app, not a separate tool.

## Sharing patterns

**Observable notebooks.** https://observablehq.com/

Shapes:
- URL-encoded JSON for shareability (`?json=<encoded>`).
- Markdown-friendly screenshot views.

**Streamlit Share / Hugging Face Spaces.** Both surface "share this run"
features for ML demos.

Shapes:
- The single-URL share pattern (so a tweet or Slack message can include
  the full run state).

## Browser storage

**localStorage**. MDN:
https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

Shapes:
- The simplest persistent storage available client-side.
- Limits (~5-10 MB depending on browser) easily fit 20 typical reports.

## Spec dependencies

- Spec 0003 (Bergemann arc) — Arc final step can also export a report
- Spec 0004 (operational refinements) — α, reliability, ε, audit mode all
  captured in the report
- Spec 0005 (multi-party) — when 0005 ships, the report shape extends to
  N participants

## What this spec deliberately does NOT cite

- Server-side report storage solutions (S3, DynamoDB, etc.) — out of scope.
- LLM-generated narrative — templates only.
- PDF rendering libraries — markdown + screenshot suffice.
