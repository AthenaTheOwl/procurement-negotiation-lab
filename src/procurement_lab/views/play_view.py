"""PLAY surface: the guided management-flight-simulator experience."""

from __future__ import annotations

from pathlib import Path
from typing import Any, cast

import pandas as pd
import plotly.express as px
import streamlit as st

from procurement_lab.narrative.coach import final_debrief
from procurement_lab.narrative.counterparty import CounterpartyPersona, load_counterparty
from procurement_lab.narrative.run_state import (
    BeatConsequence,
    StoryRunState,
    advance_story,
    initial_state,
)
from procurement_lab.narrative.story import StoryArc, load_story


def render_play(data_dir: Path) -> None:
    story = _load_story(data_dir)
    persona = _load_persona(data_dir)
    state = _get_state(story)

    st.header("PLAY: The Substrate Crunch")
    st.caption("six beats. one procurement role. decisions first, math second.")
    st.markdown(f"**Scenario:** {story.title}")

    if not state.decisions:
        _render_setup(story)

    _render_scoreboard(story, state)

    if state.complete and state.ending is not None:
        _render_ending(state)
        if st.button("restart simulation"):
            _set_state(initial_state(story))
            st.session_state["play_completed"] = False
            st.rerun()
        return

    beat = story.beat(state.beat_index)
    st.subheader(f"Week {beat.week}: {beat.title}")
    cols = st.columns([1.2, 1.0])
    with cols[0]:
        st.markdown("#### what is happening")
        st.markdown(beat.situation)
        st.markdown("#### your decision")
        st.markdown(beat.buyer_prompt)
    with cols[1]:
        st.markdown("#### what Cinder sees")
        st.markdown(beat.supplier_private_context)
        st.markdown("#### lesson in this beat")
        st.markdown(beat.learning_goal)

    st.markdown("### choose one move")
    option_cols = st.columns(len(beat.options))
    for column, option in zip(option_cols, beat.options, strict=True):
        with column:
            st.markdown(f"**{option.label}**")
            st.markdown(option.summary)
            st.caption(option.consequence_hint)
            if st.button("choose", key=f"choose_{beat.id}_{option.id}", type="primary"):
                next_state = advance_story(story, persona, state, option.id)
                if next_state.complete:
                    st.session_state["play_completed"] = True
                _set_state(next_state)
                st.rerun()

    if state.consequences:
        _render_latest_consequence(state.consequences[-1])
        _render_history(state)

    st.markdown(
        "**why this is a simulator:** your decision creates the next state. "
        "The model appears as consequences, not as a form to configure first."
    )
    with st.expander("why this is a simulator, not a dashboard"):
        st.markdown(
            """
You are not configuring a solver first. You are playing a role under time
pressure. The model is still there, but it appears as consequences: Cinder's
response, residual, local utility, global utility, surplus, and ending.
"""
        )


def _render_setup(story: StoryArc) -> None:
    st.info(f"**Your role:** {story.player_role}")
    st.markdown(story.setup)


def _render_scoreboard(story: StoryArc, state: StoryRunState) -> None:
    progress = (state.beat_index + 1) / len(story.beats)
    if state.complete:
        progress = 1.0
    st.progress(progress)
    cols = st.columns(5)
    cols[0].metric("beat", f"{min(state.beat_index + 1, len(story.beats))}/{len(story.beats)}")
    cols[1].metric("relationship", state.relationship_score)
    cols[2].metric("SLA risk", f"{state.sla_risk:.1f}")
    cols[3].metric("budget pressure", f"{state.budget_pressure:.1f}")
    cols[4].metric("privacy exposed", f"{state.privacy_exposure:.0%}")


def _render_latest_consequence(consequence: BeatConsequence) -> None:
    st.markdown("### last consequence")
    st.markdown(f"**{consequence.counterparty_response.headline}**")
    st.markdown(consequence.counterparty_response.body)
    cols = st.columns(5)
    cols[0].metric("your ask", f"{consequence.buyer_quantity:.0f}")
    cols[1].metric("Cinder response", f"{consequence.supplier_quantity:.0f}")
    cols[2].metric("residual", f"{consequence.residual:.0f}")
    cols[3].metric("surplus", _money(consequence.surplus))
    cols[4].metric("oracle gap", _money(consequence.gap_vs_oracle))
    st.markdown("#### coach debrief")
    st.markdown(consequence.coach_note)


def _render_history(state: StoryRunState) -> None:
    frame = pd.DataFrame(
        [
            {
                "beat": index + 1,
                "decision": consequence.option_label,
                "buyer_quantity": consequence.buyer_quantity,
                "supplier_quantity": consequence.supplier_quantity,
                "plan_quantity": consequence.plan_quantity,
                "residual": consequence.residual,
                "global_utility": consequence.global_utility,
                "surplus": consequence.surplus,
            }
            for index, consequence in enumerate(state.consequences)
        ]
    )
    st.markdown("### run history")
    st.dataframe(frame, use_container_width=True, hide_index=True)
    quantity_frame = frame.melt(
        id_vars=["beat"],
        value_vars=["buyer_quantity", "supplier_quantity", "plan_quantity"],
        var_name="series",
        value_name="quantity",
    )
    st.plotly_chart(
        px.line(
            quantity_frame,
            x="beat",
            y="quantity",
            color="series",
            markers=True,
            title="quantity path across beats",
        ),
        use_container_width=True,
    )


def _render_ending(state: StoryRunState) -> None:
    ending = state.ending
    if ending is None:
        return
    st.success(f"Ending: {ending.title}")
    st.markdown(ending.summary)
    st.markdown(f"**lesson:** {ending.lesson}")
    st.markdown("### final debrief")
    labels = [decision.option_label for decision in state.decisions]
    st.markdown(final_debrief(labels, ending.title))
    _render_history(state)


def _load_story(data_dir: Path) -> StoryArc:
    return load_story(data_dir / "stories" / "substrate_crunch.yaml")


def _load_persona(data_dir: Path) -> CounterpartyPersona:
    return load_counterparty(data_dir / "counterparties" / "cinder.yaml")


def _get_state(story: StoryArc) -> StoryRunState:
    raw = st.session_state.get("play_state")
    if not isinstance(raw, dict) or raw.get("story_id") != story.id:
        state = initial_state(story)
        _set_state(state)
        return state
    return StoryRunState.model_validate(cast(dict[str, Any], raw))


def _set_state(state: StoryRunState) -> None:
    st.session_state["play_state"] = state.model_dump(mode="json")


def _money(value: float) -> str:
    return f"${value:,.0f}"
