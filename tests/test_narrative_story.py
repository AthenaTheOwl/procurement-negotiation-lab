from __future__ import annotations

from pathlib import Path

from procurement_lab.narrative.story import load_story

ROOT = Path(__file__).resolve().parents[1]


def test_substrate_crunch_story_loads() -> None:
    story = load_story(ROOT / "data" / "stories" / "substrate_crunch.yaml")
    assert story.id == "substrate_crunch"
    assert len(story.beats) == 6
    assert story.player_role.startswith("Maya Chen")
    assert story.scenario.participant("buyer-northstar")


def test_each_beat_has_multiple_decisions_and_study_links() -> None:
    story = load_story(ROOT / "data" / "stories" / "substrate_crunch.yaml")
    for beat in story.beats:
        assert len(beat.options) >= 2
        assert beat.study_links
        assert beat.learning_goal
