"""Git worktree helpers. One worktree per task so parallel work doesn't collide."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class WorktreeInfo:
    path: Path
    branch: str
    base_branch: str


class WorktreeError(RuntimeError):
    pass


def _git(
    repo: Path, *args: str, check: bool = True
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603 - explicit git args, no shell
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        check=check,
    )


def is_git_repo(path: Path) -> bool:
    if not path.exists():
        return False
    result = _git(path, "rev-parse", "--is-inside-work-tree", check=False)
    return result.returncode == 0


def create_worktree(
    repo: Path, task_id: str, base_branch: str = "main"
) -> WorktreeInfo:
    """Create a sibling worktree at `<repo>/../<repo.name>-task-<task_id>/`.

    Idempotent: returns existing info if the worktree is already registered.
    """
    repo = repo.resolve()
    if not is_git_repo(repo):
        raise WorktreeError(f"{repo} is not a git repo")
    branch = f"factory/{task_id}"
    target = repo.parent / f"{repo.name}-task-{task_id}"
    if target.exists():
        listing = _git(repo, "worktree", "list", "--porcelain")
        normalized = listing.stdout.replace("\\", "/")
        if str(target).replace("\\", "/") in normalized or target.name in normalized:
            return WorktreeInfo(path=target, branch=branch, base_branch=base_branch)
    _git(repo, "fetch", "--quiet", check=False)
    base_ok = _git(repo, "rev-parse", "--verify", base_branch, check=False)
    if base_ok.returncode != 0:
        origin_ok = _git(
            repo, "rev-parse", "--verify", f"origin/{base_branch}", check=False
        )
        if origin_ok.returncode != 0:
            raise WorktreeError(
                f"base branch {base_branch} not found locally or on origin"
            )
    branch_exists = (
        _git(repo, "rev-parse", "--verify", branch, check=False).returncode == 0
    )
    if branch_exists:
        _git(repo, "worktree", "add", str(target), branch)
    else:
        _git(repo, "worktree", "add", "-b", branch, str(target), base_branch)
    return WorktreeInfo(path=target, branch=branch, base_branch=base_branch)


def remove_worktree(repo: Path, worktree_path: Path) -> None:
    """Best-effort cleanup. Doesn't raise if already gone."""
    _git(repo, "worktree", "remove", "--force", str(worktree_path), check=False)


def current_branch(worktree: Path) -> str:
    result = _git(worktree, "rev-parse", "--abbrev-ref", "HEAD")
    return result.stdout.strip()


def diff_stat(worktree: Path, base_branch: str) -> str:
    result = _git(worktree, "diff", "--stat", f"{base_branch}...HEAD", check=False)
    return result.stdout.strip()


def has_uncommitted_changes(worktree: Path) -> bool:
    result = _git(worktree, "status", "--porcelain", check=False)
    return bool(result.stdout.strip())


def commit_all(worktree: Path, message: str) -> str | None:
    """Stage everything and commit. Returns the SHA, or None if there was nothing to stage."""
    _git(worktree, "add", "-A", check=False)
    diff = _git(worktree, "diff", "--cached", "--quiet", check=False)
    if diff.returncode == 0:
        return None
    _git(worktree, "commit", "-m", message)
    return _git(worktree, "rev-parse", "HEAD").stdout.strip()


def push_branch(worktree: Path, branch: str) -> bool:
    result = _git(worktree, "push", "-u", "origin", branch, check=False)
    return result.returncode == 0
