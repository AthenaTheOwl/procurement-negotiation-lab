from __future__ import annotations

from procurement_lab.learning_loop import LEARNING_STEPS, run_learning_step
from procurement_lab.scenario_loader import ScenarioSpec


def test_learning_loop_steps_have_artifacts(scenario: ScenarioSpec) -> None:
    for step in LEARNING_STEPS:
        traces = run_learning_step(scenario, step)
        assert traces
        assert traces[-1].iterations
