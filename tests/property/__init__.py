"""Property test battery for the bargaining engine.

Each property file in this package asserts one engine invariant across
the input distribution via Hypothesis strategies. See
specs/0017-engine-property-test-battery/requirements.md for the full
list of properties and DEC-PROP-001 for the per-mechanism parameters.

The battery is registry-driven: tests/property/registry.py lists every
mechanism identifier and its invariant claims. Adding a new mechanism
gains coverage by registry entry alone.
"""
