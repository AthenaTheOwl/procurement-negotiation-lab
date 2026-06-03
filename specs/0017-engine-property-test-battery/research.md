# research: engine property test battery

## Bibliography

### Property-based testing

- Claessen, K., Hughes, J. (2000). "QuickCheck: A Lightweight Tool
  for Random Testing of Haskell Programs". *ICFP 2000*. Origin paper
  for the property-based testing approach that Hypothesis adapts to
  Python.
- MacIver, D. (2019). "Hypothesis: a new approach to property-based
  testing". *PyCon UK*. Background on the strategy + shrinking model
  spec 0017 relies on.

### Mechanism correctness invariants

- Roth, A. E. (1979). *Axiomatic Models of Bargaining*. Section 3
  enumerates the bargaining axioms (Pareto efficiency, individual
  rationality, symmetry, independence) that R-PROP-002, R-PROP-004,
  R-PROP-008 encode.
- Myerson, R. B. (1991). *Game Theory: Analysis of Conflict*. Section
  8.6 on the Nash bargaining solution's monotonicity properties; basis
  for R-PROP-004.

### Numerical stability

- Trefethen, L. N., Bau, D. (1997). *Numerical Linear Algebra*.
  Standard reference on perturbation analysis and condition numbers;
  Lipschitz-constant framing for R-PROP-010 follows the chapter on
  conditioning.
- Higham, N. J. (2002). *Accuracy and Stability of Numerical
  Algorithms*, 2nd ed. Reference for floating-point tolerance bounds
  documented in DEC-PROP-001.

### MPC correctness testing

- Lindell, Y. (2017). "How To Simulate It - A Tutorial on the
  Simulation Proof Technique". *Tutorials on the Foundations of
  Cryptography*. Methodology for verifying MPC mechanism correctness;
  spec 0017 R-PROP-006 references the leakage-bound formulation here
  for the cryptographic-mechanism branch.

## Open research questions

1. **Pareto enumeration cost**. R-PROP-008 enumerates the feasible
   frontier on small action sets; the tractability cap is set in
   DEC-PROP-001. Future work explores Monte Carlo Pareto verification
   for larger action sets.
2. **Lipschitz constants per mechanism**. R-PROP-010 requires each
   mechanism to declare a Lipschitz constant for the
   stability check. Some mechanisms (notably ADMM with default
   step-size) do not have a closed-form Lipschitz constant; a
   follow-up DEC tracks empirical bounds.
3. **Hypothesis shrinking on real-valued strategies**. Hypothesis's
   shrinking for floating-point strategies can produce counterexamples
   that depend on FPU semantics. The fixed-seed plus the
   `.hypothesis/` artifact upload mitigate this; a follow-up
   investigation pins shrinker behavior more tightly if needed.

## Tool references

- Hypothesis docs: https://hypothesis.readthedocs.io/
- pytest-timeout docs: https://pytest-timeout.readthedocs.io/
