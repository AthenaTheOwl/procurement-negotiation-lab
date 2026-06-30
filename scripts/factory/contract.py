"""Active-MVP contract validators.

The factory uses these validators as hard gates after implementation and
user-defined gates. They are pure filesystem checks: no subprocesses, no network,
no model calls. The pipeline converts each violation into a GateOutcome so the
existing review/patch loop can handle fixes.
"""

from __future__ import annotations

import importlib
import importlib.util
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from .task import ExpectedArtifact, ModuleMapEntry

STATUS_REQUIRED_SECTIONS: tuple[str, ...] = (
    "## Current state",
    "## Known limits",
    "## Next feature queue",
)


@dataclass(frozen=True)
class ContractViolation:
    code: str
    path: str
    message: str
    required: bool = True

    def gate_name(self) -> str:
        safe_path = self.path.replace("\\", "/").replace("/", "-").replace("*", "glob").strip("-")
        return f"contract:{self.code}:{safe_path or 'root'}"


def validate_active_repo_files(repo_root: Path) -> list[ContractViolation]:
    """Check the root files required when a task has ``active: true``."""
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for filename in ("PRODUCT_BRIEF.md", "SYSTEM_MAP.md", "STATUS.md"):
        path = repo_root / filename
        if not path.is_file():
            violations.append(
                ContractViolation(
                    code="missing-active-file",
                    path=filename,
                    message=f"{filename} is required for active repos",
                )
            )
    status = repo_root / "STATUS.md"
    if status.is_file():
        text = status.read_text(encoding="utf-8")
        for section in STATUS_REQUIRED_SECTIONS:
            if section not in text:
                violations.append(
                    ContractViolation(
                        code="missing-status-section",
                        path="STATUS.md",
                        message=f"STATUS.md missing required section {section!r}",
                    )
                )
    return violations


def validate_expected_artifacts(
    repo_root: Path, artifacts: list[ExpectedArtifact]
) -> list[ContractViolation]:
    """Check expected artifact presence and optional non-empty constraints."""
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for artifact in artifacts:
        if artifact.kind == "glob":
            matches = sorted(repo_root.glob(artifact.path))
            if not matches:
                violations.append(
                    ContractViolation(
                        code="missing-expected-artifact",
                        path=artifact.path,
                        message=f"expected glob {artifact.path!r} matched no files",
                    )
                )
                continue
            if artifact.must_be_nonempty and not any(_path_has_content(p) for p in matches):
                violations.append(
                    ContractViolation(
                        code="empty-expected-artifact",
                        path=artifact.path,
                        message=f"expected glob {artifact.path!r} matched only empty paths",
                    )
                )
            continue

        path = repo_root / artifact.path
        if artifact.kind == "file" and not path.is_file():
            violations.append(
                ContractViolation(
                    code="missing-expected-artifact",
                    path=artifact.path,
                    message=f"expected file {artifact.path!r} is missing",
                )
            )
            continue
        if artifact.kind == "dir" and not path.is_dir():
            violations.append(
                ContractViolation(
                    code="missing-expected-artifact",
                    path=artifact.path,
                    message=f"expected directory {artifact.path!r} is missing",
                )
            )
            continue
        if artifact.must_be_nonempty and not _path_has_content(path):
            violations.append(
                ContractViolation(
                    code="empty-expected-artifact",
                    path=artifact.path,
                    message=f"expected artifact {artifact.path!r} is empty",
                )
            )
    return violations


def validate_module_map(repo_root: Path, modules: list[ModuleMapEntry]) -> list[ContractViolation]:
    """Check that every declared module source exists."""
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for module in modules:
        source = repo_root / module.source
        if not source.is_file():
            violations.append(
                ContractViolation(
                    code="missing-module-source",
                    path=module.source,
                    message=(
                        f"module {module.name!r} declares source "
                        f"{module.source!r}, but it is missing"
                    ),
                )
            )
    return violations


