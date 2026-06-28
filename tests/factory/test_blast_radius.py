"""Pre-commit blast-radius evaluator tests."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.blast_radius import evaluate_blast_radius
from scripts.factory.task import BlastRadiusSpec

from .conftest import init_git_repo


def test_allowed_paths_rejects_out_of_scope_change(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    (repo / "src").mkdir()
    (repo / "src" / "ok.py").write_text("print('ok')\n", encoding="utf-8")
    (repo / "README.md").write_text("scope drift\n", encoding="utf-8")

    findings = evaluate_blast_radius(
        repo,
        base_branch="main",
        spec=BlastRadiusSpec(allowed_paths=["src/**"], secret_scan=False),
    )

    assert [(finding.code, finding.path) for finding in findings] == [
        ("allowed-paths", "README.md")
    ]


def test_forbidden_paths_rejects_env_file(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    (repo / ".env").write_text("DEBUG=true\n", encoding="utf-8")

    findings = evaluate_blast_radius(
        repo,
        base_branch="main",
        spec=BlastRadiusSpec(forbidden_paths=[".env*"], secret_scan=False),
    )

    assert findings[0].code == "forbidden-paths"
    assert findings[0].path == ".env"


def test_secret_scan_rejects_pending_key_shape(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    key_name = "OPENAI" + "_API" + "_KEY"
    fake_key = "sk-proj-" + ("a" * 32)
    (repo / "config.py").write_text(
        f"{key_name}='{fake_key}'\n",
        encoding="utf-8",
    )

    findings = evaluate_blast_radius(
        repo,
        base_branch="main",
        spec=BlastRadiusSpec(secret_scan=True),
    )

    assert findings[0].code == "sensitive-disclosure"
    assert findings[0].path == "config.py"


def test_diff_size_counts_untracked_lines(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    (repo / "big.txt").write_text("one\ntwo\nthree\n", encoding="utf-8")

    findings = evaluate_blast_radius(
        repo,
        base_branch="main",
        spec=BlastRadiusSpec(max_diff_lines=2, secret_scan=False),
    )

    assert findings[0].code == "diff-size-lines"
