"""STUDY surface: reference material linked to the simulator."""

from __future__ import annotations

from pathlib import Path

import streamlit as st

from procurement_lab.narrative.story import load_story


def render_study(data_dir: Path, docs_dir: Path) -> None:
    story = load_story(data_dir / "stories" / "substrate_crunch.yaml")
    st.header("STUDY: how the simulator works")
    section = st.radio(
        "study section",
        ["story map", "math", "mental models", "data boundary"],
        horizontal=True,
    )
    if section == "story map":
        _render_story_map(story)
    elif section == "math":
        _render_math(docs_dir)
    elif section == "mental models":
        _render_mental_models(data_dir)
    else:
        _render_data_boundary(docs_dir)


def _render_story_map(story: object) -> None:
    st.subheader("story map")
    st.markdown(
        """
The simulator is a pearl string: each beat is fixed, but your choice changes
the relationship, risk, budget pressure, privacy exposure, and ending.
"""
    )
    for beat in story.beats:  # type: ignore[attr-defined]
        with st.expander(f"Week {beat.week}: {beat.title}"):
            st.markdown(beat.situation)
            st.markdown(f"**learning goal:** {beat.learning_goal}")
            st.markdown("**choices:** " + ", ".join(option.label for option in beat.options))


def _render_math(docs_dir: Path) -> None:
    st.subheader("objective functions and solvers")
    st.markdown((docs_dir / "tutorial.md").read_text(encoding="utf-8"))
    st.markdown("### formula language")
    st.markdown((docs_dir / "formula-language.md").read_text(encoding="utf-8"))
    st.markdown("### CBT")
    st.markdown((docs_dir / "cbt.md").read_text(encoding="utf-8"))


def _render_mental_models(data_dir: Path) -> None:
    st.subheader("mental models")
    for path in sorted((data_dir / "mental_models").glob("*.md")):
        with st.expander(path.stem.replace("_", " ")):
            st.markdown(path.read_text(encoding="utf-8"))


def _render_data_boundary(docs_dir: Path) -> None:
    st.subheader("data boundary")
    st.markdown((docs_dir / "public-data-boundary.md").read_text(encoding="utf-8"))
    st.markdown((docs_dir / "synthetic-data.md").read_text(encoding="utf-8"))
