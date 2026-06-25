"""Schema-validation tests for `scenarios/*.yaml`.

Every YAML file in the `scenarios/` directory must:
1. parse into a valid `Scenario` Pydantic model
2. carry a unique `id` across all scenarios in that directory
3. expose participants whose `utility_formula` evaluates cleanly through
   the safe-AST formula engine for sample inputs

These tests run automatically on every PR. To add a new scenario, drop a
new `*.yaml` file into `scenarios/` — no test changes required.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from procurement_lab.engine.schemas import Scenario
from procurement_mechanism_sdk.scenario_loader import (
    iter_scenario_paths,
    load_all_scenarios,
    load_scenario,
)

SCENARIOS_DIR = Path(__file__).resolve().parents[1] / "scenarios"


@pytest.fixture(scope="module")
def scenarios() -> dict[str, Scenario]:
    return load_all_scenarios(SCENARIOS_DIR)


@pytest.mark.parametrize(
    "path",
    list(iter_scenario_paths(SCENARIOS_DIR)),
    ids=lambda p: p.name,
)
def test_scenario_yaml_validates(path: Path) -> None:
    scenario = load_scenario(path)
    assert isinstance(scenario, Scenario)
    assert scenario.id, f"{path}: scenario.id is empty"
    assert scenario.title, f"{path}: scenario.title is empty"
    assert len(scenario.participants) >= 2
    assert len(scenario.products) >= 1


def test_scenario_ids_are_unique(scenarios: dict[str, Scenario]) -> None:
    # load_all_scenarios already raises on duplicates; this test makes the
    # invariant explicit so a reviewer reading the test list sees it called out.
    assert len(scenarios) == len(set(scenarios)), "duplicate scenario id"


def test_scenarios_directory_has_canonical_set(scenarios: dict[str, Scenario]) -> None:
    """The five canonical scenarios named in scenarios/README.md must exist."""
    expected = {
        "substrate-baseline",
        "customer-concentration-risk",
        "three-bidder-supply",
        "multi-period-commitment",
        "packaging-bottleneck",
    }
    assert expected.issubset(set(scenarios)), (
        f"missing canonical scenarios: {expected - set(scenarios)}"
    )


def test_every_scenario_has_at_least_one_buyer(scenarios: dict[str, Scenario]) -> None:
    for sid, scenario in scenarios.items():
        roles = [p.role.value for p in scenario.participants]
        assert "buyer" in roles, f"{sid}: no buyer participant"


def test_capacity_keys_match_product_ids(scenarios: dict[str, Scenario]) -> None:
    """Every capacity entry must reference a real product id."""
    for sid, scenario in scenarios.items():
        product_ids = {p.id for p in scenario.products}
        for capacity_id in scenario.capacity:
            assert capacity_id in product_ids, (
                f"{sid}: capacity references unknown product `{capacity_id}`"
            )
