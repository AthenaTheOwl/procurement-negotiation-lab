"""Factory metrics ledger — the "is the factory actually good?" instrument.

We already keep evidence (the event ledger in state.py) and a defect log
(defects.py), but nothing rolls them up into the numbers that say whether a run
was good or just busy: clean rate, rework rate, patch rounds, gate-failure
distribution, duration/cost, and a terminal stop-reason per task.

This module is read-only over the Store + defect log. It writes one append-only
rollup snapshot to ops/factory-metrics/rollup.jsonl per invocation and prints a
human-readable summary. `factory --metrics`.

The `stop_reason` taxonomy is defined here on purpose, ahead of the budget work
(PR2). PR2 only has to emit a single `stop` event with {"reason": <one of these>}
and this ledger already reads it (see _explicit_stop). Until then stop_reason is
derived best-effort from status + events.
"""
from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .state import Event, Store, TaskRow, now

# Terminal stop reasons. The first group is derived today; the second is reserved
# for the budget/blast-radius work and is populated once those emit a stop event.
STOP_REASONS = (
    "completed_clean",        # done, no rework, no gate failures
    "completed_with_rework",  # done, but took >=1 patch round
    "gate_failure",           # terminal: a must-pass gate failed
    "review_rejected",        # terminal: reviewer rejected
    "checkpoint_rejected",    # terminal: operator rejected at a checkpoint
    "worktree_error",         # terminal: worktree/git setup failed
    "blocked_other",          # terminal: blocked for another reason
    "awaiting_approval",      # paused at a checkpoint, not terminal
    "running",                # not terminal yet
    # reserved for PR2 (budget) / PR3 (blast radius) — emitted via a `stop` event:
    "budget_exhausted",
    "provider_rate_limited",
    "gate_flaky",
    "scope_violation",
    "unknown",
)

# substrings in failure_reason that map to a reserved reason, so the schema is
# populated best-effort even before PR2 emits explicit stop events.
_FAILURE_HINTS = {
    "rate limit": "provider_rate_limited",
    "rate-limited": "provider_rate_limited",
    "429": "provider_rate_limited",
    "budget": "budget_exhausted",
    "token limit": "budget_exhausted",
    "scope": "scope_violation",
    "forbidden path": "scope_violation",
    "allowed_paths": "scope_violation",
}


@dataclass
class TaskMetrics:
    id: str
    status: str
    stop_reason: str
    patch_rounds: int
    gate_failures: list[str]      # gate names that failed at least once
    review_caveats: int
    duration_ms: int
    cost_usd: float | None
    defects_total: int
    defects_escaped: int          # unresolved defects on a terminal-done task


@dataclass
class FactoryRollup:
    at: str
    tasks_total: int
    by_status: dict[str, int]
    terminal_total: int
    clean_rate: float | None
    first_attempt_pass_rate: float | None
    rework_rate: float | None
    avg_patch_rounds: float | None
    gate_failure_distribution: dict[str, int]
    stop_reason_distribution: dict[str, int]
    duration_ms_total: int
    duration_ms_avg: float | None
    cost_usd_total: float | None
    defects_total: int
    defects_escaped: int
    tasks: list[dict[str, Any]] = field(default_factory=list)


def _explicit_stop(events: list[Event]) -> str | None:
    """PR2 forward-compat: if a `stop` event carries a reason, trust it."""
    for ev in reversed(events):
        if ev.kind == "stop" and isinstance(ev.payload, dict):
            reason = ev.payload.get("reason")
            if reason in STOP_REASONS:
                return reason
    return None


def _patch_rounds(task: TaskRow, events: list[Event]) -> int:
    by_event = sum(1 for e in events if e.kind == "review.needs_patch")
    by_resume = task.resume_from_round or 0
    return max(by_event, by_resume)


def _gate_failures(events: list[Event]) -> list[str]:
    names: list[str] = []
    for e in events:
        if "gate" in e.kind and "fail" in e.kind:
            name = "?"
            if isinstance(e.payload, dict):
                name = e.payload.get("gate") or e.payload.get("name") or "?"
            names.append(name)
    return names


