/**
 * coordinationCatalog — typed comparison of coordination mechanisms
 * across welfare, privacy, speed, incentive compatibility, and
 * authoring effort.
 *
 * Each entry is grounded in the standard distributed-optimization /
 * mechanism-design literature; the catalog focuses on what each
 * mechanism *exchanges* across the trust boundary, which is the right
 * lens for privacy ("structural by decentralization" vs "formal by
 * differential privacy / MPC").
 *
 * Used by Level 11 (How to coordinate) and consumable from the
 * Sandbox to give every algorithm a one-line provenance card.
 */

export type CoordinationFamily =
  | "rule"
  | "posted-price"
  | "score"
  | "rfq"
  | "sealed-auction"
  | "matching"
  | "greedy-with-shadow-prices"
  | "small-lp"
  | "price-adjustment-loop"
  | "admm"
  | "differentially-private-admm"
  | "secure-mpc";

export type Confidentiality =
  | "low"
  | "medium"
  | "medium-high"
  | "high"
  | "formal";

export interface CoordinationEntry {
  /** stable id used to render and key */
  id: CoordinationFamily;
  /** display label */
  name: string;
  /** one-line "when to reach for it" gist */
  gist: string;
  /** what each party EXCHANGES across the trust boundary */
  exchanges: string;
  /** what an observer of the protocol transcript can infer */
  leaks: string;
  /** commercial confidentiality rough rating */
  confidentiality: Confidentiality;
  /** rough welfare quality vs centralized oracle */
  welfare:
    | "first-best"
    | "near-first-best"
    | "good"
    | "ok"
    | "weak";
  /** setup effort */
  setupEffort: "minimal" | "low" | "medium" | "high";
  /** approximate runtime cost */
  compute: "constant" | "low" | "medium" | "iterative";
  /** is truthful reporting a dominant strategy under standard assumptions? */
  incentiveCompatible: boolean;
  /** good fits */
  bestFits: string[];
  /** known weaknesses */
  weaknesses: string[];
  /** further-reading anchors (academic + practitioner) */
  furtherReading: { label: string; href: string }[];
}

