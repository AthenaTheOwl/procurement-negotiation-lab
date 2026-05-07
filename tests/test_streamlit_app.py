from __future__ import annotations

from pathlib import Path

from streamlit.testing.v1 import AppTest


def test_streamlit_play_surface_renders() -> None:
    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path), default_timeout=60)
    app.run()
    assert not app.exception
    assert "procurement-negotiation-lab" in app.title[0].value
    markdown = "\n".join(item.value for item in app.markdown).lower()
    assert "public demo moves to a vercel-friendly frontend" in markdown
    assert "python package still owns the reference math engine" in markdown
