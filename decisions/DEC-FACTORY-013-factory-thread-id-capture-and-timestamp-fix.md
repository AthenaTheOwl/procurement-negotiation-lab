---
id: DEC-FACTORY-013-factory-thread-id-capture-and-timestamp-fix
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-026
date: 2026-05-29
status: approved
reversible: true
amends: DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test
decision: |
  Two coupled changes land together as the smallest first step toward
  addendum-6's managed-task-runtime semantics plus the latent
  per-second timestamp-collision fix Workflow B-Recovery flagged on the
  replay-determinism job.

  1. ``scripts/factory/workers.py::WorkerResult.metadata`` carries six
     addendum-6 fields on every worker invocation (real or stub):
     ``thread_id``, ``run_id``, ``model``, ``duration_ms``,
     ``tokens_input``, ``tokens_output``. The dataclass signature stays
     ``metadata: dict[str, Any]`` so the change is a populated-keys
     contract, not a new typed field set; downstream consumers that
     already read the dict keep working without code changes.

     - ``ClaudeCodeWorker`` tries ``claude --print --output-format json
       "<prompt>"`` first so the real CLI emits a structured payload we
       can parse for IDs + token counts. When the installed CLI rejects
       ``--output-format`` (detected via the stderr substrings
       ``unknown option`` / ``unrecognized option`` / ``invalid option``
       coupled with the literal ``--output-format``), the worker falls
       back to plain ``claude --print "<prompt>"``. The fallback path
       still routes through ``_run_cli`` so the metadata contract
       holds; missing IDs synthesize as ``claude-cli-<uuid12>`` and
       ``claude-run-<uuid12>``.
     - ``CodexWorker`` mirrors the same pattern with ``codex exec
       --output-format json`` and a ``codex exec`` fallback;
       synthesized IDs prefix with ``codex-``.
     - ``StubWorker`` pins ``tokens_input`` and ``tokens_output`` to 0
       (not ``None``) so dry-run metadata carries concrete ints
       downstream evidence can assert on. Seeded StubWorkers continue
       to produce deterministic ``thread_id`` and ``run_id`` so tests
       can pin the synthesized IDs.

     The token-count extractor handles both Anthropic
     (``input_tokens`` / ``output_tokens``) and OpenAI
     (``prompt_tokens`` / ``completion_tokens``) usage-block shapes
     under either a top-level ``usage`` key or a nested
     ``response.usage`` / ``message.usage`` path. Top-level fallback
     covers the rare CLI that flattens the usage block.

  2. ``scripts/replay_run.py::_now_iso_filename`` switches from per-
     second resolution (``%Y-%m-%dT%H-%M-%SZ``) to microsecond
     resolution. The new format is
     ``f"{now:%Y-%m-%dT%H-%M-%S}.{now.microsecond:06d}Z"`` built from a
     single ``datetime.now(UTC)`` call so the seconds and microseconds
     are atomic. The microsecond suffix closes the collision window
     the per-second format left open: two back-to-back replays inside
     the same wall-clock second wrote to the same ledger filename and
     the second invocation appended to the first run's ledger. The
     replay-determinism test landed green only because CI setup
     happened to cross a second boundary between ``RERUNS`` calls.

     Glob patterns in ``tests/factory/test_replay_run.py`` and
     ``tests/factory/test_replay_determinism.py`` use
     ``replay-{run_id}-*.jsonl`` so the format change is transparent
     to consumers. The committed pre-fix ledger filename
     ``replay-run-16a7bf515611-2026-05-28T12-23-12Z.jsonl`` stays
     valid; the glob accepts both shapes.

  Both changes are reversible and additive on the contract surface.
  Checkpoint, interrupt, and ``--resume`` defer to a future commit per
  the deferred addendum-6 scope.
