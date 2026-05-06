from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
import plotly.express as px
import streamlit as st

from procurement_lab.algorithms import run_algorithm, run_algorithm_suite
from procurement_lab.defaults import BUYER_FORMULA, SUPPLIER_FORMULA, build_default_scenario
from procurement_lab.explanation_model import explain_trace, explain_transfer
from procurement_lab.formula_engine import FormulaError, compile_formula
from procurement_lab.formulations import run_plan_matrix
from procurement_lab.information_modes import INFORMATION_MODES, information_profile
from procurement_lab.learning_loop import LEARNING_STEPS, run_learning_step
from procurement_lab.scenario_loader import ScenarioSpec, load_scenarios, scenario_to_context
from procurement_lab.trace_schema import CoordinationTrace

ROOT = Path(__file__).resolve().parent
SCENARIO_PATH = ROOT / "data" / "supplier_scenarios.yaml"
EVIDENCE_PATH = ROOT / "data" / "risk_evidence.jsonl"
PROOF_PATH = ROOT / "ops" / "proof_gates.json"


st.set_page_config(
    page_title="procurement negotiation lab",
    page_icon="",
    layout="wide",
)


@st.cache_data
def _load_scenarios() -> list[ScenarioSpec]:
    return load_scenarios(SCENARIO_PATH)


@st.cache_data
def _load_evidence() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in EVIDENCE_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def _trace_rows(traces: list[CoordinationTrace]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "algorithm": trace.algorithm,
                "information": trace.information_mode,
                "quantity": trace.ledger.quantity,
                "global_utility": trace.ledger.global_utility,
                "buyer_utility": trace.ledger.buyer_utility,
                "supplier_utility": trace.ledger.supplier_utility,
                "iterations": trace.metrics.iterations,
                "residual": trace.metrics.residual,
                "gap_vs_oracle": trace.metrics.utility_gap_vs_oracle,
                "feasible": trace.ledger.feasible,
            }
            for trace in traces
        ]
    )


def _iteration_frame(trace: CoordinationTrace) -> pd.DataFrame:
    return pd.DataFrame([row.model_dump() for row in trace.iterations])


def _metric_row(label: str, value: str) -> None:
    st.metric(label=label, value=value)


def main() -> None:
    scenarios = _load_scenarios()
    st.title("procurement negotiation lab")
    st.caption(
        "long-lead commitments, agent utilities, information sharing, ADMM-style coordination, "
        "and surplus transfers. synthetic data only."
    )

    tabs = st.tabs(
        [
            "Learn",
            "Arena",
            "Algorithms",
            "Information",
            "Transfers",
            "Tutorial",
            "Data",
            "Tests",
        ]
    )
    with tabs[0]:
        render_learn(scenarios[0])
    with tabs[1]:
        render_arena()
    with tabs[2]:
        render_algorithms(scenarios)
    with tabs[3]:
        render_information(scenarios[0])
    with tabs[4]:
        render_transfers(scenarios[0])
    with tabs[5]:
        render_tutorial()
    with tabs[6]:
        render_data(scenarios)
    with tabs[7]:
        render_tests()


def render_learn(scenario: ScenarioSpec) -> None:
    st.header("learn the mechanism")
    step_labels = [step.title for step in LEARNING_STEPS]
    selected_label = st.selectbox("step", step_labels)
    step = LEARNING_STEPS[step_labels.index(selected_label)]
    st.write(step.narrative)
    traces = run_learning_step(scenario, step)
    df = _trace_rows(traces)
    st.dataframe(df, use_container_width=True, hide_index=True)
    trace = traces[-1]
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        _metric_row("quantity", f"{trace.ledger.quantity:.1f}")
    with col2:
        _metric_row("global utility", f"${trace.ledger.global_utility:,.0f}")
    with col3:
        _metric_row("residual", f"{trace.metrics.residual:.2f}")
    with col4:
        _metric_row("surplus", f"${trace.transfer.surplus:,.0f}")
    st.plotly_chart(_utility_bar(df), use_container_width=True)
    st.plotly_chart(_residual_chart(trace), use_container_width=True)
    st.info(explain_trace(trace))


