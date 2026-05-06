from __future__ import annotations

from pathlib import Path

import pytest

from procurement_lab.scenario_loader import ScenarioSpec, load_scenarios

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def scenarios() -> list[ScenarioSpec]:
    return load_scenarios(ROOT / "data" / "supplier_scenarios.yaml")


@pytest.fixture(scope="session")
def scenario(scenarios: list[ScenarioSpec]) -> ScenarioSpec:
    return scenarios[0]
