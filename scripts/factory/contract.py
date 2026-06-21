"""Active-MVP contract validators.

The factory uses these validators as hard gates after implementation and
user-defined gates. They are pure filesystem checks: no subprocesses, no network,
no model calls. The pipeline converts each violation into a GateOutcome so the
existing review/patch loop can handle fixes.
"""

from __future__ import annotations

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
