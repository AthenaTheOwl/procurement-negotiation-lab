export type ArcStepId =
  | "gap"
  | "privacy"
  | "truth"
  | "admm"
  | "algorithms"
  | "author"
  | "joint-cases"
  | "cbt";

export interface ArcStep {
  id: ArcStepId;
  title: string;
  thesis: string;
  labLink: string;
}

export const arcSteps: ArcStep[] = [
  {
    id: "gap",
    title: "1. See the coordination gap",
    thesis:
      "You and the supplier can each make locally rational plans that are jointly wasteful. The gap is the money left between local JIT planning and the all-knowing oracle.",
    labLink: "Open the same scenario in Lab and inspect the so-what panel.",
  },
  {
    id: "privacy",
    title: "2. Price the cost of privacy",
    thesis:
      "More information usually improves the plan, but it also exposes bargaining posture. A coordination rule needs enough signal to move the plan before disclosure costs more than the welfare it creates.",
    labLink: "Use the information-mode sweep in Lab.",
  },
  {
    id: "truth",
    title: "3. Make truthful behavior attractive",
    thesis:
      "VCG is useful because it changes incentives. If the transfer prices each party's externality, truthful local optimization becomes the strategy to beat.",
    labLink: "Compare price-only coordination against CPP plus VCG/CBT.",
  },
  {
    id: "admm",
    title: "4. Watch CPP/ADMM coordinate agents",
    thesis:
      "CPP turns private objectives into an iterative protocol. Agents send best responses, the coordinator updates the consensus plan, and residuals show disagreement shrinking.",
    labLink: "Inspect the ADMM row and residual behavior.",
  },
  {
    id: "algorithms",
    title: "5. Compare convergence paths",
    thesis:
      "ADMM is not automatically best. Alternating response, price-only signals, and averaging can win on clarity or runtime while losing on welfare.",
    labLink: "Run the mechanism comparison table.",
  },
  {
    id: "author",
    title: "6. Author your own agent",
    thesis:
      "A mechanism is only as good as the objectives it coordinates. Write a utility formula, adjust the scenario, and see whether the payoff logic behaves as intended.",
    labLink: "Bring the authored formula into Lab after this step.",
  },
  {
    id: "joint-cases",
    title: "7. Test joint-optimality cases",
    thesis:
      "Sometimes a joint optimum exists and the update rule finds it. Sometimes it exists and the update rule bounces. Sometimes there is no surplus to split.",
    labLink: "Switch among the three seeded joint-optimality scenarios.",
  },
  {
    id: "cbt",
    title: "8. Split the surplus with CBT",
    thesis:
      "CBT is the money layer after the physical plan. It can keep both parties no worse off only when the operational plan creates enough surplus.",
    labLink: "Open the transfer ledger and change the split rule.",
  },
];
