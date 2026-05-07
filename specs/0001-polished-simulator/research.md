# research notes: polished simulator rebuild

## Prompt-library scan

Scanned text artifacts under `E:\claude_code\prompt-library` on 2026-05-07:

- Files scanned: 511 markdown/text/TOML/YAML artifacts.
- Keyword matches: 3,813 across spec, orchestration, LLM, acceptance, workflow,
  simulation, narrative, and guardrail terms.

Relevant library patterns:

- `library/meta-prompting/feature-end-to-end.md`: end-to-end feature workflow
  with analysis, tech spec, implementation, review, and rollout artifacts.
- `library/foundations/operational/01-prompt-router.md`: route by task type and
  escalate complex multi-actor, delayed-feedback work into the full reasoning
  protocol.
- `library/foundations/operational/02-universal-wrapper.md`: separate evidence,
  assumptions, decisions, and gaps; avoid silent scope expansion.
- `library/foundations/operational/03-reasoning-protocol.md`: FRAME, MODEL,
  REASON, VALIDATE, DECLARE, UPDATE.
- `library/foundations/operational/10-orchestrator-worker.md`: use
  decomposition only when subtasks have clean interfaces; otherwise keep the
  coherent work in one lane.
- `library/foundations/operational/16-task-packet.md`: every non-trivial agent
  handoff needs objective, context, non-goals, output contract, verification,
  stop condition, and likely failure modes.
- `library/coding/v2-prompts/tech-spec.md`: spec sections for problem, goals,
  design, interfaces, data, failure modes, operability, and open questions.
- `library/coding/workflows/feature-development-loop.md`: spec, design,
  reference implementation, golden cases, implementation, tests, rollout, canon
  update.
- `library/coding/policy/review-gates.md`: architectural fit, domain
  correctness, runtime safety, operability.
- `library/machine-learning/workflows/llm-prompt-iteration.md`: if LLM text is
  introduced later, version prompts and evaluate them; do not tweak prose
  without an eval set.
- `library/machine-learning/workflows/agent-design.md`: prefer workflows over
  agents when the task structure is knowable. This simulator is a workflow, not
  an LLM agent.
- `library/creative/interactive-narrative/_index.md`: player role, meaningful
  agency, consequence, transformation, and string-of-pearls structure.
- `library/optimization/v2-prompts/formulation.md`: restate decision problem
  before variables/objective/constraints/solver.

## Web research

Spec-driven development references:

- GitHub Spec Kit frames specs as executable artifacts that directly generate or
  govern implementation, with extensions for CI guard, blueprint, bugfix,
  review, security, spec sync, and verification:
  https://github.com/github/spec-kit
- Kiro's spec system uses requirements, design, and tasks, with task status and
  requirements linkage so missing work is caught while building:
  https://kiro.dev/docs/specs/
- Kiro's launch writeup emphasizes sequenced tasks linked back to requirements,
  including unit tests, integration tests, loading states, mobile responsiveness,
  and accessibility:
  https://kiro.dev/blog/introducing-kiro/

Simulator and tool-surface references:

- Forio Epicenter separates model authoring from interface authoring and lets
  teams write their own UI against model APIs:
  https://forio.com/epicenter/docs/public/
- Forio's public positioning emphasizes user-friendly interfaces on top of
  complex models:
  https://forio.com/solutions
- Streamlit AppTest is useful for Python app checks, but it tests a Streamlit
  script rather than browser-grade interaction polish:
  https://docs.streamlit.io/develop/api-reference/app-testing/st.testing.v1.apptest
- Simulation learning research found learners valued consequence explanations
  after decisions more than simple right/wrong scoring:
  https://files.eric.ed.gov/fulltext/EJ1200809.pdf

## Stack decision

The public demo moves to React, TypeScript, and Vite. Python remains the
reference engine and regression-test oracle.

Rationale:

- The desired product is a stateful learning simulator, not a data app.
- Streamlit's rerun model is good for notebooks and dashboards but awkward for
  high-touch interaction loops with deliberate reveal states.
- React/TypeScript gives direct control over the state machine, accessibility,
  responsive layout, and browser QA.
- Vite is Vercel-friendly and keeps the app static: no hosted solver dependency
  is required for the public demo.

Rejected for now:

- Full FastAPI + React backend. More realistic, but the current app can be a
  deterministic static simulator.
- LLM-generated coaching. Not needed for v1; templated explanations are safer
  and testable.
- FloPro live dependency. Credit/reference only; no hosted demo dependency.
