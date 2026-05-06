from __future__ import annotations

from pathlib import Path

from streamlit.testing.v1 import AppTest


def test_streamlit_app_smoke() -> None:
    app_path = Path(__file__).resolve().parents[1] / "app.py"
    app = AppTest.from_file(str(app_path), default_timeout=60)
    app.run()
    assert not app.exception
    assert "procurement negotiation lab" in app.title[0].value.lower()
    markdown = "\n".join(item.value for item in app.markdown).lower()
    assert "management flight simulator" in markdown
    assert "make one decision, advance one round" in markdown
    assert "you are the buyer / procurement planner" in markdown
    assert "risk score" in markdown
    assert "disagreement left in units" in markdown
    assert "coach note" in markdown
    assert "why this is modeled like a game" in markdown
