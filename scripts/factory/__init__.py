"""scripts.factory — a small in-repo software-engineering factory.

Reads a task spec YAML, runs planner → implementer → gates → reviewer in a
git worktree, persists state to ops/factory.db so it can resume across runs,
and (optionally) opens a draft PR via `gh`.

Entry point: `python -m scripts.factory.run --task ops/factory-tasks/<file>.yaml`

See scripts/factory/README.md for the model.
"""

__version__ = "0.1.0"