def _sum_payload_number(events: list[Event], *keys: str) -> float:
    total = 0.0
    seen = False
    for e in events:
        if isinstance(e.payload, dict):
            for k in keys:
                v = e.payload.get(k)
                if isinstance(v, (int, float)):
                    total += v
                    seen = True
                    break
    return total if seen else 0.0


def _has_payload_number(events: list[Event], *keys: str) -> bool:
    for e in events:
        if isinstance(e.payload, dict) and any(isinstance(e.payload.get(k), (int, float)) for k in keys):
            return True
    return False


def derive_stop_reason(task: TaskRow, events: list[Event], patch_rounds: int) -> str:
    explicit = _explicit_stop(events)
    if explicit:
        return explicit
    status = (task.status or "").lower()
    if status == "done":
        return "completed_with_rework" if patch_rounds > 0 else "completed_clean"
    if status == "awaiting_approval":
        return "awaiting_approval"
    if status == "running":
        return "running"
    # terminal-bad: classify from the failure_reason then the event tail
    reason = (task.failure_reason or "").lower()
    for hint, mapped in _FAILURE_HINTS.items():
        if hint in reason:
            return mapped
    kinds = {e.kind for e in events}
    if "checkpoint.rejected" in kinds:
        return "checkpoint_rejected"
    if "review.rejected" in kinds or status == "rejected":
        return "review_rejected"
    if "worktree.error" in kinds:
        return "worktree_error"
    if any("gate" in k and "fail" in k for k in kinds):
        return "gate_failure"
    if status == "blocked":
        return "blocked_other"
    return "unknown"


def compute_task_metrics(store: Store, task: TaskRow, defects_dir: Path | None) -> TaskMetrics:
    events = store.events_for(task.id)
    review_caveats = sum(1 for e in events if e.kind in ("review.needs_patch", "review.rejected"))
    duration_ms = int(_sum_payload_number(events, "duration_ms"))
    cost_usd = _sum_payload_number(events, "total_cost_usd", "cost_usd") if _has_payload_number(events, "total_cost_usd", "cost_usd") else None

    # The defect log is the authoritative source for gate-failure NAMES
    # (gate_or_finding) and for whether a defect is resolved (resolved_in_round
    # is not None). Events carry gate.failed without the name, so prefer defects.
    defects_total = 0
    defects_escaped = 0
    defect_gate_names: list[str] = []
    defect_max_round = 0
    done = (task.status or "").lower() == "done"
    if defects_dir is not None:
        path = defects_dir / f"{task.id}.jsonl"
        if path.is_file():
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                defects_total += 1
                rnd = rec.get("round")
                if isinstance(rnd, int):
                    defect_max_round = max(defect_max_round, rnd)
                kind = str(rec.get("kind") or "")
                if "gate" in kind and "fail" in kind:
                    defect_gate_names.append(rec.get("gate_or_finding") or "?")
                # escaped = unresolved (no resolved_in_round) on a shipped task
                if done and rec.get("resolved_in_round") is None:
                    defects_escaped += 1

    # Patch rounds: events under-record it (the SQLite ledger rarely writes a
    # review.needs_patch), so the defect log's max round is the truer signal of
    # how many iterations a task actually took.
    patch_rounds = max(_patch_rounds(task, events), defect_max_round)

    # Prefer named gate failures from the defect log; fall back to events.
    gate_failures = defect_gate_names if defect_gate_names else _gate_failures(events)

    return TaskMetrics(
        id=task.id,
        status=task.status,
        stop_reason=derive_stop_reason(task, events, patch_rounds),
        patch_rounds=patch_rounds,
        gate_failures=gate_failures,
        review_caveats=review_caveats,
        duration_ms=duration_ms,
        cost_usd=cost_usd,
        defects_total=defects_total,
        defects_escaped=defects_escaped,
    )


_TERMINAL = {"done", "failed", "blocked", "rejected"}


