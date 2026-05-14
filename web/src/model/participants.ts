import type { LabScenario, Participant, AgentParameters, ParticipantRole } from "./types";
import { agentById } from "../data/agents";
import { strategies, strategyById } from "../data/strategies";

const SUPPLIER_NAMES = [
  "Cinder supplier",
  "Northstar supplier",
  "Horizon supplier",
  "Vela supplier",
  "Quartz supplier",
  "Apex supplier",
  "Orion supplier",
];

const PACKAGER_NAMES = ["Ibiden packager", "Unimicron packager"];
const LOGISTICS_NAMES = ["Customs + lane broker", "Forward-lane broker"];
const DISTRIBUTOR_NAMES = ["Channel distributor", "Aggregator distributor"];

const ROLE_ROTATION_BY_PRESET: Record<string, ParticipantRole[]> = {
  "advanced-packaging-bottleneck": ["packager", "supplier", "logistics"],
  "export-control-shock": ["logistics", "coordinator", "supplier"],
  "hyperscaler-surge": ["buyer", "supplier", "supplier"],
  "distributor-floats-inventory": ["distributor", "supplier", "supplier"],
};

function rolesForPreset(presetId: string): ParticipantRole[] {
  return (
    ROLE_ROTATION_BY_PRESET[presetId] ?? [
      "supplier",
      "packager",
      "logistics",
      "distributor",
      "supplier",
      "supplier",
    ]
  );
}

function nameForRole(role: ParticipantRole, index: number): string {
  if (role === "packager") return PACKAGER_NAMES[index % PACKAGER_NAMES.length];
  if (role === "logistics") return LOGISTICS_NAMES[index % LOGISTICS_NAMES.length];
  if (role === "distributor") return DISTRIBUTOR_NAMES[index % DISTRIBUTOR_NAMES.length];
  if (role === "buyer") return `Secondary buyer ${index + 1}`;
  if (role === "coordinator") return "Neutral coordinator";
  return SUPPLIER_NAMES[(index + 1) % SUPPLIER_NAMES.length];
}

function strategyForRole(role: ParticipantRole, supplierAgentId: string): string {
  const match =
    strategies.find((s) => s.role === role && s.id !== supplierAgentId) ??
    strategies.find((s) => s.role === role);
  return match ? match.id : "capacity-guard-supplier";
}

function outsideForRole(role: ParticipantRole, idx: number): number {
  switch (role) {
    case "buyer":
      return 7600 - idx * 200;
    case "packager":
      return 3800 - idx * 200;
    case "logistics":
      return 2200 - idx * 200;
    case "distributor":
      return 2900 - idx * 200;
    case "coordinator":
      return 0;
    default:
      return 4800 - idx * 200;
  }
}

function paramsFromScenario(scenario: LabScenario): AgentParameters {
  return {
    urgency: scenario.customBuyerUrgency,
    flexibility: scenario.customSupplierFlexibility,
    truthfulness: scenario.customTruthfulness,
    privacyPreference: scenario.customPrivacyPreference,
    riskAversion: scenario.customRiskAversion,
  };
}

export function deriveParticipants(scenario: LabScenario): Participant[] {
  if (scenario.participants && scenario.participants.length >= 2) {
    return scenario.participants;
  }
  const buyerAgent = agentById(scenario.buyerAgentId);
  const supplierAgent = agentById(scenario.supplierAgentId);
  const sharedParams = paramsFromScenario(scenario);
  const baseList: Participant[] = [
    {
      id: "buyer",
      role: "buyer",
      name: "Northstar buyer",
      strategyId: buyerAgent.id,
      reliability: scenario.buyerReliability,
      parameters: { ...buyerAgent.parameters, ...sharedParams, urgency: scenario.customBuyerUrgency },
      outsideOption: 8400,
    },
    {
      id: "supplier-1",
      role: "supplier",
      name: SUPPLIER_NAMES[0],
      strategyId: supplierAgent.id,
      reliability: scenario.supplierReliability,
      parameters: {
        ...supplierAgent.parameters,
        ...sharedParams,
        flexibility: scenario.customSupplierFlexibility,
      },
      outsideOption: 5200,
    },
  ];
  const extras = Math.max(0, scenario.participantCount - 2);
  const roleRotation = rolesForPreset(scenario.presetId);
  for (let i = 0; i < extras; i += 1) {
    const role = roleRotation[i % roleRotation.length];
    const name = nameForRole(role, i);
    const strategyId = strategyForRole(role, supplierAgent.id);
    const strategy = strategies.find((s) => s.id === strategyId) ?? strategies[0];
    baseList.push({
      id: `${role}-${i + 2}`,
      role,
      name,
      strategyId,
      reliability: Math.max(0.7, scenario.supplierReliability - 0.04 * (i + 1)),
      parameters: {
        ...strategy.defaultParameters,
        ...sharedParams,
        flexibility: scenario.customSupplierFlexibility * 0.96,
      },
      capacity: strategy.defaultCapacity,
      outsideOption: outsideForRole(role, i),
    });
  }
  return baseList;
}

export function participantsByRole(
  participants: Participant[],
  role: ParticipantRole,
): Participant[] {
  return participants.filter((participant) => participant.role === role);
}

export function isPrivateField(field: string): boolean {
  return [
    "production_cost",
    "holding_cost",
    "rework_cost",
    "outsideOption",
    "reservation_value",
    "private_capacity",
  ].includes(field);
}

export function describeStrategyForParticipant(participant: Participant): string {
  const strategy = strategyById(participant.strategyId);
  if (strategy) {
    return strategy.description;
  }
  return participant.role;
}
