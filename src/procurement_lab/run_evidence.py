"""Run-evidence emitter for the factory pipeline.

This module is the source-of-truth emitter for two artifact types:

- Append-only Event records written as JSONL under ``ops/event-ledger/``.
- Final Run records written as JSON under ``ops/run-records/``.

Both records conform to the cross-repo CDCP schemas mirrored in
``ops/schemas-cache/event.schema.json`` and
``ops/schemas-cache/run.schema.json`` (athena-site is the source of truth).
The amended Run schema carries six replay-equivalence fields:
``prompt_snapshot_hash``, ``tool_schemas_snapshot_hash``, ``determinism``,
``checkpoint_ref``, ``sandbox_image_ref``, and ``gate_results_summary``.

Field-population rules followed here:

- ``prompt_snapshot_hash``: SHA-256 of the canonicalized prompt content for
  the run (task YAML body plus worker system prompt). Always populated.
- ``tool_schemas_snapshot_hash``: SHA-256 of the canonicalized list of
  available workers plus registered gate names. Always populated.
- ``determinism``: omitted. The factory shells out to ``claude`` and
  ``codex`` CLIs that do not expose seed/temperature/top_p knobs, so there
  is nothing to record. When the runtime grows determinism controls (for
  example a managed model API) this helper should populate the field.
- ``checkpoint_ref``: omitted. The factory has no managed-task-runtime
  checkpoint store yet. The addendum-6 artifact-store work owns that slice.
- ``sandbox_image_ref``: populated as ``<worktree-path>@<worktree-head-sha>``
  when a worktree exists. The factory uses git worktrees per task so this
  ref is derivable today.
- ``gate_results_summary``: computed by scanning the emitted ``gate.check.*``
  events for the run. The aggregator splits names into ``gates_passed`` and
  ``gates_failed`` and sets ``all_passed`` only when ``gates_failed`` is
  empty.

The validator gate at ``scripts/validate_run_evidence.py`` walks both
directories and checks every record against the cached schemas.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess  # nosec B404
import uuid
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# ---------------------------------------------------- repo:// URI grammar

# Portable URI scheme for cross-repo references. The grammar lands in
# athena-site DEC-CDCP-014; this repo's emitter switches to repo:// /
# artifact:// per DEC-FACTORY-010 so packet consumers no longer carry
# absolute Windows paths in run-evidence artifacts.
REPO_NAME = "procurement-negotiation-lab"
SANDBOX_PENDING_PLACEHOLDER = f"repo://{REPO_NAME}@PENDING/"

_REPO_URI_RE = re.compile(
    r"^repo://(?P<repo>[a-z][a-z0-9-]*)@(?P<sha>[a-f0-9]{40})/(?P<path>.*)$"
)
_REPO_URI_PENDING_RE = re.compile(
    r"^repo://(?P<repo>[a-z][a-z0-9-]*)@PENDING/(?P<path>.*)$"
)
_ARTIFACT_URI_RE = re.compile(
    r"^artifact://(?P<repo>[a-z][a-z0-9-]*)/(?P<id>.+)$"
)


def build_repo_uri(sha: str, rel_path: str, *, repo_name: str = REPO_NAME) -> str:
    """Build a ``repo://<repo>@<sha>/<rel-path>`` URI.

    ``rel_path`` is a POSIX path inside the repo (no leading slash); pass
    an empty string for the repo root. The 40-char hex SHA is required so
    consumers can pin the file at a specific commit.
    """
    if not re.match(r"^[a-f0-9]{40}$", sha):
        raise ValueError(f"build_repo_uri: invalid 40-char SHA: {sha!r}")
    cleaned = rel_path.replace("\\", "/").lstrip("/")
    return f"repo://{repo_name}@{sha}/{cleaned}"


def build_artifact_uri(artifact_id: str, *, repo_name: str = REPO_NAME) -> str:
    """Build an ``artifact://<repo>/<id>`` URI for a logical artifact."""
    if not artifact_id:
        raise ValueError("build_artifact_uri: artifact_id must be non-empty")
    return f"artifact://{repo_name}/{artifact_id}"


