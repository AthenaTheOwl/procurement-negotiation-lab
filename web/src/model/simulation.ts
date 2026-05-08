import type {
  AlgorithmResult,
  Beat,
  Choice,
  InfoMode,
  LabScenario,
  MechanismId,
  RoundResult,
  ScoreState,
} from "./types";
import { presetById } from "../data/scenarios";

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
  const presetId = overrides.presetId ?? "substrate-crunch";
  const preset = presetById(presetId);
  return {
    presetId,
    demand: 500,
    volatility: 0.26,
    capacityTightness: 0.72,
    leadTimeWeeks: 12,
    fulfillmentCenterCount: 3,
    participantCount: 2,
    productCount: 1,
    periodCount: 1,
    infoMode: "forecast-band",
    buyerAgentId: "launch-protector",
    supplierAgentId: "capacity-guard",
    customBuyerUrgency: 0.75,
    customSupplierFlexibility: 0.45,
    customTruthfulness: 0.78,
    customPrivacyPreference: 0.68,
    customRiskAversion: 0.68,
    ...preset.defaults,
    ...overrides,
  };
}

export function algorithmResults(scenario: LabScenario): AlgorithmResult[] {
  const oracle = mechanismScore("centralized-oracle", scenario);
  return [
    mechanismScore("jit-baseline", scenario, oracle.globalUtility),
    oracle,
    mechanismScore("cpp-vcg", scenario, oracle.globalUtility),
    mechanismScore("cpp-admm", scenario, oracle.globalUtility),
    mechanismScore("menu-contracts", scenario, oracle.globalUtility),
    mechanismScore("alternating-best-response", scenario, oracle.globalUtility),
    mechanismScore("price-only", scenario, oracle.globalUtility),
    mechanismScore("consensus-averaging", scenario, oracle.globalUtility),
  ];
}

