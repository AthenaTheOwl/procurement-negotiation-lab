"""Minimal MCP-compatible stdio server for the local factory.

This intentionally exposes a narrow read-first surface. It follows MCP's
JSON-RPC method names (`initialize`, `tools/list`, `tools/call`,
`resources/list`, `resources/read`) without requiring the optional MCP SDK at
runtime. Tool calls never accept arbitrary shell commands.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .artifacts import ArtifactStore
from .router import route_tasks
from .spec_tasks import expand_spec_to_tasks
from .state import Store

PROTOCOL_VERSION = "2025-06-18"


def serve_stdio(db_path: str | Path = "ops/factory.db") -> int:
    """Run a line-delimited JSON-RPC stdio server."""
    store = Store(db_path)
    try:
        for line in sys.stdin:
            if not line.strip():
                continue
            response = handle_message(json.loads(line), store=store)
            if response is not None:
                print(json.dumps(response), flush=True)
    finally:
        store.close()
    return 0


def handle_message(message: dict[str, Any], *, store: Store) -> dict[str, Any] | None:
    """Handle one JSON-RPC request. Exported for tests."""
    request_id = message.get("id")
    method = message.get("method")
    params = message.get("params") or {}
    try:
        if method == "notifications/initialized":
            return None
        if method == "initialize":
            return _result(
                request_id,
                {
                    "protocolVersion": PROTOCOL_VERSION,
                    "serverInfo": {
                        "name": "procurement-lab-factory",
                        "version": "0.1.0",
                    },
                    "capabilities": {"tools": {}, "resources": {}},
                },
            )
        if method == "tools/list":
            return _result(request_id, {"tools": _tools()})
        if method == "tools/call":
            return _result(request_id, _call_tool(params, store=store))
        if method == "resources/list":
            return _result(request_id, {"resources": _resources(store)})
        if method == "resources/read":
            return _result(request_id, _read_resource(params, store=store))
        return _error(request_id, -32601, f"unknown method: {method}")
    except Exception as cause:  # noqa: BLE001 - JSON-RPC must return structured errors
        return _error(request_id, -32000, str(cause))


def _result(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def _error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": code, "message": message},
    }


def _tools() -> list[dict[str, Any]]:
    return [
        {
            "name": "factory_status",
            "description": "List recorded factory tasks and their current status.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "factory_show",
            "description": "Show one task row and recent events.",
            "inputSchema": {
                "type": "object",
                "properties": {"task_id": {"type": "string"}},
                "required": ["task_id"],
            },
        },
        {
            "name": "factory_expand_spec",
            "description": "Generate factory task YAML from unchecked tasks in a spec directory.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "spec_dir": {"type": "string"},
                    "output_dir": {"type": "string"},
                    "target_repo": {"type": "string"},
                    "overwrite": {"type": "boolean"},
                },
                "required": ["spec_dir"],
            },
        },
        {
            "name": "factory_run_many_dry",
            "description": "Dry-run multiple factory task YAMLs through the router.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_paths": {"type": "array", "items": {"type": "string"}},
                    "parallel": {"type": "integer"},
                },
                "required": ["task_paths"],
            },
        },
    ]


def _call_tool(params: dict[str, Any], *, store: Store) -> dict[str, Any]:
    name = params.get("name")
    arguments = params.get("arguments") or {}
    if name == "factory_status":
        payload = [asdict(row) for row in store.list_tasks()]
    elif name == "factory_show":
        task_id = _string_arg(arguments, "task_id")
        row = store.get_task(task_id)
        payload = {
            "task": asdict(row) if row else None,
            "events": [asdict(event) for event in store.events_for(task_id)],
        }
    elif name == "factory_expand_spec":
        generated = expand_spec_to_tasks(
            _string_arg(arguments, "spec_dir"),
            output_dir=arguments.get("output_dir", "ops/factory-tasks"),
            target_repo=arguments.get("target_repo", "."),
            overwrite=bool(arguments.get("overwrite", False)),
        )
        payload = [asdict(item) | {"path": str(item.path)} for item in generated]
    elif name == "factory_run_many_dry":
        task_paths = arguments.get("task_paths")
        if not isinstance(task_paths, list) or not all(
            isinstance(item, str) for item in task_paths
        ):
            raise ValueError("task_paths must be a list of strings")
        routed = route_tasks(
            task_paths,
            db_path=store.path,
            dry_run=True,
            parallel=int(arguments.get("parallel", 2)),
        )
        payload = {
            "engine": routed.engine,
            "results": [asdict(result) for result in routed.results],
        }
    else:
        raise ValueError(f"unknown tool: {name}")
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(payload, indent=2, default=str),
            }
        ]
    }


def _resources(store: Store) -> list[dict[str, str]]:
    rows = store.list_tasks()
    return [
        {
            "uri": f"factory://task/{row.id}",
            "name": row.title,
            "mimeType": "application/json",
        }
        for row in rows
    ]


def _read_resource(params: dict[str, Any], *, store: Store) -> dict[str, Any]:
    uri = _string_arg(params, "uri")
    if uri.startswith("factory://task/"):
        task_id = uri.removeprefix("factory://task/")
        row = store.get_task(task_id)
        if row is None:
            raise ValueError(f"unknown task resource: {task_id}")
        payload = {"task": asdict(row), "events": [asdict(e) for e in store.events_for(task_id)]}
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(payload, indent=2),
                }
            ]
        }
    if uri.startswith("factory://artifacts/"):
        task_id = uri.removeprefix("factory://artifacts/")
        refs = ArtifactStore().list(task_id)
        payload = [asdict(ref) for ref in refs]
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(payload, indent=2),
                }
            ]
        }
    raise ValueError(f"unsupported resource uri: {uri}")


def _string_arg(arguments: dict[str, Any], key: str) -> str:
    value = arguments.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"{key} is required")
    return value


if __name__ == "__main__":
    raise SystemExit(serve_stdio())
