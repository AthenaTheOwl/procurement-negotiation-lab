"""Public-repo hardening gates for defect classes that presence/behavior gates —
and a repo's own tests — do not catch.

Evidenced by the 2026-06-30 portfolio sweep, which shipped these past green suites:

- **tool-markup / template residue** leaked into committed text. Nine repos shipped
  READMEs ending in ``</content></invoke>`` (Claude tool-call XML). Eight had green
  test suites because no test reads the README. The lesson: a content gate must be
  factory-enforced and scan *all* committed text, never delegated to the generated
  repo's tests.
- **ornamental output** — the advertised first action exits 0 but prints nothing
  structured ("ok", an empty table). Presence + exit-0 gates pass it.
- **disclosure** — secret shapes in committed text (narrowed to zero-false-positive
  checks; see ``validate_disclosure``).

Pure checks: git + filesystem, no network, no model. Reuses ``ContractViolation``
so these wire into the factory gate loop, and ships a ``main`` runner so the same
checks sweep existing repos.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from .contract import ContractViolation
from .workers import resolve_uv

# Only text files carry these defects; skip binaries and vendored/build trees.
# We enumerate via ``git ls-files`` so only *tracked* files are scanned (a repo's
# .gitignore already excludes .venv / node_modules / dist).
TEXT_SUFFIXES = frozenset(
    {
        ".md", ".mdx", ".txt", ".rst", ".py", ".json", ".jsonl",
        ".yml", ".yaml", ".toml", ".cfg", ".ini", ".html",
    }
)

# Claude tool-call XML that must never appear in a committed file. The exact
# corruption the sweep found, plus its siblings.
_TOOL_MARKUP = re.compile(r"</?(content|invoke|parameter|function_calls)\b|antml:")

# Unambiguous scaffolding left in a shipped repo. Kept conservative — anything
# here should be a clear "never ship this", not a normal code comment.
_TEMPLATE_RESIDUE = re.compile(
    r"your[- ]project[- ]here|lorem ipsum|<placeholder>|REPLACE[_-]ME"
    r"|TODO:\s*implement\b|# ?FIXME:? *$",
    re.IGNORECASE,
)

# Secret shapes — high value, low false-positive. A hit is blocking and NOT
# auto-fixable (it may be a real leaked credential a human must rotate).
_SECRET_SHAPES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("openai-key", re.compile(r"\bsk-[A-Za-z0-9]{20,}")),
    ("aws-access-key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("github-token", re.compile(r"\bghp_[A-Za-z0-9]{36}\b")),
    ("google-api-key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("slack-token", re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{10,}")),
    ("private-key-block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    (
        "inline-api-key",
        re.compile(r"""api[_-]?key\s*[=:]\s*['"][A-Za-z0-9_\-]{16,}['"]""", re.IGNORECASE),
    ),
)

# NOTE: a marketing-word gate was built and then removed. Validated against the
# whole portfolio it was 100% false positives — "leverage" is a real term here
# (operating leverage, negotiating leverage, highest-leverage), and AGENTS.md /
# spec files legitimately *quote* the banned words as a rule. Voice is already
# handled per-repo by the curated voice_lint; a noisy duplicate gate is worse than
# none. Disclosure keeps only the zero-false-positive, high-value check: secrets.

# Output shorter than this, or matching only these tokens, is treated as ornamental.
_ORNAMENTAL_TOKENS = frozenset({"ok", "done", "success", "complete", "finished", ""})


