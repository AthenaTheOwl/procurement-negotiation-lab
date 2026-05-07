import type {
  AlgorithmId,
  AlgorithmResult,
  Beat,
  Choice,
  InfoMode,
  LabScenario,
  RoundResult,
  ScoreState,
} from "./types";

export const initialScores: ScoreState = {
  relationship: 0,
  coverageRisk: 1.8,
  budgetPressure: 1.0,
  privacyShared: 0.05,
};

const infoQuality: Record<InfoMode, number> = {
  private: 0.12,
  "risk-only": 0.28,
  "capacity-band": 0.44,
  "cost-band": 0.54,
  "forecast-band": 0.68,
  "full-oracle": 1.0,
};

const privacyExposure: Record<InfoMode, number> = {
  private: 0.04,
  "risk-only": 0.14,
  "capacity-band": 0.28,
  "cost-band": 0.36,
  "forecast-band": 0.48,
  "full-oracle": 0.86,
};

const infoLabels: Record<InfoMode, string> = {
  private: "private",
  "risk-only": "risk only",
  "capacity-band": "capacity band",
  "cost-band": "cost band",
  "forecast-band": "forecast band",
  "full-oracle": "full oracle",
};

export function infoModeLabel(mode: InfoMode): string {
  return infoLabels[mode];
}

export function scoreAfterChoice(scores: ScoreState, choice: Choice): ScoreState {
  return {
    relationship: clamp(scores.relationship + choice.relationshipDelta, -6, 8),
    coverageRisk: clamp(scores.coverageRisk + choice.coverageRiskDelta, 0, 4.5),
    budgetPressure: clamp(scores.budgetPressure + choice.budgetPressureDelta, 0, 5),
    privacyShared: clamp(
      scores.privacyShared + choice.privacyDelta + privacyExposure[choice.infoMode] * 0.1,
      0,
      1,
    ),
  };
}

export function evaluateRound(
  beat: Beat,
  choice: Choice,
  previousScores: ScoreState,
): RoundResult {
  const nextScores = scoreAfterChoice(previousScores, choice);
  const demand = 500;
  const buyerAsk = Math.round(demand * choice.quantityMultiplier);
  const supplierComfort = supplierComfortQuantity(choice, previousScores);
  const settledQuantity = Math.round((buyerAsk * 0.52 + supplierComfort * 0.48) / 5) * 5;
  const residual = Math.abs(buyerAsk - supplierComfort);
  const buyerUtility = buyerUtilityFor(settledQuantity, nextScores);
  const supplierUtility = supplierUtilityFor(settledQuantity, nextScores);
  const globalUtility = buyerUtility + supplierUtility;
  const oracleUtility = oracleUtilityFor(nextScores, choice.infoMode);
  const oracleGap = Math.max(0, oracleUtility - globalUtility);
  const outsideBuyer = 8400;
  const outsideSupplier = 5200;
  const surplus = globalUtility - outsideBuyer - outsideSupplier;
  const transferFeasible =
    surplus > 0 && buyerUtility + surplus * 0.42 >= outsideBuyer && supplierUtility + surplus * 0.58 >= outsideSupplier;
  return {
    beat,
    choice,
    buyerAsk,
    supplierComfort,
    settledQuantity,
    residual,
    buyerUtility,
    supplierUtility,
    globalUtility,
    oracleGap,
    surplus,
    transferFeasible,
    cinderResponse: cinderResponse(choice, residual, nextScores),
    plainEnglish: plainEnglishConsequence(choice, residual, oracleGap, surplus),
    nextScores,
  };
}

export function detectEnding(results: RoundResult[], scores: ScoreState): {
  title: string;
  summary: string;
  lesson: string;
} {
  const final = results.at(-1);
  if (!final) {
    return {
      title: "No run yet",
      summary: "Make decisions to create an outcome.",
      lesson: "The simulator teaches through consequences.",
    };
  }
  if (scores.relationship <= -3 || !final.transferFeasible || final.surplus < 0) {
    return {
      title: "Walk-away",
      summary:
        "The operational plan may protect one side locally, but it does not create enough joint value to prove both parties should sign.",
      lesson:
        "A hard local optimum can still fail as a mechanism if the other party is worse off than walking away.",
    };
  }
  if (scores.coverageRisk > 2.3 || final.oracleGap > 3500) {
    return {
      title: "Convergent but one-sided",
      summary:
        "You reached a deal, but the plan leaves visible value on the table or pushes too much risk onto one side.",
      lesson:
        "Convergence alone is not enough. You also need welfare and participation checks.",
    };
  }
  return {
    title: "Convergent settlement",
    summary:
      "The parties settle on a credible capacity plan, the transfer ledger can keep both sides no worse off, and the launch has a defensible supply story.",
    lesson:
      "The best-looking outcome is not perfect certainty. It is enough shared information plus a fair split of the surplus.",
  };
}

