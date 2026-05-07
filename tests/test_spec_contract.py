from __future__ import annotations

import importlib.util
from pathlib import Path


def test_active_spec_contract_is_complete() -> None:
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "spec_check.py"
    spec = importlib.util.spec_from_file_location("spec_check", script_path)
    assert spec is not None
    assert spec.loader is not None
    spec_check = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(spec_check)
    spec_check.main()