export function labTakeaway(scenario: LabScenario): {
  title: string;
  soWhat: string;
  coordinationGap: number;
  bestMechanism: AlgorithmResult;
  informationValue: number;
} {
  const runs = algorithmResults(scenario);
  const jit = runs.find((run) => run.id === "jit-baseline") ?? runs[0];
  const oracle = runs.find((run) => run.id === "centralized-oracle") ?? runs[0];
  const implementable = runs
    .filter((run) => run.id !== "centralized-oracle" && run.id !== "jit-baseline")
    .sort((a, b) => a.oracleGap - b.oracleGap)[0];
  const privateScenario = makeScenario({ ...scenario, infoMode: "private" });
  const fullScenario = makeScenario({ ...scenario, infoMode: "full-oracle" });
  const informationValue =
    mechanismScore("cpp-vcg", fullScenario).globalUtility -
    mechanismScore("cpp-vcg", privateScenario).globalUtility;
  return {
    title: "The so-what",
    soWhat:
      `Local planning leaves about ${money(jit.oracleGap)} on the table in this setup. ` +
      `${implementable.name} recovers most of that gap while exposing less private data than the oracle.`,
    coordinationGap: oracle.globalUtility - jit.globalUtility,
    bestMechanism: implementable,
    informationValue,
  };
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
    const admm = mechanismScore("cpp-vcg", scenario);
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

function mechanismScore(
  id: MechanismId,
  scenario: LabScenario,
  oracleUtility?: number,
): AlgorithmResult {
  const complexity =
    (scenario.participantCount - 2) * 0.07 +
    (scenario.productCount - 1) * 0.06 +
    (scenario.periodCount - 1) * 0.04 +
    (scenario.fulfillmentCenterCount - 3) * 0.025 +
    (scenario.leadTimeWeeks - 6) * 0.012 +
    scenario.volatility * 0.3 +
    scenario.capacityTightness * 0.22;
  const info = infoQuality[scenario.infoMode];
  const agentDiscipline =
    scenario.customTruthfulness * 0.44 +
    scenario.customSupplierFlexibility * 0.24 +
    (1 - scenario.customPrivacyPreference) * 0.16 +
    scenario.customBuyerUrgency * 0.08 +
    (1 - scenario.customRiskAversion) * 0.08;
  const base =
    18800 +
    scenario.demand * 16 +
    scenario.fulfillmentCenterCount * 260 +
    scenario.productCount * 520 -
    complexity * 3900 +
    info * 2600 +
    agentDiscipline * 1800;
  const table: Record<
    MechanismId,
    {
      name: string;
      residual: number;
      loss: number;
      iters: number;
      runtime: number;
      privacy: number;
      plain: string;
      incentive: string;
      infoRequired: string;
    }
  > = {
    "jit-baseline": {
      name: "JIT baseline",
      residual: 250 * (1 - info * 0.25) + complexity * 180,
      loss: 4100 + 2400 * complexity + 1100 * (1 - agentDiscipline),
      iters: 1,
      runtime: 3,
      privacy: privacyExposure[scenario.infoMode] * 0.25,
      plain: "Buyer issues its local best order; supplier reacts later. Simple, private, and often jointly wasteful.",
      incentive: "No mechanism: each side can act locally and push cost to the other side.",
      infoRequired: "Buyer order only; supplier economics stay hidden and unused.",
    },
    "centralized-oracle": {
      name: "Centralized oracle",
      residual: 0,
      loss: 0,
      iters: 1,
      runtime: 4,
      privacy: 1,
      plain: "All information is pooled and one planner chooses the best joint plan. Useful benchmark, unrealistic governance.",
      incentive: "Efficient if everyone reveals truthfully, but it assumes away strategic privacy.",
      infoRequired: "Full buyer demand, inventory, transport, supplier cost, capacity, and production curves.",
    },
    "cpp-vcg": {
      name: "CPP + VCG/CBT",
      residual: 52 * (1 - info) + complexity * 58 + (1 - scenario.customTruthfulness) * 44,
      loss: 420 * (1 - info) + complexity * 760 + (1 - scenario.customTruthfulness) * 430,
      iters: Math.round(20 + complexity * 34 - info * 6),
      runtime: 42 + complexity * 72,
      privacy: privacyExposure[scenario.infoMode] * 0.74 + 0.11,
      plain: "Agents respond to coordination queries, then a VCG-style transfer prices the externality each side imposes.",
      incentive: "Designed to make truthful local optimization the attractive strategy when agents respond honestly.",
      infoRequired: "Iterative best responses plus a counterfactual run for transfer calculation; not full cost disclosure.",
    },
    "cpp-admm": {
      name: "CPP / ADMM",
      residual: 130 * (1 - info) + complexity * 90 + (1 - agentDiscipline) * 30,
      loss: 900 * (1 - info) + complexity * 1200 + (1 - agentDiscipline) * 620,
      iters: Math.round(14 + complexity * 30 - info * 5),
      runtime: 24 + complexity * 55,
      privacy: privacyExposure[scenario.infoMode] * 0.62 + 0.08,
      plain: "Parties keep local objectives, exchange coordination signals, and iterate toward agreement.",
      incentive: "Good coordination protocol, but without VCG pricing it does not by itself solve incentive compatibility.",
      infoRequired: "Local best responses to prices or consensus quantities.",
    },
    "menu-contracts": {
      name: "Menu of contracts",
      residual: 78 * (1 - info) + complexity * 86 + Math.max(0, scenario.productCount - 2) * 36,
      loss: 520 * (1 - info) + complexity * 930 + Math.max(0, scenario.productCount - 2) * 460,
      iters: 2,
      runtime: 12 + complexity * 28,
      privacy: privacyExposure[scenario.infoMode] * 0.42 + 0.18,
      plain: "Buyer offers priced plan options; supplier chooses the plan that maximizes its own utility.",
      incentive: "Transparent and strong in low-dimensional cases; menus become hard to design as choices explode.",
      infoRequired: "A finite menu of candidate plans and prices.",
    },
    "alternating-best-response": {
      name: "Alternating best response",
      residual: 180 * (1 - info) + complexity * 120 + (1 - scenario.customSupplierFlexibility) * 34,
      loss: 1400 * (1 - info) + complexity * 1800 + (1 - agentDiscipline) * 700,
      iters: Math.round(9 + complexity * 18),
      runtime: 18 + complexity * 35,
      plain: "Each side responds to the last move. Simple and legible, but can bounce when incentives diverge.",
      privacy: privacyExposure[scenario.infoMode] * 0.36,
      incentive: "Legible negotiation heuristic, not incentive compatible.",
      infoRequired: "Last offer and local response.",
    },
    "price-only": {
      name: "Price-only coordination",
      residual: 160 * (1 - info) + complexity * 150,
      loss: 1200 * (1 - info) + complexity * 2100,
      iters: Math.round(11 + complexity * 22),
      runtime: 16 + complexity * 42,
      plain: "Only price-like signals move. Useful when privacy matters, weak when quantity constraints dominate.",
      privacy: privacyExposure[scenario.infoMode] * 0.32 + 0.04,
      incentive: "Protects private details, but prices may not encode binding capacity or timing constraints.",
      infoRequired: "Price or penalty signal, not full planning state.",
    },
    "consensus-averaging": {
      name: "Consensus averaging",
      residual: 210 * (1 - info) + complexity * 170,
      loss: 1700 * (1 - info) + complexity * 2500,
      iters: Math.round(5 + complexity * 8),
      runtime: 9 + complexity * 20,
      plain: "Average the plans. Fast and easy, but it can average away the actual constraint.",
      privacy: privacyExposure[scenario.infoMode] * 0.22,
      incentive: "No strategic protection; averaging can reward inflated asks or understated capacity.",
      infoRequired: "Plan proposals only.",
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
    privacyExposure: clamp(spec.privacy, 0, 1),
    incentiveStory: spec.incentive,
    informationRequired: spec.infoRequired,
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

function money(value: number): string {
  return `$${Math.round(Math.abs(value)).toLocaleString()}`;
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