export function makeScenario(overrides: Partial<LabScenario> = {}): LabScenario {
  return {
    demand: 500,
    volatility: 0.26,
    capacityTightness: 0.72,
    participantCount: 2,
    productCount: 1,
    periodCount: 1,
    infoMode: "forecast-band",
    ...overrides,
  };
}

export function algorithmResults(scenario: LabScenario): AlgorithmResult[] {
  const oracle = algorithmScore("centralized-oracle", scenario);
  return [
    oracle,
    algorithmScore("admm", scenario, oracle.globalUtility),
    algorithmScore("alternating-best-response", scenario, oracle.globalUtility),
    algorithmScore("price-only", scenario, oracle.globalUtility),
    algorithmScore("consensus-averaging", scenario, oracle.globalUtility),
  ];
}

export function informationSweep(base: LabScenario): Array<{
  mode: InfoMode;
  label: string;
  globalUtility: number;
  privacy: number;
  residual: number;
}> {
  const modes: InfoMode[] = [
    "private",
    "risk-only",
    "capacity-band",
    "cost-band",
    "forecast-band",
    "full-oracle",
  ];
  return modes.map((mode) => {
    const scenario = { ...base, infoMode: mode };
    const admm = algorithmScore("admm", scenario);
    return {
      mode,
      label: infoModeLabel(mode),
      globalUtility: admm.globalUtility,
      privacy: privacyExposure[mode],
      residual: admm.residual,
    };
  });
}

export function transferLedger(globalUtility: number): Array<{
  party: string;
  utilityBeforeTransfer: number;
  outsideOption: number;
  transfer: number;
  utilityAfterTransfer: number;
  noWorseOff: boolean;
}> {
  const buyerBefore = globalUtility * 0.56;
  const supplierBefore = globalUtility * 0.44;
  const outsideBuyer = 8400;
  const outsideSupplier = 5200;
  const surplus = globalUtility - outsideBuyer - outsideSupplier;
  const buyerTransfer = surplus > 0 ? -surplus * 0.12 : 0;
  const supplierTransfer = surplus > 0 ? surplus * 0.12 : 0;
  return [
    {
      party: "Northstar buyer",
      utilityBeforeTransfer: buyerBefore,
      outsideOption: outsideBuyer,
      transfer: buyerTransfer,
      utilityAfterTransfer: buyerBefore + buyerTransfer,
      noWorseOff: buyerBefore + buyerTransfer >= outsideBuyer,
    },
    {
      party: "Cinder supplier",
      utilityBeforeTransfer: supplierBefore,
      outsideOption: outsideSupplier,
      transfer: supplierTransfer,
      utilityAfterTransfer: supplierBefore + supplierTransfer,
      noWorseOff: supplierBefore + supplierTransfer >= outsideSupplier,
    },
  ];
}

