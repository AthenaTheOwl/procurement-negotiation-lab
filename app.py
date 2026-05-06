from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

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
from procurement_lab.trace_schema import AlgorithmName, CoordinationTrace, InformationMode

ROOT = Path(__file__).resolve().parent
SCENARIO_PATH = ROOT / "data" / "supplier_scenarios.yaml"
EVIDENCE_PATH = ROOT / "data" / "risk_evidence.jsonl"
PROOF_PATH = ROOT / "ops" / "proof_gates.json"

ALGORITHMS: tuple[AlgorithmName, ...] = (
    "admm",
    "centralized_oracle",
    "alternating_best_response",
    "price_only_dual",
    "consensus_averaging",
)

ALGORITHM_LABELS: dict[AlgorithmName, str] = {
    "centralized_oracle": "centralized oracle: best plan if all private data were shared",
    "admm": "ADMM-style coordination: local agents negotiate toward one quantity",
    "alternating_best_response": "alternating best response: each side reacts to the other",
    "price_only_dual": "price-only update: coordination through a price signal",
    "consensus_averaging": "consensus averaging: simple averaging baseline",
}

INFORMATION_LABELS: dict[InformationMode, str] = {
    "private": "private: both sides keep forecasts and constraints",
    "risk_only": "risk only: both sides share a risk score",
    "capacity_band": "capacity band: supplier shares rough capacity",
    "cost_band": "cost band: supplier shares rough cost structure",
    "forecast_band": "forecast band: buyer shares rough demand forecast",
    "full_oracle": "full oracle: everything modeled is shared",
}

METRIC_EXPLANATIONS = {
    "quantity": "the number of units both sides are trying to agree on.",
    "risk score": (
        "a synthetic 0-to-1 disruption knob. 0 means the supplier looks stable in this "
        "toy model. 1 means the supplier looks very exposed to delay, capacity, or "
        "policy risk. It is not a real credit score or probability."
    ),
    "buyer utility": (
        "the buyer's dollar score. It goes up when demand is covered and down when "
        "the buyer overbuys, underbuys, or takes risk."
    ),
    "supplier utility": (
        "the supplier's dollar score. It goes up with profitable committed volume and "
        "down with capacity stress, cancellation exposure, and risk."
    ),
    "global utility": (
        "buyer utility plus supplier utility. This is the total value created by the "
        "deal before any transfer splits the gains."
    ),
    "residual": (
        "the difference in units between what the buyer wants and what the supplier "
        "is willing to commit. Zero means agreement. Large residual means disagreement."
    ),
    "gap vs oracle": (
        "how much value the chosen algorithm left on the table compared with a "
        "central planner that sees all private information."
    ),
    "surplus": (
        "global utility minus both sides' outside options. Positive surplus means a "
        "deal can potentially make everyone better off."
    ),
    "transfer": (
        "money moved after the plan is chosen. It does not change the operational "
        "quantity; it changes who captures the value."
    ),
    "privacy exposure": (
        "a rough 0-to-1 score for how much private planning information is shared. "
        "More sharing can improve the plan, but it is not free."
    ),
}

