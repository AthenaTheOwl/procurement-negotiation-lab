export const CONVERGENCE_METHODS = [
  "consensus-admm",
  "damped-averaging",
  "price-tatonnement",
  "lagrangian",
] as const;

export type ConvergenceMethod = (typeof CONVERGENCE_METHODS)[number];

export interface ConvergenceGuide {
  id: string;
  label: string;
  bestFor: string;
  tradeoff: string;
  simulatedMethod?: ConvergenceMethod;
}

export const CONVERGENCE_GUIDES: ConvergenceGuide[] = [
  {
    id: "consensus-admm",
    label: "Consensus / ADMM",
    bestFor: "Strategic SKUs with private local objectives and coupled constraints.",
    tradeoff: "Strong middle ground, but needs rounds, rho tuning, and transcript governance.",
    simulatedMethod: "consensus-admm",
  },
  {
    id: "damped-averaging",
    label: "Damped averaging",
    bestFor: "Fast alignment around a reasonable shared plan.",
    tradeoff: "Easy to explain; weaker optimization guarantees.",
    simulatedMethod: "damped-averaging",
  },
  {
    id: "tatonnement",
    label: "Price clearing",
    bestFor: "Volume, capacity, and supply-demand clearing.",
    tradeoff: "Commercially intuitive; can oscillate without damping.",
    simulatedMethod: "price-tatonnement",
  },
  {
    id: "lagrangian",
    label: "Lagrangian updates",
    bestFor: "Shared capacity constraints with private vendor responses.",
    tradeoff: "Very light messages; step size matters.",
    simulatedMethod: "lagrangian",
  },
  {
    id: "progressive-hedging",
    label: "Progressive hedging",
    bestFor: "Scenario planning across demand, region, or supplier-risk cases.",
    tradeoff: "Close cousin of ADMM; still iterative.",
  },
  {
    id: "gossip",
    label: "Gossip consensus",
    bestFor: "No trusted central coordinator or unreliable communication.",
    tradeoff: "Decentralized and robust; slower and harder to audit.",
  },
  {
    id: "federated-averaging",
    label: "Federated averaging",
    bestFor: "Expensive local simulations with fewer sync rounds.",
    tradeoff: "Private and communication-light; can drift with heterogeneous objectives.",
  },
  {
    id: "projection",
    label: "Projection methods",
    bestFor: "Feasibility-first problems such as SLA windows and compliance bounds.",
    tradeoff: "Great for constraints; less natural for rich cost tradeoffs.",
  },
  {
    id: "no-regret",
    label: "No-regret learning",
    bestFor: "Repeated strategic bidding and marketplace behavior.",
    tradeoff: "Learns from outcomes; converges to behavior, not always global optimum.",
  },
  {
    id: "auction",
    label: "Auction / mechanism",
    bestFor: "Scarce high-value slots where incentive rules matter.",
    tradeoff: "Handles strategy better; rule design and explanation are heavy.",
  },
  {
    id: "voting",
    label: "Voting / scoring",
    bestFor: "Discrete contract templates and policy defaults.",
    tradeoff: "Fast and explainable; coarse and vulnerable to strategic ranking.",
  },
  {
    id: "bayesian",
    label: "Bayesian pooling",
    bestFor: "Disagreement caused by forecasts rather than costs.",
    tradeoff: "Separates belief from action; needs signal-quality assumptions.",
  },
  {
    id: "contract-menu",
    label: "Contract menu",
    bestFor: "Week-one rollout and long-tail SKU adoption.",
    tradeoff: "One-shot and executable; leaves precision on the table.",
  },
];

export interface VendorConsensusProfile {
  id: string;
  name: string;
  idealQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  privateWeight: number;
  consensusPull: number;
  shareWeight: number;
  reservationPrice: number;
  priceSensitivity: number;
}

export interface ConsensusConfig {
  method: ConvergenceMethod;
  initialTarget: number;
  targetDemand: number;
  rho: number;
  alpha: number;
  eta: number;
  maxRounds: number;
  epsilon: number;
  initialPrice: number;
}

export interface VendorRoundProposal {
  vendorId: string;
  name: string;
  proposal: number;
  message: number;
  dual: number;
  feasible: boolean;
}

export interface ConvergenceRound {
  round: number;
  consensus: number;
  price: number;
  lambda: number;
  totalSupply: number;
  demandGap: number;
  primalResidual: number;
  dualResidual: number;
  proposals: VendorRoundProposal[];
}

export interface ConvergenceResult {
  method: ConvergenceMethod;
  converged: boolean;
  rounds: ConvergenceRound[];
  finalConsensus: number;
  finalPrice: number;
  finalResidual: number;
  messagesShared: string[];
  privacyNote: string;
  fallbackMenu: MenuFallbackOption[];
}

