"""Root-cause attribution across SDLC phases for v2-lite.

MAST/AgentFail (2025) found 32% of multi-agent failures surface in a different
node than where they originate. When a downstream gate fails or a reviewer
flags a defect, the visible "symptom" event is often not the one to fix. This
module walks the event ledger keyed by trace_id, identifies the symptom event,
and reports the earliest cross-phase event that could plausibly be the root
cause.

The heuristic is intentionally simple: walk events forward by id, mark each
event's phase, find the first symptom (failed/error/needs_patch/rejected), then
walk backward to the first event in a *different* phase. That earlier event is
the "candidate root cause." A human still confirms; the report only narrows
the search.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from scripts.factory.state import Event, Store

SYMPTOM_KINDS: frozenset[str] = frozenset(
    (
        "pipeline.failed",
        "gates.failed",
        "review.needs_patch",
        "review.rejected",
        "checkpoint.rejected",
        "worktree.error",
        "implement.error",
        "plan.error",
    )
)


@dataclass
class AttributionReport:
    task_id: str
    trace_id: str
    symptom_event_id: int | None
    symptom_kind: str | None
    symptom_phase: str | None
    root_cause_event_id: int | None
    root_cause_kind: str | None
    root_cause_phase: str | None
    propagation_distance: int  # number of events between root and symptom
    phase_chain: list[str]  # ordered list of distinct phases touched, root → symptom

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _event_phase(event: Event) -> str | None:
    if event.payload and isinstance(event.payload, dict):
        phase = event.payload.get("phase")
        if isinstance(phase, str):
            return phase
    return None


def attribute_failure(
    store: Store, task_id: str, trace_id: str | None = None
) -> AttributionReport:
    """Walk a task's event ledger and report root-cause vs symptom phases.

    If trace_id is None, uses the most recent trace for the task. If no
    symptom event is found, returns a report with symptom fields = None
    (the pipeline succeeded, or at least did not emit a recognized symptom).
    """
    if trace_id is None:
        traces = store.traces_for(task_id)
        if not traces:
            return AttributionReport(
                task_id=task_id,
                trace_id="",
                symptom_event_id=None,
                symptom_kind=None,
                symptom_phase=None,
                root_cause_event_id=None,
                root_cause_kind=None,
                root_cause_phase=None,
                propagation_distance=0,
                phase_chain=[],
            )
        trace_id = traces[-1]

    events = store.events_for(task_id, trace_id=trace_id)
    if not events:
        return AttributionReport(
            task_id=task_id,
            trace_id=trace_id,
            symptom_event_id=None,
            symptom_kind=None,
            symptom_phase=None,
            root_cause_event_id=None,
            root_cause_kind=None,
            root_cause_phase=None,
            propagation_distance=0,
            phase_chain=[],
        )

    symptom_idx: int | None = None
    for idx, event in enumerate(events):
        if event.kind in SYMPTOM_KINDS:
            symptom_idx = idx
            break

    if symptom_idx is None:
        # No failure surface — return phase chain only.
        chain: list[str] = []
        for event in events:
            phase = _event_phase(event)
            if phase and (not chain or chain[-1] != phase):
                chain.append(phase)
        return AttributionReport(
            task_id=task_id,
            trace_id=trace_id,
            symptom_event_id=None,
            symptom_kind=None,
            symptom_phase=None,
            root_cause_event_id=None,
            root_cause_kind=None,
            root_cause_phase=None,
            propagation_distance=0,
            phase_chain=chain,
        )

    symptom = events[symptom_idx]
    symptom_phase = _event_phase(symptom)

    # Walk backward to find the first event in a *different* phase than the
    # symptom. That earlier event is the candidate root cause.
    root_idx: int | None = None
    for back_idx in range(symptom_idx - 1, -1, -1):
        earlier_phase = _event_phase(events[back_idx])
        if earlier_phase and earlier_phase != symptom_phase:
            root_idx = back_idx
            break

    chain = []
    walked = events[: symptom_idx + 1]
    for event in walked:
        phase = _event_phase(event)
        if phase and (not chain or chain[-1] != phase):
            chain.append(phase)

    if root_idx is None:
        # No cross-phase predecessor — symptom is its own root.
        return AttributionReport(
            task_id=task_id,
            trace_id=trace_id,
            symptom_event_id=symptom.id,
            symptom_kind=symptom.kind,
            symptom_phase=symptom_phase,
            root_cause_event_id=symptom.id,
            root_cause_kind=symptom.kind,
            root_cause_phase=symptom_phase,
            propagation_distance=0,
            phase_chain=chain,
        )

    root = events[root_idx]
    return AttributionReport(
        task_id=task_id,
        trace_id=trace_id,
        symptom_event_id=symptom.id,
        symptom_kind=symptom.kind,
        symptom_phase=symptom_phase,
        root_cause_event_id=root.id,
        root_cause_kind=root.kind,
        root_cause_phase=_event_phase(root),
        propagation_distance=symptom_idx - root_idx,
        phase_chain=chain,
    )