def _tracked_text_files(repo_root: Path) -> list[Path]:
    """Tracked text files, via ``git ls-files`` so .gitignore is respected."""
    try:
        result = subprocess.run(  # noqa: S603
            ["git", "-C", str(repo_root), "ls-files"],  # noqa: S607
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        return []
    if result.returncode != 0:
        return []
    out: list[Path] = []
    for rel in result.stdout.splitlines():
        rel = rel.strip()
        if not rel:
            continue
        path = repo_root / rel
        if path.suffix.lower() in TEXT_SUFFIXES and path.is_file():
            out.append(path)
    return out


def _first_hit_line(text: str, pattern: re.Pattern[str]) -> tuple[int, str] | None:
    for lineno, line in enumerate(text.splitlines(), start=1):
        if pattern.search(line):
            return lineno, line.strip()[:120]
    return None


def validate_no_tool_markup(repo_root: Path) -> list[ContractViolation]:
    """Repo-wide: no tool-call XML or template residue in any committed text file."""
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for path in _tracked_text_files(repo_root):
        text = path.read_text(encoding="utf-8", errors="ignore")
        rel = path.relative_to(repo_root).as_posix()
        markup = _first_hit_line(text, _TOOL_MARKUP)
        if markup is not None:
            lineno, snippet = markup
            violations.append(
                ContractViolation(
                    code="tool-markup",
                    path=rel,
                    message=f"tool-call markup committed to {rel}:{lineno}: {snippet!r}",
                )
            )
        residue = _first_hit_line(text, _TEMPLATE_RESIDUE)
        if residue is not None:
            lineno, snippet = residue
            violations.append(
                ContractViolation(
                    code="template-residue",
                    path=rel,
                    message=f"template residue in {rel}:{lineno}: {snippet!r}",
                )
            )
    return violations


def validate_disclosure(repo_root: Path) -> list[ContractViolation]:
    """Secret shapes committed to text — blocking, high-value, zero false-positive.

    Deliberately narrow: employer-name and marketing-word checks were tried and
    removed because they false-positived on legitimate domain language (companies
    under analysis, "operating leverage", banned-word lists quoted as rules). Voice
    stays with the per-repo voice_lint.
    """
    repo_root = repo_root.resolve()
    violations: list[ContractViolation] = []
    for path in _tracked_text_files(repo_root):
        text = path.read_text(encoding="utf-8", errors="ignore")
        rel = path.relative_to(repo_root).as_posix()
        for name, pattern in _SECRET_SHAPES:
            hit = _first_hit_line(text, pattern)
            if hit is not None:
                lineno, _snippet = hit
                # Do not echo the secret value into the ledger.
                violations.append(
                    ContractViolation(
                        code=f"secret:{name}",
                        path=rel,
                        message=f"possible {name} secret shape at {rel}:{lineno}",
                    )
                )
    return violations


def validate_does_something(
    repo_root: Path, first_user_action: str | None, *, min_chars: int = 12
) -> list[ContractViolation]:
    """Run the advertised first action and require non-trivial, structured output.

    Exit-0 is not enough — an ornamental command prints "ok" or an empty table and
    passes every presence gate. Structured means: past a length floor, not just an
    acknowledgement token, and carrying a digit or a delimiter (a real number, a
    ranked row, a verdict).
    """
    if not first_user_action or not first_user_action.strip():
        return []
    repo_root = repo_root.resolve()
    command = _split(first_user_action)
    if not command:
        return []
    if (repo_root / "pyproject.toml").is_file() and "uv" not in command[:3]:
        uv = resolve_uv()
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
    except (OSError, subprocess.TimeoutExpired):
        # A crash/timeout here is the first-action gate's job, not this one.
        return []
    if result.returncode != 0:
        return []
    output = result.stdout.strip()
    normalized = output.lower().strip(" .!\n\t")
    trivial = (
        len(output) < min_chars
        or normalized in _ORNAMENTAL_TOKENS
        or not any(ch.isdigit() or ch in ":|\t" for ch in output)
    )
    if trivial:
        return [
            ContractViolation(
                code="ornamental-output",
                path=".",
                message=(
                    f"first_user_action ran clean but produced ornamental output "
                    f"({len(output)} chars, no structure): {output[:80]!r}"
                ),
            )
        ]
    return []


def run_all(repo_root: Path, first_user_action: str | None = None) -> list[ContractViolation]:
    """All content-hardening gates for a repo, as a flat violation list."""
    repo_root = repo_root.resolve()
    return [
        *validate_no_tool_markup(repo_root),
        *validate_disclosure(repo_root),
        *validate_does_something(repo_root, first_user_action),
    ]


def _split(command: str) -> list[str]:
    import shlex

    try:
        return shlex.split(command, posix=False)
    except ValueError:
        return command.split()


def main(argv: list[str] | None = None) -> int:
    """Standalone runner so the same gates sweep existing repos.

    Exit 1 when any *blocking* (required) violation is found; advisory violations
    print but do not fail the run.
    """
    parser = argparse.ArgumentParser(
        prog="content_gates", description="public-repo hardening gates"
    )
    parser.add_argument("repo", help="path to the repo to scan")
    parser.add_argument(
        "--first-action",
        default=None,
        help="advertised first-user command (for the does-something gate)",
    )
    args = parser.parse_args(argv)
    repo_root = Path(args.repo)
    if not repo_root.is_dir():
        print(f"not a directory: {repo_root}", file=sys.stderr)
        return 2
    violations = run_all(repo_root, args.first_action)
    blocking = [v for v in violations if v.required]
    advisory = [v for v in violations if not v.required]
    for v in blocking:
        print(f"BLOCK  [{v.code}] {v.message}")
    for v in advisory:
        print(f"warn   [{v.code}] {v.message}")
    if not violations:
        print(f"clean: {repo_root.name}")
    return 1 if blocking else 0


if __name__ == "__main__":
    raise SystemExit(main())
