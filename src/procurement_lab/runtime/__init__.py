"""Runtime adapters for executing factory tasks against external SDKs.

This subpackage carries the thin shims that translate a factory task into a
specific runtime provider's execution shape. Adapters DO NOT replace the
factory pipeline; they wrap it so the same task can be driven by a stub
worker, an Agents-SDK SandboxAgent, or some future provider while emitting
the same run-evidence ledger and Run record.

The first adapter is ``openai_agents_runtime`` (DEC-CDCP-021 + the local
follow-on DEC-FACTORY-016). Additional adapters land here as new providers
get adopted.
"""
