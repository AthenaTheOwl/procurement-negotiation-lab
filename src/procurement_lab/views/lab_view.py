"""LAB surface: compare algorithms and information choices."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.algorithms.base import Algorithm
from procurement_lab.algorithms.oracle import CentralizedOracle
from procurement_lab.algorithms.simple import (
    AlternatingBestResponse,
    ConsensusAveraging,
    PriceOnlyDual,
)
from procurement_lab.engine.cbt import compute_transfer
from procurement_lab.engine.schemas import AlgorithmRun, InformationMode, Scenario
from procurement_lab.narrative.story import load_story


def render_lab(data_dir: Path) -> None:
    story = load_story(data_dir / "stories" / "substrate_crunch.yaml")
    scenario = story.scenario
    st.header("LAB: sandbox")
    if not bool(st.session_state.get("play_completed", False)):
        st.warning(
            "The full lab is meant to unlock after one PLAY ending. For local "
            "development, the controls are visible so you can test the model."
        )

    mode = st.radio(
        "lab view",
        ["algorithm comparison", "information value", "transfer check"],
        horizontal=True,
    )
    if mode == "algorithm comparison":
        _render_algorithm_comparison(scenario)
    elif mode == "information value":
        _render_information_value(scenario)
    else:
        _render_transfer_check(scenario)


def _render_algorithm_comparison(scenario: Scenario) -> None:
    st.subheader("algorithm comparison")
    st.markdown(
        """
ADMM has to earn the win. This table compares it with the oracle and simpler
coordination rules on the same scenario.
"""
    )
    information_mode = st.selectbox(
        "information mode",
        list(InformationMode),
        index=list(InformationMode).index(InformationMode.FORECAST_BAND),
        format_func=lambda item: item.value,
    )
    runs = _algorithm_runs(scenario, information_mode)
    oracle_utility = next(
        run for run in runs if run.algorithm == "centralized_oracle"
    ).ledger.global_utility
    rows = [_run_row(run, oracle_utility) for run in runs]
    frame = pd.DataFrame(rows)
    st.dataframe(frame, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.scatter(
            frame,
            x="iterations",
            y="gap_vs_oracle",
            size="residual",
            color="algorithm",
            title="runtime/convergence tradeoff",
        ),
        use_container_width=True,
    )


def _render_information_value(scenario: Scenario) -> None:
    st.subheader("information value")
    rows: list[dict[str, float | str]] = []
    oracle_utility = CentralizedOracle().run(scenario).ledger.global_utility
    for mode in InformationMode:
        run = ADMM().run(scenario, information_mode=mode, max_iter=80, tolerance=0.5)
        rows.append(_run_row(run, oracle_utility) | {"information_mode": mode.value})
    frame = pd.DataFrame(rows)
    st.dataframe(frame, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.bar(
            frame,
            x="information_mode",
            y="global_utility",
            title="global utility by information mode",
        ),
        use_container_width=True,
    )


def _render_transfer_check(scenario: Scenario) -> None:
    st.subheader("transfer check")
    run = ADMM().run(
        scenario,
        information_mode=InformationMode.FORECAST_BAND,
        max_iter=80,
        tolerance=0.5,
    )
    transfer = compute_transfer(run.ledger)
    cols = st.columns(4)
    cols[0].metric("global utility", _money(run.ledger.global_utility))
    cols[1].metric("surplus", _money(transfer.surplus))
    cols[2].metric("transfer feasible", str(transfer.feasible))
    cols[3].metric("residual", f"{run.final_residual:.0f}")
    st.dataframe(
        pd.DataFrame(
            [
                {
                    "participant": participant,
                    "local_utility": run.ledger.local[participant],
                    "outside_option": run.ledger.outside_options[participant],
                    "transfer": transfer.transfers[participant],
                    "after_transfer": transfer.after_transfer[participant],
                    "no_worse_off": transfer.no_worse_off[participant],
                }
                for participant in run.ledger.local
            ]
        ),
        use_container_width=True,
        hide_index=True,
    )


def _algorithm_runs(
    scenario: Scenario,
    information_mode: InformationMode,
) -> list[AlgorithmRun]:
    algorithms: list[Algorithm] = [
        CentralizedOracle(),
        ADMM(),
        AlternatingBestResponse(),
        PriceOnlyDual(),
        ConsensusAveraging(),
    ]
    return [
        algorithm.run(scenario, information_mode=information_mode, max_iter=80, tolerance=0.5)
        for algorithm in algorithms
    ]


def _run_row(run: AlgorithmRun, oracle_utility: float) -> dict[str, float | str | bool | int]:
    gap = oracle_utility - run.ledger.global_utility
    return {
        "algorithm": run.algorithm,
        "convergence": run.convergence.value,
        "iterations": len(run.iterations),
        "residual": round(run.final_residual, 3),
        "global_utility": round(run.ledger.global_utility, 2),
        "gap_vs_oracle": round(gap, 2),
        "runtime_ms": round(run.runtime_ms, 2),
        "feasible": run.ledger.feasible,
    }


def _money(value: float) -> str:
    return f"${value:,.0f}"
