# Browser QA evidence - 2026-05-08

Target: `http://127.0.0.1:5173/`

## Path tested

- Reloaded the React/Vite app in the in-app browser.
- Opened `Lab arena`.
- Verified LAB now opens with the mechanism-design thesis:
  - "Build agents. Set the problem. Compare mechanisms."
  - "The so-what"
  - coordination gap
  - best non-oracle rule
  - information value
- Verified scenario authoring:
  - Substrate crunch preset visible.
  - Regional shipping asymmetry preset visible.
  - Multi-vendor shortage preset visible.
  - Scenario knobs for volatility, capacity tightness, lead time, fulfillment centers, participants, products, and periods visible.
- Verified agent authoring:
  - Buyer agent selector visible.
  - Supplier agent selector visible.
  - Buyer and supplier strategy cards visible.
  - Agent behavior sliders visible for urgency, flexibility, truthfulness, privacy preference, and risk aversion.
- Switched preset to `Regional shipping asymmetry`.
- Verified the so-what panel updated from substrate crunch to regional shipping asymmetry, including a new coordination gap and best mechanism.
- Verified mechanism table includes JIT baseline, centralized oracle, CPP + VCG/CBT, CPP / ADMM, menu-of-contracts, and simpler baselines.
- Checked browser console for warnings/errors: none returned.

## Finding

The lab now communicates the causal question: local JIT planning leaves welfare on the table; the user can change agents, problem structure, information mode, and coordination mechanism to see what recovers value and what privacy/incentive cost it imposes.