export interface MenuFallbackOption {
  id: "fast-flexible" | "balanced" | "lean-firm";
  label: string;
  quantity: number;
  unitPrice: number;
  flexPercent: number;
  penaltyPerLateDay: number;
  note: string;
}

export const DEFAULT_CONSENSUS_VENDORS: VendorConsensusProfile[] = [
  {
    id: "vendor-a",
    name: "Aster Components",
    idealQuantity: 920,
    minQuantity: 520,
    maxQuantity: 1300,
    privateWeight: 1.4,
    consensusPull: 0.35,
    shareWeight: 1.2,
    reservationPrice: 10.4,
    priceSensitivity: 48,
  },
  {
    id: "vendor-b",
    name: "Boreal Systems",
    idealQuantity: 680,
    minQuantity: 350,
    maxQuantity: 980,
    privateWeight: 1,
    consensusPull: 0.28,
    shareWeight: 1,
    reservationPrice: 9.8,
    priceSensitivity: 62,
  },
  {
    id: "vendor-c",
    name: "Cinder Supply",
    idealQuantity: 440,
    minQuantity: 180,
    maxQuantity: 760,
    privateWeight: 1.8,
    consensusPull: 0.22,
    shareWeight: 0.8,
    reservationPrice: 11.1,
    priceSensitivity: 38,
  },
];

export const DEFAULT_CONSENSUS_CONFIG: ConsensusConfig = {
  method: "consensus-admm",
  initialTarget: 700,
  targetDemand: 2100,
  rho: 1,
  alpha: 0.35,
  eta: 0.04,
  maxRounds: 6,
  epsilon: 18,
  initialPrice: 10,
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function positive(value: number, fallback: number): number {
  return Math.max(0.0001, finite(value, fallback));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, w) => sum + positive(w, 1), 0);
  if (totalWeight <= 0) return 0;
  return (
    values.reduce((sum, value, idx) => sum + value * positive(weights[idx], 1), 0) /
    totalWeight
  );
}

function fallbackMenu(finalQuantity: number, finalPrice: number): MenuFallbackOption[] {
  const q = Math.max(1, finalQuantity);
  const p = Math.max(0.01, finalPrice);
  return [
    {
      id: "fast-flexible",
      label: "Fast & Flexible",
      quantity: Math.round(q * 0.85),
      unitPrice: round(p + 0.55),
      flexPercent: 25,
      penaltyPerLateDay: 0.03,
      note: "Higher price, wider volume band, lenient penalties.",
    },
    {
      id: "balanced",
      label: "Balanced",
      quantity: Math.round(q),
      unitPrice: round(p),
      flexPercent: 12,
      penaltyPerLateDay: 0.08,
      note: "Closest one-shot approximation to the consensus point.",
    },
    {
      id: "lean-firm",
      label: "Lean & Firm",
      quantity: Math.round(q * 1.12),
      unitPrice: round(Math.max(0.01, p - 0.35)),
      flexPercent: 4,
      penaltyPerLateDay: 0.16,
      note: "Lower price, tight volume, stricter execution terms.",
    },
  ];
}

function methodPrivacyNote(method: ConvergenceMethod): string {
  if (method === "consensus-admm") {
    return "Vendors send proposal-plus-dual messages. Raw costs and constraints stay local, but the transcript can still reveal marginal behavior.";
  }
  if (method === "damped-averaging") {
    return "Vendors send proposed quantities. The coordinator only dampens the average, so privacy is practical rather than formal.";
  }
  if (method === "price-tatonnement") {
    return "The coordinator posts prices and observes supply. Vendors reveal less plan detail, but repeated responses expose elasticity.";
  }
  return "Vendors respond to a shadow price. Constraint scarcity is visible through the dual path, while local objectives stay private.";
}

function messagesShared(method: ConvergenceMethod): string[] {
  if (method === "consensus-admm") return ["z target", "rho", "x_i + u_i", "dual update"];
  if (method === "damped-averaging") return ["z target", "proposal x_i", "damped average"];
  if (method === "price-tatonnement") return ["posted price", "quantity response", "excess demand"];
  return ["shadow price lambda", "quantity response", "constraint gap"];
}

