# research: weighted-Nash preference-private bargaining

## Bibliography

### Foundational bargaining theory

- Nash, J. F. (1950). "The Bargaining Problem". *Econometrica* 18(2):
  155-162. Origin of the Nash bargaining solution as the unique
  outcome satisfying invariance, symmetry, Pareto efficiency, and
  independence of irrelevant alternatives.
- Kalai, E. (1977). "Nonsymmetric Nash Solutions and Replications of
  2-Person Bargaining". *International Journal of Game Theory* 6(3):
  129-133. Axiomatic basis for the asymmetric (weighted) Nash
  bargaining solution that spec 0015 implements.
- Roth, A. E. (1979). *Axiomatic Models of Bargaining*. Lecture Notes
  in Economics and Mathematical Systems 170. Background reading on
  the axiom set and disagreement-point treatment.

### Preference privacy + cryptographic bargaining

- Bogetoft, P., Christensen, D. L., Damgaard, I., Geisler, M.,
  Jakobsen, T., Krøigaard, M., Nielsen, J. D., Nielsen, J. B.,
  Nielsen, K., Pagter, J., Schwartzbach, M., Toft, T. (2009). "Secure
  Multiparty Computation Goes Live". *Financial Cryptography and Data
  Security 2009*. Production deployment of MPC for a commercial
  bargaining-style auction (Danish sugar-beet market). Closest known
  precedent to spec 0015 R-NASH-008.
- Lindell, Y., Pinkas, B. (2009). "Secure Multiparty Computation for
  Privacy-Preserving Data Mining". *Journal of Privacy and
  Confidentiality* 1(1): 59-98. Survey of MPC primitives that
  DEC-MPC-001 evaluates against.
- Damgård, I., Pastro, V., Smart, N., Zakarias, S. (2012).
  CRYPTO 2012 paper introducing the SPDZ protocol family that MP-SPDZ implements;
  candidate path for R-NASH-008.

### Bounded-leakage iteration

- Dwork, C., Roth, A. (2014). "The Algorithmic Foundations of
  Differential Privacy". *Foundations and Trends in Theoretical
  Computer Science* 9(3-4): 211-407. Reference framework for the
  epsilon-bound semantics of R-NASH-005 leakage measurement.
- Friedman, A., Schuster, A. (2010). "Data Mining with Differential
  Privacy". *KDD 2010*. Pattern for measuring per-protocol leakage
  against a declared bound.

### Mechanism comparison + sandbox precedent

- Bergemann, D., Morris, S. (2019). "Information Design: A Unified
  Perspective". *Journal of Economic Literature* 57(1): 44-95.
  Information-design framing that the existing repo's spec 0003
  builds on; spec 0015's mechanism selector preserves the
  information-mode semantics across the new mechanisms.
- Athey, S., Levin, J., Seira, E. (2011). "Comparing Open and Sealed
  Bid Auctions: Evidence from Timber Auctions". *Quarterly Journal of
  Economics* 126(1): 207-257. Empirical mechanism comparison pattern
  the lab's pedagogy targets.

## Open research questions

1. **MPC implementation path for 2-party**. DEC-MPC-001 picks between
   MP-SPDZ (mature, external binary, larger dependency surface) and a
   pure-Python BGW-style protocol scoped to `N = 2`. Trade-off
   analysis happens before W5 lift.
2. **Quantization vs continuous solver**. The plaintext reference
   solver uses a quantization grid for tractability. Continuous
   solvers (interior-point on the Nash product) are more accurate but
   harder to mirror in TS for parity. DEC-NASH-001 picks the
   quantization-level parameter; revisiting the continuous path is
   tracked under a follow-up DEC if the parity test reveals
   irreducible discretization noise.
3. **Multi-party leakage bounds**. The bounded-leakage protocol's
   epsilon bound at `N > 2` requires additional analysis; the
   W4 multi-party lift (R-NASH-007) updates DEC-NASH-002 with the
   `N >= 3` derivation.
4. **Composition under repeated bargaining**. The existing rounds
   infrastructure (engine/rounds.py) lets parties iterate over many
   bargaining instances. Leakage composes across instances; a
   follow-up DEC bounds total leakage under repeated bargaining.

## Non-academic references

- MP-SPDZ project documentation:
  https://mp-spdz.readthedocs.io/ — evaluated under DEC-MPC-001.
- Hypothesis property-testing documentation:
  https://hypothesis.readthedocs.io/ — used by spec 0017's battery.