function algorithmScore(
  id: AlgorithmId,
  scenario: LabScenario,
  oracleUtility?: number,
): AlgorithmResult {
  const complexity =
    (scenario.participantCount - 2) * 0.06 +
    (scenario.productCount - 1) * 0.05 +
    (scenario.periodCount - 1) * 0.035 +
    scenario.volatility * 0.3 +
    scenario.capacityTightness * 0.22;
  const info = infoQuality[scenario.infoMode];
  const base = 21500 + scenario.demand * 18 - complexity * 4200 + info * 2600;
  const table: Record<AlgorithmId, { name: string; residual: number; loss: number; iters: number; runtime: number; plain: string }> = {
    "centralized-oracle": {
      name: "Centralized oracle",
      residual: 0,
      loss: 0,
      iters: 1,
      runtime: 4,
      plain: "All information is pooled and one planner chooses the best joint plan. Great benchmark, unrealistic governance.",
    },
    admm: {
      name: "ADMM",
      residual: 130 * (1 - info) + complexity * 90,
      loss: 900 * (1 - info) + complexity * 1200,
      iters: Math.round(14 + complexity * 30 - info * 5),
      runtime: 24 + complexity * 55,
      plain: "Parties keep local objectives, exchange coordination signals, and iterate toward agreement.",
    },
    "alternating-best-response": {
      name: "Alternating best response",
      residual: 180 * (1 - info) + complexity * 120,
      loss: 1400 * (1 - info) + complexity * 1800,
      iters: Math.round(9 + complexity * 18),
      runtime: 18 + complexity * 35,
      plain: "Each side responds to the last move. Simple and legible, but can bounce when incentives diverge.",
    },
    "price-only": {
      name: "Price-only coordination",
      residual: 160 * (1 - info) + complexity * 150,
      loss: 1200 * (1 - info) + complexity * 2100,
      iters: Math.round(11 + complexity * 22),
      runtime: 16 + complexity * 42,
      plain: "Only price-like signals move. Useful when privacy matters, weak when quantity constraints dominate.",
    },
    "consensus-averaging": {
      name: "Consensus averaging",
      residual: 210 * (1 - info) + complexity * 170,
      loss: 1700 * (1 - info) + complexity * 2500,
      iters: Math.round(5 + complexity * 8),
      runtime: 9 + complexity * 20,
      plain: "Average the plans. Fast and easy, but it can average away the actual constraint.",
    },
  };
  const spec = table[id];
  const utility = id === "centralized-oracle" ? base : base - spec.loss;
  const benchmark = oracleUtility ?? base;
  const gap = Math.max(0, benchmark - utility);
  return {
    id,
    name: spec.name,
    plainEnglish: spec.plain,
    iterations: spec.iters,
    residual: Math.round(spec.residual),
    runtimeMs: Math.round(spec.runtime),
    globalUtility: Math.round(utility),
    oracleGap: Math.round(gap),
    feasible: spec.residual < 260,
    quality:
      id === "centralized-oracle"
        ? "best benchmark"
        : gap < 1200
          ? "strong"
          : gap < 2800
            ? "mixed"
            : "weak",
  };
}

function supplierComfortQuantity(choice: Choice, scores: ScoreState): number {
  const informationLift = infoQuality[choice.infoMode] * 115;
  const relationshipLift = scores.relationship * 13;
  const riskDrag = scores.coverageRisk * 42;
  const budgetDrag = Math.max(0, scores.budgetPressure - 2) * 18;
  return Math.round(clamp(430 + informationLift + relationshipLift - riskDrag - budgetDrag, 280, 680));
}

function buyerUtilityFor(quantity: number, scores: ScoreState): number {
  const demand = 500;
  const shortage = Math.max(0, demand - quantity);
  const excess = Math.max(0, quantity - demand);
  return (
    125 * Math.min(quantity, demand) -
    55 * quantity -
    92 * shortage -
    7 * excess -
    scores.coverageRisk * 460 -
    scores.budgetPressure * 320
  );
}

function supplierUtilityFor(quantity: number, scores: ScoreState): number {
  const capacity = 610;
  const overCapacity = Math.max(0, quantity - capacity);
  return (
    (55 - 34) * quantity -
    5 * Math.max(0, 500 - quantity) -
    overCapacity * overCapacity * 0.07 -
    scores.coverageRisk * 280 +
    scores.relationship * 120
  );
}

function oracleUtilityFor(scores: ScoreState, infoMode: InfoMode): number {
  return 23900 + infoQuality[infoMode] * 1400 - scores.coverageRisk * 360 - scores.budgetPressure * 180;
}

function cinderResponse(choice: Choice, residual: number, scores: ScoreState): string {
  if (scores.relationship <= -2) {
    return "Cinder says the ask is too one-sided and starts protecting capacity for other customers.";
  }
  if (residual > 170) {
    return "Cinder does not reject you, but their quantity is far below your ask. The negotiation is still wide open.";
  }
  if (choice.infoMode === "forecast-band" || choice.infoMode === "cost-band") {
    return "Cinder responds constructively because the shared band gives them enough signal to plan around.";
  }
  return "Cinder keeps negotiating. They can work with the direction, but they still want more certainty.";
}

function plainEnglishConsequence(choice: Choice, residual: number, oracleGap: number, surplus: number): string {
  if (surplus < 0) {
    return "This move hurts joint value. A transfer cannot fix a plan that destroys value before the money is split.";
  }
  if (residual > 170) {
    return "You and Cinder are still far apart. The next question is not the exact number; it is what information or commitment would make the gap smaller.";
  }
  if (oracleGap > 3000) {
    return "The deal is moving, but the all-knowing benchmark says the parties are still leaving value on the table.";
  }
  if (choice.infoMode === "private") {
    return "You protected private information, but that privacy has a cost: the supplier has to guess what risk it is being asked to carry.";
  }
  return "This move improves coordination because it gives the supplier a clearer planning signal without requiring perfect certainty.";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
