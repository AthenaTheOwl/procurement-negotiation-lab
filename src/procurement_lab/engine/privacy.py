"""Transcript-exposure bounded weighted-Nash protocol (DEC-NASH-002).

This module implements the iterative protocol the weighted-Nash
bargaining solver invokes when ``information_mode=PRIVATE``. It is a
disclosure-limiting protocol: parties do not send utility functions,
utility values, or BATNAs to the aggregator. It is not a differential-
privacy protocol and should not be described as one. The contract:

- Each round every party transmits ONE ``ProtocolMessage``:
  - ``direction``: ternary vector ({-1, 0, +1} per allocation coordinate)
    indicating sign of the party's local utility gradient.
  - ``step_proposal``: float bounded by the step-size schedule from
    DEC-NASH-001, quantized to ``STEP_QUANTIZATION_LEVELS = 32`` levels.
- The aggregator computes the next candidate allocation by summing the
  weighted directions; never sees utility values or functions.
- Stopping: when no party proposes a non-zero direction above tolerance,
  or after ``MAX_ROUNDS = 200``.

What is NEVER transmitted:
- Party utility functions
- Per-allocation utility values
- Party BATNAs (outside_option)

Transcript-exposure measurement per party (DEC-NASH-002 formula):
    exposure_bits_measured = round_count * (n_coords * log2(3) + log2(STEP_QUANTIZATION_LEVELS))

The bound is an information-theoretic upper bound on the bits of
utility-function information the transcript reveals about each party.
It is loose; the ``sufficiency_note`` field in the
TranscriptExposureReport makes this visible to the consumer.

This module owns the protocol logic; the weighted-Nash solver in
``algorithms/weighted_nash.py`` uses it. The schema lives in
``engine/schemas.py``. The file name stays ``privacy.py`` for import
compatibility with earlier revisions.
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass

from procurement_lab.engine.schemas import (
    AggregateTranscriptExposure,
    Participant,
    Scenario,
    TranscriptExposureParty,
    TranscriptExposureReport,
)
from procurement_lab.engine.utility import evaluate_participant_utility

# --- Protocol parameters (DEC-NASH-001 + DEC-NASH-002) ----------------------

PROTOCOL_VERSION: str = "transcript-exposure/v1"
LEGACY_PROTOCOL_VERSION: str = "bounded-leakage/v1"
STEP_QUANTIZATION_LEVELS: int = 32
MAX_ROUNDS: int = 200
CONVERGENCE_TOLERANCE: float = 1e-3

# Step schedule per DEC-NASH-001: eta_t = eta_0 / (1 + t) ** beta
# STEP_ETA_0 is the DIMENSIONLESS coefficient; the operational step size
# is scaled to the scenario's allocation upper bound via
# STEP_SCALE_FRACTION so the protocol traverses the feasible range
# inside MAX_ROUNDS regardless of allocation magnitude.
STEP_ETA_0: float = 0.5
STEP_BETA: float = 0.5
STEP_SCALE_FRACTION: float = 0.05  # initial step = 5% of upper_bound at t=0
                                   # (multiplied by STEP_ETA_0)

# Sufficiency note carried on every TranscriptExposureReport per DEC-NASH-002.
EXPOSURE_SUFFICIENCY_NOTE = (
    "transcript-exposure bit upper bound; not a differential-privacy guarantee"
)
LEAKAGE_SUFFICIENCY_NOTE = EXPOSURE_SUFFICIENCY_NOTE


def step_size(round_seq: int, upper_bound: float) -> float:
    """Step-size schedule from DEC-NASH-001. Round_seq starts at 0.

    Returns the step size in allocation units:
    ``eta_t = STEP_ETA_0 * STEP_SCALE_FRACTION * upper_bound / (1 + t) ** STEP_BETA``

    The scaling by ``upper_bound`` keeps the protocol's traversal
    capacity proportional to the allocation range so a 250-unit
    allocation range and a 25-unit allocation range both converge in
    the same number of rounds.
    """
    return float(
        STEP_ETA_0
        * STEP_SCALE_FRACTION
        * upper_bound
        / (1.0 + round_seq) ** STEP_BETA
    )


def declared_exposure_bit_bound(round_count: int, n_coords: int) -> float:
    """Per-protocol-version declared upper bound on transcript exposure.

    The bound is the information-theoretic worst case: each round
    transmits at most ``n_coords * log2(3)`` bits via the ternary
    direction vector and ``log2(STEP_QUANTIZATION_LEVELS)`` bits via
    the step_proposal. The bound is identical to
    ``exposure_bits_measured`` in this protocol version because every
    message uses the full
    information budget; future protocol revisions can lower the bound
    while keeping the measurement, or vice versa.
    """
    per_round = n_coords * math.log2(3) + math.log2(STEP_QUANTIZATION_LEVELS)
    return float(round_count * per_round)


def declared_epsilon_bound(round_count: int, n_coords: int) -> float:
    """Compatibility alias for ``declared_exposure_bit_bound``."""
    return declared_exposure_bit_bound(round_count, n_coords)


# --- Protocol message ------------------------------------------------------


@dataclass(frozen=True)
class ProtocolMessage:
    """One per-round per-party message in the transcript-exposure protocol.

    Wire shape matches the DEC-NASH-002 contract: round_seq, party_id,
    direction (ternary), step_proposal (quantized), protocol_version.
    Utility values + functions are NEVER on the wire.
    """

    round_seq: int
    party_id: str
    direction: tuple[int, ...]  # each entry in {-1, 0, +1}
    step_proposal: float  # quantized to STEP_QUANTIZATION_LEVELS
    protocol_version: str = PROTOCOL_VERSION

    def __post_init__(self) -> None:
        for d in self.direction:
            if d not in (-1, 0, 1):
                raise ValueError(
                    f"direction entries must be in {{-1, 0, +1}}; got {d}"
                )

    def to_canonical_json(self) -> str:
        return json.dumps(
            {
                "round_seq": self.round_seq,
                "party_id": self.party_id,
                "direction": list(self.direction),
                "step_proposal": self.step_proposal,
                "protocol_version": self.protocol_version,
            },
            sort_keys=True,
            separators=(",", ":"),
        )


# --- Quantization helper ---------------------------------------------------


def quantize_step(raw: float, eta_max: float) -> float:
    """Quantize a step proposal to STEP_QUANTIZATION_LEVELS levels.

    Maps the raw value (assumed bounded by ``[-eta_max, eta_max]``) to
    one of ``STEP_QUANTIZATION_LEVELS`` discrete points symmetric around
    zero. The quantization is part of the DEC-NASH-002 exposure bound:
    each step_proposal carries at most ``log2(STEP_QUANTIZATION_LEVELS)``
    bits about the party's gradient magnitude.
    """
    if eta_max <= 0:
        return 0.0
    clipped = max(-eta_max, min(eta_max, raw))
    # STEP_QUANTIZATION_LEVELS bins from -eta_max..+eta_max inclusive at endpoints
    n_intervals = STEP_QUANTIZATION_LEVELS - 1
    bin_index = round((clipped + eta_max) / (2 * eta_max) * n_intervals)
    return (bin_index / n_intervals) * 2 * eta_max - eta_max


# --- Local party computation (private; runs in each party's "context") -----


def party_gradient_direction(
    participant: Participant,
    scenario: Scenario,
    candidate: list[float],
    epsilon_for_finite_diff: float = 1.0,
) -> tuple[int, ...]:
    """Compute the ternary sign of the party's local utility gradient.

    For each allocation coordinate, evaluate utility at candidate plus
    and minus a small epsilon perturbation, then take the sign of the
    finite-difference gradient. Returns -1 / 0 / +1 per coordinate.

    The gradient sign is what gets transmitted in the protocol; the
    raw gradient values stay private to the party.
    """
    n = len(candidate)
    direction: list[int] = []
    for i in range(n):
        plus = candidate.copy()
        minus = candidate.copy()
        plus[i] = max(0.0, plus[i] + epsilon_for_finite_diff)
        minus[i] = max(0.0, minus[i] - epsilon_for_finite_diff)
        u_plus = evaluate_participant_utility(participant, scenario, plus)
        u_minus = evaluate_participant_utility(participant, scenario, minus)
        diff = u_plus - u_minus
        if diff > CONVERGENCE_TOLERANCE:
            direction.append(+1)
        elif diff < -CONVERGENCE_TOLERANCE:
            direction.append(-1)
        else:
            direction.append(0)
    return tuple(direction)


def party_step_proposal(
    participant: Participant,
    scenario: Scenario,
    candidate: list[float],
    round_seq: int,
    upper_bound: float,
    epsilon_for_finite_diff: float = 1.0,
) -> float:
    """Propose a step size for this round bounded by the schedule.

    The party always proposes the maximum allowed step ``eta_t``
    (in allocation units). Direction is what carries the gradient
    sign; step magnitude is the bounded schedule. The proposal is
    quantized to ``STEP_QUANTIZATION_LEVELS`` levels symmetric around
    zero before transmission so the exposure formula in DEC-NASH-002
    holds (``log2(STEP_QUANTIZATION_LEVELS)`` bits per step).

    The party still computes its local gradient magnitude (kept
    private) to check whether it has an improving direction — if the
    finite-difference gradient is below ``CONVERGENCE_TOLERANCE`` the
    direction will be zero and the proposed step will not move the
    aggregator's candidate.
    """
    eta_t = step_size(round_seq, upper_bound)
    return quantize_step(eta_t, eta_t)


# --- Aggregator update -----------------------------------------------------


def aggregate_next_candidate(
    messages: list[ProtocolMessage],
    candidate: list[float],
    weights: dict[str, float],
    upper_bound: float,
) -> list[float]:
    """Aggregator update: combine per-party directions into a new candidate.

    The aggregator NEVER sees utility values. It receives only the
    direction (ternary) and step_proposal (quantized) from each party,
    weighted by the public bargaining-power weights.

    Update rule: new_q[i] = clip(q[i] + sum_p alpha_p * dir_p[i] * step_p, 0, upper_bound)
    """
    n = len(candidate)
    delta = [0.0] * n
    for msg in messages:
        w = weights.get(msg.party_id, 1.0)
        for i in range(n):
            delta[i] += w * msg.direction[i] * msg.step_proposal
    return [max(0.0, min(upper_bound, candidate[i] + delta[i])) for i in range(n)]


# --- Top-level protocol runner ---------------------------------------------


@dataclass(frozen=True)
class ProtocolOutcome:
    """Result of running the transcript-exposure protocol on a scenario."""

    final_allocation: list[float]
    rounds_used: int
    converged: bool
    leakage_report: TranscriptExposureReport
    final_residual: float


def run_transcript_exposure_protocol(
    scenario: Scenario,
    *,
    weights: dict[str, float],
    initial_allocation: list[float],
    upper_bound: float,
    run_id: str,
    seed: int = 0,
) -> ProtocolOutcome:
    """Run the transcript-exposure protocol to convergence.

    Returns the final allocation, a TranscriptExposureReport, and per-party
    message-log hashes. The protocol is deterministic given the seed
    and inputs (no random sampling — every transmitted bit is derived
    from the candidate and the party's utility).

    The seed is recorded in the TranscriptExposureReport for the per-run record
    even though the v1 protocol does not currently use randomness; the
    field preserves the contract for future protocol revisions that
    add stochastic exploration.
    """
    n_coords = len(initial_allocation)
    candidate = list(initial_allocation)
    per_party_logs: dict[str, list[ProtocolMessage]] = {
        p.id: [] for p in scenario.participants
    }
    converged = False
    rounds_used = 0
    final_residual = 0.0

    for round_seq in range(MAX_ROUNDS):
        rounds_used = round_seq + 1
        messages: list[ProtocolMessage] = []
        for participant in scenario.participants:
            direction = party_gradient_direction(participant, scenario, candidate)
            step = party_step_proposal(
                participant, scenario, candidate, round_seq, upper_bound
            )
            msg = ProtocolMessage(
                round_seq=round_seq,
                party_id=participant.id,
                direction=direction,
                step_proposal=step,
            )
            messages.append(msg)
            per_party_logs[participant.id].append(msg)

        # Stopping condition: all parties report a zero direction (no
        # improvement possible above tolerance).
        if all(all(d == 0 for d in m.direction) for m in messages):
            converged = True
            final_residual = 0.0
            break

        new_candidate = aggregate_next_candidate(
            messages, candidate, weights, upper_bound
        )
        # Track residual as the L2 movement between candidates.
        final_residual = math.sqrt(
            sum((new_candidate[i] - candidate[i]) ** 2 for i in range(n_coords))
        )
        candidate = new_candidate

        if final_residual < CONVERGENCE_TOLERANCE:
            converged = True
            break

    # Build TranscriptExposureReport per DEC-NASH-002.
    exposure_bound = declared_exposure_bit_bound(rounds_used, n_coords)
    per_party_entries: list[TranscriptExposureParty] = []
    for participant in scenario.participants:
        log = per_party_logs[participant.id]
        # Hash the message log in canonical form.
        canonical = "[" + ",".join(m.to_canonical_json() for m in log) + "]"
        log_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        per_party_entries.append(
            TranscriptExposureParty(
                party_id=participant.id,
                epsilon_bound=exposure_bound,
                # epsilon_measured is the legacy serialized field name.
                # It equals the exposure bound in v1 because every
                # message uses the full information budget; future
                # versions may lower the measurement.
                epsilon_measured=exposure_bound,
                round_count=rounds_used,
                message_log_hash=log_hash,
                sufficiency_note=EXPOSURE_SUFFICIENCY_NOTE,
            )
        )
    aggregate = AggregateTranscriptExposure(
        max_epsilon_measured=max(p.epsilon_measured for p in per_party_entries),
        max_epsilon_bound=max(p.epsilon_bound for p in per_party_entries),
        all_within_bound=all(
            p.epsilon_measured <= p.epsilon_bound for p in per_party_entries
        ),
    )
    report = TranscriptExposureReport(
        protocol_version=PROTOCOL_VERSION,
        run_id=run_id,
        seed=seed,
        round_count=rounds_used,
        per_party=per_party_entries,
        aggregate=aggregate,
    )

    return ProtocolOutcome(
        final_allocation=candidate,
        rounds_used=rounds_used,
        converged=converged,
        leakage_report=report,
        final_residual=final_residual,
    )


def run_bounded_leakage_protocol(
    scenario: Scenario,
    *,
    weights: dict[str, float],
    initial_allocation: list[float],
    upper_bound: float,
    run_id: str,
    seed: int = 0,
) -> ProtocolOutcome:
    """Compatibility alias for ``run_transcript_exposure_protocol``."""
    return run_transcript_exposure_protocol(
        scenario,
        weights=weights,
        initial_allocation=initial_allocation,
        upper_bound=upper_bound,
        run_id=run_id,
        seed=seed,
    )
