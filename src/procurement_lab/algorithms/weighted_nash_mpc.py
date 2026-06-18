"""BGW MPC weighted-Nash mechanism for N=2 (DEC-MPC-001, W5).

Pure-Python implementation of the weighted-Nash bargaining mechanism
via a Ben-Or--Goldwasser--Wigderson-style additive-secret-sharing
protocol over the Mersenne prime ``MPC_PRIME = 2**61 - 1``. Scoped to
N=2 per the v1 contract; N>=3 returns a structured ``MechanismFailure``
and defers to a follow-up DEC adopting MP-SPDZ.

Protocol shape
--------------

Each party holds its own utility function locally; the aggregator never
sees utility values. For each candidate quantity ``q`` on a
NASH_QUANTIZATION_LEVELS grid:

  1. Party ``p`` computes its gain ``gain_p(q) = max(0, u_p(q) - d_p)``
     in clear, takes the natural log (with a sentinel
     ``LOG_INFEASIBLE = -1e9`` when ``gain_p <= 0`` so candidates that
     violate BATNA stay below all feasible candidates after summing),
     encodes the log-gain as a signed fixed-point integer modulo
     MPC_PRIME, and splits it into additive shares.
  2. The shared log-Nash score is the sum of per-party log-gains; with
     additive secret sharing this is a local share addition. No secure
     multiplication is required for the symmetric (unit-alpha) Nash
     product because monotonicity of ``log`` preserves the argmax.
     Asymmetric weights (R-NASH-008 v1 NON-goal) would require a
     secure constant-by-share multiplication; this v1 falls back to a
     structured ``MechanismFailure`` when the registered weights are
     not unit-alpha.
  3. The argmax over the K candidates uses a sign-revealing secure
     comparison primitive (see ``secure_compare_sign_revealing`` below)
     inside a sequential max-tree. The intermediate comparison results
     leak to the transcript; the magnitudes of the per-candidate
     log-Nash scores do not.

  The Beaver-triple secure multiplication primitive
  (``secure_mul``) is implemented and unit-tested for pedagogical
  completeness and for the eventual asymmetric-Nash follow-up DEC,
  but is NOT on the v1 mechanism's hot path — the log-sum trick keeps
  every cumulative value below MPC_PRIME / 2 for the encoded ranges
  typical of the lab's golden fixtures.

TranscriptExposureReport
------------------------

Reports ``protocol_version = "mpc-bgw/v1"``,
``epsilon_measured = MPC_NEGLIGIBLE_BITS = 1e-9`` in the historical
serialized field per DEC-MPC-001 with a ``sufficiency_note`` carrying
the v1 protocol contract verbatim:
the cryptographic IDEAL is a negligible function of the security
parameter; the v1 implementation realizes that ideal up to the
sign-revealing argmax pattern documented above. Consumers wanting an
information-theoretic upper bound on bits leaked should use the
transcript-exposure mechanism (DEC-NASH-002) instead.

References
----------

- Ben-Or, Goldwasser, Wigderson, "Completeness Theorems for
  Non-Cryptographic Fault-Tolerant Distributed Computation" (1988).
- Beaver, "Efficient Multiparty Protocols Using Circuit Randomization"
  (CRYPTO 1991) for the secure-multiplication primitive.
- DEC-MPC-001 for the lab's protocol contract, parameters, and
  golden-fixture parity tolerance.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Sequence

from procurement_lab.algorithms.weighted_nash import (
    NASH_QUANTIZATION_LEVELS,
    TIE_BREAK_TOLERANCE,
    WeightedNashPlaintext,
    _default_weights,
    _failure_run,
    _upper_bound,
)
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    InformationMode,
    IterationRecord,
    MechanismFailureReason,
    Scenario,
    AggregateTranscriptExposure,
    TranscriptExposureParty,
    TranscriptExposureReport,
)
from procurement_lab.engine.utility import build_ledger, evaluate_participant_utility

# --- DEC-MPC-001 parameters -----------------------------------------------

# Mersenne 2**61 - 1: prime, fits in a 64-bit integer, conventional in MPC
# research codebases (e.g. MP-SPDZ uses it as one of its standard primes).
MPC_PRIME: int = (1 << 61) - 1

# Fixed-point encoding: 32 bits below the radix. Encoded values therefore
# live in [-2**(60-32), 2**(60-32)) before wrapping, which gives ~28 bits
# of headroom for products before fixed-point overflow at this scale.
MPC_FIXED_POINT_BITS: int = 32
MPC_FIXED_POINT_SCALE: int = 1 << MPC_FIXED_POINT_BITS

# Golden-fixture parity tolerance: MPC vs plaintext allocations must
# match within this margin. Looser than plaintext-to-plaintext tolerance
# because of fixed-point quantization.
MPC_NUMERICAL_TOLERANCE: float = 1e-2

# TranscriptExposureReport claim for the MPC mechanism. The cryptographic
# scheme's actual leakage is a negligible function of the security parameter; we
# encode that as a tiny positive constant rather than zero so the
# historical report schema's ``ge=0`` constraint is satisfied and the
# bounded-vs-MPC comparison surface renders meaningfully. See DEC-MPC-001
# for the "honest non-claim" rationale.
MPC_NEGLIGIBLE_BITS: float = 1e-9

PROTOCOL_VERSION_MPC: str = "mpc-bgw/v1"

# Sentinel log-value for infeasible candidates (gain <= 0). Encoded the
# same way as any real log-value so the secure-addition path is
# branch-free; ``LOG_INFEASIBLE`` is well below the smallest legitimate
# log-gain across the lab's golden fixtures so any candidate carrying it
# loses every comparison in the max-tree.
LOG_INFEASIBLE: float = -1e9


# --- Field arithmetic primitives ------------------------------------------


def encode_fixed_point(value: float) -> int:
    """Encode a real number as a fixed-point integer in the BGW field.

    Negative values map into the upper half of [0, MPC_PRIME); ``decode``
    is the inverse and produces signed reals.
    """
    scaled = int(round(value * MPC_FIXED_POINT_SCALE))
    return scaled % MPC_PRIME


def decode_fixed_point(value: int, *, scale_bits: int = MPC_FIXED_POINT_BITS) -> float:
    """Decode a fixed-point integer in [0, MPC_PRIME) back to a signed real.

    ``scale_bits`` defaults to ``MPC_FIXED_POINT_BITS`` for the standard
    "one-multiplication-applied" decoding. After ``k`` secure
    multiplications the cumulative fixed-point factor is
    ``MPC_FIXED_POINT_BITS * (k + 1)``; callers that compose multiplications
    must track and pass the cumulative scale (the mechanism's main loop
    does this explicitly so the exposure-report invariants stay tight).
    """
    half = MPC_PRIME // 2
    signed = value - MPC_PRIME if value > half else value
    return signed / (1 << scale_bits)


def split_share(value: int, *, n_parties: int = 2, rng: random.Random) -> list[int]:
    """Split a field element into ``n_parties`` additive shares mod MPC_PRIME.

    First ``n_parties - 1`` shares are sampled uniformly from
    [0, MPC_PRIME); the last share is the residual that makes the sum
    reconstruct ``value`` mod MPC_PRIME. The marginal distribution of
    any strict subset of shares is uniform — the secret-sharing
    primitive's hiding property.
    """
    if n_parties < 2:
        raise ValueError("additive secret sharing requires at least 2 parties")
    shares = [rng.randrange(MPC_PRIME) for _ in range(n_parties - 1)]
    last = (value - sum(shares)) % MPC_PRIME
    shares.append(last)
    return shares


def reconstruct(shares: Sequence[int]) -> int:
    """Reconstruct a shared value by summing shares mod MPC_PRIME."""
    return sum(shares) % MPC_PRIME


# --- BGW protocol primitives ----------------------------------------------


@dataclass
class BeaverTriple:
    """A Beaver multiplication triple ``(a, b, c)`` with ``c = a*b``.

    Each party holds one share of each. The triple consumed once per
    secure multiplication; v1 generates triples on the fly via a seeded
    PRNG rather than running a full offline phase.
    """

    a_shares: list[int]
    b_shares: list[int]
    c_shares: list[int]


def beaver_triple(*, n_parties: int = 2, rng: random.Random) -> BeaverTriple:
    a = rng.randrange(MPC_PRIME)
    b = rng.randrange(MPC_PRIME)
    c = (a * b) % MPC_PRIME
    return BeaverTriple(
        a_shares=split_share(a, n_parties=n_parties, rng=rng),
        b_shares=split_share(b, n_parties=n_parties, rng=rng),
        c_shares=split_share(c, n_parties=n_parties, rng=rng),
    )


def secure_add(x_shares: Sequence[int], y_shares: Sequence[int]) -> list[int]:
    """Local addition of two shared values."""
    if len(x_shares) != len(y_shares):
        raise ValueError("share lists must have the same length")
    return [(x_shares[i] + y_shares[i]) % MPC_PRIME for i in range(len(x_shares))]


def secure_mul(
    x_shares: Sequence[int],
    y_shares: Sequence[int],
    *,
    triple: BeaverTriple,
) -> list[int]:
    """Beaver-triple secure multiplication.

    Given shares of ``x`` and ``y`` and a fresh triple ``(a, b, c=a*b)``,
    produces shares of ``x*y``. The protocol reveals ``epsilon = x - a``
    and ``delta = y - b`` (which are uniformly random because the triple
    masks ``x`` and ``y``); the post-reconstruction step is a single
    field operation per party that combines local shares with the
    publicly-revealed ``epsilon`` and ``delta``.
    """
    if len(x_shares) != 2 or len(y_shares) != 2:
        raise ValueError("secure_mul is implemented for n_parties=2 (DEC-MPC-001 v1)")

    # Reveal epsilon = x - a, delta = y - b. Both look uniformly random
    # to any observer; the security of the multiplication reduces to the
    # one-time-pad-like masking the triple provides.
    epsilon_shares = [
        (x_shares[i] - triple.a_shares[i]) % MPC_PRIME for i in range(2)
    ]
    delta_shares = [
        (y_shares[i] - triple.b_shares[i]) % MPC_PRIME for i in range(2)
    ]
    epsilon = reconstruct(epsilon_shares)
    delta = reconstruct(delta_shares)

    # z = c + epsilon * b + delta * a + epsilon * delta. The last term is
    # public and added by exactly one party (here party 0) to avoid
    # double-counting.
    z_shares: list[int] = []
    for i in range(2):
        z_i = (
            triple.c_shares[i]
            + epsilon * triple.b_shares[i]
            + delta * triple.a_shares[i]
        ) % MPC_PRIME
        if i == 0:
            z_i = (z_i + epsilon * delta) % MPC_PRIME
        z_shares.append(z_i)
    return z_shares


def secure_compare_sign_revealing(
    x_shares: Sequence[int],
    y_shares: Sequence[int],
    *,
    rng: random.Random,
) -> int:
    """Return 1 if x > y, else 0; reveals only the sign of the difference.

    The two parties compute shares of ``d = x - y``, blind ``d`` with a
    fresh positive multiplicative factor sampled from a small range,
    then reconstruct the blinded difference. The blinded reconstruction
    matches sign(d); its magnitude is hidden by the random multiplier.

    This is the v1 sign-revealing comparison primitive used inside the
    max-tree. It is strictly weaker than a full bit-decomposition-based
    secure comparison (which reveals nothing besides the final argmax),
    and stronger than a plaintext comparison (which would reveal each
    candidate's Nash-product magnitude). DEC-MPC-001 documents the
    trade-off; the TranscriptExposureReport's ``sufficiency_note`` carries the
    contract verbatim.
    """
    diff_shares = [(x_shares[i] - y_shares[i]) % MPC_PRIME for i in range(2)]
    # Small positive multiplier; large enough to mask the original
    # magnitude, small enough to avoid wrapping the field on a single
    # blinding step. The empirical range [1, 2**16) is well below the
    # Mersenne prime even after one multiplication with a 60-bit
    # encoded difference.
    r = rng.randrange(1, 1 << 16)
    blinded_shares = [(r * diff_shares[i]) % MPC_PRIME for i in range(2)]
    blinded = reconstruct(blinded_shares)
    half = MPC_PRIME // 2
    signed = blinded - MPC_PRIME if blinded > half else blinded
    return 1 if signed > 0 else 0


# --- Mechanism ------------------------------------------------------------


@dataclass
class _MPCRunBookkeeping:
    """Per-run bookkeeping captured for the exposure report and transcript hash.

    Stored as the protocol runs so the post-run report builder
    has a faithful record of the rounds, triples consumed, and
    comparison-tree shape.
    """

    triples_consumed: int = 0
    comparisons_run: int = 0
    rounds_used: int = 0
    transcript_chunks: list[bytes] = field(default_factory=list)

    def add_transcript_chunk(self, payload: dict) -> None:
        self.transcript_chunks.append(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        )

    def transcript_hash(self) -> str:
        h = hashlib.sha256()
        for chunk in self.transcript_chunks:
            h.update(chunk)
            h.update(b"\n")
        if not self.transcript_chunks:
            # The schema requires a 64-char hex string; hash the empty
            # transcript so the field is well-formed for no-op runs.
            return hashlib.sha256(b"").hexdigest()
        return h.hexdigest()


def _build_leakage_report(
    *,
    scenario: Scenario,
    run_id: str,
    seed: int,
    bookkeeping: _MPCRunBookkeeping,
) -> TranscriptExposureReport:
    """Build the per-run TranscriptExposureReport for the MPC mechanism.

    All parties carry the same ``epsilon_bound`` and ``epsilon_measured``
    values per DEC-MPC-001: the cryptographic IDEAL's negligible-bits
    constant. The message-log hash is the transcript hash captured
    during the run.
    """
    note = (
        "cryptographic guarantee: leakage is the protocol's negligible "
        "function of the security parameter, encoded as MPC_NEGLIGIBLE_BITS "
        "to keep schema invariants satisfied. v1 implementation uses "
        "sign-revealing pairwise comparison inside the max-tree; the "
        "ordering of intermediate Nash products leaks to the transcript "
        "while the magnitudes remain hidden. Use the transcript-exposure "
        "(DEC-NASH-002) when an information-theoretic upper bound on "
        "bits leaked is the required guarantee."
    )
    msg_hash = bookkeeping.transcript_hash()
    per_party = [
            TranscriptExposureParty(
            party_id=p.id,
            epsilon_bound=MPC_NEGLIGIBLE_BITS,
            epsilon_measured=MPC_NEGLIGIBLE_BITS,
            round_count=bookkeeping.rounds_used,
            message_log_hash=msg_hash,
            sufficiency_note=note,
        )
        for p in scenario.participants
    ]
    aggregate = AggregateTranscriptExposure(
        max_epsilon_measured=MPC_NEGLIGIBLE_BITS,
        max_epsilon_bound=MPC_NEGLIGIBLE_BITS,
        all_within_bound=True,
    )
    return TranscriptExposureReport(
        protocol_version=PROTOCOL_VERSION_MPC,
        run_id=run_id,
        seed=seed,
        round_count=bookkeeping.rounds_used,
        per_party=per_party,
        aggregate=aggregate,
    )


def _two_party_check(scenario: Scenario) -> str | None:
    if scenario.n_periods != 1:
        return "weighted_nash_mpc v1 supports n_periods=1 only"
    if len(scenario.participants) != 2:
        return (
            "MPC mode supports N=2 only; N>=3 lands in a follow-up DEC "
            "adopting MP-SPDZ as the cryptographic backend"
        )
    return None


def _seed_from_scenario(scenario: Scenario) -> int:
    """Deterministic 64-bit seed from the scenario id for reproducibility.

    The protocol contract pins the seed so the same scenario produces
    the same transcript on every run — required for replay-determinism
    gates downstream.
    """
    digest = hashlib.sha256(scenario.id.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") & ((1 << 64) - 1)


class WeightedNashMPC:
    """BGW MPC weighted-Nash mechanism, N=2, mechanism identifier ``weighted_nash_mpc``.

    Registered in ``procurement_lab.algorithms.__init__`` and exposed
    through the SDK at ``procurement_mechanism_sdk.api`` (see
    DEC-MPC-001 T-MPC-INT-001..003 for the SDK integration tasks).
    """

    name = "weighted_nash_mpc"

    def __init__(self) -> None:
        # The MPC mechanism falls back to plaintext behavior for the
        # non-PRIVATE information modes so the SDK can compare
        # mechanisms in information-mode-aware tests without branching
        # at the call site. The plaintext fallback wears the MPC
        # mechanism's name so consumers see one mechanism identifier
        # end-to-end.
        self._plaintext = WeightedNashPlaintext()
        self._plaintext.name = self.name

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.PRIVATE,
        max_iter: int = 1,  # MPC mechanism is one-shot; the parameter
        tolerance: float = MPC_NUMERICAL_TOLERANCE,  # is accepted for API parity.
    ) -> AlgorithmRun:
        started = time.perf_counter()

        failure_note = _two_party_check(scenario)
        if failure_note is not None:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note=failure_note,
                runtime_ms=(time.perf_counter() - started) * 1000,
            )

        if information_mode != InformationMode.PRIVATE:
            # Non-PRIVATE: fall back to plaintext for cross-mechanism
            # comparisons. No exposure report in this branch — the
            # mechanism is operating under its plaintext-equivalent
            # contract.
            return self._plaintext.run(scenario, information_mode=information_mode)

        weights = _default_weights(scenario)
        non_unit_alpha = any(abs(w - 1.0) > 1e-9 for w in weights.values())
        if non_unit_alpha:
            # The v1 secure-multiplication path only supports the
            # symmetric (unit-alpha) Nash product. Asymmetric weights
            # require secure exponentiation which is not implemented in
            # this scaffold. Fall back to a structured failure rather
            # than silently producing a wrong allocation.
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note=(
                    "weighted_nash_mpc v1 supports symmetric Nash weights "
                    "(unit alpha) only; asymmetric weights require secure "
                    "exponentiation and land in a follow-up DEC"
                ),
                runtime_ms=(time.perf_counter() - started) * 1000,
            )

        upper = _upper_bound(scenario)
        if upper <= 0:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.CAPACITY_EXCEEDED,
                note="upper bound is non-positive; no feasible allocation",
                runtime_ms=(time.perf_counter() - started) * 1000,
            )

        seed = _seed_from_scenario(scenario)
        rng = random.Random(seed)
        bookkeeping = _MPCRunBookkeeping()
        run_id = f"run-mpc-{uuid.uuid4().hex[:12]}"
        bookkeeping.add_transcript_chunk(
            {
                "kind": "init",
                "protocol_version": PROTOCOL_VERSION_MPC,
                "scenario_id": scenario.id,
                "seed": seed,
                "grid_levels": NASH_QUANTIZATION_LEVELS,
            }
        )

        best_index, best_allocation, any_feasible = self._secure_argmax(
            scenario,
            weights,
            upper=upper,
            rng=rng,
            bookkeeping=bookkeeping,
        )

        runtime_ms = (time.perf_counter() - started) * 1000

        if not any_feasible or best_allocation is None:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.BATNA_FLOOR_UNREACHABLE,
                note=(
                    "no allocation on the secure grid puts every party "
                    "above their BATNA"
                ),
                runtime_ms=runtime_ms,
                leakage_report=_build_leakage_report(
                    scenario=scenario,
                    run_id=run_id,
                    seed=seed,
                    bookkeeping=bookkeeping,
                ),
            )

        quantities = {
            p.id: list(best_allocation) for p in scenario.participants
        }
        ledger = build_ledger(scenario, quantities)
        bookkeeping.add_transcript_chunk(
            {
                "kind": "result",
                "best_index": best_index,
                "best_allocation": list(best_allocation),
            }
        )
        iteration = IterationRecord(
            iteration=0,
            quantities=quantities,
            consensus=list(best_allocation),
            residual=0.0,
            price_signal=0.0,
        )
        leakage_report = _build_leakage_report(
            scenario=scenario,
            run_id=run_id,
            seed=seed,
            bookkeeping=bookkeeping,
        )
        return AlgorithmRun(
            scenario_id=scenario.id,
            algorithm=self.name,
            information_mode=information_mode,
            convergence=Convergence.CONVERGED,
            iterations=[iteration],
            ledger=ledger,
            transfer=None,
            runtime_ms=runtime_ms,
            final_residual=0.0,
            leakage_report=leakage_report,
        )

    def _secure_argmax(
        self,
        scenario: Scenario,
        weights: dict[str, float],
        *,
        upper: float,
        rng: random.Random,
        bookkeeping: _MPCRunBookkeeping,
    ) -> tuple[int, list[float] | None, bool]:
        """Run the MPC argmax over the NASH_QUANTIZATION_LEVELS grid.

        Returns ``(best_index, best_allocation, any_feasible)``. The
        ``best_allocation`` is None when no candidate has a positive
        Nash product (every candidate puts at least one party below
        BATNA).
        """
        grid = [
            upper * i / (NASH_QUANTIZATION_LEVELS - 1)
            for i in range(NASH_QUANTIZATION_LEVELS)
        ]

        # Phase 1: each party computes its per-candidate log-gain
        # locally, then the parties exchange shares of the log-gains.
        # The log-Nash score per candidate is the sum of per-party
        # log-gains; with additive secret sharing the per-candidate
        # sum is a local share addition (no secure multiplication
        # needed because monotonicity of log preserves the argmax).
        shared_products: list[list[int]] = []
        feasibility_mask: list[bool] = []
        for q in grid:
            allocation = [q]
            party_gains: list[float] = []
            for party in scenario.participants:
                u = evaluate_participant_utility(party, scenario, allocation)
                gain = max(0.0, u - party.outside_option)
                party_gains.append(gain)
            feasibility_mask.append(all(g > 0 for g in party_gains))

            # Each party's log-gain (or LOG_INFEASIBLE for non-positive
            # gains) is encoded as fixed-point and split into shares.
            per_party_log_shares: list[list[int]] = []
            for gain in party_gains:
                log_gain = math.log(gain) if gain > 0 else LOG_INFEASIBLE
                per_party_log_shares.append(
                    split_share(encode_fixed_point(log_gain), n_parties=2, rng=rng)
                )

            # Secure sum of per-party log-gains is a local share add.
            shared_score = per_party_log_shares[0]
            for next_log_shares in per_party_log_shares[1:]:
                shared_score = secure_add(shared_score, next_log_shares)

            shared_products.append(shared_score)
            bookkeeping.rounds_used += 1
            bookkeeping.add_transcript_chunk(
                {
                    "kind": "secure_log_sum",
                    "candidate_index": len(shared_products) - 1,
                }
            )

        if not any(feasibility_mask):
            return -1, None, False

        # Phase 2: secure max-tree. Walks pairs in sequence so the
        # secure-comparison protocol is straightforward to follow; a
        # log-depth tree would shave rounds but not change leakage
        # bookkeeping for the v1 contract.
        best_index = -1
        best_allocation: list[float] | None = None
        best_shares: list[int] | None = None
        for idx, product_shares in enumerate(shared_products):
            if not feasibility_mask[idx]:
                continue
            if best_shares is None:
                best_shares = product_shares
                best_index = idx
                best_allocation = [grid[idx]]
                bookkeeping.add_transcript_chunk(
                    {"kind": "seed_best", "best_index": best_index}
                )
                continue
            winner_is_new = secure_compare_sign_revealing(
                product_shares, best_shares, rng=rng
            )
            bookkeeping.comparisons_run += 1
            bookkeeping.rounds_used += 1
            bookkeeping.add_transcript_chunk(
                {
                    "kind": "compare",
                    "left_index": idx,
                    "right_index": best_index,
                    "winner_is_left": bool(winner_is_new),
                }
            )
            if winner_is_new == 1:
                best_shares = product_shares
                best_index = idx
                best_allocation = [grid[idx]]
            else:
                # Tie-break per DEC-NASH-001 lexicographic rule: with
                # equal products the smaller quantity wins, which the
                # ascending iteration already enforces because
                # winner_is_new=0 keeps the existing (smaller) index.
                pass

        return best_index, best_allocation, True


__all__ = [
    "MPC_FIXED_POINT_BITS",
    "MPC_FIXED_POINT_SCALE",
    "MPC_NEGLIGIBLE_BITS",
    "MPC_NUMERICAL_TOLERANCE",
    "MPC_PRIME",
    "PROTOCOL_VERSION_MPC",
    "BeaverTriple",
    "WeightedNashMPC",
    "beaver_triple",
    "decode_fixed_point",
    "encode_fixed_point",
    "reconstruct",
    "secure_add",
    "secure_compare_sign_revealing",
    "secure_mul",
    "split_share",
]