STEP_EXPLANATIONS = {
    "local_objectives": (
        "You are the buyer. You pick a quantity that protects you from shortage. "
        "The simulated supplier separately picks a quantity that protects its capacity.",
        "This is why the two sides can disagree even when both are being reasonable.",
    ),
    "global_utility": (
        "The app asks what an all-knowing planner would choose if buyer demand and "
        "supplier capacity/cost were visible together.",
        "This is the benchmark. If the real negotiation is far below it, coordination "
        "is leaving value on the table.",
    ),
    "commitment_terms": (
        "The app adds a risk score and penalties. If you underbuy, you pay shortage "
        "costs. If the supplier overcommits, it pays capacity/cancellation costs.",
        "Long-lead planning only becomes negotiable once uncertainty has a dollar shape.",
    ),
    "coordination": (
        "The buyer and supplier repeatedly revise their preferred quantities after "
        "seeing a price-like coordination signal.",
        "Watch residual: it is the gap between their preferred quantities. Falling "
        "residual means they are moving toward agreement.",
    ),
    "transfers": (
        "After the quantity is chosen, the app asks whether one side should pay the "
        "other so both beat their walk-away option.",
        "A plan can create total value and still be unacceptable to one party unless "
        "the surplus is split.",
    ),
    "information_value": (
        "The app reveals more information: risk, capacity bands, cost bands, and buyer "
        "forecast bands.",
        "If global utility improves, the extra information bought a better plan. If "
        "not, the extra disclosure was not useful in this toy case.",
    ),
}

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
    render_header()

    tabs = st.tabs(
        [
            "1 start here",
            "2 try a negotiation",
            "3 compare algorithms",
            "4 share information",
            "5 split surplus",
            "6 how math works",
            "7 data boundary",
            "8 proof gates",
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
        render_data()
    with tabs[7]:
        render_tests()


def render_header() -> None:
    st.title("procurement negotiation lab")
    st.caption("a learning app for long-lead buying plans. synthetic data only.")
    st.info(
        "In the guided walkthrough, **you are the buyer / procurement planner**. "
        "You need to reserve long-lead component capacity before demand is perfectly "
        "known. The app simulates the supplier, then shows whether the two sides can "
        "agree on a quantity and split the gains."
    )
    with st.sidebar:
        st.header("how to read this")
        st.markdown(
            """
1. **start here** shows the guided story.
2. **try a negotiation** is the sandbox.
3. **compare algorithms** asks whether ADMM is actually better.
4. **share information** shows what better forecasts buy.
5. **split surplus** checks whether both sides can end up no worse off.
"""
        )
        st.divider()
        st.markdown(
            """
**plain English glossary**

- **quantity:** units both sides commit to.
- **utility:** dollar score for one participant. Bigger is better.
- **global utility:** buyer utility plus supplier utility.
- **residual:** buyer/supplier disagreement in units.
- **risk score:** synthetic 0-to-1 disruption knob.
- **oracle:** the best modeled plan if everyone shared everything.
- **gap vs oracle:** value left on the table.
- **transfer:** money moved after the plan to split the surplus.
"""
        )


def render_tab_guide(title: str, purpose: str, touch: str, look_at: str) -> None:
    st.header(title)
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"**what this tab is**\n\n{purpose}")
    with col2:
        st.markdown(f"**what to touch**\n\n{touch}")
    with col3:
        st.markdown(f"**what to look at**\n\n{look_at}")
    st.divider()


def render_metric_glossary(*terms: str) -> None:
    with st.expander("what do these words mean?", expanded=True):
        for term in terms:
            st.markdown(f"**{term}:** {METRIC_EXPLANATIONS[term]}")


def render_step_explanation(step_id: str) -> None:
    doing, significance = STEP_EXPLANATIONS[step_id]
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("**your role**\n\nYou are the buyer. You want enough units, but not waste.")
    with col2:
        st.markdown(
            "**supplier role**\n\nThe supplier is simulated. It wants profitable "
            "volume without overcommitting."
        )
    with col3:
        st.markdown(f"**what this step is doing**\n\n{doing}")
    st.markdown(f"**why it matters**\n\n{significance}")


def render_scenario_card(scenario: ScenarioSpec) -> None:
    product = scenario.products[0]
    supplier = scenario.suppliers[0]
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(
            f"**you need**\n\nAbout **{product.demand_mean:.0f} units** of "
            f"`{product.name}`. Demand is uncertain."
        )
    with col2:
        st.markdown(
            f"**supplier can handle**\n\nAbout **{supplier.capacity:.0f} units** before "
            "capacity stress gets expensive."
        )
    with col3:
        st.markdown(
            f"**risk knob**\n\nRisk score is **{supplier.risk_score:.2f}**. "
            "Higher means delay/capacity/policy disruption is more expensive in this toy model."
        )


def render_result_explainer() -> None:
    st.markdown(
        """
**how to read the result table**

- `quantity` is the negotiated commitment: how many units you and the supplier settle on.
- `buyer_utility` and `supplier_utility` are local dollar scores before transfers.
- `global_utility` is the combined value created.
- `residual` is unresolved disagreement in units: buyer preferred quantity minus
  supplier preferred quantity.
- `gap_vs_oracle` is value left on the table versus the all-knowing benchmark.
"""
    )


def render_learn(scenario: ScenarioSpec) -> None:
    render_tab_guide(
        "start here",
        "the fixed walkthrough. one buyer, one supplier, one long-lead component.",
        "move the guided step selector from 1 to 6.",
        "watch quantity, global utility, residual, and surplus change together.",
    )
    st.subheader("the situation")
    st.markdown(
        """
You are the buyer / procurement planner.

You need to decide how many units to commit to before demand is fully certain.
The supplier is simulated. It decides how much capacity it is willing to reserve.
You do not start with the same information.

This loop shows the whole mechanism before the sandbox opens up.
"""
    )
    render_scenario_card(scenario)
    step_labels = [step.title for step in LEARNING_STEPS]
    selected_label = st.selectbox("guided step", step_labels)
    step = LEARNING_STEPS[step_labels.index(selected_label)]
    st.success(f"current lesson: {step.narrative}")
    render_step_explanation(step.id)
    render_metric_glossary("quantity", "risk score", "global utility", "residual", "surplus")
    traces = run_learning_step(scenario, step)
    df = _trace_rows(traces)
    trace = traces[-1]

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        _metric_row("quantity", f"{trace.ledger.quantity:.1f}")
    with col2:
        _metric_row("global utility", f"${trace.ledger.global_utility:,.0f}")
    with col3:
        _metric_row("disagreement left", f"{trace.metrics.residual:.2f} units")
    with col4:
        _metric_row("surplus", f"${trace.transfer.surplus:,.0f}")
    st.caption(
        "Rule of thumb: high global utility is good. Low residual means the agents agree. "
        "Positive surplus means there is value to split."
    )
    render_result_explainer()
    st.dataframe(df, use_container_width=True, hide_index=True)
    st.caption(
        "The bar chart is not a revenue chart. It is a utility chart: each bar is a "
        "modeled dollar score after costs, risks, and penalties."
    )
    st.plotly_chart(_utility_bar(df), use_container_width=True)
    st.caption(
        "The residual chart is the negotiation heartbeat. If buyer and supplier quantities "
        "move together, the mechanism is coordinating them. If they stay apart, it is not."
    )
    st.plotly_chart(_residual_chart(trace), use_container_width=True)
    st.info(explain_trace(trace))


def render_arena() -> None:
    render_tab_guide(
        "try a negotiation",
        "the sandbox. change the problem and rerun the coordination loop.",
        "start with risk score, information mode, and coordination rule. edit formulas last.",
        "compare the result row, product-period plan, and residual chart.",
    )
    render_metric_glossary(
        "quantity",
        "buyer utility",
        "supplier utility",
        "global utility",
        "residual",
        "gap vs oracle",
    )
    st.markdown(
        """
Use this tab after the guided loop. The sandbox changes the shape of the problem:
more products, more periods, more participants, higher risk, less shared information,
or different math for what each side values.
"""
    )
    left, right = st.columns([1, 1])
    with left:
        product_count = st.slider("products", 1, 5, 2)
        periods = st.slider("periods", 1, 12, 4)
        participant_count = st.slider("participants", 2, 5, 2)
        risk_score = st.slider(
            "risk score",
            0.0,
            1.0,
            0.35,
            0.05,
            help=(
                "Synthetic 0-to-1 disruption knob. Higher means delay, capacity, or "
                "policy risk is more expensive in the utility math."
            ),
        )
        st.caption(
            "Risk score is not a real supplier rating. It is a toy-model knob for "
            "how costly uncertainty is."
        )
        information_mode = cast(
            InformationMode,
            st.selectbox(
                "what information is shared",
                list(INFORMATION_MODES),
                index=4,
                format_func=lambda item: INFORMATION_LABELS[item],
            ),
        )
        algorithm = cast(
            AlgorithmName,
            st.selectbox(
                "coordination rule",
                ALGORITHMS,
                format_func=lambda item: ALGORITHM_LABELS[item],
            ),
        )
    with right:
        st.markdown("**utility formulas**")
        st.caption(
            "These are dollar utility functions. Bigger is better for that participant. "
            "The formula language is intentionally small and safe."
        )
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
        algorithm=algorithm,
        information_mode=information_mode,
    )
    st.subheader("result, in one row")
    render_result_explainer()
    st.dataframe(_trace_rows([trace]), use_container_width=True, hide_index=True)
    if product_count > 1 or periods > 1:
        st.subheader("product-period plan")
        matrix = pd.DataFrame(
            run_plan_matrix(
                scenario,
                algorithm=algorithm,
                information_mode=information_mode,
            )
        )
        st.dataframe(matrix, use_container_width=True, hide_index=True)
        st.caption(
            "v1 solves product-period dimensions independently. Cross-product capacity "
            "coupling is the next formulation bridge."
        )
        st.info(
            "Read each row as one small buying decision: one product, one period, one "
            "negotiated quantity. The total plan is the collection of those rows."
        )
    st.plotly_chart(_residual_chart(trace), use_container_width=True)
    st.info(explain_trace(trace))
    st.caption(
        "Arena formulas run through an AST whitelist. Attributes, imports, indexing, "
        "and arbitrary Python execution are rejected."
    )


