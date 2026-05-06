# algorithms

The lab compares five paths:

- centralized oracle: upper bound, not deployable when information is private
- ADMM-style coordination: local solves plus consensus/proximity signals
- alternating best response: each side reacts to the other's last quantity
- price-only dual update: a price signal moves supply and demand together
- consensus averaging: simple averaging toward local ideals

The point is not to prove ADMM is always best. The point is to show when it
converges quickly, when simpler methods are enough, and when extra structure is
not buying much.

Every algorithm returns the same trace schema: iterations, residual, runtime,
quantity, feasibility, local utilities, global utility, transfer, and utility
gap versus the centralized oracle.
