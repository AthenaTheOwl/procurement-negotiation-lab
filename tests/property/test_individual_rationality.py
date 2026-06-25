"""Property R-PROP-002: individual rationality.

For any feasible scenario, every mechanism claiming the property
returns an allocation where, after the CBT surplus-redistribution
step, no participant's realized utility falls below their
`outside_option` (BATNA).

Current mechanisms (oracle, ADMM, baselines) maximize global utility
without an inline IR constraint; the pipeline relies on
`engine.cbt.compute_transfer` to redistribute surplus so every
participant ends up no-worse-off. This test asserts IR on the
CBT-applied ledger.

When weighted-Nash bargaining lands in spec 0015 W2, it will satisfy
IR natively without requiring CBT (R-NASH-002). A paired property
test in test_weighted_nash_properties.py will assert IR on the raw
ledger for that mechanism.

If `compute_transfer` returns `feasible=False`, the surplus is too
small to make every participant whole. That case is the structured-
failure path covered by R-PROP-009; this test skips it.
"""

from __future__ import annotations

import pytest
from hypothesis import given, settings

from procurement_lab.engine.cbt import compute_transfer
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    Scenario,
)
from tests.property.conftest import scenario_strategy
from tests.property.registry import (
    PROP_INDIVIDUAL_RATIONALITY,
    MechanismEntry,
    mechanisms_claiming,
)


@pytest.mark.parametrize(
    "entry",
    mechanisms_claiming(PROP_INDIVIDUAL_RATIONALITY),
    ids=lambda e: e.name,
)
@given(scenario=scenario_strategy())
@settings(max_examples=30)
def test_ir_holds_after_cbt_redistribution(
    entry: MechanismEntry, scenario: Scenario
) -> None:
    """After CBT surplus-redistribution, no participant is below their BATNA.

    For mechanisms that do not enforce IR inline (the current W1 set),
    the production pipeline applies `compute_transfer` to redistribute
    surplus. The combined output must satisfy IR for every participant
    when the plan is feasible.
    """
    algorithm = entry.factory()
    run: AlgorithmRun = algorithm.run(scenario, max_iter=60, tolerance=0.5)

    if run.convergence == Convergence.NO_DEAL or not run.ledger.feasible:
        # Infeasible scenarios are covered by R-PROP-009; skip IR here.
        return

    plan = compute_transfer(run.ledger, rule="proportional")

    if not plan.feasible:
        # Surplus insufficient to make every party whole; structured-
        # failure path (R-PROP-009 + plan.no_worse_off flags).
        return

    for participant in scenario.participants:
        after = plan.after_transfer.get(participant.id)
        outside = participant.outside_option
        assert after is not None, (
            f"mechanism {entry.name} + CBT returned plan missing participant {participant.id}"
        )
        # Tolerance per DEC-PROP-001.
        assert after >= outside - 1e-6, (
            f"mechanism {entry.name} + CBT placed participant {participant.id} "
            f"below outside_option: after_transfer={after:.4f} outside={outside:.4f}"
        )
        # CBT's own no_worse_off flag should agree with our assertion.
        assert plan.no_worse_off.get(participant.id, False), (
            f"plan.no_worse_off[{participant.id}] is False despite "
            f"feasible plan; CBT bookkeeping inconsistent"
        )
