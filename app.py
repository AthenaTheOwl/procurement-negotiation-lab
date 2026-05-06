from __future__ import annotations

import json
from pathlib import Path
from typing import Any, TypedDict, cast

import pandas as pd
import plotly.express as px
import streamlit as st

from procurement_lab.algorithms import run_algorithm, run_algorithm_suite
from procurement_lab.cbt import compute_transfer
from procurement_lab.defaults import BUYER_FORMULA, SUPPLIER_FORMULA, build_default_scenario
from procurement_lab.formula_engine import FormulaError, compile_formula
from procurement_lab.formulations import run_plan_matrix
from procurement_lab.information_modes import INFORMATION_MODES, information_profile
from procurement_lab.scenario_loader import ScenarioSpec, load_scenarios, scenario_to_context
from procurement_lab.trace_schema import AlgorithmName, CoordinationTrace, InformationMode
from procurement_lab.utility_accounting import ledger_for_quantity

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
    "admm": "ADMM: agents make local choices, then a shared signal pulls them together",
    "centralized_oracle": "oracle: all private data is visible to one central planner",
    "alternating_best_response": "best response: each side reacts to the other side's last move",
    "price_only_dual": "price signal: coordination happens through a moving shadow price",
    "consensus_averaging": "averaging: simple baseline, no real economics in the update",
}

INFORMATION_LABELS: dict[InformationMode, str] = {
    "private": "private: both sides guess what the other side knows",
    "risk_only": "risk only: both sides see the same synthetic risk score",
    "capacity_band": "capacity band: supplier reveals rough capacity",
    "cost_band": "cost band: supplier reveals rough costs too",
    "forecast_band": "forecast band: buyer reveals rough demand",
    "full_oracle": "full oracle: all modeled data is shared",
}

COMMITMENT_MULTIPLIERS: dict[str, float] = {
    "forecast": 0.96,
    "soft": 1.00,
    "firm": 1.04,
    "option": 0.98,
}


class GuidedRound(TypedDict):
    title: str
    situation: str
    decision: str
    supplier_context: str
    coach: str
    default_multiplier: float
    information_mode: InformationMode
    commitment_type: str


class GuidedResult(TypedDict):
    your_quantity: float
    supplier_quantity: float
    consensus_quantity: float
    residual: float
    buyer_utility: float
    supplier_utility: float
    global_utility: float
    surplus: float
    transfer_to_buyer: float
    buyer_after_transfer: float
    supplier_after_transfer: float
    feasible_transfer: bool
    gap_vs_oracle: float
    oracle_quantity: float
    privacy_exposure: float
    shared_fields: str
    coach_note: str


