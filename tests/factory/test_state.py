"""SQLite state store tests."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.state import Store


def test_upsert_round_trip(tmp_path: Path) -> None:
    store = Store(tmp_path / "f.db")
    row = store.upsert_task("a", "Alpha", "tasks/a.yaml")
    assert row.id == "a"
    assert row.status == "pending"
    again = store.upsert_task("a", "Alpha v2", "tasks/a.yaml")
    assert again.title == "Alpha v2"
    assert again.updated_at >= row.created_at
    store.close()


def test_update_and_events(tmp_path: Path) -> None:
    store = Store(tmp_path / "f.db")
    store.upsert_task("b", "B", "tasks/b.yaml")
    store.update_task("b", status="running", current_step="plan")
    store.append_event("b", "plan.done", {"len": 42})
    store.append_event("b", "implement.done")
    events = store.events_for("b")
    assert [e.kind for e in events] == ["plan.done", "implement.done"]
    assert events[0].payload == {"len": 42}
    row = store.get_task("b")
    assert row is not None and row.status == "running" and row.current_step == "plan"
    store.close()


def test_list_tasks_orders_by_updated(tmp_path: Path) -> None:
    store = Store(tmp_path / "f.db")
    store.upsert_task("one", "One", "p1")
    store.upsert_task("two", "Two", "p2")
    store.update_task("one", status="running")
    listed = store.list_tasks()
    assert {row.id for row in listed} == {"one", "two"}
    store.close()
