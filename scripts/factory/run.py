"""CLI entry point.

Usage:
    python -m scripts.factory.run --task ops/factory-tasks/example.yaml [--dry-run]
    python -m scripts.factory.run --status
    python -m scripts.factory.run --show <task-id>
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .pipeline import run_pipeline
from .state import Store
from .task import load_task
from .workers import ClaudeCodeWorker, CodexWorker


def _print_status(store: Store) -> None:
    rows = store.list_tasks()
    if not rows:
        print("no tasks recorded yet. Add one via --task <path>.")
        return
    print(f"{'id':<28}  {'status':<10}  {'step':<24}  branch")
    print("-" * 90)
    for row in rows:
        step = (row.current_step or "")[:24]
        print(
            f"{row.id:<28}  {row.status:<10}  {step:<24}  {row.branch or ''}"
        )


def _print_show(store: Store, task_id: str) -> None:
    row = store.get_task(task_id)
    if row is None:
        print(f"no task with id {task_id}")
        sys.exit(1)
    print(f"id:           {row.id}")
    print(f"title:        {row.title}")
    print(f"status:       {row.status}")
    print(f"step:         {row.current_step}")
    print(f"worktree:     {row.worktree_path}")
    print(f"branch:       {row.branch}")
    print(f"created:      {row.created_at}")
    print(f"updated:      {row.updated_at}")
    if row.pr_url:
        print(f"pr_url:       {row.pr_url}")
    if row.failure_reason:
        print(f"failure:      {row.failure_reason}")
    print()
    print("events:")
    for event in store.events_for(task_id):
        payload = ""
        if event.payload:
            keys = ", ".join(f"{k}={event.payload[k]!r}" for k in list(event.payload)[:3])
            payload = f"  ({keys})"
        print(f"  [{event.at}] {event.kind}{payload}")


def _probe_workers() -> None:
    print("worker availability:")
    print(f"  claude_code (claude CLI): {'yes' if ClaudeCodeWorker.available() else 'no — stub fallback will be used'}")
    print(f"  codex       (codex CLI) : {'yes' if CodexWorker.available() else 'no — stub fallback will be used'}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="factory", description="local agent factory")
    parser.add_argument(
        "--task",
        type=Path,
        help="path to a task YAML file under ops/factory-tasks/",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("ops/factory.db"),
        help="SQLite state DB (default: ops/factory.db)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="don't actually invoke agents or run gates; record planned steps",
    )
    parser.add_argument(
        "--status", action="store_true", help="print all recorded tasks and exit"
    )
    parser.add_argument(
        "--show", type=str, help="print a single task's events and exit"
    )
    parser.add_argument(
        "--probe", action="store_true", help="check which agent CLIs are available"
    )
    args = parser.parse_args(argv)

    if args.probe:
        _probe_workers()
        return 0

    store = Store(args.db)
    try:
        if args.status:
            _print_status(store)
            return 0
        if args.show:
            _print_show(store, args.show)
            return 0
        if not args.task:
            parser.error("either --task, --status, --show, or --probe is required")
        task = load_task(args.task)
        if not args.dry_run:
            _probe_workers()
        print(f"running task {task.id} ({task.title}) dry_run={args.dry_run}")
        result = run_pipeline(task, store=store, dry_run=args.dry_run)
        print(f"\nstatus: {result.final_status}")
        print(f"summary: {result.summary}")
        return 0 if result.ok else 1
    finally:
        store.close()


if __name__ == "__main__":
    sys.exit(main())
