"""Information modes — control what each participant can see.

The lab teaches that more shared information often improves coordination
quality but may cost privacy or bargaining position. Each mode returns a
dict of per-participant overrides that mask, perturb, or fully reveal
scenario parameters.

v0 implementation: most modes are stubs that return identity overrides.
The full information-value teaching pass is a v1 deliverable handled by
the next phase.
"""

from __future__ import annotations

from procurement_lab.engine.schemas import InformationMode, Scenario


def overrides_for_mode(
    scenario: Scenario,
    mode: InformationMode,
) -> dict[str, dict[str, float]]:
    """Return per-participant parameter overrides for the given mode.

    Empty dict per participant = no override = full visibility.

    For v0 we return empty for FULL_ORACLE and identity-shaped stubs for the
    others. Real masking/perturbation logic ships in v1.
    """

    overrides: dict[str, dict[str, float]] = {p.id: {} for p in scenario.participants}

    if mode == InformationMode.FULL_ORACLE:
        return overrides

    # All other modes currently return empty overrides — i.e., behave like
    # FULL_ORACLE for v0. The branch is kept so v1 can drop in real masking
    # without changing the algorithm interface.
    return overrides
