from __future__ import annotations

from procurement_lab.algorithms import run_algorithm
from procurement_lab.information_modes import INFORMATION_MODES, information_profile
from procurement_lab.scenario_loader import ScenarioSpec, scenario_to_context


def test_information_profiles_are_ordered(scenario: ScenarioSpec) -> None:
    context = scenario_to_context(scenario, quantity=0)
    exposures = [information_profile(mode, context).privacy_exposure for mode in INFORMATION_MODES]
    assert exposures == sorted(exposures)


def test_full_information_not_worse_than_private(
    scenario: ScenarioSpec,
) -> None:
    private = run_algorithm(scenario, algorithm="admm", information_mode="private")
    full = run_algorithm(scenario, algorithm="admm", information_mode="full_oracle")
    assert full.ledger.global_utility >= private.ledger.global_utility
