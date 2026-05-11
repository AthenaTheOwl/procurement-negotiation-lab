import type { AgentParameters, ParticipantRole } from "../model/types";

export interface Strategy {
  id: string;
  role: ParticipantRole;
  name: string;
  shortName: string;
  description: string;
  defaultUtilityFormula: string;
  defaultParameters: AgentParameters;
  defaultReliability: number;
  defaultCapacity?: number;
  defaultOutsideOption?: number;
  teaches: string[];
}

export const strategies: Strategy[] = [
  {
    id: "launch-protector-buyer",
    role: "buyer",
    name: "Launch protector",
    shortName: "Launch buyer",
    description: "Pays to reserve capacity when a launch miss is expensive.",
    defaultUtilityFormula:
      "service_value * min(q, demand) - unit_cost * q - shortage_penalty * max(demand - q, 0) - excess_penalty * max(q - demand, 0)",
    defaultParameters: {
      urgency: 0.88,
      flexibility: 0.52,
      truthfulness: 0.72,
      privacyPreference: 0.55,
      riskAversion: 0.75,
    },
    defaultReliability: 0.95,
    defaultOutsideOption: 8400,
    teaches: ["R-PORTAL-001", "R-PORTAL-004", "spec 0001 buyer utility"],
  },
  {
    id: "jit-buyer",
    role: "buyer",
    name: "JIT planner",
    shortName: "JIT buyer",
    description: "Minimizes inventory and waits for demand certainty.",
    defaultUtilityFormula:
      "service_value * min(q, demand) - unit_cost * q - holding * max(q - demand, 0)",
    defaultParameters: {
      urgency: 0.45,
      flexibility: 0.35,
      truthfulness: 0.55,
      privacyPreference: 0.8,
      riskAversion: 0.55,
    },
    defaultReliability: 0.9,
    defaultOutsideOption: 7600,
    teaches: ["R-PORTAL-001", "spec 0001 jit baseline"],
  },
  {
    id: "capacity-guard-supplier",
    role: "supplier",
    name: "Capacity guard",
    shortName: "Capacity guard",
    description: "Protects scarce production slots and resists vague optionality.",
    defaultUtilityFormula:
      "revenue_per_unit * q - production_cost * q - holding_cost * max(q - forecast, 0) - risk_premium * risk_score * q",
    defaultParameters: {
      urgency: 0.38,
      flexibility: 0.42,
      truthfulness: 0.7,
      privacyPreference: 0.82,
      riskAversion: 0.8,
    },
    defaultReliability: 0.88,
    defaultOutsideOption: 5200,
    defaultCapacity: 620,
    teaches: ["R-PORTAL-001", "R-PORTAL-006", "spec 0001 supplier utility"],
  },
  {
    id: "relationship-supplier",
    role: "supplier",
    name: "Relationship builder",
    shortName: "Relationship supplier",
    description: "Accepts some short-term burden to preserve a strategic account.",
    defaultUtilityFormula:
      "revenue_per_unit * q - production_cost * q - holding_cost * max(q - forecast, 0) + loyalty_bonus * relationship_score",
    defaultParameters: {
      urgency: 0.52,
      flexibility: 0.78,
      truthfulness: 0.82,
      privacyPreference: 0.52,
      riskAversion: 0.45,
    },
    defaultReliability: 0.93,
    defaultOutsideOption: 4600,
    defaultCapacity: 700,
    teaches: ["R-PORTAL-001", "spec 0003 long-run relationship"],
  },
  {
    id: "yield-optimizer-supplier",
    role: "supplier",
    name: "Yield optimizer",
    shortName: "Yield optimizer",
    description:
      "Maximizes wafer yield by pushing back when buyer asks force suboptimal binning or rework.",
    defaultUtilityFormula:
      "yield_value * effective_q - production_cost * q - rework_cost * max(0, q - capacity * yield_rate)",
    defaultParameters: {
      urgency: 0.4,
      flexibility: 0.6,
      truthfulness: 0.78,
      privacyPreference: 0.72,
      riskAversion: 0.62,
    },
    defaultReliability: 0.91,
    defaultOutsideOption: 4900,
    defaultCapacity: 560,
    teaches: ["R-PORTAL-004", "spec 0004 reliability"],
  },
  {
    id: "packager-cowos",
    role: "packager",
    name: "Advanced packager",
    shortName: "Advanced packager",
    description:
      "Owns the CoWoS / advanced-packaging bottleneck. Allocates substrate-bonded slots to whichever fabless customer commits cleanest.",
    defaultUtilityFormula:
      "package_margin * q - bonding_cost * q - substrate_carry * max(0, q - substrate_pool)",
    defaultParameters: {
      urgency: 0.5,
      flexibility: 0.38,
      truthfulness: 0.72,
      privacyPreference: 0.78,
      riskAversion: 0.68,
    },
    defaultReliability: 0.85,
    defaultOutsideOption: 3800,
    defaultCapacity: 420,
    teaches: ["R-PORTAL-001", "spec 0008 chip-map bridge"],
  },
  {
    id: "logistics-customs",
    role: "logistics",
    name: "Logistics + customs lane",
    shortName: "Logistics lane",
    description:
      "Brokers lane capacity, customs clearance, and lane-level reliability into the contract; pads when lanes are export-controlled.",
    defaultUtilityFormula:
      "lane_margin * q - lane_cost * q - export_penalty * export_flag * q - delay_penalty * lead_time_days",
    defaultParameters: {
      urgency: 0.55,
      flexibility: 0.65,
      truthfulness: 0.7,
      privacyPreference: 0.6,
      riskAversion: 0.7,
    },
    defaultReliability: 0.82,
    defaultOutsideOption: 2200,
    defaultCapacity: 900,
    teaches: ["R-PORTAL-001"],
  },
  {
    id: "distributor-channel",
    role: "distributor",
    name: "Channel distributor",
    shortName: "Channel distributor",
    description:
      "Aggregates smaller buyers and floats inventory to dampen demand variance. Useful for showing how a third party absorbs risk.",
    defaultUtilityFormula:
      "channel_margin * q - holding_cost * max(0, q - committed_demand) - shortage_penalty * max(committed_demand - q, 0)",
    defaultParameters: {
      urgency: 0.5,
      flexibility: 0.7,
      truthfulness: 0.66,
      privacyPreference: 0.5,
      riskAversion: 0.55,
    },
    defaultReliability: 0.87,
    defaultOutsideOption: 2900,
    defaultCapacity: 600,
    teaches: ["R-PORTAL-006"],
  },
  {
    id: "neutral-coordinator",
    role: "coordinator",
    name: "Neutral coordinator",
    shortName: "Coordinator",
    description:
      "Runs CPP / ADMM iterations, prices externalities (VCG), and applies the configured split rule. Holds no private utility of its own.",
    defaultUtilityFormula: "0 (coordinator has no private utility; runs mechanism only)",
    defaultParameters: {
      urgency: 0.5,
      flexibility: 0.9,
      truthfulness: 1,
      privacyPreference: 0.95,
      riskAversion: 0.4,
    },
    defaultReliability: 1,
    teaches: ["R-PORTAL-002", "R-PORTAL-006", "spec 0001 CPP/VCG"],
  },
  {
    id: "custom-bargainer",
    role: "buyer",
    name: "Hard bargainer (custom)",
    shortName: "Hard bargainer",
    description:
      "Custom slot for visitors to edit. Default: optimizes local payoff and reveals as little as possible.",
    defaultUtilityFormula:
      "user-editable; default = service_value * min(q, demand) - unit_cost * q",
    defaultParameters: {
      urgency: 0.62,
      flexibility: 0.24,
      truthfulness: 0.38,
      privacyPreference: 0.9,
      riskAversion: 0.62,
    },
    defaultReliability: 0.85,
    defaultOutsideOption: 7000,
    teaches: ["R-PORTAL-004"],
  },
];

export function strategyById(id: string): Strategy | undefined {
  return strategies.find((strategy) => strategy.id === id);
}

export function strategiesForRole(role: ParticipantRole): Strategy[] {
  return strategies.filter((strategy) => strategy.role === role);
}

export function strategyCountByRole(): Record<ParticipantRole, number> {
  const counts: Record<ParticipantRole, number> = {
    buyer: 0,
    supplier: 0,
    packager: 0,
    logistics: 0,
    distributor: 0,
    coordinator: 0,
  };
  for (const strategy of strategies) {
    counts[strategy.role] += 1;
  }
  return counts;
}
