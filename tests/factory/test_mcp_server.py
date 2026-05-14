"""MCP-compatible factory server tests."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.mcp_server import handle_message
from scripts.factory.state import Store


def test_mcp_initialize_and_tool_list(tmp_path: Path) -> None:
    store = Store(tmp_path / "factory.db")
    try:
        init = handle_message(
            {"jsonrpc": "2.0", "id": 1, "method": "initialize"},
            store=store,
        )
        assert init is not None
        assert init["result"]["serverInfo"]["name"] == "procurement-lab-factory"

        listed = handle_message(
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
            store=store,
        )
        assert listed is not None
        names = {tool["name"] for tool in listed["result"]["tools"]}
        assert {"factory_status", "factory_show", "factory_expand_spec"} <= names
    finally:
        store.close()


def test_mcp_factory_status_tool_returns_tasks(tmp_path: Path) -> None:
    store = Store(tmp_path / "factory.db")
    try:
        store.upsert_task("alpha", "Alpha", "ops/factory-tasks/alpha.yaml")
        response = handle_message(
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {"name": "factory_status", "arguments": {}},
            },
            store=store,
        )
        assert response is not None
        text = response["result"]["content"][0]["text"]
        assert "alpha" in text
    finally:
        store.close()


def test_mcp_expand_spec_tool_creates_task_yaml(tmp_path: Path) -> None:
    spec = tmp_path / "0009-example"
    spec.mkdir()
    (spec / "tasks.md").write_text(
        "## Pass A - first\n\n- [ ] **A1**: Do it. *(R-X-001)*\n",
        encoding="utf-8",
    )
    store = Store(tmp_path / "factory.db")
    try:
        response = handle_message(
            {
                "jsonrpc": "2.0",
                "id": 4,
                "method": "tools/call",
                "params": {
                    "name": "factory_expand_spec",
                    "arguments": {
                        "spec_dir": str(spec),
                        "output_dir": str(tmp_path / "tasks"),
                        "target_repo": str(Path(".")),
                    },
                },
            },
            store=store,
        )
        assert response is not None
        assert "spec-0009-pass-a" in response["result"]["content"][0]["text"]
    finally:
        store.close()
