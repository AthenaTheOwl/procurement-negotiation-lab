# architecture

The primary demo is now a React/TypeScript/Vite simulator. The Python package
remains the reference model and proof engine.

## surfaces

- **PLAY:** default landing experience. A six-beat story, one decision per
  round, consequence reveal before the next round, and final debrief.
- **LAB:** experiment arena for algorithm comparison, information modes,
  multi-party/product/period knobs, and transfer checks.
- **TUTORIAL:** objective functions, solver notes, data boundary, and mental
  models in plain words.

## layers

- **spec layer:** `specs/0001-polished-simulator/` defines requirements,
  design, tasks, acceptance, research, and traceability.
- **frontend model:** `web/src/model/` contains deterministic browser-safe
  simulation logic for the public demo.
- **frontend data:** `web/src/data/` contains story beats and glossary entries.
- **frontend UI:** `web/src/App.tsx` and `web/src/styles.css` render the
  simulator, lab, and tutorial.
- **Python engine:** `src/procurement_lab/engine/` contains typed scenarios,
  safe formula evaluation, utility ledgers, information modes, and CBT surplus
  splitting.
- **Python algorithms:** `src/procurement_lab/algorithms/` contains oracle,
  ADMM, alternating best response, price-only dual, and consensus averaging.
- **compatibility entrypoint:** `app.py` stays importable for older Streamlit
  checks but is no longer the public demo.

## stack decision

React/TypeScript replaced Streamlit for the public app because the desired
experience is stateful and narrative: role, decision, consequence, lesson, and
experiment. Streamlit remains useful for model inspection, but its rerun model
made the guided simulator harder to make legible.

The public demo has no external API calls and no hosted solver dependency. It is
safe to deploy as a static Vercel app.
