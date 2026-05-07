from __future__ import annotations

from procurement_lab.algorithms.simple import (
    AlternatingBestResponse,
    ConsensusAveraging,
    PriceOnlyDual,
)
from procurement_lab.engine.schemas import Scenario


def test_simple_baselines_run_on_base_scenario(scenario: Scenario) -> None:
    for algorithm in [AlternatingBestResponse(), PriceOnlyDual(), ConsensusAveraging()]:
        run = algorithm.run(scenario, max_iter=20, tolerance=0.5)
        assert run.algorithm == algorithm.name
        assert run.iterations
        assert run.ledger.global_utility == sum(run.ledger.local.values())
        assert run.final_residual >= 0
