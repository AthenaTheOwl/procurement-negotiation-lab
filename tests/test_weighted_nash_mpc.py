"""Tests for the BGW MPC weighted-Nash mechanism (DEC-MPC-001).

Covers:

- field-arithmetic primitives (encode/decode/split/reconstruct round-trip)
- BGW secure addition + Beaver-triple secure multiplication
- sign-revealing secure comparison
- mechanism end-to-end: PRIVATE-mode run on golden fixture matches
  plaintext within ``MPC_NUMERICAL_TOLERANCE``
- TranscriptExposureReport carries ``protocol_version = "mpc-bgw/v1"``
  and the historical ``epsilon_measured = MPC_NEGLIGIBLE_BITS`` field
- N>=3 returns ``MechanismFailure`` with the documented note
- non-PRIVATE info modes fall back to plaintext-equivalent behavior
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import pytest

from procurement_lab.algorithms.weighted_nash import WeightedNashPlaintext
from procurement_lab.algorithms.weighted_nash_mpc import (
    MPC_FIXED_POINT_BITS,
    MPC_NEGLIGIBLE_BITS,
    MPC_NUMERICAL_TOLERANCE,
    MPC_PRIME,
    PROTOCOL_VERSION_MPC,
    WeightedNashMPC,
    beaver_triple,
    decode_fixed_point,
    encode_fixed_point,
    reconstruct,
    secure_add,
    secure_compare_sign_revealing,
    secure_mul,
    split_share,
)
from procurement_lab.engine.schemas import (
    Convergence,
    InformationMode,
    Participant,
    Role,
    Scenario,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "scenarios"


def _load_fixture(name: str) -> Scenario:
    data = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    data.pop("_comment", None)
    return Scenario.model_validate(data)


# ---- Field primitives ----------------------------------------------------


@pytest.mark.parametrize("value", [0.0, 1.0, -1.0, 12.5, -12.5, 1024.0, -7.125])
def test_encode_decode_round_trip(value: float) -> None:
    encoded = encode_fixed_point(value)
    decoded = decode_fixed_point(encoded)
    assert encoded < MPC_PRIME
    # 2 ** -MPC_FIXED_POINT_BITS quantization step is the worst-case error.
    assert abs(decoded - value) <= 2 ** -MPC_FIXED_POINT_BITS


def test_split_share_reconstructs_to_value() -> None:
    rng = random.Random(42)
    value = encode_fixed_point(123.456)
    shares = split_share(value, n_parties=2, rng=rng)
    assert len(shares) == 2
    assert all(0 <= s < MPC_PRIME for s in shares)
    assert reconstruct(shares) == value


def test_split_share_requires_at_least_two_parties() -> None:
    rng = random.Random(0)
    with pytest.raises(ValueError):
        split_share(0, n_parties=1, rng=rng)


# ---- BGW primitives ------------------------------------------------------


def test_secure_add_reconstructs_to_sum() -> None:
    rng = random.Random(1)
    a = encode_fixed_point(40.0)
    b = encode_fixed_point(2.0)
    shares_a = split_share(a, n_parties=2, rng=rng)
    shares_b = split_share(b, n_parties=2, rng=rng)
    shares_sum = secure_add(shares_a, shares_b)
    assert reconstruct(shares_sum) == (a + b) % MPC_PRIME
    assert abs(decode_fixed_point(reconstruct(shares_sum)) - 42.0) < 1e-9


def test_beaver_triple_invariant() -> None:
    rng = random.Random(7)
    triple = beaver_triple(n_parties=2, rng=rng)
    a = reconstruct(triple.a_shares)
    b = reconstruct(triple.b_shares)
    c = reconstruct(triple.c_shares)
    assert c == (a * b) % MPC_PRIME


def test_secure_mul_matches_field_product() -> None:
    rng = random.Random(11)
    x = encode_fixed_point(6.5)
    y = encode_fixed_point(4.0)
    shares_x = split_share(x, n_parties=2, rng=rng)
    shares_y = split_share(y, n_parties=2, rng=rng)
    triple = beaver_triple(n_parties=2, rng=rng)
    shares_xy = secure_mul(shares_x, shares_y, triple=triple)
    assert reconstruct(shares_xy) == (x * y) % MPC_PRIME


def test_secure_compare_returns_1_when_left_larger() -> None:
    rng = random.Random(13)
    x = encode_fixed_point(7.0)
    y = encode_fixed_point(3.0)
    shares_x = split_share(x, n_parties=2, rng=rng)
    shares_y = split_share(y, n_parties=2, rng=rng)
    assert secure_compare_sign_revealing(shares_x, shares_y, rng=rng) == 1


def test_secure_compare_returns_0_when_right_larger_or_equal() -> None:
    rng = random.Random(17)
    x = encode_fixed_point(2.0)
    y = encode_fixed_point(5.0)
    shares_x = split_share(x, n_parties=2, rng=rng)
    shares_y = split_share(y, n_parties=2, rng=rng)
    assert secure_compare_sign_revealing(shares_x, shares_y, rng=rng) == 0


# ---- Mechanism end-to-end -----------------------------------------------


def test_mpc_matches_plaintext_within_tolerance() -> None:
    """Golden parity contract from DEC-MPC-001 falsification_test."""
    scenario = _load_fixture("nash_mpc_basic.json")
    plain = WeightedNashPlaintext().run(scenario)
    mpc = WeightedNashMPC().run(
        scenario, information_mode=InformationMode.PRIVATE
    )
    assert plain.convergence == Convergence.CONVERGED
    assert mpc.convergence == Convergence.CONVERGED

    for party_id in (p.id for p in scenario.participants):
        q_plain = plain.iterations[-1].quantities[party_id][0]
        q_mpc = mpc.iterations[-1].quantities[party_id][0]
        assert abs(q_plain - q_mpc) <= MPC_NUMERICAL_TOLERANCE, (
            f"{party_id}: plain={q_plain}, mpc={q_mpc}, gap={abs(q_plain - q_mpc)}"
        )


def test_mpc_run_carries_leakage_report() -> None:
    scenario = _load_fixture("nash_mpc_basic.json")
    mpc = WeightedNashMPC().run(scenario)
    assert mpc.leakage_report is not None
    lr = mpc.leakage_report
    assert lr.protocol_version == PROTOCOL_VERSION_MPC
    assert lr.aggregate.max_epsilon_measured == pytest.approx(MPC_NEGLIGIBLE_BITS)
    assert lr.aggregate.max_epsilon_bound == pytest.approx(MPC_NEGLIGIBLE_BITS)
    assert lr.aggregate.max_exposure_bits_measured == pytest.approx(
        MPC_NEGLIGIBLE_BITS
    )
    assert lr.aggregate.max_exposure_bits_bound == pytest.approx(MPC_NEGLIGIBLE_BITS)
    assert lr.aggregate.all_within_bound is True
    assert lr.round_count >= 1
    assert len(lr.per_party) == 2
    for entry in lr.per_party:
        assert len(entry.message_log_hash) == 64
        assert "cryptographic guarantee" in entry.sufficiency_note


def test_mpc_run_is_deterministic_for_same_scenario() -> None:
    """Same scenario -> same allocation (DEC-MPC-001 replay determinism)."""
    scenario = _load_fixture("nash_mpc_basic.json")
    run_a = WeightedNashMPC().run(scenario)
    run_b = WeightedNashMPC().run(scenario)
    a = run_a.iterations[-1].quantities
    b = run_b.iterations[-1].quantities
    for pid in a:
        assert a[pid] == b[pid]


def _three_party_scenario() -> Scenario:
    base_scenario = _load_fixture("nash_mpc_basic.json")
    third = Participant(
        id="logistics",
        name="Logistics",
        role=Role.LOGISTICS,
        outside_option=0.0,
        utility_formula="0.5 * q",
        parameters={},
    )
    return base_scenario.model_copy(
        update={"participants": [*base_scenario.participants, third]}
    )


def test_mpc_returns_failure_for_n_ge_3() -> None:
    """N>=3 must return MechanismFailure per DEC-MPC-001 v1 NON-goal."""
    scenario = _three_party_scenario()
    run = WeightedNashMPC().run(scenario)
    assert run.convergence == Convergence.NO_DEAL
    assert run.failure is not None
    assert "MPC mode supports N=2 only" in run.failure.note


def test_mpc_n_periods_gt_1_fails() -> None:
    """v1 supports n_periods=1 only — same constraint as plaintext."""
    base = _load_fixture("nash_mpc_basic.json")
    scenario = base.model_copy(update={"n_periods": 2})
    run = WeightedNashMPC().run(scenario)
    assert run.convergence == Convergence.NO_DEAL
    assert run.failure is not None
    assert "n_periods=1 only" in run.failure.note


def test_mpc_non_private_mode_falls_back_to_plaintext() -> None:
    """The MPC mechanism delegates to plaintext when InformationMode != PRIVATE.

    This is the API-parity move: callers comparing mechanisms in
    FULL_ORACLE mode see one mechanism identifier across all algorithms
    and the MPC class behaves like its plaintext peer in that mode.
    """
    scenario = _load_fixture("nash_mpc_basic.json")
    plaintext_run = WeightedNashPlaintext().run(scenario)
    fallback_run = WeightedNashMPC().run(
        scenario, information_mode=InformationMode.FULL_ORACLE
    )
    # No exposure report in fallback mode because it's plaintext-equivalent.
    assert fallback_run.leakage_report is None
    assert (
        fallback_run.iterations[-1].quantities
        == plaintext_run.iterations[-1].quantities
    )


# ---- SDK integration -----------------------------------------------------


def test_sdk_registers_mpc_mechanism() -> None:
    """T-MPC-INT-001: SDK exposes the mechanism by identifier."""
    from procurement_mechanism_sdk.api import (
        DEFAULT_MECHANISMS,
        _algorithm_for,
    )

    assert "weighted_nash_mpc" in DEFAULT_MECHANISMS
    runner = _algorithm_for("weighted_nash_mpc")
    assert runner.__class__.__name__ == "WeightedNashMPC"


def test_sdk_default_info_mode_for_mpc_is_private() -> None:
    """T-MPC-INT-002: default info mode for the MPC mechanism is PRIVATE."""
    from procurement_mechanism_sdk.api import _default_information_mode

    mode = _default_information_mode("weighted_nash_mpc", None)
    assert mode == InformationMode.PRIVATE