GUIDED_ROUNDS: tuple[GuidedRound, ...] = (
    {
        "title": "round 1 - make the first reservation",
        "situation": (
            "You are the buyer. Demand is not final, but a long-lead component has to "
            "be reserved now or the launch may miss supply."
        ),
        "decision": (
            "Choose how many units to ask the supplier to reserve. Too low creates "
            "shortage risk. Too high makes the supplier hold capacity you may not use."
        ),
        "supplier_context": (
            "The supplier sees its capacity and cost pressure, but it does not fully "
            "trust your demand forecast yet."
        ),
        "coach": (
            "This round is about the basic tension: you want protection; the supplier "
            "wants commitment before spending scarce capacity."
        ),
        "default_multiplier": 0.85,
        "information_mode": "private",
        "commitment_type": "forecast",
    },
    {
        "title": "round 2 - reveal risk, not capacity",
        "situation": (
            "A risk note arrives. Both sides agree the supplier has some disruption "
            "exposure, but exact capacity is still private."
        ),
        "decision": (
            "Decide whether to hold your quantity steady or move closer to the "
            "supplier's capacity concern."
        ),
        "supplier_context": (
            "The supplier now knows you see the same risk signal, but it still wants "
            "to avoid a hard overcommitment."
        ),
        "coach": (
            "Risk score is a toy 0-to-1 disruption knob. It is not a real supplier "
            "rating. It just lets the simulator make uncertainty visible."
        ),
        "default_multiplier": 0.95,
        "information_mode": "risk_only",
        "commitment_type": "soft",
    },
    {
        "title": "round 3 - capacity band",
        "situation": (
            "The supplier shares a rough capacity band. You still do not see exact "
            "cost, but you know where a commitment starts to strain the operation."
        ),
        "decision": (
            "Choose whether to push for more coverage or respect the capacity band."
        ),
        "supplier_context": (
            "Sharing a band helps the buyer avoid impossible asks without exposing "
            "the supplier's full economics."
        ),
        "coach": (
            "This is the first real value-of-information moment: better information "
            "can reduce wasted negotiation, but it also exposes private facts."
        ),
        "default_multiplier": 1.02,
        "information_mode": "capacity_band",
        "commitment_type": "soft",
    },
    {
        "title": "round 4 - forecast band",
        "situation": (
            "You share a forecast band. The supplier can now plan against a demand "
            "range instead of guessing from your opening ask."
        ),
        "decision": (
            "Pick a commitment that balances service level, capacity stress, and "
            "cancellation exposure."
        ),
        "supplier_context": (
            "The supplier can justify reserving more capacity when it sees a demand "
            "band and not just a number in an email."
        ),
        "coach": (
            "Long-lead planning is hard because certainty decays over time. A band "
            "is often more honest than a point forecast."
        ),
        "default_multiplier": 1.05,
        "information_mode": "forecast_band",
        "commitment_type": "firm",
    },
    {
        "title": "round 5 - split the surplus",
        "situation": (
            "The operational quantity is close. Now the question is whether the "
            "money split makes both parties willing to sign."
        ),
        "decision": (
            "Choose a final commitment and inspect whether a cost-benefit transfer "
            "can make both sides no worse off than walking away."
        ),
        "supplier_context": (
            "A good joint plan can still fail if one side captures the gains and the "
            "other side absorbs the risk."
        ),
        "coach": (
            "CBT happens after the operational plan. First choose the quantity. Then "
            "move dollars so both sides can accept it."
        ),
        "default_multiplier": 1.00,
        "information_mode": "forecast_band",
        "commitment_type": "firm",
    },
    {
        "title": "round 6 - compare against the all-knowing benchmark",
        "situation": (
            "You have played the negotiation. Now compare it to the oracle: the best "
            "modeled plan if all private information were visible at once."
        ),
        "decision": (
            "Run the same decision against several algorithms and ask what each one "
            "left on the table."
        ),
        "supplier_context": (
            "The point is not that ADMM always wins. The point is to see when "
            "coordination rules help, and when a simpler rule is enough."
        ),
        "coach": (
            "The simulator is useful only if it can surprise you. If ADMM is not best "
            "on a scenario, the app should show that, not hide it."
        ),
        "default_multiplier": 1.00,
        "information_mode": "full_oracle",
        "commitment_type": "firm",
    },
)

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


def main() -> None:
    scenarios = _load_scenarios()
    render_shell()
    mode = st.sidebar.radio(
        "choose surface",
        ["Guided walkthrough", "Lab mode", "Reference"],
        help="Guided walkthrough is the handheld simulator. Lab mode is the sandbox.",
    )

    if mode == "Guided walkthrough":
        render_guided_walkthrough(scenarios)
    elif mode == "Lab mode":
        render_lab_mode(scenarios)
    else:
        render_reference(scenarios)


def render_shell() -> None:
    st.title("procurement negotiation lab")
    st.caption("a model-driven learning simulator for long-lead buying commitments")
    st.info(
        "**Your role:** you are the buyer / procurement planner. You need capacity "
        "reserved before demand is certain. The app plays the supplier, records each "
        "round, and shows whether coordination created value."
    )

    with st.sidebar:
        st.markdown("### what this app is")
        st.markdown(
            """
This is closer to a management flight simulator than a dashboard.

You make a procurement decision. The supplier responds. The model shows the
consequence in dollars, disagreement, and welfare.
"""
        )
        st.markdown("### tiny glossary")
        st.markdown(
            """
- **utility:** dollar score for one side. Bigger is better.
- **global utility:** buyer utility plus supplier utility.
- **residual:** disagreement left in units.
- **risk score:** synthetic disruption knob from 0 to 1.
- **oracle:** all-knowing benchmark, not a real actor.
- **CBT:** cost-benefit transfer after the plan.
"""
        )


