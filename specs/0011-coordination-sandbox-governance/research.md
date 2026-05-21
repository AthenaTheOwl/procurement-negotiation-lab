# research: coordination sandbox + execution discipline

## ChatGPT planning notes

The triggering notes argued for three product ideas:

- per-product consensus/ADMM templates plus a one-shot menu fallback
- comparison of other convergence methods beyond ADMM
- transfer pricing as a separate cost-benefit-transfer layer that aligns
  local choices with global welfare

The implementation translates those into sandbox tools rather than static
documentation.

## Mechanism-design framing

### Consensus/ADMM

ADMM is useful when local parties can optimize privately while sharing only
proposal/dual messages. The important caveat is privacy wording: vanilla ADMM
keeps raw cost models local, but repeated messages can still leak marginal
behavior. Formal privacy requires DP noise or cryptographic protocols.

### Other convergence families

The method map keeps the practical picker visible:

- damped averaging for simple shared plans
- price tatonnement and Lagrangian updates for capacity/price clearing
- progressive hedging for scenario planning
- gossip for decentralized settings
- federated averaging for expensive local optimization
- projection methods for feasibility-first problems
- no-regret learning for repeated strategic behavior
- auctions/mechanisms for scarce high-value allocation
- voting/scoring for discrete templates
- Bayesian pooling for forecast disagreement
- contract menus for week-one deployment

### Transfer pricing

The transfer workbench follows three rules:

1. choose the operational plan by real welfare
2. use transfers to make positive-surplus plans individually rational
3. never use transfers to hide negative real surplus

The methods shown are intentionally limited to explainable variants:

- surplus share
- marginal externality
- two-part tariff
- VCG-style reference pricing

## Process lesson

The previous gap was not lack of tests. The gap was that status claims could
move faster than the spec ledger and CI. The repair is to make missing specs,
stale traceability, and missing workflow gates fail mechanically.

## References already in repo context

- Spec 0007 production hardening: Playwright smoke and spec_check discipline.
- Spec 0009 factory control plane: implementation gates and artifact capture.
- Spec 0010 pedagogical redesign: current learning journey and mobile state.
- `packages/engine/src/learn/coordinationCatalog.ts`: mechanism catalog and
  privacy/provenance framing.
