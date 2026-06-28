# procurement-negotiation-lab

Two parties agree to a substrate order. The deal is worth $35,000 if they coordinate. One of the standard ways to split the work — averaging everyone's guess until it settles — never settles, and the table walks away with $28,825. The other $6,175 is real, and nobody took it home. This is a sandbox for watching that gap open and close.

## What it does

You play the buyer. Cinder is the simulated supplier. Each round of a long-lead procurement commitment turns one decision into a visible consequence before any math appears on screen — settle now, settle later, hold capacity, reveal a forecast band — and then the lab shows you what that decision cost against a centralized oracle that already knew the answer.

The gap is the instrument. Two locally rational agents will reliably choose a globally worse plan, and the lab puts a dollar figure on how much worse. You can line up a dozen mechanisms — a JIT baseline, the oracle, ADMM-style price-and-residual coordination, menu contracts, alternating best response, plain consensus averaging, three weighted-Nash variants — and see which one closes the distance, without anyone crowning ADMM in advance. Some of them just don't converge. The output says so.

This is an independent public demo built against the open-source [amzn/FloPro](https://github.com/amzn/FloPro) ADMM implementation. It uses synthetic data only — no purchase orders, no supplier records, no FloPro roadmap.

## Try it

The reusable mechanism logic ships as `procurement_mechanism_sdk`, importable without touching the web app. The standalone demo runs three mechanisms on one substrate-crunch scenario and prints the result:

```powershell
python -m procurement_mechanism_sdk.demo
```

```
{
  "participant_count": 2,
  "participation": {
    "feasible": true,
    "mechanism": "admm",
    "no_worse_off": {
      "buyer-northstar": true,
      "supplier-cinder": true
    },
    "oracle_gap": 0.0,
    "surplus": 35000.0
  },
  "runs": [
    {
      "convergence": "converged",
      "final_residual": 0.0,
      "global_utility": 35000.0,
      "mechanism": "centralized_oracle",
      "oracle_gap": 0.0
    },
    {
      "convergence": "converged",
      "final_residual": 0.0,
      "global_utility": 35000.0,
      "mechanism": "admm",
      "oracle_gap": 0.0
    },
    {
      "convergence": "not_converged",
      "final_residual": 56.875,
      "global_utility": 28825.0,
      "mechanism": "consensus_averaging",
      "oracle_gap": 6175.0
    }
  ],
  "scenario_id": "sdk-substrate-crunch"
}
```

The oracle and ADMM both land on the full $35,000. Consensus averaging stops 56.875 short of convergence and a $6,175 oracle gap. That last row is the whole lesson in one object.

Run the multi-party weighted-Nash demo:

```powershell
python -m procurement_mechanism_sdk.demo --sample multi_party --mechanism weighted_nash_bounded
```

The SDK wraps the deterministic Python engine and keeps the deployed simulator as the product surface. See [`docs/mechanism-sdk.md`](docs/mechanism-sdk.md) for the exported API and boundary.

## Live demo

The polished public demo is the React/TypeScript app. It has three surfaces: PLAY (a six-beat management sim, "The Substrate Crunch"), LAB (an authoring workbench for scenarios, counterparties, mechanisms, and transfers), and STUDY (plain-English tutorial pages on utility, residuals, risk scores, ADMM, oracle gaps, and cost-benefit transfers).

**Live:** [procurement-negotiation-lab.vercel.app](https://procurement-negotiation-lab.vercel.app/)

Start at Level 1 (`apps/web/src/surfaces/learn/Level01.tsx`): two figures, one settle button, the lost surplus made visible. Levels 1-11 build up the rest under `apps/web/src/surfaces/learn/`.

## The lab workbench

The lab opens with a "so what" panel — how much value local JIT planning leaves on the table, which non-oracle mechanism performs best, and what full information is worth in the current synthetic setup. From there you can pick presets (substrate crunch, regional shipping asymmetry, multi-vendor shortage), build your own by tuning demand volatility, capacity tightness, lead time, and participant count, choose buyer and supplier strategies (JIT buyer, launch-protection buyer, truthful CPP responder, capacity guard, hard bargainer), and compare every mechanism side by side.

What it teaches, in order: why two locally rational agents pick a bad plan, how large the coordination gap is against an oracle, how ADMM does its local-solve-consensus-prices-residuals loop, when CPP+VCG/CBT or menu contracts beat it, when a dumb baseline is enough, and how cost-benefit transfers split surplus so nobody ends up worse off.

## How it connects

The repo runs the [Cognitive Delivery Control Plane](https://github.com/AthenaTheOwl/athena-site/blob/main/ops/control-plane.md) operating model — 17 specs with R-PREFIX requirements, 36 decisions under `decisions/`, weekly dream-job retrospectives, and seven executable gate scripts that fail the build when any record drifts. The factory subsystem under `scripts/factory/` is a durable agent-orchestration runtime (checkpoint interrupts, per-task git worktrees, artifact-as-refs, trace IDs); Spec 0009 and DEC-FACTORY-001..005 document the contract, and [`docs/factory.md`](docs/factory.md) is the adoption guide for other repos.

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

If Python 3.11 is not installed locally, Python 3.12 or 3.13 also works. The hosted path does not require FICO Xpress or FloPro. `app.py` is a small compatibility entrypoint; the public demo is the React/TypeScript app.

## Mobile

Native iOS and Android port via Expo + EAS, mirroring the web learn flow. Tier 0-3 proof ladder (unit logic, lint+typecheck, Android emulator E2E, TestFlight). Spec 0012 documents the discipline; the hosted `mobile-e2e.yml` workflow runs Maestro flows on a KVM-accelerated runner.

## What it doesn't do

- Real procurement data. Synthetic only.
- Audited cryptographic MPC. The checked-in BGW MPC path is a v1 reference for two-party correctness and contract tests; a serious deployment would need MP-SPDZ or comparable audited infrastructure.
- A production solver. Roles advise; deterministic FloPro reference code decides anything consequential.

This repository contains no real purchase orders, internal supplier records, internal Amazon terminology, or private FloPro roadmap information.

## License

Apache-2.0 for code. Credits the [amzn/FloPro](https://github.com/amzn/FloPro) public repo (Apache-2.0) as a reference implementation only.