def render_arena() -> None:
    st.header("arena")
    left, right = st.columns([1, 1])
    with left:
        product_count = st.slider("products", 1, 5, 2)
        periods = st.slider("periods", 1, 12, 4)
        participant_count = st.slider("participants", 2, 5, 2)
        risk_score = st.slider("risk score", 0.0, 1.0, 0.35, 0.05)
        information_mode = st.selectbox("information mode", list(INFORMATION_MODES), index=4)
        algorithm = st.selectbox(
            "algorithm",
            [
                "admm",
                "centralized_oracle",
                "alternating_best_response",
                "price_only_dual",
                "consensus_averaging",
            ],
        )
    with right:
        buyer_formula = st.text_area("buyer utility formula", BUYER_FORMULA, height=140)
        supplier_formula = st.text_area("supplier utility formula", SUPPLIER_FORMULA, height=140)

    try:
        compile_formula(buyer_formula)
        compile_formula(supplier_formula)
    except FormulaError as exc:
        st.error(f"formula rejected: {exc}")
        return

    scenario = build_default_scenario(
        product_count=product_count,
        periods=periods,
        participant_count=participant_count,
        risk_score=risk_score,
    )
    participants = list(scenario.participants)
    participants[0] = participants[0].model_copy(update={"formula": buyer_formula})
    participants[1] = participants[1].model_copy(update={"formula": supplier_formula})
    scenario = scenario.model_copy(update={"participants": participants})
    trace = run_algorithm(
        scenario,
        algorithm=algorithm,  # type: ignore[arg-type]
        information_mode=information_mode,  # type: ignore[arg-type]
    )
    st.subheader("result")
    st.dataframe(_trace_rows([trace]), use_container_width=True, hide_index=True)
    if product_count > 1 or periods > 1:
        st.subheader("product-period plan")
        matrix = pd.DataFrame(
            run_plan_matrix(
                scenario,
                algorithm=algorithm,  # type: ignore[arg-type]
                information_mode=information_mode,  # type: ignore[arg-type]
            )
        )
        st.dataframe(matrix, use_container_width=True, hide_index=True)
        st.caption(
            "v1 solves product-period dimensions independently. cross-product capacity "
            "coupling is called out as the next formulation bridge."
        )
    st.plotly_chart(_residual_chart(trace), use_container_width=True)
    st.info(explain_trace(trace))
    st.caption(
        "arena formulas run through an AST whitelist. attributes, imports, indexing, and "
        "arbitrary Python execution are rejected."
    )


def render_algorithms(scenarios: list[ScenarioSpec]) -> None:
    st.header("algorithm comparison")
    scenario = st.selectbox("scenario", scenarios, format_func=lambda item: item.name)
    mode = st.selectbox("information mode", list(INFORMATION_MODES), index=4, key="algo_mode")
    traces = run_algorithm_suite(scenario, information_mode=mode)  # type: ignore[arg-type]
    df = _trace_rows(traces)
    st.dataframe(df, use_container_width=True, hide_index=True)
    st.plotly_chart(_utility_bar(df), use_container_width=True)
    st.plotly_chart(
        px.bar(df, x="algorithm", y="gap_vs_oracle", title="utility gap vs centralized oracle"),
        use_container_width=True,
    )


def render_information(scenario: ScenarioSpec) -> None:
    st.header("information value")
    actual = scenario_to_context(scenario, quantity=0)
    profiles = [information_profile(mode, actual) for mode in INFORMATION_MODES]
    admm_rows = [
        {
            "information_mode": mode,
            "global_utility": run_algorithm(
                scenario, algorithm="admm", information_mode=mode
            ).ledger.global_utility,
        }
        for mode in INFORMATION_MODES
    ]
    admm = pd.DataFrame(admm_rows)
    profile_df = pd.DataFrame(
        [
            {
                "information_mode": profile.mode,
                "privacy_exposure": profile.privacy_exposure,
                "shared_fields": ", ".join(profile.shared_fields) or "none",
                "explanation": profile.explanation,
            }
            for profile in profiles
        ]
    )
    st.dataframe(profile_df, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.line(
            admm,
            x="information_mode",
            y="global_utility",
            markers=True,
            title="ADMM global utility as more information is shared",
        ),
        use_container_width=True,
    )