def to_relative_repo_path(
    path: str | Path, *, repo_root: Path | None = None
) -> str:
    """Strip ``repo_root`` from an absolute path; return POSIX-form relative path.

    If ``path`` is already relative, it is returned in POSIX form. If it
    falls outside the repo root, the absolute POSIX path is returned
    unchanged (callers should treat that as a sentinel and not wrap it in
    a repo:// URI).
    """
    p = Path(path)
    root = (repo_root or _default_repo_root()).resolve()
    try:
        candidate = p.resolve() if p.is_absolute() else (root / p).resolve()
        return candidate.relative_to(root).as_posix()
    except (OSError, ValueError):
        return p.as_posix()


def _default_repo_root() -> Path:
    """Default repo root used when callers do not pass an explicit one."""
    return Path(__file__).resolve().parents[2]

# ----------------------------------------------------------------- canonical hashing


def canonicalize_prompt(
    prompt_text: str, system_prompt: str | None = None
) -> str:
    """Return a stable canonical form of prompt content.

    The output is a JSON-serialized mapping with sorted keys so byte-equal
    inputs always produce byte-equal canonical strings. This is the input
    to :func:`compute_sha256` for ``prompt_snapshot_hash``.

    Newlines inside the prompt body are preserved as-is. Callers that want
    line-ending normalization should strip CRLFs before calling.
    """
    payload: dict[str, str] = {"prompt": prompt_text or ""}
    if system_prompt is not None:
        payload["system_prompt"] = system_prompt
    return json.dumps(payload, sort_keys=True, ensure_ascii=False)


def canonicalize_tool_surface(
    workers: Sequence[str], gates: Sequence[str]
) -> str:
    """Return a stable canonical form of the tool/gate surface.

    Workers are the named factory CLI workers available to the run
    (for example ``["claude_code", "codex", "stub"]``). Gates are the
    display names of the gate commands the task carries.

    Both lists are sorted before serialization so the resulting hash is
    insensitive to declaration order.
    """
    payload = {
        "workers": sorted(set(workers)),
        "gates": sorted(set(gates)),
    }
    return json.dumps(payload, sort_keys=True, ensure_ascii=False)


def compute_sha256(canonical: str) -> str:
    """Return the lowercase hex SHA-256 digest of ``canonical``.

    The Run schema requires hashes to match ``^[a-f0-9]{64}$`` so the digest
    is returned without the ``sha256:`` prefix.
    """
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# ----------------------------------------------------------------- worktree ref