alternatives:
  - label: append the replay_event_id UUID to the ledger filename
      instead of switching to microsecond resolution
    rejected_because: |
      The chip-supply-chain-map pattern (DEC-FIN-008) appends the
      replay_event_id to the filename. That works, but it requires
      threading the UUID through the ledger-path construction before
      the replay event is created (the current code creates the
      replay_event_id after the ledger path). Microsecond resolution
      is a one-line change in ``_now_iso_filename`` with no caller
      refactor, matches the supplier-risk-rag-agent pattern
      (DEC-EVL-011), and preserves the human-scannable ISO-like
      filename for ops debugging. Both options close the collision;
      microseconds win on minimal blast radius.
  - label: defer the addendum-6 emission slice and ship the
      timestamp fix alone
    rejected_because: |
      The timestamp fix is one line in one helper. Shipping it
      alone burns a commit on a one-line patch and leaves
      addendum-6 stalled behind it. The emission slice
      (WorkerResult metadata extension + Claude/Codex JSON output
      flag + token capture) is small enough to land together in a
      single coherent DEC; both changes touch the same factory-run
      contract surface (run-evidence emission downstream of worker
      output) so binding them under one decision matches the
      contract boundary.
  - label: ship the full addendum-6 (thread_id + checkpoint +
      interrupt + --resume) in one commit
    rejected_because: |
      Addendum-6's original portfolio plan specced a managed-task-
      runtime upgrade with checkpoint/interrupt/--resume. That is
      multiple specs of work and would conflate three failure modes
      (emission contract, checkpoint serialization, resume CLI) in
      one DEC. The smallest coherent slice is the emission slice:
      capture the IDs we need for downstream correlation now; ship
      checkpoint/interrupt/resume when the contracts are
      independently typed in their own DECs. The thread_id surface
      is the prerequisite the deferred slices will reference.
  - label: refactor WorkerResult into a TypedDict / pydantic model
    rejected_because: |
      The dataclass signature ``metadata: dict[str, Any]`` is the
      contract today. Tightening it into a TypedDict would lock the
      key set and break every call site that already stashes
      additional debugging hints under unreserved keys. The
      addendum-6 contract is "these six keys MUST be populated",
      not "no other keys may be populated". A populated-keys
      contract documented in WorkerResult's docstring (plus the
      typed accessors that return ``None`` for missing keys) covers
      the producer side without forcing every consumer to migrate.
rationale: |
  This DEC amends DEC-FACTORY-012. DEC-FACTORY-007 named the
  emission contract, DEC-FACTORY-008 added cross-checks,
  DEC-FACTORY-009 shipped the replay command, DEC-FACTORY-010 made
  the URI scheme portable, DEC-FACTORY-011 wired the canonical sample
  into CI, and DEC-FACTORY-012 installed the replay-determinism
  fixture. The remaining gaps:

  - The determinism fixture replays back-to-back ``RERUNS`` times. The
    per-second ledger filename meant any two replays inside the same
    second wrote to the same file. The test stayed green by accident:
    CI provisioning happened to cross a second boundary between
    invocations. The Workflow B-Recovery audit named this as a latent
    bug; closing it before it bites someone hand-running the fixture
    on a fast machine is the conservative move.
  - Addendum-6's portfolio plan specced a managed-task-runtime upgrade
    that captures ``thread_id`` (and friends) on every worker
    invocation so downstream evidence (Run records, replay reports,
    trace-to-eval packets) can correlate a run to the live CLI session
    that produced it. The full upgrade (checkpoint, interrupt,
    ``--resume``) is multiple specs of work; the emission slice
    (capture ``thread_id`` + ``run_id`` + ``model`` + ``duration_ms``
    + token counts) is the prerequisite. Shipping it now means the
    deferred slices can reference a populated contract surface instead
    of building it in their own DECs.

  Binding the two changes under one DEC matches the contract boundary:
  both touch the factory-run evidence surface (worker output ->
  emitted metadata -> ledger filename). Splitting them across two
  DECs would force a downstream reader to chase two separate
  decisions to understand one factory-run change.

  Trade-off: WorkerResult.metadata now carries six fields whose
  values are sometimes ``None`` (real CLI did not surface them) and
  sometimes 0 (StubWorker in dry-run). Downstream consumers that
  treat 0 and None as different must continue to do so; the typed
  accessors on WorkerResult return ``None`` for missing keys and a
  concrete int for present-but-zero values so the distinction stays
  visible at the API boundary.

  Reversibility is high. Reverting the timestamp change is a one-line
  edit; reverting the WorkerResult extension drops the new metadata
  keys (consumers reading them tolerate ``None``). The dataclass
  signature is unchanged, so the rollback does not break any caller
  that already constructs a ``WorkerResult``.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md
  - kind: doc
    ref: scripts/factory/workers.py
  - kind: doc
    ref: scripts/replay_run.py
  - kind: doc
    ref: tests/factory/test_workers.py
  - kind: doc
    ref: tests/factory/test_cli_metadata.py
  - kind: doc
    ref: tests/factory/test_replay_run.py