export const COORDINATION_CATALOG: CoordinationEntry[] = [
  {
    id: "rule",
    name: "Rule-based engine",
    gist:
      "Hand-coded if/then rules. Cheapest, most explainable, never the best, but a sensible MVP.",
    exchanges:
      "Inputs to the rule engine (utilization, inventory cover, vendor reliability). Outputs are categorical decisions.",
    leaks:
      "The rule set itself, plus any state the engine reads. No iterative transcript.",
    confidentiality: "medium",
    welfare: "ok",
    setupEffort: "minimal",
    compute: "constant",
    incentiveCompatible: false,
    bestFits: [
      "MVPs",
      "operational guardrails",
      "business-owned policies",
      "exception handling",
    ],
    weaknesses: [
      "Brittle as complexity grows",
      "Gameable once rules are public",
    ],
    furtherReading: [
      {
        label: "Boyd & Vandenberghe, Convex Optimization (Ch. 4)",
        href: "https://web.stanford.edu/~boyd/cvxbook/",
      },
    ],
  },
  {
    id: "posted-price",
    name: "Posted-price menu",
    gist:
      "Platform publishes 3-5 priced options (fast / standard / flex). Parties pick. No iteration.",
    exchanges:
      "Platform publishes prices and feasibility envelopes. Party reveals only the chosen option.",
    leaks:
      "The chosen option reveals a preference; iterated choices over time can reveal a coarse demand curve.",
    confidentiality: "high",
    welfare: "good",
    setupEffort: "low",
    compute: "constant",
    incentiveCompatible: false,
    bestFits: [
      "SKU-level replenishment menus",
      "rebate-for-flexibility",
      "capacity reservation",
    ],
    weaknesses: [
      "Optimum depends on menu design",
      "No iteration toward a tighter price",
    ],
    furtherReading: [
      {
        label: "Mechanism Design 101 — posted-price vs auction",
        href: "https://www.cs.cmu.edu/~sandholm/Lectures/AuctionMechanisms-Posted.pdf",
      },
    ],
  },
  {
    id: "score",
    name: "Score-based option ranking",
    gist:
      "Generate candidate options, score each on margin / risk / cost / strategic value, take the best.",
    exchanges:
      "Each option carries a numeric score visible to the protocol. Scoring weights themselves can stay private.",
    leaks:
      "If weights are public, observers can reverse-engineer the platform's preferences.",
    confidentiality: "medium",
    welfare: "good",
    setupEffort: "low",
    compute: "low",
    incentiveCompatible: false,
    bestFits: [
      "ranking vendor offers",
      "selecting among ship windows",
      "triaging exceptions",
    ],
    weaknesses: ["Scoring rules become gameable once known"],
    furtherReading: [],
  },
  {
    id: "rfq",
    name: "Contract-net / RFQ",
    gist:
      "Platform announces a need; vendors propose; platform awards. Operational, not iterative.",
    exchanges:
      "Need spec out; offers in. Each offer reveals one (quantity, window, price/rebate) tuple.",
    leaks:
      "Bidders learn nothing about other bids unless results are published.",
    confidentiality: "medium-high",
    welfare: "good",
    setupEffort: "medium",
    compute: "low",
    incentiveCompatible: false,
    bestFits: ["procurement workflows", "spot capacity", "RFP-style awards"],
    weaknesses: [
      "Vendors can shade bids strategically",
      "Doesn't scale to many small lots",
    ],
    furtherReading: [
      {
        label: "Smith (1980) — The Contract Net Protocol",
        href: "https://ieeexplore.ieee.org/document/1675516",
      },
    ],
  },
  {
    id: "sealed-auction",
    name: "Sealed-bid / reverse auction",
    gist:
      "Bidders submit private valuations; platform clears. VCG-style mechanisms can make truth telling dominant.",
    exchanges:
      "Each bidder submits a bid (or, in VCG, a full valuation function). Clearing prices are derived by the mechanism.",
    leaks:
      "Sealed-bid VCG requires every bidder to fully reveal their type to the mechanism (not to other bidders).",
    confidentiality: "medium-high",
    welfare: "first-best",
    setupEffort: "medium",
    compute: "low",
    incentiveCompatible: true,
    bestFits: [
      "scarce capacity allocation",
      "multi-vendor procurement for substitutable goods",
      "lane allocation",
    ],
    weaknesses: [
      "Requires full type disclosure to the mechanism",
      "Vulnerable to collusion if not anonymized",
    ],
    furtherReading: [
      {
        label: "Vickrey (1961) — Counterspeculation, Auctions, and Competitive Sealed Tenders",
        href: "https://doi.org/10.1111/j.1540-6261.1961.tb02789.x",
      },
      {
        label: "Nisan et al., Algorithmic Game Theory (Ch. 9 VCG)",
        href: "http://www.cambridge.org/9780521872829",
      },
    ],
  },
  {
    id: "matching",
    name: "Matching / assignment",
    gist:
      "Assign vendors → SKUs, orders → slots, carriers → lanes by a global matching objective.",
    exchanges:
      "Each side submits a ranking (or a value per pair). Solver produces a feasible assignment.",
    leaks:
      "Ranking lists reveal preference order, not absolute valuations.",
    confidentiality: "medium",
    welfare: "near-first-best",
    setupEffort: "medium",
    compute: "low",
    incentiveCompatible: true,
    bestFits: [
      "PO → inbound slot assignment",
      "carrier → lane",
      "SKU → fulfillment center",
    ],
    weaknesses: [
      "Awkward when costs depend on quantities or are non-linear",
    ],
    furtherReading: [
      {
        label: "Gale & Shapley (1962) — College Admissions and the Stability of Marriage",
        href: "https://doi.org/10.2307/2312726",
      },
    ],
  },
  {
    id: "greedy-with-shadow-prices",
    name: "Greedy with shadow prices",
    gist:
      "Maintain a price per scarce resource (capacity slot, storage). Charge / credit each option accordingly.",
    exchanges:
      "Resource prices are public; usage is metered. No iteration across parties needed.",
    leaks: "Prices over time reveal the rough scarcity surface.",
    confidentiality: "medium",
    welfare: "good",
    setupEffort: "medium",
    compute: "low",
    incentiveCompatible: false,
    bestFits: [
      "FC capacity",
      "appointment slot allocation",
      "carrier capacity",
    ],
    weaknesses: ["Greedy can miss global optima when interactions matter"],
    furtherReading: [],
  },
  {
    id: "small-lp",
    name: "Centralized small LP / MILP",
    gist:
      "Parties submit ranges and valuations; the platform solves one optimization problem.",
    exchanges:
      "Each party gives the solver the data it needs (constraints, point valuations).",
    leaks:
      "Whatever was submitted to the solver. Privacy depends on what shape of data the protocol accepts.",
    confidentiality: "low",
    welfare: "first-best",
    setupEffort: "medium",
    compute: "medium",
    incentiveCompatible: false,
    bestFits: [
      "weekly batch planning",
      "SKU/vendor/window selection",
      "promotion allocation",
    ],
    weaknesses: [
      "Requires centralized trust",
      "Cost data leaves the party",
    ],
    furtherReading: [],
  },
  {
    id: "price-adjustment-loop",
    name: "Price-adjustment loop",
    gist:
      "Lightweight dual decomposition: post a price, observe demand/supply, raise or lower it.",
    exchanges:
      "Prices broadcast; aggregate demand/supply observed back. No raw quantities per party.",
    leaks:
      "Aggregate behavior is observable but individual demand curves are not.",
    confidentiality: "medium-high",
    welfare: "good",
    setupEffort: "medium",
    compute: "iterative",
    incentiveCompatible: false,
    bestFits: ["dynamic capacity fees", "rebates", "ship-window steering"],
    weaknesses: ["Can oscillate without rate caps"],
    furtherReading: [],
  },
  {
    id: "admm",
    name: "ADMM (vanilla)",
    gist:
      "Decompose into local subproblems coordinated by a price. Parties solve their own optimization privately.",
    exchanges:
      "Each iteration exchanges local primal updates + a dual (price) variable. Cost functions stay local.",
    leaks:
      "Iterated x and dual updates trace out a party's marginal-cost curve under standard differentiability assumptions.",
    confidentiality: "medium-high",
    welfare: "near-first-best",
    setupEffort: "high",
    compute: "iterative",
    incentiveCompatible: false,
    bestFits: [
      "many parties with strong privacy preferences",
      "coupled constraints (shared capacity)",
      "repeated coordination",
    ],
    weaknesses: [
      "Iterative transcript can leak marginal cost structure",
      "Operationally heavier than menus or auctions",
      "No formal privacy guarantee without DP / MPC layered on",
    ],
    furtherReading: [
      {
        label: "Boyd et al. (2011) — Distributed Optimization via ADMM",
        href: "https://web.stanford.edu/~boyd/papers/admm_distr_stats.html",
      },
    ],
  },
  {
    id: "differentially-private-admm",
    name: "Differentially private ADMM",
    gist:
      "ADMM + calibrated noise on the updates. Trades accuracy for a formal (ε, δ)-DP guarantee.",
    exchanges:
      "Same as ADMM, but each shared update is perturbed with calibrated noise.",
    leaks:
      "Each round burns a bounded amount of privacy budget; total leakage is bounded by composition theorems.",
    confidentiality: "formal",
    welfare: "good",
    setupEffort: "high",
    compute: "iterative",
    incentiveCompatible: false,
    bestFits: [
      "regulated domains (health, finance)",
      "coalitions where formal privacy is contracted",
    ],
    weaknesses: [
      "Convergence slowed by noise",
      "ε / δ accounting is its own discipline",
    ],
    furtherReading: [
      {
        label: "Huang, Mitra & Vaidya (2019) — DP-ADMM",
        href: "https://arxiv.org/abs/1808.10101",
      },
    ],
  },
  {
    id: "secure-mpc",
    name: "Secure multiparty optimization",
    gist:
      "Cryptographic primitives (secret sharing / HE) let parties jointly compute without revealing inputs.",
    exchanges:
      "Encrypted shares only. Plaintext never leaves a party's boundary.",
    leaks: "Nothing beyond what the agreed output reveals.",
    confidentiality: "formal",
    welfare: "first-best",
    setupEffort: "high",
    compute: "iterative",
    incentiveCompatible: false,
    bestFits: [
      "cross-organization optimization with strict confidentiality",
      "auctions where bid secrecy is non-negotiable",
    ],
    weaknesses: [
      "Order-of-magnitude more compute and communication",
      "Operational complexity is real",
    ],
    furtherReading: [
      {
        label: "Naor, Pinkas & Sumner (1999) — Privacy preserving auctions",
        href: "https://dl.acm.org/doi/10.1145/336992.337028",
      },
    ],
  },
];

export function entryById(id: CoordinationFamily): CoordinationEntry {
  const found = COORDINATION_CATALOG.find((e) => e.id === id);
  if (!found) throw new Error(`unknown coordination family: ${id}`);
  return found;
}

/**
 * Compact summary used by the comparison table.
 */
export interface CoordinationSummary {
  id: CoordinationFamily;
  name: string;
  setupEffort: CoordinationEntry["setupEffort"];
  confidentiality: Confidentiality;
  welfare: CoordinationEntry["welfare"];
  incentiveCompatible: boolean;
}

export function catalogSummary(): CoordinationSummary[] {
  return COORDINATION_CATALOG.map(
    ({ id, name, setupEffort, confidentiality, welfare, incentiveCompatible }) => ({
      id,
      name,
      setupEffort,
      confidentiality,
      welfare,
      incentiveCompatible,
    }),
  );
}