def render_transfers(scenario: ScenarioSpec) -> None:
    st.header("cost-benefit transfer")
    mode = st.selectbox("information mode", list(INFORMATION_MODES), index=4, key="transfer_mode")
    trace = run_algorithm(scenario, algorithm="admm", information_mode=mode)  # type: ignore[arg-type]
    st.write(explain_transfer(trace))
    st.dataframe(
        pd.DataFrame(
            [
                {
                    "buyer utility before": trace.ledger.buyer_utility,
                    "supplier utility before": trace.ledger.supplier_utility,
                    "buyer transfer": trace.transfer.buyer_transfer,
                    "supplier transfer": trace.transfer.supplier_transfer,
                    "buyer after": trace.transfer.buyer_after_transfer,
                    "supplier after": trace.transfer.supplier_after_transfer,
                    "buyer no worse off": trace.transfer.buyer_no_worse_off,
                    "supplier no worse off": trace.transfer.supplier_no_worse_off,
                }
            ]
        ),
        use_container_width=True,
        hide_index=True,
    )


def render_tutorial() -> None:
    st.header("tutorial")
    st.markdown(
        """
### objective functions

Each participant has a utility function in dollars. The buyer values fulfilled
demand, pays for committed quantity, and pays shortage/holding/risk costs. The
supplier earns revenue, pays production cost, and absorbs cancellation or
capacity-overrun penalties.

### ADMM-style coordination

The ADMM path repeats three moves: each agent solves its local utility with a
proximity penalty to the current consensus, the system averages the proposed
quantities, then price-like dual signals update. The residual is the distance
between buyer and supplier preferred quantities.

### why compare algorithms

ADMM is useful for structured distributed optimization. It is not magic. The
lab compares it to a centralized oracle, alternating best response, price-only
dual updates, and consensus averaging so users can see runtime, residuals, and
utility gaps.

### certainty and long-lead planning

Long lead times convert forecasts into commitments before demand is fully known.
Firm commitments reduce supplier risk but can create buyer cancellation risk.
Soft commitments preserve option value but may fail to reserve capacity. The
right plan depends on penalties, information, and how the surplus is split.
"""
    )


def render_data(scenarios: list[ScenarioSpec]) -> None:
    st.header("data")
    st.write("built-in scenarios are deterministic synthetic fixtures.")
    st.code(SCENARIO_PATH.read_text(encoding="utf-8")[:4000], language="yaml")
    evidence = _load_evidence()
    st.dataframe(pd.DataFrame(evidence), use_container_width=True, hide_index=True)
    st.warning(
        "No real purchase orders, supplier records, internal Amazon data, or production "
        "recommendations are included."
    )


def render_tests() -> None:
    st.header("proof gates")
    payload = json.loads(PROOF_PATH.read_text(encoding="utf-8"))
    st.caption(f"status: {payload['status']} · last updated: {payload['last_updated']}")
    st.dataframe(pd.DataFrame(payload["gates"]), use_container_width=True, hide_index=True)


def _utility_bar(df: pd.DataFrame) -> Any:
    long_df = df.melt(
        id_vars=["algorithm"],
        value_vars=["buyer_utility", "supplier_utility", "global_utility"],
        var_name="utility",
        value_name="dollars",
    )
    return px.bar(long_df, x="algorithm", y="dollars", color="utility", barmode="group")


def _residual_chart(trace: CoordinationTrace) -> Any:
    frame = _iteration_frame(trace)
    return px.line(
        frame,
        x="iteration",
        y=["buyer_quantity", "supplier_quantity", "consensus_quantity", "residual"],
        markers=True,
        title=f"{trace.algorithm} trace",
    )


if __name__ == "__main__":
    main()