def validate_interfaces(repo_root: Path, modules: list[ModuleMapEntry]) -> list[ContractViolation]:
    """Check declared public interface symbols on module sources."""
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for module in modules:
        if not module.public_interfaces:
            continue
        source = repo_root / module.source
        imported, import_error = _import_module_source(repo_root, module.source)
        if imported is None:
            for signature in module.public_interfaces:
                symbol = _symbol_name(signature)
                violations.append(
                    ContractViolation(
                        code="missing-interface",
                        path=module.source,
                        message=(
                            f"module {module.name!r} could not be imported from "
                            f"{module.source!r} while checking {symbol!r}: {import_error}"
                        ),
                    )
                )
            continue
        for signature in module.public_interfaces:
            symbol = _symbol_name(signature)
            attr = getattr(imported, symbol, None)
            if not callable(attr):
                violations.append(
                    ContractViolation(
                        code="missing-interface",
                        path=module.source,
                        message=(
                            f"module {module.name!r} declares public interface "
                            f"{symbol!r}, but {module.source!r} does not expose a callable"
                        ),
                    )
                )
        if not source.is_file():
            violations.append(
                ContractViolation(
                    code="missing-interface",
                    path=module.source,
                    message=f"module {module.name!r} source {module.source!r} is missing",
                )
            )
    return violations


def validate_artifact_content(
    repo_root: Path, artifacts: list[ExpectedArtifact]
) -> list[ContractViolation]:
    """Check artifact contents that presence gates cannot prove."""
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for artifact in artifacts:
        for path in _artifact_files(repo_root, artifact):
            rel_path = _relative_path(repo_root, path)
            if path.name == "STATUS.md":
                violations.extend(_validate_status_content(path, rel_path))
            if path.suffix == ".jsonl":
                violations.extend(_validate_jsonl_content(path, rel_path))
            placeholder = _placeholder_violation(path, rel_path)
            if placeholder is not None:
                violations.append(placeholder)
    return violations


