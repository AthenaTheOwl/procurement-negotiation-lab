# procurement-negotiation-lab

A for-fun learning simulator for long-lead procurement commitments. You play
the buyer, Cinder is the simulated supplier, and each round turns one decision
into a visible consequence before the math appears.

This is not FloPro-branded and not an official Amazon example. It credits the
public [amzn/FloPro](https://github.com/amzn/FloPro) repo as an ADMM
implementation reference only.

## app surfaces

- **PLAY:** a six-beat management simulator, `The Substrate Crunch`
- **LAB:** an experiment arena for algorithms, information, and transfers
- **TUTORIAL:** plain-English explanations of utility, residuals, risk scores,
  ADMM, oracle gaps, and cost-benefit transfers

## what it teaches

- why two locally rational agents can choose a globally bad commitment plan
- how ADMM-style coordination works: local solve, consensus, prices, residuals
- when ADMM helps, when a simpler baseline is enough, and when it struggles
- how more shared information can buy better joint utility
- how cost-benefit transfers split surplus so every participant can be no worse off

## local run

Primary demo:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the Vite URL, usually `http://127.0.0.1:5173/`.

Python reference engine:

```powershell
python -m uv sync --python 3.11
python -m uv run pytest
```

If Python 3.11 is not installed locally, Python 3.12 or 3.13 also works. The
hosted path does not require FICO Xpress or FloPro.

`app.py` is now a small compatibility entrypoint. The polished public demo is
the React/TypeScript app.

## proof gates

```powershell
python -m uv run python scripts/spec_check.py
python -m uv run pytest
python -m uv run ruff check .
python -m uv run mypy src
python -m uv run bandit -q -r src
python -m uv run pip-audit
npm.cmd run build
npm.cmd run test -- --run
```

The rebuilt app has a browser-QA gate: PLAY, LAB, and TUTORIAL must be clicked
through in a real browser before a checkpoint is called done.

## spec-driven development

The active spec lives under `specs/0001-polished-simulator/`.

- `requirements.md` defines testable product requirements.
- `design.md` records the stack and architecture decisions.
- `tasks.md` tracks implementation work.
- `acceptance.md` lists proof gates.
- `traceability.md` maps requirements to files and tests.
- `research.md` records the prompt-library scan and web research.

## public boundary

This repository uses deterministic synthetic data. It does not contain real
purchase orders, internal supplier records, internal Amazon terminology,
private FloPro roadmap information, or production recommendations.