def render_guided_walkthrough(scenarios: list[ScenarioSpec]) -> None:
    scenario = _scenario_picker(scenarios, key="guided_scenario")
    _ensure_guided_state()
    round_number = int(st.session_state.guided_round)
    round_index = min(round_number, len(GUIDED_ROUNDS) - 1)
    guided_round = GUIDED_ROUNDS[round_index]

    st.header("Guided walkthrough")
    st.markdown(
        """
You are the buyer / procurement planner.

Make one decision, advance one round, then read the consequence. The goal is not
to memorize vocabulary. The goal is to feel the coordination problem.
"""
    )
    st.progress((round_index + 1) / len(GUIDED_ROUNDS))
    st.caption(f"round {round_index + 1} of {len(GUIDED_ROUNDS)}")

    render_round_story(scenario, guided_round)
    quantity = render_round_controls(scenario, guided_round, round_index)
    information_mode = cast(InformationMode, st.session_state.guided_information_mode)
    commitment_type = str(st.session_state.guided_commitment_type)
    result = simulate_guided_decision(
        scenario,
        quantity=quantity,
        information_mode=information_mode,
        commitment_type=commitment_type,
    )

    render_round_consequence(result, preview=True)
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("advance one round", type="primary"):
            append_guided_history(round_index, guided_round, result)
            st.session_state.guided_round = min(round_index + 1, len(GUIDED_ROUNDS) - 1)
            st.rerun()
    with col2:
        if st.button("reset walkthrough"):
            st.session_state.guided_round = 0
            st.session_state.guided_history = []
            st.rerun()
    with col3:
        st.caption(
            "advancing saves this decision to the run history. resetting clears the "
            "run but not the scenario."
        )

    render_guided_history()

    st.markdown(
        """
**why this is modeled like a game:** the decision creates the data. The debrief
is where the learning happens.
"""
    )
    with st.expander("why this is modeled like a game"):
        st.markdown(
            """
The Beer Game works because a player experiences the delay and then sees the
system consequence. This walkthrough uses the same teaching shape:

1. **role:** you are the buyer.
2. **round:** one planning moment.
3. **decision:** quantity, information, commitment type.
4. **consequence:** supplier response, residual, utility, surplus.
5. **debrief:** coach note and history chart.

The app is deliberately small. The lesson is not "trust this procurement model."
The lesson is that hidden information, long lead times, and incentives can make
reasonable people produce a bad shared plan.
"""
        )


def render_round_story(scenario: ScenarioSpec, guided_round: GuidedRound) -> None:
    product = scenario.products[0]
    supplier = scenario.suppliers[0]
    cols = st.columns(3)
    with cols[0]:
        st.subheader(guided_round["title"])
        st.markdown(f"**your situation**\n\n{guided_round['situation']}")
        st.markdown(f"**your decision**\n\n{guided_round['decision']}")
    with cols[1]:
        st.markdown("**what the supplier sees**")
        st.markdown(guided_round["supplier_context"])
        st.markdown("**current component**")
        st.write(
            {
                "component": product.name,
                "expected demand": round(product.demand_mean, 1),
                "lead time weeks": product.lead_time_weeks,
                "supplier capacity": round(supplier.capacity, 1),
            }
        )
    with cols[2]:
        st.markdown("**coach note**")
        st.markdown(guided_round["coach"])
        st.markdown("**plain words**")
        st.markdown(
            """
- **risk score** is a fake 0-to-1 stress knob.
- **residual** is how far buyer and supplier are apart.
- **utility** is the dollar score after costs and penalties.
"""
        )


