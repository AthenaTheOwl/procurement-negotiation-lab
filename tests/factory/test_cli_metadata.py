"""CLI metadata extraction tests for real/synthetic run correlation."""

from __future__ import annotations

from scripts.factory.workers import _extract_json_ids


def test_extract_json_ids_from_single_object() -> None:
    payload = '{"thread_id":"thread-real","run_id":"run-real","model":"gpt-x"}'
    assert _extract_json_ids(payload) == {
        "thread_id": "thread-real",
        "run_id": "run-real",
        "model": "gpt-x",
    }


def test_extract_json_ids_from_jsonl_nested_shape() -> None:
    payload = "\n".join(
        [
            '{"type":"start","thread":{"id":"thread-nested"}}',
            '{"type":"done","session":{"id":"session-nested"},"response":{"model":"gpt-y"}}',
        ]
    )
    assert _extract_json_ids(payload) == {
        "thread_id": "thread-nested",
        "run_id": "session-nested",
        "model": "gpt-y",
    }
