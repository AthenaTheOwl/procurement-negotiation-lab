"""One-shot helper: emit 15 factory task YAMLs for batch 2.

5 repos × {design, impl, test-matrix}. Run from procurement-negotiation-lab/.
Re-runnable; overwrites existing files.
"""
from __future__ import annotations
from pathlib import Path

OUT = Path("ops/factory-tasks")

# Per-repo: (slug, brand_prefix, v0_one_liner, impl_files_list, test_smoke_cmd)
REPOS = [
    (
        "agent-notary-layer",
        "NOT",
        "JSON Schema for agent receipts + reference verifier CLI for `verify` (one receipt) and `verify-chain` (a directory of receipts).",
        "spec/agent-receipt.schema.json + spec/RFC-001-receipt-format.md (excerpt) + src/notary/{__init__,verifier,canonical,cli}.py + conformance/positive/*.json + conformance/negative/*.json + tests/test_verifier.py + tests/test_cli.py + pyproject.toml",
        "python -m uv run python -m notary verify conformance/positive/example.json",
    ),
    (
        "site-atlas",
        "ATL",
        "Astro site rendering ERCOT large-load queue projects from a synthetic data fixture (real GridSilicon export pluggable later) with per-project pages + methodology + voice-charter.",
        "package.json (astro + tailwind) + astro.config.mjs + src/data/ercot.example.json (5 sample projects) + src/pages/{index,methodology,[slug]}.astro + src/layouts/Base.astro + decisions/DEC-001-civic-voice-charter.md",
        "npm run build",
    ),
    (
        "ratepayer-exposure",
        "RPE",
        "Astro page with a client-side ZIP-code calculator computing 2026-2030 bill-delta from a documented formula + sanity-bounds gate + methodology page.",
        "package.json (astro + typescript) + src/lib/bill_delta.ts + src/lib/bill_delta.test.ts + src/pages/{calculator,methodology}.astro + decisions/DEC-001-assumption-charter.md + eval/sanity_bounds.py",
        "npm run build && python eval/sanity_bounds.py",
    ),
    (
        "puc-docket-rag",
        "PDR",
        "Python ingester for one VA PUC docket fixture + chunker + FAISS index + structured-extraction for cost_allocation_rule + search CLI. (Astro page deferred to v0.2; v0.1 is the data + retrieval layer.)",
        "pyproject.toml + src/pdr/{__init__,ingest,chunk,index,extract,search,cli}.py + data/fixtures/va-example-docket.pdf or .txt + tests/test_chunk.py + tests/test_search.py + decisions/DEC-001-citation-faithfulness-contract.md",
        "python -m uv run python -m pdr search --query 'cost allocation' --k 3",
    ),
    (
        "proof-gate-runner",
        "PGR",
        "Composite GitHub Action that runs a comma-separated list of gates (currently: voice_lint, spec_check, ruff, pytest) and emits a PR comment summarizing pass/fail per gate.",
        "action.yml (composite action) + scripts/run_gates.sh + scripts/lib/{voice_lint,spec_check,gates}.py + .github/workflows/self-test.yml + tests/test_run_gates.sh + decisions/DEC-001-gate-rule-corpus-v0.md",
        "bash scripts/run_gates.sh --gates voice_lint,spec_check",
    ),
]


def design_yaml(slug: str, prefix: str, oneliner: str) -> str:
    return f"""id: batch2-{slug}-design
title: "{slug} phase 1: design review"
target_repo: e:/claude_code/random-apps/{slug}
base_branch: main

phase: design
persona: architect

goal: |
  Read this repo's specs/0001-foundation/ files (requirements, design,
  tasks, acceptance) plus README.md and AGENTS.md. Then DRAFT
  specs/0002-design/{{requirements,design,tasks,acceptance}}.md narrowing
  scope to v0.1 = "{oneliner}".

  Each design file should:
  - requirements.md: 8-12 R-{prefix}-V1-NNN requirements that the v0.1
    impl phase can ship. Carry over the relevant R-{prefix}-NNN from
    spec 0001 and refine; defer anything bigger to spec 0003+.
  - design.md: block decomposition + interfaces + failure-modes-per-block
    + an explicit "out of scope for v0.1" list.
  - tasks.md: 10-15 checkbox tasks ordered for the next 1-2 PRs.
  - acceptance.md: concrete CLI/build commands the v0.1 must pass on a
    fresh clone.

  Then SELF-REVIEW using both prompts at:
  - e:/claude_code/random-apps/procurement-negotiation-lab/scripts/factory/prompts/review-architecture.md
  - e:/claude_code/random-apps/procurement-negotiation-lab/scripts/factory/prompts/review-security.md

  Combined verdict {{CLEAN, NEEDS_PATCH, REJECT}} + 1-6 findings tagged
  by lens. Voice: lowercase, plain assertion, no marketing words
  (no "leverage", "demonstrates", "synergy", "robust", "best-in-class").

risk: low
checkpoints: []

gates:
  - cmd: test -f specs/0002-design/requirements.md
    name: design-requirements-exists
  - cmd: test -f specs/0002-design/design.md
    name: design-design-exists
  - cmd: test -f specs/0002-design/tasks.md
    name: design-tasks-exists
  - cmd: test -f specs/0002-design/acceptance.md
    name: design-acceptance-exists

review:
  reviewer: claude_code
  max_patch_rounds: 2

pr:
  open: false
  base: main
  draft: true

planner: claude_code
implementer: claude_code
"""