def compute_rollup(store: Store, defects_dir: Path | None = None) -> FactoryRollup:
    tasks = store.list_tasks()
    per_task = [compute_task_metrics(store, t, defects_dir) for t in tasks]

    by_status = Counter(t.status for t in per_task)
    terminal = [t for t in per_task if (t.status or "").lower() in _TERMINAL]
    done = [t for t in per_task if (t.status or "").lower() == "done"]

    clean = [t for t in done if t.stop_reason == "completed_clean"]
    first_attempt = [t for t in done if t.patch_rounds == 0]
    reworked = [t for t in done if t.patch_rounds > 0]

    gate_dist: Counter[str] = Counter()
    for t in per_task:
        gate_dist.update(t.gate_failures)
    stop_dist = Counter(t.stop_reason for t in per_task)

    duration_total = sum(t.duration_ms for t in per_task)
    costs = [t.cost_usd for t in per_task if t.cost_usd is not None]

    def rate(num: int, den: int) -> float | None:
        return round(num / den, 3) if den else None

    return FactoryRollup(
        at=now(),
        tasks_total=len(per_task),
        by_status=dict(by_status),
        terminal_total=len(terminal),
        clean_rate=rate(len(clean), len(done)),
        first_attempt_pass_rate=rate(len(first_attempt), len(done)),
        rework_rate=rate(len(reworked), len(done)),
        avg_patch_rounds=round(sum(t.patch_rounds for t in done) / len(done), 2) if done else None,
        gate_failure_distribution=dict(gate_dist),
        stop_reason_distribution=dict(stop_dist),
        duration_ms_total=duration_total,
        duration_ms_avg=round(duration_total / len(per_task), 1) if per_task else None,
        cost_usd_total=round(sum(costs), 4) if costs else None,
        defects_total=sum(t.defects_total for t in per_task),
        defects_escaped=sum(t.defects_escaped for t in per_task),
        tasks=[asdict(t) for t in per_task],
    )


def write_rollup(rollup: FactoryRollup, metrics_dir: str | Path = "ops/factory-metrics") -> Path:
    d = Path(metrics_dir)
    d.mkdir(parents=True, exist_ok=True)
    path = d / "rollup.jsonl"
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(asdict(rollup), ensure_ascii=False) + "\n")
    return path


def format_summary(r: FactoryRollup) -> str:
    lines = []
    lines.append(f"factory metrics  @ {r.at}")
    lines.append(f"  tasks: {r.tasks_total}  ({', '.join(f'{k}={v}' for k, v in sorted(r.by_status.items()))})")
    pct = lambda x: "n/a" if x is None else f"{x * 100:.0f}%"
    lines.append(f"  clean rate (done, 0 rework): {pct(r.clean_rate)}    "
                 f"first-attempt pass: {pct(r.first_attempt_pass_rate)}    rework: {pct(r.rework_rate)}")
    lines.append(f"  avg patch rounds (done): {r.avg_patch_rounds if r.avg_patch_rounds is not None else 'n/a'}")
    if r.gate_failure_distribution:
        ranked = sorted(r.gate_failure_distribution.items(), key=lambda kv: -kv[1])
        top = ", ".join(f"{k}:{v}" for k, v in ranked[:8])
        more = len(ranked) - 8
        lines.append(f"  top gate failures: {top}" + (f"  (+{more} more, see rollup.jsonl)" if more > 0 else ""))
    sr = ", ".join(f"{k}:{v}" for k, v in sorted(r.stop_reason_distribution.items(), key=lambda kv: -kv[1]))
    lines.append(f"  stop reasons: {sr}")
    dur_s = r.duration_ms_total / 1000
    lines.append(f"  duration: {dur_s:.0f}s total" + (f", {r.duration_ms_avg / 1000:.1f}s avg/task" if r.duration_ms_avg else ""))
    if r.cost_usd_total is not None:
        lines.append(f"  cost: ${r.cost_usd_total:.4f} total")
    lines.append(f"  defects: {r.defects_total} logged, {r.defects_escaped} escaped (unresolved on a done task)")
    return "\n".join(lines)
