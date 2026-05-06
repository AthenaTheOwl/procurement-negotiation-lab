from __future__ import annotations

from pathlib import Path

from streamlit.testing.v1 import AppTest


def test_streamlit_app_smoke() -> None:
    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path), default_timeout=60)
    app.run()
    assert not app.exception
    assert "procurement negotiation lab" in app.title[0].value.lower()
    markdown = "\n".join(item.value for item in app.markdown)
    assert "what this tab is" in markdown
    assert "plain English glossary" in markdown
    assert "You are the buyer / procurement planner" in markdown
    assert "what this step is doing" in markdown
    assert "how to read the result table" in markdown
    assert "risk knob" in markdown
    assert "unresolved disagreement in units" in markdown
    assert "utility function" in markdown
