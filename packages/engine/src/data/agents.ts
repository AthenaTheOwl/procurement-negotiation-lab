import type { AgentArchetype } from "../model/types";

export const agentArchetypes: AgentArchetype[] = [
  {
    id: "jit-buyer",
    side: "buyer",
    name: "JIT planner",
    shortName: "JIT buyer",
    oneLine: "Minimizes inventory and waits for demand certainty.",
    objective: "Minimize purchase, holding, and downstream fulfillment cost while avoiding late launch penalties.",
    privateInfo: "Demand forecast, FC inventory, outbound transportation cost, shortage penalty.",
    strategy: "Issues conservative purchase orders and updates late as demand becomes firm.",
    parameters: {
      urgency: 0.45,
      flexibility: 0.35,
      truthfulness: 0.55,
      privacyPreference: 0.8,
      riskAversion: 0.55,
    },
  },
  {
    id: "launch-protector",
    side: "buyer",
    name: "Launch protector",
    shortName: "Launch buyer",
    oneLine: "Pays to reserve capacity when a launch miss is expensive.",
    objective: "Maximize service coverage, even if the plan carries excess inventory risk.",
    privateInfo: "Launch date pressure, customer penalty, executive priority, forecast confidence.",
    strategy: "Commits earlier and accepts higher CBT if it materially lowers shortage exposure.",
    parameters: {
      urgency: 0.88,
      flexibility: 0.52,
      truthfulness: 0.72,
      privacyPreference: 0.55,
      riskAversion: 0.75,
    },
  },
  {
    id: "truthful-cpp-agent",
    side: "either",
    name: "Truthful CPP responder",
    shortName: "Truthful CPP",
    oneLine: "Optimizes honestly against the coordinator's prices without revealing the full cost function.",
    objective: "Return the local best response to each coordination query.",
    privateInfo: "Full local cost and capacity curve.",
    strategy: "Keeps private data private, but makes each submitted response consistent with real preferences.",
    parameters: {
      urgency: 0.6,
      flexibility: 0.66,
      truthfulness: 0.95,
      privacyPreference: 0.68,
      riskAversion: 0.5,
    },
  },
  {
    id: "capacity-guard",
    side: "supplier",
    name: "Capacity guard",
    shortName: "Capacity guard",
    oneLine: "Protects scarce production slots and resists vague optionality.",
    objective: "Maximize contribution margin while avoiding overpromised capacity.",
    privateInfo: "Line schedule, setup cost, customer allocation, expedite cost.",
    strategy: "Counters hard when buyer commitment is vague; softens when forecast or capacity bands are shared.",
    parameters: {
      urgency: 0.38,
      flexibility: 0.42,
      truthfulness: 0.7,
      privacyPreference: 0.82,
      riskAversion: 0.8,
    },
  },
  {
    id: "relationship-supplier",
    side: "supplier",
    name: "Relationship builder",
    shortName: "Relationship supplier",
    oneLine: "Accepts some short-term burden to preserve a strategic account.",
    objective: "Maximize expected account value across repeated planning cycles.",
    privateInfo: "Strategic-account priority, future margin, alternative customer pipeline.",
    strategy: "Shares bands earlier and accepts transfers that keep long-run utility positive.",
    parameters: {
      urgency: 0.52,
      flexibility: 0.78,
      truthfulness: 0.82,
      privacyPreference: 0.52,
      riskAversion: 0.45,
    },
  },
  {
    id: "hard-bargainer",
    side: "either",
    name: "Hard bargainer",
    shortName: "Hard bargainer",
    oneLine: "Optimizes local utility first and reveals as little as possible.",
    objective: "Maximize local payoff, even if global utility falls.",
    privateInfo: "Reservation value, walk-away threshold, fallback options.",
    strategy: "Pushes for favorable terms until the mechanism makes misalignment costly.",
    parameters: {
      urgency: 0.62,
      flexibility: 0.24,
      truthfulness: 0.38,
      privacyPreference: 0.9,
      riskAversion: 0.62,
    },
  },
];

export function agentById(id: string): AgentArchetype {
  return agentArchetypes.find((agent) => agent.id === id) ?? agentArchetypes[0];
}

export function agentsForSide(side: "buyer" | "supplier"): AgentArchetype[] {
  return agentArchetypes.filter((agent) => agent.side === side || agent.side === "either");
}
