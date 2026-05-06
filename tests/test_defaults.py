from __future__ import annotations

from procurement_lab.defaults import build_default_scenario


def test_minimum_arena_defaults_are_valid() -> None:
    scenario = build_default_scenario(product_count=3, periods=6, participant_count=5)
    assert len(scenario.products) == 3
    assert scenario.periods == 6
    assert len(scenario.participants) == 5
