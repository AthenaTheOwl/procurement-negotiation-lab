"""CLI entry point.

Usage:
    python -m scripts.factory.run --task ops/factory-tasks/example.yaml [--dry-run]
    python -m scripts.factory.run --resume <task-id> [--approve | --reject] [--comment "..."]
    python -m scripts.factory.run --status
    python -m scripts.factory.run --show <task-id>
    python -m scripts.factory.run --trace <task-id> [--trace-id <hex>]
    python -m scripts.factory.run --artifacts <task-id>
    python -m scripts.factory.run --probe
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .artifacts import ArtifactStore
from .pipeline import reject_task, run_pipeline
from .router import route_tasks
from .spec_tasks import expand_spec_to_tasks
from .state import Store
from .task import load_task
from .workers import ClaudeCodeWorker, CodexWorker


def _print_status(store: Store) -> None:
    rows = store.list_tasks()
    if not rows:
        print("no tasks recorded yet. Add one via --task <path>.")
        return
    print(
        f"{'id':<28}  {'status':<18}  {'step':<24}  {'awaiting':<14}  branch"
    )
    print("-" * 110)
    for row in rows:
        step = (row.current_step or "")[:24]
        awaiting = (row.awaiting_checkpoint or "")[:14]
        print(
            f"{row.id:<28}  {row.status:<18}  {step:<24}  {awaiting:<14}  {row.branch or ''}"
        )


def _print_show(store: Store, task_id: str) -> None:
    row = store.get_task(task_id)
    if row is None:
        print(f"no task with id {task_id}")
        sys.exit(1)
    print(f"id:              {row.id}")
    print(f"title:           {row.title}")
    print(f"status:          {row.status}")
    print(f"step:            {row.current_step}")
    print(f"awaiting:        {row.awaiting_checkpoint}")
    print(f"worktree:        {row.worktree_path}")
    print(f"branch:          {row.branch}")
    print(f"trace_id:        {row.trace_id}")
    print(f"last_thread_id:  {row.last_thread_id}")
    print(f"last_run_id:     {row.last_run_id}")
    print(f"created:         {row.created_at}")
    print(f"updated:         {row.updated_at}")
    if row.pr_url:
        print(f"pr_url:          {row.pr_url}")
    if row.failure_reason:
        print(f"failure:         {row.failure_reason}")
    print()
    print("recent events:")
    for event in store.events_for(task_id):
        payload = ""
        if event.payload:
            keys = ", ".join(
                f"{k}={event.payload[k]!r}" for k in list(event.payload)[:3]
            )
            payload = f"  ({keys})"
        trace = f" [{event.trace_id[:8]}]" if event.trace_id else ""
        print(f"  [{event.at}]{trace} {event.kind}{payload}")


def _print_trace(store: Store, task_id: str, trace_id: str | None) -> None:
    row = store.get_task(task_id)
    if row is None:
        print(f"no task with id {task_id}")
        sys.exit(1)
    if trace_id is None:
        traces = store.traces_for(task_id)
        if not traces:
            print("no traces recorded for this task")
            return
        print(f"{len(traces)} trace(s):")
        for trace in traces:
            count = len(store.events_for(task_id, trace_id=trace))
            print(f"  {trace}  ({count} event(s))")
        print()
        print("pass --trace-id <hex> to filter the event stream to one trace")
        return
    events = store.events_for(task_id, trace_id=trace_id)
    if not events:
        print(f"no events for trace_id {trace_id}")
        return
    print(f"events for trace {trace_id}:")
    for event in events:
        payload = ""
        if event.payload:
            keys = ", ".join(
                f"{k}={event.payload[k]!r}" for k in list(event.payload)[:4]
            )
            payload = f"  ({keys})"
        print(f"  [{event.at}] {event.kind}{payload}")


def _print_artifacts(task_id: str) -> None:
    store = ArtifactStore()
    refs = store.list(task_id)
    if not refs:
        print(f"no artifacts for task {task_id}")
        return
    print(f"{'round':<6}  {'kind':<24}  {'sha1':<10}  size  path")
    print("-" * 100)
    for ref in refs:
        sha = ref.sha1[:10]
        print(f"{ref.round:<6}  {ref.kind:<24}  {sha:<10}  {ref.size:>4}  {ref.path}")


def _probe_workers() -> None:
    print("worker availability:")
    print(
        f"  claude_code (claude CLI): "
        f"{'yes' if ClaudeCodeWorker.available() else 'no - stub fallback will be used'}"
    )
    print(
        f"  codex       (codex CLI) : "
        f"{'yes' if CodexWorker.available() else 'no - stub fallback will be used'}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="factory", description="local agent factory"
    )
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
    parser.add_argument("--show", type=str, help="print a task's events and exit")
    parser.add_argument(
        "--trace",
        type=str,
        help="print event traces for a task (use --trace-id to filter)",
    )
    parser.add_argument(
        "--trace-id", type=str, help="filter --trace output to a single trace_id"
    )
    parser.add_argument(
        "--artifacts", type=str, help="list filesystem artifacts for a task"
    )
    parser.add_argument(
        "--resume",
        type=str,
        help="resume a paused task by id (default action: approve)",
    )
    parser.add_argument(
        "--approve", action="store_true", help="when resuming, continue the pipeline"
    )
    parser.add_argument(
        "--reject", action="store_true", help="when resuming, abandon the task"
    )
    parser.add_argument(
        "--comment", type=str, default=None, help="optional note attached to the resume"
    )
    parser.add_argument(
        "--probe", action="store_true", help="check which agent CLIs are available"
    )
    parser.add_argument(
        "--expand-spec",
        type=Path,
        help="generate factory task YAMLs from unchecked tasks in a spec directory",
    )
    parser.add_argument(
        "--expand-output",
        type=Path,
        default=Path("ops/factory-tasks"),
        help="output directory for --expand-spec (default: ops/factory-tasks)",
    )
    parser.add_argument(
        "--target-repo",
        type=Path,
        default=Path("."),
        help="target_repo value for generated tasks (default: current repo)",
    )
    parser.add_argument(
        "--overwrite-expanded",
        action="store_true",
        help="overwrite existing generated task YAMLs",
    )
    parser.add_argument(
        "--run-many",
        nargs="+",
        type=Path,
        help="run multiple task YAML files through the factory router",
    )
    parser.add_argument(
        "--parallel",
        type=int,
        default=2,
        help="parallelism for --run-many (default: 2)",
    )
    parser.add_argument(
        "--no-langgraph",
        action="store_true",
        help="force the router to use the built-in ThreadPoolExecutor fallback",
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
        if args.trace:
            _print_trace(store, args.trace, args.trace_id)
            return 0
        if args.artifacts:
            _print_artifacts(args.artifacts)
            return 0
        if args.expand_spec:
            generated = expand_spec_to_tasks(
                args.expand_spec,
                output_dir=args.expand_output,
                target_repo=args.target_repo,
                overwrite=args.overwrite_expanded,
            )
            for item in generated:
                task_ids = ", ".join(item.task_ids)
                print(f"{item.id}: {item.path} ({task_ids})")
            return 0
        if args.run_many:
            routed = route_tasks(
                args.run_many,
                db_path=args.db,
                dry_run=args.dry_run,
                parallel=args.parallel,
                use_langgraph=not args.no_langgraph,
            )
            print(f"router: {routed.engine}")
            for result in routed.results:
                marker = "ok" if result.ok else "FAIL"
                print(
                    f"[{marker}] {result.task_id}: {result.status} "
                    f"trace={result.trace_id or '-'}"
                )
            return 0 if all(result.ok for result in routed.results) else 1
        if args.resume:
            return _run_resume(store, args)
        if not args.task:
            parser.error(
                "either --task, --resume, --status, --show, --trace, --artifacts, "
                "--expand-spec, --run-many, or --probe is required"
            )
        task = load_task(args.task)
        if not args.dry_run:
            _probe_workers()
        print(
            f"running task {task.id} ({task.title}) dry_run={args.dry_run}"
        )
        result = run_pipeline(
            task,
            store=store,
            dry_run=args.dry_run,
            spec_path=str(args.task.resolve()),
        )
        print()
        print(f"status:  {result.final_status}")
        print(f"summary: {result.summary}")
        if result.awaiting_checkpoint:
            print(
                f"resume:  python -m scripts.factory.run --resume {task.id} "
                f"--approve [--dry-run]"
            )
        if result.trace_id:
            print(f"trace:   {result.trace_id}")
        if result.final_status == "awaiting_approval":
            return 2
        return 0 if result.ok else 1
    finally:
        store.close()


def _run_resume(store: Store, args: argparse.Namespace) -> int:
    task_id = args.resume
    row = store.get_task(task_id)
    if row is None:
        print(f"no task with id {task_id}")
        return 1
    if args.reject:
        reject_task(store, task_id, comment=args.comment)
        print(f"task {task_id} marked rejected")
        return 0
    if row.status != "awaiting_approval" or not row.awaiting_checkpoint:
        print(
            f"task {task_id} is not awaiting approval (status={row.status}); nothing to resume"
        )
        return 1
    checkpoint = row.awaiting_checkpoint
    if not row.spec_path:
        print(f"task {task_id} has no spec_path; cannot rehydrate")
        return 1
    spec_path = (
        Path(row.spec_path)
        if Path(row.spec_path).is_absolute()
        else Path("ops/factory-tasks") / f"{row.spec_path}.yaml"
    )
    if not spec_path.exists():
        # spec_path stored as the id; try ops/factory-tasks/<id>.yaml
        spec_path = Path("ops/factory-tasks") / f"{task_id}.yaml"
    if not spec_path.exists():
        print(f"cannot find spec file for task {task_id}; tried {spec_path}")
        return 1
    task = load_task(spec_path)
    print(
        f"resuming task {task_id} from checkpoint {checkpoint} dry_run={args.dry_run}"
    )
    result = run_pipeline(
        task,
        store=store,
        dry_run=args.dry_run,
        resume_from=checkpoint,
        resume_comment=args.comment,
        spec_path=str(spec_path.resolve()),
    )
    print()
    print(f"status:  {result.final_status}")
    print(f"summary: {result.summary}")
    if result.awaiting_checkpoint:
        print(
            f"resume:  python -m scripts.factory.run --resume {task.id} "
            f"--approve [--dry-run]"
        )
    if result.trace_id:
        print(f"trace:   {result.trace_id}")
    if result.final_status == "awaiting_approval":
        return 2
    return 0 if result.ok else 1


if __name__ == "__main__":
    sys.exit(main())
