# research: factory dev control plane

## MCP

The official MCP Python SDK documents servers that expose resources, prompts,
tools, and transports such as stdio. The factory implements the same JSON-RPC
surface narrowly and keeps the official SDK as an optional extra so the default
repo remains lightweight.

Source: https://github.com/modelcontextprotocol/python-sdk

Security note: because MCP servers can become command-execution surfaces, this
spec deliberately omits arbitrary shell tools. The only run tool is dry-run
multi-task routing against checked-in factory task specs.

## LangGraph

LangGraph's graph API supports state, branches, parallel nodes, map-reduce, and
the Send API. The factory's router mirrors that shape: independent task specs
fan out and join into one result list. LangGraph is optional; the fallback keeps
the same contract.

Source: https://docs.langchain.com/oss/python/langgraph/use-graph-api

## OpenAI Agents SDK tracing

OpenAI's Agents SDK tracing docs frame traces as workflow-level records with
trace IDs, spans, custom processors, and metadata. The factory is not adopting
the SDK runtime yet, but it now captures worker `thread_id`, `run_id`, `model`,
and duration so a future trace processor has stable fields to map onto.

Sources:
- https://developers.openai.com/api/docs/guides/agents
- https://openai.github.io/openai-agents-python/tracing/

## Prompt-library and production-repo influence

The design follows the local prompt-library's spec-driven learning-lab loop:
learning claim, role/stakes, canonical representation, proof gates, and browser
or CLI evidence before declaring done.

It also borrows from `../cargo-health/medroute-main`: proof gates before
claims, structured decisions, and visible artifacts instead of undocumented
agent output.
