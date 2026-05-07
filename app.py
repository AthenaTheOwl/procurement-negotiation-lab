"""Streamlit shell for procurement-negotiation-lab."""

from __future__ import annotations

from pathlib import Path

import streamlit as st

from procurement_lab import __version__
from procurement_lab.views.lab_view import render_lab
from procurement_lab.views.play_view import render_play
from procurement_lab.views.study_view import render_study

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DOCS_DIR = ROOT / "docs"


def main() -> None:
    st.set_page_config(
        page_title="procurement-negotiation-lab",
        page_icon=":handshake:",
        layout="wide",
    )
    st.title("procurement-negotiation-lab")
    st.caption(f"v{__version__} - a Beer Game-style lab for long-lead procurement")

    with st.sidebar:
        st.markdown("### mode")
        requested_mode = str(st.query_params.get("mode", "PLAY")).upper()
        modes = ["PLAY", "LAB", "STUDY"]
        mode = st.radio(
            "choose mode",
            modes,
            index=modes.index(requested_mode) if requested_mode in modes else 0,
            captions=[
                "guided story simulator",
                "algorithm and information sandbox",
                "math, data, and mental models",
            ],
        )
        st.divider()
        st.markdown(
            """
**PLAY first.** You are the buyer. Cinder is simulated.

Each beat asks for one decision, then reveals consequences: response, residual,
utility, surplus, and ending.
"""
        )

    if mode == "PLAY":
        render_play(DATA_DIR)
    elif mode == "LAB":
        render_lab(DATA_DIR)
    else:
        render_study(DATA_DIR, DOCS_DIR)


if __name__ == "__main__":
    main()
