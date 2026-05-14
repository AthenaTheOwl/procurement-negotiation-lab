"""Artifact store: per-task plan / diff / review / gate-log files on disk.

App-level state (decisions, IDs, routing) lives in SQLite. Artifact *content*
lives here as plain files so we can grep, diff, and inspect without an ORM
round-trip. The SQLite event log records the sha1 + path of each artifact as
an opaque reference — never the blob.
"""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass
from pathlib import Path

ARTIFACT_KINDS = frozenset(
    {
        "plan",
        "implement-stdout",
        "implement-stderr",
        "review",
        "diff-stat",
        "resume-comment",
    }
)
# gate-* kinds are accepted dynamically (e.g. "gate-typecheck", "gate-vitest")
GATE_PREFIX = "gate-"


@dataclass
class ArtifactRef:
    """Opaque reference to an artifact on disk. Safe to serialize into JSON."""

    task_id: str
    kind: str
    round: int
    path: str
    sha1: str
    size: int

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)  # type: ignore[no-any-return]


def _validate_kind(kind: str) -> None:
    if kind in ARTIFACT_KINDS:
        return
    if kind.startswith(GATE_PREFIX):
        return
    raise ValueError(
        f"unknown artifact kind: {kind!r}. "
        f"Expected one of {sorted(ARTIFACT_KINDS)} or '{GATE_PREFIX}<name>'."
    )


class ArtifactStore:
    """Per-task filesystem store under `<root>/<task_id>/<round>-<kind>.txt`."""

    def __init__(self, root: str | Path = "ops/factory-artifacts"):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _task_dir(self, task_id: str) -> Path:
        # Defensive: don't let a task_id escape the artifact root.
        if "/" in task_id or "\\" in task_id or task_id in {".", ".."}:
            raise ValueError(f"unsafe task_id for artifact store: {task_id!r}")
        directory = self.root / task_id
        directory.mkdir(parents=True, exist_ok=True)
        return directory

    def _path_for(self, task_id: str, kind: str, round_idx: int) -> Path:
        return self._task_dir(task_id) / f"{round_idx}-{kind}.txt"

    def write(
        self, task_id: str, kind: str, round_idx: int, content: str
    ) -> ArtifactRef:
        _validate_kind(kind)
        path = self._path_for(task_id, kind, round_idx)
        # Use write_bytes to avoid platform-specific newline translation —
        # otherwise the stored sha1 won't match the on-disk content on Windows.
        encoded = content.encode("utf-8")
        path.write_bytes(encoded)
        digest = hashlib.sha1(encoded, usedforsecurity=False).hexdigest()
        return ArtifactRef(
            task_id=task_id,
            kind=kind,
            round=round_idx,
            path=str(path),
            sha1=digest,
            size=len(encoded),
        )

    def read(self, ref: ArtifactRef | dict[str, str | int]) -> str:
        if isinstance(ref, dict):
            path_value = ref.get("path")
            if not isinstance(path_value, str):
                raise ValueError("artifact ref dict missing 'path'")
            path = Path(path_value)
        else:
            path = Path(ref.path)
        if not path.exists():
            raise FileNotFoundError(f"artifact missing on disk: {path}")
        return path.read_text(encoding="utf-8")

    def list(self, task_id: str) -> list[ArtifactRef]:
        directory = self.root / task_id
        if not directory.exists():
            return []
        refs: list[ArtifactRef] = []
        for path in sorted(directory.iterdir()):
            if not path.is_file() or not path.name.endswith(".txt"):
                continue
            stem = path.stem  # e.g. "0-plan"
            try:
                round_str, kind = stem.split("-", 1)
                round_idx = int(round_str)
            except (ValueError, IndexError):
                continue
            content = path.read_bytes()
            refs.append(
                ArtifactRef(
                    task_id=task_id,
                    kind=kind,
                    round=round_idx,
                    path=str(path),
                    sha1=hashlib.sha1(content, usedforsecurity=False).hexdigest(),
                    size=len(content),
                )
            )
        return refs

    def delete_task(self, task_id: str) -> None:
        directory = self.root / task_id
        if not directory.exists():
            return
        for path in directory.iterdir():
            if path.is_file():
                path.unlink()
        directory.rmdir()
