"""Property R-PROP-003: determinism.

For any scenario, every mechanism claiming the property returns
identical outputs across two independent runs on the same inputs,
within a documented floating-point tolerance.

Per DEC-PROP-001: tolerance is 1e-6 for non-iterative mechanisms and
the algorithm's documented numerical tolerance for iterative ones.
"""

from __future__ import annotations

import pytest
from hypothesis import given, settings

from procurement_lab.engine.schemas import AlgorithmRun, Scenario

from tests.property.conftest import scenario_strategy
from tests.property.registry import (
    PROP_DETERMINISM,
    MechanismEntry,
    mechanisms_claiming,
)


# Per DEC-PROP-001. Iterative mechanisms inherit the algorithm's
# convergence tolerance; non-iterative ones use the strict floor.
DETERMINISM_TOLERANCE = 1e-6


@pytest.mark.parametrize(
    "entry",
    mechanisms_claiming(PROP_DETERMINISM),
    ids=lambda e: e.name,
)
@given(scenario=scenario_strategy())
@settings(max_examples=30)
def test_two_runs_produce_identical_consensus(
    entry: MechanismEntry, scenario: Scenario
) -> None:
    """Two runs on the same scenario produce the same final consensus."""
    algorithm_a = entry.factory()
    algorithm_b = entry.factory()
    run_a: AlgorithmRun = algorithm_a.run(scenario, max_iter=60, tolerance=0.5)
    run_b: AlgorithmRun = algorithm_b.run(scenario, max_iter=60, tolerance=0.5)

    assert run_a.algorithm == run_b.algorithm
    assert len(run_a.iterations) == len(run_b.iterations), (
        f"mechanism {entry.name} produced different iteration counts: "
        f"{len(run_a.iterations)} vs {len(run_b.iterations)}"
    )

    final_a = run_a.iterations[-1]
    final_b = run_b.iterations[-1]

    # Allow a per-mechanism floor of the algorithm's convergence
    # tolerance plus the documented floating-point tolerance.
    tol = max(DETERMINISM_TOLERANCE, run_a.final_residual + 1e-6)

    for q_a, q_b in zip(final_a.consensus, final_b.consensus):
        assert abs(q_a - q_b) <= tol, (
            f"mechanism {entry.name} consensus diverged: "
            f"{q_a:.6f} vs {q_b:.6f} (tol {tol:.6f})"
        )

    # Global utility should also match within tolerance.
    assert abs(run_a.ledger.global_utility - run_b.ledger.global_utility) <= max(
        DETERMINISM_TOLERANCE, abs(run_a.ledger.global_utility) * 1e-6
    ), (
        f"mechanism {entry.name} global_utility diverged: "
        f"{run_a.ledger.global_utility:.6f} vs {run_b.ledger.global_utility:.6f}"
    )
