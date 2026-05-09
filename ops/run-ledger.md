# run ledger

Append one row per spec pass. Use `pending` for the SHA before the commit is
created, then amend the row with the final SHA.

| Date | Spec pass | Commit | Evidence | Follow-ups |
|---|---|---|---|---|
| 2026-05-09 | 0003 Pass A - hero | `bc67c41` | `npm.cmd run build`; `npm.cmd run test -- --run`; `python -m uv run python scripts/spec_check.py`; `python -m uv run pytest`; `python -m uv run ruff check .`; `python -m uv run mypy src`; `python -m uv run bandit -q -r src`; `python -m uv run pip-audit`; Browser plugin verified hero + source link + CTA; screenshot saved at `ops/qa-evidence/0003-pass-a-hero.png` | Pass B must replace the arc placeholder with the full 8-step arc. |
