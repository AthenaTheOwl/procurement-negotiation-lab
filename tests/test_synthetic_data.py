from __future__ import annotations

from procurement_lab.synthetic_data import generate_catalog


def test_catalog_generation_is_deterministic() -> None:
    first = generate_catalog(seed=7, count=5)
    second = generate_catalog(seed=7, count=5)
    assert first == second
    assert len(first) == 5