def render_round_controls(
    scenario: ScenarioSpec, guided_round: GuidedRound, round_index: int
) -> float:
    product = scenario.products[0]
    supplier = scenario.suppliers[0]
    default_quantity = product.demand_mean * guided_round["default_multiplier"]
    upper = max(product.demand_mean * 1.45, supplier.capacity * 1.2)
    st.markdown("### choose this round's move")
    cols = st.columns(3)
    with cols[0]:
        quantity = st.slider(
            "your requested commitment quantity",
            min_value=0.0,
            max_value=float(round(upper, 1)),
            value=float(round(default_quantity, 1)),
            step=1.0,
            help=(
                "You are asking the supplier to reserve this many units. The model "
                "will compare it to what the supplier wants to commit."
            ),
        )
    with cols[1]:
        default_info = INFORMATION_MODES.index(guided_round["information_mode"])
        information_mode = st.selectbox(
            "information shared this round",
            INFORMATION_MODES,
            index=default_info,
            format_func=lambda value: INFORMATION_LABELS[value],
            key=f"guided_info_{round_index}",
            help="More information can improve the plan, but it exposes private facts.",
        )
        st.session_state.guided_information_mode = information_mode
    with cols[2]:
        commitment_options = ["forecast", "soft", "firm", "option"]
        default_commit = commitment_options.index(guided_round["commitment_type"])
        commitment_type = st.radio(
            "commitment type",
            commitment_options,
            index=default_commit,
            horizontal=True,
            key=f"guided_commitment_{round_index}",
            help=(
                "Forecast is weakest. Firm is strongest. Stronger commitment makes "
                "capacity reservation more credible, but raises cancellation exposure."
            ),
        )
        st.session_state.guided_commitment_type = commitment_type
    return float(quantity)


def simulate_guided_decision(
    scenario: ScenarioSpec,
    *,
    quantity: float,
    information_mode: InformationMode,
    commitment_type: str,
) -> GuidedResult:
    trace = run_algorithm(scenario, algorithm="admm", information_mode=information_mode)
    oracle = run_algorithm(scenario, algorithm="centralized_oracle", information_mode="full_oracle")
    final_iteration = trace.iterations[-1]
    supplier_quantity = final_iteration.supplier_quantity
    midpoint = (quantity + supplier_quantity) / 2.0
    consensus = max(0.0, midpoint * COMMITMENT_MULTIPLIERS.get(commitment_type, 1.0))
    ledger = ledger_for_quantity(scenario, quantity=consensus)
    transfer = compute_transfer(ledger)
    profile = information_profile(information_mode, scenario_to_context(scenario, quantity=0.0))
    residual = abs(quantity - supplier_quantity)
    gap = oracle.ledger.global_utility - ledger.global_utility
    return {
        "your_quantity": quantity,
        "supplier_quantity": supplier_quantity,
        "consensus_quantity": consensus,
        "residual": residual,
        "buyer_utility": ledger.buyer_utility,
        "supplier_utility": ledger.supplier_utility,
        "global_utility": ledger.global_utility,
        "surplus": transfer.surplus,
        "transfer_to_buyer": transfer.buyer_transfer,
        "buyer_after_transfer": transfer.buyer_after_transfer,
        "supplier_after_transfer": transfer.supplier_after_transfer,
        "feasible_transfer": transfer.feasible
        and transfer.buyer_no_worse_off
        and transfer.supplier_no_worse_off,
        "gap_vs_oracle": gap,
        "oracle_quantity": oracle.ledger.quantity,
        "privacy_exposure": profile.privacy_exposure,
        "shared_fields": ", ".join(profile.shared_fields) if profile.shared_fields else "none",
        "coach_note": coach_for_result(
            residual=residual,
            surplus=transfer.surplus,
            gap=gap,
        ),
    }


def coach_for_result(*, residual: float, surplus: float, gap: float) -> str:
    if surplus < 0:
        return (
            "The plan destroys modeled value. A transfer cannot fix a bad quantity. "
            "Change the commitment first."
        )
    if residual > 20:
        return (
            "Buyer and supplier are still far apart. This is what residual means: "
            "unresolved disagreement in units."
        )
    if gap > 600:
        return (
            "The deal works, but it leaves a lot below the oracle. More information "
            "or a different algorithm may buy a better joint plan."
        )
    return (
        "The plan is close enough to be discussable. Now inspect whether the surplus "
        "split keeps both sides no worse off."
    )


