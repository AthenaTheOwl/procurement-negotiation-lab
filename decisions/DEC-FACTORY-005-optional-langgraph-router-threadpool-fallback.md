---
id: DEC-FACTORY-005-optional-langgraph-router-threadpool-fallback
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-005
date: 2026-05-24
status: approved
reversible: true
decision: |
  Route multiple factory tasks through one public function,
  `route_tasks` in `scripts/factory/router.py`, with a stable
  `RouterResult` shape. When the optional LangGraph dependency is
  importable, build a tiny `StateGraph` with one node per task that
  fans out from START and joins at END. When LangGraph is not
  installed (the default checkout), fall back to a
  `ThreadPoolExecutor` with the same result shape and the engine
  label `threadpool-fallback`. LangGraph + MCP SDK live behind the
  optional `factory` install extra.
alternatives:
  - label: require LangGraph on every install
    rejected_because: |
      LangGraph and its transitive graph/serialization layer add weight
      a fresh checkout does not need to load a task or run the pipeline.
      The factory's default CLI works in a clean repo without the extra,
      and treating LangGraph as required would break that property.
  - label: use Celery, Temporal, or a managed orchestrator
    rejected_because: |
      Managed orchestrators bring a broker, a worker model, and a
      deployment surface to defend. The factory is a local dev runtime
      that runs on a developer machine and on hosted CI; a process-local
      `ThreadPoolExecutor` is the right blast radius for the
      bounded-parallelism case the spec calls for.
  - label: roll a hand-written asyncio event loop
    rejected_because: |
      The workers shell out to provider CLIs as blocking subprocesses,
      not as async coroutines. An asyncio rewrite would force a
      run-in-executor wrapper around every subprocess call and add a
      second concurrency model on top of the thread pool that is
      already correct for the workload.
rationale: |
  A stable `RouterResult` lets callers ignore which engine ran the
  tasks. Optional LangGraph means contributors who want the graph
  inspection surface get it, while a fresh checkout stays
  dependency-light. The thread-pool fallback is correct for the
  blocking-subprocess workload the workers run, and the engine
  label in the result makes it obvious in logs which path executed.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: doc
    ref: scripts/factory/router.py
  - kind: doc
    ref: scripts/factory/mcp_server.py
  - kind: doc
    ref: specs/0009-factory-dev-control-plane/research.md
rollback: |
  Delete the `_route_tasks_langgraph` branch in
  `scripts/factory/router.py` and drop the `langgraph_available`
  helper. `route_tasks` falls through to the thread-pool path on
  every invocation. Remove the `factory` install extra entry that
  pulls in `langgraph`; the MCP SDK extra can stay since
  `mcp_server.py` does not import it at runtime. The public
  `RouterResult` shape, the `--run-many` CLI flag, and the
  `factory_run_many_dry` MCP tool keep working unchanged.
owner: platform
---

## decision

Route multiple factory tasks through one public function,
`route_tasks` in `scripts/factory/router.py`, with a stable
`RouterResult` shape. When the optional LangGraph dependency is
importable, build a tiny `StateGraph` with one node per task that fans
out from START and joins at END. When LangGraph is not installed (the
default checkout), fall back to a `ThreadPoolExecutor` with the same
result shape and the engine label `threadpool-fallback`. LangGraph +
MCP SDK live behind the optional `factory` install extra.

## alternatives

- Require LangGraph on every install — adds weight a fresh checkout
  does not need to load a task or run the pipeline.
- Use Celery, Temporal, or a managed orchestrator — wrong blast
  radius for a local dev runtime.
- Roll a hand-written asyncio event loop — adds a second concurrency
  model on top of the thread pool that already fits the workload.

## rationale

A stable `RouterResult` lets callers ignore which engine ran the
tasks. Optional LangGraph means contributors who want the graph
inspection surface get it, while a fresh checkout stays
dependency-light. The thread-pool fallback is correct for the
blocking-subprocess workload the workers run, and the engine
label in the result makes it obvious in logs which path executed.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` — R-FACTORY-005
  acceptance bullets.
- `scripts/factory/router.py` — `route_tasks`, `langgraph_available`,
  `_route_tasks_threadpool`, and `_route_tasks_langgraph`.
- `scripts/factory/mcp_server.py` — the `factory_run_many_dry` tool
  that calls `route_tasks` with `dry_run=True`.

## rollback

Delete the `_route_tasks_langgraph` branch in
`scripts/factory/router.py` and drop the `langgraph_available`
helper. `route_tasks` falls through to the thread-pool path on every
invocation. Remove the `factory` install extra entry that pulls in
`langgraph`. The public `RouterResult` shape, the `--run-many` CLI
flag, and the `factory_run_many_dry` MCP tool keep working unchanged.
