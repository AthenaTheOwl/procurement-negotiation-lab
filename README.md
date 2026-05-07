# procurement-negotiation-lab

a Beer Game-style learning lab for long-lead procurement commitments. you play
the buyer, Cinder is simulated, and each beat turns one decision into visible
consequences.

uses the open-source [FloPro](https://github.com/amzn/FloPro) repo as the
ADMM implementation reference. not an official Amazon example.

## surfaces

- **PLAY:** six-beat narrative simulator, `The Substrate Crunch`
- **LAB:** algorithm, information, and transfer sandbox
- **STUDY:** objective functions, solver notes, synthetic-data boundary, mental models

## what it teaches

- why two locally rational agents can choose a globally bad commitment plan
- how ADMM-style coordination works: local solve, consensus, prices, residuals
- when ADMM helps, when a simpler baseline is enough, and when it struggles
- how more shared information can buy better joint utility
- how cost-benefit transfers split surplus so every participant can be no worse off

## local run

```powershell
python -m uv sync --python 3.11
python -m uv run streamlit run app.py
```

If Python 3.11 is not installed locally, Python 3.12 or 3.13 also works. The
hosted path does not require FICO Xpress or FloPro.

## proof gates

```powershell
python -m uv run pytest
python -m uv run ruff check .
python -m uv run mypy src
python -m uv run bandit -q -r src
python -m uv run pip-audit
```

The rebuilt app has a browser-QA gate: the PLAY path must be clicked through in
a real browser before a phase is called done.

## public boundary

This repository uses deterministic synthetic data. It does not contain real
purchase orders, internal supplier records, internal Amazon terminology,
private FloPro roadmap information, or production recommendations.
