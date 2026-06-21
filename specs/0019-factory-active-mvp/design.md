# Spec 0019 — Design

## Lifecycle (the canonical run)

```
   vision               product brief named, decisions tied to one user + one decision
     │
     ▼
   decomposition        modules + interfaces declared in module_map
     │
     ▼
   requirements         R-* in specs/0002-design (carried over from v2-lite)
     │
     ▼
   design               design.md + acceptance.md
     │
     ▼
   persona review       architecture + security lenses (2 personas for v0.1)
     │
     ▼
   implementation       src/ + tests/ + the real artifact under reports|examples|data
     │
     ▼
   gates                expected_artifacts presence + smoke (presence-check) + module_map files exist
     │
     ▼
   defect loop          findings + gate failures captured to defect_log; bounded retry
     │
     ▼
   release artifact     STATUS.md updated; next_feature_queue written; handoff_packet emitted
     │
     ▼
   next feature queue   becomes the input to the next factory run for this repo
```

The lifecycle stays the same across repo types; templates differ in WHAT goes in each step (file paths, smoke command, default reviewers, default expected_artifacts).

## Architecture

### Module additions

```
scripts/factory/
  contract.py           NEW. ActiveMVPContract dataclass + hard-fail validators
                        for PRODUCT_BRIEF / SYSTEM_MAP / STATUS / expected_artifacts
                        / module_map.
  defects.py            NEW. DefectLog dataclass + writer. Appends to
                        ops/factory-defects/<task-id>.jsonl on every
                        NEEDS_PATCH / gate.failed / review.rejected event.
  handoffs.py           NEW. HandoffPacket writer. After pipeline.done/failed,
                        composes the operator-facing summary at
                        ops/handoffs/<task-id>.md.
  next_features.py      NEW. Reads the design phase's "deferred to 0003+"
                        sections + unresolved defect_log entries; writes to
                        target repo's STATUS.md.
  templates/            NEW.
    data-report/
      task.yaml.tmpl
      expected_artifacts.yaml
      module_map.yaml
      smoke.sh         (presence-check pattern)
    product-control-plane/
      (same shape)
  prompts/
    review-product.md   FUTURE (spec 0020). v0.1 keeps just architecture + security.
```

### task.py extensions (v0.2 of v2-lite)

```python
@dataclass
class ExpectedArtifact:
    path: str           # repo-relative path
    must_be_nonempty: bool = True
    kind: Literal["file", "dir", "glob"] = "file"

@dataclass
class ModuleMapEntry:
    name: str
    source: str         # relative source-file path; must exist after impl
    public_interfaces: list[str] = field(default_factory=list)  # advisory in v0.1

@dataclass
class PersonaReview:
    name: Literal["architecture", "security"]  # v0.1 closed set
    reviewer: ReviewerChoice = "claude_code"

# Task gains:
class Task:
    ...existing v2-lite fields...
    active: bool = False                    # if True, contract gates fire
    expected_artifacts: list[ExpectedArtifact] = field(default_factory=list)
    module_map: list[ModuleMapEntry] = field(default_factory=list)
    persona_reviews: list[PersonaReview] = field(default_factory=list)
    template: str | None = None             # name of template this task derives from
```

Backward compatible: every new field defaults empty / False; existing batch-2 task YAMLs load unchanged.

### Hard-fail gate wiring

The factory's existing gate runner gets a NEW gate category that runs AFTER user-defined gates but BEFORE the review step:

```
plan → implement → user-gates → CONTRACT-GATES → review → commit → ...
                                    │
                                    ├── expected_artifacts presence
                                    ├── module_map source files exist
                                    └── (if active=True) PRODUCT_BRIEF/SYSTEM_MAP/STATUS present
```

If contract-gates fail, the pipeline routes to the patch loop with a synthesized finding (e.g., `MISSING_ARTIFACT: <path>`). After max_patch_rounds, fails with status `blocked` and writes a clear defect_log entry.