def render_algorithms(scenarios: list[ScenarioSpec]) -> None:
    render_tab_guide(
        "compare algorithms",
        "same scenario, different coordination rules.",
        "pick a scenario and information-sharing mode.",
        "look for utility gap vs oracle and residual. ADMM is not assumed best.",
    )
    render_metric_glossary("residual", "gap vs oracle", "global utility")
    st.markdown(
        """
This tab asks a narrow question: **does the coordination rule actually buy anything?**

The centralized oracle is the benchmark, not a realistic negotiation. The other rules
are ways to coordinate while preserving some separation between buyer and supplier.
"""
    )
    scenario = st.selectbox("scenario", scenarios, format_func=lambda item: item.name)
    mode = cast(
        InformationMode,
        st.selectbox(
            "what information is shared",
            list(INFORMATION_MODES),
            index=4,
            key="algo_mode",
            format_func=lambda item: INFORMATION_LABELS[item],
        ),
    )
    traces = run_algorithm_suite(scenario, information_mode=mode)
    df = _trace_rows(traces)
    st.dataframe(df, use_container_width=True, hide_index=True)
    st.plotly_chart(_utility_bar(df), use_container_width=True)
    st.plotly_chart(
        px.bar(df, x="algorithm", y="gap_vs_oracle", title="utility gap vs centralized oracle"),
        use_container_width=True,
    )
    st.warning(
        "Small oracle gap means the algorithm found a plan close to the benchmark. "
        "Large oracle gap means the mechanism left modeled value on the table."
    )


