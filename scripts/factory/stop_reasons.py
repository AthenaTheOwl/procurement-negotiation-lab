"""Shared factory stop-reason taxonomy."""

from __future__ import annotations

from typing import Literal


StopReason = Literal[
    "completed_clean",
    "completed_with_rework",
    "gate_failure",
    "review_rejected",
    "checkpoint_rejected",
    "worktree_error",
    "blocked_other",
    "awaiting_approval",
    "running",
    "budget_exhausted",
    "provider_rate_limited",
    "gate_flaky",
    "scope_violation",
    "unknown",
]


STOP_REASONS: tuple[StopReason, ...] = (
    "completed_clean",
    "completed_with_rework",
    "gate_failure",
    "review_rejected",
    "checkpoint_rejected",
    "worktree_error",
    "blocked_other",
    "awaiting_approval",
    "running",
    "budget_exhausted",
    "provider_rate_limited",
    "gate_flaky",
    "scope_violation",
    "unknown",
)