def render_round_consequence(result: GuidedResult, *, preview: bool) -> None:
    heading = "what would happen if you advanced now" if preview else "saved consequence"
    st.markdown(f"### {heading}")
    cols = st.columns(5)
    cols[0].metric("your ask", f"{result['your_quantity']:.0f} units")
    cols[1].metric("supplier response", f"{result['supplier_quantity']:.0f} units")
    cols[2].metric("residual", f"{result['residual']:.1f} units")
    cols[3].metric("global utility", _money(result["global_utility"]))
    cols[4].metric("gap vs oracle", _money(result["gap_vs_oracle"]))

    detail_cols = st.columns(2)
    with detail_cols[0]:
        st.markdown("**how to read this**")
        st.markdown(
            f"""
- The model averages your ask and the supplier response into a working plan:
  **{result["consensus_quantity"]:.1f} units**.
- The oracle would pick **{result["oracle_quantity"]:.1f} units** if all modeled
  information were visible to one planner.
- Privacy exposure is **{result["privacy_exposure"]:.0%}** because shared fields are:
  **{result["shared_fields"]}**.
"""
        )
    with detail_cols[1]:
        st.markdown("**coach note**")
        st.markdown(result["coach_note"])
        st.markdown(
            f"""
After transfers:

- buyer: **{_money(result["buyer_after_transfer"])}**
- supplier: **{_money(result["supplier_after_transfer"])}**
- no-worse-off transfer works: **{result["feasible_transfer"]}**
"""
        )


def append_guided_history(
    round_index: int, guided_round: GuidedRound, result: GuidedResult
) -> None:
    history = cast(list[dict[str, Any]], st.session_state.guided_history)
    history.append(
        {
            "round": round_index + 1,
            "step": guided_round["title"],
            "your_quantity": round(result["your_quantity"], 2),
            "supplier_quantity": round(result["supplier_quantity"], 2),
            "plan_quantity": round(result["consensus_quantity"], 2),
            "residual": round(result["residual"], 2),
            "global_utility": round(result["global_utility"], 2),
            "surplus": round(result["surplus"], 2),
            "gap_vs_oracle": round(result["gap_vs_oracle"], 2),
        }
    )
    st.session_state.guided_history = history


def render_guided_history() -> None:
    history = cast(list[dict[str, Any]], st.session_state.guided_history)
    st.markdown("### run history")
    if not history:
        st.markdown(
            "No saved rounds yet. Use **advance one round** to turn the preview into "
            "a recorded decision."
        )
        return
    frame = pd.DataFrame(history)
    st.dataframe(frame, use_container_width=True, hide_index=True)
    quantity_frame = frame.melt(
        id_vars=["round"],
        value_vars=["your_quantity", "supplier_quantity", "plan_quantity"],
        var_name="series",
        value_name="quantity",
    )
    st.plotly_chart(
        px.line(
            quantity_frame,
            x="round",
            y="quantity",
            color="series",
            markers=True,
            title="buyer ask vs supplier response vs working plan",
        ),
        use_container_width=True,
    )
    st.plotly_chart(
        px.bar(
            frame,
            x="round",
            y=["global_utility", "surplus", "gap_vs_oracle"],
            barmode="group",
            title="value, surplus, and value left on the table",
        ),
        use_container_width=True,
    )


def render_lab_mode(scenarios: list[ScenarioSpec]) -> None:
    st.header("Lab mode")
    st.markdown(
        """
This is the sandbox. Change the scenario, formulas, participants, products,
periods, information mode, and algorithm. The app fills reasonable defaults so
you can explore without specifying every parameter.
"""
    )
    scenario = _scenario_picker(scenarios, key="lab_scenario")
    lab_tabs = st.tabs(["arena", "algorithms", "information", "transfers", "formulas"])
    with lab_tabs[0]:
        render_arena()
    with lab_tabs[1]:
        render_algorithm_comparison(scenario)
    with lab_tabs[2]:
        render_information_comparison(scenario)
    with lab_tabs[3]:
        render_transfer_view(scenario)
    with lab_tabs[4]:
        render_formula_editor()


