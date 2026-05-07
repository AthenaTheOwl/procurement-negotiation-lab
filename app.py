"""Legacy Streamlit entrypoint.

The polished simulator is now the React/TypeScript app in ``web/``. This file
stays importable because older Streamlit Community Cloud and CI checks may still
point at ``app.py`` while the Vercel deployment is being wired.
"""

from __future__ import annotations

import streamlit as st

from procurement_lab import __version__


def main() -> None:
    st.set_page_config(
        page_title="procurement-negotiation-lab",
        page_icon=":handshake:",
        layout="wide",
    )
    st.title("procurement-negotiation-lab")
    st.caption(f"v{__version__} - Python reference engine")
    st.info(
        "The polished learning simulator is the React/TypeScript app in `web/`. "
        "Run `npm.cmd run dev` from the repo root and open the Vite URL."
    )
    st.markdown(
        """
This Streamlit page is intentionally small. It exists as a compatibility
entrypoint while the public demo moves to a Vercel-friendly frontend.

The Python package still owns the reference math engine, scenario validation,
formula safety checks, and regression tests.
"""
    )


if __name__ == "__main__":
    main()
