# acceptance checklist

## Product acceptance

- [x] A novice understands who they are in the first viewport.
- [x] PLAY shows one decision at a time.
- [x] A decision produces a consequence reveal before the next week appears.
- [x] The app defines utility, residual, risk score, oracle gap, ADMM, CBT, and
  information mode in context.
- [x] LAB explains what each experiment answers before showing controls.
- [x] LAB compares ADMM with at least four alternatives.
- [x] LAB shows value of more information in welfare and privacy terms.
- [x] LAB shows a CBT/no-worse-off ledger.
- [x] STUDY explains the objective functions, solver setup, data boundary, and
  why long-lead planning is different.

## Engineering acceptance

- [x] `python -m uv run pytest`
- [x] `python -m uv run ruff check .`
- [x] `python -m uv run mypy src`
- [x] `python -m uv run bandit -q -r src`
- [x] `python -m uv run pip-audit`
- [x] `python -m uv run python scripts/spec_check.py`
- [x] `npm.cmd run build`
- [x] `npm.cmd run test -- --run`
- [x] Browser QA over PLAY, LAB, and STUDY

## Public-boundary acceptance

- [x] README says this is a for-fun learning lab.
- [x] README credits the public FloPro repo as inspiration/reference only.
- [x] README states this is not an official Amazon example.
- [x] Data docs state all demo data is synthetic.
