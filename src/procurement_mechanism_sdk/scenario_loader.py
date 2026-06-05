"""Load `Scenario` instances from YAML files in the `scenarios/` directory.

Each YAML file describes one canonical scenario in the `Scenario` Pydantic
schema (see `procurement_lab.engine.schemas.Scenario`). Validation errors
raise pydantic `ValidationError` with the YAML path attached to the
message so failed loads point at the offending file.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterator

import yaml

from procurement_lab.engine.schemas import Scenario


DEFAULT_SCENARIOS_DIR = Path(__file__).resolve().parents[2].parent / "scenarios"


def load_scenario(path: Path | str) -> Scenario:
    """Load a single scenario YAML and validate as a `Scenario`."""
    p = Path(path)
    data = yaml.safe_load(p.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{p}: top-level YAML must be a mapping")
    try:
        return Scenario.model_validate(data)
    except Exception as exc:
        raise ValueError(f"{p}: {exc}") from exc


def load_all_scenarios(
    scenarios_dir: Path | str = DEFAULT_SCENARIOS_DIR,
) -> dict[str, Scenario]:
    """Load every `*.yaml` file in `scenarios_dir`. Returns {scenario.id: Scenario}."""
    d = Path(scenarios_dir)
    out: dict[str, Scenario] = {}
    for p in sorted(d.glob("*.yaml")):
        s = load_scenario(p)
        if s.id in out:
            raise ValueError(f"duplicate scenario id `{s.id}` in {p} (already loaded earlier)")
        out[s.id] = s
    return out


def iter_scenario_paths(
    scenarios_dir: Path | str = DEFAULT_SCENARIOS_DIR,
) -> Iterator[Path]:
    """Yield scenario YAML paths, sorted for determinism."""
    return iter(sorted(Path(scenarios_dir).glob("*.yaml")))