rollback: |
  Revert the ``_now_iso_filename`` change in
  ``scripts/replay_run.py`` to the per-second form
  ``datetime.now(UTC).strftime("%Y-%m-%dT%H-%M-%SZ")``. Revert the
  WorkerResult metadata extension in ``scripts/factory/workers.py``:
  drop the six-key population in ``_run_cli`` /
  ``ClaudeCodeWorker.run`` / ``CodexWorker.run`` / ``StubWorker.run``,
  drop the typed accessors for ``model`` / ``duration_ms`` /
  ``tokens_input`` / ``tokens_output``, and drop the
  ``--output-format json`` first-attempt + fallback paths. Drop the
  new test cases (``test_now_iso_filename_is_microsecond_resolution``,
  ``test_stub_worker_metadata_carries_addendum6_keys``,
  ``test_stub_worker_seeded_ids_are_deterministic``,
  ``test_worker_result_accessors_handle_missing_metadata``,
  ``test_claude_worker_missing_cli_still_populates_thread_id``,
  ``test_codex_worker_missing_cli_still_populates_thread_id``,
  ``test_extract_json_ids_captures_anthropic_usage_block``,
  ``test_extract_json_ids_captures_openai_usage_block``,
  ``test_extract_json_ids_captures_nested_response_usage``,
  ``test_looks_like_unsupported_flag_recognizes_common_phrasings``).
  Drop the ``R-FACTORY-RUN-EVIDENCE-026..028`` rows from
  ``requirements.md`` and ``traceability.md`` plus the matching task
  entries from ``tasks.md``. The DEC-FACTORY-012 chain remains
  untouched.
owner: control.coordinator
---

## decision

Two coupled changes land together as the smallest first step toward
addendum-6's managed-task-runtime semantics plus the latent
per-second timestamp-collision fix Workflow B-Recovery flagged on
the replay-determinism job.

First, ``scripts/factory/workers.py::WorkerResult.metadata`` carries
six addendum-6 fields on every worker invocation: ``thread_id``,
``run_id``, ``model``, ``duration_ms``, ``tokens_input``,
``tokens_output``. ``ClaudeCodeWorker`` tries ``claude --print
--output-format json`` first and falls back to plain ``--print`` when
the CLI does not support the flag. ``CodexWorker`` mirrors the
pattern with ``codex exec --output-format json``. Missing IDs
synthesize as ``<label>-cli-<uuid12>`` and ``<label>-run-<uuid12>``
so the contract holds even when the real CLI is silent. ``StubWorker``
pins ``tokens_input`` and ``tokens_output`` to 0 (not ``None``) so
dry-run metadata carries concrete ints; seeded stubs produce
deterministic IDs.

Second, ``scripts/replay_run.py::_now_iso_filename`` switches to
microsecond resolution
(``f"{now:%Y-%m-%dT%H-%M-%S}.{now.microsecond:06d}Z"``) built from a
single ``datetime.now(UTC)`` call so two back-to-back replays inside
the same wall-clock second yield distinct ledger filenames.

Checkpoint, interrupt, and ``--resume`` defer to a future commit per
the deferred addendum-6 scope.

## alternatives

- Append ``replay_event_id`` UUID to the ledger filename instead of
  microsecond resolution: rejected because microsecond resolution is
  a one-line patch with no caller refactor and matches the
  supplier-risk-rag-agent pattern locked in DEC-EVL-011.
- Defer the addendum-6 emission slice and ship the timestamp fix
  alone: rejected because the emission slice is small enough to land
  together and both changes touch the same factory-run contract
  surface; one DEC matches the contract boundary.
- Ship the full addendum-6 (thread_id + checkpoint + interrupt +
  ``--resume``) in one commit: rejected because that is multiple
  specs of work; the smallest coherent slice is the emission slice,
  with the deferred slices referencing a populated contract surface.
- Refactor ``WorkerResult`` into a TypedDict or pydantic model:
  rejected because the dataclass signature ``metadata: dict[str,
  Any]`` is the existing contract; tightening it would break every
  call site that stashes additional debugging hints. A populated-
  keys contract documented in the docstring (plus typed accessors)
  covers the producer side without forcing consumers to migrate.

## rationale

