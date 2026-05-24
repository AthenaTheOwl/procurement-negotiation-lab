"""Validate the central tool registry (.agents/tools.yaml) against the
cross-repo `tool.schema.json` from athena-site.

The registry YAML carries a top-level `tools:` list; this script reads
the list and validates each entry against the schema. The schema is
fetched from
`https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/schemas/tool.schema.json`
at run time, with a local cache fallback at
`ops/schemas-cache/tool.schema.json` so CI runs offline.

Exit codes: 0 OK, 1 violations found.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / ".agents" / "tools.yaml"
CACHE_PATH = ROOT / "ops" / "schemas-cache" / "tool.schema.json"
REMOTE_URL = (
    "https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/"
    "ops/schemas/tool.schema.json"
)
FETCH_TIMEOUT_SECONDS = 5


def load_remote_schema() -> dict[str, Any] | None:
    try:
        req = urllib.request.Request(  # noqa: S310
            REMOTE_URL,
            headers={"User-Agent": "procurement-lab/validate_tools"},
        )
        with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT_SECONDS) as resp:  # noqa: S310
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        print(
            f"validate_tools: remote schema fetch failed ({exc.__class__.__name__}); "
            f"falling back to cache at {CACHE_PATH.relative_to(ROOT).as_posix()}",
            file=sys.stderr,
        )
        return None


def load_cached_schema() -> dict[str, Any]:
    if not CACHE_PATH.is_file():
        raise SystemExit(
            f"validate_tools: cached schema missing at "
            f"{CACHE_PATH.relative_to(ROOT).as_posix()}. Re-cache from "
            f"{REMOTE_URL} or restore the file."
        )
    return json.loads(CACHE_PATH.read_text(encoding="utf-8"))


def load_schema() -> dict[str, Any]:
    remote = load_remote_schema()
    if remote is not None:
        return remote
    return load_cached_schema()


def main() -> int:
    try:
        import jsonschema  # type: ignore[import-not-found]
    except ImportError as exc:
        raise SystemExit(
            "validate_tools: jsonschema is required. "
            "Install with `pip install jsonschema>=4.21`."
        ) from exc
    try:
        import yaml  # type: ignore[import-not-found]
    except ImportError as exc:
        raise SystemExit(
            "validate_tools: PyYAML is required. "
            "Install with `pip install pyyaml`."
        ) from exc

    if not REGISTRY_PATH.is_file():
        print(
            f"validate_tools: registry missing at "
            f"{REGISTRY_PATH.relative_to(ROOT).as_posix()}",
            file=sys.stderr,
        )
        return 1

    try:
        doc = yaml.safe_load(REGISTRY_PATH.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(f"validate_tools: YAML parse error: {exc}", file=sys.stderr)
        return 1

    if not isinstance(doc, dict) or "tools" not in doc:
        print(
            "validate_tools: registry must be a mapping with a `tools:` list",
            file=sys.stderr,
        )
        return 1

    tools = doc["tools"]
    if not isinstance(tools, list) or not tools:
        print("validate_tools: `tools:` must be a non-empty list", file=sys.stderr)
        return 1

    schema = load_schema()
    validator_cls = jsonschema.validators.validator_for(schema)
    validator_cls.check_schema(schema)
    validator = validator_cls(schema)

    rel = REGISTRY_PATH.relative_to(ROOT).as_posix()
    violations: list[str] = []
    seen_ids: set[str] = set()
    for idx, entry in enumerate(tools):
        if not isinstance(entry, dict):
            violations.append(f"{rel}: tools[{idx}] must be a mapping")
            continue
        tool_id = entry.get("id", f"<index {idx}>")
        if tool_id in seen_ids:
            violations.append(f"{rel}: duplicate tool id `{tool_id}`")
        seen_ids.add(tool_id)
        errors = list(validator.iter_errors(entry))
        for err_obj in errors:
            location = "/".join(str(part) for part in err_obj.absolute_path) or "<root>"
            violations.append(f"{rel}: tools[{idx}] ({tool_id}): {location}: {err_obj.message}")

    if violations:
        print("validate_tools: violations found", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        return 1

    print(f"validate_tools OK ({len(tools)} tool(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
