"""Algorithm protocol — every coordination algorithm implements this interface.

Adding a new algorithm:
    1. Create a new file under algorithms/, e.g. algorithms/frank_wolfe.py
    2. Implement a class that satisfies the Algorithm Protocol
    3. Register it in algorithms/__init__.py
    4. Add a unit test under tests/unit/algorithms/
"""

from __future__ import annotations

from typing import Protocol

from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    InformationMode,
    IterationRecord,
    Scenario,
)

# Re-export for convenience.
__all__ = ["Algorithm", "AlgorithmRun", "Convergence", "IterationRecord"]


class Algorithm(Protocol):
    """A coordination algorithm. Stateless; one instance is reused across runs."""

    name: str

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 50,
        tolerance: float = 0.01,
    ) -> AlgorithmRun:
        """Run the algorithm on a scenario, return a full trace + ledger."""
        ...