def render_arena() -> None:
    st.subheader("arena: build a small procurement world")
    st.markdown(
        """
Minimum inputs are enough. A generated scenario is not meant to be realistic; it
is a controlled experiment. Add products and periods when you want to test
whether a coordination rule still works as the problem gets larger.
"""
    )
    cols = st.columns(4)
    with cols[0]:
        product_count = st.number_input("products", 1, 5, 2)
    with cols[1]:
        periods = st.number_input("planning periods", 1, 8, 3)
    with cols[2]:
        participant_count = st.number_input("participants", 2, 5, 2)
    with cols[3]:
        risk_score = st.slider(
            "risk score",
            0.0,
            1.0,
            0.35,
            help="Synthetic 0-to-1 disruption knob. Not a real supplier rating.",
        )
    algorithm = st.selectbox(
        "coordination algorithm",
        ALGORITHMS,
        format_func=lambda value: ALGORITHM_LABELS[value],
    )
    information_mode = st.selectbox(
        "information mode",
        INFORMATION_MODES,
        index=INFORMATION_MODES.index("forecast_band"),
        format_func=lambda value: INFORMATION_LABELS[value],
    )
    generated = build_default_scenario(
        product_count=int(product_count),
        periods=int(periods),
        participant_count=int(participant_count),
        risk_score=float(risk_score),
    )
    rows = run_plan_matrix(
        generated,
        algorithm=cast(AlgorithmName, algorithm),
        information_mode=cast(InformationMode, information_mode),
    )
    frame = pd.DataFrame(rows)
    st.markdown("**how to read the result table**")
    st.markdown(
        """
Each row is one product in one period. Quantity is the chosen commitment.
Residual is remaining disagreement. Global utility is the total dollar value in
the toy model. Feasible means the quantity passed the simple capacity checks.
"""
    )
    st.dataframe(frame, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.bar(
            frame,
            x="period",
            y="global_utility",
            color="product",
            title="global utility by product and planning period",
        ),
        use_container_width=True,
    )


def render_algorithm_comparison(scenario: ScenarioSpec) -> None:
    st.subheader("algorithm comparison")
    st.markdown(
        """
This tab is where ADMM has to earn its keep. The oracle is the benchmark. The
other algorithms are coordination rules. Faster is not always better; closer to
the oracle is not always worth the privacy cost.
"""
    )
    information_mode = st.selectbox(
        "information mode for comparison",
        INFORMATION_MODES,
        index=INFORMATION_MODES.index("forecast_band"),
        format_func=lambda value: INFORMATION_LABELS[value],
        key="algorithm_info",
    )
    traces = run_algorithm_suite(scenario, information_mode=cast(InformationMode, information_mode))
    frame = _trace_rows(traces)
    st.dataframe(frame, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.scatter(
            frame,
            x="iterations",
            y="gap_vs_oracle",
            size="residual",
            color="algorithm",
            title="speed vs value left on the table",
        ),
        use_container_width=True,
    )
    selected = st.selectbox(
        "inspect iteration trace",
        [trace.algorithm for trace in traces],
        key="trace_picker",
    )
    trace = next(item for item in traces if item.algorithm == selected)
    render_trace_explanation(trace)


def render_information_comparison(scenario: ScenarioSpec) -> None:
    st.subheader("information value")
    st.markdown(
        """
Better information buys two things: a better joint plan and fewer wasted
rounds. It also exposes private facts. The useful question is not "share
everything?" It is "what small disclosure buys the most value?"
"""
    )
    rows: list[dict[str, float | str]] = []
    for mode in INFORMATION_MODES:
        trace = run_algorithm(scenario, algorithm="admm", information_mode=mode)
        profile = information_profile(mode, scenario_to_context(scenario, quantity=0.0))
        rows.append(
            {
                "mode": mode,
                "global_utility": round(trace.ledger.global_utility, 2),
                "gap_vs_oracle": round(trace.metrics.utility_gap_vs_oracle, 2),
                "residual": round(trace.metrics.residual, 2),
                "privacy_exposure": profile.privacy_exposure,
                "shared_fields": ", ".join(profile.shared_fields) or "none",
            }
        )
    frame = pd.DataFrame(rows)
    st.dataframe(frame, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.line(
            frame,
            x="privacy_exposure",
            y="global_utility",
            text="mode",
            markers=True,
            title="value of information: utility gained vs privacy exposed",
        ),
        use_container_width=True,
    )


