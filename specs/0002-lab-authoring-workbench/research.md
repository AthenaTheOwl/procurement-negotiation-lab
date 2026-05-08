# research notes: lab authoring workbench

## Prompt-library scan

On 2026-05-08, scanned 511 text artifacts under
`E:\claude_code\prompt-library`; 7,013 matches for agent, orchestration, spec,
scenario, simulation, workflow, acceptance, mechanism, strategy, schema,
learning, and tutorial terms.

Applied patterns:

- `feature-end-to-end`: spec, implementation, review, proof, canon update.
- `prompt-router` and `universal-wrapper`: distinguish evidence, assumptions,
  decisions, and gaps.
- `agent-design`: model this as inspectable workflow/agent archetypes rather
  than opaque LLM agents.
- `task-packet`: every future agent/scenario extension needs objective,
  context, non-goals, output contract, verification, and likely failure modes.
- `optimization/formulation`: name decision variables, objective, constraints,
  and solver before showing math.

## External references

- SNAP Stanford `supply-chains` shows a useful boundary: synthetic supply-chain
  data can be released while proprietary real-world data remains unavailable.
  The app follows the synthetic-data path for public demo safety:
  https://github.com/snap-stanford/supply-chains
- Boyd et al.'s ADMM survey frames ADMM as a distributed optimization method,
  not a universal winner. The lab therefore compares ADMM against baselines:
  https://web.stanford.edu/~boyd/papers/admm_distr_stats.html
- `LibADMM-toolbox` and `nirum/ADMM` were reviewed as implementation references
  for ADMM vocabulary and examples, not dependencies:
  https://github.com/canyilu/LibADMM-toolbox
  https://github.com/nirum/ADMM
- The Physics-Based Simulation book/tutorial emphasizes convergence behavior as
  something learners inspect visually and experimentally:
  https://phys-sim-book.github.io/
- `kqshan/vcg-auction` provides a compact public example of VCG framing:
  socially efficient allocation and truthful bidding, while also surfacing
  computational complexity limits:
  https://github.com/kqshan/vcg-auction
- The Amazon Science article motivates the CPP + VCG/CBT framing: private
  buyer/vendor information, iterative consensus planning, counterfactual runs,
  cost-benefit transfers, and menu-of-contracts as a simpler alternative:
  https://www.amazon.science/blog/how-mechanism-design-theory-helps-optimize-amazon-vendor-collaboration
- `project-based-learning` is a reminder that the lab should be buildable and
  inspectable as a project, not only a narrative essay:
  https://github.com/practical-tutorials/project-based-learning

## Implementation decision

Use deterministic scenario/agent/mechanism models now. Later slices can add a
safe formula DSL or real data imports once the public learning loop is legible.
