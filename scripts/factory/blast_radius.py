"""Pre-commit blast-radius checks for factory tasks."""

from __future__ import annotations

import fnmatch
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .task import BlastRadiusSpec


@dataclass(frozen=True)
class BlastRadiusFinding:
    code: str
    message: str
    path: str = ""


_SECRET_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bsk-proj-[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bAIza[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(
        r"(?i)\b(api[_-]?key|secret|token)\b\s*[:=]\s*[\"']?[A-Za-z0-9_./+=-]{20,}"
    ),
)


def evaluate_blast_radius(
    worktree: Path,
    *,
    base_branch: str,
    spec: BlastRadiusSpec,
) -> list[BlastRadiusFinding]:
    """Return hard-gate findings for the current worktree diff."""
    changed = sorted(_changed_files(worktree, base_branch, spec))
    findings: list[BlastRadiusFinding] = []

    if spec.allowed_paths:
        for path in changed:
            if not any(_pattern_matches(pattern, path) for pattern in spec.allowed_paths):
                findings.append(
                    BlastRadiusFinding(
                        code="allowed-paths",
                        path=path,
                        message=f"{path} is outside allowed_paths",
                    )
                )

    for path in changed:
        if any(_pattern_matches(pattern, path) for pattern in spec.forbidden_paths):
            findings.append(
                BlastRadiusFinding(
                    code="forbidden-paths",
                    path=path,
                    message=f"{path} matches forbidden_paths",
                )
            )

    if spec.max_changed_files is not None and len(changed) > spec.max_changed_files:
        findings.append(
            BlastRadiusFinding(
                code="diff-size-files",
                message=(
                    f"{len(changed)} changed files exceeds max_changed_files="
                    f"{spec.max_changed_files}"
                ),
            )
        )

    diff_lines = _diff_line_count(worktree, base_branch, changed)
    if spec.max_diff_lines is not None and diff_lines > spec.max_diff_lines:
        findings.append(
            BlastRadiusFinding(
                code="diff-size-lines",
                message=f"{diff_lines} changed lines exceeds max_diff_lines={spec.max_diff_lines}",
            )
        )

    if spec.secret_scan:
        secret_path = _first_secret_hit(worktree, base_branch, changed)
        if secret_path is not None:
            findings.append(
                BlastRadiusFinding(
                    code="sensitive-disclosure",
                    path=secret_path,
                    message=f"{secret_path} contains a secret-like token in the pending diff",
                )
            )

    return findings


def _changed_files(worktree: Path, base_branch: str, spec: BlastRadiusSpec) -> set[str]:
    names: set[str] = set()
    for args in (
        ("diff", "--name-only", f"{base_branch}...HEAD"),
        ("diff", "--name-only"),
        ("diff", "--cached", "--name-only"),
        ("ls-files", "--others", "--exclude-standard"),
    ):
        result = _git(worktree, *args)
        for line in result.stdout.splitlines():
            path = _normalize_repo_path(line)
            if path:
                names.add(path)

    ignored = _git(worktree, "ls-files", "--others", "--ignored", "--exclude-standard")
    for line in ignored.stdout.splitlines():
        path = _normalize_repo_path(line)
        if path and _should_scan_ignored_path(path, spec):
            names.add(path)
    return names


def _diff_line_count(worktree: Path, base_branch: str, changed: list[str]) -> int:
    counted_paths: set[str] = set()
    total = 0
    for args in (
        ("diff", "--numstat", f"{base_branch}...HEAD"),
        ("diff", "--numstat"),
        ("diff", "--cached", "--numstat"),
    ):
        result = _git(worktree, *args)
        for line in result.stdout.splitlines():
            parts = line.split("\t")
            if len(parts) < 3:
                continue
            added, deleted, path = parts[0], parts[1], _normalize_repo_path(parts[2])
            counted_paths.add(path)
            if added == "-" or deleted == "-":
                total += 1
            else:
                total += int(added) + int(deleted)

    for path in changed:
        if path in counted_paths:
            continue
        file_path = worktree / path
        if not file_path.is_file():
            continue
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            total += 1
            continue
        total += max(1, len(text.splitlines()))
    return total


def _first_secret_hit(worktree: Path, base_branch: str, changed: list[str]) -> str | None:
    for args in (
        ("diff", f"{base_branch}...HEAD"),
        ("diff",),
        ("diff", "--cached"),
    ):
        result = _git(worktree, *args)
        if _contains_secret(result.stdout):
            return "git-diff"
    for path in changed:
        file_path = worktree / path
        if not file_path.is_file():
            continue
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if _contains_secret(text):
            return path
    return None


def _contains_secret(text: str) -> bool:
    return any(pattern.search(text) for pattern in _SECRET_PATTERNS)


def _should_scan_ignored_path(path: str, spec: BlastRadiusSpec) -> bool:
    if any(_pattern_matches(pattern, path) for pattern in spec.forbidden_paths):
        return True
    name = Path(path).name.lower()
    return (
        name == ".env"
        or name.startswith(".env.")
        or name.endswith(".pem")
        or name.endswith(".key")
        or name.endswith(".p12")
        or name.endswith(".pfx")
        or name in {"id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"}
    )


def _pattern_matches(pattern: str, path: str) -> bool:
    normalized = pattern.rstrip("/")
    if pattern.endswith("/") and path.startswith(pattern):
        return True
    return (
        fnmatch.fnmatchcase(path, normalized)
        or fnmatch.fnmatchcase(path, f"{normalized}/**")
        or path == normalized
        or path.startswith(f"{normalized}/")
    )


def _normalize_repo_path(value: str) -> str:
    path = value.strip().replace("\\", "/")
    if path.startswith("./"):
        return path[2:]
    return path


def _git(worktree: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603
        ["git", "-C", str(worktree), *args],  # noqa: S607
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
