"""Artifact store tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.factory.artifacts import ArtifactStore


def test_write_read_round_trip(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    ref = store.write("task-1", "plan", 0, "hello\nworld")
    assert ref.task_id == "task-1"
    assert ref.kind == "plan"
    assert ref.round == 0
    assert ref.size == len(b"hello\nworld")
    assert len(ref.sha1) == 40  # sha1 hex
    contents = store.read(ref)
    assert contents == "hello\nworld"


def test_list_returns_all_rounds_and_kinds(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    store.write("t", "plan", 0, "p0")
    store.write("t", "review", 0, "r0")
    store.write("t", "review", 1, "r1")
    refs = store.list("t")
    pairs = sorted([(ref.round, ref.kind) for ref in refs])
    assert pairs == [(0, "plan"), (0, "review"), (1, "review")]


def test_unknown_kind_rejected(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    with pytest.raises(ValueError, match="unknown artifact kind"):
        store.write("t", "rogue-kind", 0, "x")


def test_gate_kind_dynamic_accepted(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    ref = store.write("t", "gate-typecheck", 0, "ok")
    assert ref.kind == "gate-typecheck"


def test_unsafe_task_id_rejected(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    with pytest.raises(ValueError, match="unsafe"):
        store.write("../escape", "plan", 0, "x")


def test_read_missing_file_raises(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    ref = store.write("t", "plan", 0, "x")
    Path(ref.path).unlink()
    with pytest.raises(FileNotFoundError):
        store.read(ref)


def test_read_accepts_dict_ref(tmp_path: Path) -> None:
    store = ArtifactStore(tmp_path / "a")
    ref = store.write("t", "plan", 0, "from-dict")
    contents = store.read(ref.to_dict())
    assert contents == "from-dict"