def render_information(scenario: ScenarioSpec) -> None:
    render_tab_guide(
        "share information",
        "what happens when the buyer and supplier reveal more of the planning picture.",
        "read the modes from private to full oracle.",
        "global utility rises only when the new information improves the plan.",
    )
    render_metric_glossary("global utility", "privacy exposure")
    st.markdown(
        """
Procurement planning often fails because each side sees only part of the problem.
The buyer knows more about demand. The supplier knows more about capacity and cost.

This tab shows the trade: sharing more information can improve the joint plan, but
it also exposes private planning details.
"""
    )
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
    st.caption(
        "The table says what each information mode reveals. It is a teaching proxy, "
        "not a privacy model."
    )
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
    render_tab_guide(
        "split the surplus",
        "after a plan is chosen, this asks who pays whom so both sides participate.",
        "change the information mode to change the negotiated plan.",
        "check the no-worse-off flags. If surplus is negative, no transfer can fix the deal.",
    )
    render_metric_glossary("surplus", "transfer", "buyer utility", "supplier utility")
    st.markdown(
        """
The best operational plan is not automatically acceptable to both sides. One side
might create most of the value while the other side bears most of the cost.

Transfers answer the participation question: **can the gains be split so both sides
are at least as well off as walking away?**
"""
    )
    mode = cast(
        InformationMode,
        st.selectbox(
            "what information is shared",
            list(INFORMATION_MODES),
            index=4,
            key="transfer_mode",
            format_func=lambda item: INFORMATION_LABELS[item],
        ),
    )
    trace = run_algorithm(scenario, algorithm="admm", information_mode=mode)
    st.write(explain_transfer(trace))
    st.caption(
        "Positive buyer transfer means supplier pays buyer. Negative buyer transfer "
        "means buyer pays supplier. The two transfers should sum to zero."
    )
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
    render_tab_guide(
        "how the math works",
        "the mechanics behind the app, written for a first pass.",
        "skim top to bottom, then return to the first tab.",
        "map each term here back to a chart or metric in the app.",
    )
    st.markdown(
        """
### the whole app in one paragraph

The app creates a toy procurement deal. Each side has a utility function, which
is just a dollar score for how much that side likes a plan. The algorithms try
to find a quantity both sides can accept. The charts show whether they agree,
how much total value the plan creates, how far it is from the best modeled plan,
and whether a transfer can make both sides willing to participate.

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

Plain version: residual is disagreement. Lower is better.

### why compare algorithms

ADMM is useful for structured distributed optimization. It is not magic. The
lab compares it to a centralized oracle, alternating best response, price-only
dual updates, and consensus averaging so users can see runtime, residuals, and
utility gaps.

Plain version: ADMM is one coordination rule. It is allowed to lose.

### certainty and long-lead planning

Long lead times convert forecasts into commitments before demand is fully known.
Firm commitments reduce supplier risk but can create buyer cancellation risk.
Soft commitments preserve option value but may fail to reserve capacity. The
right plan depends on penalties, information, and how the surplus is split.

### terms you will see in the tables

- `quantity`: units committed.
- `risk_score`: synthetic disruption/cost knob from 0 to 1.
- `buyer_utility`: buyer dollar score before transfers.
- `supplier_utility`: supplier dollar score before transfers.
- `global_utility`: buyer plus supplier utility.
- `residual`: remaining buyer/supplier disagreement in units.
- `gap_vs_oracle`: value left on the table.
- `feasible`: whether the plan violates the simple capacity/coverage checks.
"""
    )


def render_data() -> None:
    render_tab_guide(
        "data boundary",
        "what data the app uses and what it explicitly does not use.",
        "inspect the scenario YAML and evidence cards.",
        "verify this is synthetic, public-safe demo data.",
    )
    st.write("built-in scenarios are deterministic synthetic fixtures.")
    st.code(SCENARIO_PATH.read_text(encoding="utf-8")[:4000], language="yaml")
    evidence = _load_evidence()
    st.dataframe(pd.DataFrame(evidence), use_container_width=True, hide_index=True)
    st.warning(
        "No real purchase orders, supplier records, internal Amazon data, or production "
        "recommendations are included."
    )


def render_tests() -> None:
    render_tab_guide(
        "proof gates",
        "the checks that keep the demo honest.",
        "read the command and status table.",
        "green means the local repo passed the listed gate in this run.",
    )
    payload = json.loads(PROOF_PATH.read_text(encoding="utf-8"))
    st.caption(f"status: {payload['status']} - last updated: {payload['last_updated']}")
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