def validate_first_action(
    repo_root: Path, first_user_action: str | None
) -> list[ContractViolation]:
    """Run the repo's advertised first command and report failure as a violation."""
    if first_user_action is None or not first_user_action.strip():
        return []
    repo_root = repo_root.resolve()
    command = _split_command(first_user_action)
    if not command:
        return []
    # Run inside the repo's uv environment when it has a pyproject, using the uv
    # BINARY. `sys.executable -m uv` fails when the factory's interpreter has no
    # uv module ("No module named uv") — a false first-action failure even though
    # the command works under `uv run`. Skip the wrap if the command already
    # invokes uv (avoid double-wrapping).
    if (repo_root / "pyproject.toml").is_file() and "uv" not in command[:3]:
        uv = shutil.which("uv")
        if uv:
            command = [uv, "run", *command]
    try:
        result = subprocess.run(  # noqa: S603
            command,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            stdin=subprocess.DEVNULL,
            timeout=120,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        return [
            ContractViolation(
                code="first-action-failed",
                path=".",
                message=f"first_user_action timed out after {exc.timeout}s: {first_user_action}",
            )
        ]
    except OSError as exc:
        return [
            ContractViolation(
                code="first-action-failed",
                path=".",
                message=f"first_user_action could not start: {exc}",
            )
        ]
    if result.returncode == 0:
        return []
    output = "\n".join((result.stdout + result.stderr).strip().splitlines()[-3:])
    return [
        ContractViolation(
            code="first-action-failed",
            path=".",
            message=(
                f"first_user_action exited {result.returncode}: {first_user_action}"
                + (f"\n{output}" if output else "")
            ),
        )
    ]


def validate_contract(
    repo_root: Path,
    *,
    active: bool,
    artifacts: list[ExpectedArtifact],
    modules: list[ModuleMapEntry],
) -> list[ContractViolation]:
    """Run every contract validator required by this task."""
    violations: list[ContractViolation] = []
    if active:
        violations.extend(validate_active_repo_files(repo_root))
    if artifacts:
        violations.extend(validate_expected_artifacts(repo_root, artifacts))
    if modules:
        violations.extend(validate_module_map(repo_root, modules))
    return violations


def _path_has_content(path: Path) -> bool:
    if path.is_file():
        return path.stat().st_size > 0
    if path.is_dir():
        return any(path.iterdir())
    return False


def _artifact_files(repo_root: Path, artifact: ExpectedArtifact) -> list[Path]:
    if artifact.kind == "glob":
        return [path for path in sorted(repo_root.glob(artifact.path)) if path.is_file()]
    path = repo_root / artifact.path
    if artifact.kind == "file" and path.is_file():
        return [path]
    return []


def _validate_jsonl_content(path: Path, rel_path: str) -> list[ContractViolation]:
    rows = 0
    violations: list[ContractViolation] = []
    for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            json.loads(line)
        except json.JSONDecodeError as exc:
            violations.append(
                ContractViolation(
                    code="thin-artifact",
                    path=rel_path,
                    message=f"{rel_path} line {idx} is not valid JSON: {exc.msg}",
                )
            )
        rows += 1
    if rows == 0:
        violations.append(
            ContractViolation(
                code="thin-artifact",
                path=rel_path,
                message=f"{rel_path} has no JSONL rows",
            )
        )
    return violations


def _validate_status_content(path: Path, rel_path: str) -> list[ContractViolation]:
    text = path.read_text(encoding="utf-8")
    violations: list[ContractViolation] = []
    for section in STATUS_REQUIRED_SECTIONS:
        body = _section_body(text, section)
        if not body.strip():
            violations.append(
                ContractViolation(
                    code="thin-artifact",
                    path=rel_path,
                    message=f"{rel_path} section {section!r} has no body",
                )
            )
    return violations


def _section_body(text: str, heading: str) -> str:
    marker = text.find(heading)
    if marker == -1:
        return ""
    body_start = marker + len(heading)
    next_heading = text.find("\n## ", body_start)
    if next_heading == -1:
        return text[body_start:]
    return text[body_start:next_heading]


_PLACEHOLDER_RE = re.compile(
    r"(?i)\b(todo|tbd|fixme|lorem ipsum|replace me|your[-_ ][a-z0-9_-]+ here)\b"
)


def _placeholder_violation(path: Path, rel_path: str) -> ContractViolation | None:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None
    if not text.strip():
        return None
    matches = _PLACEHOLDER_RE.findall(text)
    if not matches:
        return None
    lines = [line for line in text.splitlines() if line.strip()]
    placeholder_lines = [line for line in lines if _PLACEHOLDER_RE.search(line)]
    word_count = len(re.findall(r"\w+", text))
    dominated = len(placeholder_lines) >= max(1, len(lines) // 3) or word_count <= 80
    if not dominated:
        return None
    return ContractViolation(
        code="placeholder-artifact",
        path=rel_path,
        message=f"{rel_path} is dominated by placeholder text",
    )


def _import_module_source(repo_root: Path, source: str) -> tuple[object | None, str]:
    source_path = repo_root / source
    if not source_path.is_file():
        return None, "source file is missing"
    module_name = _dotted_module_name(source)
    added_paths = [str(repo_root), str(repo_root / "src")]
    old_path = list(sys.path)
    try:
        for item in reversed(added_paths):
            if item not in sys.path:
                sys.path.insert(0, item)
        _evict_stale_module_cache(module_name, repo_root)
        try:
            return importlib.import_module(module_name), ""
        except Exception as exc:  # noqa: BLE001
            fallback_name = f"_factory_contract_{abs(hash(source_path))}"
            spec = importlib.util.spec_from_file_location(fallback_name, source_path)
            if spec is None or spec.loader is None:
                return None, str(exc)
            module = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(module)
            except Exception as fallback_exc:  # noqa: BLE001
                return None, f"{exc}; fallback import failed: {fallback_exc}"
            return module, ""
    finally:
        sys.path[:] = old_path


def _dotted_module_name(source: str) -> str:
    path = Path(source)
    parts = list(path.with_suffix("").parts)
    if parts and parts[0] == "src":
        parts = parts[1:]
    return ".".join(parts)


def _evict_stale_module_cache(module_name: str, repo_root: Path) -> None:
    parts = module_name.split(".")
    for idx in range(1, len(parts) + 1):
        name = ".".join(parts[:idx])
        module = sys.modules.get(name)
        if module is None:
            continue
        paths = [Path(str(path)).resolve() for path in getattr(module, "__path__", [])]
        file_value = getattr(module, "__file__", "")
        if file_value:
            paths.append(Path(str(file_value)).resolve())
        if paths and not any(_is_relative_to(path, repo_root) for path in paths):
            sys.modules.pop(name, None)


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def _symbol_name(signature: str) -> str:
    head = signature.split("(", 1)[0].split(":", 1)[0].strip()
    return head.rsplit(".", 1)[-1]


def _relative_path(repo_root: Path, path: Path) -> str:
    try:
        return path.relative_to(repo_root).as_posix()
    except ValueError:
        return path.as_posix()


def _split_command(command: str) -> list[str]:
    return shlex.split(command, posix=os.name != "nt")