This DEC amends DEC-FACTORY-012. The determinism fixture replays
back-to-back ``RERUNS`` times; the per-second ledger filename meant
any two replays inside the same second wrote to the same file. The
test stayed green by accident: CI provisioning crossed a second
boundary between invocations. The Workflow B-Recovery audit named
this as a latent bug; closing it before it bites a fast-machine
hand-run is the conservative move.

Addendum-6's portfolio plan specced a managed-task-runtime upgrade
that captures ``thread_id`` on every worker invocation so downstream
evidence (Run records, replay reports, trace-to-eval packets) can
correlate a run to the live CLI session that produced it. The full
upgrade is multiple specs of work; the emission slice (capture
``thread_id`` + ``run_id`` + ``model`` + ``duration_ms`` + token
counts) is the prerequisite. Shipping it now means deferred slices
can reference a populated contract surface instead of building it in
their own DECs.

Binding the two changes under one DEC matches the contract boundary:
both touch the factory-run evidence surface (worker output ->
emitted metadata -> ledger filename). Splitting them across two DECs
would force a downstream reader to chase two separate decisions to
understand one factory-run change.

Trade-off: ``WorkerResult.metadata`` now carries six fields whose
values are sometimes ``None`` (real CLI did not surface them) and
sometimes 0 (StubWorker dry-run). Downstream consumers that treat 0
and ``None`` as different keep doing so; the typed accessors return
``None`` for missing keys and a concrete int for present-but-zero
values so the distinction stays visible.

Reversibility is high. The timestamp revert is a one-line edit; the
WorkerResult extension drop leaves the dataclass signature
unchanged, so the rollback does not break any caller that already
constructs a ``WorkerResult``.

## evidence

- ``specs/0009-factory-dev-control-plane/requirements.md`` adds
  ``R-FACTORY-RUN-EVIDENCE-026..028``.
- ``decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md``
  is the parent DEC that installed the determinism fixture.
- ``scripts/factory/workers.py`` carries the WorkerResult metadata
  extension and the ``--output-format json`` first-attempt logic.
- ``scripts/replay_run.py`` carries the microsecond-resolution
  ``_now_iso_filename``.
- ``tests/factory/test_workers.py`` covers stub-metadata contract
  keys, seeded determinism, and no-CLI synthesis.
- ``tests/factory/test_cli_metadata.py`` covers Anthropic + OpenAI
  usage-block parsing and the unsupported-flag detector.
- ``tests/factory/test_replay_run.py`` locks the microsecond
  timestamp format.

## rollback

Revert ``_now_iso_filename`` to the per-second form. Revert the
WorkerResult metadata extension: drop the six-key population in
``_run_cli``, ``ClaudeCodeWorker.run``, ``CodexWorker.run``, and
``StubWorker.run``; drop the typed accessors for ``model``,
``duration_ms``, ``tokens_input``, ``tokens_output``; drop the
``--output-format json`` first-attempt and fallback paths. Drop the
new test cases. Drop the ``R-FACTORY-RUN-EVIDENCE-026..028`` rows
from ``requirements.md`` and ``traceability.md`` plus the matching
task entries from ``tasks.md``. The DEC-FACTORY-012 chain remains
untouched.

## coverage

This DEC resolves the following requirements added to spec
``0009-factory-dev-control-plane``:

- ``R-FACTORY-RUN-EVIDENCE-026`` ``WorkerResult.metadata`` carries
  ``thread_id``, ``run_id``, ``model``, ``duration_ms``,
  ``tokens_input``, and ``tokens_output`` on every worker
  invocation; missing IDs synthesize as ``<label>-cli-<uuid12>`` and
  ``<label>-run-<uuid12>`` so the contract holds even when the real
  CLI is silent or absent from PATH.
- ``R-FACTORY-RUN-EVIDENCE-027`` ``ClaudeCodeWorker`` and
  ``CodexWorker`` try ``--output-format json`` first and fall back
  to plain ``--print`` / ``exec`` when the installed CLI rejects
  the flag; ``StubWorker`` accepts a ``seed`` parameter so
  synthesized IDs are deterministic for tests.
- ``R-FACTORY-RUN-EVIDENCE-028`` ``scripts/replay_run.py::
  _now_iso_filename`` uses microsecond resolution so back-to-back
  replays inside the same wall-clock second never collide on the
  ledger filename; the format string is
  ``f"{now:%Y-%m-%dT%H-%M-%S}.{now.microsecond:06d}Z"`` built from
  a single ``datetime.now(UTC)`` call.
