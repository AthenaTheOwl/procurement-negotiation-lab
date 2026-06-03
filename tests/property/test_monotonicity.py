"""Property R-PROP-004: monotonicity.

For mechanisms claiming the property, increasing the available capacity
weakly increases the global utility achieved. This is the
capacity-monotonicity flavor that applies to every mechanism today;
the weight-monotonicity flavor specific to weighted-Nash bargaining
lives in tests/property/test_weighted_nash_properties.py once spec
0015 ships.

The property targets only mechanisms that claim it via the registry.
ADMM and other heuristic mechanisms do not claim general monotonicity
(they may oscillate near the boundary); the centralized oracle and
similar mechanisms do.

Per DEC-PROP-001: this property is currently claimed by no mechanism
in W1's registry. Once weighted_nash_bounded lands (spec 0015 W2)
with weight-monotonicity claims, this file extends to cover that.

This W1 placeholder uses a capacity-monotonicity check that runs
against any registered mechanism opting in; for W1 the registry has
zero entries, so the parameterized test collects as a no-op.
The test body documents the contract so adding a future mechanism
that claims monotonicity gains coverage immediately.
"""

from __future__ import annotations

from copy import deepcopy

import pytest
from hypothesis import given, settings

from procurement_lab.engine.schemas import AlgorithmRun, Convergence, Scenario

from tests.property.conftest import scenario_strategy
from tests.property.registry import (
    PROP_MONOTONICITY,
    MechanismEntry,
    mechanisms_claiming,
)


@pytest.mark.parametrize(
    "entry",
    mechanisms_claiming(PROP_MONOTONICITY),
    ids=lambda e: e.name,
)
@given(scenario=scenario_strategy())
@settings(max_examples=25)
def test_capacity_increase_weakly_improves_global_utility(
    entry: MechanismEntry, scenario: Scenario
) -> None:
    """Doubling capacity weakly improves global utility for monotonic mechanisms."""
    algorithm = entry.factory()
    run_low: AlgorithmRun = algorithm.run(scenario, max_iter=60, tolerance=0.5)

    if run_low.convergence == Convergence.NO_DEAL or not run_low.ledger.feasible:
        return

    # Build a relaxed scenario with double capacity.
    relaxed_capacity = {pid: cap * 2.0 for pid, cap in scenario.capacity.items()}
    relaxed = scenario.model_copy(update={"capacity": relaxed_capacity})
    run_high: AlgorithmRun = algorithm.run(relaxed, max_iter=60, tolerance=0.5)

    if run_high.convergence == Convergence.NO_DEAL or not run_high.ledger.feasible:
        return

    # Relaxed capacity should weakly improve global utility.
    # Tolerance accommodates per-mechanism convergence noise.
    util_low = run_low.ledger.global_utility
    util_high = run_high.ledger.global_utility
    tolerance = max(1e-3, abs(util_low) * 1e-3)
    assert util_high >= util_low - tolerance, (
        f"mechanism {entry.name} violated capacity monotonicity: "
        f"low_cap util={util_low:.4f}, high_cap util={util_high:.4f}"
    )


def test_registry_documents_monotonicity_claims() -> None:
    """Sanity guard: the registry's monotonicity claims match the spec.

    Mechanisms that claim general monotonicity must back the claim with
    an algorithm-level proof. Today none of the W1 mechanisms claim it;
    this guard catches the case where a future commit adds the claim to
    the registry without paired property coverage in this file.
    """
    claimants = mechanisms_claiming(PROP_MONOTONICITY)
    # W1 ships with zero claimants. When that changes (W2 weighted_nash
    # adds weight-monotonicity), this assertion's value updates and the
    # parameterized test above gains coverage.
    expected_count = 0
    assert len(claimants) == expected_count, (
        f"registry now lists {len(claimants)} mechanism(s) claiming "
        f"monotonicity (expected {expected_count}). Update spec 0017 "
        f"R-PROP-004 + DEC-PROP-001's coverage table if intentional."
    )
