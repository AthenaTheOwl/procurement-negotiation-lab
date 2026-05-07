from __future__ import annotations

from pathlib import Path

from procurement_lab.narrative.counterparty import load_counterparty
from procurement_lab.narrative.endings import CONVERGENT_SETTLEMENT, WALKAWAY
from procurement_lab.narrative.run_state import advance_story, initial_state
from procurement_lab.narrative.story import StoryArc, load_story

ROOT = Path(__file__).resolve().parents[1]


def _story() -> StoryArc:
    return load_story(ROOT / "data" / "stories" / "substrate_crunch.yaml")


def test_story_advances_one_beat_and_records_consequence() -> None:
    story = _story()
    persona = load_counterparty(ROOT / "data" / "counterparties" / "cinder.yaml")
    state = initial_state(story)
    next_state = advance_story(story, persona, state, "balanced_forecast")
    assert next_state.beat_index == 1
    assert len(next_state.decisions) == 1
    assert len(next_state.consequences) == 1
    assert next_state.consequences[0].residual >= 0
    assert "Frame:" in next_state.consequences[0].coach_note


def test_balanced_path_reaches_convergent_settlement() -> None:
    story = _story()
    persona = load_counterparty(ROOT / "data" / "counterparties" / "cinder.yaml")
    state = initial_state(story)
    for option_id in [
        "balanced_forecast",
        "accept_premium",
        "ask_transparency",
        "offer_cbt",
        "firm_band",
        "settle_balanced",
    ]:
        state = advance_story(story, persona, state, option_id)
    assert state.complete
    assert state.ending == CONVERGENT_SETTLEMENT


def test_hardline_path_can_walk_away() -> None:
    story = _story()
    persona = load_counterparty(ROOT / "data" / "counterparties" / "cinder.yaml")
    state = initial_state(story)
    for option_id in [
        "aggressive_forecast",
        "push_back",
        "hold_line",
        "stand_firm",
        "accept_shortage",
        "settle_hard",
    ]:
        state = advance_story(story, persona, state, option_id)
    assert state.complete
    assert state.ending == WALKAWAY
