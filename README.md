# procurement-negotiation-lab

A for-fun learning simulator for long-lead procurement commitments.
You play the buyer, Cinder is the simulated supplier, and each round
turns one decision into a visible consequence before the math appears.

**Live:** [procurement-negotiation-lab.vercel.app](https://procurement-negotiation-lab.vercel.app/)

This is an independent public demo built against the open-source
[amzn/FloPro](https://github.com/amzn/FloPro) ADMM implementation.
Not FloPro-branded. Not an official Amazon example.

## Read it for

- A six-beat negotiated-commitment simulator that explains why JIT
  planning leaves surplus on the table.
- A lab workbench where you can compare CPP/ADMM against a centralized
  oracle, menu contracts, alternating best response, and consensus
  averaging — without crowning ADMM.
- Tutorial pages that explain utility, residuals, risk scores, ADMM,
  oracle gaps, and cost-benefit transfers in plain English.
- A native iOS and Android port (Expo) that mirrors the web learn flow.

## For your role

**Curious.** Open [procurement-negotiation-lab.vercel.app](https://procurement-negotiation-lab.vercel.app/)
and play Level 1 at `apps/web/src/surfaces/learn/Level01.tsx`. Two
figures, one settle button, lost surplus made visible. Each Level
shows the consequence before the math.

**Student.** Levels 1-11 under `apps/web/src/surfaces/learn/` teach
utility, residuals, risk scores, ADMM, oracle gaps, and cost-benefit
transfers in plain English. [`docs/tutorial.md`](docs/tutorial.md) is
the reference companion; the LevelShell primitive at
`apps/web/src/primitives/LevelShell.tsx` enforces the consequence-before-math
discipline named in DEC-PLAY-003.

**Domain expert.** This is an independent public demo against the
open-source [amzn/FloPro](https://github.com/amzn/FloPro) ADMM
implementation. The 13 specs under `specs/` document where the design
follows the published literature (Bergemann + Morris information
design in spec 0003; canonical ADMM in
[`docs/algorithms.md`](docs/algorithms.md)) and where it departs:
no crowning of ADMM (DEC-LAB-008), cost-benefit transfers prove
no-worse-off participation, six-mode information-vs-privacy on the
same instance (DEC-LAB-009).

**Engineer.** Fork the factory subsystem at `scripts/factory/`.
DEC-FACTORY-001..005 document the architectural choices: narrow MCP
stdio over shell tools, spec tasks expanded into review-gated YAML,
bounded dual review with conservative aggregation, real CLI ids with
synthetic fallback, and an optional LangGraph router with a threadpool
fallback. [`docs/factory.md`](docs/factory.md) is the adopt-in-your-repo
guide.

**Project reader.** 13 specs, 20 architectural decisions captured in
`decisions/`, mobile plus web parity (spec 0012 + tier 0-3 proof
ladder), the factory subsystem as orchestration runtime (spec 0009),
the first weekly dream retrospective at `dreams/2026-W21/` with five
candidates promoted. The throughline is the
[Cognitive Delivery Control Plane](https://github.com/AthenaTheOwl/athena-site/blob/main/ops/control-plane.md).

## How it's organized

The repo runs the [Cognitive Delivery Control Plane](https://github.com/AthenaTheOwl/athena-site/blob/main/ops/control-plane.md)
operating model: 13 specs with R-PREFIX requirements, 20 architectural
decisions captured in `decisions/`, weekly dream-job retrospectives,
six roles, twelve tools, six policies, four executable gate scripts.

## App surfaces

- **PLAY:** a six-beat management simulator, `The Substrate Crunch`.
- **LAB:** an authoring workbench for scenarios, canonical agents,
  mechanisms, information modes, and transfers.
- **STUDY:** plain-English tutorial pages on utility, residuals, risk
  scores, ADMM, oracle gaps, and cost-benefit transfers.

## What it teaches

- Why two locally rational agents can choose a globally bad commitment
  plan.
- How large the coordination gap is versus a centralized oracle.
- How ADMM-style coordination works: local solve, consensus, prices,
  residuals.
- When CPP/ADMM helps, when CPP+VCG/CBT or menu contracts are stronger,
  and when a simpler baseline is enough.
- How more shared information can buy better joint utility.
- How privacy exposure changes when agents reveal risk, capacity, cost,
  or forecast bands.
- How cost-benefit transfers split surplus so every participant ends
  up no worse off.

## Lab workbench

The lab opens with a "so what" panel: how much value local JIT planning
leaves on the table, which non-oracle mechanism performs best, and what
full information is worth in the current synthetic setup.

From there you can:

- Pick canonical problem presets such as substrate crunch, regional
  shipping asymmetry, and multi-vendor shortage.
- Build your own scenario by changing demand volatility, capacity
  tightness, lead time, FC count, product count, period count, and
  participant count.
- Pick canonical buyer and supplier strategies such as JIT buyer,
  launch-protection buyer, truthful CPP responder, capacity guard,
  relationship supplier, and hard bargainer.
- Tune agent behavior knobs for urgency, flexibility, truthfulness,
  privacy preference, and risk aversion.
- Compare JIT baseline, centralized oracle, CPP/ADMM, CPP+VCG/CBT,
  menu-of-contracts, alternating best response, price-only
  coordination, and consensus averaging.

## The factory subsystem

`scripts/factory/` is a durable agent-orchestration runtime with
checkpoint interrupts, per-task git worktrees, artifact-as-refs,
trace IDs, and a stub/real worker abstraction. Spec 0009 documents the
contract; DEC-FACTORY-001..005 capture the architectural decisions.

It's used internally to expand specs into review-gated task runs. The
pattern is portable to other repos. See [`docs/factory.md`](docs/factory.md)
for the adoption guide.

## Local run

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

If Python 3.11 is not installed locally, Python 3.12 or 3.13 also works.
The hosted path does not require FICO Xpress or FloPro.

`app.py` is a small compatibility entrypoint. The polished public demo
is the React/TypeScript app.

## Mobile

Native iOS and Android port via Expo + EAS. Tier 0-3 proof ladder
(unit logic / lint+typecheck / Android emulator E2E / TestFlight).
Spec 0012 documents the discipline. The hosted `mobile-e2e.yml`
workflow runs Maestro flows on a KVM-accelerated runner.

## Proof gates

```powershell
python -m uv run python scripts/spec_check.py
python -m uv run python scripts/voice_lint.py
python -m uv run python scripts/validate_decisions.py
python -m uv run python scripts/validate_roles.py
python -m uv run python scripts/validate_tools.py
python -m uv run python scripts/validate_policies.py
python -m uv run pytest
python -m uv run ruff check .
python -m uv run mypy src
python -m uv run bandit -q -r src
python -m uv run pip-audit
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

The rebuilt app also has a browser-QA gate: PLAY, LAB, and STUDY must
be clicked through in a real browser before a checkpoint is called done.

## Spec-driven development

The active specs live under `specs/`. The development loop is:

1. Write or update requirements in testable language.
2. Update the design so each requirement has a named surface or module.
3. Implement only tasks traceable to the current spec.
4. Run proof gates: Python engine tests, frontend tests, type checks,
   browser QA.
5. Update traceability and decisions before committing.

If a requested change does not fit the active spec, update the spec
first.

## What's intentionally not built

- Real procurement data. Synthetic only.
- Multi-party negotiation beyond the six-role taxonomy (Domain Guild
  TODO in `.agents/CATALOG.md`).
- A production solver. Agents in the Domain Guild advise; deterministic
  FloPro reference code decides anything consequential.

## Public boundary

This repository uses deterministic synthetic data. It does not contain
real purchase orders, internal supplier records, internal Amazon
terminology, private FloPro roadmap information, or production
recommendations.

## Governance

The Cognitive Delivery Control Plane (CDCP) scaffold landed in spec
0013. It records what we build, why we build it, what we reuse, and
what we learn, with executable gates that fail builds when any record
drifts.

- `specs/` — what we build. Spec ledgers under `specs/NNNN-<slug>/`
  with the six-file pattern (requirements, design, tasks, acceptance,
  research, traceability).
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
  `https://github.com/AthenaTheOwl/athena-site` under
  `ops/control-plane.md`.

## License

Apache-2.0 for code. Credits the `amzn/FloPro` public repo (Apache-2.0)
as a reference implementation only.
