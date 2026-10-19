# A three-role pilot for one existing mechanism

Method update: October 18, 2026. Proposed experiments below are not reported as executed results.

AI Product Team's useful contribution here is a narrow separation of work: one requirement author names a product question, one evaluator runs a frozen scenario, and a reviewer checks the claim against the receipt. The lab already has specs, traces and factory records, so a parallel ledger or a large imported role catalog would add reconciliation work.

Pilot the method on an existing mechanism: compare two policies under a fixed synthetic information-leakage scenario. Reuse the common trace and scorecard contracts. Freeze the scenario, objective, disclosure budget and acceptance criteria before running either policy. The reviewer should see the command, candidate version, scenario hash and failures, with direct access to the actual artifact.

Bound the pilot to one scenario, two candidates and one review. Measure wall time, tokens if available, discovered defects and false alarms against a single-agent baseline. A source change should queue only dependent checks. This documentation adds no mechanism, route, level, runtime integration or external publication. Any later product implementation must first fit an active spec and satisfy the repository's required engine, component and smoke checks.

## References

- https://github.com/3orionkings/ai-product-team/blob/main/workflows/process-change.md
- https://www.anthropic.com/engineering/building-effective-agents
