"""Fixed guided walkthrough content."""

from __future__ import annotations

from dataclasses import dataclass

from procurement_lab.algorithms import run_algorithm, run_algorithm_suite
from procurement_lab.scenario_loader import ScenarioSpec
from procurement_lab.trace_schema import CoordinationTrace, InformationMode


@dataclass(frozen=True)
class LearningStep:
    id: str
    title: str
    mode: InformationMode
    narrative: str


LEARNING_STEPS: tuple[LearningStep, ...] = (
    LearningStep(
        id="local_objectives",
        title="1. local objectives",
        mode="private",
        narrative="buyer and supplier optimize different dollar utilities from partial information",
    ),
    LearningStep(
        id="global_utility",
        title="2. global utility",
        mode="private",
        narrative=(
            "the same quantity can look good locally and still leave joint value on the table"
        ),
    ),
    LearningStep(
        id="commitment_terms",
        title="3. commitment terms",
        mode="risk_only",
        narrative="two-sided penalties make long-lead certainty explicit instead of implied",
    ),
    LearningStep(
        id="coordination",
        title="4. coordination",
        mode="capacity_band",
        narrative=(
            "agents solve locally, exchange price/proximity signals, and move toward consensus"
        ),
    ),
    LearningStep(
        id="transfers",
        title="5. surplus transfer",
        mode="forecast_band",
        narrative="the operational plan and the surplus split are separate decisions",
    ),
    LearningStep(
        id="information_value",
        title="6. information value",
        mode="full_oracle",
        narrative="more shared information can improve joint value, but privacy exposure rises",
    ),
)


def run_learning_step(scenario: ScenarioSpec, step: LearningStep) -> list[CoordinationTrace]:
    if step.id in {"local_objectives", "global_utility"}:
        return [
            run_algorithm(
                scenario,
                algorithm="centralized_oracle" if step.id == "global_utility" else "admm",
                information_mode=step.mode,
            )
        ]
    return run_algorithm_suite(scenario, information_mode=step.mode)
