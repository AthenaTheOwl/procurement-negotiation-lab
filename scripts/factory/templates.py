"""Factory task-template loader."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

TEMPLATE_ROOT = Path("ops/factory-templates")
TASK_OUTPUT_DIR = Path("ops/factory-tasks")
PLACEHOLDERS = ("SLUG", "PACKAGE", "REPO", "BRAND", "TASK_ID", "NOW")


class TemplateError(RuntimeError):
    pass


@dataclass(frozen=True)
class RenderedTask:
    path: Path
    task_id: str
    template: str


def available_templates(template_root: Path = TEMPLATE_ROOT) -> list[str]:
    if not template_root.is_dir():
        return []
    return sorted(path.name for path in template_root.iterdir() if path.is_dir())


def render_new_task(
    *,
    template: str,
    repo: str,
    task_id: str,
    slug: str | None = None,
    brand: str | None = None,
    now: str | None = None,
    template_root: Path = TEMPLATE_ROOT,
    output_dir: Path = TASK_OUTPUT_DIR,
) -> RenderedTask:
    """Render ``task.yaml.tmpl`` and write ``ops/factory-tasks/<task-id>.yaml``."""
    template_dir = template_root / template
    task_template = template_dir / "task.yaml.tmpl"
    if not task_template.is_file():
        available = ", ".join(available_templates(template_root)) or "(none)"
        raise TemplateError(
            f"unknown template {template!r}; expected task.yaml.tmpl. available: {available}"
        )
    values = {
        "SLUG": slug or _slug_from_repo(repo),
        "PACKAGE": _package_from_slug(slug or _slug_from_repo(repo)),
        "REPO": repo,
        "BRAND": brand or _brand_from_slug(slug or _slug_from_repo(repo)),
        "TASK_ID": task_id,
        "NOW": now or datetime.now(UTC).replace(microsecond=0).isoformat(),
    }
    rendered = _substitute(task_template.read_text(encoding="utf-8"), values)
    parsed = yaml.safe_load(rendered)
    if not isinstance(parsed, dict):
        raise TemplateError("task.yaml.tmpl must render to a YAML mapping")
    parsed.setdefault("template", template)
    _merge_optional_yaml(
        parsed, "expected_artifacts", template_dir / "expected_artifacts.yaml", values
    )
    _merge_optional_yaml(parsed, "module_map", template_dir / "module_map.yaml", values)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{task_id}.yaml"
    output_path.write_text(
        yaml.safe_dump(parsed, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )
    return RenderedTask(path=output_path, task_id=task_id, template=template)


def _merge_optional_yaml(
    parsed: dict[str, Any], key: str, path: Path, values: dict[str, str]
) -> None:
    if key in parsed or not path.is_file():
        return
    text = _substitute(path.read_text(encoding="utf-8"), values)
    value = yaml.safe_load(text)
    if value is None:
        value = []
    if not isinstance(value, list):
        raise TemplateError(f"{path.name} must render to a YAML list")
    parsed[key] = value


def _substitute(text: str, values: dict[str, str]) -> str:
    out = text
    for key in PLACEHOLDERS:
        out = out.replace("{" + key + "}", values[key])
    return out


def _slug_from_repo(repo: str) -> str:
    return Path(repo).name.replace("_", "-").lower()


def _brand_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.replace("_", "-").split("-") if part)


def _package_from_slug(slug: str) -> str:
    return slug.replace("-", "_").replace(".", "_").lower()
