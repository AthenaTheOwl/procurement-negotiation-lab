from __future__ import annotations

from procurement_lab.defaults import build_default_scenario
from procurement_lab.formulations import run_plan_matrix


def test_plan_matrix_covers_products_and_periods() -> None:
    scenario = build_default_scenario(product_count=3, periods=4)
    rows = run_plan_matrix(scenario, algorithm="admm", information_mode="forecast_band")
    assert len(rows) == 12
    assert all(float(row["quantity"]) >= 0 for row in rows)
