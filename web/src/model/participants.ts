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
  for (let i = 0; i < extras; i += 1) {
    const name = SUPPLIER_NAMES[(i + 1) % SUPPLIER_NAMES.length];
    const strategy = strategies.find((s) => s.role === "supplier" && s.id !== supplierAgent.id) ?? strategies[0];
    baseList.push({
      id: `supplier-${i + 2}`,
      role: "supplier",
      name,
      strategyId: strategy.id,
      reliability: Math.max(0.7, scenario.supplierReliability - 0.04 * (i + 1)),
      parameters: {
        ...strategy.defaultParameters,
        ...sharedParams,
        flexibility: scenario.customSupplierFlexibility * 0.96,
      },
      outsideOption: 4800 - i * 200,
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
