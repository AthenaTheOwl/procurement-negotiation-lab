# research: mechanism-design SDK

## Repo scan

The reusable deterministic mechanism logic already exists in Python:

- `src/procurement_lab/engine/schemas.py` owns the scenario, run, ledger, and
  transfer schemas.
- `src/procurement_lab/algorithms/admm.py` owns the ADMM reference loop.
- `src/procurement_lab/algorithms/oracle.py` owns the centralized oracle.
- `src/procurement_lab/algorithms/simple.py` owns educational comparison
  algorithms.
- `src/procurement_lab/engine/cbt.py` owns cost-benefit transfer logic.

The deployed simulator uses the TypeScript app engine under `packages/engine`
and app surfaces under `apps/web` and `apps/mobile`. Moving that code would
increase regression risk for a packaging change.

## Conclusion

The smallest useful SDK is a Python wrapper package over `procurement_lab`.
It exposes stable entrypoints while leaving the app engine and deployed
simulator intact.