This closes BUG-FAC-007 root cause (no-op impl rounds accepted) AND prevents the gate-rigidity workaround (manual merges).

### Templates

v0.1 ships 2 templates. Each is a directory with 4 files:

```
ops/factory-templates/data-report/
  task.yaml.tmpl               # task YAML with {SLUG}/{BRAND}/etc placeholders
  expected_artifacts.yaml      # default list of artifacts the impl must produce
  module_map.yaml              # default modules + interfaces
  smoke.sh                     # presence-check command
```

Operator invokes `python -m scripts.factory.run --new-task --template data-report --repo grid-silicon --slug batch3-grid-silicon` and the factory:
1. Reads template
2. Substitutes `{SLUG}` / `{REPO}` / `{BRAND}` placeholders
3. Writes `ops/factory-tasks/batch3-grid-silicon.yaml`
4. Prints "edit this file, then `--task ops/factory-tasks/batch3-grid-silicon.yaml`"

### Persona reviewers — v0.1 architecture vs adding personas

The 6-persona list from Codex's plan (product, architecture, security, data-quality, UX, testing) is the v0.2+ target. v0.1 ships 2 because:
- We already have `review-architecture.md` + `review-security.md` shipped in `scripts/factory/prompts/`
- v2-lite proved each persona prompt needs careful engineering — adding 4 more without proving the pattern is speculation
- The factory's existing reviewer loop trivially supports `review.reviewers: [claude_code, claude_code]` (2-actor multi-lens); persona names just select which prompt each actor loads

v0.2 (spec 0020) adds the remaining 4 personas after observing where the current 2 miss issues.

### Defect log + handoff packet schemas

**`ops/factory-defects/<task-id>.jsonl`** — append-only:
```json
{"ts":"2026-06-21T01:23:45Z","kind":"gate.failed","gate":"expected_artifact:src/notary/cli.py","round":1,"phase":"impl","persona":"developer","summary":"CLI entry missing","resolved_in_round":2}
{"ts":"...","kind":"review.needs_patch","finding":"identity regex contradicts prose","round":0,"phase":"design","persona":"architecture","summary":"...","resolved_in_round":null}
```

**`ops/handoffs/<task-id>.md`** — single markdown file:
```markdown
# Handoff — <task-id>

Date: <ISO>
Status: done | blocked | failed
Trace: <trace_id>

## What shipped
- specs/0002-design/{requirements,design,tasks,acceptance}.md
- src/<pkg>/{...listed files...}
- one real artifact at <path>

## What's next
(from STATUS.md::next_feature_queue + open defect_log entries)

## Pick up via
- `python -m scripts.factory.run --task <next-task-yaml>` if queue is concrete
- OR re-spec under specs/0003+ if queue items are too vague

## Blocked on
(any open issues that need operator decision)
```

### Failure modes per new block

| Block | Failure | Behavior |
|---|---|---|
| contract.py validation | PRODUCT_BRIEF missing | gate.failed event, defect_log entry, route to patch loop |
| contract.py validation | expected_artifact missing | same (this is the BUG-FAC-007 fix) |
| defects.py write | I/O error writing jsonl | log warning, don't crash pipeline |
| handoffs.py write | path collision | overwrite; handoff is always the current snapshot |
| next_features.py | target STATUS.md unreadable | append a new STATUS.md skeleton instead of crashing |
| templates/<type>/ | template missing file | `--new-task` exits 2 with helpful error |

## Out of scope for v0.1

- 4 more persona prompts (product/UX/data-quality/testing) — spec 0020
- 5 more templates (rag-app, interactive-web-app, cli-tool, eval-harness, governance-control-plane, optimization-simulation) — spec 0020+
- LangGraph topology for parallel persona reviews — spec 0021+
- Multi-repo cross-DEC reconciliation (when two factories produce conflicting decisions about a shared interface) — spec 0022+