def render_transfer_view(scenario: ScenarioSpec) -> None:
    st.subheader("transfers and no-worse-off checks")
    st.markdown(
        """
The operational plan chooses a quantity. The transfer decides who captures the
surplus. This matters because a globally good plan can still be rejected if one
party is worse off than walking away.
"""
    )
    quantity = st.slider(
        "operational quantity to test",
        min_value=0.0,
        max_value=float(scenario.suppliers[0].capacity * 1.25),
        value=float(scenario.products[0].demand_mean),
        step=1.0,
    )
    ledger = ledger_for_quantity(scenario, quantity=float(quantity))
    transfer = compute_transfer(ledger)
    cols = st.columns(5)
    cols[0].metric("buyer utility", _money(ledger.buyer_utility))
    cols[1].metric("supplier utility", _money(ledger.supplier_utility))
    cols[2].metric("global utility", _money(ledger.global_utility))
    cols[3].metric("surplus", _money(transfer.surplus))
    cols[4].metric("transfer feasible", str(transfer.feasible))
    st.markdown(
        f"""
**no-worse-off proof**

- buyer outside option: **{_money(ledger.buyer_outside_option)}**
- buyer after transfer: **{_money(transfer.buyer_after_transfer)}**
- supplier outside option: **{_money(ledger.supplier_outside_option)}**
- supplier after transfer: **{_money(transfer.supplier_after_transfer)}**

If either after-transfer value is below its outside option, the deal should not
be described as mutually acceptable.
"""
    )


def render_formula_editor() -> None:
    st.subheader("formula editor")
    st.markdown(
        """
These are utility functions. A utility function converts a plan into a dollar
score. The lab allows math, not Python. No imports, attributes, indexing,
comprehensions, or arbitrary code.
"""
    )
    cols = st.columns(2)
    with cols[0]:
        buyer_formula = st.text_area("buyer utility function", BUYER_FORMULA, height=170)
    with cols[1]:
        supplier_formula = st.text_area("supplier utility function", SUPPLIER_FORMULA, height=170)
    for label, formula in [("buyer", buyer_formula), ("supplier", supplier_formula)]:
        try:
            compile_formula(formula)
        except FormulaError as exc:
            st.error(f"{label} formula rejected: {exc}")
        else:
            st.success(f"{label} formula accepted by the safe math parser")
    st.markdown(
        """
Available variables: `quantity`, `demand`, `demand_sigma`, `price`,
`unit_value`, `unit_cost`, `capacity`, `risk_score`, `shortage_penalty`,
`holding_cost`, `cancellation_penalty`, `risk_penalty`, `lead_time_weeks`,
`period`, `periods`, `uncertainty`.
"""
    )


def render_reference(scenarios: list[ScenarioSpec]) -> None:
    st.header("Reference")
    tabs = st.tabs(["tutorial", "data", "proof gates", "evidence"])
    with tabs[0]:
        render_tutorial()
    with tabs[1]:
        render_data_reference(scenarios)
    with tabs[2]:
        render_tests()
    with tabs[3]:
        render_evidence()


def render_tutorial() -> None:
    st.subheader("tutorial: the model in plain English")
    st.markdown(
        """
### 1. objective functions

Each participant has a utility function. It turns a proposed quantity into a
dollar score. The buyer likes covered demand and dislikes shortages, excess
inventory, purchase cost, and risk. The supplier likes profitable committed
volume and dislikes over-capacity stress, cancellation exposure, and risk.

### 2. why long-lead planning is different

Short lead time means you can wait. Long lead time means you commit before
demand is certain. Certainty decays with time: a 24-week forecast is wider than
a 4-week forecast. That is why the app uses bands and penalties instead of one
perfect number.

### 3. what ADMM is doing

The buyer solves its local problem. The supplier solves its local problem. A
coordination signal pushes both toward one shared quantity. The residual is the
distance left between them. Residual going down means the agents are converging.

### 4. why compare algorithms

ADMM is useful for distributed optimization, but it is not magic. A simple
averaging rule can be enough on easy cases. A centralized oracle can be best
when privacy is irrelevant. The point of the lab is comparison, not worship.

### 5. what CBT means

Cost-benefit transfer is a money movement after the operational plan. It asks:
did the plan create enough surplus to make both parties no worse off than their
outside option? If not, the app says no instead of pretending every deal works.
"""
    )


