"""SQLite-backed state store. Resumable across runs."""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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
    trace_id TEXT,
    awaiting_checkpoint TEXT,
    last_thread_id TEXT,
    last_run_id TEXT,
    resume_from_round INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT,
    trace_id TEXT,
    at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_trace ON events(trace_id);
"""

# Columns added in 0.2.x. SQLite has no ADD COLUMN IF NOT EXISTS, so we probe.
MIGRATIONS: list[tuple[str, str]] = [
    ("tasks", "trace_id TEXT"),
    ("tasks", "awaiting_checkpoint TEXT"),
    ("tasks", "last_thread_id TEXT"),
    ("tasks", "last_run_id TEXT"),
    ("tasks", "resume_from_round INTEGER"),
    ("events", "trace_id TEXT"),
]


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
    trace_id: str | None
    awaiting_checkpoint: str | None
    last_thread_id: str | None
    last_run_id: str | None
    resume_from_round: int | None
    created_at: str
    updated_at: str


@dataclass
class Event:
    id: int
    task_id: str
    kind: str
    payload: dict[str, Any] | None
    trace_id: str | None
    at: str


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class Store:
    """Thin SQLite wrapper. Short, on-purpose queries; no ORM."""

    def __init__(self, path: str | Path = "ops/factory.db"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.path))
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)
        self._apply_migrations()
        self._conn.commit()

    def _apply_migrations(self) -> None:
        """Apply additive ALTER TABLE migrations for columns added after 0.1.0."""
        for table, column_def in MIGRATIONS:
            column_name = column_def.split()[0]
            existing = self._conn.execute(
                f"PRAGMA table_info({table})"
            ).fetchall()
            names = {row[1] for row in existing}
            if column_name in names:
                continue
            self._conn.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")

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
            cursor.execute(f"UPDATE tasks SET {sets} WHERE id=?", values)  # noqa: S608

    # ---- events --------------------------------------------------------

    def append_event(
        self,
        task_id: str,
        kind: str,
        payload: dict[str, Any] | None = None,
        trace_id: str | None = None,
    ) -> None:
        with self._cursor() as cursor:
            cursor.execute(
                "INSERT INTO events (task_id, kind, payload, trace_id, at) VALUES (?, ?, ?, ?, ?)",
                (
                    task_id,
                    kind,
                    json.dumps(payload) if payload is not None else None,
                    trace_id,
                    now(),
                ),
            )

    def events_for(
        self, task_id: str, trace_id: str | None = None
    ) -> list[Event]:
        sql = "SELECT * FROM events WHERE task_id=?"
        params: list[Any] = [task_id]
        if trace_id is not None:
            sql += " AND trace_id=?"
            params.append(trace_id)
        sql += " ORDER BY id ASC"
        with self._cursor() as cursor:
            cursor.execute(sql, params)
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
                    trace_id=row["trace_id"] if "trace_id" in row.keys() else None,
                    at=row["at"],
                )
            )
        return out

    def traces_for(self, task_id: str) -> list[str]:
        """Return distinct trace_ids for a task, in insertion order."""
        with self._cursor() as cursor:
            cursor.execute(
                "SELECT DISTINCT trace_id FROM events WHERE task_id=? AND trace_id IS NOT NULL"
                " ORDER BY id ASC",
                (task_id,),
            )
            rows = cursor.fetchall()
        return [row["trace_id"] for row in rows]
