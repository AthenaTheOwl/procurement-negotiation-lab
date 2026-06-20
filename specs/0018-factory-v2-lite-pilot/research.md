# Spec 0018 — Research

## Primary sources informing v2-lite design

All verified at the 3-vote adversarial threshold by the deep-research workflow `wjv58mvj4` (108 agents, 25 claims tested, 19 confirmed, 6 killed).

### Multi-agent gains are often minimal
- **MAST taxonomy** (Cemri et al., NeurIPS 2025 Datasets & Benchmarks): https://arxiv.org/abs/2503.13657
  - 1,600+ annotated traces across 7 multi-agent frameworks; inter-annotator κ=0.88
  - 14 distinct failure modes in 3 categories (system design, inter-agent misalignment, task verification)
  - "Despite enthusiasm for Multi-Agent LLM Systems, their performance gains on popular benchmarks are often minimal."
- **"Talk Isn't Always Cheap"** (arxiv 2509.05396): debate gains 1.5–5.3% at 3–5× token cost
- **"Can LLM Agents Really Debate?"** (arxiv 2511.07784): debate quality often does not exceed self-refinement

### Failures propagate non-locally
- **AgentFail** (Ma et al., Sept 2025): https://arxiv.org/pdf/2509.23735
  - 307 cases on Dify/Coze platforms
  - "In 32% of failures, the root cause node differs from the failure symptom node"
  - "Propagation distances exceeding 40% of the workflow length in over 10% of cases"
  - For Logic & Control nodes, ~45% of root causes are non-local
- **Implication for v2-lite**: attribution module is non-optional. Without root-cause walking, "gates failed at test phase" tells us nothing about whether the design phase was the actual bug.

### Supervisor topologies pay a token tax
- **LangChain benchmarking** (June 2025): https://www.langchain.com/blog/benchmarking-multi-agent-architectures
  - "Swarm slightly outperforms supervisor across the board"
  - "Sub agents cannot respond to the user directly in the supervisor architecture, while in the swarm architecture they can"
  - "Reduced errors caused by the supervisor agent paraphrasing the sub agent incorrectly"
  - "When there is only a single distractor domain the single agent performs slightly better"
- **Implication for v2-lite**: no supervisor/manager worker. Reviewers emit typed artifacts directly into the shared event ledger.

### Even best-in-class single-agent SDLC products can't autonomously complete ambiguous projects
- **Cognition Devin annual review** (Nov 14, 2025): https://cognition.ai/blog/devin-annual-performance-review-2025
  - Against-interest source
  - "Devin can't independently tackle an ambiguous coding project end-to-end like a senior engineer could"
  - Performs optimally with "clear, upfront requirements and verifiable outcomes"
  - Struggles with "mid-task requirement changes"
- **Implication for v2-lite**: operator scoping at vision phase is the binding constraint. Multi-persona pipeline cannot rescue an ambiguous spec.

## Frameworks reviewed (none directly adopted for v2-lite)

| Framework | Persona model | Why not used |
|---|---|---|
| ChatDev (ACL 2024) | CEO/CTO/programmer/reviewer/tester in chat chain | Chat chain ≠ typed artifacts; SRDD superiority claims were refuted in our verification |
| MetaGPT (ICLR 2024) | SOP-encoded role prompts with intermediate verification | Assembly-line pattern is the inspiration for v2-lite's `phase` field; we lift the *idea* not the framework |
| CrewAI | Role/Goal/Backstory; Sequential / Hierarchical processes | Hierarchical manager has known type-coercion bugs (issues #4783, #2606); we keep our bespoke state machine + lift the typed-artifact (Pydantic) handoff idea |
| LangGraph (supervisor + swarm) | Graph topology with node-typed agents | Existing factory is a linear state machine; v2-lite explicitly *doesn't* re-platform onto LangGraph until v2-full |
| OpenAI Agents SDK | `Agent(name, instructions)` | Persona is a string, not a typed contract — same shape we adopted in `Task.persona` |
| OpenHands SDK (Nov 2025) | Ground-up redesign for production SE agents | Per-repo sandboxing — useful for v2-full deploy worker; out of scope for v2-lite |

## Adversarial review patterns (deferred to v2-full)

- **SWE-Debate** (July 2025, arxiv 2507.23348): 3-round competitive debate among specialized agents along fault-propagation traces. Architectural pattern is well-supported; claim of superiority over single-agent baselines was REFUTED in our 3-vote verification (0–3). v2-lite uses **2 reviewer prompts (architecture-lens + security-lens), one round**, not 3-round debate. v2-full reconsiders after pilot evidence.

## Refuted claims (do not assume)

The deep-research workflow killed these claims at the 2-of-3 refute threshold:

- ChatDev's 0.3953 vs MetaGPT's 0.1523 SRDD score (vote 1–2)
- OpenAI Agents SDK handoffs-as-gating + guardrails-as-failfast (vote 0–3)
- SWE-Debate superiority over single-agent (vote 0–3)
- "LLM nodes are dominant failure source" from AgentFail (vote 1–2)

## Open questions (will inform v2-full)

1. Does any peer-reviewed evidence show that 5+ personas beat a well-prompted single agent on realistic SWE-bench-like tasks once token cost is normalized? **Not in our evidence set.**
2. What is the canonical "test pyramid for agents"? **No published consensus.** v2-lite defines our own: unit/integration/interface blocking; chaos/edge advisory.
3. Per-stage cost and latency numbers for production multi-persona SDLC factories? **Unmeasured.** The pilot generates the first data point.
4. Anthropic Claude Code subagents — empirical comparison vs CrewAI/LangGraph on the same SDLC tasks? **No published empirical work.** Out of scope.