export function simulateConvergence(
  vendors: VendorConsensusProfile[] = DEFAULT_CONSENSUS_VENDORS,
  config: Partial<ConsensusConfig> = {},
): ConvergenceResult {
  const cfg: ConsensusConfig = { ...DEFAULT_CONSENSUS_CONFIG, ...config };
  const method = cfg.method;
  const maxRounds = Math.max(1, Math.floor(finite(cfg.maxRounds, 6)));
  const epsilon = positive(cfg.epsilon, 18);
  const rho = positive(cfg.rho, 1);
  const alpha = clamp(finite(cfg.alpha, 0.35), 0.01, 1);
  const eta = positive(cfg.eta, 0.04);
  const targetDemand = positive(cfg.targetDemand, 2100);
  const weights = vendors.map((vendor) => vendor.shareWeight);
  const duals = new Map(vendors.map((vendor) => [vendor.id, 0]));

  let consensus = finite(cfg.initialTarget, 700);
  let price = finite(cfg.initialPrice, 10);
  let lambda = 0;
  const rounds: ConvergenceRound[] = [];

  for (let roundIndex = 1; roundIndex <= maxRounds; roundIndex += 1) {
    const previousConsensus = consensus;
    const proposals: VendorRoundProposal[] = vendors.map((vendor) => {
      const min = Math.min(vendor.minQuantity, vendor.maxQuantity);
      const max = Math.max(vendor.minQuantity, vendor.maxQuantity);
      const dual = duals.get(vendor.id) ?? 0;
      let proposal: number;
      let message: number;

      if (method === "consensus-admm") {
        const localWeight = positive(vendor.privateWeight, 1);
        proposal = clamp(
          (localWeight * vendor.idealQuantity + rho * (consensus - dual)) /
            (localWeight + rho),
          min,
          max,
        );
        message = proposal + dual;
      } else if (method === "damped-averaging") {
        proposal = clamp(
          vendor.idealQuantity +
            positive(vendor.consensusPull, 0.25) *
              (consensus - vendor.idealQuantity),
          min,
          max,
        );
        message = proposal;
      } else if (method === "price-tatonnement") {
        proposal = clamp(
          vendor.idealQuantity +
            positive(vendor.priceSensitivity, 40) *
              (price - vendor.reservationPrice),
          min,
          max,
        );
        message = proposal;
      } else {
        proposal = clamp(
          vendor.idealQuantity -
            positive(vendor.priceSensitivity, 40) * lambda,
          min,
          max,
        );
        message = proposal;
      }

      return {
        vendorId: vendor.id,
        name: vendor.name,
        proposal: round(proposal),
        message: round(message),
        dual: round(dual),
        feasible: proposal >= min && proposal <= max,
      };
    });

    const rawProposals = proposals.map((proposal) => proposal.proposal);
    const totalSupply = rawProposals.reduce((sum, value) => sum + value, 0);
    const demandGap = targetDemand - totalSupply;

    if (method === "consensus-admm") {
      consensus = weightedAverage(
        proposals.map((proposal) => proposal.message),
        weights,
      );
      for (const proposal of proposals) {
        duals.set(
          proposal.vendorId,
          (duals.get(proposal.vendorId) ?? 0) + proposal.proposal - consensus,
        );
      }
    } else if (method === "damped-averaging") {
      const averageProposal = weightedAverage(rawProposals, weights);
      consensus = (1 - alpha) * consensus + alpha * averageProposal;
    } else if (method === "price-tatonnement") {
      price = Math.max(0.01, price + (eta * demandGap) / vendors.length);
      consensus = totalSupply / Math.max(1, vendors.length);
    } else {
      lambda += (eta * (totalSupply - targetDemand)) / vendors.length;
      consensus = totalSupply / Math.max(1, vendors.length);
    }

    const primalResidual =
      method === "price-tatonnement" || method === "lagrangian"
        ? Math.abs(demandGap)
        : Math.max(
            ...rawProposals.map((proposal) => Math.abs(proposal - consensus)),
          );
    const dualResidual = Math.abs(consensus - previousConsensus) * rho;

    rounds.push({
      round: roundIndex,
      consensus: round(consensus),
      price: round(price),
      lambda: round(lambda),
      totalSupply: round(totalSupply),
      demandGap: round(demandGap),
      primalResidual: round(primalResidual),
      dualResidual: round(dualResidual),
      proposals,
    });

    if (primalResidual <= epsilon) break;
  }

  const finalRound = rounds[rounds.length - 1];
  const finalConsensus =
    method === "price-tatonnement" || method === "lagrangian"
      ? finalRound.totalSupply / Math.max(1, vendors.length)
      : finalRound.consensus;

  return {
    method,
    converged: finalRound.primalResidual <= epsilon,
    rounds,
    finalConsensus: round(finalConsensus),
    finalPrice: round(price),
    finalResidual: finalRound.primalResidual,
    messagesShared: messagesShared(method),
    privacyNote: methodPrivacyNote(method),
    fallbackMenu: fallbackMenu(finalConsensus, price),
  };
}
