import type { AgentParameters, LabScenario, Participant, ParticipantRole } from "./types";
import { makeScenario } from "./simulation";
import { tag } from "./bridges/sourceProvenance";

let participantCounter = 0;

export function buildParticipant(overrides: Partial<Participant> = {}): Participant {
  participantCounter += 1;
  const defaultParameters: AgentParameters = {
    urgency: 0.6,
    flexibility: 0.5,
    truthfulness: 0.7,
    privacyPreference: 0.6,
    riskAversion: 0.6,
  };
  const role: ParticipantRole = overrides.role ?? "supplier";
  return {
    id: overrides.id ?? `p-${participantCounter}`,
    role,
    name: overrides.name ?? `Participant ${participantCounter}`,
    strategyId:
      overrides.strategyId ??
      (role === "buyer"
        ? "launch-protector-buyer"
        : role === "supplier"
          ? "capacity-guard-supplier"
          : role === "packager"
            ? "packager-cowos"
            : role === "coordinator"
              ? "neutral-coordinator"
              : "logistics-customs"),
    reliability: overrides.reliability ?? 0.9,
    capacity: overrides.capacity,
    outsideOption: overrides.outsideOption ?? (role === "buyer" ? 8000 : 4800),
    parameters: { ...defaultParameters, ...overrides.parameters },
  };
}

export function buildScenario(overrides: Partial<LabScenario> = {}): LabScenario {
  const base = makeScenario(overrides);
  return {
    ...base,
    provenance: overrides.provenance ?? tag("synthetic"),
    splitRule: overrides.splitRule ?? "proportional",
  };
}

export interface RunReportFixtureOverrides {
  scenarioOverrides?: Partial<LabScenario>;
  auditMode?: boolean;
  label?: string;
  notes?: string;
}

export function resetFactories(): void {
  participantCounter = 0;
}
