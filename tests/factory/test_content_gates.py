"""Tests for the public-repo hardening gates (content_gates).

Covers the three defect classes the 2026-06-30 portfolio sweep proved slip past
presence/behavior gates and a repo's own tests: tool-markup/residue, ornamental
first-action output, and disclosure (secrets + marketing voice).
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from scripts.factory.content_gates import (
    run_all,
    validate_disclosure,
    validate_does_something,
    validate_no_tool_markup,
)

from .conftest import init_git_repo


def _track(repo: Path, rel: str, content: str) -> None:
    path = repo / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", rel], check=True, capture_output=True)


def _codes(violations) -> set[str]:
    return {v.code for v in violations}


def test_tool_markup_in_readme_is_flagged(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "README.md", "# Title\n\nReal content.\n\nMIT.\n</content>\n</invoke>\n")
    codes = _codes(validate_no_tool_markup(repo))
    assert "tool-markup" in codes


def test_template_residue_is_flagged(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "README.md", "# your project here\n\nlorem ipsum dolor sit\n")
    assert "template-residue" in _codes(validate_no_tool_markup(repo))


def test_clean_repo_has_no_markup_violations(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "README.md", "# Grid Tool\n\nRanks queued loads by binding risk.\n\nMIT.\n")
    _track(repo, "src/app.py", "def main() -> int:\n    return 0\n")
    assert validate_no_tool_markup(repo) == []


def test_untracked_file_is_not_scanned(tmp_path: Path) -> None:
    # git ls-files only lists tracked files; a stray untracked file with markup
    # (e.g. a scratch artifact) must not fail the gate.
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "README.md", "# Clean\n")
    (repo / "scratch.md").write_text("</content>\n", encoding="utf-8")  # not git-added
    assert validate_no_tool_markup(repo) == []


def test_secret_shape_is_blocking_and_value_not_echoed(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    secret = "sk-" + "A" * 32
    _track(repo, "config.py", f'OPENAI_KEY = "{secret}"\n')
    violations = validate_disclosure(repo)
    secret_v = [v for v in violations if v.code.startswith("secret:")]
    assert secret_v and secret_v[0].required is True
    assert secret not in secret_v[0].message  # never echo the credential


def test_disclosure_no_false_positive_on_domain_language(tmp_path: Path) -> None:
    # Validated against the whole portfolio: "leverage" (operating/negotiating),
    # "robust optimization", and AGENTS.md lines that quote banned words as rules
    # must NOT be flagged. Disclosure is secrets-only.
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "README.md", "# Robust Siting\n\nA robust optimization model.\n")
    _track(repo, "docs/thesis.md", "Operating leverage reverses on flat revenue.\n")
    _track(repo, "AGENTS.md", 'No marketing words. No "leverage", "seamless".\n')
    assert validate_disclosure(repo) == []


def test_ornamental_output_is_flagged(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)  # no pyproject -> command runs unwrapped
    _track(repo, "show.py", "print('ok')\n")
    violations = validate_does_something(repo, "python show.py")
    assert "ornamental-output" in _codes(violations)


def test_structured_output_passes(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "show.py", "print('rank 1: score 87')\n")
    violations = validate_does_something(repo, "python show.py")
    assert violations == []


def test_no_first_action_is_a_noop(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    assert validate_does_something(repo, None) == []
    assert validate_does_something(repo, "") == []


def test_run_all_aggregates(tmp_path: Path) -> None:
    repo = tmp_path / "r"
    init_git_repo(repo)
    _track(repo, "README.md", "Clean readme.\n</invoke>\n")
    out = run_all(repo, None)
    assert "tool-markup" in _codes(out)
