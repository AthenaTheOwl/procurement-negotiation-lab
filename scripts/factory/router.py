"""Task router for running multiple factory tasks.

LangGraph is optional. When installed, the router builds a tiny graph with one
node per task so independent tasks can fan out from START and join at END. In
the default dev environment we fall back to a ThreadPoolExecutor with the same
result shape.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .artifacts import ArtifactStore
from .pipeline import run_pipeline
from .state import Store
from .task import load_task


@dataclass(frozen=True)
class RoutedTaskResult:
    """Result for one routed task."""

    task_id: str
    status: str
    ok: bool
    summary: str
    trace_id: str | None


@dataclass(frozen=True)
class RouterResult:
    """Aggregate result from one routing invocation."""

    engine: str
    results: list[RoutedTaskResult]


def langgraph_available() -> bool:
    """Return True when the optional LangGraph dependency is importable."""
    try:
        import langgraph.graph  # noqa: F401
    except ImportError:
        return False
    return True


def route_tasks(
    task_paths: list[str | Path],
    *,
    db_path: str | Path = "ops/factory.db",
    dry_run: bool = False,
    parallel: int = 2,
    use_langgraph: bool = True,
) -> RouterResult:
    """Route task specs through the factory.

    The public contract is stable whether LangGraph is installed or not. The
    fallback path is intentionally explicit so the CLI remains usable in fresh
    checkouts without optional orchestration dependencies.
    """
    paths = [Path(path) for path in task_paths]
    if use_langgraph and langgraph_available():
        return _route_tasks_langgraph(paths, db_path=Path(db_path), dry_run=dry_run)
    return _route_tasks_threadpool(
        paths,
        db_path=Path(db_path),
        dry_run=dry_run,
        parallel=parallel,
        engine="threadpool-fallback" if use_langgraph else "threadpool",
    )


def _run_one(task_path: Path, db_path: Path, dry_run: bool) -> RoutedTaskResult:
    task = load_task(task_path)
    store = Store(db_path)
    try:
        result = run_pipeline(
            task,
            store=store,
            dry_run=dry_run,
            artifact_store=ArtifactStore(),
            spec_path=str(task_path.resolve()),
        )
        return RoutedTaskResult(
            task_id=task.id,
            status=result.final_status,
            ok=result.ok,
            summary=result.summary,
            trace_id=result.trace_id,
        )
    finally:
        store.close()


def _route_tasks_threadpool(
    paths: list[Path],
    *,
    db_path: Path,
    dry_run: bool,
    parallel: int,
    engine: str,
) -> RouterResult:
    if parallel < 1:
        raise ValueError("parallel must be >= 1")
    results: list[RoutedTaskResult] = []
    with ThreadPoolExecutor(max_workers=parallel) as executor:
        futures = [executor.submit(_run_one, path, db_path, dry_run) for path in paths]
        for future in as_completed(futures):
            results.append(future.result())
    return RouterResult(engine=engine, results=sorted(results, key=lambda item: item.task_id))


def _route_tasks_langgraph(
    paths: list[Path],
    *,
    db_path: Path,
    dry_run: bool,
) -> RouterResult:
    """Run tasks through LangGraph when the optional package is present."""
    import operator
    from typing import Annotated, TypedDict

    from langgraph.graph import END, START, StateGraph

    class RouterState(TypedDict):
        results: Annotated[list[RoutedTaskResult], operator.add]

    graph = StateGraph(RouterState)
    for idx, path in enumerate(paths):
        node_name = f"task_{idx}"

        def run_node(
            state: RouterState,
            *,
            task_path: Path = path,
        ) -> dict[str, list[RoutedTaskResult]]:
            return {"results": [_run_one(task_path, db_path, dry_run)]}

        graph.add_node(node_name, run_node)
        graph.add_edge(START, node_name)
        graph.add_edge(node_name, END)
    compiled = graph.compile()
    output: dict[str, Any] = compiled.invoke({"results": []})
    results = output.get("results", [])
    return RouterResult(
        engine="langgraph",
        results=sorted(results, key=lambda item: item.task_id),
    )
