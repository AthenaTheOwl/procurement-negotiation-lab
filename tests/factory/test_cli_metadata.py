"""CLI metadata extraction tests for real/synthetic run correlation."""

from __future__ import annotations

from scripts.factory.workers import _extract_json_ids, _looks_like_unsupported_flag


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


def test_extract_json_ids_captures_anthropic_usage_block() -> None:
    """Per DEC-FACTORY-013 the addendum-6 emission slice captures token
    counts from a ``usage`` block when the CLI exposes one. Anthropic
    flavour names the fields input_tokens/output_tokens.
    """
    payload = (
        '{"thread_id":"thread-anthropic","run_id":"run-anthropic",'
        '"model":"claude-opus-4-7",'
        '"usage":{"input_tokens":1024,"output_tokens":512}}'
    )
    extracted = _extract_json_ids(payload)
    assert extracted["tokens_input"] == 1024
    assert extracted["tokens_output"] == 512
    assert extracted["thread_id"] == "thread-anthropic"


def test_extract_json_ids_captures_openai_usage_block() -> None:
    """OpenAI flavour names the fields prompt_tokens/completion_tokens.
    The extractor must coerce both into our canonical
    tokens_input/tokens_output keys.
    """
    payload = (
        '{"thread_id":"thread-openai","run_id":"run-openai",'
        '"model":"gpt-5-codex",'
        '"usage":{"prompt_tokens":42,"completion_tokens":7}}'
    )
    extracted = _extract_json_ids(payload)
    assert extracted["tokens_input"] == 42
    assert extracted["tokens_output"] == 7


def test_extract_json_ids_captures_nested_response_usage() -> None:
    """JSONL events sometimes nest the usage block under
    ``response.usage``. The extractor must descend that path.
    """
    payload = "\n".join(
        [
            '{"type":"start","thread":{"id":"thread-x"}}',
            (
                '{"type":"done","session":{"id":"session-x"},'
                '"response":{"model":"gpt-z",'
                '"usage":{"input_tokens":100,"output_tokens":50}}}'
            ),
        ]
    )
    extracted = _extract_json_ids(payload)
    assert extracted["thread_id"] == "thread-x"
    assert extracted["run_id"] == "session-x"
    assert extracted["model"] == "gpt-z"
    assert extracted["tokens_input"] == 100
    assert extracted["tokens_output"] == 50


def test_looks_like_unsupported_flag_recognizes_common_phrasings() -> None:
    """ClaudeCodeWorker / CodexWorker fall back to plain --print when the
    installed CLI rejects --output-format json. The detector must match
    common phrasings without depending on a specific binary.
    """
    assert _looks_like_unsupported_flag("unknown option --output-format")
    assert _looks_like_unsupported_flag("error: unrecognized option '--output-format'")
    assert _looks_like_unsupported_flag("invalid option: --output-format json")
    # Unrelated --output-format mentions or absent stderr must not trip
    # the fallback.
    assert not _looks_like_unsupported_flag("succeeded with --output-format json")
    assert not _looks_like_unsupported_flag("")
    assert not _looks_like_unsupported_flag("unknown option --other-flag")
