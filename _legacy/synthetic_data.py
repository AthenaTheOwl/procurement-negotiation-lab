"""Deterministic synthetic scenario and catalog helpers."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CatalogItem:
    sku: str
    category: str
    supplier: str
    lead_time_weeks: int
    unit_cost: float
    risk_score: float


def generate_catalog(seed: int = 42, count: int = 50) -> list[CatalogItem]:
    categories = ["logic", "memory", "substrate", "packaging", "equipment"]
    suppliers = ["supplier_a", "supplier_b", "supplier_c", "supplier_d", "supplier_e"]
    items: list[CatalogItem] = []
    for index in range(count):
        category = categories[index % len(categories)]
        supplier = suppliers[(index * 3) % len(suppliers)]
        cost_noise = ((seed * 31 + index * 17) % 1000) / 1000
        risk_noise = ((seed * 47 + index * 29) % 1000) / 1000
        items.append(
            CatalogItem(
                sku=f"SKU-{index + 1:03d}",
                category=category,
                supplier=supplier,
                lead_time_weeks=6 + (index % 9) * 2,
                unit_cost=round(20 + cost_noise * 180, 2),
                risk_score=round(0.05 + risk_noise * 0.75, 3),
            )
        )
    return items
