# task packet for implementation agents

Objective: Build a polished React/TypeScript learning simulator for
long-lead procurement coordination, preserving Python as the reference engine.

Context: Previous Streamlit iterations passed tests but failed the human
experience. The failure was not terminology alone; it was interaction order.
The product must behave like a management simulator: role, decision,
consequence, lesson, experiment.

Inputs:

- `specs/0001-polished-simulator/requirements.md`
- `specs/0001-polished-simulator/design.md`
- `specs/0001-polished-simulator/research.md`
- Python reference engine under `src/procurement_lab/`
- Existing synthetic story under `data/stories/substrate_crunch.yaml`

Non-goals:

- Do not create a live solver dependency.
- Do not add LLM-generated coaching.
- Do not use official Amazon branding.
- Do not expose arbitrary formula execution in browser v1.

Output contract:

- Vite React app with PLAY, LAB, and STUDY surfaces.
- Frontend tests proving the decision-reveal loop.
- Spec checker and traceability updated.
- Python tests still pass.

Reasoning mode: Owl for design, Ant for implementation, Raven for final review.

Verification:

- Python gates in `acceptance.md`.
- Frontend build and tests.
- Browser QA across first PLAY decision, LAB, and STUDY.

Stop condition:

- Stop and update the spec if a requirement is ambiguous.
- Stop if implementation needs formula execution in browser; that requires a
  separate safe DSL spec.

Failure modes:

- Recreating a dashboard instead of a simulator.
- Showing technical terms before the user has a reason to care.
- Letting the next round appear before the consequence reveal.
- Treating ADMM as automatically best.