def impl_yaml(slug: str, prefix: str, files: str, smoke: str) -> str:
    return f"""id: batch2-{slug}-impl
title: "{slug} phase 2: impl"
target_repo: e:/claude_code/random-apps/{slug}
base_branch: main

phase: impl
persona: developer

goal: |
  Phase 1 (batch2-{slug}-design) produced specs/0002-design/. Implement
  the v0.1 it describes. Files to create:

  {files}

  Discipline:
  - ONE shippable artifact. Defer everything bigger to spec 0003+.
  - No marketing words. Lowercase headings in any README updates.
  - No API keys committed, no `.env` files with real values.
  - For data fixtures: small (<10KB), synthetic or clearly-public.
  - Tests must actually exercise the code, not just import-smoke.

  If a needed library isn't standard:
  - Python: prefer stdlib; otherwise pin in pyproject.toml.
  - Node/Astro: prefer npm-installable, no preview-only packages.

  When the impl is done, ensure all gates listed below pass locally.

risk: medium
checkpoints: []

gates:
  - cmd: ls specs/0002-design/requirements.md
    name: design-spec-exists
  - cmd: {smoke}
    name: smoke

review:
  reviewer: claude_code
  max_patch_rounds: 3

pr:
  open: false
  base: main
  draft: true

planner: claude_code
implementer: claude_code
"""


def test_yaml(slug: str, prefix: str) -> str:
    return f"""id: batch2-{slug}-test
title: "{slug} phase 3: test matrix"
target_repo: e:/claude_code/random-apps/{slug}
base_branch: main

phase: test
persona: tester

goal: |
  Phase 2 landed src/ + tests/ + an entry point. Phase 3 expands the
  test surface:

  - tests/unit (already present from phase 2): ensure all pass
  - tests/integration (new): one end-to-end test exercising the full
    v0.1 path on a fixture
  - tests/interface (new): schema or contract validation
  - tests/edge (advisory): boundary cases
  - Update README with "how to run tests"

  No new src/ code in this phase; tests + docs only.

risk: low
checkpoints: []

gates:
  - cmd: ls tests
    name: tests-dir-exists

test_matrix:
  - tier: unit
    cmd: |
      if [ -f pyproject.toml ]; then python -m uv run pytest tests/unit tests/ -q 2>/dev/null || python -m uv run pytest tests/ -q; else npm test; fi
    blocking: true
  - tier: integration
    cmd: |
      if [ -f pyproject.toml ]; then python -m uv run pytest tests/integration -q 2>/dev/null || echo "no integration tests yet"; else npm test --if-present -- --grep integration 2>/dev/null || echo "no integration tests yet"; fi
    blocking: false
  - tier: interface
    cmd: |
      if [ -f pyproject.toml ]; then python -m uv run pytest tests/interface -q 2>/dev/null || echo "no interface tests yet"; else echo "no interface tests yet"; fi
    blocking: false
  - tier: edge
    cmd: |
      if [ -f pyproject.toml ]; then python -m uv run pytest tests/edge -q 2>/dev/null || echo "no edge tests yet"; else echo "no edge tests yet"; fi
    blocking: false

review:
  reviewer: claude_code
  max_patch_rounds: 2

pr:
  open: false
  base: main
  draft: true

planner: claude_code
implementer: claude_code
"""


def main():
    written = 0
    for slug, prefix, oneliner, files, smoke in REPOS:
        OUT.joinpath(f"batch2-{slug}-design.yaml").write_text(
            design_yaml(slug, prefix, oneliner), encoding="utf-8"
        )
        OUT.joinpath(f"batch2-{slug}-impl.yaml").write_text(
            impl_yaml(slug, prefix, files, smoke), encoding="utf-8"
        )
        OUT.joinpath(f"batch2-{slug}-test.yaml").write_text(
            test_yaml(slug, prefix), encoding="utf-8"
        )
        written += 3
    print(f"wrote {written} YAMLs to {OUT}")


if __name__ == "__main__":
    main()
