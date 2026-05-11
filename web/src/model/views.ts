import type { Participant, ParticipantRole } from "./types";

export type ViewMode = "coordinator" | { role: "buyer"; participantId: string } | { role: "supplier"; participantId: string };

export type ViewKind = "coordinator" | "buyer" | "supplier";

export interface RedactedParticipant {
  id: string;
  role: ParticipantRole;
  name: string;
  reliability?: number;
  parameters?: Partial<Participant["parameters"]>;
  capacity?: number;
  outsideOption?: number;
  strategyId?: string;
  isSelf: boolean;
  privateFieldsRedacted: string[];
}

export interface ViewState {
  kind: ViewKind;
  selfId?: string;
  participants: RedactedParticipant[];
}

export function viewKind(mode: ViewMode): ViewKind {
  if (mode === "coordinator") {
    return "coordinator";
  }
  return mode.role;
}

export function viewSelfId(mode: ViewMode): string | undefined {
  return mode === "coordinator" ? undefined : mode.participantId;
}

const PRIVATE_FIELDS_BY_ROLE: Record<ParticipantRole, string[]> = {
  buyer: ["outsideOption", "capacity", "parameters.truthfulness"],
  supplier: ["outsideOption", "capacity", "parameters.truthfulness"],
  packager: ["outsideOption", "capacity"],
  logistics: ["outsideOption", "capacity"],
  distributor: ["outsideOption", "capacity"],
  coordinator: [],
};

export function redactForView(participants: Participant[], mode: ViewMode): ViewState {
  const kind = viewKind(mode);
  const selfId = viewSelfId(mode);
  if (kind === "coordinator") {
    return {
      kind,
      selfId,
      participants: participants.map((participant) => ({
        id: participant.id,
        role: participant.role,
        name: participant.name,
        reliability: participant.reliability,
        parameters: participant.parameters,
        capacity: participant.capacity,
        outsideOption: participant.outsideOption,
        strategyId: participant.strategyId,
        isSelf: false,
        privateFieldsRedacted: [],
      })),
    };
  }
  const redacted = participants.map<RedactedParticipant>((participant) => {
    const isSelf = participant.id === selfId;
    if (isSelf) {
      return {
        id: participant.id,
        role: participant.role,
        name: participant.name,
        reliability: participant.reliability,
        parameters: participant.parameters,
        capacity: participant.capacity,
        outsideOption: participant.outsideOption,
        strategyId: participant.strategyId,
        isSelf: true,
        privateFieldsRedacted: [],
      };
    }
    const hidden = PRIVATE_FIELDS_BY_ROLE[participant.role] ?? [];
    return {
      id: participant.id,
      role: participant.role,
      name: participant.name,
      reliability: undefined,
      parameters: redactParameters(participant.parameters, hidden),
      capacity: undefined,
      outsideOption: undefined,
      strategyId: undefined,
      isSelf: false,
      privateFieldsRedacted: hidden,
    };
  });
  return { kind, selfId, participants: redacted };
}

function redactParameters(
  parameters: Participant["parameters"],
  hiddenFields: string[],
): Partial<Participant["parameters"]> {
  const hidden = new Set(hiddenFields.map((path) => path.replace(/^parameters\./, "")));
  const result: Partial<Participant["parameters"]> = {};
  if (!hidden.has("urgency")) result.urgency = parameters.urgency;
  if (!hidden.has("flexibility")) result.flexibility = parameters.flexibility;
  if (!hidden.has("truthfulness")) result.truthfulness = parameters.truthfulness;
  if (!hidden.has("privacyPreference")) result.privacyPreference = parameters.privacyPreference;
  if (!hidden.has("riskAversion")) result.riskAversion = parameters.riskAversion;
  return result;
}

export function describeView(mode: ViewMode): string {
  if (mode === "coordinator") {
    return "Coordinator: sees the full orchestration, no participant cost structures.";
  }
  if (mode.role === "buyer") {
    return "Buyer view: own data plus coordinator signals; competitor cost structures hidden.";
  }
  return "Supplier view: own data plus coordinator signals; competitor cost structures hidden.";
}
