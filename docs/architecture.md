# architecture

The rebuilt app has three surfaces and three internal layers.

## surfaces

- **PLAY:** default landing experience. A six-beat story, one decision per beat,
  consequences after each decision, and one of three endings.
- **LAB:** sandbox for algorithm comparison, information modes, and transfers.
- **STUDY:** objective functions, solver notes, data boundary, and mental models.

## layers

- **engine:** typed scenarios, safe formula evaluation, utility ledgers,
  information modes, and CBT surplus splitting.
- **algorithms:** oracle, ADMM, alternating best response, price-only dual, and
  consensus averaging.
- **narrative:** story arc, counterparty persona, run state, coach debriefs, and
  ending detection.
- **views:** Streamlit surfaces. `app.py` is only routing.

The app evaluates plans against the actual scenario, not only the agents'
perceived scenario. That is where information value becomes visible.
