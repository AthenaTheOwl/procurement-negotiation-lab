# procurement-negotiation-lab

A for-fun learning simulator for long-lead procurement commitments. You play
the buyer, Cinder is the simulated supplier, and each round turns one decision
into a visible consequence before the math appears.

**Live demo:** [procurement-negotiation-lab.vercel.app](https://procurement-negotiation-lab.vercel.app/)

This is not FloPro-branded and not an official Amazon example. It credits the
public [amzn/FloPro](https://github.com/amzn/FloPro) repo as an ADMM
implementation reference only.

## app surfaces

- **PLAY:** a six-beat management simulator, `The Substrate Crunch`
- **LAB:** an authoring workbench for scenarios, canonical agents, mechanisms,
  information, and transfers
- **TUTORIAL:** plain-English explanations of utility, residuals, risk scores,
  ADMM, oracle gaps, and cost-benefit transfers

## what it teaches

- why two locally rational agents can choose a globally bad commitment plan
- how large the coordination gap is versus a centralized oracle
- how ADMM-style coordination works: local solve, consensus, prices, residuals
- when CPP/ADMM helps, when CPP+VCG/CBT or menu contracts are stronger, and
  when a simpler baseline is enough
- how more shared information can buy better joint utility
- how privacy exposure changes when agents reveal risk, capacity, cost, or
  forecast bands
- how cost-benefit transfers split surplus so every participant can be no worse off

## lab workbench

The lab starts with a "so what" panel: how much value local JIT planning leaves
on the table, which non-oracle mechanism performs best, and what full
information is worth in this synthetic setup.

From there you can:

- choose canonical problem presets such as substrate crunch, regional shipping
  asymmetry, and multi-vendor shortage;
- make your own scenario by changing demand volatility, capacity tightness,
  lead time, FC count, product count, period count, and participant count;
- pick canonical buyer/supplier strategies such as JIT buyer, launch-protection
  buyer, truthful CPP responder, capacity guard, relationship supplier, and hard
  bargainer;
- tune agent behavior knobs for urgency, flexibility, truthfulness, privacy
  preference, and risk aversion;
- compare JIT baseline, centralized oracle, CPP/ADMM, CPP+VCG/CBT,
  menu-of-contracts, alternating best response, price-only coordination, and
  consensus averaging.

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

The active specs live under `specs/`.

- `0001-polished-simulator/` covers the React/Vite simulator rebuild.
- `0002-lab-authoring-workbench/` covers the so-what panel, scenario authoring,
  canonical agents, and mechanism-design comparison.

## public boundary

This repository uses deterministic synthetic data. It does not contain real
purchase orders, internal supplier records, internal Amazon terminology,
private FloPro roadmap information, or production recommendations.

## governance

The Cognitive Delivery Control Plane (CDCP) scaffold landed in spec 0013.
It records what we build, why we build it, what we reuse, and what we
learn, with executable gates that fail builds when any record drifts.

- `specs/` — what we build. Spec ledgers under
  `specs/NNNN-<slug>/` with the six-file pattern (requirements, design,
  tasks, acceptance, research, traceability).
- `decisions/` — why we built it. One `DEC-*.md` per architectural or
  product decision, matching the cross-repo `decision.schema.json`.
- `dreams/` — what we learned. Weekly offline-cognition outputs under
  `dreams/YYYY-WNN/` matching the cross-repo `dream-output.schema.json`.
- `.agents/AGENTS.md` — the single contract a coding agent reads first.
- `.agents/roles/<role-id>/` — six baseline role contracts plus the
  `tools.yaml`, `policies/`, `state-machines/`, `workflows/`, and
  `CATALOG.md` files that make up the operating-model layer.
- `.agents/skills/<id>/SKILL.md` — packaged recurring patterns. The
  first graduated skill is `run-factory-task`.
- `ops/RELEASE_LEDGER.md` — one entry per released commit.
- `ops/RESET_LEDGER.md` — one entry per force-push, history rewrite,
  or rollback.
- `ops/run-ledger.md` — the factory subsystem's per-task pipeline
  ledger (separate from the release ledger).
- The cross-repo CDCP charter lives at
  `https://github.com/AthenaTheOwl/athena-site` under `ops/control-plane.md`.

Gates that run on every push:

```powershell
python scripts/spec_check.py
python scripts/voice_lint.py
python scripts/validate_decisions.py
python scripts/validate_roles.py
python scripts/validate_tools.py
python scripts/validate_policies.py
```
