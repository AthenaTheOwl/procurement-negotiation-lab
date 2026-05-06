"""procurement-negotiation-lab — Streamlit shell.

Routing only. All UI lives under src/procurement_lab/views/ (built in Phase 3+).
Until then, this stub renders a redesign-in-progress notice and points at the
engine-layer CLI for smoke tests.
"""

from __future__ import annotations

import streamlit as st

from procurement_lab import __version__

st.set_page_config(
    page_title="procurement-negotiation-lab",
    page_icon=":handshake:",
    layout="wide",
)

st.title("procurement-negotiation-lab")
st.caption(f"v{__version__} — redesign in progress")

st.info(
    "**Phase 1 (engine rewrite) in progress.**\n\n"
    "The previous configuration-style UI has been replaced. The new narrative "
    "simulator (Phase 2) and view layer (Phase 3+) are under construction. "
    "See `C:\\Users\\Vignesh\\.claude\\plans\\codex-briefs\\06-procurement-lab-redesign.md` "
    "for the build plan."
)

st.markdown(
    "**While the UI is rebuilt, exercise the engine via CLI:**\n\n"
    "```powershell\n"
    "python -m uv run pytest tests/ -v\n"
    "```\n\n"
    "When Phase 1 is complete, the Streamlit Play surface (Phase 2) becomes "
    "the default landing experience."
)
