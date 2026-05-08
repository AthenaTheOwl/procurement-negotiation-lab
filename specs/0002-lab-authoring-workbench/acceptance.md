# acceptance checklist

## Product acceptance

- [x] LAB opens with a so-what panel.
- [x] LAB includes canonical scenario presets.
- [x] LAB supports creating a custom problem from core structural knobs.
- [x] LAB includes canonical buyer/supplier agents and strategy explanations.
- [x] LAB supports agent behavior tuning.
- [x] LAB compares JIT, oracle, CPP/ADMM, CPP+VCG/CBT, menu contracts, and simpler baselines.
- [x] LAB reports privacy exposure and incentive story per mechanism.
- [x] LAB shows information value and privacy exposure together.

## Engineering acceptance

- [x] `npm.cmd run build`
- [x] `npm.cmd run test -- --run`
- [x] `python -m uv run python scripts/spec_check.py`
- [x] Browser QA over LAB so-what, presets, agent selectors, and mechanism comparison