def render_data_reference(scenarios: list[ScenarioSpec]) -> None:
    st.subheader("synthetic data boundary")
    st.markdown(
        """
The app uses deterministic synthetic scenarios in the repo. It does not pull
private procurement data, Amazon data, live supplier data, or real risk scores.

The synthetic fields mimic common procurement ideas: demand, uncertainty,
capacity, lead time, risk, penalties, outside options, and utility formulas.
They are generated so tests are repeatable and the hosted demo has fallback
data even without network access.
"""
    )
    scenario = _scenario_picker(scenarios, key="data_scenario")
    st.json(scenario.model_dump(mode="json"))


def render_tests() -> None:
    st.subheader("proof gates")
    if not PROOF_PATH.exists():
        st.warning("ops/proof_gates.json not found yet.")
        return
    proof = json.loads(PROOF_PATH.read_text(encoding="utf-8"))
    rows = [
        {"gate": key, "status": value.get("status", "unknown"), "detail": value.get("detail", "")}
        for key, value in proof.items()
    ]
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    st.markdown(
        """
These checks are here so the public demo does not become a hand-waved toy:
formula safety, scenario validation, property tests, app smoke tests, and
security scans all have visible status.
"""
    )


def render_evidence() -> None:
    st.subheader("fallback evidence")
    st.markdown(
        """
Evidence rows are static and synthetic/public-style. They exist so the simulator
can show how a planning fact would be cited without depending on a live RAG
service.
"""
    )
    st.dataframe(pd.DataFrame(_load_evidence()), use_container_width=True, hide_index=True)


def render_trace_explanation(trace: CoordinationTrace) -> None:
    st.markdown("### iteration trace")
    st.markdown(
        """
Each iteration is one negotiation update. Buyer quantity is the buyer's local
answer. Supplier quantity is the supplier's local answer. Consensus quantity is
the working shared plan. Residual is unresolved disagreement in units.
"""
    )
    frame = pd.DataFrame([row.model_dump() for row in trace.iterations])
    st.dataframe(frame, use_container_width=True, hide_index=True)
    st.plotly_chart(
        px.line(
            frame,
            x="iteration",
            y=["buyer_quantity", "supplier_quantity", "consensus_quantity", "residual"],
            markers=True,
            title=f"{trace.algorithm} convergence trace",
        ),
        use_container_width=True,
    )


def _trace_rows(traces: list[CoordinationTrace]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "algorithm": trace.algorithm,
                "information": trace.information_mode,
                "quantity": round(trace.ledger.quantity, 2),
                "global_utility": round(trace.ledger.global_utility, 2),
                "buyer_utility": round(trace.ledger.buyer_utility, 2),
                "supplier_utility": round(trace.ledger.supplier_utility, 2),
                "iterations": trace.metrics.iterations,
                "residual": round(trace.metrics.residual, 2),
                "gap_vs_oracle": round(trace.metrics.utility_gap_vs_oracle, 2),
                "runtime_ms": round(trace.metrics.runtime_ms, 2),
                "feasible": trace.ledger.feasible,
            }
            for trace in traces
        ]
    )


def _scenario_picker(scenarios: list[ScenarioSpec], *, key: str) -> ScenarioSpec:
    selected = st.selectbox(
        "scenario",
        scenarios,
        index=0,
        format_func=lambda scenario: scenario.name,
        key=key,
    )
    return cast(ScenarioSpec, selected)


def _ensure_guided_state() -> None:
    if "guided_round" not in st.session_state:
        st.session_state.guided_round = 0
    if "guided_history" not in st.session_state:
        st.session_state.guided_history = []
    if "guided_information_mode" not in st.session_state:
        st.session_state.guided_information_mode = "private"
    if "guided_commitment_type" not in st.session_state:
        st.session_state.guided_commitment_type = "forecast"


def _money(value: float) -> str:
    return f"${value:,.0f}"


if __name__ == "__main__":
    main()
