---
id: DEC-FACTORY-004-real-cli-ids-win-tagged-synthetic-fallback
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-004
date: 2026-05-24
status: approved
reversible: true
decision: |
  Parse worker CLI output for thread, run, session, conversation, and
  model metadata in both JSON-object and JSONL line shapes, plus
  nested `thread.id`, `session.id`, and `response.model` paths. When
  a real ID appears in stdout or stderr, capture it onto the
  `WorkerResult.metadata` map and onto the `tasks.last_thread_id` /
  `tasks.last_run_id` columns. Only when no real ID is present,
  synthesize a tagged fallback (`<label>-cli-<hex>`,
  `<label>-run-<hex>`) so downstream code can rely on the field
  always being non-null.
alternatives:
  - label: always synthesize IDs and ignore CLI output
    rejected_because: |
      Synthetic-only IDs erase the link between the factory's event
      log and the real Claude/Codex thread the operator can inspect
      in the upstream CLI. The whole point of capturing `thread_id`
      and `run_id` is to make a factory event joinable to the
      provider's own trace; synthetic-only mode breaks that join.
  - label: require a strict JSON-only output shape from every worker
    rejected_because: |
      Real CLIs vary. Some emit one JSON object on stdout, some emit
      JSONL events, some only mention IDs in a stderr log line. A
      strict-JSON rule means most real outputs fail to parse and the
      factory loses metadata it could have captured. The two-tier
      regex + JSON parser is conservative on the input shape and
      permissive on the carrier.
  - label: depend on the provider SDK to surface IDs out of band
    rejected_because: |
      The factory invokes provider CLIs as subprocesses, not via the
      provider SDKs in-process. Adopting a per-provider SDK to pull
      IDs out of band would couple the factory to the SDK release
      cadence and to a network round-trip that the subprocess output
      already carries for free.
rationale: |
  Real CLIs vary across shapes (one JSON object, JSONL events,
  stderr log lines, nested paths). A two-tier parser (JSON first,
  regex fallback) captures the IDs that appear in real output
  without rejecting outputs that do not match a strict schema.
  Tagged synthetic IDs make it obvious in the event log which IDs
  are real and which the factory made up, so an operator inspecting
  a trace can tell whether to chase the ID into the provider's
  surface.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: doc
    ref: scripts/factory/workers.py
  - kind: doc
    ref: scripts/factory/state.py
  - kind: doc
    ref: specs/0009-factory-dev-control-plane/research.md
rollback: |
  Replace `_extract_json_ids` and `_extract_json_ids_from_obj` in
  `scripts/factory/workers.py` with a no-op that always synthesizes
  tagged IDs. The `last_thread_id` and `last_run_id` columns on the
  `tasks` table stay populated by the synthetic-only path; only the
  joinability with provider-side traces goes away. The regex fallback
  in `_run_cli` stays because synthesized IDs flow through the same
  code path.
owner: platform
---

## decision

Parse worker CLI output for thread, run, session, conversation, and
model metadata in both JSON-object and JSONL line shapes, plus nested
`thread.id`, `session.id`, and `response.model` paths. When a real ID
appears in stdout or stderr, capture it onto `WorkerResult.metadata`
and onto the `tasks.last_thread_id` / `tasks.last_run_id` columns.
Only when no real ID is present, synthesize a tagged fallback so
downstream code can rely on the field always being non-null.

## alternatives

- Always synthesize IDs and ignore CLI output — breaks the join from
  factory events to the provider's own trace.
- Require strict JSON-only output from every worker — most real
  outputs fail to parse and metadata gets lost.
- Depend on the provider SDK to surface IDs out of band — couples the
  factory to the SDK release cadence.

## rationale

Real CLIs vary across shapes (one JSON object, JSONL events, stderr
log lines, nested paths). A two-tier parser (JSON first, regex
fallback) captures the IDs that appear in real output without rejecting
outputs that do not match a strict schema. Tagged synthetic IDs make
it obvious in the event log which IDs are real and which the factory
made up, so an operator inspecting a trace can tell whether to chase
the ID into the provider's surface or not.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` — R-FACTORY-004
  acceptance bullets.
- `scripts/factory/workers.py` — `_extract_json_ids`,
  `_extract_json_ids_from_obj`, `_THREAD_RE`, `_RUN_RE`, and the
  tagged-fallback path in `_run_cli`.
- `scripts/factory/state.py` — the `tasks.last_thread_id` and
  `tasks.last_run_id` columns plus the additive migration that added
  them in 0.2.x.

## rollback

Replace `_extract_json_ids` and `_extract_json_ids_from_obj` in
`scripts/factory/workers.py` with a no-op that always synthesizes
tagged IDs. The `last_thread_id` and `last_run_id` columns stay
populated by the synthetic-only path; only the joinability with
provider-side traces goes away.
