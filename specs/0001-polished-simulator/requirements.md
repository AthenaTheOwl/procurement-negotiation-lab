# requirements: polished procurement simulator

## Scope

Build `procurement-negotiation-lab` as a public learning simulator and lab for
long-lead procurement coordination. The product teaches the mechanics before it
exposes the math.

Primary app stack: React, TypeScript, Vite.

Python stack: reference model, safety checks, and regression tests.

## Requirements

### R-PLAY-001: role clarity

WHEN a visitor opens the app, THE SYSTEM SHALL make the player role explicit in
plain English before any metric or algorithm is shown.

Acceptance:

- First viewport says the user is Maya, the buyer.
- First viewport says Cinder is the simulated supplier.
- First viewport names the player's job: reserve enough long-lead capacity
  without overcommitting before demand is certain.

### R-PLAY-002: one decision per round

WHEN the player is in PLAY mode, THE SYSTEM SHALL show exactly one decision
moment at a time.

Acceptance:

- A round has a briefing, a decision panel, and a consequence reveal.
- The next round is not shown until the player advances past the reveal.
- Each decision option explains "what you are saying", upside, and risk.

### R-PLAY-003: consequence before math

WHEN a player chooses an option, THE SYSTEM SHALL explain what happened in
business language before showing quantities, residuals, utilities, or gaps.

Acceptance:

- Reveal screen starts with Cinder's response and a plain-English consequence.
- Math appears under an "under the hood" section.
- No term appears without a definition nearby.

### R-PLAY-004: teach terms in context

WHEN the app uses a technical term, THE SYSTEM SHALL provide a plain-English
definition at point of use.

Required terms:

- utility
- residual
- risk score
- oracle gap
- ADMM
- CBT / surplus transfer
- information mode

### R-LAB-001: lab as experiment arena

WHEN the visitor enters LAB mode, THE SYSTEM SHALL frame the lab as experiments
on the same fixed problem, not as an unexplained configuration form.

Acceptance:

- LAB opens with "what question this experiment answers."
- Controls are grouped as scenario, algorithm, information, and market shape.
- Every metric has a plain-English label.

### R-LAB-002: compare algorithms without crowning ADMM

WHEN the visitor runs an algorithm comparison, THE SYSTEM SHALL compare ADMM
against at least four alternatives and report quality, speed, feasibility, and
agreement.

Algorithms:

- centralized oracle
- ADMM
- alternating best response
- price-only coordination
- consensus averaging

### R-LAB-003: value of information

WHEN the visitor changes information mode, THE SYSTEM SHALL show how more shared
information changes joint value, privacy exposure, and agreement.

### R-LAB-004: transfers and no-worse-off proof

WHEN the visitor opens the transfer experiment, THE SYSTEM SHALL show whether
the surplus can be split so all parties are no worse off than their outside
options.

### R-STUDY-001: tutorial as learning aid

WHEN the visitor opens STUDY mode, THE SYSTEM SHALL explain the simulator in
plain words, with formulas as optional detail.

Required sections:

- The story map
- Utility functions
- Coordination algorithms
- Information and uncertainty
- CBT and no-worse-off participation
- Synthetic data boundary

### R-SPEC-001: spec-driven loop

WHEN implementation changes, THE SYSTEM SHALL keep specs, tasks, tests, and
proof gates traceable.

Acceptance:

- `specs/0001-polished-simulator/traceability.md` maps requirements to files and
  tests.
- `scripts/spec_check.py` fails if required spec artifacts are missing.
- CI or local proof gates run Python tests and frontend tests.

## Non-goals

- No live procurement data.
- No official Amazon or FloPro-branded demo.
- No LLM-generated decisions in v1.
- No user accounts or multiplayer classroom dashboard in v1.
- No hosted dependency on commercial solvers.
