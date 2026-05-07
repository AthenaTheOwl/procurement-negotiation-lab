"""Debrief generation for the story simulator."""

from __future__ import annotations

from procurement_lab.narrative.story import Beat, DecisionOption


def beat_coach_note(
    beat: Beat,
    option: DecisionOption,
    *,
    residual: float,
    gap_vs_oracle: float,
    surplus: float,
) -> str:
    """Return a FRAME/MODEL/REASON/VALIDATE style mini-debrief."""

    frame = f"Frame: {beat.learning_goal}"
    model = (
        f"Model: you chose '{option.label}', which turns into a requested "
        f"commitment and an information-sharing stance."
    )
    if residual > 120:
        reason = (
            f"Reason: residual is {residual:.0f} units, so buyer and supplier "
            "are still far apart."
        )
    elif gap_vs_oracle > 1000:
        reason = (
            f"Reason: the plan works locally but leaves ${gap_vs_oracle:,.0f} "
            "below the all-knowing benchmark."
        )
    elif surplus < 0:
        reason = (
            f"Reason: surplus is ${surplus:,.0f}; transfers cannot rescue a "
            "plan that destroys joint value."
        )
    else:
        reason = "Reason: the operational plan is close enough to discuss transfers."
    validate = (
        "Validate: compare local utilities against outside options before "
        "calling this a good deal."
    )
    declare = "Declare: a lower residual is agreement; a higher surplus is value."
    return "\n\n".join([frame, model, reason, validate, declare])


def final_debrief(decision_labels: list[str], ending_title: str) -> str:
    """Summarize the full run using the user's actual choices."""

    choices = "; ".join(decision_labels) if decision_labels else "no decisions"
    return (
        f"Ending: {ending_title}\n\n"
        f"Your path: {choices}.\n\n"
        "Update: replay once with the opposite posture. If you opened firm, try "
        "starting with a forecast band. If you shared everything, try privacy. "
        "The simulator is useful when the second run changes your belief."
    )
