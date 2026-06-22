# Handoff - batch4-repo-position-coupling-index

Date: 2026-06-22T12:46:30Z
Title: Repo Position Coupling Index v0.1 data report
Status: done
Triage: INVESTIGATE
Trace: b265eac2c8fa4156a6590b9f8173c767
Target repo: E:/claude_code/random-apps/repo-position-coupling-index-task-batch4-repo-position-coupling-index

## What shipped
- done: branch factory/batch4-repo-position-coupling-index

## What's next
- Resolve factory defect: missing PRODUCT_BRIEF.md,SYSTEM_MAP.md
- Resolve factory defect: missing reports/*.jsonl
- Resolve factory defect: PRODUCT_BRIEF.md is required for active repos
- Resolve factory defect: SYSTEM_MAP.md is required for active repos
- Resolve factory defect: expected file 'PRODUCT_BRIEF.md' is missing
- Resolve factory defect: expected file 'SYSTEM_MAP.md' is missing
- Resolve factory defect: expected file 'repo_position_coupling_index/cli.py' is missing
- Resolve factory defect: expected glob 'reports/*.jsonl' matched no files
- Resolve factory defect: module 'cli' declares source 'repo_position_coupling_index/cli.py', but it is missing
- Resolve factory defect: module 'model' declares source 'repo_position_coupling_index/model.py', but it is missing
- Resolve factory defect: module 'report' declares source 'repo_position_coupling_index/scoring.py', but it is missing
- Resolve factory defect: claude_code review requested patch; inspect defect log

## Pick up via
- `python -m scripts.factory.run --show batch4-repo-position-coupling-index`
- `python -m scripts.factory.run --trace batch4-repo-position-coupling-index`

## Blocked on
- gate.failed: missing PRODUCT_BRIEF.md,SYSTEM_MAP.md
- gate.failed: missing reports/*.jsonl
- gate.failed: PRODUCT_BRIEF.md is required for active repos
- gate.failed: SYSTEM_MAP.md is required for active repos
- gate.failed: expected file 'PRODUCT_BRIEF.md' is missing
- gate.failed: expected file 'SYSTEM_MAP.md' is missing
- gate.failed: expected file 'repo_position_coupling_index/cli.py' is missing
- gate.failed: expected glob 'reports/*.jsonl' matched no files
- gate.failed: module 'cli' declares source 'repo_position_coupling_index/cli.py', but it is missing
- gate.failed: module 'model' declares source 'repo_position_coupling_index/model.py', but it is missing
- gate.failed: module 'report' declares source 'repo_position_coupling_index/scoring.py', but it is missing
- review.needs_patch: claude_code review requested patch; inspect defect log
