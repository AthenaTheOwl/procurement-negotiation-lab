export const glossary: Record<string, string> = {
  utility:
    "Utility is a dollar-like score for how good the plan is for one party after value, cost, shortage, excess, and risk are counted.",
  residual:
    "Residual is disagreement. If the buyer wants 600 units and the supplier is comfortable with 500, the residual is 100 units.",
  "risk score":
    "Risk score is a synthetic uncertainty knob in this demo. Higher risk means long lead times, qualification friction, or supply shocks are more likely to hurt the plan.",
  "oracle gap":
    "Oracle gap is how much value the current plan leaves behind compared with an all-knowing centralized planner. It is a benchmark, not a realistic negotiation rule.",
  ADMM:
    "ADMM is a coordination method where each party solves its local problem, exchanges a small signal, and repeats until the plans agree closely enough.",
  CBT:
    "CBT means cost-benefit transfer. First pick the physical plan, then move money so the parties sharing the burden are no worse off.",
  "information mode":
    "Information mode controls what parties reveal: nothing, risk only, rough capacity, rough cost, forecast bands, or the full oracle view.",
  "no worse off":
    "No worse off means each party does at least as well as its outside option after transfers. If that cannot be proven, the app refuses to call the deal a win.",
  "long-lead planning":
    "Long-lead planning means decisions must be made before demand is certain. Waiting can be expensive because capacity disappears before the forecast settles.",
};

export const termOrder = [
  "utility",
  "residual",
  "risk score",
  "oracle gap",
  "ADMM",
  "CBT",
  "information mode",
  "no worse off",
  "long-lead planning",
] as const;
