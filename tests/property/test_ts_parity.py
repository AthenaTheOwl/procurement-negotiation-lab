"""Property R-PROP-011: TS-Python parity.

For mechanisms claiming ``ts_parity``, the parameters baked into the
Python engine must mirror the JSON-exported parameters consumed by the
TypeScript engine (``packages/engine/src/weighted_nash_params.json``).

The parity contract today is parameter-level (NASH_QUANTIZATION_LEVELS,
tolerances, mechanism identifiers, default Nash weight). Full
allocation-level parity between the Python and TS engines lands in the
spec 0017 follow-up that mirrors the test suite across both. This
file enforces what we have today: the JSON mirror exists, parses, and
declares the same constants the Python module exposes.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from procurement_lab.algorithms.weighted_nash import (
    NASH_QUANTIZATION_LEVELS,
    PLAINTEXT_NUMERICAL_TOLERANCE,
    PROTOCOL_NUMERICAL_TOLERANCE,
    PROTOCOL_VERSION,
)
from tests.property.registry import (
    PROP_TS_PARITY,
    MechanismEntry,
    mechanisms_claiming,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
TS_PARAMS_PATH = REPO_ROOT / "packages" / "engine" / "src" / "weighted_nash_params.json"


@pytest.fixture(scope="module")
def ts_params() -> dict:
    if not TS_PARAMS_PATH.is_file():
        pytest.skip(f"TS mirror file not present: {TS_PARAMS_PATH}")
    return json.loads(TS_PARAMS_PATH.read_text(encoding="utf-8"))


def test_ts_mirror_exists() -> None:
    """The TS engine mirror file is checked in alongside the Python module."""
    assert TS_PARAMS_PATH.is_file(), (
        f"TS mirror missing at {TS_PARAMS_PATH}; spec 0017 W2 Codex task T-NASH-009 "
        f"declared this as the parity surface"
    )


def test_quantization_levels_match(ts_params: dict) -> None:
    assert ts_params.get("nash_quantization_levels") == NASH_QUANTIZATION_LEVELS


def test_tolerances_match(ts_params: dict) -> None:
    assert ts_params.get("plaintext_numerical_tolerance") == PLAINTEXT_NUMERICAL_TOLERANCE
    assert ts_params.get("protocol_numerical_tolerance") == PROTOCOL_NUMERICAL_TOLERANCE


def test_protocol_version_matches(ts_params: dict) -> None:
    assert ts_params.get("protocol_version") == PROTOCOL_VERSION


@pytest.mark.parametrize(
    "entry",
    mechanisms_claiming(PROP_TS_PARITY),
    ids=lambda e: e.name,
)
def test_mechanism_listed_in_ts_mirror(entry: MechanismEntry, ts_params: dict) -> None:
    """Every mechanism claiming ts_parity must appear in the TS mirror's mechanism_identifiers."""
    listed = ts_params.get("mechanism_identifiers") or []
    if isinstance(listed, dict):
        listed = list(listed.keys())
    assert entry.name in listed, (
        f"{entry.name} claims ts_parity but is not in the TS mirror's mechanism_identifiers "
        f"({sorted(listed)}). Either add it to the mirror or drop the claim."
    )
