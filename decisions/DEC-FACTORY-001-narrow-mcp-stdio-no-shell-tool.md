---
id: DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-001
date: 2026-05-24
status: approved
reversible: true
decision: |
  Expose the factory over a narrow MCP-compatible stdio JSON-RPC server
  in `scripts/factory/mcp_server.py`. The server handles `initialize`,
  `tools/list`, `tools/call`, `resources/list`, and `resources/read`,
  with a fixed tool set: `factory_status`, `factory_show`,
  `factory_expand_spec`, and `factory_run_many_dry`. The server does
  not expose any tool that takes a shell command or an arbitrary file
  path outside the factory roots.
alternatives:
  - label: depend on the official MCP Python SDK at runtime
    rejected_because: |
      The SDK pulls in a transport/protocol layer the factory does not
      need on the default install path. Keeping the SDK as an optional
      extra under `.[factory]` and re-implementing the four JSON-RPC
      methods inline keeps the default checkout dependency-free while
      preserving the same wire shape for MCP clients.
  - label: expose a generic shell-exec or run-arbitrary-task tool
    rejected_because: |
      A shell-exec tool turns the MCP surface into a remote-code-execution
      surface the moment a client connects with a wider scope than the
      operator. The research note in `specs/0009-.../research.md` calls
      that out explicitly. The four typed tools cover read, inspect,
      spec-expand, and dry-run routing, which is the whole verb set
      this repo's workflows need from MCP.
  - label: ship a REST/HTTP control plane instead of MCP stdio
    rejected_because: |
      An HTTP surface drags in a web framework, an auth model, a port
      to defend, and a separate client protocol. The MCP stdio shape
      already matches the way coding-agent clients (Claude Code, Codex,
      MCP-aware IDEs) connect to local servers; reusing it means the
      same `factory_*` tools work in every client without a bespoke
      adapter.
rationale: |
  The narrow surface matches the verb set the workflows need: read,
  inspect, expand a spec, and dry-run a routed set of tasks.
  Re-implementing the four JSON-RPC methods inline keeps the default
  checkout dependency-free while the SDK stays available under the
  `.[factory]` extra. The fixed tool set means no client can widen
  the factory into a shell-exec surface by passing a richer argument
  to a generic tool.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: doc
    ref: scripts/factory/mcp_server.py
  - kind: doc
    ref: specs/0009-factory-dev-control-plane/research.md
  - kind: doc
    ref: https://github.com/modelcontextprotocol/python-sdk
rollback: |
  Delete `scripts/factory/mcp_server.py` and remove its entry point from
  the factory CLI. Coding-agent clients fall back to driving the
  factory through the `scripts/factory/run.py` CLI directly. The
  SQLite store, the artifact store, the router, and the pipeline keep
  working unchanged; only the MCP surface goes away.
owner: platform
---

## decision

Expose the factory over a narrow MCP-compatible stdio JSON-RPC server
in `scripts/factory/mcp_server.py`. The server handles `initialize`,
`tools/list`, `tools/call`, `resources/list`, and `resources/read` with
a fixed tool set: `factory_status`, `factory_show`,
`factory_expand_spec`, and `factory_run_many_dry`. The server does not
expose any tool that takes a shell command or an arbitrary file path
outside the factory roots.

## alternatives

- Depend on the official MCP Python SDK at runtime — pulls in a
  transport stack the factory does not need on the default install
  path.
- Expose a generic shell-exec or run-arbitrary-task tool — turns the
  MCP surface into an RCE surface.
- Ship a REST/HTTP control plane instead of MCP stdio — drags in a web
  framework, an auth model, and a port to defend.

## rationale

The narrow surface matches the actual verb set the workflows need:
read, inspect, expand a spec, and dry-run a routed set of tasks.
Re-implementing the four JSON-RPC methods inline keeps the default
checkout dependency-free while the SDK stays available under the
`.[factory]` extra. The fixed tool set means no client can widen the
factory into a shell-exec surface by passing a richer argument.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` — R-FACTORY-001
  acceptance bullets (no arbitrary shell-command tool, four named
  tools).
- `scripts/factory/mcp_server.py` — the `_tools()` registry and the
  `_call_tool` dispatch.
- `specs/0009-factory-dev-control-plane/research.md` — the security
  note that frames MCP servers as command-execution surfaces.

## rollback

Delete `scripts/factory/mcp_server.py` and remove its entry point from
the factory CLI. Coding-agent clients fall back to driving the factory
through `scripts/factory/run.py` directly. The SQLite store, artifact
store, router, and pipeline keep working; only the MCP surface goes
away.
