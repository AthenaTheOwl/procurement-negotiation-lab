# dream 2026-W22

Friday narrative from the `learning.dream-orchestrator` role on
the v2 engineering-grade run-evidence rollout. Lookback window:
2026-05-22 through 2026-05-29 inclusive. This file is one of three
load-bearing pieces of the dream artifact (meta.yaml + this file +
candidates/) and is required by `scripts/validate_dreams.py`.

## subject

Retrospect on the v2 engineering-grade run-evidence rollout (Rounds
1-8 + Workflows A/B) as it landed in procurement-negotiation-lab,
and project the next forward bets that pay back the most for their cost.

## retrospect

Six DECs (`DEC-FACTORY-007..012`) walked the factory pipeline from
"emits some JSON" to "emits a typed-payload run-evidence chain that
CI validates, replays, and proves deterministic." DEC-FACTORY-007
named the emission contract and wired the emitter into the pipeline
state machine. DEC-FACTORY-008 added cross-checks (required-for-done
fields and the validator) that fire in `tests.yml`. DEC-FACTORY-009
shipped `scripts/replay_run.py` with the three replay-equivalence
hashes. DEC-FACTORY-010 swapped raw `<path>@<sha>` for portable
`repo://<repo>@<sha>/<path>` URIs and made the systemic
sandbox-SHA off-by-one bug structural via a two-pass emit
(`PENDING` placeholder + `scripts/finalize_sandbox_ref.py`).
DEC-FACTORY-011 stood up `.github/workflows/run-evidence-gates.yml`
to enforce packet generation + packet validation + replay-smoke
against the canonical sample `run-7b662d3f68b1` on every PR.
DEC-FACTORY-012 closed the fresh-vs-fresh gap with a
replay-determinism fixture that hashes a three-field whitelist
across `RERUNS` invocations and writes a failure bundle on
divergence. Voice-lint relaxed `harness` so cross-repo names like
`trace-to-eval-harness` are pronounceable, and the BOM gate plus
`.gitattributes` keeps line-ending drift out of the artifacts.

## what is now load-bearing that was not 30 days ago

- **Typed event payloads.** Every event under
  `ops/event-ledger/run-7b662d3f68b1.jsonl` carries the
  `event.schema.json` typed-payload shape; `tool.call.*` and
  `pipeline.done` payloads went from free-form to schema-strict
  in commit `6614573`.
- **The two-pass emit (`PENDING` placeholder + finalize helper).**
  The off-by-one in `sandbox_image_ref` is now structurally
  unreachable: the emitter writes the placeholder, the commit
  lands, then `scripts/finalize_sandbox_ref.py` rewrites to the
  real SHA. Four agents independently hit and patched this bug
  before the structural fix; the fix retires that whole class.
- **Portable `repo://` URIs.** No more absolute Windows paths in
  artifacts. `workspace_id`, `inputs[].ref`, and
  `sandbox_image_ref` all carry the
  `repo://<repo>@<sha>/<path>` form, with a legacy `<path>@<sha>`
  fallback so old ledgers still replay.
- **The canonical-sample CI gate chain.** Three product-side jobs
  fire on every PR: packet generation (via sibling
  `trace-to-eval-harness` checkout), packet validation, and
  replay-smoke against the recorded sandbox SHA. None carry
  `continue-on-error`.
- **Fresh-vs-fresh determinism.** The W22-Wednesday determinism
  fixture replays the canonical sample `RERUNS=3` times, hashes
  the three replay-equivalence fields (prompt-snapshot,
  tool-schemas-snapshot, gate-results-summary), and writes a
  failure bundle when the hashes diverge.

## what surfaced as a fragile edge

- **`sandbox_image_ref` off-by-one.** The original single-pass
  emit resolved `git rev-parse HEAD` to the *parent* of the commit
  that wrote the sample. Caught by every Round-5 agent. The
  two-pass emit retires it but the legacy `<path>@<sha>` fallback
  is still on the consumer side and is now load-bearing for
  exactly zero records in the lab.
- **The `voice_lint` harness ban.** `BANNED_FAIL` contained
  `harness`, which collided with the cross-repo name
  `trace-to-eval-harness` in DEC-FACTORY-011's prose. Fixed by
  removing the word from the banned list (commit `f2dc5d8`).
  Worth a permanent allowlist-pattern instead of a wordlist edit
  next time.
- **CRLF line endings on Windows hosts.** The BOM check and
  `.gitattributes` keep this from poisoning the canonical sample,
  but the only thing standing between the artifact and a corrupted
  hash on a new Windows contributor is the gate.
- **The PENDING placeholder is a runtime hazard if forgotten.**
  `replay_run._extract_recorded_sha` treats a PENDING placeholder
  as a hard error with an actionable message, but a sample that
  ships without the finalize-helper step would fail loud in
  replay-smoke instead of silently. The hazard is loud, which is
  good; open design point — should the finalize step run inside
  the pipeline itself instead of as a separate operator step?

## modes run

This Friday pass runs three of the eight modes documented in
`dreams/README.md`:

1. **memory_consolidation** — one candidate that names the
   two-pass emit as the canonical pattern future agents should
   walk in already loaded.
2. **architecture_drift_detection** — three candidates: one to
   retire the legacy fallback path that no record exercises, one
   to extend the canonical-sample matrix, and one to cross-link
   to athena-site + trace-to-eval-harness.
3. **adversarial_simulation** — one candidate to chaos-test the
   determinism fixture under clock skew + filesystem reorder.

Skipped modes carry "reopen when" preconditions in `meta.yaml`.

## candidate index

| File | Mode | Shape | Direction |
|---|---|---|---|
| `candidates/memory-001-two-pass-emit-is-now-load-bearing.md` | memory_consolidation | `memory_update` | anchor |
| `candidates/backlog-001-retire-legacy-path-at-sha-fallback.md` | architecture_drift_detection | `backlog_item` | reduce |
| `candidates/backlog-002-extend-canonical-sample-matrix.md` | architecture_drift_detection | `backlog_item` | extend |
| `candidates/test-001-chaos-replay-determinism-under-clock-skew.md` | adversarial_simulation | `test_generation` | audit |
| `candidates/backlog-003-eval-skipped-modes-in-w23.md` | meta_planning | `backlog_item` | extend |
| `candidates/backlog-004-cross-link-trace-to-eval-packet-fixture.md` | architecture_drift_detection | `backlog_item` | cross-link |

Total: 6 candidates across 3 modes plus one meta-planning entry.

## promotion path

All six candidates carry `human_review_required: true`. None
auto-applies. The operator triages and routes promotable items
through the `single-change` workflow under
`.agents/workflows/single-change.yaml`. Three are reduce/extend
backlog items that the engineering role can pick up incrementally;
one is a chaos test that needs the operator to decide whether the
clock-skew variant belongs in CI or in a separate "nightly
deterrence" suite; one is a cross-link to athena-site and
trace-to-eval-harness that the operator must route through a
multi-repo PR.

## next pass

The next weekly pass (2026-W23) should:

- Promote at least the memory candidate (two-pass-emit anchor) so
  the next agent loop walks in with that pattern already loaded.
- Re-evaluate `failure_clustering` against any
  `run-evidence-gates.yml` red runs that accumulate in W23.
- Decide on the legacy `<path>@<sha>` fallback retirement (the
  reduce candidate). If retired, the consumer-side `resolve_uri`
  helpers drop one branch and the migration window closes.
- Consider running the adversarial chaos test once locally before
  promoting it into CI.
