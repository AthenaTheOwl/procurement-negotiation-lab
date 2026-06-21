"""Terminal PASS / INVESTIGATE / HOLD classification."""

from __future__ import annotations

from typing import Any, Literal

from .task import TriagePolicy

Triage = Literal["PASS", "INVESTIGATE", "HOLD"]

_CAVEAT_MARKERS = (
    "advisory",
    "caveat",
    "freshness",
    "non-blocking",
    "nonblocking",
    "follow-up",
    "follow up",
)


def classify_terminal_state(
    *,
    final_status: str,
    contract_violations: list[Any] | None = None,
    gate_outcomes: list[Any] | None = None,
    review_text: str = "",
    defect_log: list[Any] | None = None,
    triage_policy: TriagePolicy | None = None,
    sensitive_disclosure: bool = False,
    no_op_diff: bool = False,
    first_user_action_broken: bool = False,
) -> Triage:
    """Classify a terminal factory run per R-FAM-V1-070.

    ``gate_outcomes`` intentionally accepts any object with ``ok`` and
    ``must_pass`` attributes so this module stays independent of the worker
    layer and is easy to test with small fixtures.
    """
    policy = triage_policy or TriagePolicy()
    violations = contract_violations or []
    outcomes = gate_outcomes or []
    defects = defect_log or []

    if final_status != "done":
        return "HOLD"
    if policy.hold_on_contract_violation and violations:
        return "HOLD"
    if policy.hold_on_sensitive_disclosure and sensitive_disclosure:
        return "HOLD"
    if policy.hold_on_noop_diff and no_op_diff:
        return "HOLD"
    if policy.hold_on_broken_first_user_action and first_user_action_broken:
        return "HOLD"

    for outcome in outcomes:
        ok = bool(getattr(outcome, "ok", False))
        must_pass = bool(getattr(outcome, "must_pass", True))
        if not ok and must_pass and policy.hold_on_must_pass_gate_failure:
            return "HOLD"

    if policy.investigate_on_advisory_gate_failure:
        if any(
            not bool(getattr(outcome, "ok", False))
            and not bool(getattr(outcome, "must_pass", True))
            for outcome in outcomes
        ):
            return "INVESTIGATE"
    if defects:
        return "INVESTIGATE"
    if policy.investigate_on_review_caveat and _has_review_caveat(review_text):
        return "INVESTIGATE"
    return "PASS"


def _has_review_caveat(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in _CAVEAT_MARKERS)
