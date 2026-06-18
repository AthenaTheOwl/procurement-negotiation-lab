# algorithms

The lab compares eight paths:

- centralized oracle: upper bound, not deployable when utility functions cannot be shared
- ADMM-style coordination: local solves plus consensus/proximity signals
- alternating best response: each side reacts to the other's last quantity
- price-only dual update: a price signal moves supply and demand together
- consensus averaging: simple averaging toward local ideals
- weighted-Nash plaintext: reference solver for the weighted Nash
  bargaining objective with full utility visibility
- weighted-Nash bounded: iterative protocol that returns transcript-
  exposure accounting instead of exposing full utility functions
- weighted-Nash MPC: v1 BGW/additive-sharing path for two-party
  weighted-Nash comparison

The comparison shows when ADMM converges quickly, when simpler methods
are enough, when Nash bargaining improves the participation story, and
when extra disclosure-limiting machinery is worth its cost. It does not claim one
mechanism always wins.

Every algorithm returns the same trace schema: iterations, residual, runtime,
quantity, feasibility, local utilities, global utility, transfer, and utility
gap versus the centralized oracle.

The disclosure-limited mechanisms also return a `leakage_report`
field for compatibility. New UI copy should label it as transcript
exposure:

- weighted-Nash bounded reports measured transcript exposure against
  the protocol's declared upper bound
- MPC reports the v1 cryptographic contract and structured failure for
  unsupported shapes such as `N >= 3`

`leakage_report` is a legacy serialized field name. Its `epsilon_*`
properties are exposure-bit bounds, not differential-privacy epsilon.