def derive_sandbox_image_ref(
    worktree_path: Path | None, *, repo_name: str = REPO_NAME
) -> str | None:
    """Return a ``repo://<repo>@<sha>/`` URI for a real worktree, else None.

    DEC-FACTORY-010 migrates the emitter from the legacy
    ``<worktree-path>@<sha>`` form to the portable repo:// URI defined in
    DEC-CDCP-014. The trailing slash is required by the grammar's
    ``repo://<repo>@<sha>/<rel-path>`` shape; the relative path component
    is empty because ``sandbox_image_ref`` points at the repo root.

    A ``None`` return tells the caller to omit ``sandbox_image_ref`` from
    the Run record entirely. The schema treats absence as "not derivable".

    The ``<sha>`` recorded here is the worktree HEAD AT EMIT TIME. The
    systemic off-by-one fix in DEC-FACTORY-010 means the pipeline writes
    ``SANDBOX_PENDING_PLACEHOLDER`` instead and a post-commit step
    rewrites the Run record after the sample-containing commit lands.
    """
    if worktree_path is None:
        return None
    worktree = Path(worktree_path).expanduser()
    if not worktree.exists():
        return None
    try:
        result = subprocess.run(  # nosec B603 B607
            ["git", "-C", str(worktree), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    head = result.stdout.strip()
    if result.returncode != 0 or not head:
        return None
    return build_repo_uri(head, "", repo_name=repo_name)


def resolve_uri(
    uri: str, portfolio_root: Path | None = None
) -> Path | None:
    """Resolve a repo:// URI to a local filesystem path.

    Returns:
        - For ``repo://<repo>@<sha>/<path>``: ``portfolio_root/<repo>/<path>``.
          The ``<sha>`` is advisory metadata; replay's HEAD-strict check
          verifies it separately.
        - For ``artifact://<repo>/<id>``: ``None``. Artifact URIs are
          logical refs, not file paths.
        - For anything else (legacy local path, malformed URI): the input
          parsed as a ``Path``. Backward compatibility with pre-DEC-CDCP-014
          run-evidence records keeps the validator and replay tolerant of
          mixed-form ledgers during the migration window.
    """
    if portfolio_root is None:
        portfolio_root = Path("e:/claude_code/random-apps")
    match = _REPO_URI_RE.match(uri)
    if match:
        path = match.group("path")
        return portfolio_root / match.group("repo") / path
    if _ARTIFACT_URI_RE.match(uri):
        return None
    return Path(uri)


def extract_repo_uri_sha(uri: str) -> str | None:
    """Return the 40-char SHA from a ``repo://<repo>@<sha>/...`` URI.

    Returns ``None`` for ``PENDING`` placeholders, ``artifact://`` URIs,
    legacy ``<path>@<sha>`` refs, or malformed input. Callers that need
    HEAD-strict verification use this to drive the comparison.
    """
    match = _REPO_URI_RE.match(uri)
    if match:
        return match.group("sha")
    return None


def is_repo_uri(uri: str) -> bool:
    """Return True if ``uri`` matches the repo:// grammar (including PENDING)."""
    return bool(_REPO_URI_RE.match(uri) or _REPO_URI_PENDING_RE.match(uri))


# ----------------------------------------------------------------- schema cache loader

_SCHEMA_CACHE: dict[str, Mapping[str, Any]] = {}


def _schemas_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "ops" / "schemas-cache"


def _load_schema(name: str) -> Mapping[str, Any]:
    cached = _SCHEMA_CACHE.get(name)
    if cached is not None:
        return cached
    path = _schemas_dir() / name
    if not path.is_file():
        raise FileNotFoundError(
            f"schema cache missing: {path}. Run scripts/check_schema_cache_freshness.py."
        )
    schema = json.loads(path.read_text(encoding="utf-8"))
    _SCHEMA_CACHE[name] = schema
    return schema  # type: ignore[no-any-return]


def _validate(record: Mapping[str, Any], schema_name: str) -> None:
    try:
        import jsonschema  # type: ignore[import-untyped]
    except ImportError as exc:
        raise SystemExit(
            "run_evidence: jsonschema is required. "
            "Install with `pip install jsonschema>=4.21`."
        ) from exc
    schema = _load_schema(schema_name)
    validator_cls = jsonschema.validators.validator_for(schema)
    validator = validator_cls(schema)
    errors = sorted(validator.iter_errors(record), key=lambda e: e.path)
    if errors:
        details = "; ".join(
            f"{'/'.join(str(p) for p in err.path) or '<root>'}: {err.message}"
            for err in errors
        )
        raise ValueError(
            f"run_evidence record does not validate against {schema_name}: {details}"
        )


# ----------------------------------------------------------------- emitters


def emit_event(event: Mapping[str, Any], ledger_path: Path) -> None:
    """Append-only writer for one Event record.

    Validates ``event`` against ``event.schema.json`` before writing. Writes
    a single canonical JSON line followed by a newline so the file remains
    valid JSONL.
    """
    _validate(event, "event.schema.json")
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(event, sort_keys=True, ensure_ascii=False)
    with ledger_path.open("a", encoding="utf-8") as handle:
        handle.write(line)
        handle.write("\n")


def emit_run(run: Mapping[str, Any], record_path: Path) -> None:
    """Final Run record writer.

    Validates ``run`` against ``run.schema.json`` (with the amended
    replay-equivalence fields) before writing. Writes pretty-printed JSON
    with sorted keys so the file is diff-friendly across runs.
    """
    _validate(run, "run.schema.json")
    record_path.parent.mkdir(parents=True, exist_ok=True)
    record_path.write_text(
        json.dumps(run, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


# ----------------------------------------------------------------- event factory


def now_iso() -> str:
    """Return the current UTC timestamp in RFC 3339 form with second precision."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_event_id() -> str:
    """Return a fresh UUIDv4 for use as an event_id."""
    return str(uuid.uuid4())


def make_event(
    *,
    event_type: str,
    actor_kind: str,
    actor_id: str,
    payload: Mapping[str, Any],
    run_id: str | None = None,
    spec_id: str | None = None,
    artifact_id: str | None = None,
    parent_event_id: str | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    """Construct an Event record dict conformant to ``event.schema.json``.

    The factory caller passes ``event_type`` (for example
    ``tool.call.started``), the actor descriptor, and a payload mapping.
    Optional fields are included only when supplied so the resulting dict
    matches the schema's ``additionalProperties: false`` constraint.
    """
    event: dict[str, Any] = {
        "event_id": new_event_id(),
        "type": event_type,
        "created_at": created_at or now_iso(),
        "actor": {"kind": actor_kind, "id": actor_id},
        "payload": dict(payload),
    }
    if run_id is not None:
        event["run_id"] = run_id
    if spec_id is not None:
        event["spec_id"] = spec_id
    if artifact_id is not None:
        event["artifact_id"] = artifact_id
    if parent_event_id is not None:
        event["parent_event_id"] = parent_event_id
    return event


# ----------------------------------------------------------------- replay fields builder


@dataclass(frozen=True)
class RunEvidenceFields:
    """The six replay-equivalence fields plus the list of names populated."""

    fields: dict[str, Any]
    populated: list[str]


def build_run_evidence_fields(
    *,
    prompt_text: str,
    system_prompt: str | None,
    workers: Sequence[str],
    gates: Sequence[str],
    worktree_path: Path | None,
    gate_events: Iterable[Mapping[str, Any]],
) -> RunEvidenceFields:
    """Compute the six replay-equivalence fields where derivable.

    ``gate_events`` is an iterable of Event records (mapping form) whose
    ``type`` matches ``gate.check.passed`` or ``gate.check.failed``. The
    aggregator pulls each event's ``payload.gate_name`` field and splits
    the names into the two summary lists.

    Returns a :class:`RunEvidenceFields` whose ``fields`` mapping is ready
    to merge into a Run record and whose ``populated`` list is suitable for
    the ``gate.run.evidence_recorded`` event payload.
    """
    fields: dict[str, Any] = {}
    populated: list[str] = []

    prompt_hash = compute_sha256(canonicalize_prompt(prompt_text, system_prompt))
    fields["prompt_snapshot_hash"] = prompt_hash
    populated.append("prompt_snapshot_hash")

    tool_hash = compute_sha256(canonicalize_tool_surface(workers, gates))
    fields["tool_schemas_snapshot_hash"] = tool_hash
    populated.append("tool_schemas_snapshot_hash")

    sandbox_ref = derive_sandbox_image_ref(worktree_path)
    if sandbox_ref is not None:
        fields["sandbox_image_ref"] = sandbox_ref
        populated.append("sandbox_image_ref")

    summary = aggregate_gate_results(gate_events)
    if summary is not None:
        fields["gate_results_summary"] = summary
        populated.append("gate_results_summary")

    return RunEvidenceFields(fields=fields, populated=populated)


def aggregate_gate_results(
    gate_events: Iterable[Mapping[str, Any]],
) -> dict[str, Any] | None:
    """Aggregate ``gate.check.passed`` / ``gate.check.failed`` events.

    Returns ``None`` if the iterable carries no gate-check events so the
    caller can omit ``gate_results_summary`` for runs that ran zero gates.
    """
    passed: list[str] = []
    failed: list[str] = []
    seen_any = False
    for event in gate_events:
        event_type = event.get("type", "")
        if not isinstance(event_type, str) or not event_type.startswith(
            "gate.check."
        ):
            continue
        seen_any = True
        payload = event.get("payload") or {}
        name = payload.get("gate_name") if isinstance(payload, Mapping) else None
        if not isinstance(name, str) or not name:
            name = event_type
        if event_type == "gate.check.passed":
            passed.append(name)
        elif event_type == "gate.check.failed":
            failed.append(name)
    if not seen_any:
        return None
    return {
        "gates_passed": passed,
        "gates_failed": failed,
        "all_passed": not failed,
    }
