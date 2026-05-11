"""SQLite-backed state store. Resumable across runs."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    spec_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    current_step TEXT,
    worktree_path TEXT,
    branch TEXT,
    plan TEXT,
    review TEXT,
    pr_url TEXT,
    failure_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT,
    at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
"""


@dataclass
class TaskRow:
    id: str
    title: str
    spec_path: str
    status: str
    current_step: str | None
    worktree_path: str | None
    branch: str | None
    plan: str | None
    review: str | None
    pr_url: str | None
    failure_reason: str | None
    created_at: str
    updated_at: str


@dataclass
class Event:
    id: int
    task_id: str
    kind: str
    payload: dict[str, Any] | None
    at: str


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    """Thin SQLite wrapper. Short, on-purpose queries; no ORM."""

    def __init__(self, path: str | Path = "ops/factory.db"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.path))
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    @contextmanager
    def _cursor(self) -> Iterator[sqlite3.Cursor]:
        cursor = self._conn.cursor()
        try:
            yield cursor
            self._conn.commit()
        finally:
            cursor.close()

    # ---- tasks ---------------------------------------------------------

    def upsert_task(self, task_id: str, title: str, spec_path: str) -> TaskRow:
        existing = self.get_task(task_id)
        timestamp = now()
        with self._cursor() as cursor:
            if existing is None:
                cursor.execute(
                    "INSERT INTO tasks (id, title, spec_path, status, created_at, updated_at)"
                    " VALUES (?, ?, ?, 'pending', ?, ?)",
                    (task_id, title, spec_path, timestamp, timestamp),
                )
            else:
                cursor.execute(
                    "UPDATE tasks SET title=?, spec_path=?, updated_at=? WHERE id=?",
                    (title, spec_path, timestamp, task_id),
                )
        row = self.get_task(task_id)
        assert row is not None
        return row

    def get_task(self, task_id: str) -> TaskRow | None:
        with self._cursor() as cursor:
            cursor.execute("SELECT * FROM tasks WHERE id=?", (task_id,))
            row = cursor.fetchone()
        if row is None:
            return None
        return TaskRow(**dict(row))

    def list_tasks(self) -> list[TaskRow]:
        with self._cursor() as cursor:
            cursor.execute("SELECT * FROM tasks ORDER BY updated_at DESC")
            rows = cursor.fetchall()
        return [TaskRow(**dict(row)) for row in rows]

    def update_task(self, task_id: str, **fields: Any) -> None:
        if not fields:
            return
        fields["updated_at"] = now()
        sets = ", ".join(f"{key}=?" for key in fields)
        values = list(fields.values()) + [task_id]
        with self._cursor() as cursor:
            cursor.execute(f"UPDATE tasks SET {sets} WHERE id=?", values)

    # ---- events --------------------------------------------------------

    def append_event(
        self, task_id: str, kind: str, payload: dict[str, Any] | None = None
    ) -> None:
        with self._cursor() as cursor:
            cursor.execute(
                "INSERT INTO events (task_id, kind, payload, at) VALUES (?, ?, ?, ?)",
                (
                    task_id,
                    kind,
                    json.dumps(payload) if payload is not None else None,
                    now(),
                ),
            )

    def events_for(self, task_id: str) -> list[Event]:
        with self._cursor() as cursor:
            cursor.execute(
                "SELECT * FROM events WHERE task_id=? ORDER BY id ASC", (task_id,)
            )
            rows = cursor.fetchall()
        out: list[Event] = []
        for row in rows:
            payload = json.loads(row["payload"]) if row["payload"] else None
            out.append(
                Event(
                    id=row["id"],
                    task_id=row["task_id"],
                    kind=row["kind"],
                    payload=payload,
                    at=row["at"],
                )
            )
        return out
