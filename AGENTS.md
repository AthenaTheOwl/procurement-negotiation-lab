# Agent instructions

This repo is a public learning lab. Preserve the boundary:

- do not add internal Amazon data, real PO numbers, internal vendor terms, or roadmap claims
- credit `https://github.com/amzn/FloPro` only as a public implementation reference
- keep hosted execution safe: no arbitrary Python execution from user formulas
- prefer runnable, visible demos over invisible sophistication
- every new algorithm must return the common trace schema and benchmark metrics

Before merging implementation changes, run:

```powershell
python -m uv run pytest
python -m uv run ruff check .
python -m uv run mypy src
python -m uv run bandit -q -r src
```
